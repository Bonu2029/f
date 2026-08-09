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
