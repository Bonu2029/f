"""Mean reversion: stretched RSI at a Bollinger extreme, only in range regimes.

The regime gate (ADX below a ceiling) is not optional decoration. Buying an
oversold RSI inside a strong downtrend is how mean-reversion systems produce
their worst losing streaks — the indicator is "right" and the position is dead.
"""

from __future__ import annotations

from typing import Sequence

from ..indicators import adx, bollinger, closes, ema, last_defined, rsi
from ..models import Candle, Side, Signal
from .base import Strategy


class MeanReversion(Strategy):
    name = "meanrev"

    def __init__(
        self,
        rsi_period: int = 14,
        oversold: float = 30.0,
        overbought: float = 70.0,
        bb_period: int = 20,
        bb_mult: float = 2.0,
        adx_max: float = 25.0,
        trend_filter: int = 200,
        atr_period: int = 14,
        allow_short: bool = True,
    ) -> None:
        super().__init__(
            rsi_period=rsi_period,
            oversold=oversold,
            overbought=overbought,
            bb_period=bb_period,
            bb_mult=bb_mult,
            adx_max=adx_max,
            trend_filter=trend_filter,
            atr_period=atr_period,
            allow_short=allow_short,
        )
        self.rsi_period = rsi_period
        self.oversold, self.overbought = oversold, overbought
        self.bb_period, self.bb_mult = bb_period, bb_mult
        self.adx_max = adx_max
        self.trend_filter = trend_filter
        self.atr_period = atr_period
        self.allow_short = allow_short
        self.warmup = max(trend_filter, bb_period, rsi_period * 3) + 10

    def evaluate(self, candles: Sequence[Candle]) -> Signal:
        if len(candles) < self.warmup:
            return self._flat("warming up")

        px = closes(candles)
        price = px[-1]
        rsi_v = last_defined(rsi(px, self.rsi_period))
        upper, mid, lower = bollinger(px, self.bb_period, self.bb_mult)
        up_v, mid_v, lo_v = last_defined(upper), last_defined(mid), last_defined(lower)
        adx_v = last_defined(adx(candles, 14))
        trend_v = last_defined(ema(px, self.trend_filter))
        atr_v = self._atr(candles, self.atr_period)

        if None in (rsi_v, up_v, mid_v, lo_v, adx_v, trend_v, atr_v) or not atr_v:
            return self._flat("indicators unavailable")

        meta = {"atr": atr_v, "rsi": rsi_v, "adx": adx_v, "bb_mid": mid_v}

        if adx_v > self.adx_max:
            return Signal(Side.FLAT, 0.0, f"trending (ADX {adx_v:.1f}), stand aside", meta)

        # How far past the threshold the oscillator is, 0..1.
        if rsi_v <= self.oversold and price <= lo_v and price > trend_v * 0.9:
            depth = (self.oversold - rsi_v) / max(self.oversold, 1e-9)
            return Signal(
                Side.LONG,
                min(1.0, 0.35 + depth * 2.0),
                f"oversold RSI {rsi_v:.1f} at lower band",
                meta,
            )
        if (
            self.allow_short
            and rsi_v >= self.overbought
            and price >= up_v
            and price < trend_v * 1.1
        ):
            depth = (rsi_v - self.overbought) / max(100.0 - self.overbought, 1e-9)
            return Signal(
                Side.SHORT,
                min(1.0, 0.35 + depth * 2.0),
                f"overbought RSI {rsi_v:.1f} at upper band",
                meta,
            )
        return Signal(Side.FLAT, 0.0, f"RSI {rsi_v:.1f} not stretched", meta)
