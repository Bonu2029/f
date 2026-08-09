import os
import tempfile
import unittest

from tradingmachine.config import ConfigError, from_dict, load_config, write_default_config
from tradingmachine.journal import Journal
from tradingmachine.models import Side, Signal, Trade


class TestConfig(unittest.TestCase):
    def test_defaults_are_valid(self):
        cfg = from_dict({})
        self.assertEqual(cfg.account.mode, "paper")
        self.assertFalse(cfg.is_live_mode)

    def test_default_template_round_trips(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = write_default_config(os.path.join(tmp, "config.toml"))
            cfg = load_config(path)
            self.assertGreater(len(cfg.market.symbols), 0)
            self.assertEqual(cfg.strategy["name"], "ensemble")

    def test_will_not_overwrite_without_force(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = write_default_config(os.path.join(tmp, "config.toml"))
            with self.assertRaises(ConfigError):
                write_default_config(path)
            write_default_config(path, force=True)  # explicit override is fine

    def test_missing_file_is_reported(self):
        with self.assertRaises(ConfigError):
            load_config("/nonexistent/path/config.toml")

    def test_unknown_key_is_rejected(self):
        with self.assertRaises(ConfigError) as ctx:
            from_dict({"account": {"startingcash": 100}})
        self.assertIn("unknown key", str(ctx.exception))

    def test_absurd_risk_is_rejected(self):
        with self.assertRaises(ConfigError):
            from_dict({"risk": {"risk_per_trade": 0.9}})

    def test_zero_risk_is_rejected(self):
        with self.assertRaises(ConfigError):
            from_dict({"risk": {"risk_per_trade": 0.0}})

    def test_bad_interval_is_rejected(self):
        with self.assertRaises(ConfigError):
            from_dict({"market": {"interval": "3s"}})

    def test_no_symbols_is_rejected(self):
        with self.assertRaises(ConfigError):
            from_dict({"market": {"symbols": []}})

    def test_live_mode_needs_confirm_live(self):
        with self.assertRaises(ConfigError) as ctx:
            from_dict({"account": {"mode": "live"}, "execution": {"dry_run": False}})
        self.assertIn("confirm_live", str(ctx.exception))

    def test_live_mode_needs_dry_run_off(self):
        with self.assertRaises(ConfigError) as ctx:
            from_dict(
                {"account": {"mode": "live"}, "execution": {"confirm_live": True}}
            )
        self.assertIn("dry_run", str(ctx.exception))

    def test_live_mode_accepted_when_both_switches_set(self):
        cfg = from_dict(
            {
                "account": {"mode": "live"},
                "execution": {"confirm_live": True, "dry_run": False},
            }
        )
        self.assertTrue(cfg.is_live_mode)


class TestJournal(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.journal = Journal(os.path.join(self.tmp.name, "j.db"))

    def tearDown(self):
        self.journal.close()
        self.tmp.cleanup()

    def _trade(self, pnl, r=1.0, symbol="AAA"):
        return Trade(
            symbol=symbol, side=Side.LONG, qty=1.0, entry_price=100.0,
            exit_price=100.0 + pnl, entry_ts=0, exit_ts=3600, pnl=pnl,
            fees=0.5, r_multiple=r, reason="test", strategy="unit",
        )

    def test_starts_empty(self):
        self.assertEqual(self.journal.stats()["trades"], 0)
        self.assertEqual(self.journal.recent_trades(), [])

    def test_records_and_reads_back(self):
        self.journal.record_trade(self._trade(50.0))
        rows = self.journal.recent_trades()
        self.assertEqual(len(rows), 1)
        self.assertAlmostEqual(rows[0]["pnl"], 50.0)

    def test_stats_are_computed(self):
        self.journal.record_trade(self._trade(100.0, r=2.0))
        self.journal.record_trade(self._trade(-50.0, r=-1.0))
        stats = self.journal.stats()
        self.assertEqual(stats["trades"], 2)
        self.assertAlmostEqual(stats["net_pnl"], 50.0)
        self.assertAlmostEqual(stats["win_rate_pct"], 50.0)
        self.assertAlmostEqual(stats["profit_factor"], 2.0)
        self.assertAlmostEqual(stats["avg_r"], 0.5)

    def test_signals_are_recorded(self):
        self.journal.record_signal(1000, "AAA", Signal(Side.LONG, 0.7, "why"), "unit", True)
        rows = self.journal.recent_signals()
        self.assertEqual(rows[0]["symbol"], "AAA")
        self.assertEqual(rows[0]["acted"], 1)

    def test_equity_marks_are_deduplicated_by_timestamp(self):
        self.journal.record_equity(100, 10_000.0, 10_000.0)
        self.journal.record_equity(100, 10_500.0, 10_500.0)
        curve = self.journal.equity_curve()
        self.assertEqual(len(curve), 1)
        self.assertAlmostEqual(curve[0][1], 10_500.0)

    def test_export_csv(self):
        self.journal.record_trade(self._trade(10.0))
        out = os.path.join(self.tmp.name, "trades.csv")
        self.assertEqual(self.journal.export_csv(out), 1)
        with open(out, encoding="utf-8") as fh:
            self.assertIn("symbol", fh.readline())

    def test_survives_reopen(self):
        path = os.path.join(self.tmp.name, "persist.db")
        with Journal(path) as j:
            j.record_trade(self._trade(25.0))
        with Journal(path) as j:
            self.assertEqual(j.stats()["trades"], 1)


if __name__ == "__main__":
    unittest.main()
