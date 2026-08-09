"""tradingmachine — a multi-market signal and execution engine.

    from tradingmachine import TrendFollow, run_backtest

    result = run_backtest(TrendFollow(), ["BTC-USD"], interval="1h", limit=1000)
    print(result.report())

Paper trading is the default everywhere. Live orders require an explicit
opt-in in config *and* an environment with API keys — see broker/live.py.

This software places no bets on your behalf that you did not configure, and it
makes no promise of profit. Markets are adversarial; test on paper first.
"""

from .backtest import Backtester, BacktestResult, Metrics, run_backtest
from .broker import Broker, CcxtBroker, PaperBroker
from .config import AppConfig, ConfigError, load_config
from .data import DataError, get_candles
from .engine import TradingEngine
from .journal import Journal
from .models import Candle, Fill, Order, Position, Side, Signal, Trade
from .portfolio import Portfolio
from .risk import RiskConfig, RiskManager
from .strategies import (
    Breakout,
    Ensemble,
    MeanReversion,
    Strategy,
    TrendFollow,
    build_strategy,
)

__version__ = "1.0.0"

__all__ = [
    "AppConfig",
    "BacktestResult",
    "Backtester",
    "Breakout",
    "Broker",
    "Candle",
    "CcxtBroker",
    "ConfigError",
    "DataError",
    "Ensemble",
    "Fill",
    "Journal",
    "MeanReversion",
    "Metrics",
    "Order",
    "PaperBroker",
    "Portfolio",
    "Position",
    "RiskConfig",
    "RiskManager",
    "Side",
    "Signal",
    "Strategy",
    "Trade",
    "TradingEngine",
    "TrendFollow",
    "build_strategy",
    "get_candles",
    "load_config",
    "run_backtest",
    "__version__",
]
