"""Event-driven backtester and performance metrics.

Two rules govern this file, and both exist to stop the backtester from lying:

1. **No lookahead.** A signal computed from bar *i*'s close is executed at bar
   *i+1*'s OPEN. You cannot trade a close you have only just observed.
2. **Pessimistic intrabar.** If a bar's range spans both the stop and the
   target, the stop is assumed to fill. OHLC does not record the path within a
   bar, and assuming the good outcome is how a losing system backtests well.

Costs (fees + slippage) come from :class:`~tradingmachine.broker.PaperBroker`,
so the same execution model runs in backtest, paper, and live.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Sequence

from .broker.paper import PaperBroker
from .data import get_candles, interval_seconds
from .indicators import atr as atr_series
from .indicators import last_defined
from .models import Candle, Side, Signal, Trade
from .portfolio import Portfolio
from .risk import RiskConfig, RiskManager
from .strategies.base import Strategy

SECONDS_PER_YEAR = 31_557_600


# --------------------------------------------------------------------------- #
# metrics
# --------------------------------------------------------------------------- #

@dataclass
class Metrics:
    start_equity: float = 0.0
    end_equity: float = 0.0
    total_return_pct: float = 0.0
    cagr_pct: float = 0.0
    max_drawdown_pct: float = 0.0
    sharpe: float = 0.0
    sortino: float = 0.0
    calmar: float = 0.0
    num_trades: int = 0
    win_rate_pct: float = 0.0
    profit_factor: float = 0.0
    expectancy_r: float = 0.0
    avg_win: float = 0.0
    avg_loss: float = 0.0
    largest_win: float = 0.0
    largest_loss: float = 0.0
    max_consecutive_losses: int = 0
    fees_paid: float = 0.0
    exposure_pct: float = 0.0
    bars: int = 0

    def as_dict(self) -> dict:
        return self.__dict__.copy()

    def report(self) -> str:
        lines = [
            f"  equity        {self.start_equity:,.2f} -> {self.end_equity:,.2f}",
            f"  total return  {self.total_return_pct:+.2f}%",
            f"  CAGR          {self.cagr_pct:+.2f}%",
            f"  max drawdown  {self.max_drawdown_pct:.2f}%",
            f"  Sharpe        {self.sharpe:.2f}",
            f"  Sortino       {self.sortino:.2f}",
            f"  Calmar        {self.calmar:.2f}",
            f"  trades        {self.num_trades}  ({self.win_rate_pct:.1f}% winners)",
            f"  profit factor {self.profit_factor:.2f}",
            f"  expectancy    {self.expectancy_r:+.3f}R per trade",
            f"  avg win/loss  {self.avg_win:+,.2f} / {self.avg_loss:+,.2f}",
            f"  worst streak  {self.max_consecutive_losses} losses in a row",
            f"  fees paid     {self.fees_paid:,.2f}",
            f"  time in mkt   {self.exposure_pct:.1f}%",
        ]
        return "\n".join(lines)


def max_drawdown(equity: Sequence[float]) -> float:
    """Largest peak-to-trough decline, as a positive fraction."""
    peak = -math.inf
    worst = 0.0
    for value in equity:
        peak = max(peak, value)
        if peak > 0:
            worst = max(worst, 1.0 - value / peak)
    return worst


def _returns(equity: Sequence[float]) -> list[float]:
    out = []
    for prev, cur in zip(equity, equity[1:]):
        if prev > 0:
            out.append(cur / prev - 1.0)
    return out


def compute_metrics(
    portfolio: Portfolio,
    interval: str,
    bars: int,
    bars_in_market: int = 0,
) -> Metrics:
    m = Metrics()
    curve = [eq for _, eq in portfolio.equity_curve]
    if not curve:
        return m

    m.start_equity = portfolio.starting_cash
    m.end_equity = curve[-1]
    m.bars = bars
    m.fees_paid = portfolio.fees_paid
    m.total_return_pct = (m.end_equity / m.start_equity - 1.0) * 100.0
    m.max_drawdown_pct = max_drawdown(curve) * 100.0
    m.exposure_pct = (bars_in_market / bars * 100.0) if bars else 0.0

    # Elapsed time comes from the clock, not the bar count. On a multi-symbol
    # run the union timeline holds one entry per symbol per period — and venues
    # that stamp bars differently (crypto at 00:00 UTC, equities at the open)
    # never coincide, so `bars` can be several times the number of real periods.
    # Annualizing off that count would understate CAGR and inflate Sharpe.
    stamps = [ts for ts, _ in portfolio.equity_curve]
    elapsed = (stamps[-1] - stamps[0]) if len(stamps) > 1 else bars * interval_seconds(interval)
    span_years = elapsed / SECONDS_PER_YEAR

    if span_years > 0 and m.end_equity > 0:
        m.cagr_pct = ((m.end_equity / m.start_equity) ** (1 / span_years) - 1) * 100.0

    rets = _returns(curve)
    if len(rets) > 1 and span_years > 0:
        # Observed sampling rate, so the scaling matches the data actually there.
        periods_per_year = len(rets) / span_years
        mean = sum(rets) / len(rets)
        var = sum((r - mean) ** 2 for r in rets) / (len(rets) - 1)
        sd = math.sqrt(var)
        if sd > 0:
            m.sharpe = mean / sd * math.sqrt(periods_per_year)
        downside = [r for r in rets if r < 0]
        if downside:
            dvar = sum(r * r for r in downside) / len(downside)
            dsd = math.sqrt(dvar)
            if dsd > 0:
                m.sortino = mean / dsd * math.sqrt(periods_per_year)
    if m.max_drawdown_pct > 0:
        m.calmar = m.cagr_pct / m.max_drawdown_pct

    trades: list[Trade] = portfolio.trades
    m.num_trades = len(trades)
    if trades:
        wins = [t for t in trades if t.pnl > 0]
        losses = [t for t in trades if t.pnl <= 0]
        m.win_rate_pct = len(wins) / len(trades) * 100.0
        gross_win = sum(t.pnl for t in wins)
        gross_loss = abs(sum(t.pnl for t in losses))
        m.profit_factor = (
            gross_win / gross_loss if gross_loss > 0 else (math.inf if gross_win else 0.0)
        )
        m.avg_win = gross_win / len(wins) if wins else 0.0
        m.avg_loss = -gross_loss / len(losses) if losses else 0.0
        m.largest_win = max((t.pnl for t in trades), default=0.0)
        m.largest_loss = min((t.pnl for t in trades), default=0.0)

        r_values = [t.r_multiple for t in trades if t.r_multiple is not None]
        if r_values:
            m.expectancy_r = sum(r_values) / len(r_values)

        streak = 0
        for t in trades:
            streak = streak + 1 if t.pnl <= 0 else 0
            m.max_consecutive_losses = max(m.max_consecutive_losses, streak)
    return m


# --------------------------------------------------------------------------- #
# backtester
# --------------------------------------------------------------------------- #

@dataclass
class BacktestResult:
    metrics: Metrics
    portfolio: Portfolio
    symbols: list[str]
    interval: str
    strategy: str
    signals_seen: int = 0
    entries_blocked: dict[str, int] = field(default_factory=dict)

    def report(self) -> str:
        header = (
            f"{self.strategy} on {', '.join(self.symbols)} @ {self.interval}\n"
            f"{'-' * 60}"
        )
        blocked = ""
        if self.entries_blocked:
            top = sorted(self.entries_blocked.items(), key=lambda kv: -kv[1])[:5]
            blocked = "\n  blocked entries: " + ", ".join(f"{k} x{v}" for k, v in top)
        return f"{header}\n{self.metrics.report()}{blocked}"


@dataclass
class _Pending:
    """An order decided on the previous bar, to be filled at this bar's open."""

    symbol: str
    kind: str          # "entry" | "exit"
    signal: Signal | None = None
    reason: str = ""


