import random
import unittest

from tradingmachine.models import Candle, Side, Signal
from tradingmachine.strategies import Ensemble, StrategyError, build_strategy
from tradingmachine.strategies.base import Strategy
from tradingmachine.strategies.breakout import Breakout
from tradingmachine.strategies.meanrev import MeanReversion
from tradingmachine.strategies.trend import TrendFollow


def bars_from(prices, spread=0.5):
    out = []
    for i, p in enumerate(prices):
        prev = prices[i - 1] if i else p
        out.append(
            Candle(
                ts=i * 3600,
                open=prev,
                high=max(p, prev) + spread,
                low=min(p, prev) - spread,
                close=p,
                volume=100.0,
            )
        )
    return out


def uptrend(n=300, start=100.0, step=0.5):
    return [start + i * step for i in range(n)]


def downtrend(n=300, start=250.0, step=0.5):
    return [start - i * step for i in range(n)]


def choppy(n=300, base=100.0, amp=2.0, seed=42):
    """Noisy mean-reverting chop.

    Deliberately NOT a clean sine wave: a noiseless sinusoid is a sequence of
    smooth half-cycle trends, and ADX reads it as strongly trending — correctly.
    Directionless markets are noisy, so the fixture has to be noisy too.
    """
    rng = random.Random(seed)
    prices, level = [], base
    for _ in range(n):
        level += rng.gauss(0, amp * 0.4) + (base - level) * 0.25  # pull to the mean
        prices.append(level)
    return prices


class Fixed(Strategy):
    def __init__(self, side, strength=1.0, name="fixed"):
        super().__init__()
        self.name = name
        self.warmup = 1
        self._sig = Signal(side, strength, "fixed", {"atr": 1.0})

    def evaluate(self, candles):
        return self._sig


class TestTrendFollow(unittest.TestCase):
    def test_goes_long_in_an_uptrend(self):
        sig = TrendFollow().evaluate(bars_from(uptrend()))
        self.assertIs(sig.side, Side.LONG)
        self.assertGreater(sig.strength, 0.0)

    def test_goes_short_in_a_downtrend(self):
        sig = TrendFollow().evaluate(bars_from(downtrend()))
        self.assertIs(sig.side, Side.SHORT)

    def test_stays_flat_in_chop(self):
        self.assertIs(TrendFollow().evaluate(bars_from(choppy())).side, Side.FLAT)

    def test_shorts_can_be_disabled(self):
        sig = TrendFollow(allow_short=False).evaluate(bars_from(downtrend()))
        self.assertIsNot(sig.side, Side.SHORT)

    def test_flat_while_warming_up(self):
        sig = TrendFollow().evaluate(bars_from(uptrend(n=10)))
        self.assertIs(sig.side, Side.FLAT)
        self.assertIn("warming up", sig.reason)

    def test_rejects_inverted_periods(self):
        with self.assertRaises(ValueError):
            TrendFollow(fast=50, slow=20)

    def test_signal_carries_atr_for_sizing(self):
        sig = TrendFollow().evaluate(bars_from(uptrend()))
        self.assertIn("atr", sig.meta)
        self.assertGreater(sig.meta["atr"], 0.0)


class TestMeanReversion(unittest.TestCase):
    def test_stands_aside_in_a_strong_trend(self):
        sig = MeanReversion().evaluate(bars_from(downtrend()))
        self.assertIs(sig.side, Side.FLAT)
        self.assertIn("trending", sig.reason)

    def test_produces_a_signal_on_a_range_dip(self):
        prices = [100.0] * 250 + [100 - i * 0.9 for i in range(1, 12)]
        sig = MeanReversion().evaluate(bars_from(prices))
        self.assertIn(sig.side, (Side.LONG, Side.FLAT))

    def test_flat_while_warming_up(self):
        self.assertIs(MeanReversion().evaluate(bars_from(choppy(n=20))).side, Side.FLAT)


class TestBreakout(unittest.TestCase):
    def test_fires_long_on_a_range_break(self):
        prices = [100.0] * 200 + [101.0, 103.0, 108.0]
        sig = Breakout(channel=20).evaluate(bars_from(prices, spread=1.5))
        self.assertIs(sig.side, Side.LONG)

    def test_flat_inside_the_channel(self):
        sig = Breakout(channel=20).evaluate(bars_from(choppy(n=250, amp=1.0)))
        self.assertIs(sig.side, Side.FLAT)

    def test_quiet_bar_is_rejected(self):
        prices = [100.0] * 200 + [100.05]
        sig = Breakout(channel=20, min_range_mult=5.0).evaluate(bars_from(prices, spread=0.01))
        self.assertIs(sig.side, Side.FLAT)


