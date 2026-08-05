"use client";

import { useRef, type ReactNode, type ElementType } from "react";
import { gsap, ScrollTrigger, registerGsap, useIsoLayoutEffect, prefersReducedMotion } from "@/lib/gsap";
import { useNearViewport } from "@/lib/useNearViewport";

/**
 * Reveal variants. The brief asks that no two sections enter the same way, so
 * each section picks a different one rather than everything fading up.
 */
export type RevealVariant =
  | "rise" // lifts from below
  | "unveil" // clip-path curtain, bottom to top
  | "drape" // falls with a slight rotation, like fabric
  | "bloom" // scales open from 96% with a blur
  | "slide-left"
  | "slide-right"
  | "stagger-children"
  | "mask-wipe"; // horizontal clip wipe

type Props = {
  children: ReactNode;
  variant?: RevealVariant;
  as?: ElementType;
  className?: string;
  delay?: number;
  /** Scroll position that triggers the reveal. */
  start?: string;
  /** Only for `stagger-children` — the selector of the items to stagger. */
  childSelector?: string;
};

export default function Reveal({
  children,
  variant = "rise",
  as: Tag = "div",
  className = "",
  delay = 0,
  start = "top 82%",
  childSelector = ":scope > *",
}: Props) {
  const ref = useRef<HTMLElement>(null);
  const ready = useNearViewport(ref);

  useIsoLayoutEffect(() => {
    if (!ready) return;
    registerGsap();
    const el = ref.current;
    if (!el) return;

    if (prefersReducedMotion()) {
      gsap.set(el, { opacity: 1, clearProps: "all" });
      return;
    }

    const ctx = gsap.context(() => {
      const common = {
        scrollTrigger: { trigger: el, start, once: true },
        delay,
      } as const;

      switch (variant) {
        case "unveil":
          gsap.fromTo(
            el,
            { opacity: 1, clipPath: "inset(100% 0% 0% 0%)", y: 40 },
            { clipPath: "inset(0% 0% 0% 0%)", y: 0, duration: 1.5, ...common },
          );
          break;

        case "mask-wipe":
          gsap.fromTo(
            el,
            { opacity: 1, clipPath: "inset(0% 100% 0% 0%)" },
            { clipPath: "inset(0% 0% 0% 0%)", duration: 1.4, ease: "drape", ...common },
          );
          break;

        case "drape":
          gsap.fromTo(
            el,
            { opacity: 0, y: 70, rotate: 2.4, transformOrigin: "left top" },
            { opacity: 1, y: 0, rotate: 0, duration: 1.4, ...common },
          );
          break;

        case "bloom":
          gsap.fromTo(
            el,
            { opacity: 0, scale: 0.955, filter: "blur(14px)" },
            { opacity: 1, scale: 1, filter: "blur(0px)", duration: 1.5, ...common },
          );
          break;

        case "slide-left":
          gsap.fromTo(
            el,
            { opacity: 0, x: -80 },
            { opacity: 1, x: 0, duration: 1.3, ...common },
          );
          break;

        case "slide-right":
          gsap.fromTo(
            el,
            { opacity: 0, x: 80 },
            { opacity: 1, x: 0, duration: 1.3, ...common },
          );
          break;

        case "stagger-children": {
          gsap.set(el, { opacity: 1 });
          const items = el.querySelectorAll(childSelector);
          gsap.fromTo(
            items,
            { opacity: 0, y: 46, filter: "blur(6px)" },
            {
              opacity: 1,
              y: 0,
              filter: "blur(0px)",
              duration: 1.1,
              stagger: 0.09,
              ...common,
            },
          );
          break;
        }

        case "rise":
        default:
          gsap.fromTo(
            el,
            { opacity: 0, y: 52 },
            { opacity: 1, y: 0, duration: 1.2, ...common },
          );
      }
    }, el);

    return () => {
      ctx.revert();
      ScrollTrigger.refresh();
    };
  }, [ready, variant, delay, start, childSelector]);

  return (
    <Tag ref={ref} className={`will-reveal ${className}`}>
      {children}
    </Tag>
  );
}
