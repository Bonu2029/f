import logging
import os
import tempfile
import unittest

from tradingmachine import engine as engine_module
from tradingmachine.config import from_dict
from tradingmachine.engine import TradingEngine
from tradingmachine.journal import Journal
from tradingmachine.models import Candle, Side, Signal
from tradingmachine.notify import Notifier
from tradingmachine.strategies import REGISTRY
from tradingmachine.strategies.base import Strategy


class Silent(Notifier):
    def __init__(self):
        self.messages = []

    def send(self, text, *, level="info"):
        self.messages.append((level, text))


class Scripted(Strategy):
    """Emits a scripted sequence of signals, repeating the last one forever."""

    name = "scripted"
    script: list[Signal] = []

    def __init__(self, **params):
        super().__init__(**params)
        self.warmup = 2
        self.calls = 0

    def evaluate(self, candles):
        script = type(self).script
        sig = script[min(self.calls, len(script) - 1)]
        self.calls += 1
        return sig


def flat_bars(n, price=100.0, ts0=0, step=3600):
    return [
        Candle(ts=ts0 + i * step, open=price, high=price + 1, low=price - 1,
               close=price, volume=1.0)
        for i in range(n)
    ]


class EngineTestCase(unittest.TestCase):
    def setUp(self):
        # Several tests exercise failure paths on purpose; their log output is
        # expected, not a signal, so keep it out of the test report.
        logging.disable(logging.CRITICAL)
        self.addCleanup(logging.disable, logging.NOTSET)
        self.tmp = tempfile.TemporaryDirectory()
        REGISTRY["scripted"] = Scripted
        Scripted.script = [Signal(Side.FLAT, 0.0, "idle")]
        self._real_get_candles = engine_module.get_candles
        self.bars = flat_bars(60)
        engine_module.get_candles = lambda sym, iv, limit, source=None: self.bars

    def tearDown(self):
        engine_module.get_candles = self._real_get_candles
        REGISTRY.pop("scripted", None)
        self.tmp.cleanup()

    def make_engine(self, **overrides):
        cfg = from_dict(
            {
                "account": {"starting_cash": 10_000.0},
                "market": {"symbols": ["TEST"], "interval": "1h", "history": 100},
                "strategy": {"name": "scripted"},
                "risk": {
                    "risk_per_trade": 0.01,
                    "stop_atr_mult": 2.0,
                    "target_atr_mult": None,
                    "trail_atr_mult": None,
                    "cooldown_bars": 0,
                    **overrides,
                },
                "costs": {"fee_bps": 0.0, "slippage_bps": 0.0},
            }
        )
        return TradingEngine(
            cfg,
            notifier=Silent(),
            journal=Journal(os.path.join(self.tmp.name, "j.db")),
            state_path=os.path.join(self.tmp.name, "state.json"),
        )


