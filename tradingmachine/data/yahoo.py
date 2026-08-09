"""Yahoo Finance chart feed — stocks, ETFs, forex, futures, indices, crypto.

No API key. Symbol conventions Yahoo expects:

    stocks/ETFs   AAPL, MSFT, SPY
    forex         EURUSD=X, GBPJPY=X
    futures       ES=F, NQ=F, CL=F, GC=F
    indices       ^GSPC, ^NDX, ^VIX
    crypto        BTC-USD, ETH-USD
"""

from __future__ import annotations

import time

from ..models import Candle
from .base import DataError, DataFeed, http_json, interval_seconds

_BASE = "https://query1.finance.yahoo.com/v8/finance/chart/"

# canonical interval -> (interval Yahoo serves, canonical base we fetch, factor)
# Yahoo has no native 4h, so we fetch 1h and aggregate 4:1 locally.
_YAHOO_INTERVAL = {
    "1m": ("1m", "1m", 1),
    "5m": ("5m", "5m", 1),
    "15m": ("15m", "15m", 1),
    "30m": ("30m", "30m", 1),
    "1h": ("1h", "1h", 1),
    "4h": ("1h", "1h", 4),
    "1d": ("1d", "1d", 1),
    "1w": ("1wk", "1w", 1),
}

# Yahoo caps intraday history by interval; exceeding these returns an error.
_MAX_LOOKBACK_DAYS = {
    "1m": 7,
    "5m": 58,
    "15m": 58,
    "30m": 58,
    "1h": 725,
    "1d": 10_000,
    "1w": 10_000,
}


def resample(candles: list[Candle], factor: int, base_seconds: int) -> list[Candle]:
    """Aggregate `factor` bars into one, bucketed on absolute epoch boundaries.

    Bucketing on the clock rather than on list position keeps bar boundaries
    stable between polls, so a 4h bar means the same thing on every fetch.
    """
    if factor <= 1:
        return candles
    span = base_seconds * factor
    buckets: dict[int, list[Candle]] = {}
    for c in candles:
        buckets.setdefault((c.ts // span) * span, []).append(c)

    out: list[Candle] = []
    for start in sorted(buckets):
        group = sorted(buckets[start], key=lambda c: c.ts)
        out.append(
            Candle(
                ts=start,
                open=group[0].open,
                high=max(c.high for c in group),
                low=min(c.low for c in group),
                close=group[-1].close,
                volume=sum(c.volume for c in group),
            )
        )
    return out


class YahooFeed(DataFeed):
    name = "yahoo"
    supported_intervals = frozenset(_YAHOO_INTERVAL)

    def fetch(
        self,
        symbol: str,
        interval: str,
        limit: int = 500,
        *,
        include_partial: bool = False,
    ) -> list[Candle]:
        if interval not in _YAHOO_INTERVAL:
            raise DataError(f"yahoo does not support interval {interval!r}")
        y_interval, base, factor = _YAHOO_INTERVAL[interval]
        base_seconds = interval_seconds(base)

        # Ask for enough raw bars to build `limit` output bars, plus slack for
        # the hours the tape is closed. Intraday equity/FX sessions cover only a
        # fraction of the calendar (~6.5h of 24, 5 days of 7), so a naive
        # bars * interval window returns a third of what was asked for. Over-
        # fetching is free here — the result is sliced to `limit` either way.
        raw_needed = limit * factor
        slack = 6.0 if base_seconds < 86400 else 1.6
        span_days = raw_needed * base_seconds / 86400 * slack + 5
        span_days = min(span_days, _MAX_LOOKBACK_DAYS[base])
        period2 = int(time.time())
        period1 = period2 - int(span_days * 86400)

        url = (
            f"{_BASE}{symbol}?period1={period1}&period2={period2}"
            f"&interval={y_interval}&includePrePost=false&events=div%2Csplit"
        )
        payload = http_json(url)
        candles = self._parse(payload, symbol)
        if factor > 1:
            candles = resample(candles, factor, base_seconds)
        candles = self._finalize(candles, interval, include_partial)
        return candles[-limit:]

    @staticmethod
    def _parse(payload: dict, symbol: str) -> list[Candle]:
        chart = (payload or {}).get("chart") or {}
        if chart.get("error"):
            raise DataError(f"yahoo error for {symbol}: {chart['error']}")
        results = chart.get("result") or []
        if not results:
            raise DataError(f"yahoo returned no data for {symbol!r}")
        result = results[0]
        stamps = result.get("timestamp") or []
        quote = ((result.get("indicators") or {}).get("quote") or [{}])[0]

        opens = quote.get("open") or []
        highs = quote.get("high") or []
        lows = quote.get("low") or []
        cls = quote.get("close") or []
        vols = quote.get("volume") or []

        candles: list[Candle] = []
        for i, ts in enumerate(stamps):
            try:
                o, h, l, c = opens[i], highs[i], lows[i], cls[i]
            except IndexError:
                break
            # Yahoo pads holidays/halts with nulls; those are not bars.
            if None in (o, h, l, c):
                continue
            v = vols[i] if i < len(vols) and vols[i] is not None else 0
            candles.append(
                Candle(int(ts), float(o), float(h), float(l), float(c), float(v))
            )
        if not candles:
            raise DataError(f"yahoo returned only empty bars for {symbol!r}")
        return candles
