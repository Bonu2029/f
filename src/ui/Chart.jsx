/* Charts. Plain SVG — no charting library, so the bundle stays tiny and the
   curves match the app's soft, smoothed look. */

import { useMemo, useId } from "react";

/** Cardinal spline through the points, which is what gives the soft curve. */
function smoothPath(pts, tension = 0.5) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1.x + ((p2.x - p0.x) / 6) * tension;
    const c1y = p1.y + ((p2.y - p0.y) / 6) * tension;
    const c2x = p2.x - ((p3.x - p1.x) / 6) * tension;
    const c2y = p2.y - ((p3.y - p1.y) / 6) * tension;
    d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${p2.x} ${p2.y}`;
  }
  return d;
}

function project(points, w, h, padY = 10, padX = 10) {
  const ps = points.map((p) => p.p);
  const min = Math.min(...ps);
  const max = Math.max(...ps);
  const span = max - min || max || 1;
  const n = points.length;
  const innerW = w - padX * 2;
  return points.map((pt, i) => ({
    x: padX + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW),
    y: padY + (1 - (pt.p - min) / span) * (h - padY * 2),
    t: pt.t,
    p: pt.p,
  }));
}

/**
 * Small inline chart. `markers` are trades: [{ ts, side: 'buy' | 'sell' }],
 * drawn as the green + / orange − dots the feed uses.
 */
export function Sparkline({
  points,
  width = 300,
  height = 72,
  color,
  fill = false,
  markers = [],
  strokeWidth = 2.2,
}) {
  const gid = useId();
  const geo = useMemo(() => {
    if (!points || points.length < 2) return null;
    const proj = project(points, width, height);
    const up = points[points.length - 1].p >= points[0].p;
    const stroke = color || (up ? "var(--up)" : "var(--down)");
    return { proj, stroke, path: smoothPath(proj) };
  }, [points, width, height, color]);

  if (!geo) {
    return (
      <div
        className="col"
        style={{ height, alignItems: "center", justifyContent: "center", gap: 8 }}
      >
        <div className="pulse-dot" style={{ background: "var(--muted-2)" }} />
        <span className="tiny muted">Loading chart…</span>
      </div>
    );
  }

  // Only mark trades that actually fall inside the visible window — otherwise
  // an old trade would pin itself to the edge of every timeframe.
  const from = points[0].t;
  const to = points[points.length - 1].t;
  const marks = markers
    .filter((m) => m.ts >= from && m.ts <= to)
    .map((m) => {
      let best = null;
      let bestD = Infinity;
      for (const p of geo.proj) {
        const d = Math.abs(p.t - m.ts);
        if (d < bestD) {
          bestD = d;
          best = p;
        }
      }
      return best ? { ...m, x: best.x, y: best.y } : null;
    })
    .filter(Boolean);

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {fill && (
        <>
          <defs>
            <linearGradient id={`g${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={geo.stroke} stopOpacity="0.26" />
              <stop offset="100%" stopColor={geo.stroke} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d={`${geo.path} L ${width} ${height} L 0 ${height} Z`}
            fill={`url(#g${gid})`}
            stroke="none"
          />
        </>
      )}
      <path
        d={geo.path}
        fill="none"
        stroke={geo.stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {marks.map((m, i) => (
        <g key={i}>
          <circle
            cx={m.x}
            cy={m.y}
            r="8"
            fill={m.side === "buy" ? "var(--up)" : "#F97316"}
            stroke="#0d0d10"
            strokeWidth="2"
          />
          <path
            d={
              m.side === "buy"
                ? `M ${m.x - 3.4} ${m.y} h 6.8 M ${m.x} ${m.y - 3.4} v 6.8`
                : `M ${m.x - 3.4} ${m.y} h 6.8`
            }
            stroke="#06120a"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
      ))}
      {/* Leading dot, like the live end-of-line marker in the app. */}
      <circle
        cx={geo.proj[geo.proj.length - 1].x - 1}
        cy={geo.proj[geo.proj.length - 1].y}
        r="4"
        fill={geo.stroke}
      />
    </svg>
  );
}

/** Full-width chart for the token screen, with a soft gradient under it. */
export function PriceChart({ points, markers = [], height = 190 }) {
  return (
    <div style={{ padding: "0 4px" }}>
      <Sparkline
        points={points}
        width={400}
        height={height}
        fill
        markers={markers}
        strokeWidth={2.4}
      />
    </div>
  );
}
