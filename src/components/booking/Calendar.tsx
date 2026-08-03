"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "@/components/ui/Icons";
import { EASE_EDITORIAL } from "@/components/ui/motion";
import {
  BOOKING_HORIZON_DAYS,
  getDayStatus,
  startOfToday,
  toISODate,
} from "@/lib/booking";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function Calendar({
  barberId,
  value,
  onSelect,
}: {
  barberId: string | null;
  value: string | null;
  onSelect: (iso: string) => void;
}) {
  const today = startOfToday();
  const [cursor, setCursor] = useState(() =>
    value ? new Date(`${value}T00:00:00`) : new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [direction, setDirection] = useState(1);

  const horizon = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + BOOKING_HORIZON_DAYS);
    return d;
  }, [today]);

  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);

  /* Monday-first offset for the leading blanks. */
  const leadingBlanks = (monthStart.getDay() + 6) % 7;

  const days = useMemo(
    () =>
      Array.from({ length: monthEnd.getDate() }, (_, i) =>
        getDayStatus(new Date(cursor.getFullYear(), cursor.getMonth(), i + 1), barberId),
      ),
    [cursor, monthEnd, barberId],
  );

  const canGoBack = monthStart > new Date(today.getFullYear(), today.getMonth(), 1);
  const canGoForward = monthEnd < horizon;

  const shift = (delta: number) => {
    setDirection(delta);
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
  };

  const monthLabel = cursor.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => shift(-1)}
          disabled={!canGoBack}
          aria-label="Previous month"
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border
                     border-navy-900/15 text-navy-900 transition-colors hover:border-copper-500
                     hover:text-copper-600 disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <p aria-live="polite" className="font-display text-lg text-navy-900">
          {monthLabel}
        </p>

        <button
          type="button"
          onClick={() => shift(1)}
          disabled={!canGoForward}
          aria-label="Next month"
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border
                     border-navy-900/15 text-navy-900 transition-colors hover:border-copper-500
                     hover:text-copper-600 disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-6 grid grid-cols-7 gap-1 text-center font-sans text-[0.5625rem] tracking-[0.16em] text-navy-800/45 uppercase">
        {WEEKDAYS.map((d) => (
          <span key={d} className="py-1">
            {d}
          </span>
        ))}
      </div>

      <div className="relative mt-1 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={monthLabel}
            initial={{ opacity: 0, x: direction * 26 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -26 }}
            transition={{ duration: 0.35, ease: EASE_EDITORIAL }}
            className="grid grid-cols-7 gap-1"
          >
            {Array.from({ length: leadingBlanks }, (_, i) => (
              <span key={`blank-${i}`} aria-hidden />
            ))}

            {days.map((day) => {
              const selected = value === day.iso;
              const isToday = day.iso === toISODate(today);

              return (
                <button
                  key={day.iso}
                  type="button"
                  disabled={!day.selectable}
                  onClick={() => onSelect(day.iso)}
                  aria-pressed={selected}
                  aria-label={`${day.date.toLocaleDateString("en-GB", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}${day.selectable ? "" : " — unavailable"}`}
                  className={`relative flex aspect-square cursor-pointer items-center justify-center rounded-xl
                              font-sans text-[0.8125rem] tabular-nums transition-all duration-300
                              ease-[cubic-bezier(0.22,1,0.36,1)] disabled:cursor-not-allowed ${
                                selected
                                  ? "bg-navy-900 text-ivory-100 shadow-[0_10px_24px_-12px_rgba(14,26,43,0.8)]"
                                  : day.selectable
                                    ? "text-navy-900 hover:bg-sand-200/70"
                                    : "text-navy-900/22 line-through decoration-navy-900/20"
                              }`}
                >
                  {day.date.getDate()}
                  {isToday && !selected && (
                    <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-copper-500" />
                  )}
                </button>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      <p className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.6875rem] text-navy-800/55">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-navy-900" /> Selected
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-copper-500" /> Today
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-px w-3.5 bg-navy-900/30" /> Closed or fully booked
        </span>
      </p>
    </div>
  );
}
