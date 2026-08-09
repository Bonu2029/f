"""Strategy interface.

A strategy answers exactly one question: *given bars up to and including the
most recent CLOSED bar, what side do I want to be on and how strongly?*

It does not size positions, place orders, or decide stops — those belong to the
risk manager and the broker. Keeping that boundary sharp is what lets you swap
strategies without re-auditing your risk code.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Sequence

from ..indicators import atr, last_defined
from ..models import Candle, Side, Signal


class Strategy(ABC):
    name: str = "strategy"

    #: Bars required before :meth:`evaluate` can return anything but FLAT.
    warmup: int = 50

    def __init__(self, **params: Any) -> None:
        self.params: dict[str, Any] = params

    def param(self, key: str, default: Any) -> Any:
        return self.params.get(key, default)

    @abstractmethod
    def evaluate(self, candles: Sequence[Candle]) -> Signal:
        """Return the desired exposure given closed bars, oldest first."""

    # -- shared helpers ---------------------------------------------------- #

    def _atr(self, candles: Sequence[Candle], period: int = 14) -> float | None:
        return last_defined(atr(candles, period))

    def _flat(self, reason: str = "no setup") -> Signal:
        return Signal(Side.FLAT, 0.0, reason)

    def describe(self) -> str:
        if not self.params:
            return self.name
        joined = ", ".join(f"{k}={v}" for k, v in sorted(self.params.items()))
        return f"{self.name}({joined})"


class StrategyError(ValueError):
    pass
