import unittest

from tradingmachine.models import Fill, Position, Side, Signal
from tradingmachine.portfolio import Portfolio
from tradingmachine.risk import RiskConfig, RiskManager


class TestSizing(unittest.TestCase):
    def setUp(self):
        self.rm = RiskManager(
            RiskConfig(risk_per_trade=0.01, stop_atr_mult=2.0, max_position_pct=1.0)
        )

    def test_risk_amount_matches_configured_fraction(self):
        sized = self.rm.size(Signal(Side.LONG, 1.0), price=100.0, atr=2.0, equity=10_000.0)
        assert sized is not None
        # 1% of 10k = 100 risked over a 4.0 stop distance -> 25 units.
        self.assertAlmostEqual(sized.qty, 25.0)
        self.assertAlmostEqual(sized.risk_amount, 100.0)
        self.assertAlmostEqual(sized.stop, 96.0)

    def test_strength_scales_size_linearly(self):
        full = self.rm.size(Signal(Side.LONG, 1.0), 100.0, 2.0, 10_000.0)
        half = self.rm.size(Signal(Side.LONG, 0.5), 100.0, 2.0, 10_000.0)
        self.assertAlmostEqual(half.qty, full.qty / 2)

    def test_short_stop_is_above_entry(self):
        sized = self.rm.size(Signal(Side.SHORT, 1.0), 100.0, 2.0, 10_000.0)
        self.assertGreater(sized.stop, 100.0)
        self.assertLess(sized.target, 100.0)

    def test_wider_atr_means_smaller_position(self):
        calm = self.rm.size(Signal(Side.LONG, 1.0), 100.0, 1.0, 10_000.0)
        wild = self.rm.size(Signal(Side.LONG, 1.0), 100.0, 8.0, 10_000.0)
        self.assertLess(wild.qty, calm.qty)
        # Same dollar risk either way — that is the whole point of ATR sizing.
        self.assertAlmostEqual(calm.risk_amount, wild.risk_amount, places=6)

    def test_position_cap_is_enforced(self):
        rm = RiskManager(RiskConfig(risk_per_trade=0.5, max_position_pct=0.1))
        sized = rm.size(Signal(Side.LONG, 1.0), 100.0, 1.0, 10_000.0)
        self.assertLessEqual(sized.notional, 10_000.0 * 0.1 + 1e-9)

    def test_gross_exposure_budget_limits_size(self):
        rm = RiskManager(RiskConfig(max_gross_exposure_pct=1.0, max_position_pct=1.0))
        sized = rm.size(
            Signal(Side.LONG, 1.0), 100.0, 1.0, equity=10_000.0, current_exposure=9_500.0
        )
        self.assertLessEqual(sized.notional, 500.0 + 1e-9)

    def test_no_size_when_budget_exhausted(self):
        rm = RiskManager(RiskConfig(max_gross_exposure_pct=1.0))
        self.assertIsNone(
            rm.size(Signal(Side.LONG, 1.0), 100.0, 1.0, 10_000.0, current_exposure=10_000.0)
        )

    def test_degenerate_inputs_return_none(self):
        self.assertIsNone(self.rm.size(Signal(Side.LONG, 1.0), 0.0, 2.0, 10_000.0))
        self.assertIsNone(self.rm.size(Signal(Side.LONG, 1.0), 100.0, 0.0, 10_000.0))
        self.assertIsNone(self.rm.size(Signal(Side.FLAT, 0.0), 100.0, 2.0, 10_000.0))
        self.assertIsNone(self.rm.size(Signal(Side.LONG, 1.0), 100.0, 2.0, -5.0))

    def test_microscopic_stop_is_refused(self):
        """A near-zero stop would divide risk by ~0 and size an absurd position."""
        rm = RiskManager(RiskConfig(stop_atr_mult=2.0, min_stop_pct=0.001))
        self.assertIsNone(rm.size(Signal(Side.LONG, 1.0), 100.0, 0.0001, 10_000.0))


class TestGates(unittest.TestCase):
    def setUp(self):
        self.rm = RiskManager(RiskConfig(max_positions=2, min_strength=0.2))
        self.pf = Portfolio(starting_cash=10_000.0)
        self.prices = {"AAA": 100.0, "BBB": 100.0, "CCC": 100.0}

    def _open(self, symbol):
        self.pf.open_position(Fill(symbol, Side.LONG, 1.0, 100.0, 0.0, 0), stop=95.0)

    def test_blocks_weak_signal(self):
        ok, why = self.rm.can_enter("AAA", Signal(Side.LONG, 0.05), self.pf, self.prices)
        self.assertFalse(ok)
        self.assertIn("strength", why)

    def test_blocks_flat_signal(self):
        ok, _ = self.rm.can_enter("AAA", Signal(Side.FLAT, 0.0), self.pf, self.prices)
        self.assertFalse(ok)

    def test_blocks_duplicate_position(self):
        self._open("AAA")
        ok, why = self.rm.can_enter("AAA", Signal(Side.LONG, 1.0), self.pf, self.prices)
        self.assertFalse(ok)
        self.assertIn("already", why)

    def test_blocks_at_max_positions(self):
        self._open("AAA")
        self._open("BBB")
        ok, why = self.rm.can_enter("CCC", Signal(Side.LONG, 1.0), self.pf, self.prices)
        self.assertFalse(ok)
        self.assertIn("max positions", why)

    def test_cooldown_blocks_then_expires(self):
        rm = RiskManager(RiskConfig(cooldown_bars=2))
        rm.start_cooldown("AAA")
        ok, why = rm.can_enter("AAA", Signal(Side.LONG, 1.0), self.pf, self.prices)
        self.assertFalse(ok)
        self.assertIn("cooldown", why)
        rm.tick_cooldowns()
        rm.tick_cooldowns()
        ok, _ = rm.can_enter("AAA", Signal(Side.LONG, 1.0), self.pf, self.prices)
        self.assertTrue(ok)

    def test_allows_a_clean_signal(self):
        ok, why = self.rm.can_enter("AAA", Signal(Side.LONG, 0.9), self.pf, self.prices)
        self.assertTrue(ok, why)


