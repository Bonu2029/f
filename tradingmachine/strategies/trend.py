"""Trend following: EMA regime + ADX strength filter.

The ADX gate is the important part. An EMA cross on its own fires constantly in
chop and bleeds the account on whipsaws; requiring a minimum ADX means the
strategy only takes the cross when the market is actually trending.
"""

from __future__ import annotations

from typing import Sequence

from ..indicators import adx, closes, ema, last_defined
from ..models import Candle, Side, Signal
from .base import Strategy


class TrendFollow(Strategy):
    name = "trend"

    def __init__(
        self,
        fast: int = 20,
        slow: int = 50,
        adx_period: int = 14,
        adx_min: float = 20.0,
        atr_period: int = 14,
        allow_short: bool = True,
    ) -> None:
        super().__init__(
            fast=fast,
            slow=slow,
            adx_period=adx_period,
            adx_min=adx_min,
            atr_period=atr_period,
            allow_short=allow_short,
        )
        if fast >= slow:
            raise ValueError("fast EMA period must be shorter than slow")
        self.fast, self.slow = fast, slow
        self.adx_period, self.adx_min = adx_period, adx_min
        self.atr_period = atr_period
        self.allow_short = allow_short
        self.warmup = max(slow, adx_period * 3) + 10

    def evaluate(self, candles: Sequence[Candle]) -> Signal:
        if len(candles) < self.warmup:
            return self._flat("warming up")

        px = closes(candles)
        fast_e = last_defined(ema(px, self.fast))
        slow_e = last_defined(ema(px, self.slow))
        adx_v = last_defined(adx(candles, self.adx_period))
        atr_v = self._atr(candles, self.atr_period)
        price = px[-1]

        if None in (fast_e, slow_e, adx_v, atr_v) or not atr_v:
            return self._flat("indicators unavailable")

        meta = {"atr": atr_v, "adx": adx_v, "ema_fast": fast_e, "ema_slow": slow_e}

        if adx_v < self.adx_min:
            return Signal(Side.FLAT, 0.0, f"chop (ADX {adx_v:.1f})", meta)

        # Conviction ramps from 0 at the ADX floor to 1.0 at ADX 40.
        strength = min(1.0, (adx_v - self.adx_min) / max(40.0 - self.adx_min, 1e-9))
        strength = max(strength, 0.25)  # a qualifying trend is never zero-size

        if fast_e > slow_e and price > slow_e:
            return Signal(Side.LONG, strength, f"uptrend, ADX {adx_v:.1f}", meta)
        if self.allow_short and fast_e < slow_e and price < slow_e:
            return Signal(Side.SHORT, strength, f"downtrend, ADX {adx_v:.1f}", meta)
        return Signal(Side.FLAT, 0.0, "price disagrees with EMA regime", meta)
