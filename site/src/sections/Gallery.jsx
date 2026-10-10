import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ImageSlot from "../components/ImageSlot.jsx";
import { IMAGES } from "../config/images.js";
import { EASE, Reveal } from "../components/motion.jsx";

const ITEMS = Object.entries(IMAGES).filter(([k]) => k.startsWith("gallery")).map(([id, v]) => ({ id, ...v }));
const CATS = ["All", "Windows", "Doors", "Restoration"];

export default function Gallery() {
  const [cat, setCat] = useState("All");
  const [idx, setIdx] = useState(null);
  const list = ITEMS.filter((i) => cat === "All" || i.category === cat);
  const lastFocus = useRef(null);
  const closeRef = useRef(null);

  const close = useCallback(() => { setIdx(null); lastFocus.current?.focus(); }, []);
  const step = useCallback((d) => setIdx((i) => (i + d + list.length) % list.length), [list.length]);

  useEffect(() => {
    if (idx == null) return;
    closeRef.current?.focus();
    document.body.style.overflow = "hidden";
    const fn = (e) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", fn);
    return () => { window.removeEventListener("keydown", fn); document.body.style.overflow = ""; };
  }, [idx, close, step]);

  return (
    <section className="section" id="gallery" aria-labelledby="gal-h">
      <div className="wrap">
        <div className="sec-head">
          <Reveal>
            <p className="eyebrow">Projects</p>
            <h2 className="display h-lg" id="gal-h">Recent <em>work.</em></h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="lede">A selection of windows, doors and restorations. Images shown are demonstration placeholders until real project photography is added.</p>
            <div className="filters" role="group" aria-label="Filter projects" style={{ marginTop: 24 }}>
              {CATS.map((c) => <button key={c} aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>)}
            </div>
          </Reveal>
        </div>
        <motion.div className="gal" layout>
          <AnimatePresence mode="popLayout">
            {list.map((it, i) => (
              <motion.button
                layout key={it.id} className="g"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: EASE }}
                onClick={(e) => { lastFocus.current = e.currentTarget; setIdx(i); }}
                aria-label={`Open ${it.alt}`}
              >
                <ImageSlot id={it.id} />
                <div className="cap"><span>{it.alt.replace("Project — ", "")}</span><span className="muted">{it.category}</span></div>
              </motion.button>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>

      <AnimatePresence>
        {idx != null && list[idx] && (
          <motion.div className="lightbox" role="dialog" aria-modal="true" aria-label="Project viewer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="lb-top">
              <span className="small">{idx + 1} / {list.length} · {list[idx].alt.replace("Project — ", "")}</span>
              <button ref={closeRef} className="icon-btn" onClick={close} aria-label="Close viewer">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 5l14 14M19 5L5 19" /></svg>
              </button>
            </div>
            <div className="lb-stage">
              <button className="icon-btn" onClick={() => step(-1)} aria-label="Previous project">‹</button>
              <motion.div key={list[idx].id} className="lb-img" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease: EASE }}>
                <ImageSlot id={list[idx].id} />
              </motion.div>
              <button className="icon-btn" onClick={() => step(1)} aria-label="Next project">›</button>
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 12, paddingBottom: 20 }}>
              <button className="btn btn-sm btn-outline-light" onClick={() => step(-1)}>Previous</button>
              <button className="btn btn-sm btn-outline-light" onClick={() => step(1)}>Next</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
