"""Scan a universe of symbols and rank what the strategy actually likes.

This is the "show me other stocks" surface: point it at a basket, and it fetches
every symbol concurrently, runs the strategy, and returns a ranked list with
enough context to judge each candidate without opening a chart.
"""

from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from typing import Sequence

from .data import DataError, get_candles
from .indicators import adx, atr, closes, ema, last_defined, rsi
from .models import Candle, Side
from .strategies.base import Strategy
from .universe import describe, resolve

log = logging.getLogger(__name__)


@dataclass
class Candidate:
    symbol: str
    asset_class: str
    price: float = 0.0
    change_pct: float = 0.0
    side: Side = Side.FLAT
    strength: float = 0.0
    reason: str = ""
    atr: float = 0.0
    atr_pct: float = 0.0          # volatility as a % of price — comparable across symbols
    rsi: float | None = None
    adx: float | None = None
    above_200: bool | None = None
    vol_ratio: float | None = None  # today's volume vs its 20-bar average
    spark: list[float] = field(default_factory=list)
    error: str = ""

    @property
    def ok(self) -> bool:
        return not self.error

    @property
    def has_signal(self) -> bool:
        return self.side is not Side.FLAT and self.strength > 0

    def as_dict(self) -> dict:
        d = self.__dict__.copy()
        d["side"] = self.side.value
        d["has_signal"] = self.has_signal
        return d


def _snapshot(symbol: str, bars: Sequence[Candle], strategy: Strategy) -> Candidate:
    px = closes(bars)
    last = bars[-1]
    prev = bars[-2].close if len(bars) > 1 else last.close

    cand = Candidate(
        symbol=symbol,
        asset_class=describe(symbol),
        price=last.close,
        change_pct=((last.close / prev - 1) * 100.0) if prev else 0.0,
        spark=[round(b.close, 6) for b in bars[-60:]],
    )

    if len(bars) < strategy.warmup:
        cand.error = f"only {len(bars)} bars, needs {strategy.warmup}"
        return cand

    sig = strategy.evaluate(bars)
    cand.side, cand.strength, cand.reason = sig.side, sig.strength, sig.reason

    atr_v = sig.meta.get("atr") or last_defined(atr(bars, 14))
    if atr_v:
        cand.atr = atr_v
        cand.atr_pct = atr_v / last.close * 100.0 if last.close else 0.0

    cand.rsi = last_defined(rsi(px, 14))
    cand.adx = last_defined(adx(bars, 14))

    ema200 = last_defined(ema(px, 200)) if len(px) >= 200 else None
    if ema200:
        cand.above_200 = last.close > ema200

    vols = [b.volume for b in bars[-21:-1] if b.volume]
    if vols and last.volume:
        avg = sum(vols) / len(vols)
        cand.vol_ratio = last.volume / avg if avg else None

    return cand


def screen(
    universe: str | Sequence[str],
    strategy: Strategy,
    interval: str = "1d",
    limit: int = 400,
    *,
    workers: int = 8,
    signals_only: bool = False,
    source: str | None = None,
    progress: bool = False,
) -> list[Candidate]:
    """Evaluate every symbol in `universe` and return them ranked.

    Symbols that fail to fetch are returned with `.error` set rather than
    dropped — a silently shorter list looks like "nothing qualified", which is a
    very different and much more misleading statement than "the feed broke".
    """
    symbols = resolve(universe) if isinstance(universe, str) else list(universe)
    if not symbols:
        return []

    results: list[Candidate] = []
    done = 0

    def work(sym: str) -> Candidate:
        try:
            bars = get_candles(sym, interval, limit, source=source)
        except DataError as exc:
            return Candidate(symbol=sym, asset_class=describe(sym), error=str(exc)[:120])
        if not bars:
            return Candidate(symbol=sym, asset_class=describe(sym), error="no bars returned")
        return _snapshot(sym, bars, strategy)

    # Modest pool: these are public endpoints and hammering them gets you
    # rate-limited, which is slower than being patient in the first place.
    with ThreadPoolExecutor(max_workers=max(1, workers)) as pool:
        futures = {pool.submit(work, s): s for s in symbols}
        for fut in as_completed(futures):
            sym = futures[fut]
            try:
                results.append(fut.result())
            except Exception as exc:  # noqa: BLE001 - one bad symbol must not kill the scan
                log.error("screen failed for %s: %s", sym, exc)
                results.append(
                    Candidate(symbol=sym, asset_class=describe(sym), error=str(exc)[:120])
                )
            done += 1
            if progress and done % 10 == 0:
                print(f"  scanned {done}/{len(symbols)}...", flush=True)

    if signals_only:
        results = [c for c in results if c.has_signal]

    return rank(results)


def rank(candidates: list[Candidate]) -> list[Candidate]:
    """Signals first, strongest first; then quiet symbols; errors last."""
    return sorted(
        candidates,
        key=lambda c: (
            bool(c.error),
            not c.has_signal,
            -c.strength,
            -abs(c.change_pct),
            c.symbol,
        ),
    )


def summarize(candidates: list[Candidate]) -> dict:
    ok = [c for c in candidates if c.ok]
    longs = [c for c in ok if c.side is Side.LONG]
    shorts = [c for c in ok if c.side is Side.SHORT]
    return {
        "scanned": len(candidates),
        "ok": len(ok),
        "errors": len(candidates) - len(ok),
        "long": len(longs),
        "short": len(shorts),
        "flat": len(ok) - len(longs) - len(shorts),
        "avg_atr_pct": (sum(c.atr_pct for c in ok) / len(ok)) if ok else 0.0,
    }
