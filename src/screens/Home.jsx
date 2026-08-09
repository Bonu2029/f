import { useState } from "react";
import { useStore, portfolio, portfolioChange24h } from "../engine/store.js";
import { getAllStats, getMemes, getTrending, isReady, marketStatus } from "../engine/market.js";
import { getTopTrades } from "../engine/traders.js";
import { TokenAvatar, TraderAvatar } from "../ui/Avatar.jsx";
import { TokenRow, Tabs, Empty, Pct } from "../ui/Common.jsx";
import { IcLogo, IcBell, IcStar, IcDots, IcSearch } from "../ui/Icons.jsx";
import { fmtUsd } from "../engine/format.js";
import { getToken } from "../engine/tokens.js";

const TABS = [
  { value: "watch", icon: <IcStar size={18} /> },
  { value: "verified", label: "Verified" },
  { value: "trending", label: "Trending" },
  { value: "memes", label: "Memes" },
];

export default function Home({ nav, tick }) {
  const state = useStore();
  const [tab, setTab] = useState("verified");

  const pf = portfolio(state);
  const ch = portfolioChange24h(state);
  const unread = state.notifications.filter((n) => !n.read).length;
  const stats = getAllStats();
  const topTrades = getTopTrades(6);
  const ready = isReady();
  const offline = marketStatus().state === "offline";

  let list = stats;
  if (tab === "watch") list = stats.filter((s) => state.watchlist.includes(s.id));
  else if (tab === "verified") list = stats.filter((s) => s.verified);
  else if (tab === "memes") list = getMemes();
  else if (tab === "trending") list = getTrending();

  return (
    <>
      <div className="appbar">
        <div className="logo">
          <IcLogo size={26} />
        </div>
        <div className="row gap8">
          <button className="bell" onClick={() => nav("search")} aria-label="Search">
            <IcSearch size={19} />
          </button>
          <button className="bell" onClick={() => nav("notifications")} aria-label="Notifications">
            <IcBell size={19} />
            {unread > 0 && <span className="bell-dot">{unread > 9 ? "9+" : unread}</span>}
          </button>
        </div>
      </div>

      <div className="scroll">
        {/* Portfolio header */}
        <div className="row between pad" style={{ alignItems: "flex-end", marginTop: 6 }}>
          <div className="col" style={{ gap: 2 }}>
            <div className="small muted">Portfolio</div>
            <div className="h1 mono">
              {state.settings.hideBalance ? "••••••" : fmtUsd(pf.total)}
            </div>
            {!state.settings.hideBalance && (
              <div className="row gap6" style={{ marginTop: 2 }}>
                <Pct value={ch.pct} size={13} />
                <span className="small muted mono">
                  {fmtUsd(ch.diff, { sign: true })} today
                </span>
              </div>
            )}
          </div>
          <button className="deposit-btn" onClick={() => nav("deposit")}>
            Deposit
          </button>
        </div>

        {/* Top trades strip */}
        <div className="row between pad" style={{ marginTop: 22, marginBottom: 10 }}>
          <div className="row gap6">
            <span style={{ fontSize: 15 }}>🏆</span>
            <span className="h3">Top trades</span>
          </div>
          <button className="muted" onClick={() => nav("leaderboard")} aria-label="All top trades">
            <IcDots size={20} />
          </button>
        </div>

        <div className="strip">
          {topTrades.map((t) => {
            const token = getToken(t.tokenId);
            return (
              <button
                key={t.trader.id}
                className="trade-card"
                onClick={() => nav("trader", { traderId: t.trader.id })}
              >
                <div className="trade-card-top">
                  <TraderAvatar trader={t.trader} size={22} />
                  <span className="small truncate" style={{ fontWeight: 600 }}>
                    {t.trader.handle}
                  </span>
                </div>
                <div className="trade-card-bot">
                  {token && <TokenAvatar token={token} size={26} showVerified={false} />}
                  <span
                    className={"mono " + (t.pnl >= 0 ? "up" : "down")}
                    style={{ fontSize: 15, fontWeight: 700 }}
                  >
                    {fmtUsd(t.pnl, { compact: true, sign: true })}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Token list */}
        <Tabs tabs={TABS} value={tab} onChange={setTab} style={{ marginTop: 18 }} />

        {list.length === 0 ? (
          <Empty
            icon={ready ? "⭐" : "📡"}
            title={ready ? "Nothing here yet" : "Loading live market"}
            body={
              ready
                ? "Tap the star on any coin to keep an eye on it."
                : "Fetching prices from CoinGecko…"
            }
          />
        ) : (
          <div style={{ paddingTop: 4 }}>
            {list.map((s) => (
              <TokenRow key={s.id} stat={s} onClick={() => nav("token", { tokenId: s.id })} />
            ))}
          </div>
        )}

        <div className="row gap6 pad" style={{ justifyContent: "center", padding: "22px 16px 8px" }}>
          <span
            className="pulse-dot"
            style={{ background: offline ? "var(--down)" : "var(--up)" }}
          />
          <span className="tiny muted">
            {offline
              ? "Offline — showing last prices received"
              : "Live prices from CoinGecko · refreshed every minute"}
          </span>
        </div>
      </div>
    </>
  );
}
