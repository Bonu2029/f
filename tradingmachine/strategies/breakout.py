"""Donchian breakout with a volatility-expansion confirmation.

Requiring the breakout bar's range to exceed recent average range filters out
the drifting, one-tick pokes through a level that immediately reverse.
"""

from __future__ import annotations

from typing import Sequence

from ..indicators import atr, closes, donchian, ema, last_defined
from ..models import Candle, Side, Signal
from .base import Strategy


class Breakout(Strategy):
    name = "breakout"

    def __init__(
        self,
        channel: int = 20,
        exit_channel: int = 10,
        atr_period: int = 14,
        min_range_mult: float = 0.8,
        trend_filter: int = 100,
        allow_short: bool = True,
    ) -> None:
        super().__init__(
            channel=channel,
            exit_channel=exit_channel,
            atr_period=atr_period,
            min_range_mult=min_range_mult,
            trend_filter=trend_filter,
            allow_short=allow_short,
        )
        self.channel = channel
        self.exit_channel = exit_channel
        self.atr_period = atr_period
        self.min_range_mult = min_range_mult
        self.trend_filter = trend_filter
        self.allow_short = allow_short
        self.warmup = max(channel, trend_filter, atr_period * 3) + 10

    def evaluate(self, candles: Sequence[Candle]) -> Signal:
        if len(candles) < self.warmup:
            return self._flat("warming up")

        px = closes(candles)
        last = candles[-1]
        up, dn = donchian(candles, self.channel)
        up_v, dn_v = last_defined(up), last_defined(dn)
        atr_v = last_defined(atr(candles, self.atr_period))
        trend_v = last_defined(ema(px, self.trend_filter))

        if None in (up_v, dn_v, atr_v, trend_v) or not atr_v:
            return self._flat("indicators unavailable")

        bar_range = last.high - last.low
        expanded = bar_range >= atr_v * self.min_range_mult
        meta = {
            "atr": atr_v,
            "channel_high": up_v,
            "channel_low": dn_v,
            "bar_range": bar_range,
        }

        if not expanded:
            return Signal(Side.FLAT, 0.0, "range too quiet for a breakout", meta)

        # Distance beyond the channel, in ATRs, scales conviction.
        if last.close > up_v and last.close > trend_v:
            push = (last.close - up_v) / atr_v
            return Signal(
                Side.LONG, min(1.0, 0.4 + push), f"broke {self.channel}-bar high", meta
            )
        if self.allow_short and last.close < dn_v and last.close < trend_v:
            push = (dn_v - last.close) / atr_v
            return Signal(
                Side.SHORT, min(1.0, 0.4 + push), f"broke {self.channel}-bar low", meta
            )
        return Signal(Side.FLAT, 0.0, "inside channel", meta)
