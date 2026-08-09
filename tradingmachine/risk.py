"""Risk management: position sizing, stops, and the gates that stop trading.

This is the only module that decides *how much*. Strategies decide direction;
this decides survival. The defaults are deliberately conservative — a system
that risks 0.5% per trade needs a 100+ trade losing streak to be wiped out,
while one risking 10% needs about seven.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from datetime import datetime, timezone

from .models import Position, Side, Signal
from .portfolio import Portfolio


@dataclass
class RiskConfig:
    #: Fraction of equity risked between entry and stop on a full-strength signal.
    risk_per_trade: float = 0.005
    #: Stop distance in ATRs.
    stop_atr_mult: float = 2.0
    #: Take-profit distance in ATRs. None disables the fixed target.
    target_atr_mult: float | None = 3.0
    #: Trailing stop distance in ATRs, applied once in profit. None disables.
    trail_atr_mult: float | None = 2.5
    #: Cap on any single position's notional, as a fraction of equity.
    max_position_pct: float = 0.25
    #: Cap on total gross notional across all positions.
    max_gross_exposure_pct: float = 1.0
    max_positions: int = 5
    #: Halt new entries for the rest of the UTC day after this much daily loss.
    max_daily_loss_pct: float = 0.03
    #: Halt trading entirely after this drawdown from the equity peak.
    max_drawdown_pct: float = 0.20
    #: Ignore signals weaker than this.
    min_strength: float = 0.2
    #: Bars to wait after closing a symbol before re-entering it.
    cooldown_bars: int = 1
    #: Close when the strategy flips to the OPPOSITE side.
    exit_on_opposite: bool = True
    #: Close when the strategy merely goes FLAT. Off by default: a signal that
    #: dips below its own entry threshold is noise, not a reversal, and exiting
    #: on it churns the account in fees while never letting a stop or target
    #: do its job. Let the stop define the exit; let FLAT mean "take no new risk".
    exit_on_flat: bool = False
    #: Refuse to size a trade if the stop is closer than this fraction of price
    #: (a near-zero stop produces an absurdly large position).
    min_stop_pct: float = 0.0005


@dataclass
class SizedTrade:
    qty: float
    stop: float
    target: float | None
    risk_amount: float
    notional: float
    reason: str = ""


@dataclass
class RiskState:
    peak_equity: float = 0.0
    day_start_equity: float = 0.0
    day_key: str = ""
    halted: bool = False
    halt_reason: str = ""
    cooldowns: dict[str, int] = field(default_factory=dict)


class RiskManager:
    def __init__(self, config: RiskConfig | None = None) -> None:
        self.config = config or RiskConfig()
        self.state = RiskState()

    # -- daily / drawdown bookkeeping --------------------------------------- #

    def observe_equity(self, equity: float, ts: int | None = None) -> None:
        """Call once per bar with current equity. Rolls the day and the peak."""
        ts = ts if ts is not None else int(time.time())
        day = datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%d")

        if self.state.day_key != day:
            self.state.day_key = day
            self.state.day_start_equity = equity
            # A new UTC day clears a daily-loss halt, but never a drawdown halt.
            if self.state.halt_reason.startswith("daily loss"):
                self.state.halted = False
                self.state.halt_reason = ""

        self.state.peak_equity = max(self.state.peak_equity, equity)

        if self.state.peak_equity > 0:
            dd = 1.0 - equity / self.state.peak_equity
            if dd >= self.config.max_drawdown_pct:
                self.state.halted = True
                self.state.halt_reason = (
                    f"max drawdown breached ({dd:.1%} >= "
                    f"{self.config.max_drawdown_pct:.1%})"
                )
                return

        if self.state.day_start_equity > 0:
            day_loss = 1.0 - equity / self.state.day_start_equity
            if day_loss >= self.config.max_daily_loss_pct:
                self.state.halted = True
                self.state.halt_reason = (
                    f"daily loss limit hit ({day_loss:.1%} >= "
                    f"{self.config.max_daily_loss_pct:.1%})"
                )

    def tick_cooldowns(self) -> None:
        for sym in list(self.state.cooldowns):
            self.state.cooldowns[sym] -= 1
            if self.state.cooldowns[sym] <= 0:
                del self.state.cooldowns[sym]

    def start_cooldown(self, symbol: str) -> None:
        if self.config.cooldown_bars > 0:
            self.state.cooldowns[symbol] = self.config.cooldown_bars

    # -- entry gates --------------------------------------------------------- #

    def can_enter(
        self, symbol: str, signal: Signal, portfolio: Portfolio, prices: dict[str, float]
    ) -> tuple[bool, str]:
        cfg = self.config
        if self.state.halted:
            return False, f"halted: {self.state.halt_reason}"
        if signal.side is Side.FLAT:
            return False, "no directional signal"
        if signal.strength < cfg.min_strength:
            return False, f"strength {signal.strength:.2f} below {cfg.min_strength:.2f}"
        if portfolio.has_position(symbol):
            return False, "already in position"
        if symbol in self.state.cooldowns:
            return False, f"cooldown ({self.state.cooldowns[symbol]} bars left)"
        if len(portfolio.positions) >= cfg.max_positions:
            return False, f"at max positions ({cfg.max_positions})"

        equity = portfolio.equity(prices)
        if equity <= 0:
            return False, "no equity left"
        if portfolio.exposure(prices) >= equity * cfg.max_gross_exposure_pct:
            return False, "gross exposure cap reached"
        return True, "ok"

    # -- sizing --------------------------------------------------------------- #

    def size(
        self,
        signal: Signal,
        price: float,
        atr: float,
        equity: float,
        current_exposure: float = 0.0,
    ) -> SizedTrade | None:
        """Turn a signal into a quantity, a stop, and a target.

        Returns ``None`` when the trade cannot be sized safely — which is a
        legitimate, common outcome, not an error.
        """
        cfg = self.config
        if price <= 0 or atr <= 0 or equity <= 0 or signal.side is Side.FLAT:
            return None

        stop_distance = atr * cfg.stop_atr_mult
        if stop_distance < price * cfg.min_stop_pct:
            return None  # stop too tight to be real; sizing would explode

        risk_amount = equity * cfg.risk_per_trade * signal.strength
        qty = risk_amount / stop_distance

        # Clamp to the per-position notional cap.
        max_notional = equity * cfg.max_position_pct
        if qty * price > max_notional:
            qty = max_notional / price

        # Clamp to whatever gross exposure budget is left.
        remaining = equity * cfg.max_gross_exposure_pct - current_exposure
        if remaining <= 0:
            return None
        if qty * price > remaining:
            qty = remaining / price

        if qty <= 0 or qty * price < 1e-9:
            return None

        sign = signal.side.sign
        stop = price - sign * stop_distance
        target = (
            price + sign * atr * cfg.target_atr_mult
            if cfg.target_atr_mult
            else None
        )
        if stop <= 0 and signal.side is Side.LONG:
            return None  # stop below zero is meaningless for a long

        return SizedTrade(
            qty=qty,
            stop=stop,
            target=target,
            risk_amount=qty * stop_distance,
            notional=qty * price,
            reason=f"risk {qty * stop_distance:.2f} @ {cfg.stop_atr_mult}x ATR",
        )

    # -- exits ----------------------------------------------------------------- #

    def exit_price_hit(
        self, pos: Position, high: float, low: float
    ) -> tuple[bool, float, str]:
        """Did this bar's range touch the stop or target?

        When a single bar spans both levels we assume the STOP filled first.
        We cannot know the intrabar path from OHLC, and assuming the favourable
        one is exactly how backtests manufacture returns that never appear live.
        """
        if pos.side is Side.LONG:
            if pos.stop is not None and low <= pos.stop:
                return True, pos.stop, "stop"
            if pos.target is not None and high >= pos.target:
                return True, pos.target, "target"
        else:
            if pos.stop is not None and high >= pos.stop:
                return True, pos.stop, "stop"
            if pos.target is not None and low <= pos.target:
                return True, pos.target, "target"
        return False, 0.0, ""

    def should_exit_on_signal(self, pos: Position, signal: Signal) -> tuple[bool, str]:
        """Does this signal justify closing an open position?

        Separated from the stop logic on purpose: stops handle *risk*, this
        handles *conviction*. Conflating them is what turns a trend follower
        into a scalper that pays the spread forty times a day.
        """
        cfg = self.config
        if signal.side is pos.side:
            return False, ""
        if signal.side is Side.FLAT:
            if cfg.exit_on_flat:
                return True, "signal->flat"
            return False, ""
        if cfg.exit_on_opposite:
            return True, f"signal->{signal.side.value}"
        return False, ""

    def update_trailing_stop(self, pos: Position, atr: float) -> bool:
        """Ratchet the stop toward price. Returns True if the stop moved.

        The stop only ever moves in the profitable direction — a stop that can
        widen is not a stop.
        """
        if not self.config.trail_atr_mult or atr <= 0:
            return False
        distance = atr * self.config.trail_atr_mult

        if pos.side is Side.LONG:
            candidate = pos.extreme - distance
            if pos.stop is None or candidate > pos.stop:
                pos.stop = candidate
                return True
        else:
            candidate = pos.extreme + distance
            if pos.stop is None or candidate < pos.stop:
                pos.stop = candidate
                return True
        return False
