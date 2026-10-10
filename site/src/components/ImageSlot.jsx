import { useId } from "react";
import { IMAGES } from "../config/images.js";

/**
 * <ImageSlot id="heroInterior" />
 * Renders the configured image, or an architectural line-drawing placeholder
 * clearly labeled with its slot id until a real photo is supplied.
 */
export default function ImageSlot({ id, priority = false, tone = "light", className = "", style, showTag = true, sizes }) {
  const cfg = IMAGES[id] || { alt: "", art: "window" };
  return (
    <div className={`slot ${className}`} style={style}>
      {cfg.src ? (
        <img
          src={cfg.src}
          alt={cfg.alt}
          loading={priority ? "eager" : "lazy"}
          fetchpriority={priority ? "high" : "auto"}
          decoding="async"
          sizes={sizes}
        />
      ) : (
        <div className="ph" role="img" aria-label={`Image placeholder: ${cfg.alt}`}>
          <Art kind={cfg.art} tone={tone} />
        </div>
      )}
      {showTag && (!cfg.src || cfg.demo) && (
        <div className="slot-tag" aria-hidden="true">
          {!cfg.src && <span>Image slot · {id}</span>}
          {cfg.demo && <span className="demo">Demonstration image</span>}
        </div>
      )}
    </div>
  );
}