class TestCycle(EngineTestCase):
    def test_flat_signal_opens_nothing(self):
        eng = self.make_engine()
        eng.run_cycle()
        self.assertEqual(len(eng.portfolio.positions), 0)

    def test_long_signal_opens_a_sized_position(self):
        Scripted.script = [Signal(Side.LONG, 1.0, "go", {"atr": 2.0})]
        eng = self.make_engine()
        eng.run_cycle()
        self.assertIn("TEST", eng.portfolio.positions)
        pos = eng.portfolio.positions["TEST"]
        # 1% of 10k risked over a 4.0 stop distance -> 25 units.
        self.assertAlmostEqual(pos.qty, 25.0)
        self.assertAlmostEqual(pos.stop, 96.0)
        self.assertAlmostEqual(pos.initial_stop, 96.0)

    def test_same_bar_is_not_traded_twice(self):
        Scripted.script = [Signal(Side.LONG, 1.0, "go", {"atr": 2.0})]
        eng = self.make_engine()
        eng.run_cycle()
        eng.run_cycle()  # no new bar has printed
        self.assertEqual(len(eng.portfolio.positions), 1)
        self.assertEqual(len(eng.portfolio.trades), 0)

    def test_stop_hit_closes_and_journals_the_trade(self):
        Scripted.script = [Signal(Side.LONG, 1.0, "go", {"atr": 2.0})]
        # cooldown_bars=1 so the strategy's still-LONG signal cannot re-enter on
        # the very bar that stopped it out — which is what the cooldown is for.
        eng = self.make_engine(cooldown_bars=1)
        eng.run_cycle()
        self.assertIn("TEST", eng.portfolio.positions)

        # Next bar craters through the stop at 96.
        self.bars = self.bars + [Candle(ts=60 * 3600, open=100, high=100, low=90, close=91, volume=1)]
        eng.run_cycle()

        self.assertEqual(len(eng.portfolio.positions), 0)
        self.assertEqual(len(eng.portfolio.trades), 1)
        trade = eng.portfolio.trades[0]
        self.assertEqual(trade.reason, "stop")
        self.assertAlmostEqual(trade.exit_price, 96.0)
        self.assertAlmostEqual(trade.r_multiple, -1.0)
        self.assertEqual(eng.journal.stats()["trades"], 1)

    def test_opposite_signal_closes_the_position(self):
        Scripted.script = [
            Signal(Side.LONG, 1.0, "go", {"atr": 2.0}),
            Signal(Side.SHORT, 1.0, "flip", {"atr": 2.0}),
        ]
        eng = self.make_engine()
        eng.run_cycle()
        self.assertIn("TEST", eng.portfolio.positions)
        self.bars = self.bars + flat_bars(1, ts0=60 * 3600)
        eng.run_cycle()
        self.assertEqual(len(eng.portfolio.trades), 1)
        self.assertIn("signal->short", eng.portfolio.trades[0].reason)

    def test_data_failure_does_not_crash_the_cycle(self):
        from tradingmachine.data import DataError

        def boom(*_a, **_kw):
            raise DataError("feed down")

        engine_module.get_candles = boom
        eng = self.make_engine()
        eng.run_cycle()  # must not raise
        self.assertTrue(any(lvl == "error" for lvl, _ in eng.notifier.messages))

    def test_cooldown_zero_allows_same_bar_reentry(self):
        """The mirror of the test above: without a cooldown, it re-enters."""
        Scripted.script = [Signal(Side.LONG, 1.0, "go", {"atr": 2.0})]
        eng = self.make_engine(cooldown_bars=0)
        eng.run_cycle()
        self.bars = self.bars + [
            Candle(ts=60 * 3600, open=100, high=100, low=90, close=91, volume=1)
        ]
        eng.run_cycle()
        self.assertEqual(len(eng.portfolio.trades), 1)
        self.assertEqual(len(eng.portfolio.positions), 1)
        self.assertAlmostEqual(eng.portfolio.positions["TEST"].entry_price, 91.0)

    def test_halt_blocks_new_entries(self):
        Scripted.script = [Signal(Side.LONG, 1.0, "go", {"atr": 2.0})]
        eng = self.make_engine()
        eng.risk.state.halted = True
        eng.risk.state.halt_reason = "test halt"
        eng.run_cycle()
        self.assertEqual(len(eng.portfolio.positions), 0)


class TestPersistence(EngineTestCase):
    def test_positions_survive_a_restart(self):
        Scripted.script = [Signal(Side.LONG, 1.0, "go", {"atr": 2.0})]
        eng = self.make_engine()
        eng.run_cycle()
        original = eng.portfolio.positions["TEST"]

        revived = self.make_engine()
        self.assertIn("TEST", revived.portfolio.positions)
        restored = revived.portfolio.positions["TEST"]
        self.assertAlmostEqual(restored.qty, original.qty)
        self.assertAlmostEqual(restored.stop, original.stop)
        self.assertAlmostEqual(restored.initial_stop, original.initial_stop)
        self.assertIs(restored.side, Side.LONG)

    def test_halt_state_survives_a_restart(self):
        eng = self.make_engine()
        eng.risk.state.halted = True
        eng.risk.state.halt_reason = "drawdown"
        eng._save_state()
        self.assertTrue(self.make_engine().risk.state.halted)

    def test_corrupt_state_file_does_not_prevent_startup(self):
        path = os.path.join(self.tmp.name, "state.json")
        with open(path, "w", encoding="utf-8") as fh:
            fh.write("{not json")
        eng = self.make_engine()
        self.assertEqual(len(eng.portfolio.positions), 0)


class TestPaperIsDefault(EngineTestCase):
    def test_broker_is_paper_and_not_live(self):
        eng = self.make_engine()
        self.assertFalse(getattr(eng.broker, "is_live", False))
        self.assertEqual(eng.broker.name, "paper")


if __name__ == "__main__":
    unittest.main()
