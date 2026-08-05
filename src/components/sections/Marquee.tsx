"use client";

import { useRef } from "react";
import { marqueeWords } from "@/lib/content";
import { gsap, registerGsap, useIsoLayoutEffect, prefersReducedMotion } from "@/lib/gsap";

/**
 * The band between hero and services. It scrolls on its own, and the scroll
 * position skews it slightly — a small trick that makes the page feel like one
 * continuous surface rather than stacked blocks.
 */
export default function Marquee() {
  const ref = useRef<HTMLDivElement>(null);
  const words = [...marqueeWords, ...marqueeWords];

  useIsoLayoutEffect(() => {
    registerGsap();
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      gsap.to(el, {
        skewX: -6,
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: "top bottom",
          end: "bottom top",
          scrub: 1.2,
        },
      });
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <div
      aria-hidden
      data-decor
      className="relative overflow-hidden border-y border-taupe/50 bg-ivory py-[clamp(1.5rem,3vw,2.75rem)]"
    >
      <div ref={ref} className="mask-fade-x flex w-max animate-marquee will-change-transform">
        {words.map((word, i) => (
          <span key={i} className="flex items-center">
            <span className="px-[clamp(1.25rem,3vw,3rem)] font-display text-[clamp(1.5rem,3.6vw,3rem)] leading-none text-graphite/85">
              {word}
            </span>
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{
                background: ["#EFE0CB", "#E6C6BD", "#B3C3AA", "#D2CCDD", "#D9D0C4", "#D9A273", "#E2CBAB"][
                  i % 7
                ],
              }}
            />
          </span>
        ))}
      </div>
    </div>
  );
}
