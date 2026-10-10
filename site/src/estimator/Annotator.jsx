import { useEffect, useRef, useState } from "react";

export const CORNERS = ["Top-left", "Top-right", "Bottom-right", "Bottom-left"];

/**
 * Tap four corners in order. Points are stored in natural-image pixels.
 * - numbered dots + connecting lines
 * - drag a dot to adjust (with a magnifier loupe), or select and nudge
 * - keyboard: Tab to a dot, arrow keys to move (Shift = larger steps)
 */
export default function Annotator({ src, w, h, points, onChange, color = "#ffffff", ghost, label = "opening" }) {
  const svgRef = useRef(null);
  const [drag, setDrag] = useState(null);
  const [sel, setSel] = useState(null);

  const toImg = (e) => {
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    return [Math.min(w, Math.max(0, p.x)), Math.min(h, Math.max(0, p.y))];
  };

  const down = (e) => {
    if (points.length >= 4) return;
    e.preventDefault();
    const next = [...points, toImg(e)];
    onChange(next);
    setSel(next.length - 1);
    setDrag(next.length - 1);
    svgRef.current.setPointerCapture?.(e.pointerId);
  };
  const dotDown = (i) => (e) => {
    e.stopPropagation(); e.preventDefault();
    setSel(i); setDrag(i);
    svgRef.current.setPointerCapture?.(e.pointerId);
  };
  const move = (e) => {
    if (drag == null) return;
    const p = toImg(e);
    onChange(points.map((q, i) => (i === drag ? p : q)));
  };
  const up = () => setDrag(null);

  const nudge = (i, dx, dy) => {
    if (i == null || !points[i]) return;
    onChange(points.map((q, k) => (k === i ? [Math.min(w, Math.max(0, q[0] + dx)), Math.min(h, Math.max(0, q[1] + dy))] : q)));
  };
  const stepPx = Math.max(1, w / 400);
  const key = (i) => (e) => {
    const s = stepPx * (e.shiftKey ? 5 : 1);
    const d = { ArrowLeft: [-s, 0], ArrowRight: [s, 0], ArrowUp: [0, -s], ArrowDown: [0, s] }[e.key];
    if (d) { e.preventDefault(); nudge(i, ...d); }
  };

  useEffect(() => { if (sel != null && sel >= points.length) setSel(points.length ? points.length - 1 : null); }, [points.length, sel]);

  const r = w / 70;
  const loupeR = w / 9;
  const lp = drag != null && points[drag];
  const loupeAt = lp ? [lp[0] < w / 2 ? w - loupeR - r : loupeR + r, loupeR + r] : null;
  const Z = 3;

  return (
    <div>
      <div className="annot" style={{ aspectRatio: `${w} / ${h}` }}>
        <img src={src} alt={`Photo for marking the ${label}`} draggable="false" />
        <svg
          ref={svgRef} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none"
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
          role="application"
          aria-label={`Marking area. Tap to place the ${CORNERS[points.length]?.toLowerCase() || "final"} corner.`}
        >
          {ghost && ghost.length === 4 && (
            <polygon points={ghost.map((p) => p.join(",")).join(" ")} fill="rgba(255,255,255,.12)" stroke="rgba(255,255,255,.6)" strokeDasharray={`${r} ${r / 2}`} strokeWidth={r / 5} />
          )}
          {points.length === 4 && <polygon points={points.map((p) => p.join(",")).join(" ")} fill="rgba(255,255,255,.14)" />}
          {points.map((p, i) => {
            const q = points[i + 1] || (points.length === 4 ? points[0] : null);
            return q ? <line key={`l${i}`} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke="#111" strokeWidth={r / 2.2} opacity=".55" /> : null;
          })}
          {points.map((p, i) => {
            const q = points[i + 1] || (points.length === 4 ? points[0] : null);
            return q ? <line key={`k${i}`} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke={color} strokeWidth={r / 4.5} /> : null;
          })}
          {points.map((p, i) => (
            <g
              key={i} className="pt" tabIndex={0} role="button"
              aria-label={`Corner ${i + 1}, ${CORNERS[i]}. Arrow keys adjust; hold Shift for bigger steps.`}
              onPointerDown={dotDown(i)} onKeyDown={key(i)} onFocus={() => setSel(i)}
            >
              <circle cx={p[0]} cy={p[1]} r={r * 2.2} fill="transparent" />
              <circle className="ring" cx={p[0]} cy={p[1]} r={r} fill="#111" stroke={sel === i ? "#fff" : color} strokeWidth={r / 4} />
              <circle cx={p[0]} cy={p[1]} r={r / 6} fill={color} />
              <text x={p[0] + r * 1.3} y={p[1] - r * 1.1} fontSize={r * 1.3} fontWeight="700" fill="#fff" stroke="#111" strokeWidth={r / 6} paintOrder="stroke" fontFamily="Manrope, sans-serif">{i + 1}</text>
            </g>
          ))}
          {loupeAt && (
            <g pointerEvents="none">
              <clipPath id="loupe-clip"><circle cx={loupeAt[0]} cy={loupeAt[1]} r={loupeR} /></clipPath>
              <g clipPath="url(#loupe-clip)">
                <rect x={loupeAt[0] - loupeR} y={loupeAt[1] - loupeR} width={loupeR * 2} height={loupeR * 2} fill="#222" />
                <image href={src} width={w} height={h} preserveAspectRatio="none"
                  transform={`translate(${loupeAt[0]} ${loupeAt[1]}) scale(${Z}) translate(${-lp[0]} ${-lp[1]})`} />
              </g>
              <circle cx={loupeAt[0]} cy={loupeAt[1]} r={loupeR} fill="none" stroke="#fff" strokeWidth={r / 4} />
              <path d={`M${loupeAt[0] - r} ${loupeAt[1]}h${2 * r}M${loupeAt[0]} ${loupeAt[1] - r}v${2 * r}`} stroke="#fff" strokeWidth={r / 6} />
            </g>
          )}
        </svg>
      </div>

      <div className="annot-bar">
        <div className="annot-tools">
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => onChange(points.slice(0, -1))} disabled={!points.length}>Undo</button>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => { onChange([]); setSel(null); }} disabled={!points.length}>Reset</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="small muted">{sel != null && points[sel] ? `Adjust corner ${sel + 1}` : "Select a corner to adjust"}</span>
          <div className="nudge" aria-label="Adjust selected corner">
            <span />
            <button type="button" aria-label="Move up" disabled={sel == null} onClick={() => nudge(sel, 0, -stepPx)}>↑</button>
            <span />
            <button type="button" aria-label="Move left" disabled={sel == null} onClick={() => nudge(sel, -stepPx, 0)}>←</button>
            <button type="button" aria-label="Move down" disabled={sel == null} onClick={() => nudge(sel, 0, stepPx)}>↓</button>
            <button type="button" aria-label="Move right" disabled={sel == null} onClick={() => nudge(sel, stepPx, 0)}>→</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CornerGuide({ count }) {
  return (
    <div className="corner-guide" aria-live="polite">
      {CORNERS.map((c, i) => (
        <span key={c} className={i < count ? "done" : i === count ? "cur" : ""}>
          <i>{i + 1}</i>{c}
        </span>
      ))}
    </div>
  );
}
