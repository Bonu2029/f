"""Live exchange execution via ccxt. Real money. Read this file before using it.

Three separate things must all be true before a single real order is sent:

  1. ``ccxt`` is installed and API keys are present in the environment;
  2. the broker was constructed with ``confirm_live=True``;
  3. ``dry_run`` is False.

Any one of them missing means orders are logged, not placed. That layering is
deliberate — a config typo should cost you nothing.
"""

from __future__ import annotations

import logging
import os
import time

from ..models import Fill, Side
from .base import Broker, BrokerError

log = logging.getLogger(__name__)


class CcxtBroker(Broker):
    name = "ccxt"

    def __init__(
        self,
        exchange_id: str = "binance",
        *,
        confirm_live: bool = False,
        dry_run: bool = True,
        api_key_env: str = "TM_API_KEY",
        api_secret_env: str = "TM_API_SECRET",
        password_env: str = "TM_API_PASSWORD",
        default_type: str = "spot",
        testnet: bool = False,
    ) -> None:
        self.exchange_id = exchange_id
        self.confirm_live = confirm_live
        self.dry_run = dry_run
        self.testnet = testnet
        self._exchange = None

        key = os.environ.get(api_key_env)
        secret = os.environ.get(api_secret_env)
        password = os.environ.get(password_env)
        self._have_keys = bool(key and secret)

        self.is_live = bool(confirm_live and not dry_run and self._have_keys)

        if confirm_live and not dry_run and not self._have_keys:
            raise BrokerError(
                f"live trading requested but {api_key_env}/{api_secret_env} are not set"
            )

        if self._have_keys:
            try:
                import ccxt  # noqa: PLC0415 - optional dependency, imported on demand
            except ImportError as exc:
                raise BrokerError(
                    "ccxt is not installed; run `pip install ccxt` for live trading"
                ) from exc
            if not hasattr(ccxt, exchange_id):
                raise BrokerError(f"ccxt has no exchange {exchange_id!r}")
            cfg = {
                "apiKey": key,
                "secret": secret,
                "enableRateLimit": True,
                "options": {"defaultType": default_type},
            }
            if password:
                cfg["password"] = password
            self._exchange = getattr(ccxt, exchange_id)(cfg)
            if testnet:
                # Not every exchange implements sandbox mode; fail loudly if not.
                self._exchange.set_sandbox_mode(True)

        if self.is_live:
            log.warning(
                "LIVE TRADING ENABLED on %s%s — real orders will be placed",
                exchange_id,
                " (testnet)" if testnet else "",
            )

    # ---------------------------------------------------------------------- #

    def get_price(self, symbol: str) -> float:
        if self._exchange is None:
            return super().get_price(symbol)
        ticker = self._exchange.fetch_ticker(symbol)
        price = ticker.get("last") or ticker.get("close")
        if not price:
            raise BrokerError(f"no price in ticker for {symbol}")
        return float(price)

    def cash_balance(self) -> float | None:
        if self._exchange is None:
            return None
        try:
            balance = self._exchange.fetch_balance()
        except Exception as exc:  # noqa: BLE001 - exchange errors are open-ended
            log.error("balance fetch failed: %s", exc)
            return None
        free = balance.get("free") or {}
        for quote in ("USDT", "USD", "USDC", "EUR"):
            if quote in free:
                return float(free[quote])
        return None

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
        qty = abs(qty)
        # Opening a long buys; closing a long sells. Same logic mirrored for shorts.
        buying = (side is Side.LONG) != reduce_only
        action = "buy" if buying else "sell"

        if not self.is_live:
            log.info(
                "[DRY RUN] %s %s %.8f %s @~%.8f (%s)",
                self.exchange_id, action, qty, symbol, price_hint, tag or "no tag",
            )
            return Fill(symbol, side, qty, price_hint, 0.0, ts, tag=f"dryrun:{tag}")

        assert self._exchange is not None  # guaranteed by is_live
        params = {"reduceOnly": True} if reduce_only else {}
        try:
            order = self._exchange.create_order(symbol, "market", action, qty, None, params)
        except Exception as exc:  # noqa: BLE001
            raise BrokerError(f"order rejected for {symbol}: {exc}") from exc

        filled_price = order.get("average") or order.get("price") or price_hint
        filled_qty = order.get("filled") or qty
        fee_info = order.get("fee") or {}
        fee = float(fee_info.get("cost") or 0.0)

        log.info(
            "LIVE %s %s %.8f %s @ %.8f", self.exchange_id, action, filled_qty,
            symbol, float(filled_price),
        )
        return Fill(
            symbol=symbol,
            side=side,
            qty=float(filled_qty),
            price=float(filled_price),
            fee=fee,
            ts=int(order.get("timestamp") or ts * 1000) // 1000 or int(time.time()),
            tag=tag,
        )
