import type { MarketplaceState } from "@/lib/store";
import type { Appointment, DateOnly, OpenSlot } from "@/lib/types";
import { minutesToTime, timeToMinutes } from "@/lib/time";

export type ScheduleEntry =
  | { kind: "appointment"; start: string; end: string; appointment: Appointment }
  | { kind: "slot"; start: string; end: string; slot: OpenSlot }
  | { kind: "gap"; start: string; end: string; minutes: number };

/**
 * Merges a day's bookings and published openings, then fills the remaining
 * business hours with explicit gaps — because an empty hour a business can
 * *see* is an empty hour they can sell.
 */
export function buildDaySchedule(
  state: MarketplaceState,
  businessId: string,
  date: DateOnly,
  staffId?: string,
): ScheduleEntry[] {
  const dow = new Date(`${date}T00:00:00`).getDay();
  const hours = state.businessHours.find(
    (h) => h.business_id === businessId && h.day_of_week === dow,
  );

  const appointments = state.appointments.filter(
    (a) =>
      a.business_id === businessId &&
      a.date === date &&
      (!staffId || a.staff_id === staffId) &&
      a.status !== "cancelled_by_business" &&
      a.status !== "cancelled_by_customer",
  );
  const slots = state.slots.filter(
    (s) => s.business_id === businessId && s.date === date && (!staffId || s.staff_id === staffId),
  );

  const busy: ScheduleEntry[] = [
    ...appointments.map<ScheduleEntry>((a) => ({
      kind: "appointment",
      start: a.start_time,
      end: a.end_time,
      appointment: a,
    })),
    ...slots
      .filter((s) => s.status !== "booked")
      .map<ScheduleEntry>((s) => ({ kind: "slot", start: s.start_time, end: s.end_time, slot: s })),
  ].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

  if (!hours || hours.is_closed || !hours.opens_at || !hours.closes_at) return busy;

  // Walk the trading day and emit every unsold block of 30 minutes or more.
  const open = timeToMinutes(hours.opens_at);
  const close = timeToMinutes(hours.closes_at);
  const out: ScheduleEntry[] = [];
  let cursor = open;

  for (const entry of busy) {
    const start = timeToMinutes(entry.start);
    if (start - cursor >= 30) {
      out.push({
        kind: "gap",
        start: minutesToTime(cursor),
        end: minutesToTime(start),
        minutes: start - cursor,
      });
    }
    out.push(entry);
    cursor = Math.max(cursor, timeToMinutes(entry.end));
  }

  if (close - cursor >= 30) {
    out.push({ kind: "gap", start: minutesToTime(cursor), end: minutesToTime(close), minutes: close - cursor });
  }

  return out;
}
