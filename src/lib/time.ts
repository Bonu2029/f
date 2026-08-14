import type { DateOnly, TimeOnly } from "./types";

/**
 * Wall-clock time helpers.
 *
 * NOW stores availability as (date, start_time) in the *business's* local time
 * rather than as instants, because a salon's 2:30 PM is 2:30 PM no matter where
 * the customer browsing it happens to be. These helpers convert to real Date
 * objects only at the edges.
 */

export const MINUTES_PER_DAY = 24 * 60;

export function toDateOnly(d: Date): DateOnly {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function toTimeOnly(d: Date): TimeOnly {
  return `${`${d.getHours()}`.padStart(2, "0")}:${`${d.getMinutes()}`.padStart(2, "0")}`;
}

/** "14:30" → 870 */
export function timeToMinutes(t: TimeOnly): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** 870 → "14:30". Wraps within a single day. */
export function minutesToTime(mins: number): TimeOnly {
  const clamped = ((mins % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${`${h}`.padStart(2, "0")}:${`${m}`.padStart(2, "0")}`;
}

export function addMinutes(t: TimeOnly, mins: number): TimeOnly {
  return minutesToTime(timeToMinutes(t) + mins);
}

/** "14:30" → "2:30 PM" */
export function formatTime(t: TimeOnly): string {
  const mins = timeToMinutes(t);
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${`${m}`.padStart(2, "0")} ${suffix}`;
}

/** Compact variant for dense calendar gutters: "2:30 PM" → "2:30p" */
export function formatTimeCompact(t: TimeOnly): string {
  const mins = timeToMinutes(t);
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const suffix = h24 >= 12 ? "p" : "a";
  return m === 0 ? `${h12}${suffix}` : `${h12}:${`${m}`.padStart(2, "0")}${suffix}`;
}

export function parseDateOnly(d: DateOnly): Date {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day);
}

export function combine(date: DateOnly, time: TimeOnly): Date {
  const d = parseDateOnly(date);
  d.setMinutes(timeToMinutes(time));
  return d;
}

export function addDays(date: DateOnly, days: number): DateOnly {
  const d = parseDateOnly(date);
  d.setDate(d.getDate() + days);
  return toDateOnly(d);
}

export function diffDays(a: DateOnly, b: DateOnly): number {
  const ms = parseDateOnly(a).getTime() - parseDateOnly(b).getTime();
  return Math.round(ms / 86_400_000);
}

export function minutesUntil(date: DateOnly, time: TimeOnly, now: Date): number {
  return Math.round((combine(date, time).getTime() - now.getTime()) / 60_000);
}

/** "Today" · "Tomorrow" · "Sat, Aug 22" */
export function dayLabel(date: DateOnly, now: Date): string {
  const delta = diffDays(date, toDateOnly(now));
  if (delta === 0) return "Today";
  if (delta === 1) return "Tomorrow";
  if (delta === -1) return "Yesterday";
  return parseDateOnly(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function shortDayLabel(date: DateOnly, now: Date): string {
  const delta = diffDays(date, toDateOnly(now));
  if (delta === 0) return "Today";
  if (delta === 1) return "Tomorrow";
  return parseDateOnly(date).toLocaleDateString("en-US", { weekday: "short" });
}

export function fullDateLabel(date: DateOnly): string {
  return parseDateOnly(date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function monthLabel(date: DateOnly): string {
  return parseDateOnly(date).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

/** 45 → "45 min" · 60 → "1 hr" · 90 → "1 hr 30 min" */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

/** "in 25 min" · "in 3 hr" · "in 2 days" · "started 10 min ago" */
export function relativeFromMinutes(mins: number): string {
  const abs = Math.abs(mins);
  const suffix = mins < 0 ? " ago" : "";
  const prefix = mins < 0 ? "" : "in ";
  if (abs < 60) return `${prefix}${Math.max(1, abs)} min${suffix}`;
  if (abs < 60 * 24) {
    const h = Math.round(abs / 60);
    return `${prefix}${h} hr${suffix}`;
  }
  const d = Math.round(abs / (60 * 24));
  return `${prefix}${d} day${d === 1 ? "" : "s"}${suffix}`;
}

/** Countdown for slot holds: 187 → "3:07" */
export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  return `${m}:${`${s % 60}`.padStart(2, "0")}`;
}

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function dayOfWeek(date: DateOnly): number {
  return parseDateOnly(date).getDay();
}

/** ISO-ish week start (Sunday) for the calendar's week view. */
export function startOfWeek(date: DateOnly): DateOnly {
  return addDays(date, -dayOfWeek(date));
}

export function startOfMonth(date: DateOnly): DateOnly {
  const d = parseDateOnly(date);
  d.setDate(1);
  return toDateOnly(d);
}

export function daysInMonth(date: DateOnly): number {
  const d = parseDateOnly(date);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

export function timestamp(d: Date = new Date()): string {
  return d.toISOString();
}
