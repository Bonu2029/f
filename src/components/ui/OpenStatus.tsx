"use client";

import { useEffect, useState } from "react";
import { hours, todayHours } from "@/lib/site";

function toMinutes(time: string) {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(time.trim());
  if (!match) return null;
  let h = Number(match[1]) % 12;
  if (match[3].toUpperCase() === "PM") h += 12;
  return h * 60 + Number(match[2]);
}

/**
 * Live open/closed read. Rendered client-side only — the server has no idea
 * what time it is where the visitor is, and a mismatched badge is worse than
 * a badge that arrives a frame late.
 */
export default function OpenStatus({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<{
    open: boolean;
    label: string;
  } | null>(null);

  useEffect(() => {
    const compute = () => {
      const now = new Date();
      const today = todayHours(now);
      const minutes = now.getHours() * 60 + now.getMinutes();

      if (!today.open || !today.close) {
        const nextOpen = hours
          .concat(hours)
          .slice(((now.getDay() + 6) % 7) + 1)
          .find((d) => d.open);
        setState({
          open: false,
          label: nextOpen ? `Opens ${nextOpen.short} ${nextOpen.open}` : "Closed today",
        });
        return;
      }

      const start = toMinutes(today.open);
      const end = toMinutes(today.close);
      if (start === null || end === null) {
        setState({ open: false, label: `${today.open} – ${today.close}` });
        return;
      }

      if (minutes < start) {
        setState({ open: false, label: `Opens today ${today.open}` });
      } else if (minutes >= end) {
        setState({ open: false, label: `Closed · until ${today.open} tomorrow` });
      } else {
        setState({ open: true, label: `Open until ${today.close}` });
      }
    };

    compute();
    const timer = window.setInterval(compute, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  if (!state) {
    // Reserve the exact space so nothing shifts when it resolves.
    return <span className="inline-block h-[1.2em] w-[9.5rem]" aria-hidden />;
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span className="relative flex h-1.5 w-1.5" aria-hidden>
        <span
          className={`absolute inline-flex h-full w-full rounded-full ${
            state.open ? "bg-sage-deep" : "bg-taupe-deep"
          }`}
        />
        {state.open && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sage-deep opacity-60" />
        )}
      </span>
      <span className={compact ? "text-[0.75rem]" : "text-[0.8125rem]"}>
        <span className="sr-only">{state.open ? "Currently open. " : "Currently closed. "}</span>
        {state.label}
      </span>
    </span>
  );
}
