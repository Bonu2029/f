"""TOML configuration loading and validation.

Validation is strict and happens up front. A config mistake that surfaces three
hours into a live session — after positions are open — is far more expensive
than one that refuses to start.
"""

from __future__ import annotations

import os
import tomllib
from dataclasses import dataclass, field, fields
from typing import Any

from .risk import RiskConfig

DEFAULT_CONFIG_PATH = "config.toml"
VALID_INTERVALS = {"1m", "5m", "15m", "30m", "1h", "4h", "6h", "1d", "1w"}


class ConfigError(ValueError):
    pass


@dataclass
class AccountConfig:
    starting_cash: float = 10_000.0
    mode: str = "paper"  # "paper" | "live"


@dataclass
class MarketConfig:
    symbols: list[str] = field(default_factory=lambda: ["BTC-USD"])
    interval: str = "1h"
    history: int = 500
    source: str | None = None


@dataclass
class CostConfig:
    fee_bps: float = 5.0
    slippage_bps: float = 5.0


@dataclass
class ExecutionConfig:
    exchange: str = "binance"
    confirm_live: bool = False
    dry_run: bool = True
    testnet: bool = False
    poll_seconds: int = 0  # 0 = derive from the bar interval


@dataclass
class AppConfig:
    account: AccountConfig = field(default_factory=AccountConfig)
    market: MarketConfig = field(default_factory=MarketConfig)
    risk: RiskConfig = field(default_factory=RiskConfig)
    costs: CostConfig = field(default_factory=CostConfig)
    execution: ExecutionConfig = field(default_factory=ExecutionConfig)
    strategy: dict[str, Any] = field(default_factory=lambda: {"name": "trend"})
    notify: dict[str, Any] = field(default_factory=lambda: {"console": True})
    journal_path: str = "journal.db"

    @property
    def is_live_mode(self) -> bool:
        return self.account.mode == "live"


def _build(cls: type, data: dict[str, Any], section: str) -> Any:
    """Instantiate a dataclass from a config section, rejecting unknown keys."""
    known = {f.name for f in fields(cls)}
    unknown = set(data) - known
    if unknown:
        raise ConfigError(
            f"[{section}] has unknown key(s): {', '.join(sorted(unknown))}. "
            f"Valid keys: {', '.join(sorted(known))}"
        )
    return cls(**data)


def load_config(path: str = DEFAULT_CONFIG_PATH) -> AppConfig:
    if not os.path.exists(path):
        raise ConfigError(f"config file not found: {path}")
    with open(path, "rb") as fh:
        try:
            raw = tomllib.load(fh)
        except tomllib.TOMLDecodeError as exc:
            raise ConfigError(f"{path} is not valid TOML: {exc}") from exc
    return from_dict(raw, source=path)


def from_dict(raw: dict[str, Any], source: str = "<dict>") -> AppConfig:
    cfg = AppConfig(
        account=_build(AccountConfig, raw.get("account", {}), "account"),
        market=_build(MarketConfig, raw.get("market", {}), "market"),
        risk=_build(RiskConfig, raw.get("risk", {}), "risk"),
        costs=_build(CostConfig, raw.get("costs", {}), "costs"),
        execution=_build(ExecutionConfig, raw.get("execution", {}), "execution"),
        strategy=raw.get("strategy", {"name": "trend"}),
        notify=raw.get("notify", {"console": True}),
        journal_path=raw.get("journal", {}).get("path", "journal.db"),
    )
    validate(cfg, source)
    return cfg


