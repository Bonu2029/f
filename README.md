# tradingmachine

A multi-market trading bot: live market data, technical strategies, ATR-based
risk management, an honest backtester, paper trading, a SQLite trade journal,
and an optional live-exchange adapter.

Stocks, ETFs, forex, futures, indices, and crypto. Pure Python standard library —
no numpy, no pandas, no API keys needed to run everything except live orders.

```bash
python -m tradingmachine init                    # write config.toml
python -m tradingmachine scan                    # current signals, trades nothing
python -m tradingmachine backtest --limit 2000   # test on real history
python -m tradingmachine run                     # paper trading loop
```

---

## What this is, and what it isn't

**It is** a complete, working trading system. The data is real, the indicators
are correct, the backtester refuses to cheat, the risk manager will stop the bot
out of a losing streak, and the live adapter can place real orders on a real
exchange.

**It is not** a money printer, and no bot is. The three strategies shipped here
are well-known textbook approaches. Run the backtests below and you will see
several of them lose money on recent data — that output is not a bug, it is the
system telling you the truth. A trading bot's value is that it executes *your*
edge without flinching, journals everything, and sizes positions so one bad
week cannot end you. Finding the edge is still your job.

Anyone selling you a bot with a guaranteed win rate is selling you the bot, not
the edge.

---

## Install

Requires Python 3.11+ (for `tomllib`). Nothing else for data, backtesting, and
paper trading.

```bash
git clone <this repo> && cd f
python -m tradingmachine init
python -m unittest discover -s tests    # 131 tests
```

Optional, for live exchange orders only:

```bash
pip install ccxt
```

---

## The commands

| Command | What it does |
|---|---|
| `init` | Write a commented starter `config.toml` |
| `scan` | Evaluate every symbol right now and print signals. Trades nothing. |
| `backtest` | Run the strategy over historical bars, with costs, and report metrics |
| `run` | The live loop. Paper by default. |
| `status` | Account equity, open positions, stops, journal stats |
| `journal` | Recent trades; `--export trades.csv` |
| `feeds` | List data sources; `--test AAPL` to check connectivity |
| `strategies` | List available strategies |

```bash
python -m tradingmachine scan --symbols BTC-USD ETH-USD SPY EURUSD=X --interval 1h
python -m tradingmachine backtest --symbols AAPL --interval 1d --limit 800 --trades 20
python -m tradingmachine run --once            # a single cycle, then exit
python -m tradingmachine journal --export trades.csv
```

---

## Markets and symbols

Data comes from Yahoo Finance (everything) and Coinbase/Binance (crypto), with
automatic fallback when one venue is down or geo-blocked.

| Market | Symbol format | Example |
|---|---|---|
| Stocks / ETFs | plain ticker | `AAPL`, `SPY`, `NVDA` |
| Forex | pair + `=X` | `EURUSD=X`, `GBPJPY=X` |
| Futures | root + `=F` | `ES=F`, `CL=F`, `GC=F` |
| Indices | `^` + code | `^GSPC`, `^NDX`, `^VIX` |
| Crypto | dash pair | `BTC-USD`, `ETH-USD` |
| Crypto (Binance) | concatenated | `BTCUSDT` |

Intervals: `1m`, `5m`, `15m`, `30m`, `1h`, `4h`, `1d`, `1w`.

You can also backtest your own CSVs:

```python
from tradingmachine.data import register_csv, get_candles
register_csv("data/{symbol}_{interval}.csv")
candles = get_candles("MYSYM", "1h", 5000, source="csv")
```

---

## Strategies

| Name | Idea | Guard against its own worst failure mode |
|---|---|---|
| `trend` | EMA fast/slow regime | ADX floor — won't take crosses in chop |
| `meanrev` | RSI extreme at a Bollinger band | ADX ceiling — won't buy dips in a downtrend |
| `breakout` | Donchian channel break | Requires range expansion — filters false pokes |
| `ensemble` | Weighted vote of the above | Disagreement produces FLAT, not a coin flip |

Add your own in ~20 lines:

```python
from tradingmachine.strategies.base import Strategy
from tradingmachine.models import Side, Signal
from tradingmachine.indicators import closes, ema, last_defined

class MyStrategy(Strategy):
    name = "mine"
    warmup = 60

    def evaluate(self, candles):
        fast = last_defined(ema(closes(candles), 10))
        slow = last_defined(ema(closes(candles), 50))
        atr = self._atr(candles)
        if None in (fast, slow, atr):
            return self._flat("indicators unavailable")
        if fast > slow:
            # `atr` in meta is what the risk manager sizes and stops with.
            return Signal(Side.LONG, 0.8, "fast above slow", {"atr": atr})
        return self._flat("no setup")

from tradingmachine.strategies import REGISTRY
REGISTRY["mine"] = MyStrategy      # now usable from config.toml
```

