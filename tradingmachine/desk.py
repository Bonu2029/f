"""The trading desk: one object the CLI and the web UI both drive.

Every order — whether you clicked a button, typed a command, or the bot decided
on its own — goes through :meth:`Desk.plan` and then :meth:`Desk.execute`.
Planning is always separate from executing, so there is a reviewable object with
a size, a stop, and a risk figure *before* anything is sent. That separation is
what makes a one-click buy button safe to build.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Any

from .analysis import EdgeReport, edge_report
from .broker.alpaca import AlpacaBroker
from .broker.base import BrokerError
from .config import AppConfig
from .data import DataError, get_candles
from .indicators import atr as atr_series
from .indicators import last_defined
from .journal import Journal
from .models import Side, Signal
from .risk import RiskManager
from .strategies import build_strategy
from .universe import describe

log = logging.getLogger(__name__)


class DeskError(RuntimeError):
    pass


@dataclass
class OrderPlan:
    """A fully-costed intention to trade. Nothing has been sent yet."""

    symbol: str
    side: Side
    qty: float
    price: float
    stop: float
    target: float | None
    risk_amount: float
    notional: float
    atr: float
    equity: float
    reason: str = ""
    warnings: list[str] = field(default_factory=list)
    tradable: bool = True

    @property
    def risk_pct(self) -> float:
        return (self.risk_amount / self.equity * 100.0) if self.equity else 0.0

    @property
    def stop_distance_pct(self) -> float:
        return abs(self.price - self.stop) / self.price * 100.0 if self.price else 0.0

    def as_dict(self) -> dict:
        d = self.__dict__.copy()
        d["side"] = self.side.value
        d["risk_pct"] = self.risk_pct
        d["stop_distance_pct"] = self.stop_distance_pct
        return d

    def describe(self) -> str:
        lines = [
            f"  {self.side.value.upper()} {self.qty:g} {self.symbol} @ ~{self.price:,.2f}",
            f"  notional      {self.notional:,.2f}",
            f"  stop          {self.stop:,.2f}  ({self.stop_distance_pct:.2f}% away)",
        ]
        if self.target:
            lines.append(f"  target        {self.target:,.2f}")
        lines += [
            f"  risking       {self.risk_amount:,.2f}  ({self.risk_pct:.2f}% of equity)",
            f"  account       {self.equity:,.2f}",
        ]
        for w in self.warnings:
            lines.append(f"  ! {w}")
        return "\n".join(lines)


class Desk:
    def __init__(
        self,
        config: AppConfig,
        broker: AlpacaBroker | None = None,
        journal: Journal | None = None,
    ) -> None:
        self.config = config
        self.strategy = build_strategy(config.strategy)
        self.risk = RiskManager(config.risk)
        self.journal = journal or Journal(config.journal_path, mode=config.account.mode)
        self._broker = broker
        self._cache: dict[str, tuple[float, Any]] = {}

    # ------------------------------------------------------------------ #

    @property
    def broker(self) -> AlpacaBroker:
        """Connect lazily so screening and analysis work with no keys at all."""
        if self._broker is None:
            ex = self.config.execution
            self._broker = AlpacaBroker(
                paper=not self.config.is_live_mode,
                confirm_live=ex.confirm_live,
                dry_run=ex.dry_run,
            )
        return self._broker

    @property
    def is_live(self) -> bool:
        try:
            return bool(self.broker.is_live)
        except BrokerError:
            return False

    def _cached(self, key: str, ttl: float, produce) -> Any:
        hit = self._cache.get(key)
        if hit and time.time() - hit[0] < ttl:
            return hit[1]
        value = produce()
        self._cache[key] = (time.time(), value)
        return value

    # ------------------------------------------------------------------ #
    # account state
    # ------------------------------------------------------------------ #

    def account_snapshot(self) -> dict:
        """Account plus positions, or a structured explanation of why not.

        Never raises: the dashboard has to render something useful even when
        the brokerage is unreachable or the keys are missing.
        """
        try:
            acct = self.broker.account()
            positions = self.broker.positions()
            try:
                is_open, when = self.broker.market_is_open()
            except BrokerError:
                is_open, when = False, "unknown"

            return {
                "connected": True,
                "live": self.broker.is_live,
                "venue": "alpaca-live" if self.broker.is_live else "alpaca-paper",
                "equity": acct.equity,
                "cash": acct.cash,
                "buying_power": acct.buying_power,
                "status": acct.status,
                "tradable": acct.is_tradable,
                "daytrade_count": acct.daytrade_count,
                "pattern_day_trader": acct.pattern_day_trader,
                "market_open": is_open,
                "market_note": when,
                "unrealized": sum(p.unrealized_pl for p in positions),
                "exposure": sum(abs(p.market_value) for p in positions),
                "positions": [
                    {
                        "symbol": p.symbol,
                        "asset_class": describe(p.symbol),
                        "side": p.side.value,
                        "qty": p.qty,
                        "avg_entry": p.avg_entry,
                        "price": p.current_price,
                        "market_value": p.market_value,
                        "unrealized_pl": p.unrealized_pl,
                        "unrealized_plpc": p.unrealized_plpc,
                    }
                    for p in positions
                ],
            }
        except BrokerError as exc:
            return {
                "connected": False,
                "live": False,
                "venue": "not connected",
                "error": str(exc),
                "equity": 0.0, "cash": 0.0, "buying_power": 0.0,
                "unrealized": 0.0, "exposure": 0.0,
                "market_open": False, "market_note": "",
                "positions": [],
            }

    # ------------------------------------------------------------------ #
    # planning
    # ------------------------------------------------------------------ #

    def plan(
        self,
        symbol: str,
        side: Side | str,
        *,
        interval: str | None = None,
        strength: float = 1.0,
        qty: float | None = None,
        equity: float | None = None,
    ) -> OrderPlan:
        """Size a trade from ATR and the risk config. Sends nothing."""
        symbol = symbol.upper()
        side = Side(side) if isinstance(side, str) else side
        if side is Side.FLAT:
            raise DeskError("cannot plan a FLAT order — pass long or short")
        interval = interval or self.config.market.interval

        try:
            bars = get_candles(symbol, interval, self.config.market.history)
        except DataError as exc:
            raise DeskError(f"no market data for {symbol}: {exc}") from exc
        if not bars:
            raise DeskError(f"no market data for {symbol}")

        price = bars[-1].close
        atr_v = last_defined(atr_series(bars, 14))
        if not atr_v:
            raise DeskError(f"cannot measure volatility for {symbol} — too few bars")

        warnings: list[str] = []
        if equity is None:
            snap = self.account_snapshot()
            equity = snap["equity"] if snap["connected"] else self.config.account.starting_cash
            if not snap["connected"]:
                warnings.append(
                    f"Broker not connected ({snap.get('error', 'unknown')}); sized "
                    f"against the configured {equity:,.0f} instead of your real balance."
                )
            elif not snap.get("market_open"):
                warnings.append(f"Market is {snap.get('market_note', 'closed')} — orders queue to the open.")

        sized = self.risk.size(Signal(side, strength), price, atr_v, equity)
        if sized is None:
            raise DeskError(
                f"risk manager refused to size {symbol}: stop would be "
                f"{self.config.risk.stop_atr_mult}x ATR ({atr_v:.4f}) on a "
                f"{price:,.2f} price, against {equity:,.2f} equity"
            )

        final_qty = float(qty) if qty is not None else sized.qty
        if qty is not None:
            warnings.append(
                f"Manual quantity {qty:g} overrides the risk-sized {sized.qty:.4f} — "
                f"you are risking {abs(price - sized.stop) * float(qty):,.2f}, not "
                f"{sized.risk_amount:,.2f}."
            )

        # Brackets require whole shares, so round HERE rather than letting the
        # broker floor it silently. Otherwise the ticket promises one risk figure
        # and the order takes a different one — the plan must be what is sent.
        klass = describe(symbol)
        if klass != "crypto":
            whole = float(int(final_qty))
            if whole != final_qty:
                shortfall = abs(price - sized.stop) * (final_qty - whole)
                warnings.append(
                    f"Rounded {final_qty:.4f} down to {whole:g} whole shares "
                    f"(brackets can't hold fractions), so you are risking "
                    f"{shortfall:,.2f} less than the configured amount."
                )
            final_qty = whole
            if final_qty < 1:
                warnings.append(
                    f"One share of {symbol} costs {price:,.2f}, which is more risk "
                    f"than {self.config.risk.risk_per_trade:.2%} of a "
                    f"{equity:,.0f} account allows. Raise risk_per_trade, add funds, "
                    "or trade a lower-priced symbol."
                )

        plan = OrderPlan(
            symbol=symbol,
            side=side,
            qty=final_qty,
            price=price,
            stop=sized.stop,
            target=sized.target,
            risk_amount=abs(price - sized.stop) * final_qty,
            notional=final_qty * price,
            atr=atr_v,
            equity=equity,
            reason=f"manual {side.value}",
            warnings=warnings,
        )

        try:
            ok, note = self.broker.is_tradable(symbol)
            plan.tradable = ok
            if not ok:
                plan.warnings.append(note)
        except BrokerError:
            pass  # planning must work with no broker at all

        return plan

    def plan_from_signal(self, symbol: str, interval: str | None = None) -> OrderPlan:
        """Let the configured strategy pick the side, then size it."""
        interval = interval or self.config.market.interval
        bars = get_candles(symbol, interval, self.config.market.history)
        sig = self.strategy.evaluate(bars)
        if sig.side is Side.FLAT:
            raise DeskError(f"{symbol}: strategy is flat — {sig.reason}")
        plan = self.plan(symbol, sig.side, interval=interval, strength=sig.strength)
        plan.reason = sig.reason
        return plan

    # ------------------------------------------------------------------ #
    # execution
    # ------------------------------------------------------------------ #

    def execute(self, plan: OrderPlan, *, bracket: bool = True) -> dict:
        """Send the planned order. Stop and target ride along at the broker."""
        if not plan.tradable:
            raise DeskError(f"{plan.symbol} is not tradable at this broker")
        if plan.qty <= 0:
            raise DeskError("quantity is zero — nothing to send")

        ts = int(time.time())
        try:
            if bracket and plan.qty >= 1:
                fill = self.broker.bracket_order(
                    plan.symbol, plan.side, plan.qty, plan.price, ts,
                    stop=plan.stop, target=plan.target, tag=plan.reason,
                )
                attached = True
            else:
                fill = self.broker.market_order(
                    plan.symbol, plan.side, plan.qty, plan.price, ts, tag=plan.reason
                )
                attached = False
        except BrokerError as exc:
            raise DeskError(str(exc)) from exc

        self.journal.record_fill(fill)
        self.journal.record_signal(
            ts, plan.symbol, Signal(plan.side, 1.0, plan.reason), self.strategy.name, acted=True
        )
        return {
            "ok": True,
            "symbol": plan.symbol,
            "side": plan.side.value,
            "qty": fill.qty,
            "price": fill.price,
            "stop": plan.stop,
            "target": plan.target,
            "stop_attached": attached,
            "note": (
                "Stop and target are resting at the broker — they survive this "
                "program exiting."
                if attached
                else "No bracket attached (fractional quantity). This position has "
                     "NO stop at the broker; you must manage it yourself."
            ),
        }

    def close(self, symbol: str) -> dict:
        try:
            result = self.broker.close_position(symbol.upper())
        except BrokerError as exc:
            raise DeskError(str(exc)) from exc
        return {"ok": True, "symbol": symbol.upper(), "result": result}

    # ------------------------------------------------------------------ #

    def analyze(self, symbol: str, interval: str | None = None, limit: int = 750) -> EdgeReport:
        interval = interval or self.config.market.interval
        return self._cached(
            f"edge:{symbol}:{interval}:{limit}",
            900,
            lambda: edge_report(
                symbol.upper(), self.strategy, interval, limit,
                risk=self.config.risk,
                cash=self.config.account.starting_cash,
                fee_bps=self.config.costs.fee_bps,
                slippage_bps=self.config.costs.slippage_bps,
            ),
        )
