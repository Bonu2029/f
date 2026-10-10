import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1];

export function useIsMobile(q = "(max-width: 760px)") {
  const [m, setM] = useState(() => typeof window !== "undefined" && window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const fn = () => setM(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, [q]);
  return m;
}

/** True when motion should be simplified (reduced-motion users or small screens). */
export function useCalmMotion() {
  const reduce = useReducedMotion();
  const mobile = useIsMobile();
  return { reduce: !!reduce, simple: !!reduce || mobile };
}

/** Short fade + rise as content enters the viewport. */
export function Reveal({ children, delay = 0, y = 24, as = "div", className, style, amount = 0.3, ...rest }) {
  const reduce = useReducedMotion();
  const M = motion[as];
  return (
    <M
      {...rest}
      className={className}
      style={style}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration: reduce ? 0.2 : 0.9, ease: EASE, delay: reduce ? 0 : delay }}
    >
      {children}
    </M>
  );
}

/** Image revealed through a clipping mask, with gentle inner parallax. */
export function ClipReveal({ children, from = "bottom", className = "", style, parallax = 40 }) {
  const ref = useRef(null);
  const { reduce, simple } = useCalmMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], simple ? [0, 0] : [-parallax, parallax]);
  const hidden = {
    bottom: "inset(100% 0% 0% 0%)",
    left: "inset(0% 100% 0% 0%)",
    right: "inset(0% 0% 0% 100%)",
  }[from];
  // The in-view trigger lives on an unclipped wrapper: a fully clipped element
  // reports zero intersection, so it would never reveal itself.
  return (
    <motion.div
      ref={ref}
      className={className}
      style={style}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, amount: 0.2 }}
    >
      <motion.div
        className="clip"
        style={{ height: "100%" }}
        variants={{
          hidden: reduce ? { opacity: 0 } : { clipPath: hidden },
          shown: reduce ? { opacity: 1 } : { clipPath: "inset(0% 0% 0% 0%)" },
        }}
        transition={{ duration: reduce ? 0.2 : 1.3, ease: EASE }}
      >
        <motion.div style={{ y, scale: simple ? 1 : 1.12, height: "100%" }}>{children}</motion.div>
      </motion.div>
    </motion.div>
  );
}

export const Arrow = ({ size = 16 }) => (
  <svg className="arrow" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <path d="M4 12h16M14 6l6 6-6 6" />
  </svg>
);

export { EASE };
