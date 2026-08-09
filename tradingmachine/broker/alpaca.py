"""Alpaca brokerage — real US stocks and ETFs, via their REST API.

Two completely separate accounts exist at Alpaca, with different URLs and
different keys:

    paper-api.alpaca.markets   fake money, real order matching  ← the default
    api.alpaca.markets         your actual money

This adapter talks to the paper endpoint unless you deliberately switch it, and
switching it requires the same opt-in as any other live venue. Paper trading at
the broker is strictly better than simulating locally: you get their order
rejections, their market-hours rules, and their fill behaviour, for free.

Get free keys at https://alpaca.markets — the paper account needs no funding.

    export ALPACA_KEY_ID=...
    export ALPACA_SECRET_KEY=...
"""

from __future__ import annotations

import json
import logging
import os
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any

from ..models import Fill, Side
from .base import Broker, BrokerError

log = logging.getLogger(__name__)

PAPER_URL = "https://paper-api.alpaca.markets"
LIVE_URL = "https://api.alpaca.markets"
DATA_URL = "https://data.alpaca.markets"


@dataclass
class Account:
    cash: float
    equity: float
    buying_power: float
    currency: str
    status: str
    pattern_day_trader: bool
    trading_blocked: bool
    daytrade_count: int

    @property
    def is_tradable(self) -> bool:
        return self.status == "ACTIVE" and not self.trading_blocked


@dataclass
class BrokerPosition:
    symbol: str
    qty: float
    side: Side
    avg_entry: float
    current_price: float
    market_value: float
    unrealized_pl: float
    unrealized_plpc: float


