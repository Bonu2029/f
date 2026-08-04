"use client";

import { useRef } from "react";
import { gsap, registerGsap, useIsoLayoutEffect, prefersReducedMotion } from "@/lib/gsap";

const STRANDS = [
  { d: "M -100 180 C 260 60, 640 300, 1060 140 S 1700 260, 2020 120", w: 1.4, o: 0.30, c: "#C9998C" },
  { d: "M -100 300 C 300 180, 700 420, 1100 260 S 1720 380, 2020 240", w: 1.0, o: 0.24, c: "#D9A273" },
  { d: "M -100 430 C 240 320, 720 560, 1120 400 S 1760 520, 2020 380", w: 1.8, o: 0.20, c: "#E2CBAB" },
  { d: "M -100 560 C 340 460, 760 700, 1160 540 S 1740 660, 2020 520", w: 0.9, o: 0.26, c: "#B3C3AA" },
  { d: "M -100 690 C 280 600, 700 830, 1120 670 S 1780 790, 2020 650", w: 1.5, o: 0.18, c: "#A89FC0" },
  { d: "M -100 810 C 360 720, 780 950, 1180 800 S 1760 900, 2020 780", w: 1.1, o: 0.22, c: "#C9998C" },
];

/**
 * The hair motif. Long beziers that drift, breathe and draw themselves in —
 * they sit behind the hero and read as strands catching light rather than as
 * a decorative squiggle.
 */
export default function HairStrands({
  className = "",
  draw = true,
}: {
  className?: string;
  draw?: boolean;
}) {
  const ref = useRef<SVGSVGElement>(null);

  useIsoLayoutEffect(() => {
    registerGsap();
    const el = ref.current;
    if (!el) return;

    if (prefersReducedMotion()) {
      gsap.set(el.querySelectorAll("path"), { drawSVG: "100%", opacity: 0.5 });
      return;
    }

    const ctx = gsap.context(() => {
      const paths = gsap.utils.toArray<SVGPathElement>("path", el);

      if (draw) {
        gsap.fromTo(
          paths,
          { drawSVG: "0% 0%" },
          {
            drawSVG: "0% 100%",
            duration: 3.4,
            stagger: 0.16,
            ease: "power2.inOut",
            delay: 0.2,
          },
        );
      }

      // Each strand breathes on its own clock so the field never pulses.
      paths.forEach((path, i) => {
        gsap.to(path, {
          y: i % 2 === 0 ? 26 : -22,
          scaleY: 1.05,
          transformOrigin: "center",
          duration: 9 + i * 1.7,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          delay: i * 0.4,
        });
      });
    }, el);

    return () => ctx.revert();
  }, [draw]);

  return (
    <svg
      ref={ref}
      aria-hidden
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      viewBox="0 0 1920 960"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
    >
      {STRANDS.map((s, i) => (
        <path
          key={i}
          d={s.d}
          stroke={s.c}
          strokeWidth={s.w}
          strokeLinecap="round"
          opacity={s.o}
        />
      ))}
    </svg>
  );
}
