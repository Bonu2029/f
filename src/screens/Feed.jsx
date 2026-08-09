import { useState } from "react";
import { useStore } from "../engine/store.js";
import { getFeed, TRADER_BY_ID } from "../engine/traders.js";
import { getStats, getSeriesPoints, priceAt } from "../engine/market.js";
import { getToken, formatMc } from "../engine/tokens.js";
import { TokenAvatar, TraderAvatar, AvatarStack } from "../ui/Avatar.jsx";
import { Sparkline } from "../ui/Chart.jsx";
import { Tabs, Pct, Empty } from "../ui/Common.jsx";
import { IcEyes, IcComment, IcShare, IcTrend } from "../ui/Icons.jsx";
import { fmtUsd, fmtPrice, timeAgo } from "../engine/format.js";

function EmbedCard({ tokenId, valueUsd, pctOverride, children }) {
  const stat = getStats(tokenId);
  if (!stat) return null;
  return (
    <div className="embed">
      <div className="row gap10">
        <TokenAvatar token={stat.token} size={38} />
        <div className="grow col" style={{ gap: 3 }}>
          <div className="h3 truncate">{stat.token.symbol}</div>
          <div className="row gap6">
            <span className="mc-tag">MC</span>
            <span className="small muted mono">{formatMc(stat.mc)}</span>
          </div>
        </div>
        <div className="col" style={{ alignItems: "flex-end", gap: 3 }}>
          <div className="h3 mono">
            {valueUsd != null ? fmtUsd(valueUsd, { compact: true }) : fmtPrice(stat.price)}
          </div>
          <Pct value={pctOverride ?? stat.change24h} size={14} />
        </div>
      </div>
      {children}
    </div>
  );
}

function Reactions({ ev }) {
  const [liked, setLiked] = useState(false);
  return (
    <div className="react-row">
      <button className={"react-btn" + (liked ? " on" : "")} onClick={() => setLiked((v) => !v)}>
        <IcEyes size={19} />
        <span className="mono">{ev.reactions + (liked ? 1 : 0)}</span>
      </button>
      <button className="react-btn">
        <IcComment size={17} />
        <span className="mono">{ev.comments}</span>
      </button>
      <button className="react-btn" style={{ marginLeft: "auto" }}>
        <IcShare size={17} />
      </button>
    </div>
  );
}

function FeedItem({ ev, nav }) {
  const trader = TRADER_BY_ID[ev.traderId];
  const token = getToken(ev.tokenId);
  if (!token) return null;

  if (ev.type === "move") {
    const stat = getStats(ev.tokenId);
    return (
      <div className="feed-item row gap10">
        <span className={stat.change24h >= 0 ? "up" : "down"}>
          <IcTrend size={20} />
        </span>
        <button
          className="row gap6"
          onClick={() => nav("token", { tokenId: ev.tokenId })}
          style={{
            background: "var(--surface-2)",
            borderRadius: 20,
            padding: "5px 11px 5px 5px",
          }}
        >
          <TokenAvatar token={token} size={22} showVerified={false} />
          <span className="small" style={{ fontWeight: 700 }}>
            {token.symbol}
          </span>
          <Pct value={stat.change24h} size={13} />
        </button>
        <span className="small muted grow truncate">
          {token.verified ? "since verification" : "since graduating"}
        </span>
        <span className="small muted">{timeAgo(ev.ts)}</span>
      </div>
    );
  }

  if (ev.type === "crowd") {
    return (
      <div className="feed-item">
        <div className="row gap10">
          <AvatarStack ids={ev.crowdIds} size={24} />
          <span className="body grow truncate">
            <b>{ev.crowdCount} top traders</b> <span className="up">bought</span>
          </span>
          <span className="small muted">{timeAgo(ev.ts)}</span>
        </div>
        <button
          style={{ display: "block", width: "100%", textAlign: "left" }}
          onClick={() => nav("token", { tokenId: ev.tokenId })}
        >
          <EmbedCard tokenId={ev.tokenId} />
        </button>
        <Reactions ev={ev} />
      </div>
    );
  }

  const verb =
    ev.type === "open" ? "started a position" : ev.type === "add" ? "added to a position" : "closed a position";

  // For a closed position, show the round trip with entry/exit markers.
  const points = ev.type === "close" ? getSeriesPoints(ev.tokenId, "1W") : null;
  const markers =
    ev.type === "close"
      ? [
          { ts: ev.openedAt, side: "buy" },
          { ts: ev.ts - 6 * 60 * 60 * 1000, side: "sell" },
          { ts: ev.ts, side: "sell" },
        ]
      : [];
  const entryPrice = priceAt(ev.tokenId, ev.openedAt);
  const nowPrice = priceAt(ev.tokenId, ev.ts);
  const tradePct = entryPrice > 0 ? ((nowPrice - entryPrice) / entryPrice) * 100 : 0;

  return (
    <div className="feed-item">
      <div className="row gap10">
        <button onClick={() => nav("trader", { traderId: trader.id })}>
          <TraderAvatar trader={trader} size={34} />
        </button>
        <span className="body grow truncate">
          <b>{trader.handle}</b> <span className="muted">{verb}</span>
        </span>
        <span className="small muted">{timeAgo(ev.ts)}</span>
      </div>

      <button
        style={{ display: "block", width: "100%", textAlign: "left" }}
        onClick={() => nav("token", { tokenId: ev.tokenId })}
      >
        <EmbedCard tokenId={ev.tokenId} valueUsd={ev.usd} pctOverride={tradePct}>
          {points && (
            <div style={{ marginTop: 10 }}>
              <Sparkline points={points} width={340} height={104} markers={markers} />
            </div>
          )}
        </EmbedCard>
      </button>

      <Reactions ev={ev} />
    </div>
  );
}

export default function Feed({ nav }) {
  const state = useStore();
  const [tab, setTab] = useState("foryou");

  const events =
    tab === "foryou"
      ? getFeed({ hours: 48, limit: 50 })
      : getFeed({ hours: 96, limit: 50, following: state.following });

  return (
    <>
      <Tabs
        tabs={[
          { value: "foryou", label: "For you", flex: true },
          { value: "following", label: "Following", flex: true },
        ]}
        value={tab}
        onChange={setTab}
        style={{ paddingTop: "calc(var(--safe-top) + 8px)" }}
      />
      <div className="scroll">
        {events.length === 0 ? (
          <Empty
            icon="👥"
            title="No activity yet"
            body="Follow a few traders from the leaderboard and their moves show up here."
          />
        ) : (
          events.map((ev) => <FeedItem key={ev.id} ev={ev} nav={nav} />)
        )}
      </div>
    </>
  );
}
