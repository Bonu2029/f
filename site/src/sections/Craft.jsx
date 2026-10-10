import { useEffect, useRef, useState } from "react";
import ImageSlot from "../components/ImageSlot.jsx";
import { Reveal } from "../components/motion.jsx";

/* Copy speaks to qualities and choices — no invented product specifications. */
const STEPS = [
  {
    img: "craftAppearance", k: "Appearance",
    title: <>Proportion, profile <em>and finish.</em></>,
    body: "Sightlines, trim profiles, grille patterns and colour all change how an opening reads from the street and from your sofa. We help you weigh them against the character of your home.",
    dl: [["Consider", "Frame & sash profile"], ["Consider", "Grille / divided-light pattern"], ["Consider", "Interior & exterior colour"], ["Consider", "Trim and casing style"]],
  },
  {
    img: "craftFunction", k: "Function",
    title: <>How it opens, closes <em>and seals.</em></>,
    body: "Operation style affects ventilation, cleaning, furniture placement and security. A well-fitted unit should move smoothly, lock confidently, and keep weather where it belongs.",
    dl: [["Operation", "Hung, casement, sliding, awning"], ["Doors", "Swing, sliding, French"], ["Fit", "Squared, shimmed, sealed"], ["Use", "Ventilation & easy cleaning"]],
  },
  {
    img: "craftOptions", k: "Options",
    title: <>Materials, glass <em>and hardware.</em></>,
    body: "Each material and glass package carries its own look, maintenance and budget. We'll explain the trade-offs plainly and show you physical samples — so choices are made with your hands, not a brochure.",
    dl: [["Materials", "Wood, clad, fiberglass, vinyl, steel"], ["Glass", "Energy, privacy, decorative"], ["Hardware", "Finishes & styles"], ["See them", "Mobile showroom samples"]],
  },
];

export default function Craft() {
  const [active, setActive] = useState(0);
  const refs = useRef([]);
  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && setActive(Number(e.target.dataset.i))),
      { rootMargin: "-45% 0px -45% 0px" },
    );
    refs.current.forEach((r) => r && io.observe(r));
    return () => io.disconnect();
  }, []);

  return (
    <section className="section bg-paper" aria-labelledby="craft-h" style={{ paddingBottom: "8vh" }}>
      <div className="wrap">
        <Reveal>
          <p className="eyebrow">Craftsmanship</p>
          <h2 className="display h-lg" id="craft-h" style={{ marginTop: 20, maxWidth: "14ch" }}>The details you'll <em>live with.</em></h2>
        </Reveal>
        <div className="craft" style={{ marginTop: "6vh" }}>
          <div className="craft-media" aria-hidden="true">
            {STEPS.map((s, i) => (
              <div key={s.img} className={`layer ${i === active ? "" : "off"}`}>
                <ImageSlot id={s.img} />
              </div>
            ))}
            <span className="counter">{String(active + 1).padStart(2, "0")} / 03</span>
          </div>
          <div className="craft-steps">
            {STEPS.map((s, i) => (
              <div key={s.k} className={`craft-step ${i === active ? "on" : ""}`} data-i={i} ref={(el) => (refs.current[i] = el)}>
                <div className="m-img" style={{ display: "none" }}><ImageSlot id={s.img} style={{ height: "100%" }} /></div>
                <p className="eyebrow">0{i + 1} — {s.k}</p>
                <h3 className="display h-md">{s.title}</h3>
                <p className="lede">{s.body}</p>
                <dl>{s.dl.map(([t, d]) => <div key={d}><dt>{t}</dt><dd>{d}</dd></div>)}</dl>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
