"""SQLite trade journal — every signal, fill, trade, and equity mark.

A bot you cannot audit after the fact is a bot you cannot debug or improve.
This is the record: append-only, local, and independent of any broker's UI.
"""

from __future__ import annotations

import json
import os
import sqlite3
import threading
from datetime import datetime, timezone
from typing import Any, Iterable

from .models import Fill, Signal, Trade

_SCHEMA = """
CREATE TABLE IF NOT EXISTS trades (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol       TEXT    NOT NULL,
    side         TEXT    NOT NULL,
    qty          REAL    NOT NULL,
    entry_price  REAL    NOT NULL,
    exit_price   REAL    NOT NULL,
    entry_ts     INTEGER NOT NULL,
    exit_ts      INTEGER NOT NULL,
    pnl          REAL    NOT NULL,
    fees         REAL    NOT NULL,
    r_multiple   REAL,
    reason       TEXT,
    strategy     TEXT,
    mode         TEXT    NOT NULL DEFAULT 'paper'
);
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
CREATE INDEX IF NOT EXISTS idx_trades_exit   ON trades(exit_ts);

CREATE TABLE IF NOT EXISTS signals (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    ts        INTEGER NOT NULL,
    symbol    TEXT    NOT NULL,
    side      TEXT    NOT NULL,
    strength  REAL    NOT NULL,
    reason    TEXT,
    strategy  TEXT,
    acted     INTEGER NOT NULL DEFAULT 0,
    meta      TEXT
);
CREATE INDEX IF NOT EXISTS idx_signals_ts ON signals(ts);

CREATE TABLE IF NOT EXISTS fills (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    ts      INTEGER NOT NULL,
    symbol  TEXT    NOT NULL,
    side    TEXT    NOT NULL,
    qty     REAL    NOT NULL,
    price   REAL    NOT NULL,
    fee     REAL    NOT NULL,
    tag     TEXT,
    mode    TEXT    NOT NULL DEFAULT 'paper'
);

CREATE TABLE IF NOT EXISTS equity (
    ts     INTEGER PRIMARY KEY,
    equity REAL NOT NULL,
    cash   REAL NOT NULL,
    open_positions INTEGER NOT NULL DEFAULT 0
);
"""


