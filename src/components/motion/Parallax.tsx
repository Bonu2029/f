"use client";

import { useRef, type ReactNode } from "react";
import { gsap, registerGsap, useIsoLayoutEffect, prefersReducedMotion } from "@/lib/gsap";
import { useNearViewport } from "@/lib/useNearViewport";

type Props = {
  children: ReactNode;
  /** Negative moves against the scroll (foreground), positive with it. */
  speed?: number;
  className?: string;
  /** Adds a slow scale so backgrounds feel like a camera push. */
  zoom?: number;
  rotate?: number;
};

export default function Parallax({
  children,
  speed = -0.18,
  className = "",
  zoom = 0,
  rotate = 0,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const ready = useNearViewport(ref);

  useIsoLayoutEffect(() => {
    if (!ready) return;
    registerGsap();
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      gsap.to(el, {
        yPercent: speed * 100,
        scale: 1 + zoom,
        rotate,
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: "top bottom",
          end: "bottom top",
          scrub: 0.8,
        },
      });
    }, el);

    return () => ctx.revert();
  }, [ready, speed, zoom, rotate]);

  return (
    <div ref={ref} className={className} style={{ willChange: "transform" }}>
      {children}
    </div>
  );
}
