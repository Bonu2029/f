import logging
import os
import tempfile
import unittest

from tradingmachine import desk as desk_module
from tradingmachine.analysis import MIN_SAMPLE, EdgeReport, Leg, _judge
from tradingmachine.broker.alpaca import AlpacaBroker
from tradingmachine.broker.base import BrokerError
from tradingmachine.config import from_dict
from tradingmachine.desk import Desk, DeskError
from tradingmachine.journal import Journal
from tradingmachine.models import Candle, Side
from tradingmachine.screener import Candidate, rank, summarize
from tradingmachine.universe import UNIVERSES, describe, resolve


def bars(n=300, price=100.0, spread=1.0):
    return [
        Candle(ts=i * 3600, open=price, high=price + spread, low=price - spread,
               close=price, volume=1000.0)
        for i in range(n)
    ]


class TestUniverse(unittest.TestCase):
    def test_named_basket_resolves(self):
        self.assertIn("AAPL", resolve("megacap"))

    def test_bare_tickers_pass_through_uppercased(self):
        self.assertEqual(resolve("aapl,msft"), ["AAPL", "MSFT"])

    def test_baskets_and_tickers_mix(self):
        out = resolve("tech,TSLA")
        self.assertIn("NVDA", out)
        self.assertIn("TSLA", out)

    def test_duplicates_are_collapsed(self):
        out = resolve("megacap,tech")
        self.assertEqual(len(out), len(set(out)))

    def test_default_is_not_empty(self):
        self.assertTrue(resolve(None))

    def test_every_basket_has_symbols(self):
        for name, syms in UNIVERSES.items():
            self.assertTrue(syms, f"{name} is empty")

    def test_asset_classes(self):
        self.assertEqual(describe("BTC-USD"), "crypto")
        self.assertEqual(describe("EURUSD=X"), "forex")
        self.assertEqual(describe("ES=F"), "futures")
        self.assertEqual(describe("^GSPC"), "index")
        self.assertEqual(describe("SPY"), "etf")
        self.assertEqual(describe("NVDA"), "tech")
        self.assertEqual(describe("ZZZZ"), "stock")


class TestScreenerRanking(unittest.TestCase):
    def _c(self, sym, side=Side.FLAT, strength=0.0, err=""):
        return Candidate(symbol=sym, asset_class="stock", side=side,
                         strength=strength, error=err)

    def test_signals_outrank_flat_and_errors_sink(self):
        rows = rank([
            self._c("FLAT1"),
            self._c("BAD", err="feed down"),
            self._c("WEAK", Side.LONG, 0.3),
            self._c("STRONG", Side.SHORT, 0.9),
        ])
        self.assertEqual([c.symbol for c in rows], ["STRONG", "WEAK", "FLAT1", "BAD"])

    def test_summary_counts_sides(self):
        s = summarize([
            self._c("A", Side.LONG, 0.5), self._c("B", Side.SHORT, 0.5),
            self._c("C"), self._c("D", err="x"),
        ])
        self.assertEqual((s["long"], s["short"], s["flat"], s["errors"]), (1, 1, 1, 1))

    def test_errored_candidate_is_not_ok(self):
        self.assertFalse(self._c("X", err="boom").ok)


class TestEdgeGrading(unittest.TestCase):
    """The judgement layer must refuse to be confident on thin evidence."""

    def _rep(self, full: Leg, oos: Leg) -> EdgeReport:
        r = EdgeReport("X", "s", "1d", 500, full=full, out_sample=oos)
        _judge(r)
        return r

    def test_tiny_sample_is_always_unknown(self):
        r = self._rep(Leg("full", trades=9, win_rate=100.0, expectancy_r=3.0,
                          profit_factor=99.0), Leg("oos"))
        self.assertEqual(r.grade, "unknown")
        self.assertEqual(r.confidence, "none")
        self.assertIn("Insufficient evidence", r.verdict)

    def test_profitable_and_confirmed_is_strong(self):
        r = self._rep(
            Leg("full", trades=120, expectancy_r=0.25, profit_factor=1.5),
            Leg("oos", trades=30, expectancy_r=0.2, profit_factor=1.3),
        )
        self.assertEqual(r.grade, "strong")
        self.assertEqual(r.confidence, "high")

    def test_profitable_but_broken_recently_is_fragile(self):
        r = self._rep(
            Leg("full", trades=80, expectancy_r=0.3, profit_factor=1.6),
            Leg("oos", trades=25, expectancy_r=-0.2, profit_factor=0.7),
        )
        self.assertEqual(r.grade, "fragile")

    def test_too_few_oos_trades_cannot_confirm(self):
        r = self._rep(
            Leg("full", trades=60, expectancy_r=0.3, profit_factor=1.6),
            Leg("oos", trades=4, expectancy_r=0.9, profit_factor=9.0),
        )
        self.assertEqual(r.grade, "positive")

    def test_losing_strategy_is_negative(self):
        r = self._rep(
            Leg("full", trades=90, expectancy_r=-0.2, profit_factor=0.7),
            Leg("oos", trades=20, expectancy_r=-0.3, profit_factor=0.6),
        )
        self.assertEqual(r.grade, "negative")
        self.assertIn("No edge here", r.verdict)

    def test_caveat_is_always_present(self):
        for trades in (5, MIN_SAMPLE, 500):
            r = self._rep(Leg("full", trades=trades, expectancy_r=0.1,
                              profit_factor=1.2), Leg("oos", trades=20,
                              expectancy_r=0.1, profit_factor=1.2))
            self.assertTrue(r.caveat)


