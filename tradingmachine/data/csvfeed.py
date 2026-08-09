"""Read OHLCV from local CSV — for backtesting your own or a vendor's history."""

from __future__ import annotations

import csv
import os
from datetime import datetime, timezone

from ..models import Candle
from .base import DataError, DataFeed

_TS_FORMATS = (
    "%Y-%m-%d %H:%M:%S",
    "%Y-%m-%dT%H:%M:%S",
    "%Y-%m-%dT%H:%M:%SZ",
    "%Y-%m-%d %H:%M",
    "%Y-%m-%d",
    "%d/%m/%Y %H:%M",
    "%m/%d/%Y",
)


def parse_timestamp(raw: str) -> int:
    """Accept epoch seconds, epoch millis, or the common datetime spellings."""
    raw = raw.strip()
    if raw.isdigit():
        value = int(raw)
        # 11+ digits is milliseconds; epoch seconds won't reach that until 5138.
        return value // 1000 if value > 10_000_000_000 else value
    for fmt in _TS_FORMATS:
        try:
            return int(datetime.strptime(raw, fmt).replace(tzinfo=timezone.utc).timestamp())
        except ValueError:
            continue
    try:
        return int(datetime.fromisoformat(raw).replace(tzinfo=timezone.utc).timestamp())
    except ValueError as exc:
        raise DataError(f"unrecognised timestamp: {raw!r}") from exc


class CsvFeed(DataFeed):
    """Expects a header row containing time/open/high/low/close[/volume].

    Column names are matched loosely: ``time``/``timestamp``/``date``/``datetime``
    for the clock, and the usual OHLCV names (case-insensitive) for prices.
    """

    name = "csv"
    supported_intervals = frozenset(
        {"1m", "5m", "15m", "30m", "1h", "4h", "6h", "1d", "1w"}
    )

    def __init__(self, path_template: str) -> None:
        # e.g. "data/{symbol}_{interval}.csv"
        self.path_template = path_template

    def fetch(
        self,
        symbol: str,
        interval: str,
        limit: int = 500,
        *,
        include_partial: bool = True,
    ) -> list[Candle]:
        path = self.path_template.format(symbol=symbol, interval=interval)
        if not os.path.exists(path):
            raise DataError(f"csv not found: {path}")

        candles: list[Candle] = []
        with open(path, newline="", encoding="utf-8") as fh:
            reader = csv.DictReader(fh)
            if not reader.fieldnames:
                raise DataError(f"csv has no header: {path}")
            cols = {name.strip().lower(): name for name in reader.fieldnames}

            def pick(*names: str) -> str:
                for n in names:
                    if n in cols:
                        return cols[n]
                raise DataError(f"csv {path} is missing one of {names}")

            t = pick("time", "timestamp", "date", "datetime", "open_time")
            o, h, l, c = pick("open", "o"), pick("high", "h"), pick("low", "l"), pick("close", "c")
            v = cols.get("volume") or cols.get("vol") or cols.get("v")

            for row in reader:
                if not row.get(t):
                    continue
                candles.append(
                    Candle(
                        parse_timestamp(row[t]),
                        float(row[o]),
                        float(row[h]),
                        float(row[l]),
                        float(row[c]),
                        float(row[v]) if v and row.get(v) else 0.0,
                    )
                )
        if not candles:
            raise DataError(f"csv {path} contained no rows")
        # Local files are historical by definition — nothing here is "forming".
        candles = self._finalize(candles, interval, include_partial=True)
        return candles[-limit:]
