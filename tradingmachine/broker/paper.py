"""Simulated broker with costs. Used by both the backtester and paper trading.

Costs are modelled explicitly because they are usually what separates a
profitable backtest from an unprofitable account. Defaults (5bps fee, 5bps
slippage) are realistic for liquid crypto and large-cap equities; raise them
for small caps, thin alts, or anything you trade in size.
"""

from __future__ import annotations

import random

from ..models import Fill, Side
from .base import Broker


class PaperBroker(Broker):
    name = "paper"
    is_live = False

    def __init__(
        self,
        fee_bps: float = 5.0,
        slippage_bps: float = 5.0,
        slippage_jitter: float = 0.0,
        seed: int | None = None,
    ) -> None:
        self.fee_bps = fee_bps
        self.slippage_bps = slippage_bps
        # Random component on top of base slippage, in bps. Off by default so
        # backtests are reproducible; turn it on to stress-test an edge.
        self.slippage_jitter = slippage_jitter
        self._rng = random.Random(seed)
        self.fills: list[Fill] = []

    def market_order(
        self,
        symbol: str,
        side: Side,
        qty: float,
        price_hint: float,
        ts: int,
        *,
        reduce_only: bool = False,
        tag: str = "",
    ) -> Fill:
        qty = abs(qty)
        slip_bps = self.slippage_bps
        if self.slippage_jitter:
            slip_bps += self._rng.uniform(0, self.slippage_jitter)

        # Slippage always hurts: you buy a bit higher and sell a bit lower.
        # `reduce_only` flips the direction because closing a long is a sell.
        buying = (side is Side.LONG) != reduce_only
        direction = 1 if buying else -1
        price = price_hint * (1 + direction * slip_bps / 10_000.0)
        fee = price * qty * self.fee_bps / 10_000.0

        fill = Fill(symbol=symbol, side=side, qty=qty, price=price, fee=fee, ts=ts, tag=tag)
        self.fills.append(fill)
        return fill