class DeskTestCase(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self._real = desk_module.get_candles
        self.bars = bars()
        desk_module.get_candles = lambda s, i, l, source=None: self.bars

    def tearDown(self):
        desk_module.get_candles = self._real
        self.tmp.cleanup()

    def make(self, **risk):
        cfg = from_dict({
            "account": {"starting_cash": 10_000.0},
            "market": {"symbols": ["AAPL"], "interval": "1h", "history": 300},
            "strategy": {"name": "trend"},
            "risk": {"risk_per_trade": 0.01, "stop_atr_mult": 2.0,
                     "target_atr_mult": 3.0, **risk},
        })
        d = Desk(cfg, journal=Journal(os.path.join(self.tmp.name, "j.db")))
        # No broker in tests: planning must work without one.
        d._broker = None
        return d


class TestPlanning(DeskTestCase):
    def test_plan_is_whole_shares_for_stocks(self):
        plan = self.make().plan("AAPL", "long")
        self.assertEqual(plan.qty, float(int(plan.qty)))

    def test_reported_risk_matches_the_rounded_quantity(self):
        """The ticket must not promise a risk the order won't take."""
        plan = self.make().plan("AAPL", "long")
        expected = abs(plan.price - plan.stop) * plan.qty
        self.assertAlmostEqual(plan.risk_amount, expected, places=6)

    def test_rounding_is_disclosed(self):
        plan = self.make().plan("AAPL", "long")
        self.assertTrue(
            any("whole shares" in w for w in plan.warnings)
            or plan.qty == plan.risk_amount / abs(plan.price - plan.stop)
        )

    def test_long_stop_sits_below_entry(self):
        plan = self.make().plan("AAPL", "long")
        self.assertLess(plan.stop, plan.price)
        self.assertGreater(plan.target, plan.price)

    def test_short_stop_sits_above_entry(self):
        plan = self.make().plan("AAPL", "short")
        self.assertGreater(plan.stop, plan.price)
        self.assertLess(plan.target, plan.price)

    def test_crypto_keeps_fractional_size(self):
        plan = self.make().plan("BTC-USD", "long")
        self.assertGreater(plan.qty, 0)
        self.assertFalse(any("whole shares" in w for w in plan.warnings))

    def test_manual_quantity_is_flagged(self):
        plan = self.make().plan("AAPL", "long", qty=999)
        self.assertEqual(plan.qty, 999)
        self.assertTrue(any("Manual quantity" in w for w in plan.warnings))

    def test_disconnected_broker_is_disclosed(self):
        plan = self.make().plan("AAPL", "long")
        self.assertTrue(any("not connected" in w.lower() for w in plan.warnings))

    def test_flat_side_is_rejected(self):
        with self.assertRaises(DeskError):
            self.make().plan("AAPL", Side.FLAT)

    def test_unaffordable_share_is_explained(self):
        desk = self.make(risk_per_trade=0.0001)
        plan = desk.plan("AAPL", "long")
        self.assertLess(plan.qty, 1)
        self.assertTrue(any("more risk than" in w or "costs" in w for w in plan.warnings))

    def test_execute_refuses_zero_quantity(self):
        desk = self.make(risk_per_trade=0.0001)
        plan = desk.plan("AAPL", "long")
        with self.assertRaises(DeskError):
            desk.execute(plan)

    def test_account_snapshot_never_raises_without_keys(self):
        snap = self.make().account_snapshot()
        self.assertFalse(snap["connected"])
        self.assertEqual(snap["positions"], [])
        self.assertIn("error", snap)


class TestAlpacaGuards(unittest.TestCase):
    """The broker must fail closed, before any network call."""

    def setUp(self):
        # One case below deliberately constructs a live broker, which logs a
        # loud warning by design. Expected output is not test output.
        logging.disable(logging.CRITICAL)
        self.addCleanup(logging.disable, logging.NOTSET)
        self._saved = {k: os.environ.pop(k, None) for k in
                       ("ALPACA_KEY_ID", "ALPACA_SECRET_KEY",
                        "TM_ALPACA_KEY_ID", "TM_ALPACA_SECRET_KEY")}

    def tearDown(self):
        for k, v in self._saved.items():
            if v is not None:
                os.environ[k] = v
            else:
                os.environ.pop(k, None)

    def test_live_endpoint_needs_confirm_live(self):
        with self.assertRaises(BrokerError) as ctx:
            AlpacaBroker(paper=False, confirm_live=False)
        self.assertIn("confirm_live", str(ctx.exception))

    def test_missing_keys_are_reported_clearly(self):
        with self.assertRaises(BrokerError) as ctx:
            AlpacaBroker(paper=True)
        self.assertIn("ALPACA_KEY_ID", str(ctx.exception))

    def test_paper_broker_is_never_live(self):
        os.environ["ALPACA_KEY_ID"] = "k"
        os.environ["ALPACA_SECRET_KEY"] = "s"
        b = AlpacaBroker(paper=True)
        self.assertFalse(b.is_live)
        self.assertIn("paper-api", b.base)

    def test_live_requires_dry_run_off(self):
        os.environ["ALPACA_KEY_ID"] = "k"
        os.environ["ALPACA_SECRET_KEY"] = "s"
        self.assertFalse(AlpacaBroker(paper=False, confirm_live=True, dry_run=True).is_live)
        self.assertTrue(AlpacaBroker(paper=False, confirm_live=True, dry_run=False).is_live)


class TestServerAuth(unittest.TestCase):
    """The desk can place orders, so unauthenticated POSTs must be impossible.

    Without a token, any page you have open in another tab could POST an order
    to localhost while you browse. This is the defence; it needs a test.
    """

    def setUp(self):
        import threading
        from http.server import ThreadingHTTPServer

        from tradingmachine import server as server_module

        logging.disable(logging.CRITICAL)
        self.addCleanup(logging.disable, logging.NOTSET)
        self.tmp = tempfile.TemporaryDirectory()
        self.mod = server_module

        cfg = from_dict({
            "market": {"symbols": ["AAPL"], "interval": "1d", "history": 300},
            "strategy": {"name": "trend"},
            "journal": {"path": os.path.join(self.tmp.name, "j.db")},
        })
        server_module.DeskHandler.desk = Desk(
            cfg, journal=Journal(os.path.join(self.tmp.name, "j.db"))
        )
        server_module.DeskHandler.config = cfg

        self.httpd = ThreadingHTTPServer(("127.0.0.1", 0), server_module.DeskHandler)
        self.port = self.httpd.server_address[1]
        threading.Thread(target=self.httpd.serve_forever, daemon=True).start()
        # Cleanups run last-registered-first, so server_close must be registered
        # before shutdown to end up running after it — otherwise the listening
        # socket leaks and every test run prints a ResourceWarning.
        self.addCleanup(self.httpd.server_close)
        self.addCleanup(self.httpd.shutdown)
        self.addCleanup(self.tmp.cleanup)

    def _post(self, path, body, token=None):
        import json
        import urllib.error
        import urllib.request

        headers = {"Content-Type": "application/json"}
        if token:
            headers["X-Desk-Token"] = token
        req = urllib.request.Request(
            f"http://127.0.0.1:{self.port}{path}",
            data=json.dumps(body).encode(), headers=headers,
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as r:
                return r.status, json.loads(r.read())
        except urllib.error.HTTPError as exc:
            return exc.code, json.loads(exc.read())

    def test_order_without_token_is_rejected(self):
        code, body = self._post("/api/order", {"symbol": "AAPL", "confirm": True})
        self.assertEqual(code, 403)
        self.assertFalse(body["ok"])

    def test_close_without_token_is_rejected(self):
        code, _ = self._post("/api/close", {"symbol": "AAPL", "confirm": True})
        self.assertEqual(code, 403)

    def test_wrong_token_is_rejected(self):
        code, _ = self._post("/api/order", {"symbol": "AAPL"}, token="not-the-token")
        self.assertEqual(code, 403)

    def test_order_with_token_but_no_confirm_is_rejected(self):
        code, body = self._post("/api/order", {"symbol": "AAPL", "side": "long"},
                                token=self.mod._TOKEN)
        self.assertEqual(code, 400)
        self.assertIn("confirm", body["error"])

    def test_page_serves_and_carries_a_token(self):
        import urllib.request

        with urllib.request.urlopen(f"http://127.0.0.1:{self.port}/", timeout=10) as r:
            html = r.read().decode()
        self.assertIn(self.mod._TOKEN, html)
        self.assertNotIn("__TOKEN__", html)


if __name__ == "__main__":
    unittest.main()
