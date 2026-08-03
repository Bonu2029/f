import { barberById, hours, serviceById, type Barber } from "@/lib/data";

/* Availability is generated deterministically from the date + barber so the
   server and the client always agree — no hydration mismatch, no flicker. */

const SLOT_STEP_MINUTES = 30;

export const toISODate = (date: Date) => {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const fromISODate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

/** Booking window: today through 60 days out. */
export const BOOKING_HORIZON_DAYS = 60;

const hash = (input: string) => {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
};

const minutesFromLabel = (label: string) => {
  const [h, m] = label.split(":").map(Number);
  return h * 60 + m;
};

const labelFromMinutes = (minutes: number) => {
  const h = `${Math.floor(minutes / 60)}`.padStart(2, "0");
  const m = `${minutes % 60}`.padStart(2, "0");
  return `${h}:${m}`;
};

export type DayStatus = {
  iso: string;
  date: Date;
  /** The shop itself is open. */
  shopOpen: boolean;
  /** In the bookable window (not past, not beyond the horizon). */
  inWindow: boolean;
  /** Selected barber takes the chair that day. */
  barberWorking: boolean;
  selectable: boolean;
};

export const getDayStatus = (date: Date, barberId: string | null): DayStatus => {
  const iso = toISODate(date);
  const today = startOfToday();
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + BOOKING_HORIZON_DAYS);

  const rule = hours.find((h) => h.day === date.getDay());
  const shopOpen = Boolean(rule?.open && rule.close);
  const inWindow = date >= today && date <= horizon;

  const barber = barberId ? barberById(barberId) : null;
  const barberWorking = barber ? barber.worksOn.includes(date.getDay()) : shopOpen;

  return {
    iso,
    date,
    shopOpen,
    inWindow,
    barberWorking,
    selectable: shopOpen && inWindow && barberWorking,
  };
};

export type Slot = {
  time: string;
  available: boolean;
  /** Why it can't be taken — surfaced to screen readers. */
  reason?: "booked" | "closing" | "past";
};

export const getSlots = (
  dateISO: string,
  barberId: string,
  serviceId: string,
): Slot[] => {
  const date = fromISODate(dateISO);
  const rule = hours.find((h) => h.day === date.getDay());
  const barber = barberById(barberId);
  const service = serviceById(serviceId);
  if (!rule?.open || !rule.close || !barber || !service) return [];
  if (!barber.worksOn.includes(date.getDay())) return [];

  const open = minutesFromLabel(rule.open);
  const close = minutesFromLabel(rule.close);
  const now = new Date();
  const isToday = toISODate(now) === dateISO;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const slots: Slot[] = [];
  for (let t = open; t + service.minutes <= close; t += SLOT_STEP_MINUTES) {
    const time = labelFromMinutes(t);

    if (isToday && t <= nowMinutes + 60) {
      slots.push({ time, available: false, reason: "past" });
      continue;
    }

    // Longer services can't start in the last stretch before close.
    if (t + service.minutes > close) {
      slots.push({ time, available: false, reason: "closing" });
      continue;
    }

    const taken = hash(`${dateISO}|${barberId}|${time}`) < 0.34;
    slots.push({ time, available: !taken, reason: taken ? "booked" : undefined });
  }

  return slots;
};

export const barberCanDo = (barber: Barber, serviceId: string) =>
  !barber.excludes?.includes(serviceId);

/* ── Formatting helpers ────────────────────────────────────── */

export const formatPrice = (value: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
  }).format(value);

export const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
};

export const formatLongDate = (iso: string) =>
  fromISODate(iso).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

export const formatReviewDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export const endTime = (start: string, minutes: number) =>
  labelFromMinutes(minutesFromLabel(start) + minutes);

/** Human-readable open/closed state for the hero indicator. */
export const openState = (now = new Date()) => {
  const rule = hours.find((h) => h.day === now.getDay());
  const minutes = now.getHours() * 60 + now.getMinutes();

  if (rule?.open && rule.close) {
    const open = minutesFromLabel(rule.open);
    const close = minutesFromLabel(rule.close);
    if (minutes >= open && minutes < close) {
      return { open: true as const, label: `Open today until ${rule.close}` };
    }
    if (minutes < open) {
      return { open: false as const, label: `Opens today at ${rule.open}` };
    }
  }

  for (let i = 1; i <= 7; i += 1) {
    const next = hours.find((h) => h.day === (now.getDay() + i) % 7);
    if (next?.open) {
      const when = i === 1 ? "tomorrow" : next.label;
      return { open: false as const, label: `Opens ${when} at ${next.open}` };
    }
  }
  return { open: false as const, label: "Closed" };
};
