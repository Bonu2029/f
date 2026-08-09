"""Technical indicators in pure Python — no numpy, no pandas, no surprises.

Every function returns a list the same length as its input, with ``None`` in the
warm-up region so index ``i`` of the result always lines up with candle ``i``.
That alignment is what keeps the backtester free of off-by-one lookahead bugs.
"""

from __future__ import annotations

import math
from typing import Sequence

from .models import Candle

Series = list[float | None]


# --------------------------------------------------------------------------- #
# helpers
# --------------------------------------------------------------------------- #

def closes(candles: Sequence[Candle]) -> list[float]:
    return [c.close for c in candles]


def highs(candles: Sequence[Candle]) -> list[float]:
    return [c.high for c in candles]


def lows(candles: Sequence[Candle]) -> list[float]:
    return [c.low for c in candles]


def _pad(n: int) -> Series:
    return [None] * n


# --------------------------------------------------------------------------- #
# moving averages
# --------------------------------------------------------------------------- #

def sma(values: Sequence[float], period: int) -> Series:
    if period <= 0:
        raise ValueError("period must be positive")
    out: Series = _pad(min(period - 1, len(values)))
    running = 0.0
    for i, v in enumerate(values):
        running += v
        if i >= period:
            running -= values[i - period]
        if i >= period - 1:
            out.append(running / period)
    return out


def ema(values: Sequence[float], period: int) -> Series:
    """Seeded with an SMA so the first real value is not biased by one print."""
    if period <= 0:
        raise ValueError("period must be positive")
    if len(values) < period:
        return _pad(len(values))
    k = 2.0 / (period + 1.0)
    out: Series = _pad(period - 1)
    prev = sum(values[:period]) / period
    out.append(prev)
    for v in values[period:]:
        prev = v * k + prev * (1 - k)
        out.append(prev)
    return out


def wilder(values: Sequence[float], period: int) -> Series:
    """Wilder's smoothing (the one RSI/ATR/ADX are actually defined with)."""
    if len(values) < period:
        return _pad(len(values))
    out: Series = _pad(period - 1)
    prev = sum(values[:period]) / period
    out.append(prev)
    for v in values[period:]:
        prev = (prev * (period - 1) + v) / period
        out.append(prev)
    return out


def stdev(values: Sequence[float], period: int) -> Series:
    out: Series = _pad(min(period - 1, len(values)))
    for i in range(period - 1, len(values)):
        window = values[i - period + 1 : i + 1]
        mean = sum(window) / period
        var = sum((x - mean) ** 2 for x in window) / period
        out.append(math.sqrt(var))
    return out


# --------------------------------------------------------------------------- #
# oscillators
# --------------------------------------------------------------------------- #

def rsi(values: Sequence[float], period: int = 14) -> Series:
    if len(values) <= period:
        return _pad(len(values))
    gains, losses = [], []
    for i in range(1, len(values)):
        delta = values[i] - values[i - 1]
        gains.append(max(delta, 0.0))
        losses.append(max(-delta, 0.0))
    avg_gain = wilder(gains, period)
    avg_loss = wilder(losses, period)
    out: Series = [None]  # first candle has no delta
    for g, l in zip(avg_gain, avg_loss):
        if g is None or l is None:
            out.append(None)
        elif l == 0:
            out.append(100.0)
        else:
            rs = g / l
            out.append(100.0 - 100.0 / (1.0 + rs))
    return out


def macd(
    values: Sequence[float], fast: int = 12, slow: int = 26, signal: int = 9
) -> tuple[Series, Series, Series]:
    """Returns (macd_line, signal_line, histogram)."""
    fast_e, slow_e = ema(values, fast), ema(values, slow)
    line: Series = [
        (f - s) if (f is not None and s is not None) else None
        for f, s in zip(fast_e, slow_e)
    ]
    defined = [v for v in line if v is not None]
    sig_tail = ema(defined, signal)
    offset = len(line) - len(defined)
    sig: Series = _pad(offset) + sig_tail
    hist: Series = [
        (m - s) if (m is not None and s is not None) else None
        for m, s in zip(line, sig)
    ]
    return line, sig, hist


