"use client";

import { useEffect, useRef } from "react";
import { gsap, registerGsap, prefersReducedMotion } from "@/lib/gsap";

/**
 * Two-part cursor: a precise dot that tracks exactly, and a soft copper glow
 * that lags behind it. Pointer-fine devices only — touch keeps its native
 * behaviour and the system cursor is never removed on those.
 */
export default function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const glow = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => {
    registerGsap();

    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!fine.matches || prefersReducedMotion()) return;

    document.body.dataset.cursor = "on";

    const setters = {
      dotX: gsap.quickTo(dot.current, "x", { duration: 0.12, ease: "power3" }),
      dotY: gsap.quickTo(dot.current, "y", { duration: 0.12, ease: "power3" }),
      ringX: gsap.quickTo(ring.current, "x", { duration: 0.42, ease: "power3" }),
      ringY: gsap.quickTo(ring.current, "y", { duration: 0.42, ease: "power3" }),
      glowX: gsap.quickTo(glow.current, "x", { duration: 0.95, ease: "power2" }),
      glowY: gsap.quickTo(glow.current, "y", { duration: 0.95, ease: "power2" }),
    };

    let visible = false;

    const onMove = (event: PointerEvent) => {
      if (!visible) {
        visible = true;
        gsap.to([dot.current, ring.current, glow.current], {
          opacity: 1,
          duration: 0.5,
        });
      }
      setters.dotX(event.clientX);
      setters.dotY(event.clientY);
      setters.ringX(event.clientX);
      setters.ringY(event.clientY);
      setters.glowX(event.clientX);
      setters.glowY(event.clientY);

      const interactive = (event.target as HTMLElement | null)?.closest(
        "a, button, [data-cursor='link'], input, textarea, select, [role='button']",
      );

      gsap.to(ring.current, {
        scale: interactive ? 1.9 : 1,
        borderColor: interactive
          ? "rgba(154,90,50,0.85)"
          : "rgba(154,90,50,0.35)",
        duration: 0.4,
        ease: "silk",
      });
      gsap.to(dot.current, { scale: interactive ? 0 : 1, duration: 0.3 });
    };

    const onLeave = () => {
      visible = false;
      gsap.to([dot.current, ring.current, glow.current], {
        opacity: 0,
        duration: 0.35,
      });
    };

    const onDown = () => gsap.to(ring.current, { scale: 0.75, duration: 0.2 });
    const onUp = () => gsap.to(ring.current, { scale: 1, duration: 0.35 });

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);

    return () => {
      delete document.body.dataset.cursor;
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[9998] hidden md:block">
      <div
        ref={glow}
        className="absolute -left-40 -top-40 h-80 w-80 rounded-full opacity-0 mix-blend-multiply"
        style={{
          background:
            "radial-gradient(circle, rgba(217,162,115,0.30) 0%, rgba(230,198,189,0.16) 40%, transparent 70%)",
        }}
      />
      <div
        ref={ring}
        className="absolute -left-5 -top-5 h-10 w-10 rounded-full border opacity-0"
        style={{ borderColor: "rgba(154,90,50,0.35)" }}
      />
      <div
        ref={dot}
        className="absolute -left-[3px] -top-[3px] h-1.5 w-1.5 rounded-full bg-copper opacity-0"
      />
    </div>
  );
}
