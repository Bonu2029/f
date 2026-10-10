import { useEffect, useRef, useState } from "react";

const TEXT =
  "Windows and doors shape how a home feels — the light in the morning, the quiet at night, the first impression at the curb. We install, repair, and restore them with the care your home deserves.";

/** Words brighten as the paragraph scrolls through view (native scroll, no pinning). */
export default function Statement() {
  const ref = useRef(null);
  const words = TEXT.split(" ");
  const [lit, setLit] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setLit(words.length); return; }
    const fn = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
      setLit(Math.round(p * words.length));
    };
    fn();
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, [words.length]);

  return (
    <section className="section bg-paper" id="intro" aria-labelledby="intro-h">
      <div className="wrap statement">
        <p className="eyebrow" id="intro-h">Our approach</p>
        <p className="big" ref={ref} aria-label={TEXT}>
          {words.map((w, i) => (
            <span key={i} aria-hidden="true" className={`w ${i < lit ? "on" : ""}`}>{w} </span>
          ))}
        </p>
      </div>
    </section>
  );
}
