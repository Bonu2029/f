"""Crypto OHLCV feeds: Coinbase Exchange and Binance. Both keyless and public."""

from __future__ import annotations

import time

from ..models import Candle
from .base import DataError, DataFeed, http_json, interval_seconds
from .yahoo import resample

# --------------------------------------------------------------------------- #
# Coinbase Exchange
# --------------------------------------------------------------------------- #

_CB_BASE = "https://api.exchange.coinbase.com"
# canonical -> (granularity seconds, canonical base, factor)
_CB_INTERVAL = {
    "1m": (60, "1m", 1),
    "5m": (300, "5m", 1),
    "15m": (900, "15m", 1),
    "1h": (3600, "1h", 1),
    "4h": (3600, "1h", 4),   # Coinbase jumps 1h -> 6h; aggregate locally
    "6h": (21600, "6h", 1),
    "1d": (86400, "1d", 1),
}
_CB_PAGE = 300  # hard server-side cap per request


class CoinbaseFeed(DataFeed):
    """Symbols look like ``BTC-USD``, ``ETH-USD``, ``SOL-USD``."""

    name = "coinbase"
    supported_intervals = frozenset(_CB_INTERVAL)

    def fetch(
        self,
        symbol: str,
        interval: str,
        limit: int = 500,
        *,
        include_partial: bool = False,
    ) -> list[Candle]:
        if interval not in _CB_INTERVAL:
            raise DataError(f"coinbase does not support interval {interval!r}")
        gran, base, factor = _CB_INTERVAL[interval]
        needed = limit * factor

        collected: dict[int, Candle] = {}
        end = int(time.time())
        # Walk backwards a page at a time until we have enough or the tape ends.
        while len(collected) < needed:
            start = end - gran * _CB_PAGE
            url = (
                f"{_CB_BASE}/products/{symbol}/candles?granularity={gran}"
                f"&start={start}&end={end}"
            )
            rows = http_json(url)
            if not isinstance(rows, list) or not rows:
                break
            for row in rows:
                # [time, low, high, open, close, volume]
                ts, lo, hi, op, cl, vol = row[:6]
                collected[int(ts)] = Candle(
                    int(ts), float(op), float(hi), float(lo), float(cl), float(vol)
                )
            oldest = min(int(r[0]) for r in rows)
            if oldest >= end:  # no progress; avoid spinning forever
                break
            end = oldest
            time.sleep(0.25)  # be a good citizen with a public endpoint

        if not collected:
            raise DataError(f"coinbase returned no data for {symbol!r}")

        candles = [collected[k] for k in sorted(collected)]
        if factor > 1:
            candles = resample(candles, factor, interval_seconds(base))
        candles = self._finalize(candles, interval, include_partial)
        return candles[-limit:]


# --------------------------------------------------------------------------- #
# Binance
# --------------------------------------------------------------------------- #

_BN_BASE = "https://api.binance.com"
_BN_INTERVALS = frozenset({"1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w"})
_BN_PAGE = 1000


class BinanceFeed(DataFeed):
    """Symbols look like ``BTCUSDT``, ``ETHUSDT``.

    Binance geo-blocks some regions with HTTP 451. If you get that, use
    :class:`CoinbaseFeed` instead — the registry falls back automatically.
    """

    name = "binance"
    supported_intervals = _BN_INTERVALS

    def __init__(self, base_url: str = _BN_BASE) -> None:
        self.base_url = base_url.rstrip("/")

    def fetch(
        self,
        symbol: str,
        interval: str,
        limit: int = 500,
        *,
        include_partial: bool = False,
    ) -> list[Candle]:
        if interval not in _BN_INTERVALS:
            raise DataError(f"binance does not support interval {interval!r}")
        step_ms = interval_seconds(interval) * 1000

        collected: dict[int, Candle] = {}
        end_ms = int(time.time() * 1000)
        while len(collected) < limit + 1:
            page = min(_BN_PAGE, limit + 1 - len(collected) + 1)
            url = (
                f"{self.base_url}/api/v3/klines?symbol={symbol}"
                f"&interval={interval}&limit={page}&endTime={end_ms}"
            )
            rows = http_json(url)
            if not isinstance(rows, list) or not rows:
                break
            for row in rows:
                ts = int(row[0]) // 1000
                collected[ts] = Candle(
                    ts, float(row[1]), float(row[2]), float(row[3]),
                    float(row[4]), float(row[5]),
                )
            oldest_ms = min(int(r[0]) for r in rows)
            if oldest_ms >= end_ms:
                break
            end_ms = oldest_ms - step_ms
            time.sleep(0.2)

        if not collected:
            raise DataError(f"binance returned no data for {symbol!r}")
        candles = [collected[k] for k in sorted(collected)]
        candles = self._finalize(candles, interval, include_partial)
        return candles[-limit:]
