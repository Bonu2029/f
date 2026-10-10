import { useState } from "react";
import ImageSlot from "../components/ImageSlot.jsx";
import { Arrow, ClipReveal, Reveal } from "../components/motion.jsx";

export default function Restoration() {
  return (
    <section className="section on-dark" id="restoration" aria-labelledby="resto-h">
      <div className="wrap">
        <div className="resto-top">
          <ClipReveal from="bottom" className="resto-wood"><ImageSlot id="restoreWood" tone="dark" /></ClipReveal>
          <div className="resto-copy">
            <Reveal><p className="eyebrow">Historic window & door restoration</p></Reveal>
            <Reveal delay={0.08}><h2 className="display h-lg" id="resto-h" style={{ margin: "20px 0 30px" }}>Preserve the <em>character</em> that makes it home.</h2></Reveal>
            <Reveal delay={0.14}>
              <p className="lede">Original windows and doors are often made from dense, old-growth wood and carry details that can't be bought new. Where they can be saved, careful restoration keeps that history working.</p>
              <p className="lede">Every piece is different, so we begin with an honest assessment — what can be restored, what should be repaired, and where replacement may be the wiser choice.</p>
            </Reveal>
            <Reveal delay={0.2}>
              <div className="resto-list">
                <div><b>Assess</b><span>Condition of wood, glass, glazing and hardware</span></div>
                <div><b>Repair</b><span>Consolidate or replace damaged sections of wood</span></div>
                <div><b>Reglaze & refit</b><span>Re-set glass, free stuck sashes, adjust operation</span></div>
                <div><b>Refinish</b><span>Prepare and finish to suit the house</span></div>
              </div>
              <div style={{ marginTop: 40, display: "flex", gap: 12, flexWrap: "wrap" }}>
                <a className="btn btn-light" href="#book">Request a Restoration Assessment <Arrow /></a>
              </div>
            </Reveal>
          </div>
        </div>

        <Reveal style={{ marginTop: "clamp(72px, 10vw, 140px)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 20, flexWrap: "wrap", marginBottom: 22 }}>
            <h3 className="display h-sm">Before & after</h3>
            <span className="demo-flag light">Demonstration images — real project photos to come</span>
          </div>
          <BeforeAfter />
          <p className="small" style={{ marginTop: 14, color: "var(--on-dark-dim)" }}>Drag the handle, or focus it and use the arrow keys, to compare.</p>
        </Reveal>
      </div>
    </section>
  );
}

function BeforeAfter() {
  const [v, setV] = useState(50);
  return (
    <div className="ba">
      <ImageSlot id="restoreBefore" tone="dark" showTag={false} />
      <div className="after-clip" style={{ clipPath: `inset(0 0 0 ${v}%)` }}>
        <ImageSlot id="restoreAfter" showTag={false} />
      </div>
      <span className="lbl" style={{ left: 16 }}>Before</span>
      <span className="lbl" style={{ right: 16 }}>After</span>
      <div className="handle" style={{ left: `${v}%` }}>
        <span className="knob" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 6l-6 6 6 6M15 6l6 6-6 6" /></svg>
        </span>
      </div>
      <input
        type="range" min="0" max="100" step="1" value={v}
        onChange={(e) => setV(Number(e.target.value))}
        aria-label="Before and after comparison. Lower values show more of the before image."
        aria-valuetext={`${v}% before`}
      />
    </div>
  );
}
