"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * Floating light motes. Deterministic positions (no Math.random at render) so
 * the server and client markup match, and pure CSS animation so they never
 * touch the main thread.
 */
export default function Particles({
  count = 26,
  className = "",
}: {
  count?: number;
  className?: string;
}) {
  /* Each mote is its own composited layer with a glow. A few dozen of them is
     free on a laptop and expensive on a phone, so phones get a third of them.
     Resolved after mount so the server and client markup still agree. */
  const [budget, setBudget] = useState(count);
  useEffect(() => {
    const small = window.matchMedia("(max-width: 767px)").matches;
    const slow = (navigator.hardwareConcurrency ?? 8) <= 4;
    if (small || slow) setBudget(Math.max(4, Math.round(count / 3)));
  }, [count]);

  const motes = useMemo(
    () =>
      Array.from({ length: budget }, (_, i) => {
        // Golden-ratio scatter — even coverage without clustering.
        const x = ((i * 61.803) % 100).toFixed(2);
        const y = ((i * 37.507 + 11) % 100).toFixed(2);
        const size = 2 + ((i * 7) % 5);
        const delay = ((i * 1.37) % 12).toFixed(2);
        const duration = 14 + ((i * 3) % 11);
        const drift = (((i % 7) - 3) * 14).toFixed(0);
        const tone = i % 3 === 0 ? "#D9A273" : i % 3 === 1 ? "#E6C6BD" : "#EFE0CB";
        return { x, y, size, delay, duration, drift, tone, i };
      }),
    [budget],
  );

  return (
    <div
      aria-hidden
      data-decor
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {motes.map((m) => (
        <span
          key={m.i}
          className="absolute rounded-full"
          style={{
            left: `${m.x}%`,
            top: `${m.y}%`,
            width: m.size,
            height: m.size,
            background: m.tone,
            boxShadow: `0 0 ${m.size * 3}px ${m.tone}`,
            opacity: 0,
            ["--dx" as string]: `${m.drift}px`,
            animation: `ember ${m.duration}s linear ${m.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