---

## Risk management

This is the part that matters. Strategies decide *direction*; `risk.py` decides
*how much*, and it is the only module that does.

- **ATR position sizing.** Every trade risks the same fraction of equity
  (default 0.5%) between entry and stop, so a volatile instrument gets a smaller
  position automatically.
- **Stops and targets** at configurable ATR multiples, plus a trailing stop that
  only ever ratchets in your favour.
- **Caps**: per-position notional, gross exposure, max concurrent positions.
- **Daily loss limit** (default −3%) halts new entries until the next UTC day.
- **Max drawdown kill switch** (default −20% from peak) halts trading entirely
  and survives restarts.
- **Cooldown** after a close, so the bot can't re-enter on the bar that just
  stopped it out.

At 0.5% risk per trade, a 20-trade losing streak costs you about 10%. At the
"risk 10% per trade" that hype accounts suggest, the same streak is a wipeout.

---

## Why you can trust the backtest

Backtesters flatter themselves in well-known ways. This one is built to avoid
the three worst:

1. **No lookahead.** A signal computed from bar *i*'s close fills at bar *i+1*'s
   **open**. There is a test that gaps price 100 → 150 between those bars and
   asserts the fill is 150.
2. **Pessimistic intrabar.** If one bar's range covers both your stop and your
   target, the **stop** is assumed to fill. OHLC doesn't record the path inside
   a bar, and assuming the good outcome is how losing systems backtest well.
3. **Costs are always on.** Fees and slippage come from the same `PaperBroker`
   used in paper and live, so all three modes share one execution model. There's
   a test asserting that round-tripping a flat market loses money.

Metrics reported: total return, CAGR, max drawdown, Sharpe, Sortino, Calmar,
win rate, profit factor, expectancy in R, average win/loss, worst losing streak,
fees paid, and time in market.

Even so: a backtest is a hypothesis, not a forecast. It cannot model gaps,
halts, partial fills, or a market regime that has never happened before.

---

## Going live (read this twice)

Live trading is off behind **three independent switches**, all of which must be
set. A single typo cannot arm it.

1. `account.mode = "live"` in `config.toml`
2. `execution.confirm_live = true` **and** `execution.dry_run = false`
3. `TM_API_KEY` / `TM_API_SECRET` set in the environment

Then `run` still asks you to type `LIVE` at the prompt.

```bash
export TM_API_KEY=...
export TM_API_SECRET=...
python -m tradingmachine run
```

With keys set but `dry_run = true`, every order is logged instead of sent — the
correct way to shake out a config before risking anything.

Order of operations that will save you money: **backtest → paper for weeks →
exchange testnet → live with money you can lose.** Skipping straight to step
four is the most expensive shortcut in trading.

---

## Alerts

Set any of these and the bot posts entries, exits, and halts:

```bash
export TM_DISCORD_WEBHOOK="https://discord.com/api/webhooks/..."
export TM_TELEGRAM_TOKEN="..."  TM_TELEGRAM_CHAT_ID="..."
export TM_SLACK_WEBHOOK="https://hooks.slack.com/services/..."
```

A failing webhook is logged and ignored — alerting never blocks trading.

---

## Library use

```python
from tradingmachine import TrendFollow, RiskConfig, run_backtest

result = run_backtest(
    TrendFollow(fast=20, slow=50),
    ["BTC-USD", "ETH-USD"],
    interval="4h",
    limit=2000,
    risk=RiskConfig(risk_per_trade=0.005, max_positions=3),
)
print(result.report())
for trade in result.portfolio.trades:
    print(trade.symbol, trade.pnl, trade.r_multiple)
```

---

## Layout

```
tradingmachine/
  models.py        Candle, Signal, Position, Trade — the shared vocabulary
  indicators.py    EMA/RSI/ATR/ADX/Bollinger/Donchian/MACD, pure Python
  data/            Yahoo, Coinbase, Binance, CSV + fallback and caching
  strategies/      trend, meanrev, breakout, ensemble + registry
  risk.py          Sizing, stops, exposure caps, daily loss, kill switch
  portfolio.py     Cash, positions, closed trades, equity
  broker/          PaperBroker (costs) and CcxtBroker (live, triple-gated)
  backtest.py      Event-driven backtester and metrics
  engine.py        The live loop, with crash-safe state checkpointing
  journal.py       SQLite record of signals, fills, trades, equity
  notify.py        Console, Discord, Telegram, Slack
  config.py        TOML loading with strict validation
  cli.py           The command line
tests/             131 tests
```

---

## Disclaimer

This is software for research and education. It is not financial advice. Trading
carries real risk of losing more than you put in, particularly with leverage.
Nothing here predicts the future or guarantees a profit. You are responsible for
every order this program places on your behalf — which is precisely why live
trading takes three switches and a typed confirmation to turn on.
