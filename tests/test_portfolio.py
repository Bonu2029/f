import unittest

from tradingmachine.broker.paper import PaperBroker
from tradingmachine.models import Fill, Side
from tradingmachine.portfolio import Portfolio


class TestAccounting(unittest.TestCase):
    def setUp(self):
        self.pf = Portfolio(starting_cash=10_000.0)

    def test_starts_flat(self):
        self.assertEqual(self.pf.equity({}), 10_000.0)
        self.assertEqual(self.pf.positions, {})

    def test_long_profit_flows_to_cash(self):
        self.pf.open_position(Fill("AAA", Side.LONG, 10.0, 100.0, 0.0, 0), stop=95.0)
        trade = self.pf.close_position(Fill("AAA", Side.LONG, 10.0, 110.0, 0.0, 100), "target")
        self.assertAlmostEqual(trade.pnl, 100.0)
        self.assertAlmostEqual(self.pf.cash, 10_100.0)
        self.assertAlmostEqual(self.pf.equity({}), 10_100.0)

    def test_short_profits_when_price_falls(self):
        self.pf.open_position(Fill("AAA", Side.SHORT, 10.0, 100.0, 0.0, 0), stop=105.0)
        trade = self.pf.close_position(Fill("AAA", Side.SHORT, 10.0, 90.0, 0.0, 100), "target")
        self.assertAlmostEqual(trade.pnl, 100.0)

    def test_short_loses_when_price_rises(self):
        self.pf.open_position(Fill("AAA", Side.SHORT, 10.0, 100.0, 0.0, 0), stop=105.0)
        trade = self.pf.close_position(Fill("AAA", Side.SHORT, 10.0, 110.0, 0.0, 100), "stop")
        self.assertAlmostEqual(trade.pnl, -100.0)

    def test_fees_are_charged_on_both_sides(self):
        self.pf.open_position(Fill("AAA", Side.LONG, 10.0, 100.0, 5.0, 0), stop=95.0)
        trade = self.pf.close_position(Fill("AAA", Side.LONG, 10.0, 110.0, 5.0, 100), "target")
        self.assertAlmostEqual(trade.fees, 10.0)
        self.assertAlmostEqual(trade.pnl, 90.0)
        self.assertAlmostEqual(self.pf.cash, 10_090.0)

    def test_unrealized_shows_in_equity(self):
        self.pf.open_position(Fill("AAA", Side.LONG, 10.0, 100.0, 0.0, 0), stop=95.0)
        self.assertAlmostEqual(self.pf.equity({"AAA": 105.0}), 10_050.0)

    def test_missing_price_marks_at_entry(self):
        """A data gap must never make equity jump."""
        self.pf.open_position(Fill("AAA", Side.LONG, 10.0, 100.0, 0.0, 0), stop=95.0)
        self.assertAlmostEqual(self.pf.equity({}), 10_000.0)

    def test_double_open_is_refused(self):
        self.pf.open_position(Fill("AAA", Side.LONG, 1.0, 100.0, 0.0, 0))
        with self.assertRaises(ValueError):
            self.pf.open_position(Fill("AAA", Side.LONG, 1.0, 100.0, 0.0, 0))

    def test_closing_nothing_is_refused(self):
        with self.assertRaises(ValueError):
            self.pf.close_position(Fill("AAA", Side.LONG, 1.0, 100.0, 0.0, 0), "x")

    def test_exposure_is_gross_notional(self):
        self.pf.open_position(Fill("AAA", Side.LONG, 10.0, 100.0, 0.0, 0))
        self.pf.open_position(Fill("BBB", Side.SHORT, 5.0, 200.0, 0.0, 0))
        self.assertAlmostEqual(self.pf.exposure({"AAA": 100.0, "BBB": 200.0}), 2_000.0)


class TestRMultiple(unittest.TestCase):
    def test_r_is_measured_against_the_entry_stop(self):
        pf = Portfolio(10_000.0)
        pf.open_position(Fill("AAA", Side.LONG, 10.0, 100.0, 0.0, 0), stop=95.0)
        # Trailing logic ratchets the live stop; R must ignore that.
        pf.positions["AAA"].stop = 99.9
        trade = pf.close_position(Fill("AAA", Side.LONG, 10.0, 105.0, 0.0, 10), "target")
        self.assertAlmostEqual(trade.r_multiple, 1.0)

    def test_full_stop_out_is_minus_one_r(self):
        pf = Portfolio(10_000.0)
        pf.open_position(Fill("AAA", Side.LONG, 10.0, 100.0, 0.0, 0), stop=95.0)
        trade = pf.close_position(Fill("AAA", Side.LONG, 10.0, 95.0, 0.0, 10), "stop")
        self.assertAlmostEqual(trade.r_multiple, -1.0)

    def test_r_is_none_without_a_stop(self):
        pf = Portfolio(10_000.0)
        pf.open_position(Fill("AAA", Side.LONG, 10.0, 100.0, 0.0, 0))
        trade = pf.close_position(Fill("AAA", Side.LONG, 10.0, 105.0, 0.0, 10), "manual")
        self.assertIsNone(trade.r_multiple)


class TestPaperBroker(unittest.TestCase):
    def test_slippage_always_hurts(self):
        broker = PaperBroker(fee_bps=0.0, slippage_bps=10.0)
        buy = broker.market_order("AAA", Side.LONG, 1.0, 100.0, 0)
        self.assertGreater(buy.price, 100.0)          # opening a long pays up
        sell = broker.market_order("AAA", Side.LONG, 1.0, 100.0, 0, reduce_only=True)
        self.assertLess(sell.price, 100.0)            # closing it sells down
        short = broker.market_order("AAA", Side.SHORT, 1.0, 100.0, 0)
        self.assertLess(short.price, 100.0)           # opening a short sells down
        cover = broker.market_order("AAA", Side.SHORT, 1.0, 100.0, 0, reduce_only=True)
        self.assertGreater(cover.price, 100.0)        # covering buys up

    def test_fee_is_proportional_to_notional(self):
        broker = PaperBroker(fee_bps=10.0, slippage_bps=0.0)
        fill = broker.market_order("AAA", Side.LONG, 2.0, 100.0, 0)
        self.assertAlmostEqual(fill.fee, 200.0 * 0.001)

    def test_round_trip_with_costs_loses_money_at_a_flat_price(self):
        """Sanity check: churning a flat market must not be free."""
        broker = PaperBroker(fee_bps=5.0, slippage_bps=5.0)
        pf = Portfolio(10_000.0)
        entry = broker.market_order("AAA", Side.LONG, 10.0, 100.0, 0)
        pf.open_position(entry, stop=95.0)
        exit_fill = broker.market_order("AAA", Side.LONG, 10.0, 100.0, 60, reduce_only=True)
        trade = pf.close_position(exit_fill, "flat")
        self.assertLess(trade.pnl, 0.0)


if __name__ == "__main__":
    unittest.main()
