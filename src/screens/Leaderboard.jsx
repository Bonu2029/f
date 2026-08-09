import { useState } from "react";
import { useStore } from "../engine/store.js";
import { getLeaderboard, getFriends } from "../engine/traders.js";
import { getPrice, priceAt } from "../engine/market.js";
import { getToken } from "../engine/tokens.js";
import { TraderAvatar, TokenAvatar, ProfileAvatar } from "../ui/Avatar.jsx";
import { Tabs, Segmented } from "../ui/Common.jsx";
import { IcShare, IcCheck, IcPlus } from "../ui/Icons.jsx";
import { fmtUsd, fmtPct, fmtCompact } from "../engine/format.js";
import { actions } from "../engine/store.js";

const WINDOW_MS = { "24h": 864e5, "7d": 6048e5, "30d": 2592e6 };
const MEDALS = ["🥇", "🥈", "🥉"];

/** Your own P&L over the window, computed exactly like the traders'. */
function myPnl(state, window) {
  const since = Date.now() - (WINDOW_MS[window] || WINDOW_MS["24h"]);
  let pnl = 0;
  let value = 0;
  for (const [tokenId, pos] of Object.entries(state.positions)) {
    if (!pos || pos.qty <= 0) continue;
    const cur = getPrice(tokenId);
    value += pos.qty * cur;
    const from = Math.max(since, pos.openedAt);
    pnl += pos.qty * (cur - priceAt(tokenId, from));
  }
  return { pnl, value, pct: value - pnl > 0 ? (pnl / (value - pnl)) * 100 : 0 };
}

function Row({ rank, name, handle, avatar, pnl, pct, mode, tokens, onClick, right }) {
  const val = mode === "$" ? fmtUsd(pnl, { compact: true, sign: true }) : fmtPct(pct);
  // A div rather than a button: the follow control nests inside this row, and
  // a button inside a button is invalid markup.
  return (
    <div
      className="trow"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick?.()}
      style={{ cursor: "pointer" }}
    >
      <span className="rank-badge" style={{ fontSize: rank <= 3 ? 17 : 14 }}>
        {rank <= 3 ? MEDALS[rank - 1] : `${rank}.`}
      </span>
      {avatar}
      <div className="grow col" style={{ gap: 2 }}>
        <div className="h3 truncate">{name}</div>
        <div className="small muted truncate">@{handle}</div>
      </div>
      <div className="col" style={{ alignItems: "flex-end", gap: 5 }}>
        <span
          className={"mono " + (pnl >= 0 ? "up" : "down")}
          style={{ fontSize: 16, fontWeight: 700 }}
        >
          {pnl >= 0 && mode === "%" ? "+" : ""}
          {val}
        </span>
        <div className="row gap4">
          {tokens?.slice(0, 3).map((id) => {
            const t = getToken(id);
            return t ? <TokenAvatar key={id} token={t} size={17} showVerified={false} /> : null;
          })}
          {right}
        </div>
      </div>
    </div>
  );
}

export default function Leaderboard({ nav }) {
  const state = useStore();
  const [tab, setTab] = useState("leaderboard");
  const [window, setWindow] = useState("24h");
  const [mode, setMode] = useState("$");

  const board = getLeaderboard(window);
  const mine = myPnl(state, window);

  // Where you sit among the demo traders.
  const rank = board.filter((r) => r.pnl > mine.pnl).length + 1;

  const friendIds = new Set(getFriends().map((t) => t.id));
  const rows = tab === "friends" ? board.filter((r) => friendIds.has(r.trader.id)) : board;

  return (
    <>
      <Tabs
        tabs={[
          { value: "friends", label: `Friends (${friendIds.size})`, flex: true },
          { value: "leaderboard", label: "Leaderboard", flex: true },
        ]}
        value={tab}
        onChange={setTab}
        style={{ paddingTop: "calc(var(--safe-top) + 8px)" }}
      />

      <div className="scroll">
        <div className="you-card">
          <ProfileAvatar profile={state.profile} size={44} />
          <div className="grow col" style={{ gap: 5 }}>
            <div className="small muted">Your rank</div>
            <span className="rank-pill">#{rank}</span>
          </div>
          <span
            className={"mono " + (mine.pnl >= 0 ? "up" : "down")}
            style={{ fontSize: 19, fontWeight: 800 }}
          >
            {fmtUsd(mine.pnl, { compact: true, sign: true })}
          </span>
          <button className="muted" onClick={() => nav("profile")} aria-label="Share rank">
            <IcShare size={19} />
          </button>
        </div>

        <div className="row between pad" style={{ marginTop: 8, marginBottom: 4 }}>
          <span className="h3">{tab === "friends" ? "Friends" : "Top traders"}</span>
          <div className="row gap8">
            <Segmented
              options={[
                { value: "24h", label: "24h" },
                { value: "7d", label: "7d" },
                { value: "30d", label: "30d" },
              ]}
              value={window}
              onChange={setWindow}
            />
            <Segmented
              options={[
                { value: "%", label: "%" },
                { value: "$", label: "$" },
              ]}
              value={mode}
              onChange={setMode}
            />
          </div>
        </div>

        {rows.map((r, i) => {
          const following = state.following.includes(r.trader.id);
          return (
            <Row
              key={r.trader.id}
              rank={tab === "friends" ? i + 1 : board.indexOf(r) + 1}
              name={r.trader.name}
              handle={r.trader.handle}
              avatar={<TraderAvatar trader={r.trader} size={40} />}
              pnl={r.pnl}
              pct={r.pct}
              mode={mode}
              tokens={r.topTokens}
              onClick={() => nav("trader", { traderId: r.trader.id })}
              right={
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    actions.toggleFollow(r.trader.id);
                  }}
                  className="stack-more"
                  style={{
                    background: following ? "var(--indigo-dim)" : "var(--surface-3)",
                    color: following ? "var(--indigo-2)" : "var(--muted)",
                    marginLeft: 4,
                  }}
                >
                  {following ? <IcCheck size={11} /> : <IcPlus size={11} />}
                </button>
              }
            />
          );
        })}

        <div className="empty tiny" style={{ padding: "20px 32px 8px" }}>
          Every trader here is fictional and generated on your device — this build has
          no other users.
        </div>
      </div>
    </>
  );
}

export { fmtCompact };