# --------------------------------------------------------------------------- #
# volatility / range
# --------------------------------------------------------------------------- #

def true_range(candles: Sequence[Candle]) -> Series:
    out: Series = []
    for i, c in enumerate(candles):
        if i == 0:
            out.append(c.high - c.low)
        else:
            prev_close = candles[i - 1].close
            out.append(
                max(c.high - c.low, abs(c.high - prev_close), abs(c.low - prev_close))
            )
    return out


def atr(candles: Sequence[Candle], period: int = 14) -> Series:
    tr = [v for v in true_range(candles) if v is not None]
    return wilder(tr, period)


def bollinger(
    values: Sequence[float], period: int = 20, mult: float = 2.0
) -> tuple[Series, Series, Series]:
    """Returns (upper, middle, lower)."""
    mid = sma(values, period)
    sd = stdev(values, period)
    upper: Series = []
    lower: Series = []
    for m, s in zip(mid, sd):
        if m is None or s is None:
            upper.append(None)
            lower.append(None)
        else:
            upper.append(m + mult * s)
            lower.append(m - mult * s)
    return upper, mid, lower


def donchian(
    candles: Sequence[Candle], period: int = 20
) -> tuple[Series, Series]:
    """Highest high / lowest low over the PRIOR `period` bars (excludes current).

    Excluding the current bar is deliberate: a breakout must clear a level that
    was already established, otherwise the channel moves with the bar breaking it.
    """
    up: Series = []
    dn: Series = []
    for i in range(len(candles)):
        if i < period:
            up.append(None)
            dn.append(None)
            continue
        window = candles[i - period : i]
        up.append(max(c.high for c in window))
        dn.append(min(c.low for c in window))
    return up, dn


def adx(candles: Sequence[Candle], period: int = 14) -> Series:
    """Average Directional Index — how *trending* the market is, not which way."""
    if len(candles) < period * 2:
        return _pad(len(candles))
    plus_dm, minus_dm, tr = [], [], []
    for i in range(1, len(candles)):
        up_move = candles[i].high - candles[i - 1].high
        down_move = candles[i - 1].low - candles[i].low
        plus_dm.append(up_move if (up_move > down_move and up_move > 0) else 0.0)
        minus_dm.append(down_move if (down_move > up_move and down_move > 0) else 0.0)
        prev_close = candles[i - 1].close
        tr.append(
            max(
                candles[i].high - candles[i].low,
                abs(candles[i].high - prev_close),
                abs(candles[i].low - prev_close),
            )
        )
    atr_s = wilder(tr, period)
    pdm_s = wilder(plus_dm, period)
    mdm_s = wilder(minus_dm, period)

    dx: list[float] = []
    dx_offset = None
    for i, (a, p, m) in enumerate(zip(atr_s, pdm_s, mdm_s)):
        if a is None or p is None or m is None or a == 0:
            continue
        if dx_offset is None:
            dx_offset = i
        pdi = 100.0 * p / a
        mdi = 100.0 * m / a
        denom = pdi + mdi
        dx.append(100.0 * abs(pdi - mdi) / denom if denom else 0.0)

    if dx_offset is None or len(dx) < period:
        return _pad(len(candles))
    smoothed = wilder(dx, period)
    # +1 realigns to candle space (the DM/TR series start at candle 1).
    return _pad(len(candles) - len(smoothed)) + smoothed


def slope(values: Series, lookback: int = 5) -> Series:
    """Per-bar change of a series, normalised by its own level (a % slope)."""
    out: Series = []
    for i in range(len(values)):
        cur = values[i]
        prev = values[i - lookback] if i >= lookback else None
        if cur is None or prev is None or prev == 0:
            out.append(None)
        else:
            out.append((cur - prev) / abs(prev) / lookback)
    return out


def last_defined(series: Series, offset: int = 0) -> float | None:
    """Value at ``len-1-offset`` if it exists and is not None."""
    idx = len(series) - 1 - offset
    if idx < 0 or idx >= len(series):
        return None
    return series[idx]