class TestEnsemble(unittest.TestCase):
    def test_unanimous_members_produce_a_signal(self):
        e = Ensemble([Fixed(Side.LONG, 1.0, "a"), Fixed(Side.LONG, 1.0, "b")], threshold=0.5)
        sig = e.evaluate(bars_from(uptrend(n=50)))
        self.assertIs(sig.side, Side.LONG)

    def test_disagreement_cancels_to_flat(self):
        e = Ensemble([Fixed(Side.LONG, 1.0, "a"), Fixed(Side.SHORT, 1.0, "b")], threshold=0.3)
        self.assertIs(e.evaluate(bars_from(uptrend(n=50))).side, Side.FLAT)

    def test_weights_break_a_tie(self):
        e = Ensemble(
            [Fixed(Side.LONG, 1.0, "a"), Fixed(Side.SHORT, 1.0, "b")],
            weights=[3.0, 1.0],
            threshold=0.3,
        )
        self.assertIs(e.evaluate(bars_from(uptrend(n=50))).side, Side.LONG)

    def test_threshold_suppresses_weak_consensus(self):
        e = Ensemble([Fixed(Side.LONG, 0.2, "a")], threshold=0.9)
        self.assertIs(e.evaluate(bars_from(uptrend(n=50))).side, Side.FLAT)

    def test_warmup_is_the_slowest_member(self):
        e = Ensemble([TrendFollow(), Breakout()])
        self.assertEqual(e.warmup, max(TrendFollow().warmup, Breakout().warmup))

    def test_atr_is_propagated_for_sizing(self):
        e = Ensemble([Fixed(Side.LONG, 1.0, "a")], threshold=0.1)
        self.assertIn("atr", e.evaluate(bars_from(uptrend(n=50))).meta)

    def test_empty_membership_is_rejected(self):
        with self.assertRaises(ValueError):
            Ensemble([])

    def test_mismatched_weights_are_rejected(self):
        with self.assertRaises(ValueError):
            Ensemble([Fixed(Side.LONG)], weights=[1.0, 2.0])


class TestBuilder(unittest.TestCase):
    def test_builds_from_a_bare_name(self):
        self.assertIsInstance(build_strategy("trend"), TrendFollow)

    def test_builds_with_params(self):
        s = build_strategy({"name": "trend", "fast": 5, "slow": 30})
        self.assertEqual((s.fast, s.slow), (5, 30))

    def test_builds_a_nested_ensemble(self):
        s = build_strategy(
            {
                "name": "ensemble",
                "threshold": 0.4,
                "members": [{"name": "trend", "weight": 2.0}, "breakout"],
            }
        )
        self.assertIsInstance(s, Ensemble)
        self.assertEqual(len(s.members), 2)
        self.assertAlmostEqual(s.weights[0], 2 / 3)

    def test_unknown_strategy_is_rejected(self):
        with self.assertRaises(StrategyError):
            build_strategy("does_not_exist")

    def test_bad_params_are_rejected(self):
        with self.assertRaises(StrategyError):
            build_strategy({"name": "trend", "nonsense": 1})

    def test_missing_name_is_rejected(self):
        with self.assertRaises(StrategyError):
            build_strategy({"fast": 10})

    def test_empty_ensemble_is_rejected(self):
        with self.assertRaises(StrategyError):
            build_strategy({"name": "ensemble", "members": []})


class TestSignalInvariants(unittest.TestCase):
    def test_strength_is_clamped(self):
        self.assertEqual(Signal(Side.LONG, 5.0).strength, 1.0)
        self.assertEqual(Signal(Side.LONG, -2.0).strength, 0.0)

    def test_flat_always_has_zero_strength(self):
        self.assertEqual(Signal(Side.FLAT, 0.9).strength, 0.0)

    def test_no_strategy_ever_returns_none(self):
        data = bars_from(uptrend())
        for strat in (TrendFollow(), MeanReversion(), Breakout()):
            sig = strat.evaluate(data)
            self.assertIsInstance(sig, Signal)
            self.assertIn(sig.side, (Side.LONG, Side.SHORT, Side.FLAT))


if __name__ == "__main__":
    unittest.main()
