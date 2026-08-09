import unittest

from tradingmachine.backtest import Backtester, compute_metrics, max_drawdown
from tradingmachine.models import Candle, Side, Signal
from tradingmachine.portfolio import Portfolio
from tradingmachine.risk import RiskConfig
from tradingmachine.strategies.base import Strategy


class AlwaysLong(Strategy):
    """Fires LONG on every bar once warmed up, with a fixed ATR."""

    name = "always_long"

    def __init__(self, warmup=3, atr=1.0):
        super().__init__()
        self.warmup = warmup
        self.atr = atr

    def evaluate(self, candles):
        if len(candles) < self.warmup:
            return Signal(Side.FLAT, 0.0, "warming up")
        return Signal(Side.LONG, 1.0, "test", {"atr": self.atr})


class LongOnBar(Strategy):
    """Goes LONG exactly once, on the bar at `trigger_index`, then stays FLAT."""

    name = "long_on_bar"

    def __init__(self, trigger_index, atr=1.0):
        super().__init__()
        self.warmup = 1
        self.trigger_index = trigger_index
        self.atr = atr

    def evaluate(self, candles):
        if len(candles) - 1 == self.trigger_index:
            return Signal(Side.LONG, 1.0, "trigger", {"atr": self.atr})
        return Signal(Side.FLAT, 0.0, "idle")


def make_candles(rows):
    """rows: list of (open, high, low, close)."""
    return [
        Candle(ts=i * 3600, open=o, high=h, low=lo, close=c, volume=1.0)
        for i, (o, h, lo, c) in enumerate(rows)
    ]


NO_COST = dict(fee_bps=0.0, slippage_bps=0.0)


class TestNoLookahead(unittest.TestCase):
    """The defining property: you cannot trade a price you have only just seen."""

    def test_entry_fills_at_the_next_bar_open(self):
        rows = [(100, 101, 99, 100)] * 3
        rows.append((100, 101, 99, 100))     # index 3: the trigger bar
        rows.append((150, 151, 149, 150))    # index 4: gap up — the fill bar
        rows.extend([(150, 151, 149, 150)] * 5)

        bt = Backtester(
            LongOnBar(trigger_index=3),
            RiskConfig(stop_atr_mult=2.0, target_atr_mult=None, trail_atr_mult=None),
            starting_cash=10_000.0,
            **NO_COST,
        )
        result = bt.run({"AAA": make_candles(rows)}, "1h")
        self.assertEqual(len(result.portfolio.trades), 1)
        # 150 (next open), NOT 100 (the close the signal was computed from).
        self.assertAlmostEqual(result.portfolio.trades[0].entry_price, 150.0)

    def test_signal_bar_close_is_never_the_fill_price(self):
        rows = [(10, 10, 10, 10)] * 3
        rows.append((10, 10, 10, 10))
        rows.append((20, 20, 20, 20))
        rows.extend([(20, 20, 20, 20)] * 3)

        bt = Backtester(LongOnBar(trigger_index=3), RiskConfig(), 10_000.0, **NO_COST)
        result = bt.run({"AAA": make_candles(rows)}, "1h")
        for trade in result.portfolio.trades:
            self.assertNotAlmostEqual(trade.entry_price, 10.0)


class TestExecution(unittest.TestCase):
    def test_stop_out_fills_at_the_stop_price(self):
        rows = [(100, 100.5, 99.5, 100)] * 4
        rows.append((100, 100.5, 99.5, 100))    # fill bar (entry at open 100)
        rows.append((100, 100.5, 90.0, 92.0))   # crashes through the stop
        rows.extend([(92, 92.5, 91.5, 92)] * 3)

        bt = Backtester(
            LongOnBar(trigger_index=3, atr=1.0),
            RiskConfig(stop_atr_mult=2.0, target_atr_mult=None, trail_atr_mult=None),
            10_000.0,
            **NO_COST,
        )
        result = bt.run({"AAA": make_candles(rows)}, "1h")
        trades = result.portfolio.trades
        self.assertEqual(len(trades), 1)
        self.assertEqual(trades[0].reason, "stop")
        self.assertAlmostEqual(trades[0].exit_price, 98.0)  # 100 - 2 * ATR(1)
        self.assertAlmostEqual(trades[0].r_multiple, -1.0, places=6)

    def test_target_fills_at_the_target_price(self):
        rows = [(100, 100.5, 99.5, 100)] * 4
        rows.append((100, 100.5, 99.5, 100))
        rows.append((100, 110.0, 99.6, 109.0))
        rows.extend([(109, 109.5, 108.5, 109)] * 3)

        bt = Backtester(
            LongOnBar(trigger_index=3, atr=1.0),
            RiskConfig(stop_atr_mult=2.0, target_atr_mult=3.0, trail_atr_mult=None),
            10_000.0,
            **NO_COST,
        )
        result = bt.run({"AAA": make_candles(rows)}, "1h")
        self.assertEqual(result.portfolio.trades[0].reason, "target")
        self.assertAlmostEqual(result.portfolio.trades[0].exit_price, 103.0)

    def test_everything_is_closed_at_the_end(self):
        rows = [(100, 101, 99, 100)] * 20
        bt = Backtester(AlwaysLong(), RiskConfig(), 10_000.0, **NO_COST)
        result = bt.run({"AAA": make_candles(rows)}, "1h")
        self.assertEqual(len(result.portfolio.positions), 0)
        self.assertGreaterEqual(len(result.portfolio.trades), 1)

    def test_costs_make_a_flat_market_lose_money(self):
        rows = [(100, 100.2, 99.8, 100)] * 60
        bt = Backtester(
            AlwaysLong(),
            RiskConfig(cooldown_bars=0),
            10_000.0,
            fee_bps=10.0,
            slippage_bps=10.0,
        )
        result = bt.run({"AAA": make_candles(rows)}, "1h")
        self.assertLess(result.metrics.end_equity, 10_000.0)
        self.assertGreater(result.metrics.fees_paid, 0.0)


