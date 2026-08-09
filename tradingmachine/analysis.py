"""Does this setup have a historical edge on this symbol?

There is no way to know whether the *next* trade wins. Anything claiming
otherwise is selling something. What you can know — and what actually informs a
decision — is the base rate: when this strategy has taken this kind of setup on
this symbol before, how often did it work, and by how much?

Two things keep that number honest here:

1. **An out-of-sample split.** The edge is measured on the older 70% of the
   history and then re-measured on the most recent 30%, which the first
   measurement never saw. An edge that evaporates out of sample was a story
   about the past, not a property of the market.
2. **A refusal to guess.** Under `MIN_SAMPLE` trades the verdict is
   "insufficient evidence" and no amount of favourable-looking numbers will
   change it. Small samples produce spectacular win rates by luck alone.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from .backtest import Backtester, Metrics
from .data import get_candles
from .models import Candle
from .risk import RiskConfig
from .strategies.base import Strategy

#: Below this many round trips, the numbers are noise and we say so.
MIN_SAMPLE = 20
#: Below this, we report but flag the sample as thin.
THIN_SAMPLE = 40
#: Out-of-sample trades needed before the recent slice can confirm or deny.
MIN_OOS_SAMPLE = 10


@dataclass
class Leg:
    """Metrics for one slice of history."""

    label: str
    trades: int = 0
    win_rate: float = 0.0
    expectancy_r: float = 0.0
    profit_factor: float = 0.0
    total_return_pct: float = 0.0
    max_drawdown_pct: float = 0.0

    @classmethod
    def from_metrics(cls, label: str, m: Metrics) -> "Leg":
        return cls(
            label=label,
            trades=m.num_trades,
            win_rate=m.win_rate_pct,
            expectancy_r=m.expectancy_r,
            profit_factor=m.profit_factor,
            total_return_pct=m.total_return_pct,
            max_drawdown_pct=m.max_drawdown_pct,
        )

    def as_dict(self) -> dict:
        return self.__dict__.copy()


@dataclass
class EdgeReport:
    symbol: str
    strategy: str
    interval: str
    bars: int
    full: Leg = field(default_factory=lambda: Leg("full"))
    in_sample: Leg = field(default_factory=lambda: Leg("in-sample"))
    out_sample: Leg = field(default_factory=lambda: Leg("out-of-sample"))
    verdict: str = ""
    grade: str = "unknown"        # strong | positive | fragile | negative | unknown
    confidence: str = "none"      # none | low | medium | high
    caveat: str = ""

    def as_dict(self) -> dict:
        return {
            "symbol": self.symbol,
            "strategy": self.strategy,
            "interval": self.interval,
            "bars": self.bars,
            "full": self.full.as_dict(),
            "in_sample": self.in_sample.as_dict(),
            "out_sample": self.out_sample.as_dict(),
            "verdict": self.verdict,
            "grade": self.grade,
            "confidence": self.confidence,
            "caveat": self.caveat,
        }

    def report(self) -> str:
        rows = [
            f"{self.symbol} · {self.strategy} · {self.interval} · {self.bars} bars",
            "-" * 66,
            f"{'':<16}{'trades':>8}{'win%':>8}{'exp R':>9}{'PF':>7}{'return':>10}",
        ]
        for leg in (self.full, self.in_sample, self.out_sample):
            rows.append(
                f"{leg.label:<16}{leg.trades:>8}{leg.win_rate:>8.1f}"
                f"{leg.expectancy_r:>+9.3f}{leg.profit_factor:>7.2f}"
                f"{leg.total_return_pct:>+9.2f}%"
            )
        rows += [
            "-" * 66,
            f"grade      {self.grade.upper()}   (confidence: {self.confidence})",
            f"verdict    {self.verdict}",
            f"caveat     {self.caveat}",
        ]
        return "\n".join(rows)


def _run(
    bars: list[Candle], strategy: Strategy, interval: str, risk: RiskConfig,
    cash: float, fee_bps: float, slippage_bps: float, symbol: str,
) -> Metrics:
    bt = Backtester(strategy, risk, cash, fee_bps, slippage_bps)
    return bt.run({symbol: bars}, interval).metrics


def edge_report(
    symbol: str,
    strategy: Strategy,
    interval: str = "1d",
    limit: int = 750,
    *,
    risk: RiskConfig | None = None,
    cash: float = 10_000.0,
    fee_bps: float = 5.0,
    slippage_bps: float = 5.0,
    split: float = 0.7,
    bars: list[Candle] | None = None,
) -> EdgeReport:
    """Measure the strategy's historical edge on one symbol, honestly."""
    risk = risk or RiskConfig()
    if bars is None:
        bars = get_candles(symbol, interval, limit)

    rep = EdgeReport(
        symbol=symbol, strategy=strategy.describe(), interval=interval, bars=len(bars)
    )

    if len(bars) < strategy.warmup + 30:
        rep.verdict = (
            f"Not enough history: {len(bars)} bars against a {strategy.warmup}-bar "
            "warm-up. Try a longer window or a faster interval."
        )
        rep.caveat = "No measurement was possible."
        return rep

    args = (strategy, interval, risk, cash, fee_bps, slippage_bps, symbol)
    rep.full = Leg.from_metrics("full history", _run(bars, *args))

    # The split point must leave the out-of-sample leg its own warm-up, or the
    # strategy spends the whole test period blind and reports a fake zero.
    cut = int(len(bars) * split)
    if cut > strategy.warmup + 20 and (len(bars) - cut) > strategy.warmup + 20:
        rep.in_sample = Leg.from_metrics("older 70%", _run(bars[:cut], *args))
        rep.out_sample = Leg.from_metrics("recent 30%", _run(bars[cut:], *args))
    else:
        rep.in_sample.label = "older 70%"
        rep.out_sample.label = "recent 30%"

    _judge(rep)
    return rep