class Backtester:
    def __init__(
        self,
        strategy: Strategy,
        risk: RiskConfig | None = None,
        starting_cash: float = 10_000.0,
        fee_bps: float = 5.0,
        slippage_bps: float = 5.0,
    ) -> None:
        self.strategy = strategy
        self.risk_config = risk or RiskConfig()
        self.starting_cash = starting_cash
        self.fee_bps = fee_bps
        self.slippage_bps = slippage_bps

    # ------------------------------------------------------------------ #

    def run(
        self,
        data: dict[str, list[Candle]],
        interval: str = "1h",
    ) -> BacktestResult:
        if not data:
            raise ValueError("no data to backtest")

        portfolio = Portfolio(starting_cash=self.starting_cash)
        risk = RiskManager(self.risk_config)
        broker = PaperBroker(fee_bps=self.fee_bps, slippage_bps=self.slippage_bps)

        symbols = sorted(data)
        # Union timeline so multi-symbol runs share one clock and one risk budget.
        timeline = sorted({c.ts for bars in data.values() for c in bars})
        by_ts = {sym: {c.ts: c for c in bars} for sym, bars in data.items()}
        history: dict[str, list[Candle]] = {sym: [] for sym in symbols}
        last_price: dict[str, float] = {}
        pending: list[_Pending] = []
        blocked: dict[str, int] = {}
        signals_seen = 0
        bars_in_market = 0

        for ts in timeline:
            # 1. Fill orders decided on the previous bar, at this bar's OPEN.
            still_pending: list[_Pending] = []
            for order in pending:
                bar = by_ts[order.symbol].get(ts)
                if bar is None:
                    # This symbol didn't print; the decision waits, it doesn't vanish.
                    still_pending.append(order)
                    continue
                self._execute(order, bar, portfolio, broker, risk, ts, last_price, blocked)
            pending = still_pending

            # 2. Advance history and mark prices for symbols that printed.
            active = []
            for sym in symbols:
                bar = by_ts[sym].get(ts)
                if bar is None:
                    continue
                history[sym].append(bar)
                last_price[sym] = bar.close
                active.append((sym, bar))

            # 3. Stops and targets, checked against THIS bar's range.
            for sym, bar in active:
                pos = portfolio.positions.get(sym)
                if pos is None:
                    continue
                hit, price, why = risk.exit_price_hit(pos, bar.high, bar.low)
                if hit:
                    fill = broker.market_order(
                        sym, pos.side, pos.qty, price, ts, reduce_only=True, tag=why
                    )
                    portfolio.close_position(fill, why, self.strategy.name)
                    risk.start_cooldown(sym)

            # 4. Trail stops and roll conviction into next bar's decisions.
            for sym, bar in active:
                pos = portfolio.positions.get(sym)
                if pos is not None:
                    portfolio.update_extreme(sym, bar.close)
                    atr_v = last_defined(atr_series(history[sym], 14))
                    if atr_v:
                        risk.update_trailing_stop(pos, atr_v)

                if len(history[sym]) < self.strategy.warmup:
                    continue
                signal = self.strategy.evaluate(history[sym])
                signals_seen += 1
                pos = portfolio.positions.get(sym)

                if pos is not None:
                    # Exit only on a real change of conviction (see RiskManager).
                    leave, why = risk.should_exit_on_signal(pos, signal)
                    if leave:
                        pending.append(_Pending(sym, "exit", reason=why))
                    continue

                ok, why = risk.can_enter(sym, signal, portfolio, last_price)
                if not ok:
                    if signal.side is not Side.FLAT:
                        blocked[why.split(" (")[0]] = blocked.get(why.split(" (")[0], 0) + 1
                    continue
                pending.append(_Pending(sym, "entry", signal=signal))

            # 5. Mark the book and update risk state once per timestamp.
            equity = portfolio.equity(last_price)
            portfolio.mark(ts, last_price)
            risk.observe_equity(equity, ts)
            risk.tick_cooldowns()
            if portfolio.positions:
                bars_in_market += 1

        # Close anything still open at the final price — an open position is not
        # a result, and leaving it out would flatter or flatter-not the metrics.
        final_ts = timeline[-1] if timeline else 0
        for sym in list(portfolio.positions):
            pos = portfolio.positions[sym]
            price = last_price.get(sym, pos.entry_price)
            fill = broker.market_order(
                sym, pos.side, pos.qty, price, final_ts, reduce_only=True, tag="eod"
            )
            portfolio.close_position(fill, "end of backtest", self.strategy.name)
        if timeline:
            portfolio.mark(final_ts, last_price)

        metrics = compute_metrics(portfolio, interval, len(timeline), bars_in_market)
        return BacktestResult(
            metrics=metrics,
            portfolio=portfolio,
            symbols=symbols,
            interval=interval,
            strategy=self.strategy.describe(),
            signals_seen=signals_seen,
            entries_blocked=blocked,
        )

    # ------------------------------------------------------------------ #

    def _execute(
        self,
        order: _Pending,
        bar: Candle,
        portfolio: Portfolio,
        broker: PaperBroker,
        risk: RiskManager,
        ts: int,
        last_price: dict[str, float],
        blocked: dict[str, int],
    ) -> None:
        sym = order.symbol
        price = bar.open

        if order.kind == "exit":
            pos = portfolio.positions.get(sym)
            if pos is None:
                return
            fill = broker.market_order(
                sym, pos.side, pos.qty, price, ts, reduce_only=True, tag=order.reason
            )
            portfolio.close_position(fill, order.reason, self.strategy.name)
            risk.start_cooldown(sym)
            return

        signal = order.signal
        if signal is None:
            return

        prices = dict(last_price)
        prices[sym] = price

        # Re-check the gates at FILL time, not just at signal time. Several
        # symbols can signal on the same bar while the book is still empty; if
        # only the queue-time check applied, they would all fill and blow
        # straight through max_positions and the exposure caps.
        ok, why = risk.can_enter(sym, signal, portfolio, prices)
        if not ok:
            key = why.split(" (")[0]
            blocked[key] = blocked.get(key, 0) + 1
            return

        atr_v = signal.meta.get("atr")
        if not atr_v:
            return
        equity = portfolio.equity(prices)
        sized = risk.size(signal, price, atr_v, equity, portfolio.exposure(prices))
        if sized is None:
            return

        fill = broker.market_order(sym, signal.side, sized.qty, price, ts, tag=signal.reason)
        # Re-anchor stop/target on the ACTUAL fill, not the pre-slippage price.
        offset = fill.price - price
        portfolio.open_position(
            fill,
            stop=sized.stop + offset,
            target=sized.target + offset if sized.target else None,
            tag=signal.reason,
        )


# --------------------------------------------------------------------------- #
# convenience
# --------------------------------------------------------------------------- #

def run_backtest(
    strategy: Strategy,
    symbols: Sequence[str],
    interval: str = "1h",
    limit: int = 1000,
    starting_cash: float = 10_000.0,
    risk: RiskConfig | None = None,
    fee_bps: float = 5.0,
    slippage_bps: float = 5.0,
    source: str | None = None,
) -> BacktestResult:
    """Fetch history for `symbols` and backtest `strategy` over it."""
    data = {
        sym: get_candles(sym, interval, limit, source=source) for sym in symbols
    }
    bt = Backtester(strategy, risk, starting_cash, fee_bps, slippage_bps)
    return bt.run(data, interval)
