"""Core value types shared by every layer of the system."""

from __future__ import annotations

import time
from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Any


class Side(str, Enum):
    LONG = "long"
    SHORT = "short"
    FLAT = "flat"

    @property
    def sign(self) -> int:
        return {Side.LONG: 1, Side.SHORT: -1, Side.FLAT: 0}[self]


class OrderType(str, Enum):
    MARKET = "market"
    LIMIT = "limit"


@dataclass(frozen=True)
class Candle:
    """A single OHLCV bar. `ts` is the bar OPEN time, epoch seconds, UTC."""

    ts: int
    open: float
    high: float
    low: float
    close: float
    volume: float

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class Signal:
    """A strategy's opinion about one symbol at one point in time.

    `strength` is 0..1 and scales position size; 0 means "no conviction".
    """

    side: Side
    strength: float = 0.0
    reason: str = ""
    meta: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        self.strength = max(0.0, min(1.0, float(self.strength)))
        if self.side is Side.FLAT:
            self.strength = 0.0


@dataclass
class Order:
    symbol: str
    side: Side           # direction of the position this order opens/closes
    qty: float
    type: OrderType = OrderType.MARKET
    limit_price: float | None = None
    reduce_only: bool = False
    tag: str = ""


@dataclass
class Fill:
    symbol: str
    side: Side
    qty: float
    price: float
    fee: float
    ts: int
    tag: str = ""


@dataclass
class Position:
    symbol: str
    side: Side
    qty: float
    entry_price: float
    entry_ts: int
    stop: float | None = None
    target: float | None = None
    # The stop as it was at entry. `stop` ratchets with the trailing logic, so
    # it cannot define R — a stop trailed up to breakeven would make every
    # trade look like an infinite multiple of a vanishing risk.
    initial_stop: float | None = None
    # Highest (long) / lowest (short) close seen since entry, for trailing stops.
    extreme: float = 0.0
    fees_paid: float = 0.0
    tag: str = ""

    @property
    def is_open(self) -> bool:
        return self.qty > 0 and self.side is not Side.FLAT

    def unrealized(self, price: float) -> float:
        return (price - self.entry_price) * self.qty * self.side.sign

    def risk_per_unit(self) -> float:
        """Distance from entry to the ORIGINAL stop, per unit — the '1' in 1R.

        Returns 0 when no stop was set at entry, which callers treat as
        "R is undefined here" rather than as zero risk.
        """
        reference = self.initial_stop if self.initial_stop is not None else self.stop
        if reference is None:
            return 0.0
        return abs(self.entry_price - reference)


@dataclass
class Trade:
    """A round-trip: one entry, one exit."""

    symbol: str
    side: Side
    qty: float
    entry_price: float
    exit_price: float
    entry_ts: int
    exit_ts: int
    pnl: float
    fees: float
    r_multiple: float | None
    reason: str
    strategy: str = ""

    @property
    def is_win(self) -> bool:
        return self.pnl > 0

    @property
    def duration_s(self) -> int:
        return max(0, self.exit_ts - self.entry_ts)

    def as_dict(self) -> dict[str, Any]:
        d = asdict(self)
        d["side"] = self.side.value
        return d


def now_ts() -> int:
    return int(time.time())
