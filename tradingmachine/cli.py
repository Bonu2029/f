"""Command line interface: ``python -m tradingmachine <command>``."""

from __future__ import annotations

import argparse
import json
import logging
import sys
from typing import Sequence

from .backtest import run_backtest
from .config import (
    DEFAULT_CONFIG_PATH,
    AppConfig,
    ConfigError,
    load_config,
    write_default_config,
)
from .data import DataError, available_feeds, get_candles
from .engine import TradingEngine
from .journal import Journal, fmt_ts
from .models import Side
from .risk import RiskConfig
from .strategies import REGISTRY, StrategyError, build_strategy

BANNER = r"""
   __             ___                            __    _
  / /_________ _ / _ \___ ___  ___ ____ _  ___ _/ /__ (_)__  ___
 / __/ __/ _ `// // / -_) _ \/ _ `/  ' \/ _ `/ __// / / _ \/ -_)
 \__/_/  \_,_//____/\__/_//_/\_,_/_/_/_/\_,_/\__//_/_/_//_/\__/
        multi-market signal engine — paper by default
"""


def _setup_logging(verbose: bool) -> None:
    logging.basicConfig(
        level=logging.DEBUG if verbose else logging.INFO,
        format="%(asctime)s %(levelname)-7s %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    )
    logging.getLogger("urllib3").setLevel(logging.WARNING)


def _load(path: str) -> AppConfig:
    try:
        return load_config(path)
    except ConfigError as exc:
        print(f"config error: {exc}", file=sys.stderr)
        raise SystemExit(2) from exc


# --------------------------------------------------------------------------- #
# commands
# --------------------------------------------------------------------------- #

def cmd_init(args: argparse.Namespace) -> int:
    try:
        path = write_default_config(args.config, force=args.force)
    except ConfigError as exc:
        print(f"{exc}", file=sys.stderr)
        return 1
    print(BANNER)
    print(f"wrote {path}")
    print("\nnext:")
    print(f"  python -m tradingmachine scan     --config {path}")
    print(f"  python -m tradingmachine backtest --config {path}")
    print(f"  python -m tradingmachine run      --config {path}   # paper trading")
    return 0


def cmd_scan(args: argparse.Namespace) -> int:
    cfg = _load(args.config)
    symbols = args.symbols or cfg.market.symbols
    interval = args.interval or cfg.market.interval
    try:
        strategy = build_strategy(
            {"name": args.strategy} if args.strategy else cfg.strategy
        )
    except StrategyError as exc:
        print(f"strategy error: {exc}", file=sys.stderr)
        return 2

    print(f"\n{strategy.describe()} @ {interval}\n" + "=" * 74)
    print(f"{'symbol':<14}{'price':>13}{'signal':>8}{'conv':>7}   reason")
    print("-" * 74)

    rows = 0
    for symbol in symbols:
        try:
            bars = get_candles(symbol, interval, cfg.market.history, source=cfg.market.source)
        except DataError as exc:
            print(f"{symbol:<14}{'—':>13}{'ERROR':>8}{'':>7}   {exc}")
            continue
        if len(bars) < strategy.warmup:
            print(
                f"{symbol:<14}{bars[-1].close:>13,.6g}{'—':>8}{'':>7}   "
                f"only {len(bars)} bars, need {strategy.warmup}"
            )
            continue
        sig = strategy.evaluate(bars)
        mark = {Side.LONG: "LONG", Side.SHORT: "SHORT", Side.FLAT: "flat"}[sig.side]
        print(
            f"{symbol:<14}{bars[-1].close:>13,.6g}{mark:>8}"
            f"{sig.strength:>7.0%}   {sig.reason}"
        )
        rows += 1

    print("-" * 74)
    print(f"{rows} symbol(s) evaluated. Signals only — nothing was traded.\n")
    return 0


def cmd_backtest(args: argparse.Namespace) -> int:
    cfg = _load(args.config)
    symbols = args.symbols or cfg.market.symbols
    interval = args.interval or cfg.market.interval
    try:
        strategy = build_strategy(
            {"name": args.strategy} if args.strategy else cfg.strategy
        )
    except StrategyError as exc:
        print(f"strategy error: {exc}", file=sys.stderr)
        return 2

    risk = RiskConfig(**{**cfg.risk.__dict__})
    if args.risk_per_trade:
        risk.risk_per_trade = args.risk_per_trade

    print(f"\nfetching {args.limit} bars of {interval} for {len(symbols)} symbol(s)...")
    try:
        result = run_backtest(
            strategy,
            symbols,
            interval=interval,
            limit=args.limit,
            starting_cash=args.cash or cfg.account.starting_cash,
            risk=risk,
            fee_bps=cfg.costs.fee_bps,
            slippage_bps=cfg.costs.slippage_bps,
            source=cfg.market.source,
        )
    except DataError as exc:
        print(f"data error: {exc}", file=sys.stderr)
        return 1

    print()
    print(result.report())

    if args.trades and result.portfolio.trades:
        print("\ntrades:")
        print(f"  {'symbol':<12}{'side':<7}{'entry':>12}{'exit':>12}{'pnl':>12}{'R':>8}  reason")
        for t in result.portfolio.trades[-args.trades :]:
            r = f"{t.r_multiple:+.2f}" if t.r_multiple is not None else "—"
            print(
                f"  {t.symbol:<12}{t.side.value:<7}{t.entry_price:>12,.6g}"
                f"{t.exit_price:>12,.6g}{t.pnl:>12,.2f}{r:>8}  {t.reason}"
            )

    if args.json:
        with open(args.json, "w", encoding="utf-8") as fh:
            json.dump(
                {
                    "strategy": result.strategy,
                    "symbols": result.symbols,
                    "interval": result.interval,
                    "metrics": result.metrics.as_dict(),
                    "trades": [t.as_dict() for t in result.portfolio.trades],
                    "equity_curve": result.portfolio.equity_curve,
                },
                fh,
                indent=2,
            )
        print(f"\nwrote {args.json}")

    print(
        "\nNote: past performance on historical bars is not a forecast. Costs are "
        "modelled, but real fills, gaps, and halts are not.\n"
    )
    return 0


def cmd_run(args: argparse.Namespace) -> int:
    cfg = _load(args.config)
    if args.paper:
        cfg.account.mode = "paper"

    engine = TradingEngine(cfg, state_path=args.state)
    engine.install_signal_handlers()

    if getattr(engine.broker, "is_live", False):
        print("\n*** LIVE TRADING — REAL ORDERS WILL BE PLACED ***")
        if not args.yes:
            reply = input("type LIVE to continue: ").strip()
            if reply != "LIVE":
                print("aborted.")
                return 1

    engine.run(max_cycles=args.cycles, once=args.once)
    return 0


def cmd_status(args: argparse.Namespace) -> int:
    cfg = _load(args.config)
    engine = TradingEngine(cfg, state_path=args.state)
    status = engine.status()

    print(f"\nmode        {cfg.account.mode}")
    print(f"equity      {status['equity']:,.2f}  ({status['return_pct']:+.2f}%)")
    print(f"cash        {status['cash']:,.2f}")
    print(f"realized    {status['realized_pnl']:+,.2f}   fees {status['fees_paid']:,.2f}")
    print(f"positions   {status['open_positions']}")
    if status["halted"]:
        print(f"HALTED      {status['halt_reason']}")

    for p in status["positions"]:
        print(
            f"  {p['symbol']:<12}{p['side']:<6}qty {p['qty']:<12.6g}"
            f"entry {p['entry']:<12,.6g}stop {p['stop'] or 0:<12,.6g}"
            f"unreal {p['unrealized']:+,.2f}"
        )

    stats = engine.journal.stats()
    print(
        f"\njournal     {stats['trades']} trades, net {stats['net_pnl']:+,.2f}, "
        f"{stats['win_rate_pct']:.1f}% wins, PF {stats['profit_factor']:.2f}, "
        f"avg {stats['avg_r']:+.2f}R\n"
    )
    engine.journal.close()
    return 0


def cmd_journal(args: argparse.Namespace) -> int:
    cfg = _load(args.config)
    with Journal(cfg.journal_path, mode=cfg.account.mode) as journal:
        if args.export:
            n = journal.export_csv(args.export)
            print(f"exported {n} trades to {args.export}")
            return 0

        trades = journal.recent_trades(args.limit)
        if not trades:
            print("no trades recorded yet")
            return 0
        print(f"\n{'closed':<20}{'symbol':<12}{'side':<7}{'pnl':>12}{'R':>8}  reason")
        print("-" * 78)
        for t in trades:
            r = f"{t['r_multiple']:+.2f}" if t["r_multiple"] is not None else "—"
            print(
                f"{fmt_ts(t['exit_ts']):<20}{t['symbol']:<12}{t['side']:<7}"
                f"{t['pnl']:>12,.2f}{r:>8}  {t['reason']}"
            )
        s = journal.stats()
        print(
            f"\n{s['trades']} trades | net {s['net_pnl']:+,.2f} | "
            f"{s['win_rate_pct']:.1f}% wins | PF {s['profit_factor']:.2f}\n"
        )
    return 0


def _desk(args: argparse.Namespace):
    from .desk import Desk

    return Desk(_load(args.config))


def cmd_account(args: argparse.Namespace) -> int:
    snap = _desk(args).account_snapshot()
    if not snap["connected"]:
        print(f"\nnot connected: {snap['error']}\n")
        print("Free paper-trading keys take about two minutes:")
        print("  1. sign up at https://alpaca.markets")
        print("  2. generate PAPER api keys")
        print("  3. export ALPACA_KEY_ID=...  ALPACA_SECRET_KEY=...\n")
        return 1

    tag = "LIVE — REAL MONEY" if snap["live"] else "paper"
    print(f"\nvenue        {snap['venue']}  [{tag}]")
    print(f"equity       {snap['equity']:,.2f}")
    print(f"cash         {snap['cash']:,.2f}")
    print(f"buying power {snap['buying_power']:,.2f}")
    print(f"unrealized   {snap['unrealized']:+,.2f}")
    print(f"exposure     {snap['exposure']:,.2f}")
    print(f"market       {'OPEN' if snap['market_open'] else 'closed'} — {snap['market_note']}")
    if snap["pattern_day_trader"]:
        print(f"PDT flagged  {snap['daytrade_count']} day trades counted")
    print(f"positions    {len(snap['positions'])}\n")
    return 0


def cmd_positions(args: argparse.Namespace) -> int:
    snap = _desk(args).account_snapshot()
    if not snap["connected"]:
        print(f"not connected: {snap['error']}")
        return 1
    if not snap["positions"]:
        print("\nno open positions\n")
        return 0

    print(f"\n{'symbol':<10}{'side':<7}{'qty':>10}{'entry':>12}{'last':>12}"
          f"{'value':>13}{'P&L':>12}{'P&L %':>9}")
    print("-" * 85)
    for p in snap["positions"]:
        print(
            f"{p['symbol']:<10}{p['side']:<7}{p['qty']:>10g}{p['avg_entry']:>12,.2f}"
            f"{p['price']:>12,.2f}{p['market_value']:>13,.2f}"
            f"{p['unrealized_pl']:>+12,.2f}{p['unrealized_plpc']:>+8.2f}%"
        )
    print("-" * 85)
    print(f"{'total':<10}{'':<7}{'':>10}{'':>12}{'':>12}{snap['exposure']:>13,.2f}"
          f"{snap['unrealized']:>+12,.2f}\n")
    return 0


def cmd_screen(args: argparse.Namespace) -> int:
    from .screener import screen, summarize
    from .universe import resolve, universe_names

    cfg = _load(args.config)
    if args.list:
        print("\nuniverses: " + ", ".join(universe_names()) + "\n")
        return 0

    try:
        strategy = build_strategy({"name": args.strategy} if args.strategy else cfg.strategy)
    except StrategyError as exc:
        print(f"strategy error: {exc}", file=sys.stderr)
        return 2

    symbols = resolve(args.universe)
    interval = args.interval or cfg.market.interval
    print(f"\nscanning {len(symbols)} symbols @ {interval} with {strategy.name}...")

    rows = screen(
        symbols, strategy, interval, args.limit,
        workers=args.workers, signals_only=args.signals, progress=len(symbols) > 30,
    )
    s = summarize(rows)

    print(f"\n{'symbol':<9}{'class':<12}{'last':>11}{'1d':>8}{'ATR%':>7}"
          f"{'RSI':>5}{'ADX':>5}  {'signal':<7}{'conv':>5}  reason")
    print("-" * 104)
    shown = rows[: args.top] if args.top else rows
    for c in shown:
        if c.error:
            print(f"{c.symbol:<9}{c.asset_class:<12}{'—':>11}  {c.error[:60]}")
            continue
        mark = {Side.LONG: "LONG", Side.SHORT: "SHORT", Side.FLAT: "flat"}[c.side]
        print(
            f"{c.symbol:<9}{c.asset_class:<12}{c.price:>11,.2f}{c.change_pct:>+7.2f}%"
            f"{c.atr_pct:>6.1f}%{(c.rsi or 0):>5.0f}{(c.adx or 0):>5.0f}  "
            f"{mark:<7}{c.strength:>5.0%}  {c.reason[:38]}"
        )
    print("-" * 104)
    print(f"{s['scanned']} scanned · {s['long']} long · {s['short']} short · "
          f"{s['flat']} flat · {s['errors']} errors")
    print("Signals only — nothing was traded. Check an idea with "
          "`analyze <SYMBOL>` before you act on it.\n")
    return 0


def cmd_analyze(args: argparse.Namespace) -> int:
    from .analysis import edge_report

    cfg = _load(args.config)
    try:
        strategy = build_strategy({"name": args.strategy} if args.strategy else cfg.strategy)
    except StrategyError as exc:
        print(f"strategy error: {exc}", file=sys.stderr)
        return 2

    interval = args.interval or cfg.market.interval
    for symbol in args.symbols:
        try:
            rep = edge_report(
                symbol.upper(), strategy, interval, args.limit,
                risk=cfg.risk, cash=cfg.account.starting_cash,
                fee_bps=cfg.costs.fee_bps, slippage_bps=cfg.costs.slippage_bps,
            )
        except DataError as exc:
            print(f"\n{symbol}: data error — {exc}\n")
            continue
        print()
        print(rep.report())
    print()
    return 0


def _trade(args: argparse.Namespace, side: Side) -> int:
    from .desk import DeskError

    desk = _desk(args)
    try:
        plan = (
            desk.plan_from_signal(args.symbol)
            if args.from_signal
            else desk.plan(args.symbol, side, qty=args.qty)
        )
    except DeskError as exc:
        print(f"\ncannot plan this trade: {exc}\n", file=sys.stderr)
        return 1

    live = desk.is_live
    print(f"\n{'*** LIVE — REAL MONEY ***' if live else 'PAPER ORDER'}")
    print(plan.describe())

    if not args.yes:
        want = "LIVE" if live else "yes"
        reply = input(f"\ntype {want} to send: ").strip()
        if reply != want:
            print("cancelled — nothing was sent.")
            return 1

    try:
        result = desk.execute(plan, bracket=not args.no_bracket)
    except DeskError as exc:
        print(f"\norder failed: {exc}\n", file=sys.stderr)
        return 1

    print(f"\nfilled {result['qty']:g} {result['symbol']} @ {result['price']:,.2f}")
    print(f"  stop {result['stop']:,.2f}"
          + (f"  target {result['target']:,.2f}" if result["target"] else ""))
    print(f"  {result['note']}\n")
    return 0


def cmd_buy(args: argparse.Namespace) -> int:
    return _trade(args, Side.LONG)


def cmd_sell(args: argparse.Namespace) -> int:
    return _trade(args, Side.SHORT)


def cmd_close(args: argparse.Namespace) -> int:
    from .desk import DeskError

    desk = _desk(args)
    if not args.yes:
        reply = input(f"close the entire {args.symbol.upper()} position? [yes/no] ").strip()
        if reply != "yes":
            print("cancelled.")
            return 1
    try:
        desk.close(args.symbol)
    except DeskError as exc:
        print(f"close failed: {exc}", file=sys.stderr)
        return 1
    print(f"closed {args.symbol.upper()}")
    return 0


def cmd_serve(args: argparse.Namespace) -> int:
    from .server import serve

    cfg = _load(args.config)
    serve(cfg, host=args.host, port=args.port, open_browser=not args.no_browser)
    return 0


def cmd_feeds(args: argparse.Namespace) -> int:
    print("\nregistered feeds:")
    for name, feed in available_feeds().items():
        print(f"  {name:<10} intervals: {', '.join(sorted(feed.supported_intervals))}")
    print("\nsymbol conventions:")
    print("  stocks/ETFs  AAPL, SPY        (yahoo)")
    print("  forex        EURUSD=X         (yahoo)")
    print("  futures      ES=F, CL=F, GC=F (yahoo)")
    print("  indices      ^GSPC, ^VIX      (yahoo)")
    print("  crypto       BTC-USD          (coinbase/yahoo)")
    print("  crypto       BTCUSDT          (binance)")

    if args.test:
        print(f"\ntesting {args.test}...")
        try:
            bars = get_candles(args.test, args.interval or "1h", 5)
            print(f"  ok — {len(bars)} bars, last close {bars[-1].close:,.6g}")
        except DataError as exc:
            print(f"  failed: {exc}")
            return 1
    print()
    return 0


def cmd_strategies(_args: argparse.Namespace) -> int:
    print("\navailable strategies:")
    for name, cls in sorted(REGISTRY.items()):
        # Fall back to the module docstring: these classes document themselves
        # at module level, where the reasoning behind the filters lives.
        doc = (cls.__doc__ or sys.modules[cls.__module__].__doc__ or "").strip()
        summary = doc.splitlines()[0] if doc else "(no description)"
        print(f"  {name:<12}{summary}")
    print(f"  {'ensemble':<12}Weighted vote across several strategies.")
    print()
    return 0


# --------------------------------------------------------------------------- #
# parser
# --------------------------------------------------------------------------- #

def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="tradingmachine",
        description="Multi-market signal and execution engine. Paper by default.",
    )
    p.add_argument("--config", default=DEFAULT_CONFIG_PATH, help="path to config.toml")
    p.add_argument("-v", "--verbose", action="store_true")
    sub = p.add_subparsers(dest="command", required=True)

    sp = sub.add_parser("init", help="write a starter config.toml")
    sp.add_argument("--force", action="store_true", help="overwrite an existing file")
    sp.set_defaults(func=cmd_init)

    sp = sub.add_parser("scan", help="evaluate current signals, trade nothing")
    sp.add_argument("--symbols", nargs="+")
    sp.add_argument("--interval")
    sp.add_argument("--strategy")
    sp.set_defaults(func=cmd_scan)

    sp = sub.add_parser("backtest", help="run the strategy over historical bars")
    sp.add_argument("--symbols", nargs="+")
    sp.add_argument("--interval")
    sp.add_argument("--strategy")
    sp.add_argument("--limit", type=int, default=1000, help="bars per symbol")
    sp.add_argument("--cash", type=float)
    sp.add_argument("--risk-per-trade", type=float, dest="risk_per_trade")
    sp.add_argument("--trades", type=int, default=0, help="print the last N trades")
    sp.add_argument("--json", help="write full results to this JSON file")
    sp.set_defaults(func=cmd_backtest)

    sp = sub.add_parser("run", help="run the live loop (paper unless configured live)")
    sp.add_argument("--once", action="store_true", help="single cycle then exit")
    sp.add_argument("--cycles", type=int, help="stop after N cycles")
    sp.add_argument("--paper", action="store_true", help="force paper mode")
    sp.add_argument("--yes", action="store_true", help="skip the live confirmation")
    sp.add_argument("--state", default="state.json")
    sp.set_defaults(func=cmd_run)

    sp = sub.add_parser("status", help="show account, positions, and journal stats")
    sp.add_argument("--state", default="state.json")
    sp.set_defaults(func=cmd_status)

    sp = sub.add_parser("journal", help="inspect or export the trade journal")
    sp.add_argument("--limit", type=int, default=20)
    sp.add_argument("--export", help="write trades to this CSV path")
    sp.set_defaults(func=cmd_journal)

    # ---- desk: screening, analysis, and real orders ---------------------- #
    sp = sub.add_parser("screen", help="scan a universe and rank what the strategy likes")
    sp.add_argument("universe", nargs="?", default="megacap",
                    help="basket name (megacap, tech, etfs, crypto...) or tickers")
    sp.add_argument("--interval")
    sp.add_argument("--strategy")
    sp.add_argument("--limit", type=int, default=400, help="bars per symbol")
    sp.add_argument("--top", type=int, default=25, help="rows to print (0 = all)")
    sp.add_argument("--signals", action="store_true", help="hide symbols with no signal")
    sp.add_argument("--workers", type=int, default=8)
    sp.add_argument("--list", action="store_true", help="list universe names and exit")
    sp.set_defaults(func=cmd_screen)

    sp = sub.add_parser("analyze", help="historical edge for a symbol, with an out-of-sample check")
    sp.add_argument("symbols", nargs="+")
    sp.add_argument("--interval")
    sp.add_argument("--strategy")
    sp.add_argument("--limit", type=int, default=750)
    sp.set_defaults(func=cmd_analyze)

    sp = sub.add_parser("account", help="brokerage balance and market status")
    sp.set_defaults(func=cmd_account)

    sp = sub.add_parser("positions", help="open positions at the broker with live P&L")
    sp.set_defaults(func=cmd_positions)

    for name, fn, helptext in (
        ("buy", cmd_buy, "buy a symbol, risk-sized, with a stop attached"),
        ("sell", cmd_sell, "short a symbol, risk-sized, with a stop attached"),
    ):
        sp = sub.add_parser(name, help=helptext)
        sp.add_argument("symbol")
        sp.add_argument("--qty", type=float, help="override the risk-based size")
        sp.add_argument("--from-signal", action="store_true", dest="from_signal",
                        help="let the strategy choose the side")
        sp.add_argument("--no-bracket", action="store_true",
                        help="skip the broker-side stop (not recommended)")
        sp.add_argument("--yes", action="store_true", help="skip the confirmation")
        sp.set_defaults(func=fn)

    sp = sub.add_parser("close", help="flatten a position at the broker")
    sp.add_argument("symbol")
    sp.add_argument("--yes", action="store_true")
    sp.set_defaults(func=cmd_close)

    sp = sub.add_parser("serve", help="run the desk dashboard in your browser")
    sp.add_argument("--host", default="127.0.0.1")
    sp.add_argument("--port", type=int, default=8787)
    sp.add_argument("--no-browser", action="store_true")
    sp.set_defaults(func=cmd_serve)

    sp = sub.add_parser("feeds", help="list data feeds and test a symbol")
    sp.add_argument("--test", help="symbol to fetch as a connectivity check")
    sp.add_argument("--interval")
    sp.set_defaults(func=cmd_feeds)

    sp = sub.add_parser("strategies", help="list available strategies")
    sp.set_defaults(func=cmd_strategies)
    return p


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    _setup_logging(args.verbose)
    try:
        return int(args.func(args))
    except KeyboardInterrupt:
        print("\ninterrupted")
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