def _judge(rep: EdgeReport) -> None:
    """Turn the legs into a grade, a verdict, and an unavoidable caveat."""
    full, oos = rep.full, rep.out_sample
    n = full.trades

    rep.confidence = (
        "none" if n < MIN_SAMPLE
        else "low" if n < THIN_SAMPLE
        else "medium" if n < 100
        else "high"
    )

    if n < MIN_SAMPLE:
        rep.grade = "unknown"
        rep.verdict = (
            f"Insufficient evidence — only {n} completed trades. Under {MIN_SAMPLE} "
            "the win rate is noise, and a good-looking number here means nothing."
        )
        rep.caveat = "Do not size a position off this. Widen the window first."
        return

    profitable = full.expectancy_r > 0 and full.profit_factor > 1.0
    # A handful of out-of-sample trades cannot confirm anything — five coin
    # flips landing heads is not evidence of a weighted coin.
    oos_measured = oos.trades >= MIN_OOS_SAMPLE
    oos_holds = oos.expectancy_r > 0 and oos.profit_factor > 1.0

    if profitable and oos_measured and oos_holds:
        rep.grade = "strong"
        rep.verdict = (
            f"Held up out of sample: {full.expectancy_r:+.3f}R per trade over "
            f"{n} trades, and still {oos.expectancy_r:+.3f}R on the recent third "
            "the measurement never saw."
        )
    elif profitable and oos_measured and not oos_holds:
        rep.grade = "fragile"
        rep.verdict = (
            f"Profitable overall ({full.expectancy_r:+.3f}R) but it broke down "
            f"recently ({oos.expectancy_r:+.3f}R on the last third). That pattern "
            "usually means the edge was regime-dependent, not durable."
        )
    elif profitable:
        rep.grade = "positive"
        rep.verdict = (
            f"Positive over the full history ({full.expectancy_r:+.3f}R across "
            f"{n} trades), but the recent third produced only {oos.trades} trades "
            f"— too few to confirm the edge still holds."
        )
    elif full.expectancy_r <= 0 and full.profit_factor < 1.0:
        rep.grade = "negative"
        rep.verdict = (
            f"No edge here: {full.expectancy_r:+.3f}R per trade over {n} trades, "
            f"profit factor {full.profit_factor:.2f}. This strategy has lost money "
            "on this symbol historically."
        )
    else:
        rep.grade = "fragile"
        rep.verdict = (
            f"Borderline: {full.expectancy_r:+.3f}R per trade, profit factor "
            f"{full.profit_factor:.2f}. Not a clear edge in either direction."
        )

    thin = " Sample is thin, so treat it as directional, not decisive." if n < THIN_SAMPLE else ""
    rep.caveat = (
        "This is a base rate over past bars, not a prediction about the next "
        "trade. The market regime that produced it can end without warning." + thin
    )
