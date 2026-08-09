"""Feed selection, fallback, and caching.

One entry point — :func:`get_candles` — that figures out which venue can serve a
symbol, caches the answer briefly, and falls back to the next venue when one is
down or geo-blocked.
"""

from __future__ import annotations

import re
import threading
import time

from ..models import Candle
from .base import DataError, DataFeed, interval_seconds
from .crypto import BinanceFeed, CoinbaseFeed
from .csvfeed import CsvFeed
from .yahoo import YahooFeed

_FEEDS: dict[str, DataFeed] = {
    "yahoo": YahooFeed(),
    "coinbase": CoinbaseFeed(),
    "binance": BinanceFeed(),
}

_CRYPTO_DASH = re.compile(r"^[A-Z0-9]{2,10}-(USD|USDT|USDC|EUR|GBP|BTC|ETH)$")
_CRYPTO_CAT = re.compile(r"^[A-Z0-9]{2,10}(USDT|USDC|BUSD)$")


def register_feed(name: str, feed: DataFeed) -> None:
    """Add or replace a feed — e.g. a CSV feed pointed at your own history."""
    _FEEDS[name] = feed


def register_csv(path_template: str, name: str = "csv") -> None:
    register_feed(name, CsvFeed(path_template))


def feed_preference(symbol: str) -> list[str]:
    """Ordered venues to try for a symbol, best guess first."""
    s = symbol.upper()
    if _CRYPTO_CAT.match(s):
        return ["binance", "coinbase", "yahoo"]
    if _CRYPTO_DASH.match(s):
        return ["coinbase", "yahoo", "binance"]
    return ["yahoo", "coinbase"]


# --------------------------------------------------------------------------- #
# cache
# --------------------------------------------------------------------------- #

class _Cache:
    """TTL cache keyed by (symbol, interval, limit).

    The TTL is one bar length, floored at 20s: within a single bar the data
    genuinely has not changed, so re-fetching only burns rate limit.
    """

    def __init__(self) -> None:
        self._store: dict[tuple, tuple[float, list[Candle]]] = {}
        self._lock = threading.Lock()

    def get(self, key: tuple, ttl: float) -> list[Candle] | None:
        with self._lock:
            hit = self._store.get(key)
            if hit and (time.time() - hit[0]) < ttl:
                return list(hit[1])
        return None

    def put(self, key: tuple, candles: list[Candle]) -> None:
        with self._lock:
            self._store[key] = (time.time(), list(candles))

    def clear(self) -> None:
        with self._lock:
            self._store.clear()


_CACHE = _Cache()


def clear_cache() -> None:
    _CACHE.clear()


# --------------------------------------------------------------------------- #
# public API
# --------------------------------------------------------------------------- #

def get_candles(
    symbol: str,
    interval: str = "1h",
    limit: int = 500,
    *,
    source: str | None = None,
    use_cache: bool = True,
) -> list[Candle]:
    """Fetch bars for `symbol`, trying each capable venue until one answers.

    Raises :class:`DataError` listing every venue's failure if none succeed —
    a silent empty list here would look like "no signal" downstream, which is a
    far more expensive kind of wrong.
    """
    order = [source] if source else feed_preference(symbol)
    key = (symbol, interval, limit, source)
    ttl = max(20.0, interval_seconds(interval) * 0.5)

    if use_cache:
        cached = _CACHE.get(key, ttl)
        if cached is not None:
            return cached

    errors: list[str] = []
    for name in order:
        feed = _FEEDS.get(name)
        if feed is None:
            errors.append(f"{name}: not registered")
            continue
        if not feed.supports(interval):
            errors.append(f"{name}: no {interval} interval")
            continue
        try:
            candles = feed.fetch(symbol, interval, limit)
        except DataError as exc:
            errors.append(f"{name}: {exc}")
            continue
        if not candles:
            errors.append(f"{name}: empty result")
            continue
        if use_cache:
            _CACHE.put(key, candles)
        return candles

    raise DataError(f"no feed could serve {symbol!r} @ {interval}: " + "; ".join(errors))


def available_feeds() -> dict[str, DataFeed]:
    return dict(_FEEDS)
