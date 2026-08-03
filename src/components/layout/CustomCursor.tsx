"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Desktop-only cursor: a small copper dot with a trailing ring that grows over
 * interactive elements. Never mounts on touch devices or under reduced motion,
 * and the native cursor is only hidden once this is actually running.
 */
export function CustomCursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!fine.matches || reduced.matches) return;

    setEnabled(true);
    document.documentElement.dataset.cursor = "on";

    const pointer = { x: innerWidth / 2, y: innerHeight / 2 };
    const trail = { ...pointer };
    let scale = 1;
    let targetScale = 1;
    let frame = 0;

    const onMove = (event: PointerEvent) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      if (dot.current) {
        dot.current.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0) translate(-50%, -50%)`;
      }
    };

    const interactive = 'a, button, [role="button"], input, textarea, select, summary, [data-cursor-label]';

    const onOver = (event: PointerEvent) => {
      const el = (event.target as HTMLElement | null)?.closest?.<HTMLElement>(interactive);
      targetScale = el ? 1.9 : 1;
      setLabel(el?.dataset.cursorLabel ?? null);
    };

    const render = () => {
      trail.x += (pointer.x - trail.x) * 0.16;
      trail.y += (pointer.y - trail.y) * 0.16;
      scale += (targetScale - scale) * 0.14;
      if (ring.current) {
        ring.current.style.transform = `translate3d(${trail.x}px, ${trail.y}px, 0) translate(-50%, -50%) scale(${scale})`;
      }
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);

    const onLeave = () => {
      if (dot.current) dot.current.style.opacity = "0";
      if (ring.current) ring.current.style.opacity = "0";
    };
    const onEnter = () => {
      if (dot.current) dot.current.style.opacity = "1";
      if (ring.current) ring.current.style.opacity = "1";
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    document.addEventListener("pointerenter", onEnter);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("pointerenter", onEnter);
      delete document.documentElement.dataset.cursor;
    };
  }, []);

  if (!enabled) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[110] hidden lg:block">
      <div
        ref={ring}
        className="absolute top-0 left-0 flex h-9 w-9 items-center justify-center rounded-full
                   border border-copper-500/60 backdrop-invert-[0.06] transition-opacity duration-300"
      >
        {label && (
          <span className="font-sans text-[0.4rem] font-medium tracking-[0.14em] text-copper-500 uppercase">
            {label}
          </span>
        )}
      </div>
      <div
        ref={dot}
        className="absolute top-0 left-0 h-1.5 w-1.5 rounded-full bg-copper-500 transition-opacity duration-300"
      />
    </div>
  );
}