class TestHalts(unittest.TestCase):
    def test_drawdown_halt_triggers_and_persists(self):
        rm = RiskManager(RiskConfig(max_drawdown_pct=0.2))
        rm.observe_equity(10_000.0, ts=0)
        rm.observe_equity(7_900.0, ts=3600)
        self.assertTrue(rm.state.halted)
        self.assertIn("drawdown", rm.state.halt_reason)
        # A new UTC day must NOT clear a drawdown halt.
        rm.observe_equity(7_900.0, ts=90_000)
        self.assertTrue(rm.state.halted)

    def test_daily_loss_halt_clears_next_day(self):
        rm = RiskManager(RiskConfig(max_daily_loss_pct=0.03, max_drawdown_pct=0.9))
        rm.observe_equity(10_000.0, ts=0)
        rm.observe_equity(9_600.0, ts=3600)
        self.assertTrue(rm.state.halted)
        rm.observe_equity(9_600.0, ts=90_000)  # next UTC day
        self.assertFalse(rm.state.halted)

    def test_halt_blocks_entries(self):
        rm = RiskManager(RiskConfig(max_drawdown_pct=0.1))
        rm.observe_equity(10_000.0, ts=0)
        rm.observe_equity(8_000.0, ts=3600)
        ok, why = rm.can_enter(
            "AAA", Signal(Side.LONG, 1.0), Portfolio(10_000.0), {"AAA": 100.0}
        )
        self.assertFalse(ok)
        self.assertIn("halted", why)


class TestExits(unittest.TestCase):
    def test_stop_wins_when_a_bar_spans_both_levels(self):
        """The pessimistic assumption — without it, backtests invent returns."""
        rm = RiskManager(RiskConfig())
        pos = Position("AAA", Side.LONG, 1.0, 100.0, 0, stop=95.0, target=105.0)
        hit, price, why = rm.exit_price_hit(pos, high=106.0, low=94.0)
        self.assertTrue(hit)
        self.assertEqual(why, "stop")
        self.assertEqual(price, 95.0)

    def test_short_stop_is_triggered_by_the_high(self):
        rm = RiskManager(RiskConfig())
        pos = Position("AAA", Side.SHORT, 1.0, 100.0, 0, stop=105.0, target=95.0)
        hit, price, why = rm.exit_price_hit(pos, high=106.0, low=99.0)
        self.assertTrue(hit)
        self.assertEqual((why, price), ("stop", 105.0))

    def test_no_exit_inside_the_range(self):
        rm = RiskManager(RiskConfig())
        pos = Position("AAA", Side.LONG, 1.0, 100.0, 0, stop=95.0, target=105.0)
        self.assertFalse(rm.exit_price_hit(pos, high=104.0, low=96.0)[0])

    def test_trailing_stop_only_ratchets_up(self):
        rm = RiskManager(RiskConfig(trail_atr_mult=2.0))
        pos = Position("AAA", Side.LONG, 1.0, 100.0, 0, stop=96.0, extreme=110.0)
        self.assertTrue(rm.update_trailing_stop(pos, atr=1.0))
        self.assertAlmostEqual(pos.stop, 108.0)
        pos.extreme = 105.0  # price pulled back
        self.assertFalse(rm.update_trailing_stop(pos, atr=1.0))
        self.assertAlmostEqual(pos.stop, 108.0)  # unchanged: stops never widen

    def test_trailing_stop_only_ratchets_down_for_shorts(self):
        rm = RiskManager(RiskConfig(trail_atr_mult=2.0))
        pos = Position("AAA", Side.SHORT, 1.0, 100.0, 0, stop=104.0, extreme=90.0)
        self.assertTrue(rm.update_trailing_stop(pos, atr=1.0))
        self.assertAlmostEqual(pos.stop, 92.0)
        pos.extreme = 95.0
        self.assertFalse(rm.update_trailing_stop(pos, atr=1.0))

    def test_flat_signal_does_not_exit_by_default(self):
        rm = RiskManager(RiskConfig())
        pos = Position("AAA", Side.LONG, 1.0, 100.0, 0, stop=95.0)
        self.assertFalse(rm.should_exit_on_signal(pos, Signal(Side.FLAT, 0.0))[0])

    def test_opposite_signal_exits(self):
        rm = RiskManager(RiskConfig())
        pos = Position("AAA", Side.LONG, 1.0, 100.0, 0, stop=95.0)
        leave, why = rm.should_exit_on_signal(pos, Signal(Side.SHORT, 0.8))
        self.assertTrue(leave)
        self.assertIn("short", why)

    def test_exit_on_flat_when_enabled(self):
        rm = RiskManager(RiskConfig(exit_on_flat=True))
        pos = Position("AAA", Side.LONG, 1.0, 100.0, 0, stop=95.0)
        self.assertTrue(rm.should_exit_on_signal(pos, Signal(Side.FLAT, 0.0))[0])


if __name__ == "__main__":
    unittest.main()
