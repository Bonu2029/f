"use client";

import { useRef } from "react";
import { gsap, registerGsap, useIsoLayoutEffect, prefersReducedMotion } from "@/lib/gsap";

type Shape = "swell" | "petal" | "wave" | "arc";

const PATHS: Record<Shape, string> = {
  // A soft rise, like the top of a shoulder.
  swell: "M0,64 C240,4 480,4 720,40 C960,76 1200,76 1440,20 L1440,120 L0,120 Z",
  // Two gentle lobes.
  petal: "M0,88 C180,88 240,10 420,10 C600,10 660,74 840,74 C1020,74 1080,6 1260,6 C1350,6 1400,26 1440,44 L1440,120 L0,120 Z",
  wave: "M0,40 C160,90 320,0 480,44 C640,88 800,8 960,48 C1120,88 1280,20 1440,56 L1440,120 L0,120 Z",
  arc: "M0,120 C360,10 1080,10 1440,120 Z",
};

/**
 * Section dividers. Never a straight edge — the page is stitched together with
 * curves, and a copper hairline draws itself across each one on scroll.
 */
export default function Divider({
  shape = "swell",
  from = "transparent",
  to = "var(--color-ivory)",
  flip = false,
  hairline = true,
  className = "",
}: {
  shape?: Shape;
  from?: string;
  to?: string;
  flip?: boolean;
  hairline?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useIsoLayoutEffect(() => {
    registerGsap();
    const el = ref.current;
    if (!el || !hairline || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el.querySelector(".rule-copper"),
        { scaleX: 0, transformOrigin: "left center" },
        {
          scaleX: 1,
          duration: 1.8,
          ease: "drape",
          scrollTrigger: { trigger: el, start: "top 92%", once: true },
        },
      );
    }, el);

    return () => ctx.revert();
  }, [hairline]);

  return (
    <div
      ref={ref}
      aria-hidden
      className={`relative w-full ${className}`}
      style={{ background: from }}
    >
      {hairline && (
        <div className="rule-copper absolute left-[8%] right-[8%] top-0 opacity-60" />
      )}
      <svg
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        className="block h-[clamp(48px,7vw,120px)] w-full"
        style={{ transform: flip ? "scaleY(-1)" : undefined }}
      >
        <path d={PATHS[shape]} fill={to} />
      </svg>
    </div>
  );
}
