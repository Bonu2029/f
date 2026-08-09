"""Data feed interface + a small resilient HTTP helper."""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.request
from abc import ABC, abstractmethod
from typing import Any

from ..models import Candle

USER_AGENT = "tradingmachine/1.0 (+https://github.com/)"


class DataError(RuntimeError):
    """Raised when a feed cannot produce usable data."""


def http_json(
    url: str,
    *,
    headers: dict[str, str] | None = None,
    timeout: int = 20,
    retries: int = 3,
    backoff: float = 1.5,
) -> Any:
    """GET a URL and parse JSON, retrying transient failures with backoff.

    4xx other than 429 are not retried — they will not fix themselves.
    """
    hdrs = {"User-Agent": USER_AGENT, "Accept": "application/json"}
    hdrs.update(headers or {})
    last: Exception | None = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=hdrs)
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            last = exc
            if exc.code < 500 and exc.code != 429:
                raise DataError(f"{url} -> HTTP {exc.code}") from exc
        except Exception as exc:  # noqa: BLE001 - network layer is genuinely broad
            last = exc
        if attempt < retries - 1:
            time.sleep(backoff ** (attempt + 1))
    raise DataError(f"{url} failed after {retries} attempts: {last}")


class DataFeed(ABC):
    """Source of OHLCV bars for a symbol.

    Implementations must return candles sorted oldest-first, with ``ts`` as the
    bar's OPEN time in epoch seconds (UTC), and must EXCLUDE the still-forming
    bar unless ``include_partial`` is set. Acting on a partial bar is one of the
    classic ways a backtest-profitable strategy dies in production.
    """

    name: str = "base"
    #: Interval strings this feed understands, e.g. {"1m", "1h", "1d"}.
    supported_intervals: frozenset[str] = frozenset()

    @abstractmethod
    def fetch(self, symbol: str, interval: str, limit: int = 500) -> list[Candle]:
        ...

    def supports(self, interval: str) -> bool:
        return interval in self.supported_intervals

    @staticmethod
    def _finalize(
        candles: list[Candle], interval: str, include_partial: bool
    ) -> list[Candle]:
        """Sort, de-duplicate, sanity-check, and drop the still-forming bar.

        Partial-ness is decided by the clock (``ts + interval <= now``) rather
        than by position, so a feed that happens to end on a completed bar keeps
        that bar instead of silently throwing away its most recent data.
        """
        candles = [c for c in candles if c.high >= c.low and c.close > 0]
        # De-duplicate on timestamp, keeping the last (most revised) copy.
        deduped: dict[int, Candle] = {c.ts: c for c in candles}
        out = [deduped[k] for k in sorted(deduped)]
        if not include_partial:
            step = interval_seconds(interval)
            cutoff = time.time()
            out = [c for c in out if c.ts + step <= cutoff]
        return out


def interval_seconds(interval: str) -> int:
    """'15m' -> 900. Supports m/h/d/w suffixes."""
    unit = interval[-1]
    try:
        qty = int(interval[:-1])
    except ValueError as exc:
        raise ValueError(f"bad interval: {interval!r}") from exc
    factor = {"m": 60, "h": 3600, "d": 86400, "w": 604800}.get(unit)
    if factor is None:
        raise ValueError(f"bad interval unit: {interval!r}")
    return qty * factor
