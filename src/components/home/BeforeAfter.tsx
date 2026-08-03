"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MediaAsset } from "@/lib/media";

/**
 * Draggable before/after wipe. Works with pointer, touch and the arrow keys,
 * and exposes the position through a real range input for assistive tech.
 */
export function BeforeAfter({
  before,
  after,
  beforeAlt,
  afterAlt,
  className = "",
  sizes = "(max-width: 768px) 92vw, 60vw",
}: {
  before: MediaAsset;
  after: MediaAsset;
  beforeAlt: string;
  afterAlt: string;
  className?: string;
  sizes?: string;
}) {
  const [position, setPosition] = useState(50);
  const [dragging, setDragging] = useState(false);
  const frame = useRef<HTMLDivElement>(null);

  const setFromClientX = useCallback((clientX: number) => {
    const rect = frame.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, pct)));
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => setFromClientX(e.clientX);
    const stop = () => setDragging(false);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, [dragging, setFromClientX]);

  return (
    <figure className={className}>
      <div
        ref={frame}
        onPointerDown={(e) => {
          setDragging(true);
          setFromClientX(e.clientX);
        }}
        className="relative aspect-[4/5] w-full touch-none overflow-hidden rounded-2xl bg-navy-900 select-none sm:aspect-[16/10]"
      >
        {/* After sits underneath, revealed as the handle moves left */}
        <Image
          src={after.src}
          alt={afterAlt}
          fill
          sizes={sizes}
          placeholder="blur"
          blurDataURL={after.blurDataURL}
          className="object-cover object-top"
        />

        <div
          className="absolute inset-0 will-change-[clip-path]"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        >
          <Image
            src={before.src}
            alt={beforeAlt}
            fill
            sizes={sizes}
            placeholder="blur"
            blurDataURL={before.blurDataURL}
            className="object-cover object-top"
          />
        </div>

        {/* Labels */}
        <span className="pointer-events-none absolute top-4 left-4 rounded-full bg-navy-950/70 px-3 py-1.5 font-sans text-[0.5625rem] tracking-[0.18em] text-ivory-100 uppercase backdrop-blur-sm">
          Before
        </span>
        <span className="pointer-events-none absolute top-4 right-4 rounded-full bg-copper-500/90 px-3 py-1.5 font-sans text-[0.5625rem] tracking-[0.18em] text-ivory-50 uppercase backdrop-blur-sm">
          After
        </span>

        {/* Handle */}
        <div
          className="pointer-events-none absolute inset-y-0 w-px bg-ivory-100/90"
          style={{ left: `${position}%` }}
        >
          <span
            className={`absolute top-1/2 left-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2
                        items-center justify-center rounded-full border border-ivory-100/70
                        bg-navy-950/60 backdrop-blur-sm transition-transform duration-200 ${
                          dragging ? "scale-110" : ""
                        }`}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-ivory-100" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 7 5 12l4 5M15 7l4 5-4 5" />
            </svg>
          </span>
        </div>
      </div>

      <label className="mt-4 flex items-center gap-3 text-[0.6875rem] tracking-[0.14em] text-navy-800/55 uppercase">
        <span className="shrink-0">Drag to compare</span>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(position)}
          onChange={(e) => setPosition(Number(e.target.value))}
          aria-label="Reveal the before and after photograph"
          className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-navy-900/15 accent-copper-500"
        />
      </label>
    </figure>
  );
}