class TestRiskIntegration(unittest.TestCase):
    def test_max_positions_is_respected_across_symbols(self):
        rows = [(100, 101, 99, 100)] * 30
        data = {name: make_candles(rows) for name in ("AAA", "BBB", "CCC", "DDD")}
        bt = Backtester(
            AlwaysLong(),
            RiskConfig(max_positions=2, target_atr_mult=None, trail_atr_mult=None),
            10_000.0,
            **NO_COST,
        )
        result = bt.run(data, "1h")
        self.assertIn("at max positions", " ".join(result.entries_blocked))

        # The invariant that actually matters: never more than 2 open at once.
        events = []
        for t in result.portfolio.trades:
            events.append((t.entry_ts, 1))
            events.append((t.exit_ts, -1))
        events.sort()
        concurrent = peak = 0
        for _ts, delta in events:
            concurrent += delta
            peak = max(peak, concurrent)
        self.assertLessEqual(peak, 2)

    def test_multi_symbol_shares_one_timeline(self):
        rows = [(100, 101, 99, 100)] * 30
        bt = Backtester(AlwaysLong(), RiskConfig(), 10_000.0, **NO_COST)
        result = bt.run({"AAA": make_candles(rows), "BBB": make_candles(rows)}, "1h")
        self.assertEqual(result.metrics.bars, 30)
        self.assertEqual(sorted(result.symbols), ["AAA", "BBB"])


class TestMetrics(unittest.TestCase):
    def test_max_drawdown_of_a_known_curve(self):
        self.assertAlmostEqual(max_drawdown([100, 120, 60, 80]), 0.5)

    def test_max_drawdown_of_a_rising_curve_is_zero(self):
        self.assertAlmostEqual(max_drawdown([100, 110, 120]), 0.0)

    def test_cagr_is_annualized_from_the_clock_not_the_bar_count(self):
        """Regression: a multi-symbol union timeline holds several entries per
        real period, so annualizing off len(timeline) badly understates CAGR."""
        year = 31_557_600
        pf = Portfolio(10_000.0)
        pf.equity_curve = [(0, 10_000.0), (year, 11_000.0)]
        # `bars` is deliberately wrong (as it is for multi-venue runs); the
        # elapsed timestamps must win.
        m = compute_metrics(pf, "1d", bars=99_999)
        self.assertAlmostEqual(m.total_return_pct, 10.0)
        self.assertAlmostEqual(m.cagr_pct, 10.0, places=3)

    def test_two_year_span_halves_the_annual_rate(self):
        year = 31_557_600
        pf = Portfolio(10_000.0)
        pf.equity_curve = [(0, 10_000.0), (2 * year, 12_100.0)]
        m = compute_metrics(pf, "1d", bars=2)
        self.assertAlmostEqual(m.total_return_pct, 21.0)
        self.assertAlmostEqual(m.cagr_pct, 10.0, places=3)

    def test_empty_portfolio_metrics_do_not_crash(self):
        m = compute_metrics(Portfolio(10_000.0), "1h", 0)
        self.assertEqual(m.num_trades, 0)
        self.assertEqual(m.total_return_pct, 0.0)

    def test_report_renders(self):
        rows = [(100, 101, 99, 100)] * 30
        bt = Backtester(AlwaysLong(), RiskConfig(), 10_000.0, **NO_COST)
        result = bt.run({"AAA": make_candles(rows)}, "1h")
        text = result.report()
        self.assertIn("max drawdown", text)
        self.assertIn("profit factor", text)


if __name__ == "__main__":
    unittest.main()