class Journal:
    def __init__(self, path: str = "journal.db", mode: str = "paper") -> None:
        self.path = path
        self.mode = mode
        parent = os.path.dirname(os.path.abspath(path))
        os.makedirs(parent, exist_ok=True)
        # check_same_thread=False + an explicit lock: the engine writes from its
        # own loop while the CLI may read concurrently.
        self._conn = sqlite3.connect(path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._lock = threading.Lock()
        with self._lock:
            self._conn.executescript(_SCHEMA)
            self._conn.commit()

    def close(self) -> None:
        with self._lock:
            self._conn.close()

    def __enter__(self) -> "Journal":
        return self

    def __exit__(self, *exc: object) -> None:
        self.close()

    # -- writes -------------------------------------------------------------- #

    def _write(self, sql: str, params: tuple) -> None:
        with self._lock:
            self._conn.execute(sql, params)
            self._conn.commit()

    def record_trade(self, trade: Trade) -> None:
        self._write(
            """INSERT INTO trades (symbol, side, qty, entry_price, exit_price,
                                   entry_ts, exit_ts, pnl, fees, r_multiple,
                                   reason, strategy, mode)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                trade.symbol, trade.side.value, trade.qty, trade.entry_price,
                trade.exit_price, trade.entry_ts, trade.exit_ts, trade.pnl,
                trade.fees, trade.r_multiple, trade.reason, trade.strategy, self.mode,
            ),
        )

    def record_signal(
        self, ts: int, symbol: str, signal: Signal, strategy: str, acted: bool
    ) -> None:
        self._write(
            """INSERT INTO signals (ts, symbol, side, strength, reason, strategy,
                                    acted, meta)
               VALUES (?,?,?,?,?,?,?,?)""",
            (
                ts, symbol, signal.side.value, signal.strength, signal.reason,
                strategy, int(acted), json.dumps(signal.meta, default=str),
            ),
        )

    def record_fill(self, fill: Fill) -> None:
        self._write(
            "INSERT INTO fills (ts, symbol, side, qty, price, fee, tag, mode)"
            " VALUES (?,?,?,?,?,?,?,?)",
            (
                fill.ts, fill.symbol, fill.side.value, fill.qty, fill.price,
                fill.fee, fill.tag, self.mode,
            ),
        )

    def record_equity(
        self, ts: int, equity: float, cash: float, open_positions: int = 0
    ) -> None:
        self._write(
            "INSERT OR REPLACE INTO equity (ts, equity, cash, open_positions)"
            " VALUES (?,?,?,?)",
            (ts, equity, cash, open_positions),
        )

    # -- reads --------------------------------------------------------------- #

    def _query(self, sql: str, params: tuple = ()) -> list[sqlite3.Row]:
        with self._lock:
            return self._conn.execute(sql, params).fetchall()

    def recent_trades(self, limit: int = 20) -> list[dict[str, Any]]:
        rows = self._query(
            "SELECT * FROM trades ORDER BY exit_ts DESC LIMIT ?", (limit,)
        )
        return [dict(r) for r in rows]

    def recent_signals(self, limit: int = 20) -> list[dict[str, Any]]:
        rows = self._query("SELECT * FROM signals ORDER BY ts DESC LIMIT ?", (limit,))
        return [dict(r) for r in rows]

    def equity_curve(self, limit: int = 1000) -> list[tuple[int, float]]:
        rows = self._query(
            "SELECT ts, equity FROM (SELECT ts, equity FROM equity"
            " ORDER BY ts DESC LIMIT ?) ORDER BY ts ASC",
            (limit,),
        )
        return [(r["ts"], r["equity"]) for r in rows]

    def stats(self) -> dict[str, Any]:
        row = self._query(
            """SELECT COUNT(*)                                AS n,
                      COALESCE(SUM(pnl), 0)                   AS pnl,
                      COALESCE(SUM(fees), 0)                  AS fees,
                      COALESCE(SUM(pnl > 0), 0)               AS wins,
                      COALESCE(AVG(r_multiple), 0)            AS avg_r,
                      COALESCE(SUM(CASE WHEN pnl > 0 THEN pnl ELSE 0 END), 0)   AS gross_win,
                      COALESCE(-SUM(CASE WHEN pnl <= 0 THEN pnl ELSE 0 END), 0) AS gross_loss
               FROM trades WHERE mode = ?""",
            (self.mode,),
        )[0]
        n = row["n"] or 0
        gross_loss = row["gross_loss"] or 0.0
        return {
            "trades": n,
            "net_pnl": row["pnl"],
            "fees": row["fees"],
            "win_rate_pct": (row["wins"] / n * 100.0) if n else 0.0,
            "avg_r": row["avg_r"],
            "profit_factor": (row["gross_win"] / gross_loss) if gross_loss else 0.0,
        }

    def export_csv(self, path: str) -> int:
        """Dump the trade table to CSV. Returns the number of rows written."""
        import csv

        rows = self._query("SELECT * FROM trades ORDER BY exit_ts ASC")
        if not rows:
            return 0
        with open(path, "w", newline="", encoding="utf-8") as fh:
            writer = csv.DictWriter(fh, fieldnames=rows[0].keys())
            writer.writeheader()
            for r in rows:
                writer.writerow(dict(r))
        return len(rows)


def fmt_ts(ts: int) -> str:
    return datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%d %H:%M UTC")


def backfill(journal: Journal, trades: Iterable[Trade]) -> int:
    """Load backtest trades into a journal, e.g. to compare against live results."""
    count = 0
    for trade in trades:
        journal.record_trade(trade)
        count += 1
    return count
