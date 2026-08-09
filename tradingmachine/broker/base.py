"""Broker interface — the only place that turns a decision into an order."""

from __future__ import annotations

from abc import ABC, abstractmethod

from ..models import Fill, Side


class BrokerError(RuntimeError):
    pass


class Broker(ABC):
    name: str = "broker"
    #: True only for brokers that move real money.
    is_live: bool = False

    @abstractmethod
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
        """Submit a market order and return the resulting fill."""

    def get_price(self, symbol: str) -> float:
        """Latest tradeable price. Feeds are the default source; live brokers
        should override with their own ticker."""
        from ..data import get_candles

        return get_candles(symbol, "1m", 2)[-1].close

    def cash_balance(self) -> float | None:
        """Account cash, if the broker can report it. None means 'unknown'."""
        return None
