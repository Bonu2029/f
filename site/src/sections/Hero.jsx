import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import ImageSlot from "../components/ImageSlot.jsx";
import { Arrow, EASE, useCalmMotion } from "../components/motion.jsx";

const lines = [["Exceptional", "windows."], ["Remarkable", "doors."]];

export default function Hero() {
  const ref = useRef(null);
  const { reduce, simple } = useCalmMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  // Gently move "closer to the window" as the visitor scrolls.
  const scale = useTransform(scrollYProgress, [0, 1], simple ? [1, 1.04] : [1, 1.18]);
  const mediaY = useTransform(scrollYProgress, [0, 1], simple ? ["0%", "0%"] : ["0%", "12%"]);
  const textY = useTransform(scrollYProgress, [0, 1], simple ? ["0%", "0%"] : ["0%", "-24%"]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <section className="hero" id="top" ref={ref} aria-label="Introduction">
      <motion.div className="hero-media" style={{ scale, y: mediaY }}>
        <motion.div
          style={{ position: "absolute", inset: 0 }}
          initial={reduce ? false : { scale: 1.08, opacity: 0.4 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 2.2, ease: EASE }}
        >
          <ImageSlot id="heroInterior" priority tone="dark" />
        </motion.div>
      </motion.div>
      <div className="hero-shade" />

      <motion.div className="hero-inner wrap" style={{ y: textY, opacity: textOpacity }}>
        <motion.p
          className="eyebrow"
          style={{ color: "rgba(244,239,230,.8)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 1 }}
        >
          Philadelphia & New Jersey
        </motion.p>
        <h1 className="display h-xl" style={{ marginTop: 22 }}>
          {lines.map((l, i) => (
            <span className="line" key={i}>
              <motion.span
                initial={reduce ? { opacity: 0 } : { y: "105%" }}
                animate={reduce ? { opacity: 1 } : { y: "0%" }}
                transition={{ duration: 1.15, ease: EASE, delay: 0.25 + i * 0.12 }}
              >
                {l[0]} <em>{l[1]}</em>
              </motion.span>
            </span>
          ))}
        </h1>
        <motion.p
          className="lede"
          initial={{ opacity: 0, y: reduce ? 0 : 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.7 }}
        >
          Expert installation, thoughtful repairs, and historic restoration. A showroom experience brought to your home.
        </motion.p>
        <motion.div
          className="hero-actions"
          initial={{ opacity: 0, y: reduce ? 0 : 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.85 }}
        >
          <a className="btn btn-light" href="#estimate">Explore Your Project <Arrow /></a>
          <a className="btn btn-outline-light" href="#book">Book Our Mobile Showroom</a>
        </motion.div>
      </motion.div>

      <motion.div
        className="hero-foot"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 1 }}
      >
        <div className="wrap">
          <a className="scroll-cue" href="#intro"><i aria-hidden="true" /> Scroll to explore</a>
          <nav className="preview" aria-label="Section preview">
            <a href="#services">01 Installation</a>
            <a href="#services">02 Repair</a>
            <a href="#restoration">03 Restoration</a>
            <a href="#showroom">04 Mobile Showroom</a>
          </nav>
        </div>
      </motion.div>
    </section>
  );
}
