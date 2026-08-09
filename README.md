# tradingmachine

A multi-market trading bot: live market data, technical strategies, ATR-based
risk management, an honest backtester, paper trading, a SQLite trade journal,
and an optional live-exchange adapter.

Stocks, ETFs, forex, futures, indices, and crypto. Pure Python standard library —
no numpy, no pandas, no API keys needed to run everything except live orders.

```bash
python -m tradingmachine init                    # write config.toml
python -m tradingmachine serve                   # ← the desk, in your browser
python -m tradingmachine screen tech             # scan a universe for setups
python -m tradingmachine analyze NVDA            # does this setup have an edge?
python -m tradingmachine buy AAPL                # risk-sized, stop attached
python -m tradingmachine backtest --limit 2000   # test on real history
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

**One thing it deliberately will not do** is tell you whether a specific trade
will win. Nothing can. What `analyze` gives you instead is the *base rate*: when
this strategy took this kind of setup on this symbol before, how often did it
work and by how much — measured on old data, then re-measured on recent data the
first measurement never saw. That is a real, decision-useful number. A
confidence percentage on the next trade would not be.

---

## The desk

```bash
python -m tradingmachine serve
```

Opens a local dashboard at `http://127.0.0.1:8787` — the sit-down-and-work
surface:

- **Account bar** — equity, cash, buying power, open P&L, and whether the market
  is actually open, straight from your broker.
- **Positions** — live P&L per position, with a Close button on each row.
- **Screener** — pick a universe (`megacap`, `tech`, `etfs`, `crypto`, …), an
  interval, and a strategy; get every symbol ranked by what the strategy likes.
- **Edge** — one click backtests that exact strategy on that symbol's own
  history and grades it, out-of-sample check included.
- **Buy / Short** — opens an order ticket showing quantity, stop, target, and
  the exact dollar risk *before* anything is sent. Nothing leaves without a
  confirmation.

Safety, because this endpoint can move money: it binds to **loopback only**, and
every order request must carry a session token minted at startup and embedded in
the page. Without that token, any website open in another tab could POST an
order to your localhost while you browse.

---

## Install

Requires Python 3.11+ (for `tomllib`). Nothing else for data, backtesting, and
paper trading.

```bash
git clone <this repo> && cd f
python -m tradingmachine init
python -m unittest discover -s tests    # 170 tests
```

Optional, for live exchange orders only:

```bash
pip install ccxt
```

---

## The commands

| Command | What it does |
|---|---|
| `serve` | The desk dashboard in your browser |
| `screen` | Scan a universe and rank what the strategy likes |
| `analyze` | Historical edge for a symbol, with an out-of-sample check |
| `buy` / `sell` | Place a risk-sized order with a stop attached at the broker |
| `close` | Flatten a position |
| `account` | Brokerage balance, buying power, market status |
| `positions` | Open positions with live P&L |
| `init` | Write a commented starter `config.toml` |
| `scan` | Evaluate your configured symbols. Trades nothing. |
| `backtest` | Run the strategy over historical bars, with costs, and report metrics |
| `run` | The automated loop. Paper by default. |
| `status` | Equity, open positions, stops, journal stats |
| `journal` | Recent trades; `--export trades.csv` |
| `feeds` | List data sources; `--test AAPL` to check connectivity |
| `strategies` | List available strategies |

```bash
python -m tradingmachine screen tech --interval 1d --signals
python -m tradingmachine screen etfs,crypto --top 40
python -m tradingmachine analyze NVDA AAPL SPY --interval 1d
python -m tradingmachine buy AAPL                 # risk-sized from your account
python -m tradingmachine buy AAPL --qty 25        # your size, warns about risk
python -m tradingmachine buy TSLA --from-signal   # let the strategy pick the side
python -m tradingmachine backtest --symbols AAPL --interval 1d --limit 800 --trades 20
python -m tradingmachine journal --export trades.csv
```

### Universes

`megacap`, `stocks`, `etfs`, `equity`, `crypto`, `forex`, `futures`, `indices`,
`everything`, plus sectors: `tech`, `comms`, `financials`, `healthcare`,
`consumer`, `energy`, `industrials`, `materials`, `reits`. Combine them or mix in
tickers: `screen "tech,etfs,TSLA"`.

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

## Connecting a broker

US stocks and ETFs go through **Alpaca**. Their paper account is free, needs no
funding, and matches orders against the real tape — strictly better practice
than a local simulation, because you get their rejections, their market-hours
rules, and their fill behaviour.

1. Sign up at [alpaca.markets](https://alpaca.markets)
2. Generate **paper** API keys
3. Export them and start the desk:

```bash
export ALPACA_KEY_ID=...
export ALPACA_SECRET_KEY=...
python -m tradingmachine serve
```

That's it — screening, analysis, and paper orders all work now. Crypto goes
through ccxt instead (`execution.broker = "ccxt"`).

### Going live (read this twice)

Real money is off behind **three independent switches**, all of which must be
set. A single typo cannot arm it.

1. `account.mode = "live"` in `config.toml`
2. `execution.confirm_live = true` **and** `execution.dry_run = false`
3. Live-account API keys in the environment (paper and live keys are different)

Then every order still asks you to type `LIVE` at the prompt, and the dashboard
turns red.

With `dry_run = true`, orders are logged instead of sent — the correct way to
shake out a config before risking anything.

Order of operations that will save you money: **backtest → paper for weeks →
live with money you can lose.** Skipping straight to the end is the most
expensive shortcut in trading. Note also that US pattern-day-trader rules
restrict accounts under $25,000 to three day trades per five days; the desk
shows your day-trade count so you don't trip it by accident.

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
  broker/          Paper, Alpaca (stocks), ccxt (crypto)
  universe.py      Named baskets: sectors, ETFs, crypto, forex, futures
  screener.py      Concurrent multi-symbol scan and ranking
  analysis.py      Historical edge with an out-of-sample split
  desk.py          Plan → review → execute, shared by the CLI and the web UI
  server.py        The local dashboard and its JSON API
  backtest.py      Event-driven backtester and metrics
  engine.py        The automated loop, with crash-safe state checkpointing
  journal.py       SQLite record of signals, fills, trades, equity
  notify.py        Console, Discord, Telegram, Slack
  config.py        TOML loading with strict validation
  cli.py           The command line
tests/             170 tests
```

---

## Disclaimer

This is software for research and education. It is not financial advice. Trading
carries real risk of losing more than you put in, particularly with leverage.
Nothing here predicts the future or guarantees a profit. You are responsible for
every order this program places on your behalf — which is precisely why live
trading takes three switches and a typed confirmation to turn on.
