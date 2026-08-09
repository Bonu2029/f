import { useStore, actions } from "../engine/store.js";
import { TRADER_BY_ID, traderPnl, getFeed } from "../engine/traders.js";
import { getPrice, priceAt } from "../engine/market.js";
import { getToken } from "../engine/tokens.js";
import { TraderAvatar, TokenAvatar } from "../ui/Avatar.jsx";
import { Pct, Empty } from "../ui/Common.jsx";
import { IcBack } from "../ui/Icons.jsx";
import { fmtUsd, fmtCompact, timeAgo, since } from "../engine/format.js";

export default function TraderProfile({ traderId, nav, back }) {
  const state = useStore();
  const trader = TRADER_BY_ID[traderId];
  if (!trader) return null;

  const day = traderPnl(trader, "24h");
  const week = traderPnl(trader, "7d");
  const following = state.following.includes(traderId);
  const events = getFeed({ hours: 240, limit: 14 }).filter((e) => e.traderId === traderId);

  return (
    <>
      <div className="appbar">
        <button onClick={back} aria-label="Back">
          <IcBack size={24} />
        </button>
        <span className="h3">@{trader.handle}</span>
        <span style={{ width: 24 }} />
      </div>

      <div className="scroll">
        <div className="col" style={{ alignItems: "center", gap: 10, padding: "10px 16px 4px" }}>
          <TraderAvatar trader={trader} size={82} />
          <div className="h2">{trader.name}</div>
          <div className="small muted">
            @{trader.handle} · {fmtCompact(trader.followers)} followers
          </div>
          <button
            className={"btn btn-sm " + (following ? "btn-ghost" : "btn-primary")}
            style={{ paddingInline: 30, marginTop: 4 }}
            onClick={() => actions.toggleFollow(traderId)}
          >
            {following ? "Following" : "Follow"}
          </button>
        </div>

        <div className="row gap10 pad" style={{ marginTop: 16 }}>
          <div className="card grow">
            <div className="tiny muted">24h P&L</div>
            <div className={"h3 mono " + (day.pnl >= 0 ? "up" : "down")} style={{ marginTop: 4 }}>
              {fmtUsd(day.pnl, { compact: true, sign: true })}
            </div>
          </div>
          <div className="card grow">
            <div className="tiny muted">7d P&L</div>
            <div className={"h3 mono " + (week.pnl >= 0 ? "up" : "down")} style={{ marginTop: 4 }}>
              {fmtUsd(week.pnl, { compact: true, sign: true })}
            </div>
          </div>
          <div className="card grow">
            <div className="tiny muted">Win rate</div>
            <div className="h3 mono" style={{ marginTop: 4 }}>
              {trader.winRate}%
            </div>
          </div>
        </div>

        <div className="section-title">Positions</div>
        {trader.positions.map((p, i) => {
          const token = getToken(p.tokenId);
          if (!token) return null;
          const entry = priceAt(p.tokenId, p.openedAt);
          const qty = p.usdAtEntry / entry;
          const value = qty * getPrice(p.tokenId);
          const pnl = value - p.usdAtEntry;
          return (
            <button
              className="trow"
              key={p.tokenId + i}
              onClick={() => nav("token", { tokenId: p.tokenId })}
            >
              <TokenAvatar token={token} size={38} />
              <div className="grow col" style={{ gap: 3 }}>
                <span className="h3">{token.symbol}</span>
                <span className="tiny muted">opened {since(p.openedAt)} ago</span>
              </div>
              <div className="col" style={{ alignItems: "flex-end", gap: 3 }}>
                <span className="body mono">{fmtUsd(value, { compact: true })}</span>
                <Pct value={(pnl / p.usdAtEntry) * 100} size={12} />
              </div>
            </button>
          );
        })}

        <div className="section-title">Recent activity</div>
        {events.length === 0 ? (
          <Empty icon="😴" title="Quiet lately" body="No trades in the last few days." />
        ) : (
          events.map((ev) => {
            const token = getToken(ev.tokenId);
            return (
              <button
                className="trow"
                key={ev.id}
                onClick={() => nav("token", { tokenId: ev.tokenId })}
              >
                <TokenAvatar token={token} size={32} showVerified={false} />
                <span className="body grow truncate">
                  {ev.type === "close" ? "Closed" : ev.type === "add" ? "Added to" : "Opened"}{" "}
                  {token?.symbol}
                </span>
                <span className="small muted mono">{fmtUsd(ev.usd, { compact: true })}</span>
                <span className="tiny muted" style={{ marginLeft: 8 }}>
                  {timeAgo(ev.ts)}
                </span>
              </button>
            );
          })
        )}

        <div className="empty tiny" style={{ padding: "18px 32px 0" }}>
          {trader.name} is a generated demo trader. Their positions and P&L are computed
          from real market prices; only the trader is invented.
        </div>
      </div>
    </>
  );
}
