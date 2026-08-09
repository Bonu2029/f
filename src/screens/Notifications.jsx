import { useEffect } from "react";
import { useStore, actions } from "../engine/store.js";
import { getToken } from "../engine/tokens.js";
import { TRADER_BY_ID } from "../engine/traders.js";
import { TokenAvatar, TraderAvatar } from "../ui/Avatar.jsx";
import { Empty } from "../ui/Common.jsx";
import { IcBack, IcBell, IcTrend, IcGear } from "../ui/Icons.jsx";
import { timeAgo } from "../engine/format.js";

function NotifIcon({ n }) {
  const token = n.tokenId ? getToken(n.tokenId) : null;
  const trader = n.traderId ? TRADER_BY_ID[n.traderId] : null;
  if (n.kind === "activity" && trader) return <TraderAvatar trader={trader} size={40} />;
  if (token) return <TokenAvatar token={token} size={40} />;
  return (
    <div className="tavatar" style={{ width: 40, height: 40, background: "var(--surface-2)" }}>
      <IcBell size={18} />
    </div>
  );
}

export default function Notifications({ nav, back }) {
  const state = useStore();
  const items = state.notifications;

  // Opening the screen is what clears the badge.
  useEffect(() => {
    const t = setTimeout(() => actions.markAllRead(), 700);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <div className="appbar">
        <button onClick={back} aria-label="Back">
          <IcBack size={24} />
        </button>
        <span className="h3">Alerts</span>
        <button className="bell" onClick={() => nav("alerts")} aria-label="Manage alerts">
          <IcGear size={18} />
        </button>
      </div>

      <div className="scroll">
        {items.length > 0 && (
          <div className="row between pad" style={{ padding: "6px 16px 10px" }}>
            <span className="small muted">{items.length} notifications</span>
            <button
              className="small"
              style={{ color: "var(--indigo-2)", fontWeight: 700 }}
              onClick={() => actions.clearNotifications()}
            >
              Clear all
            </button>
          </div>
        )}

        {items.length === 0 ? (
          <Empty
            icon="🔔"
            title="No alerts yet"
            body="Set a price target on any token and it lands here the moment it hits."
          />
        ) : (
          items.map((n) => (
            <button
              key={n.id}
              className="trow"
              onClick={() => n.tokenId && nav("token", { tokenId: n.tokenId })}
              style={{
                background: n.read ? "transparent" : "rgba(91,91,245,0.07)",
                alignItems: "flex-start",
              }}
            >
              <NotifIcon n={n} />
              <div className="grow col" style={{ gap: 3 }}>
                <div className="row gap6">
                  <span className={n.tone === "down" ? "down" : "up"} style={{ display: "flex" }}>
                    <IcTrend size={14} />
                  </span>
                  <span className="body truncate" style={{ fontWeight: 700 }}>
                    {n.title}
                  </span>
                </div>
                <span className="small muted truncate">{n.body}</span>
              </div>
              <span className="tiny muted" style={{ paddingTop: 3 }}>
                {timeAgo(n.ts)}
              </span>
            </button>
          ))
        )}
      </div>
    </>
  );
}
