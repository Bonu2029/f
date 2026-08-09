"""Account state: cash, open positions, closed trades, equity."""

from __future__ import annotations

from dataclasses import dataclass, field

from .models import Fill, Position, Side, Trade


@dataclass
class Portfolio:
    starting_cash: float
    cash: float = 0.0
    positions: dict[str, Position] = field(default_factory=dict)
    trades: list[Trade] = field(default_factory=list)
    equity_curve: list[tuple[int, float]] = field(default_factory=list)
    fees_paid: float = 0.0

    def __post_init__(self) -> None:
        if self.cash == 0.0:
            self.cash = self.starting_cash

    # -- valuation ---------------------------------------------------------- #

    def equity(self, prices: dict[str, float]) -> float:
        """Cash plus mark-to-market on open positions.

        A position whose symbol is missing from `prices` is marked at its entry
        (i.e. flat) rather than dropped, so a data gap can never make equity
        silently jump.
        """
        total = self.cash
        for sym, pos in self.positions.items():
            price = prices.get(sym, pos.entry_price)
            total += pos.unrealized(price)
        return total

    def exposure(self, prices: dict[str, float]) -> float:
        """Gross notional of open positions."""
        return sum(
            abs(pos.qty) * prices.get(sym, pos.entry_price)
            for sym, pos in self.positions.items()
        )

    def realized_pnl(self) -> float:
        return sum(t.pnl for t in self.trades)

    def open_symbols(self) -> list[str]:
        return sorted(self.positions)

    def has_position(self, symbol: str) -> bool:
        return symbol in self.positions

    def mark(self, ts: int, prices: dict[str, float]) -> None:
        self.equity_curve.append((ts, self.equity(prices)))

    # -- mutation ----------------------------------------------------------- #

    def open_position(
        self,
        fill: Fill,
        stop: float | None = None,
        target: float | None = None,
        tag: str = "",
    ) -> Position:
        if fill.symbol in self.positions:
            raise ValueError(f"already holding {fill.symbol}; close it first")
        # PnL-based (margin-style) accounting: opening moves only the fee. The
        # notional itself never leaves cash — unrealized PnL shows up through
        # equity(), and becomes cash on close. Leverage is therefore bounded by
        # the risk manager's exposure caps, not by the cash balance.
        self.cash -= fill.fee
        self.fees_paid += fill.fee
        pos = Position(
            symbol=fill.symbol,
            side=fill.side,
            qty=abs(fill.qty),
            entry_price=fill.price,
            entry_ts=fill.ts,
            stop=stop,
            target=target,
            initial_stop=stop,
            extreme=fill.price,
            fees_paid=fill.fee,
            tag=tag or fill.tag,
        )
        self.positions[fill.symbol] = pos
        return pos

    def close_position(self, fill: Fill, reason: str, strategy: str = "") -> Trade:
        pos = self.positions.pop(fill.symbol, None)
        if pos is None:
            raise ValueError(f"no open position for {fill.symbol}")

        gross = (fill.price - pos.entry_price) * pos.qty * pos.side.sign
        fees = pos.fees_paid + fill.fee
        net = gross - fill.fee  # entry fee was already taken out of cash

        self.cash += net
        self.fees_paid += fill.fee

        risk_per_unit = pos.risk_per_unit()
        r_multiple = (
            (gross - fees) / (risk_per_unit * pos.qty) if risk_per_unit > 0 else None
        )

        trade = Trade(
            symbol=pos.symbol,
            side=pos.side,
            qty=pos.qty,
            entry_price=pos.entry_price,
            exit_price=fill.price,
            entry_ts=pos.entry_ts,
            exit_ts=fill.ts,
            pnl=gross - fees,
            fees=fees,
            r_multiple=r_multiple,
            reason=reason,
            strategy=strategy,
        )
        self.trades.append(trade)
        return trade

    def update_extreme(self, symbol: str, price: float) -> None:
        """Track the best price seen since entry, for trailing stops."""
        pos = self.positions.get(symbol)
        if pos is None:
            return
        pos.extreme = (
            max(pos.extreme, price) if pos.side is Side.LONG else min(pos.extreme, price)
        )

    def summary(self, prices: dict[str, float] | None = None) -> dict:
        prices = prices or {}
        eq = self.equity(prices)
        return {
            "starting_cash": self.starting_cash,
            "cash": self.cash,
            "equity": eq,
            "return_pct": (eq / self.starting_cash - 1.0) * 100.0,
            "open_positions": len(self.positions),
            "closed_trades": len(self.trades),
            "realized_pnl": self.realized_pnl(),
            "fees_paid": self.fees_paid,
        }
