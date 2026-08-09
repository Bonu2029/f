import { useEffect } from "react";
import { TokenAvatar, AvatarStack } from "./Avatar.jsx";
import { fmtPrice, fmtPct } from "../engine/format.js";
import { formatMc } from "../engine/tokens.js";
import { hashString } from "../engine/rng.js";
import { TRADERS } from "../engine/traders.js";

/** Bottom sheet with backdrop. `full` makes it a full-height page sheet. */
export function Sheet({ open, onClose, children, full = false, label }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className={"sheet" + (full ? " sheet-full" : "")} role="dialog" aria-label={label}>
        {!full && <div className="grabber" />}
        {children}
      </div>
    </>
  );
}

export function Switch({ on, onChange }) {
  return (
    <button
      className={"switch" + (on ? " on" : "")}
      onClick={() => onChange(!on)}
      role="switch"
      aria-checked={on}
    />
  );
}

/** ▲ 3.35% / ▼ 1.91% */
export function Pct({ value, size = 15, weight = 600 }) {
  const up = value >= 0;
  return (
    <span
      className={"mono " + (up ? "up" : "down")}
      style={{ fontSize: size, fontWeight: weight, whiteSpace: "nowrap" }}
    >
      {up ? "▲" : "▼"} {fmtPct(value)}
    </span>
  );
}

/** Deterministic set of "holders" shown on a token row. */
export function holderIdsFor(tokenId) {
  const h = hashString("holders:" + tokenId);
  return [0, 1, 2].map((i) => TRADERS[(h + i * 7) % TRADERS.length].id);
}

/** The main token list row used on Home, Search and Watchlist. */
export function TokenRow({ stat, onClick, right, showHolders = true }) {
  if (!stat) return null;
  const { token, price, change24h, mc } = stat;
  return (
    <button className="trow" onClick={onClick}>
      <TokenAvatar token={token} />
      <div className="grow col" style={{ gap: 4 }}>
        <div className="h3 truncate">{token.symbol}</div>
        <div className="row gap6">
          <span className="mc-tag">MC</span>
          <span className="small muted mono">{formatMc(mc)}</span>
          {showHolders && <AvatarStack ids={holderIdsFor(token.id)} extra={5} />}
        </div>
      </div>
      {right || (
        <div className="col" style={{ alignItems: "flex-end", gap: 4 }}>
          <div className="h3 mono">{fmtPrice(price)}</div>
          <Pct value={change24h} size={14} />
        </div>
      )}
    </button>
  );
}

export function Segmented({ options, value, onChange }) {
  return (
    <div className="chips">
      {options.map((o) => (
        <button
          key={o.value}
          className={"chip" + (o.value === value ? " active" : "")}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Tabs({ tabs, value, onChange, style }) {
  return (
    <div className="tabs" style={style}>
      {tabs.map((t) => (
        <button
          key={t.value}
          className={"tab" + (t.value === value ? " active" : "")}
          onClick={() => onChange(t.value)}
          style={t.flex ? { flex: 1, textAlign: "center" } : undefined}
        >
          {t.icon || t.label}
        </button>
      ))}
    </div>
  );
}

export function Empty({ icon = "👀", title, body }) {
  return (
    <div className="empty">
      <div style={{ fontSize: 38, marginBottom: 10 }}>{icon}</div>
      <div className="h3" style={{ marginBottom: 6 }}>
        {title}
      </div>
      {body && <div className="small muted">{body}</div>}
    </div>
  );
}

export { fmtPrice, fmtPct, formatMc };