/* ── Placeholder art: quiet architectural drawings in the neutral palette ── */
export function Art({ kind, tone = "light" }) {
  const dark = tone === "dark";
  const bg1 = dark ? "#3a3733" : "#e9e3d8";
  const bg2 = dark ? "#1d1c1a" : "#d6cdbf";
  const ln = dark ? "rgba(244,239,230,.32)" : "rgba(27,26,25,.28)";
  const ln2 = dark ? "rgba(244,239,230,.16)" : "rgba(27,26,25,.14)";
  const p = useId().replace(/:/g, "");
  const u = (n) => `${p}${n}`;
  const url = (n) => `url(#${u(n)})`;
  const glass = dark ? url("glow") : url("glass");
  const uid = `${kind}-${tone}`;
  const common = (
    <defs>
      <linearGradient id={u("wall")} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={bg1} />
        <stop offset="1" stopColor={bg2} />
      </linearGradient>
      <linearGradient id={u("glass")} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f8f5ef" />
        <stop offset="1" stopColor="#e1d9cc" />
      </linearGradient>
      <radialGradient id={u("glow")} cx=".5" cy=".35" r=".8">
        <stop offset="0" stopColor="#f6efe2" />
        <stop offset=".55" stopColor="#d9cfbf" />
        <stop offset="1" stopColor="#8c8377" />
      </radialGradient>
      <linearGradient id={u("beam")} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#fff8ec" stopOpacity={dark ? 0.22 : 0.5} />
        <stop offset="1" stopColor="#fff8ec" stopOpacity="0" />
      </linearGradient>
    </defs>
  );
  const props = { viewBox: "0 0 800 1000", preserveAspectRatio: "xMidYMid slice", "aria-hidden": true, key: uid };

  if (kind === "door") {
    return (
      <svg {...props}>
        {common}
        <rect width="800" height="1000" fill={url("wall")} />
        <rect x="170" y="130" width="460" height="800" fill="none" stroke={ln} strokeWidth="2" />
        <rect x="190" y="150" width="70" height="760" fill={glass} opacity=".8" stroke={ln} />
        <rect x="540" y="150" width="70" height="760" fill={glass} opacity=".8" stroke={ln} />
        <rect x="280" y="150" width="240" height="760" fill={dark ? "#2a2826" : "#cfc5b6"} stroke={ln} strokeWidth="1.5" />
        {[0, 1].map((r) => [0, 1].map((c) => (
          <rect key={`${r}${c}`} x={300 + c * 110} y={180 + r * 370} width="90" height={r ? 330 : 340} fill="none" stroke={ln} />
        )))}
        <circle cx="496" cy="545" r="7" fill="none" stroke={ln} strokeWidth="2" />
        <rect x="140" y="930" width="520" height="16" fill="none" stroke={ln} />
        <polygon points="190,150 610,150 760,1000 40,1000" fill={url("beam")} opacity={dark ? 1 : 0.5} />
      </svg>
    );
  }
  if (kind === "wood") {
    return (
      <svg {...props}>
        {common}
        <rect width="800" height="1000" fill={dark ? "#3b342c" : "#d8ccb9"} />
        {Array.from({ length: 34 }).map((_, i) => (
          <path key={i} d={`M${-40 + i * 26} 0 C ${60 + i * 26} 260, ${-60 + i * 26} 620, ${40 + i * 26} 1000`} fill="none" stroke={dark ? "rgba(244,239,230,.08)" : "rgba(60,45,30,.12)"} strokeWidth={i % 5 === 0 ? 2.2 : 1} />
        ))}
        <rect x="120" y="120" width="560" height="760" fill="none" stroke={ln} strokeWidth="26" />
        <rect x="160" y="160" width="480" height="680" fill="none" stroke={ln2} strokeWidth="2" />
        <line x1="400" y1="160" x2="400" y2="840" stroke={ln} strokeWidth="14" />
        <line x1="160" y1="500" x2="640" y2="500" stroke={ln} strokeWidth="14" />
      </svg>
    );
  }
  if (kind === "samples") {
    return (
      <svg {...props}>
        {common}
        <rect width="800" height="1000" fill={url("wall")} />
        {[["#f3eee5", 110, 250, -4], ["#c9bca8", 300, 210, 3], ["#8b7a66", 490, 260, -2], ["#2e2c29", 200, 520, 5], ["#e2d8c8", 420, 560, -6], ["#5b5045", 590, 540, 4]].map(([c, x, y, r], i) => (
          <g key={i} transform={`rotate(${r} ${x + 70} ${y + 110})`}>
            <rect x={x + 6} y={y + 10} width="150" height="230" fill="rgba(0,0,0,.08)" />
            <rect x={x} y={y} width="150" height="230" fill={c} stroke={ln} />
            <line x1={x + 18} y1={y + 200} x2={x + 90} y2={y + 200} stroke={i === 3 || i === 5 ? "rgba(244,239,230,.4)" : ln} />
          </g>
        ))}
        <circle cx="640" cy="170" r="34" fill="none" stroke={ln} strokeWidth="2" />
        <circle cx="640" cy="170" r="10" fill={ln2} />
      </svg>
    );
  }
  if (kind === "van") {
    return (
      <svg {...props}>
        {common}
        <rect width="800" height="1000" fill={url("wall")} />
        <rect x="0" y="0" width="800" height="560" fill={dark ? "#2a2826" : "#ece6dc"} />
        {[60, 250, 440, 630].map((x) => (
          <g key={x}><rect x={x} y="90" width="110" height="170" fill={glass} stroke={ln} /><line x1={x + 55} y1="90" x2={x + 55} y2="260" stroke={ln2} /><line x1={x} y1="175" x2={x + 110} y2="175" stroke={ln2} /></g>
        ))}
        <line x1="0" y1="560" x2="800" y2="560" stroke={ln} />
        <rect x="120" y="460" width="560" height="260" rx="22" fill={dark ? "#3a3733" : "#f6f3ed"} stroke={ln} strokeWidth="2" />
        <rect x="520" y="480" width="140" height="100" rx="10" fill={glass} stroke={ln} />
        <line x1="140" y1="640" x2="660" y2="640" stroke={ln2} />
        <circle cx="240" cy="730" r="48" fill={dark ? "#111" : "#2a2927"} /><circle cx="240" cy="730" r="18" fill="#8a8175" />
        <circle cx="570" cy="730" r="48" fill={dark ? "#111" : "#2a2927"} /><circle cx="570" cy="730" r="18" fill="#8a8175" />
        <text x="160" y="540" fontFamily="Cormorant Garamond, serif" fontSize="34" fill={ln}>Mobile Showroom</text>
      </svg>
    );
  }
  if (kind === "detail") {
    return (
      <svg {...props}>
        {common}
        <rect width="800" height="1000" fill={url("wall")} />
        <rect x="-60" y="120" width="620" height="980" fill={glass} stroke={ln} strokeWidth="3" />
        <rect x="-60" y="120" width="620" height="980" fill="none" stroke={ln} strokeWidth="44" />
        <path d="M560 100 h80 v920 h-80" fill="none" stroke={ln} strokeWidth="2" />
        <path d="M600 100 v920 M620 100 v920" stroke={ln2} />
        <rect x="470" y="470" width="40" height="120" rx="6" fill={dark ? "#d3cabc" : "#2a2927"} />
        <polygon points="0,120 520,120 800,1000 0,1000" fill={url("beam")} />
      </svg>
    );
  }
  // window / window-worn (default)
  const worn = kind === "window-worn";
  return (
    <svg {...props}>
      {common}
      <rect width="800" height="1000" fill={url("wall")} />
      <path d="M210 160 Q400 40 590 160" fill="none" stroke={ln} strokeWidth="2" />
      <rect x="210" y="160" width="380" height="680" fill={glass} stroke={ln} strokeWidth="3" />
      <rect x="210" y="160" width="380" height="680" fill="none" stroke={worn ? "rgba(90,70,50,.45)" : ln} strokeWidth="18" />
      {[1, 2].map((c) => <line key={`v${c}`} x1={210 + c * 126.6} y1="160" x2={210 + c * 126.6} y2="840" stroke={ln} strokeWidth="6" />)}
      {[1, 2, 3].map((r) => <line key={`h${r}`} x1="210" y1={160 + r * 170} x2="590" y2={160 + r * 170} stroke={ln} strokeWidth={r === 2 ? 14 : 6} />)}
      <rect x="180" y="840" width="440" height="22" fill="none" stroke={ln} strokeWidth="2" />
      {worn && (
        <g stroke="rgba(90,70,50,.45)" strokeWidth="2" fill="none">
          <path d="M240 420 l40 30 l-10 40" /><path d="M520 600 l30 -20 l20 30" /><path d="M300 760 l60 -10" />
          <circle cx="470" cy="300" r="40" stroke="rgba(90,70,50,.2)" />
        </g>
      )}
      <polygon points="210,160 590,160 820,1000 -40,1000" fill={url("beam")} opacity={dark ? 1 : 0.6} />
    </svg>
  );
}