def validate(cfg: AppConfig, source: str = "<config>") -> None:
    problems: list[str] = []

    if cfg.account.starting_cash <= 0:
        problems.append("account.starting_cash must be positive")
    if cfg.account.mode not in ("paper", "live"):
        problems.append("account.mode must be 'paper' or 'live'")

    if not cfg.market.symbols:
        problems.append("market.symbols must list at least one symbol")
    if cfg.market.interval not in VALID_INTERVALS:
        problems.append(
            f"market.interval {cfg.market.interval!r} is not one of "
            f"{sorted(VALID_INTERVALS)}"
        )
    if cfg.market.history < 100:
        problems.append("market.history should be >= 100 bars for indicator warm-up")

    r = cfg.risk
    if not 0 < r.risk_per_trade <= 0.1:
        problems.append("risk.risk_per_trade must be in (0, 0.1] — 0.005 means 0.5%")
    if r.stop_atr_mult <= 0:
        problems.append("risk.stop_atr_mult must be positive")
    if r.max_positions < 1:
        problems.append("risk.max_positions must be at least 1")
    if not 0 < r.max_drawdown_pct <= 1:
        problems.append("risk.max_drawdown_pct must be in (0, 1]")
    if not 0 < r.max_daily_loss_pct <= 1:
        problems.append("risk.max_daily_loss_pct must be in (0, 1]")
    if r.target_atr_mult is not None and r.target_atr_mult <= 0:
        problems.append("risk.target_atr_mult must be positive or omitted")

    if cfg.costs.fee_bps < 0 or cfg.costs.slippage_bps < 0:
        problems.append("costs must not be negative")

    if not isinstance(cfg.strategy, dict) or "name" not in cfg.strategy:
        problems.append("[strategy] must define a 'name'")

    # Live mode demands both switches; neither alone is enough.
    if cfg.is_live_mode:
        if not cfg.execution.confirm_live:
            problems.append(
                "account.mode='live' requires execution.confirm_live=true "
                "(a second, deliberate opt-in)"
            )
        if cfg.execution.dry_run:
            problems.append(
                "account.mode='live' with execution.dry_run=true would place no "
                "orders — set dry_run=false or switch mode back to 'paper'"
            )

    if problems:
        raise ConfigError(
            f"invalid configuration in {source}:\n  - " + "\n  - ".join(problems)
        )


DEFAULT_TOML = '''\
# tradingmachine configuration
# Everything here is paper trading unless you deliberately change two switches.

[account]
starting_cash = 10000.0
mode = "paper"           # "paper" or "live"

[market]
# Yahoo symbols: AAPL, SPY, EURUSD=X, ES=F, ^GSPC, BTC-USD
# Coinbase: BTC-USD   |   Binance: BTCUSDT
symbols  = ["BTC-USD", "ETH-USD", "AAPL", "EURUSD=X"]
interval = "1h"
history  = 500           # bars fetched per symbol

[strategy]
name      = "ensemble"
threshold = 0.35         # |weighted score| needed to take a side

  [[strategy.members]]
  name    = "trend"
  weight  = 2.0
  fast    = 20
  slow    = 50
  adx_min = 20.0

  [[strategy.members]]
  name    = "breakout"
  weight  = 1.5
  channel = 20

  [[strategy.members]]
  name    = "meanrev"
  weight  = 1.0
  oversold = 30.0

[risk]
risk_per_trade      = 0.005   # 0.5% of equity risked per trade
stop_atr_mult       = 2.0
target_atr_mult     = 3.0
trail_atr_mult      = 2.5
max_position_pct    = 0.25
max_gross_exposure_pct = 1.0
max_positions       = 5
max_daily_loss_pct  = 0.03    # stop opening trades after -3% on the day
max_drawdown_pct    = 0.20    # hard halt at -20% from peak equity
min_strength        = 0.2
cooldown_bars       = 1

[costs]
fee_bps      = 5.0       # 0.05% per side
slippage_bps = 5.0

[execution]
exchange     = "binance"
confirm_live = false     # must be true AND dry_run false to send real orders
dry_run      = true
testnet      = false
poll_seconds = 0         # 0 = derive from interval

[notify]
console = true
# discord_webhook = "https://discord.com/api/webhooks/..."
# telegram_token  = "..."
# telegram_chat_id = "..."

[journal]
path = "journal.db"
'''


def write_default_config(path: str = DEFAULT_CONFIG_PATH, force: bool = False) -> str:
    if os.path.exists(path) and not force:
        raise ConfigError(f"{path} already exists (use --force to overwrite)")
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(DEFAULT_TOML)
    return path