class AlpacaBroker(Broker):
    name = "alpaca"

    def __init__(
        self,
        *,
        paper: bool = True,
        confirm_live: bool = False,
        dry_run: bool = False,
        key_env: str = "ALPACA_KEY_ID",
        secret_env: str = "ALPACA_SECRET_KEY",
        timeout: int = 20,
    ) -> None:
        self.paper = paper
        self.dry_run = dry_run
        self.timeout = timeout
        self.base = PAPER_URL if paper else LIVE_URL

        self.key = os.environ.get(key_env) or os.environ.get("TM_ALPACA_KEY_ID")
        self.secret = os.environ.get(secret_env) or os.environ.get("TM_ALPACA_SECRET_KEY")
        self._have_keys = bool(self.key and self.secret)

        if not paper and not confirm_live:
            raise BrokerError(
                "refusing to target the live Alpaca endpoint without "
                "confirm_live=True — set execution.confirm_live in your config"
            )
        if not self._have_keys:
            raise BrokerError(
                f"{key_env} and {secret_env} must be set. Free paper-trading keys: "
                "https://alpaca.markets"
            )

        # Real money only when pointed at the live host with dry_run off.
        self.is_live = (not paper) and (not dry_run)
        if self.is_live:
            log.warning("ALPACA LIVE ACCOUNT — real orders will be placed")

    # ------------------------------------------------------------------ #
    # transport
    # ------------------------------------------------------------------ #

    def _request(
        self, method: str, path: str, body: dict | None = None, base: str | None = None
    ) -> Any:
        url = (base or self.base) + path
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(
            url,
            data=data,
            method=method,
            headers={
                "APCA-API-KEY-ID": self.key or "",
                "APCA-API-SECRET-KEY": self.secret or "",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                raw = resp.read().decode()
                return json.loads(raw) if raw else {}
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode()[:400]
            if exc.code in (401, 403):
                raise BrokerError(
                    f"Alpaca rejected the credentials ({exc.code}). Check that your "
                    f"keys match the {'paper' if self.paper else 'live'} account — "
                    "paper and live keys are not interchangeable."
                ) from exc
            raise BrokerError(f"Alpaca {method} {path} -> {exc.code}: {detail}") from exc
        except urllib.error.URLError as exc:
            raise BrokerError(f"could not reach Alpaca: {exc.reason}") from exc

    # ------------------------------------------------------------------ #
    # account
    # ------------------------------------------------------------------ #

    def account(self) -> Account:
        a = self._request("GET", "/v2/account")
        return Account(
            cash=float(a.get("cash", 0)),
            equity=float(a.get("equity", 0)),
            buying_power=float(a.get("buying_power", 0)),
            currency=a.get("currency", "USD"),
            status=a.get("status", "UNKNOWN"),
            pattern_day_trader=bool(a.get("pattern_day_trader")),
            trading_blocked=bool(a.get("trading_blocked")),
            daytrade_count=int(a.get("daytrade_count", 0) or 0),
        )

    def cash_balance(self) -> float | None:
        try:
            return self.account().cash
        except BrokerError as exc:
            log.error("balance fetch failed: %s", exc)
            return None

    def positions(self) -> list[BrokerPosition]:
        rows = self._request("GET", "/v2/positions") or []
        out = []
        for p in rows:
            qty = float(p["qty"])
            out.append(
                BrokerPosition(
                    symbol=p["symbol"],
                    qty=abs(qty),
                    side=Side.LONG if qty >= 0 else Side.SHORT,
                    avg_entry=float(p["avg_entry_price"]),
                    current_price=float(p.get("current_price") or 0),
                    market_value=float(p.get("market_value") or 0),
                    unrealized_pl=float(p.get("unrealized_pl") or 0),
                    unrealized_plpc=float(p.get("unrealized_plpc") or 0) * 100.0,
                )
            )
        return out

    def market_is_open(self) -> tuple[bool, str]:
        """Returns (open?, human explanation). Orders outside hours queue to the open."""
        c = self._request("GET", "/v2/clock")
        if c.get("is_open"):
            return True, f"open, closes {c.get('next_close', '?')}"
        return False, f"closed, opens {c.get('next_open', '?')}"

    # ------------------------------------------------------------------ #
    # market data (Alpaca's own feed — keys already required)
    # ------------------------------------------------------------------ #

    def get_price(self, symbol: str) -> float:
        try:
            q = self._request(
                "GET", f"/v2/stocks/{symbol}/trades/latest", base=DATA_URL
            )
            price = (q.get("trade") or {}).get("p")
            if price:
                return float(price)
        except BrokerError as exc:
            log.debug("alpaca last-trade failed for %s (%s); falling back", symbol, exc)
        return super().get_price(symbol)

    # ------------------------------------------------------------------ #
    # orders
    # ------------------------------------------------------------------ #

    def market_order(
        self,
        symbol: str,
        side: Side,
        qty: float,
        price_hint: float,
        ts: int,
        *,
        reduce_only: bool = False,
        tag: str = "",
    ) -> Fill:
        buying = (side is Side.LONG) != reduce_only
        action = "buy" if buying else "sell"
        qty = abs(qty)

        if self.dry_run:
            log.info("[DRY RUN] alpaca %s %.4f %s @~%.4f", action, qty, symbol, price_hint)
            return Fill(symbol, side, qty, price_hint, 0.0, ts, tag=f"dryrun:{tag}")

        body = {
            "symbol": symbol,
            "qty": str(qty),
            "side": action,
            "type": "market",
            "time_in_force": "day",
        }
        order = self._request("POST", "/v2/orders", body)
        return self._await_fill(order, symbol, side, qty, price_hint, ts, tag)

    def bracket_order(
        self,
        symbol: str,
        side: Side,
        qty: float,
        price_hint: float,
        ts: int,
        *,
        stop: float,
        target: float | None = None,
        tag: str = "",
    ) -> Fill:
        """Entry plus a stop (and optional target) attached server-side.

        This matters more than it looks: a bracket lives at the broker, so your
        stop survives your laptop closing, the process crashing, or the network
        dropping. A stop that only exists in local memory protects nothing.

        Alpaca requires whole shares for brackets, so the quantity is floored.
        """
        qty = float(int(abs(qty)))
        if qty < 1:
            raise BrokerError(
                f"bracket orders need at least 1 whole share of {symbol}; "
                "risk sizing produced less than one — lower the price or raise risk"
            )
        if side is Side.LONG and stop >= price_hint:
            raise BrokerError(f"long stop {stop} must sit below entry {price_hint}")
        if side is Side.SHORT and stop <= price_hint:
            raise BrokerError(f"short stop {stop} must sit above entry {price_hint}")

        if self.dry_run:
            log.info(
                "[DRY RUN] alpaca bracket %s %.0f %s stop %.2f target %s",
                side.value, qty, symbol, stop, target,
            )
            return Fill(symbol, side, qty, price_hint, 0.0, ts, tag=f"dryrun:{tag}")

        body: dict[str, Any] = {
            "symbol": symbol,
            "qty": str(int(qty)),
            "side": "buy" if side is Side.LONG else "sell",
            "type": "market",
            "time_in_force": "gtc",   # brackets must outlive the session
            "order_class": "bracket" if target else "oto",
            "stop_loss": {"stop_price": round(stop, 2)},
        }
        if target:
            body["take_profit"] = {"limit_price": round(target, 2)}

        order = self._request("POST", "/v2/orders", body)
        return self._await_fill(order, symbol, side, qty, price_hint, ts, tag)

    def _await_fill(
        self, order: dict, symbol: str, side: Side, qty: float,
        price_hint: float, ts: int, tag: str, tries: int = 6,
    ) -> Fill:
        """Poll briefly for the average fill price.

        A market order usually fills in well under a second, but not always. If
        it hasn't filled by the time we give up we return the submitted price
        rather than blocking — the position is real either way, and the journal
        is reconciled from the broker on the next cycle.
        """
        oid = order.get("id")
        filled_avg = order.get("filled_avg_price")
        for attempt in range(tries):
            if filled_avg:
                break
            time.sleep(0.35 * (attempt + 1))
            try:
                order = self._request("GET", f"/v2/orders/{oid}")
            except BrokerError:
                break
            filled_avg = order.get("filled_avg_price")

        price = float(filled_avg) if filled_avg else price_hint
        filled_qty = float(order.get("filled_qty") or qty) or qty
        status = order.get("status", "?")
        if not filled_avg:
            log.warning(
                "order %s for %s is %s, not yet filled — recorded at the "
                "submitted price and reconciled next cycle", oid, symbol, status,
            )
        log.info("alpaca %s %s %.4f @ %.4f (%s)", side.value, symbol, filled_qty, price, status)
        return Fill(symbol, side, filled_qty, price, 0.0, ts, tag=tag or str(oid))

    def close_position(self, symbol: str) -> dict:
        """Flatten a symbol at the broker, cancelling any resting bracket legs."""
        if self.dry_run:
            log.info("[DRY RUN] alpaca close %s", symbol)
            return {"dry_run": True, "symbol": symbol}
        return self._request("DELETE", f"/v2/positions/{symbol}")

    def open_orders(self) -> list[dict]:
        return self._request("GET", "/v2/orders?status=open") or []

    def cancel_all_orders(self) -> None:
        if not self.dry_run:
            self._request("DELETE", "/v2/orders")

    def is_tradable(self, symbol: str) -> tuple[bool, str]:
        """Ask the broker whether it will actually accept orders for this symbol."""
        try:
            a = self._request("GET", f"/v2/assets/{symbol}")
        except BrokerError as exc:
            return False, str(exc)
        if not a.get("tradable"):
            return False, f"{symbol} is not tradable at Alpaca"
        if a.get("status") != "active":
            return False, f"{symbol} is {a.get('status')}"
        notes = []
        if a.get("fractionable"):
            notes.append("fractional ok")
        if a.get("shortable"):
            notes.append("shortable")
        return True, ", ".join(notes) or "tradable"
