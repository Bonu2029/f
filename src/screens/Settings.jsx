import { useState } from "react";
import { useStore, actions, portfolio } from "../engine/store.js";
import { ProfileAvatar } from "../ui/Avatar.jsx";
import { Switch } from "../ui/Common.jsx";
import { IcBack, IcChevron } from "../ui/Icons.jsx";
import { requestPushPermission } from "../engine/alerts.js";
import { setApiKey, status } from "../engine/api.js";
import { fmtUsd, since } from "../engine/format.js";

const EMOJI = ["🕶️", "🦍", "🐸", "🚀", "🧊", "👑", "🎯", "🍀", "🔮", "🐳"];
const COLORS = ["#5B5BF5", "#22C55E", "#F97316", "#EC4899", "#06B6D4", "#F5B301"];

export default function Settings({ back, nav }) {
  const state = useStore();
  const pf = portfolio(state);
  const [confirmReset, setConfirmReset] = useState(false);

  const row = (title, sub, control) => (
    <div className="list-item" key={title}>
      <div className="grow col" style={{ gap: 3 }}>
        <span className="body">{title}</span>
        {sub && <span className="tiny muted">{sub}</span>}
      </div>
      {control}
    </div>
  );

  return (
    <>
      <div className="appbar">
        <button onClick={back} aria-label="Back">
          <IcBack size={24} />
        </button>
        <span className="h3">Settings</span>
        <span style={{ width: 24 }} />
      </div>

      <div className="scroll">
        {/* Profile */}
        <div className="col" style={{ alignItems: "center", gap: 12, padding: "12px 16px 6px" }}>
          <ProfileAvatar profile={state.profile} size={76} />
          <input
            className="input"
            style={{ textAlign: "center", maxWidth: 240 }}
            value={state.profile.name}
            onChange={(e) => actions.setProfile({ name: e.target.value.slice(0, 20) })}
          />
          <div className="row gap8" style={{ flexWrap: "wrap", justifyContent: "center" }}>
            {EMOJI.map((e) => (
              <button
                key={e}
                onClick={() => actions.setProfile({ emoji: e })}
                style={{
                  fontSize: 20,
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background:
                    state.profile.emoji === e ? "var(--indigo-dim)" : "var(--surface-2)",
                }}
              >
                {e}
              </button>
            ))}
          </div>
          <div className="row gap8">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => actions.setProfile({ color: c })}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: c,
                  border:
                    state.profile.color === c ? "2.5px solid #fff" : "2.5px solid transparent",
                }}
              />
            ))}
          </div>
        </div>

        <div className="section-title">Alerts</div>
        {row(
          "System notifications",
          "Show alerts even when the app isn't open",
          <Switch
            on={!!state.settings.push}
            onChange={async (v) => {
              if (v) {
                const res = await requestPushPermission();
                actions.setSetting("push", res === "granted");
              } else {
                actions.setSetting("push", false);
              }
            }}
          />,
        )}
        {row(
          "Sound",
          "Chime when an alert fires",
          <Switch on={!!state.settings.sound} onChange={(v) => actions.setSetting("sound", v)} />,
        )}
        {row(
          "Trader activity",
          "Traders you follow opening or closing",
          <Switch
            on={!!state.settings.alertActivity}
            onChange={(v) => actions.setSetting("alertActivity", v)}
          />,
        )}
        {row(
          "Big moves",
          `Holdings and watchlist moving ${state.settings.bigMovePct}%+ in an hour`,
          <Switch
            on={!!state.settings.alertBigMoves}
            onChange={(v) => actions.setSetting("alertBigMoves", v)}
          />,
        )}
        <div className="list-item">
          <div className="grow col" style={{ gap: 3 }}>
            <span className="body">Big move threshold</span>
            <span className="tiny muted">{state.settings.bigMovePct}% in an hour</span>
          </div>
          <input
            type="range"
            min="3"
            max="40"
            value={state.settings.bigMovePct}
            onChange={(e) => actions.setSetting("bigMovePct", Number(e.target.value))}
            style={{ width: 120, accentColor: "var(--indigo)" }}
          />
        </div>
        <button className="list-item" onClick={() => nav("alerts")}>
          <span className="grow body">Manage alert rules</span>
          <span className="small muted">{state.alerts.length}</span>
          <span className="muted">
            <IcChevron size={18} />
          </span>
        </button>

        <div className="section-title">Market data</div>
        <div className="pad">
          <div className="card col gap8">
            <div className="row between">
              <span className="small muted">Source</span>
              <span className="body">CoinGecko</span>
            </div>
            <div className="row between">
              <span className="small muted">Status</span>
              <span className={"body " + (status.state === "ok" ? "up" : "down")}>
                {
                  {
                    ok: "Live",
                    limited: "Rate limited",
                    offline: "Offline",
                    idle: "Connecting…",
                  }[status.state]
                }
              </span>
            </div>
            <div className="row between">
              <span className="small muted">Last update</span>
              <span className="body">
                {status.lastOk ? `${since(status.lastOk)} ago` : "—"}
              </span>
            </div>
          </div>
        </div>
        <div className="pad" style={{ paddingTop: 10 }}>
          <span className="tiny muted">
            Optional: a free CoinGecko Demo key raises the rate limit if lists stop
            refreshing.
          </span>
          <input
            className="input"
            style={{ marginTop: 8 }}
            placeholder="CoinGecko demo API key (optional)"
            value={state.settings.cgKey || ""}
            onChange={(e) => {
              const v = e.target.value.trim();
              actions.setSetting("cgKey", v);
              setApiKey(v);
            }}
          />
        </div>

        <div className="section-title">Privacy</div>
        {row(
          "Hide balances",
          "Mask portfolio numbers on the home screen",
          <Switch
            on={!!state.settings.hideBalance}
            onChange={(v) => actions.setSetting("hideBalance", v)}
          />,
        )}

        <div className="section-title">Demo data</div>
        <div className="pad">
          <div className="card col gap8">
            <div className="row between">
              <span className="small muted">Portfolio value</span>
              <span className="body mono">{fmtUsd(pf.total)}</span>
            </div>
            <div className="row between">
              <span className="small muted">Trades recorded</span>
              <span className="body mono">{state.trades.length}</span>
            </div>
            <div className="row between">
              <span className="small muted">Notifications</span>
              <span className="body mono">{state.notifications.length}</span>
            </div>
            <div className="row between">
              <span className="small muted">Stored</span>
              <span className="body">This device only</span>
            </div>
          </div>
        </div>

        <div className="pad" style={{ paddingTop: 12 }}>
          {confirmReset ? (
            <div className="col gap8">
              <span className="small muted" style={{ textAlign: "center" }}>
                This wipes your positions, alerts and history, and deals a fresh demo book.
              </span>
              <div className="row gap10">
                <button
                  className="btn btn-ghost grow"
                  onClick={() => setConfirmReset(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-red grow"
                  onClick={() => {
                    actions.resetDemo();
                    setConfirmReset(false);
                    back();
                  }}
                >
                  Reset
                </button>
              </div>
            </div>
          ) : (
            <button className="btn btn-ghost btn-block" onClick={() => setConfirmReset(true)}>
              Reset demo data
            </button>
          )}
        </div>

        <div className="empty tiny" style={{ padding: "22px 28px 0", lineHeight: 1.6 }}>
          <b>Solo build.</b> Prices, market caps and charts are live from CoinGecko. Your
          portfolio, watchlist and alerts are yours alone — stored in this browser, with no
          account and no server. Trades are paper trades filled at the live price; no order
          ever reaches an exchange or a blockchain. The traders on the feed and leaderboard
          are invented for the social screens — no real person's data appears anywhere.
        </div>
      </div>
    </>
  );
}
