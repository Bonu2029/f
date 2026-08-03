"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";
import {
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type Variants,
} from "framer-motion";

export const EASE_EDITORIAL = [0.22, 1, 0.36, 1] as const;

/**
 * `useReducedMotion` reports the real preference on the client's very first
 * render, but the server always renders as "no preference". Anything that
 * feeds `initial` props, inline styles or the element tree must therefore use
 * this instead: it matches the server until after hydration, then flips to the
 * real value so the motion is dropped a tick later. Effect-only code can keep
 * using the plain hook.
 */
export function useSafeReducedMotion() {
  const reduced = useReducedMotion();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated && Boolean(reduced);
}

/* ── Scroll reveal ─────────────────────────────────────────── */

type RevealProps = {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  delay?: number;
  /** Distance travelled on entry, in px. */
  y?: number;
  once?: boolean;
};

export function Reveal({
  children,
  className,
  as = "div",
  delay = 0,
  y = 28,
  once = true,
}: RevealProps) {
  const reduced = useSafeReducedMotion();
  const Component = motion[as as "div"] ?? motion.div;

  return (
    <Component
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-12% 0px -12% 0px" }}
      transition={{ duration: reduced ? 0 : 0.85, delay: reduced ? 0 : delay, ease: EASE_EDITORIAL }}
    >
      {children}
    </Component>
  );
}

/* ── Staggered groups ──────────────────────────────────────── */

export function Stagger({
  children,
  className,
  gap = 0.08,
  delay = 0,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  gap?: number;
  delay?: number;
  as?: ElementType;
}) {
  const Component = motion[as as "div"] ?? motion.div;
  return (
    <Component
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
      variants={{ show: { transition: { staggerChildren: gap, delayChildren: delay } } }}
    >
      {children}
    </Component>
  );
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE_EDITORIAL } },
};

export function StaggerItem({
  children,
  className,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: ElementType;
}) {
  const reduced = useSafeReducedMotion();
  const Component = motion[as as "div"] ?? motion.div;
  return (
    <Component
      className={className}
      variants={
        reduced
          ? { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0 } } }
          : staggerItem
      }
    >
      {children}
    </Component>
  );
}

/* ── Line-by-line masked heading ───────────────────────────── */

export function MaskedLines({
  lines,
  className = "",
  lineClassName = "",
  delay = 0,
  id,
  as: Tag = "h2",
}: {
  lines: ReactNode[];
  className?: string;
  lineClassName?: string;
  delay?: number;
  id?: string;
  as?: ElementType;
}) {
  const reduced = useSafeReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px -15% 0px" });

  return (
    <Tag className={className} id={id}>
      <span ref={ref} className="block">
        {lines.map((line, i) => (
          <span key={i} className={`block overflow-hidden ${lineClassName}`}>
            <motion.span
              className="block will-change-transform"
              initial={{ y: "110%" }}
              animate={inView ? { y: "0%" } : undefined}
              transition={{
                duration: reduced ? 0 : 1,
                delay: delay + i * 0.09,
                ease: EASE_EDITORIAL,
              }}
            >
              {line}
            </motion.span>
          </span>
        ))}
      </span>
    </Tag>
  );
}

/* ── Parallax ──────────────────────────────────────────────── */

/** Returns a spring-damped translateY for gentle image parallax. */
export function useParallax(strength = 60) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useSafeReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const raw = useTransform(scrollYProgress, [0, 1], [strength, -strength]);
  const y = useSpring(raw, { stiffness: 90, damping: 24, mass: 0.4 });
  return { ref, y: reduced ? 0 : y };
}

/* ── Magnetic pointer pull ─────────────────────────────────── */

export function useMagnetic<T extends HTMLElement>(strength = 0.28) {
  const ref = useRef<T>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    let frame = 0;
    const move = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const x = (event.clientX - (rect.left + rect.width / 2)) * strength;
        const y = (event.clientY - (rect.top + rect.height / 2)) * strength;
        el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      });
    };
    const reset = () => {
      cancelAnimationFrame(frame);
      el.style.transform = "translate3d(0, 0, 0)";
    };

    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", reset);
    el.addEventListener("blur", reset);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", reset);
      el.removeEventListener("blur", reset);
    };
  }, [reduced, strength]);

  return ref;
}

/* ── Count-up ──────────────────────────────────────────────── */

export function CountUp({
  to,
  suffix = "",
  duration = 1.6,
  className,
}: {
  to: number;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20% 0px" });
  const reduced = useReducedMotion();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setValue(to);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / (duration * 1000));
      const eased = 1 - (1 - p) ** 3;
      setValue(Math.round(to * eased));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, to, duration, reduced]);

  return (
    <span ref={ref} className={className}>
      {value.toLocaleString("en-GB")}
      {suffix}
    </span>
  );
}
