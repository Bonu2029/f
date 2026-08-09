/* Avatars are generated, never fetched — no real profile photos or token
   logos are pulled from the network. Each one is a deterministic gradient
   plus a glyph. */

import { IcCheck } from "./Icons.jsx";
import { TRADER_BY_ID } from "../engine/traders.js";

function shade(hex, amt) {
  const n = parseInt(hex.replace("#", ""), 16);
  const clamp = (v) => Math.max(0, Math.min(255, v));
  const r = clamp(((n >> 16) & 255) + amt);
  const g = clamp(((n >> 8) & 255) + amt);
  const b = clamp((n & 255) + amt);
  return `rgb(${r},${g},${b})`;
}

/**
 * Real token logo from the market data, with a coloured initials tile behind
 * it so the row never flashes empty while the image loads.
 */
export function TokenAvatar({ token, size = 42, showVerified = true }) {
  if (!token) return null;
  const initials = (token.symbol || "?").slice(0, 3);
  return (
    <div
      className="tavatar"
      style={{
        width: size,
        height: size,
        fontSize: size * (initials.length > 2 ? 0.3 : 0.36),
        fontWeight: 700,
        background: token.color,
        overflow: "visible",
      }}
    >
      {token.image ? (
        <img
          src={token.image}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }}
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <span style={{ lineHeight: 1 }}>{initials}</span>
      )}
      {showVerified && token.verified && (
        <span className="verified" style={{ width: size * 0.38, height: size * 0.38 }}>
          <IcCheck size={size * 0.22} />
        </span>
      )}
    </div>
  );
}

export function TraderAvatar({ trader, size = 40 }) {
  if (!trader) return null;
  return (
    <div
      className="tavatar"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.5,
        background: `linear-gradient(145deg, ${shade(trader.color, 40)}, ${shade(trader.color, -50)})`,
      }}
    >
      <span style={{ lineHeight: 1 }}>{trader.emoji}</span>
    </div>
  );
}

/** Overlapping mini avatars with a "+N" pill, as on the token rows. */
export function AvatarStack({ ids = [], extra = 0, size = 19 }) {
  return (
    <div className="stack">
      {ids.map((id, i) => {
        const t = TRADER_BY_ID[id];
        if (!t) return null;
        return (
          <div
            key={id + i}
            className="mini-av"
            style={{
              width: size,
              height: size,
              fontSize: size * 0.55,
              background: `linear-gradient(145deg, ${shade(t.color, 40)}, ${shade(t.color, -50)})`,
            }}
          >
            {t.emoji}
          </div>
        );
      })}
      {extra > 0 && <div className="stack-more">{extra}+</div>}
    </div>
  );
}

export function ProfileAvatar({ profile, size = 44 }) {
  return (
    <div
      className="tavatar"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.5,
        background: `linear-gradient(145deg, ${shade(profile.color, 40)}, ${shade(profile.color, -50)})`,
      }}
    >
      <span style={{ lineHeight: 1 }}>{profile.emoji}</span>
    </div>
  );
}
