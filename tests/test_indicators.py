import unittest

from tradingmachine.indicators import (
    adx,
    atr,
    bollinger,
    donchian,
    ema,
    macd,
    rsi,
    sma,
    stdev,
    true_range,
)
from tradingmachine.models import Candle


def bars(prices, spread=1.0):
    return [
        Candle(ts=i * 3600, open=p, high=p + spread, low=p - spread, close=p, volume=100.0)
        for i, p in enumerate(prices)
    ]


class TestAlignment(unittest.TestCase):
    """Every indicator must return exactly one value per input bar."""

    def setUp(self):
        self.prices = [float(i) for i in range(1, 121)]
        self.candles = bars(self.prices)

    def test_lengths_match_input(self):
        n = len(self.prices)
        self.assertEqual(len(sma(self.prices, 10)), n)
        self.assertEqual(len(ema(self.prices, 10)), n)
        self.assertEqual(len(rsi(self.prices, 14)), n)
        self.assertEqual(len(stdev(self.prices, 20)), n)
        self.assertEqual(len(true_range(self.candles)), n)
        self.assertEqual(len(adx(self.candles, 14)), n)
        for series in bollinger(self.prices, 20):
            self.assertEqual(len(series), n)
        for series in donchian(self.candles, 20):
            self.assertEqual(len(series), n)
        for series in macd(self.prices):
            self.assertEqual(len(series), n)

    def test_warmup_is_none_not_zero(self):
        # A zero during warm-up would be silently tradeable; None cannot be.
        s = sma(self.prices, 10)
        self.assertTrue(all(v is None for v in s[:9]))
        self.assertIsNotNone(s[9])


class TestValues(unittest.TestCase):
    def test_sma_known_value(self):
        self.assertAlmostEqual(sma([1, 2, 3, 4, 5], 5)[-1], 3.0)

    def test_sma_rolls_correctly(self):
        result = sma([2, 4, 6, 8, 10], 2)
        self.assertEqual(result, [None, 3.0, 5.0, 7.0, 9.0])

    def test_ema_seeded_with_sma(self):
        values = [1.0, 2.0, 3.0, 4.0, 5.0]
        result = ema(values, 3)
        self.assertAlmostEqual(result[2], 2.0)  # SMA of 1,2,3
        k = 2 / 4
        self.assertAlmostEqual(result[3], 4.0 * k + 2.0 * (1 - k))

    def test_rsi_all_gains_is_100(self):
        self.assertAlmostEqual(rsi([float(i) for i in range(1, 40)], 14)[-1], 100.0)

    def test_rsi_all_losses_is_zero(self):
        self.assertAlmostEqual(rsi([float(i) for i in range(40, 1, -1)], 14)[-1], 0.0)

    def test_rsi_stays_in_range(self):
        import random

        rng = random.Random(7)
        prices = [100.0]
        for _ in range(300):
            prices.append(max(1.0, prices[-1] * (1 + rng.gauss(0, 0.01))))
        for v in rsi(prices, 14):
            if v is not None:
                self.assertGreaterEqual(v, 0.0)
                self.assertLessEqual(v, 100.0)

    def test_stdev_of_constant_is_zero(self):
        self.assertAlmostEqual(stdev([5.0] * 30, 10)[-1], 0.0)

    def test_atr_of_constant_range(self):
        # Every bar has high-low = 2 and no gaps, so ATR converges to 2.
        candles = bars([100.0] * 60, spread=1.0)
        self.assertAlmostEqual(atr(candles, 14)[-1], 2.0, places=6)

    def test_bollinger_bands_bracket_the_mean(self):
        prices = [100.0 + (i % 7) for i in range(60)]
        upper, mid, lower = bollinger(prices, 20, 2.0)
        self.assertGreater(upper[-1], mid[-1])
        self.assertLess(lower[-1], mid[-1])

    def test_macd_histogram_is_line_minus_signal(self):
        prices = [100.0 + i * 0.5 for i in range(120)]
        line, sig, hist = macd(prices)
        for a, b, c in zip(line, sig, hist):
            if None not in (a, b, c):
                self.assertAlmostEqual(c, a - b)

    def test_adx_rises_in_a_trend(self):
        trending = adx(bars([100.0 + i for i in range(120)]), 14)[-1]
        flat = adx(bars([100.0 + (i % 2) * 0.1 for i in range(120)]), 14)[-1]
        self.assertIsNotNone(trending)
        self.assertIsNotNone(flat)
        self.assertGreater(trending, flat)


class TestDonchianLookahead(unittest.TestCase):
    def test_channel_excludes_the_current_bar(self):
        """If the channel included the current bar, nothing could ever break out."""
        prices = [100.0] * 30 + [200.0]
        candles = bars(prices)
        up, _dn = donchian(candles, 20)
        self.assertLess(up[-1], candles[-1].high)

    def test_channel_uses_prior_window_only(self):
        candles = bars([float(i) for i in range(1, 41)])
        up, dn = donchian(candles, 5)
        # At index 10, the prior 5 bars are indices 5..9 -> closes 6..10.
        self.assertAlmostEqual(up[10], candles[9].high)
        self.assertAlmostEqual(dn[10], candles[5].low)


if __name__ == "__main__":
    unittest.main()
