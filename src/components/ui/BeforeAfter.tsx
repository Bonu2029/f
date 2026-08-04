"use client";

import { useCallback, useRef, useState } from "react";
import Art from "@/components/ui/Art";

/**
 * Before/after comparison. Pointer-drag on the handle, click-anywhere to jump,
 * and a real range input underneath so it works on a keyboard and reads
 * correctly to a screen reader — the usual version of this control does none
 * of those.
 */
export default function BeforeAfter({
  before,
  after,
  label,
  className = "",
  initial = 52,
}: {
  before: string;
  after: string;
  label: string;
  className?: string;
  initial?: number;
}) {
  const [position, setPosition] = useState(initial);
  const [dragging, setDragging] = useState(false);
  const frame = useRef<HTMLDivElement>(null);

  const setFromClientX = useCallback((clientX: number) => {
    const rect = frame.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, pct)));
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    setDragging(true);
    setFromClientX(e.clientX);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setFromClientX(e.clientX);
  };

  const endDrag = () => setDragging(false);

  return (
    <div className={className}>
      <div
        ref={frame}
        className="group relative touch-none select-none overflow-hidden frame-soft"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
      >
        {/* AFTER sits underneath and is fully visible */}
        <Art slot={after} frame="none" hoverZoom={false} sizes="(max-width: 1024px) 92vw, 46vw" />

        {/* BEFORE is clipped over the top */}
        <div
          className="absolute inset-0"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        >
          <Art
            slot={before}
            frame="none"
            hoverZoom={false}
            sizes="(max-width: 1024px) 92vw, 46vw"
            className="h-full w-full"
            aspect="auto"
          />
        </div>

        {/* Labels */}
        <span className="pointer-events-none absolute left-4 top-4 rounded-full bg-graphite/78 px-3 py-1.5 font-sans text-[0.625rem] font-medium tracking-[0.24em] text-cream backdrop-blur">
          BEFORE
        </span>
        <span className="pointer-events-none absolute right-4 top-4 rounded-full bg-ivory/85 px-3 py-1.5 font-sans text-[0.625rem] font-medium tracking-[0.24em] text-copper backdrop-blur">
          AFTER
        </span>

        {/* Handle */}
        <div
          className="pointer-events-none absolute inset-y-0 w-px bg-ivory shadow-[0_0_24px_rgba(255,252,247,0.9)]"
          style={{ left: `${position}%` }}
        >
          <span
            className={`absolute top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-ivory bg-ivory/92 shadow-[0_14px_34px_-12px_rgba(33,30,27,0.5)] backdrop-blur transition-transform duration-300 ${
              dragging ? "scale-110" : "group-hover:scale-105"
            }`}
          >
            <span aria-hidden className="text-[0.75rem] tracking-[-0.1em] text-copper">
              ◄►
            </span>
          </span>
        </div>
      </div>

      {/* Keyboard/AT control */}
      <label className="mt-4 block">
        <span className="sr-only">{`Reveal slider for ${label} — drag to compare before and after`}</span>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(position)}
          onChange={(e) => setPosition(Number(e.target.value))}
          aria-valuetext={`${Math.round(position)}% before, ${100 - Math.round(position)}% after`}
          className="h-11 w-full cursor-pointer appearance-none bg-transparent [&::-webkit-slider-runnable-track]:h-px [&::-webkit-slider-runnable-track]:bg-taupe [&::-webkit-slider-thumb]:mt-[-11px] [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-copper/50 [&::-webkit-slider-thumb]:bg-ivory [&::-moz-range-track]:h-px [&::-moz-range-track]:bg-taupe [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-copper/50 [&::-moz-range-thumb]:bg-ivory"
        />
      </label>
    </div>
  );
}
