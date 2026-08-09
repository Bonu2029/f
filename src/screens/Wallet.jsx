import { useState } from "react";
import { useStore, portfolio, portfolioChange24h } from "../engine/store.js";
import { getStats } from "../engine/market.js";
import { TokenAvatar } from "../ui/Avatar.jsx";
import { Pct, Tabs, Empty } from "../ui/Common.jsx";
import { IcArrowUp, IcArrowDown, IcExternal, IcGear } from "../ui/Icons.jsx";
import { fmtUsd, fmtPrice, fmtQty, timeAgo, shortSig } from "../engine/format.js";
import { getToken } from "../engine/tokens.js";

function PositionRow({ row, onClick }) {
  return (
    <button className="trow" onClick={onClick}>
      <TokenAvatar token={row.token} />
      <div className="grow col" style={{ gap: 4 }}>
        <div className="h3 truncate">{row.token.symbol}</div>
        <div className="small muted mono">
          {fmtQty(row.qty)} · avg {fmtPrice(row.avgPrice)}
        </div>
      </div>
      <div className="col" style={{ alignItems: "flex-end", gap: 4 }}>
        <div className="h3 mono">{fmtUsd(row.value)}</div>
        <div className="row gap6">
          <span className={"tiny mono " + (row.pnl >= 0 ? "up" : "down")}>
            {fmtUsd(row.pnl, { sign: true, compact: Math.abs(row.pnl) > 10000 })}
          </span>
          <Pct value={row.pnlPct} size={12} />
        </div>
      </div>
    </button>
  );
}

function HistoryList({ state }) {
  const items = [
    ...state.trades.map((t) => ({ ...t, kind: "trade" })),
    ...state.transfers.map((t) => ({ ...t, kind: "transfer" })),
  ].sort((a, b) => b.ts - a.ts);

  if (!items.length) return <Empty icon="🧾" title="No transactions yet" />;

  return items.map((it) => {
    const token = it.tokenId ? getToken(it.tokenId) : null;
    const isIn = it.kind === "transfer" ? it.type === "deposit" : it.side === "buy";
    const label =
      it.kind === "transfer"
        ? it.type === "deposit"
          ? "Deposit"
          : "Withdraw"
        : `${it.side === "buy" ? "Bought" : "Sold"} ${token?.symbol || ""}`;
    return (
      <div className="trow" key={it.id}>
        {token ? (
          <TokenAvatar token={token} size={38} />
        ) : (
          <div
            className="tavatar"
            style={{
              width: 38,
              height: 38,
              background: isIn ? "rgba(35,197,94,.16)" : "rgba(244,80,60,.16)",
              color: isIn ? "var(--up)" : "var(--down)",
            }}
          >
            {isIn ? <IcArrowDown size={18} /> : <IcArrowUp size={18} />}
          </div>
        )}
        <div className="grow col" style={{ gap: 3 }}>
          <div className="body" style={{ fontWeight: 600 }}>
            {label}
          </div>
          <div className="small muted mono">
            {timeAgo(it.ts)} · {shortSig(it.sig)}
          </div>
        </div>
        <div className="col" style={{ alignItems: "flex-end", gap: 3 }}>
          <div className="body mono" style={{ fontWeight: 700 }}>
            {isIn ? "+" : "−"}
            {fmtUsd(it.usd).replace("$", "$")}
          </div>
          {it.realized != null && (
            <span className={"tiny mono " + (it.realized >= 0 ? "up" : "down")}>
              {fmtUsd(it.realized, { sign: true })} realised
            </span>
          )}
        </div>
      </div>
    );
  });
}

export default function Wallet({ nav }) {
  const state = useStore();
  const [tab, setTab] = useState("holdings");
  const pf = portfolio(state);
  const ch = portfolioChange24h(state);

  return (
    <>
      <div className="appbar">
        <span className="h2">Wallet</span>
        <button className="bell" onClick={() => nav("settings")} aria-label="Settings">
          <IcGear size={19} />
        </button>
      </div>

      <div className="scroll">
        <div className="col pad" style={{ gap: 6, marginTop: 4 }}>
          <span className="small muted">Total value</span>
          <span className="h1 mono">
            {state.settings.hideBalance ? "••••••" : fmtUsd(pf.total)}
          </span>
          <div className="row gap8">
            <Pct value={ch.pct} size={14} />
            <span className="small muted mono">{fmtUsd(ch.diff, { sign: true })} today</span>
          </div>
        </div>

        <div className="row gap10 pad" style={{ marginTop: 18 }}>
          <button className="btn btn-primary grow" onClick={() => nav("deposit")}>
            <IcArrowDown size={18} /> Deposit
          </button>
          <button className="btn btn-ghost grow" onClick={() => nav("withdraw")}>
            <IcArrowUp size={18} /> Withdraw
          </button>
        </div>

        <div className="row gap10 pad" style={{ marginTop: 12 }}>
          <div className="card grow">
            <div className="small muted">Cash</div>
            <div className="h3 mono" style={{ marginTop: 4 }}>
              {fmtUsd(pf.cash)}
            </div>
          </div>
          <div className="card grow">
            <div className="small muted">Unrealised P&L</div>
            <div
              className={"h3 mono " + (pf.pnl >= 0 ? "up" : "down")}
              style={{ marginTop: 4 }}
            >
              {fmtUsd(pf.pnl, { sign: true })}
            </div>
          </div>
        </div>

        <Tabs
          tabs={[
            { value: "holdings", label: `Holdings (${pf.rows.length})`, flex: true },
            { value: "history", label: "History", flex: true },
          ]}
          value={tab}
          onChange={setTab}
          style={{ marginTop: 18 }}
        />

        {tab === "holdings" ? (
          pf.rows.length === 0 ? (
            <Empty
              icon="💸"
              title="No positions"
              body="Buy something from the home screen and it shows up here."
            />
          ) : (
            <div style={{ paddingTop: 4 }}>
              {pf.rows.map((row) => (
                <PositionRow
                  key={row.tokenId}
                  row={row}
                  onClick={() => nav("token", { tokenId: row.tokenId })}
                />
              ))}
              <div className="pad" style={{ paddingTop: 16 }}>
                <div className="card-2 row between">
                  <span className="small muted">Realised P&L (all time)</span>
                  <span className={"body mono " + (pf.realized >= 0 ? "up" : "down")}>
                    {fmtUsd(pf.realized, { sign: true })}
                  </span>
                </div>
              </div>
            </div>
          )
        ) : (
          <div style={{ paddingTop: 4 }}>
            <HistoryList state={state} />
          </div>
        )}

        <div className="empty tiny" style={{ padding: "18px 32px 0" }}>
          Paper trading against live prices. Positions and history are stored on this
          device only — no exchange account, no wallet, no real funds.
        </div>
      </div>
    </>
  );
}

export { IcExternal, getStats };
