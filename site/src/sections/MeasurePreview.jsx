import { motion, useReducedMotion } from "framer-motion";
import ImageSlot from "../components/ImageSlot.jsx";
import { Arrow, EASE, Reveal } from "../components/motion.jsx";
import { estimateItem, roundTo } from "../lib/estimate.js";
import { money } from "../lib/units.js";
import { PRICING } from "../config/pricing.js";

// Illustrative corners (viewBox 400x300) roughly matching the placeholder window art.
const P = [[124, 55], [276, 55], [276, 248], [124, 248]];
const EX = { service: "install", kind: "window", type: "double-hung", material: "vinyl", glass: "low-e", widthIn: 36, heightIn: 60, qty: 1, finishing: "trim & caulk" };

export default function MeasurePreview() {
  const reduce = useReducedMotion();
  const est = estimateItem(EX);
  const t = (d) => ({ duration: reduce ? 0.01 : 0.6, ease: EASE, delay: reduce ? 0 : d });
  const view = { once: true, amount: 0.5 };

  return (
    <section className="section bg-stone" aria-labelledby="mp-h">
      <div className="wrap mprev">
        <div className="mprev-stage">
          <ImageSlot id="measureWindow" showTag={false} />
          <svg className="overlay" viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden="true">
            {P.map((p, i) => {
              const q = P[(i + 1) % 4];
              return (
                <motion.line key={`l${i}`} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke="#1b1a19" strokeWidth="1.4" vectorEffect="non-scaling-stroke"
                  initial={{ pathLength: 0, opacity: 0 }} whileInView={{ pathLength: 1, opacity: 1 }} viewport={view} transition={t(1.2 + i * 0.18)} />
              );
            })}
            {P.map((p, i) => (
              <motion.g key={`p${i}`} initial={{ opacity: 0, scale: 0.4 }} whileInView={{ opacity: 1, scale: 1 }} viewport={view} transition={t(0.3 + i * 0.2)} style={{ transformOrigin: `${p[0]}px ${p[1]}px` }}>
                <circle cx={p[0]} cy={p[1]} r="9" fill="#1b1a19" />
                <text x={p[0]} y={p[1] + 3.5} textAnchor="middle" fontSize="10" fontWeight="700" fill="#fbf9f5" fontFamily="Manrope, sans-serif">{i + 1}</text>
              </motion.g>
            ))}
            <motion.g initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={view} transition={t(2.1)} fontFamily="Manrope, sans-serif" fontSize="10" fill="#1b1a19">
              <line x1="124" y1="40" x2="276" y2="40" stroke="#1b1a19" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
              <rect x="176" y="31" width="48" height="16" fill="#fbf9f5" />
              <text x="200" y="43" textAnchor="middle">36 in</text>
              <line x1="292" y1="55" x2="292" y2="248" stroke="#1b1a19" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
              <rect x="276" y="143" width="44" height="16" fill="#fbf9f5" />
              <text x="298" y="155" textAnchor="middle">60 in</text>
            </motion.g>
          </svg>
          <span className="demo-flag" style={{ position: "absolute", left: 12, top: 12, zIndex: 5 }}>Demonstration</span>
          <motion.div className="mprev-card" initial={{ opacity: 0, y: reduce ? 0 : 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={view} transition={t(2.6)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span className="eyebrow" style={{ fontSize: 10 }}>Example estimate</span>
              {PRICING.isDemo && <span className="demo-flag" style={{ fontSize: 9 }}>Demo pricing</span>}
            </div>
            <div className="row"><span>Double-hung, vinyl</span><span>36 × 60 in</span></div>
            <div className="row"><span>Low-E glass · trim & caulk</span><span>× 1</span></div>
            <div className="total">{money(roundTo(est.low))} – {money(roundTo(est.high))}</div>
          </motion.div>
        </div>
        <div>
          <Reveal><p className="eyebrow">Measure & estimate</p></Reveal>
          <Reveal delay={0.08}><h2 className="display h-lg" id="mp-h" style={{ margin: "20px 0 26px" }}>Four corners to a <em>clear first number.</em></h2></Reveal>
          <Reveal delay={0.14}>
            <p className="lede">Mark the corners of your window or door on a photo, confirm your measurements, choose a few options, and see a preliminary price range — before we ask for any contact details.</p>
            <p className="small muted" style={{ marginTop: 18 }}>This sequence is an illustrative demonstration. Approximate measurements. Professional verification required before ordering.</p>
            <div style={{ marginTop: 34 }}><a className="btn" href="#estimate">Start Measure & Estimate <Arrow /></a></div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
