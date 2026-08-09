import { useState } from "react";
import { useStore, actions } from "../engine/store.js";
import { getToken } from "../engine/tokens.js";
import { getPrice, searchLocal, getAllStats } from "../engine/market.js";
import { ALERT_TYPES, describeRule, requestPushPermission } from "../engine/alerts.js";
import { TokenAvatar } from "../ui/Avatar.jsx";
import { Switch, Empty } from "../ui/Common.jsx";
import { IcBack, IcPlus, IcTrash, IcCheck, IcChevron } from "../ui/Icons.jsx";
import { fmtPrice, since } from "../engine/format.js";

function TokenPicker({ value, onChange, onClose }) {
  const [q, setQ] = useState("");
  const list = searchLocal(q).slice(0, 80);
  return (
    <div className="col" style={{ minHeight: 0, flex: 1 }}>
      <div className="pad" style={{ padding: "10px 16px" }}>
        <input
          className="input"
          placeholder="Search tokens"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
        />
      </div>
      <div style={{ overflowY: "auto", flex: 1 }}>
        {list.map((t) => (
          <button
            key={t.id}
            className="trow"
            onClick={() => {
              onChange(t.id);
              onClose();
            }}
          >
            <TokenAvatar token={t} size={36} />
            <div className="grow col" style={{ gap: 2 }}>
              <span className="h3">{t.symbol}</span>
              <span className="small muted truncate">{t.name}</span>
            </div>
            <span className="body mono muted">{fmtPrice(getPrice(t.id))}</span>
            {value === t.id && (
              <span style={{ color: "var(--indigo-2)" }}>
                <IcCheck size={18} />
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function NewAlert({ initialTokenId, onDone }) {
  const [tokenId, setTokenId] = useState(
    initialTokenId || getAllStats()[0]?.id || "bitcoin",
  );
  const [type, setType] = useState("price_above");
  const [value, setValue] = useState("");
  const [repeat, setRepeat] = useState(false);
  const [picking, setPicking] = useState(false);

  const token = getToken(tokenId);
  const meta = ALERT_TYPES[type];
  const price = getPrice(tokenId);
  if (!token) return <Empty icon="📡" title="Loading market" body="Fetching live prices…" />;

  // Sensible starting value whenever the token or condition changes.
  const suggested =
    meta.unit === "$"
      ? +(price * (type === "price_above" ? 1.1 : 0.9)).toPrecision(4)
      : 10;

  if (picking) {
    return <TokenPicker value={tokenId} onChange={setTokenId} onClose={() => setPicking(false)} />;
  }

  const num = parseFloat(value === "" ? suggested : value);
  const valid = Number.isFinite(num) && num > 0;

  return (
    <div className="col gap12" style={{ padding: "4px 16px 20px" }}>
      <button className="card-2 row between" onClick={() => setPicking(true)}>
        <div className="row gap10">
          <TokenAvatar token={token} size={34} />
          <div className="col" style={{ gap: 2, alignItems: "flex-start" }}>
            <span className="h3">{token.symbol}</span>
            <span className="small muted mono">{fmtPrice(price)}</span>
          </div>
        </div>
        <span className="muted">
          <IcChevron size={18} />
        </span>
      </button>

      <div className="col gap8">
        <span className="small muted">Condition</span>
        <div className="col" style={{ gap: 6 }}>
          {Object.entries(ALERT_TYPES).map(([k, v]) => (
            <button
              key={k}
              className="card-2 row between"
              style={{
                padding: "12px 14px",
                border: type === k ? "1px solid var(--indigo)" : "1px solid transparent",
              }}
              onClick={() => setType(k)}
            >
              <span className="body">{v.label}</span>
              {type === k && (
                <span style={{ color: "var(--indigo-2)" }}>
                  <IcCheck size={17} />
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="col gap8">
        <span className="small muted">
          {meta.unit === "$" ? "Target price" : "Threshold (%)"}
        </span>
        <div className="row gap8">
          <span className="h2" style={{ width: 22 }}>
            {meta.unit}
          </span>
          <input
            className="input"
            inputMode="decimal"
            placeholder={String(suggested)}
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/[^0-9.]/g, ""))}
          />
        </div>
      </div>

      <div className="card-2 row between">
        <div className="col" style={{ gap: 2 }}>
          <span className="body">Repeat</span>
          <span className="tiny muted">Keep firing (max once every 10 min)</span>
        </div>
        <Switch on={repeat} onChange={setRepeat} />
      </div>

      <button
        className="btn btn-primary btn-block"
        disabled={!valid}
        onClick={() => {
          actions.addAlert({ tokenId, type, value: num, repeat });
          onDone();
        }}
      >
        Create alert
      </button>
    </div>
  );
}

export default function Alerts({ back, initialTokenId }) {
  const state = useStore();
  const [creating, setCreating] = useState(false);
  const [pushState, setPushState] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported",
  );

  const enablePush = async () => {
    const res = await requestPushPermission();
    setPushState(res);
    actions.setSetting("push", res === "granted");
  };

  return (
    <>
      <div className="appbar">
        <button onClick={creating ? () => setCreating(false) : back} aria-label="Back">
          <IcBack size={24} />
        </button>
        <span className="h3">{creating ? "New alert" : "Alerts"}</span>
        <button
          onClick={() => setCreating((v) => !v)}
          style={{ color: "var(--indigo-2)" }}
          aria-label="New alert"
        >
          {creating ? <span style={{ width: 22 }} /> : <IcPlus size={22} />}
        </button>
      </div>

      <div className="scroll">
        {creating ? (
          <NewAlert initialTokenId={initialTokenId} onDone={() => setCreating(false)} />
        ) : (
          <>
            {state.settings.push !== true && pushState !== "unsupported" && (
              <div className="pad" style={{ paddingTop: 10 }}>
                <div className="card row between gap12">
                  <div className="col" style={{ gap: 3 }}>
                    <span className="body" style={{ fontWeight: 700 }}>
                      Notify me outside the app
                    </span>
                    <span className="tiny muted">
                      Get system notifications when an alert fires.
                    </span>
                  </div>
                  <button className="btn btn-sm btn-primary" onClick={enablePush}>
                    {pushState === "denied" ? "Blocked" : "Enable"}
                  </button>
                </div>
              </div>
            )}

            <div className="section-title">My alerts ({state.alerts.length})</div>

            {state.alerts.length === 0 ? (
              <Empty
                icon="🎯"
                title="No alerts set"
                body="Tap + to get pinged when a token hits your price."
              />
            ) : (
              state.alerts.map((a) => {
                const token = getToken(a.tokenId);
                return (
                  <div className="trow" key={a.id}>
                    <TokenAvatar token={token} size={38} />
                    <div className="grow col" style={{ gap: 3 }}>
                      <span className="body truncate" style={{ fontWeight: 600 }}>
                        {describeRule(a)}
                      </span>
                      <span className="tiny muted">
                        {a.lastFired ? `fired ${since(a.lastFired)} ago · ` : ""}
                        {a.repeat ? "repeating" : "one-time"}
                        {!a.enabled ? " · off" : ""}
                      </span>
                    </div>
                    <Switch
                      on={a.enabled}
                      onChange={(v) => actions.updateAlert(a.id, { enabled: v, lastFired: v ? null : a.lastFired })}
                    />
                    <button
                      className="muted"
                      onClick={() => actions.deleteAlert(a.id)}
                      aria-label="Delete"
                      style={{ marginLeft: 4 }}
                    >
                      <IcTrash size={18} />
                    </button>
                  </div>
                );
              })
            )}

            <div className="section-title">Automatic alerts</div>
            <div className="col">
              {[
                ["alertActivity", "Traders you follow", "When someone you follow opens or closes"],
                ["alertBigMoves", "Big moves", `Anything you hold or watch moving ${state.settings.bigMovePct}%+ in an hour`],
                ["alertVerified", "Verified tokens", "Verified tokens moving 20%+ in a day"],
                ["sound", "Sound", "Play a chime when an alert fires"],
              ].map(([key, title, sub]) => (
                <div className="list-item" key={key}>
                  <div className="grow col" style={{ gap: 3 }}>
                    <span className="body">{title}</span>
                    <span className="tiny muted">{sub}</span>
                  </div>
                  <Switch
                    on={!!state.settings[key]}
                    onChange={(v) => actions.setSetting(key, v)}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
