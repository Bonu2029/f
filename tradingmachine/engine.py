"""The live trading loop: paper by default, real orders only when told twice.

The loop is bar-driven, not tick-driven. It wakes shortly after each bar closes,
acts on the completed bar, and sleeps again. Acting on a forming bar is the
single most common reason a strategy behaves differently live than in backtest.

State is checkpointed to JSON after every change, so a restart resumes with the
positions and stops it had rather than silently abandoning open risk.
"""

from __future__ import annotations

import json
import logging
import os
import signal as signal_module
import time
from dataclasses import asdict
from typing import Any

from .backtest import interval_seconds
from .broker.base import Broker, BrokerError
from .broker.live import CcxtBroker
from .broker.paper import PaperBroker
from .config import AppConfig
from .data import DataError, get_candles
from .indicators import atr as atr_series
from .indicators import last_defined
from .journal import Journal
from .models import Candle, Position, Side
from .notify import Notifier, build_notifier
from .portfolio import Portfolio
from .risk import RiskManager
from .strategies import build_strategy

log = logging.getLogger(__name__)


class TradingEngine:
    def __init__(
        self,
        config: AppConfig,
        broker: Broker | None = None,
        notifier: Notifier | None = None,
        journal: Journal | None = None,
        state_path: str = "state.json",
    ) -> None:
        self.config = config
        self.strategy = build_strategy(config.strategy)
        self.risk = RiskManager(config.risk)
        self.portfolio = Portfolio(starting_cash=config.account.starting_cash)
        self.notifier = notifier or build_notifier(config.notify)
        self.journal = journal or Journal(config.journal_path, mode=config.account.mode)
        self.broker = broker or self._make_broker()
        self.state_path = state_path

        self.last_bar_ts: dict[str, int] = {}
        self._stop = False
        self.cycles = 0

        self._load_state()

    # ------------------------------------------------------------------ #
    # setup
    # ------------------------------------------------------------------ #

    def _make_broker(self) -> Broker:
        ex = self.config.execution
        if self.config.is_live_mode:
            if ex.broker == "alpaca":
                from .broker.alpaca import AlpacaBroker

                return AlpacaBroker(
                    paper=False, confirm_live=ex.confirm_live, dry_run=ex.dry_run
                )
            return CcxtBroker(
                ex.exchange,
                confirm_live=ex.confirm_live,
                dry_run=ex.dry_run,
                testnet=ex.testnet,
            )
        return PaperBroker(
            fee_bps=self.config.costs.fee_bps,
            slippage_bps=self.config.costs.slippage_bps,
        )

    def install_signal_handlers(self) -> None:
        """Ctrl-C finishes the current cycle instead of tearing out mid-order."""

        def handler(signum: int, _frame: Any) -> None:
            log.warning("signal %s received — finishing this cycle then stopping", signum)
            self._stop = True

        for sig in (signal_module.SIGINT, signal_module.SIGTERM):
            signal_module.signal(sig, handler)

    # ------------------------------------------------------------------ #
    # state persistence
    # ------------------------------------------------------------------ #

    def _save_state(self) -> None:
        payload = {
            "cash": self.portfolio.cash,
            "fees_paid": self.portfolio.fees_paid,
            "starting_cash": self.portfolio.starting_cash,
            "last_bar_ts": self.last_bar_ts,
            "positions": {
                sym: {**asdict(pos), "side": pos.side.value}
                for sym, pos in self.portfolio.positions.items()
            },
            "risk": {
                "peak_equity": self.risk.state.peak_equity,
                "day_start_equity": self.risk.state.day_start_equity,
                "day_key": self.risk.state.day_key,
                "halted": self.risk.state.halted,
                "halt_reason": self.risk.state.halt_reason,
            },
            "saved_at": int(time.time()),
        }
        tmp = f"{self.state_path}.tmp"
        try:
            with open(tmp, "w", encoding="utf-8") as fh:
                json.dump(payload, fh, indent=2)
            os.replace(tmp, self.state_path)  # atomic: never a truncated state file
        except OSError as exc:
            log.error("could not save state: %s", exc)

    def _load_state(self) -> None:
        if not os.path.exists(self.state_path):
            return
        try:
            with open(self.state_path, encoding="utf-8") as fh:
                payload = json.load(fh)
        except (OSError, json.JSONDecodeError) as exc:
            log.error("could not read %s (%s) — starting flat", self.state_path, exc)
            return

        self.portfolio.cash = payload.get("cash", self.portfolio.cash)
        self.portfolio.fees_paid = payload.get("fees_paid", 0.0)
        self.last_bar_ts = {k: int(v) for k, v in (payload.get("last_bar_ts") or {}).items()}

        for sym, raw in (payload.get("positions") or {}).items():
            raw = dict(raw)
            raw["side"] = Side(raw["side"])
            self.portfolio.positions[sym] = Position(**raw)

        rs = payload.get("risk") or {}
        self.risk.state.peak_equity = rs.get("peak_equity", 0.0)
        self.risk.state.day_start_equity = rs.get("day_start_equity", 0.0)
        self.risk.state.day_key = rs.get("day_key", "")
        self.risk.state.halted = rs.get("halted", False)
        self.risk.state.halt_reason = rs.get("halt_reason", "")

        if self.portfolio.positions:
            log.info("resumed with %d open position(s)", len(self.portfolio.positions))

    # ------------------------------------------------------------------ #
    # the loop
    # ------------------------------------------------------------------ #

    def run(self, max_cycles: int | None = None, once: bool = False) -> None:
        cfg = self.config
        mode = "LIVE" if getattr(self.broker, "is_live", False) else "PAPER"
        self.notifier.send(
            f"tradingmachine starting [{mode}]\n"
            f"strategy: {self.strategy.describe()}\n"
            f"symbols:  {', '.join(cfg.market.symbols)} @ {cfg.market.interval}\n"
            f"risk:     {cfg.risk.risk_per_trade:.2%}/trade, "
            f"halt at -{cfg.risk.max_drawdown_pct:.0%}"
        )

        while not self._stop:
            started = time.time()
            try:
                self.run_cycle()
            except Exception as exc:  # noqa: BLE001 - the loop must outlive any bug
                log.exception("cycle failed")
                self.notifier.error(f"cycle error: {type(exc).__name__}: {exc}")

            self.cycles += 1
            if once or (max_cycles is not None and self.cycles >= max_cycles):
                break
            self._sleep_until_next_bar(started)

        self._save_state()
        self.notifier.send(f"tradingmachine stopped after {self.cycles} cycle(s)")

    def _sleep_until_next_bar(self, cycle_started: float) -> None:
        step = interval_seconds(self.config.market.interval)
        poll = self.config.execution.poll_seconds
        if poll > 0:
            delay = poll
        else:
            # Wake ~5s after the next bar close so the feed has published it.
            now = time.time()
            delay = step - (now % step) + 5
        delay = max(5.0, delay - (time.time() - cycle_started))
        # Sleep in slices so Ctrl-C is responsive.
        deadline = time.time() + delay
        while time.time() < deadline and not self._stop:
            time.sleep(min(1.0, deadline - time.time()))

    def run_cycle(self) -> None:
        cfg = self.config
        prices: dict[str, float] = {}
        history: dict[str, list[Candle]] = {}

        for symbol in cfg.market.symbols:
            try:
                bars = get_candles(
                    symbol, cfg.market.interval, cfg.market.history, source=cfg.market.source
                )
            except DataError as exc:
                # One bad feed must not blind the whole book.
                log.error("data unavailable for %s: %s", symbol, exc)
                continue
            if not bars:
                continue
            history[symbol] = bars
            prices[symbol] = bars[-1].close

        if not history:
            self.notifier.error("no market data available this cycle")
            return

        equity = self.portfolio.equity(prices)
        self.risk.observe_equity(equity, int(time.time()))

        for symbol, bars in history.items():
            latest = bars[-1]
            is_new_bar = self.last_bar_ts.get(symbol) != latest.ts

            self._manage_position(symbol, bars, latest)

            if is_new_bar:
                self._consider_entry(symbol, bars, prices)
                self.last_bar_ts[symbol] = latest.ts

        if any(self.last_bar_ts.get(s) for s in history):
            self.risk.tick_cooldowns()

        equity = self.portfolio.equity(prices)
        ts = int(time.time())
        self.journal.record_equity(ts, equity, self.portfolio.cash, len(self.portfolio.positions))
        self._save_state()

        if self.risk.state.halted:
            self.notifier.error(f"TRADING HALTED — {self.risk.state.halt_reason}")

    # ------------------------------------------------------------------ #
    # per-symbol work
    # ------------------------------------------------------------------ #

    def _manage_position(self, symbol: str, bars: list[Candle], latest: Candle) -> None:
        pos = self.portfolio.positions.get(symbol)
        if pos is None:
            return

        hit, exit_price, why = self.risk.exit_price_hit(pos, latest.high, latest.low)
        if hit:
            self._close(symbol, exit_price, why)
            return

        self.portfolio.update_extreme(symbol, latest.close)
        atr_v = last_defined(atr_series(bars, 14))
        if atr_v and self.risk.update_trailing_stop(pos, atr_v):
            log.info("%s trailing stop -> %.6g", symbol, pos.stop)

        # A genuine change of conviction is an exit in its own right.
        if len(bars) >= self.strategy.warmup:
            sig = self.strategy.evaluate(bars)
            leave, why = self.risk.should_exit_on_signal(pos, sig)
            if leave:
                self._close(symbol, latest.close, why)

    def _consider_entry(self, symbol: str, bars: list[Candle], prices: dict[str, float]) -> None:
        if len(bars) < self.strategy.warmup:
            return
        sig = self.strategy.evaluate(bars)
        price = prices[symbol]
        ts = bars[-1].ts

        ok, why = self.risk.can_enter(symbol, sig, self.portfolio, prices)
        if not ok:
            if sig.side is not Side.FLAT:
                log.info("%s signal %s blocked: %s", symbol, sig.side.value, why)
                self.journal.record_signal(ts, symbol, sig, self.strategy.name, acted=False)
            return

        atr_v = sig.meta.get("atr")
        if not atr_v:
            return
        equity = self.portfolio.equity(prices)
        sized = self.risk.size(sig, price, atr_v, equity, self.portfolio.exposure(prices))
        if sized is None:
            self.journal.record_signal(ts, symbol, sig, self.strategy.name, acted=False)
            return

        try:
            fill = self.broker.market_order(
                symbol, sig.side, sized.qty, price, ts, tag=sig.reason
            )
        except BrokerError as exc:
            log.error("entry rejected for %s: %s", symbol, exc)
            self.notifier.error(f"{symbol} entry rejected: {exc}")
            return

        offset = fill.price - price
        self.portfolio.open_position(
            fill,
            stop=sized.stop + offset,
            target=sized.target + offset if sized.target else None,
            tag=sig.reason,
        )
        self.journal.record_fill(fill)
        self.journal.record_signal(ts, symbol, sig, self.strategy.name, acted=True)
        self.notifier.signal_alert(
            symbol,
            sig,
            fill.price,
            extra=(
                f"size {sized.qty:.6g} | stop {sized.stop + offset:,.6g}"
                + (f" | target {sized.target + offset:,.6g}" if sized.target else "")
                + f" | risking {sized.risk_amount:,.2f}"
            ),
        )
        self._save_state()

    def _close(self, symbol: str, price: float, reason: str) -> None:
        pos = self.portfolio.positions.get(symbol)
        if pos is None:
            return
        try:
            fill = self.broker.market_order(
                symbol, pos.side, pos.qty, price, int(time.time()),
                reduce_only=True, tag=reason,
            )
        except BrokerError as exc:
            # Leave the position on the books: pretending it closed would leave
            # real exposure untracked, which is worse than a failed exit.
            log.error("exit FAILED for %s: %s", symbol, exc)
            self.notifier.error(f"{symbol} exit failed ({reason}): {exc} — position still open")
            return

        trade = self.portfolio.close_position(fill, reason, self.strategy.name)
        self.risk.start_cooldown(symbol)
        self.journal.record_fill(fill)
        self.journal.record_trade(trade)
        self.notifier.trade_alert(trade)
        self._save_state()

    # ------------------------------------------------------------------ #

    def status(self) -> dict[str, Any]:
        prices = {}
        for sym in self.config.market.symbols:
            try:
                prices[sym] = get_candles(sym, self.config.market.interval, 2)[-1].close
            except DataError:
                continue
        summary = self.portfolio.summary(prices)
        summary["halted"] = self.risk.state.halted
        summary["halt_reason"] = self.risk.state.halt_reason
        summary["positions"] = [
            {
                "symbol": p.symbol,
                "side": p.side.value,
                "qty": p.qty,
                "entry": p.entry_price,
                "stop": p.stop,
                "target": p.target,
                "unrealized": p.unrealized(prices.get(p.symbol, p.entry_price)),
            }
            for p in self.portfolio.positions.values()
        ]
        return summary
