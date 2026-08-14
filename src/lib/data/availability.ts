import type { Appointment, OpenSlot, Service, Staff } from "../types";
import type { Catalog } from "./catalog";
import { DEMO_BUSINESS_SLUG } from "./catalog";
import { DEFAULT_PLATFORM_SETTINGS } from "../config";
import { applyDiscount } from "../pricing";
import {
  addDays,
  addMinutes,
  minutesToTime,
  timeToMinutes,
  toDateOnly,
  toTimeOnly,
} from "../time";
import { fnv1a, seededRandom, stableId } from "../utils";

/**
 * Generates the live availability layer.
 *
 * This runs in the browser only (see `MarketplaceProvider`), which lets it use
 * the real current time — so the marketplace looks genuinely "live" whenever
 * the demo is opened, rather than referencing a frozen afternoon.
 *
 * In production this function is replaced by a query against `open_slots`;
 * nothing downstream cares where the slots came from.
 */

const HORIZON_DAYS = 7;
/** Never publish a slot starting sooner than this — nobody can get there. */
const LEAD_TIME_MINUTES = 40;

export function generateAvailability(catalog: Catalog, now: Date): OpenSlot[] {
  const today = toDateOnly(now);
  const nowMinutes = timeToMinutes(toTimeOnly(now));
  const slots: OpenSlot[] = [];

  for (const business of catalog.businesses) {
    if (business.status !== "active") continue;

    const services = catalog.services.filter(
      (s) => s.business_id === business.id && s.is_active && s.online_booking_enabled,
    );
    const staff = catalog.staff.filter(
      (s) => s.business_id === business.id && s.is_active && s.accepts_online_booking,
    );
    if (services.length === 0 || staff.length === 0) continue;

    const appointments = catalog.appointments.filter(
      (a) =>
        a.business_id === business.id &&
        (a.status === "confirmed" || a.status === "pending" || a.status === "completed"),
    );

    for (let d = 0; d < HORIZON_DAYS; d++) {
      const date = addDays(today, d);
      const dow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d).getDay();
      const hours = catalog.businessHours.find(
        (h) => h.business_id === business.id && h.day_of_week === dow,
      );
      if (!hours || hours.is_closed || !hours.opens_at || !hours.closes_at) continue;

      const openMin = timeToMinutes(hours.opens_at);
      const closeMin = timeToMinutes(hours.closes_at);
      const earliest = d === 0 ? Math.max(openMin, nowMinutes + LEAD_TIME_MINUTES) : openMin;

      for (const member of staff) {
        const avail = catalog.staffAvailability.find(
          (a) => a.staff_id === member.id && a.day_of_week === dow,
        );
        if (!avail || !avail.is_working) continue;

        const memberServices = servicesFor(catalog, member, services);
        if (memberServices.length === 0) continue;

        const rand = seededRandom(`slots-${member.id}-${date}`);
        const startBound = Math.max(earliest, timeToMinutes(avail.starts_at));
        const endBound = Math.min(closeMin, timeToMinutes(avail.ends_at));

        // Walk the day on a 30-minute grid; publish a subset of the gaps.
        let published = 0;
        const maxPerDay = d === 0 ? 4 : 3;
        for (let t = ceilTo(startBound, 30); t < endBound && published < maxPerDay; t += 30) {
          if (rand() > (d === 0 ? 0.42 : 0.3)) continue;

          const service = memberServices[Math.floor(rand() * memberServices.length)];
          const startTime = minutesToTime(t);
          const endTime = addMinutes(startTime, service.duration_minutes);
          if (t + service.duration_minutes > endBound) continue;
          if (overlapsAppointment(appointments, member.id, date, t, service.duration_minutes)) continue;
          if (overlapsSlot(slots, member.id, date, t, service.duration_minutes)) continue;

          const minutesUntil = minutesFromNow(date, startTime, now, today);
          const isLastMinute =
            minutesUntil <= DEFAULT_PLATFORM_SETTINGS.last_minute_window_hours * 60;
          // Same-day gaps are the ones businesses discount to fill.
          const wantsDeal = isLastMinute && rand() > 0.45;
          const discount = wantsDeal ? [10, 15, 20, 25][Math.floor(rand() * 4)] : 0;

          slots.push(
            makeSlot({
              key: `${member.id}-${date}-${startTime}`,
              business_id: business.id,
              staff_id: member.id,
              service,
              date,
              startTime,
              endTime,
              isLastMinute,
              discount,
              rand,
            }),
          );
          published++;
          t += Math.max(0, service.duration_minutes - 30);
        }
      }
    }
  }

  slots.push(...guaranteedShowcaseSlots(catalog, now, slots));
  return slots;
}

/* -------------------------------------------------------------------------- */

interface MakeSlotInput {
  key: string;
  business_id: string;
  staff_id: string;
  service: Service;
  date: string;
  startTime: string;
  endTime: string;
  isLastMinute: boolean;
  discount: number;
  rand: () => number;
}

function makeSlot(i: MakeSlotInput): OpenSlot {
  const offer = i.discount > 0 ? applyDiscount(i.service.price_cents, i.discount) : null;
  return {
    id: stableId("slot", i.key),
    business_id: i.business_id,
    staff_id: i.staff_id,
    service_id: i.service.id,
    date: i.date,
    start_time: i.startTime,
    end_time: i.endTime,
    status: "available",
    original_price_cents: i.service.price_cents,
    offer_price_cents: offer,
    is_last_minute: i.isLastMinute,
    visibility_radius_miles: null,
    held_until: null,
    held_by: null,
    view_count: Math.floor(i.rand() * 14),
    nearby_reach: 40 + Math.floor(i.rand() * 180),
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * The marketplace must never look empty. These slots guarantee that a demo
 * opened at any hour still shows same-day openings and at least one headline
 * deal at the flagship studio.
 */
function guaranteedShowcaseSlots(catalog: Catalog, now: Date, existing: OpenSlot[]): OpenSlot[] {
  const out: OpenSlot[] = [];
  const today = toDateOnly(now);
  const nowMinutes = timeToMinutes(toTimeOnly(now));

  for (const business of catalog.businesses) {
    const services = catalog.services.filter(
      (s) => s.business_id === business.id && s.is_active && s.price_cents > 0,
    );
    const staff = catalog.staff.filter((s) => s.business_id === business.id && s.is_active);
    if (!services.length || !staff.length) continue;

    const rand = seededRandom(`showcase-${business.slug}-${today}`);
    const isFlagship = business.slug === DEMO_BUSINESS_SLUG;
    const wanted = isFlagship ? 3 : 1;

    // Find the next open window at or after now.
    for (let d = 0; d < 3 && out.filter((s) => s.business_id === business.id).length < wanted; d++) {
      const date = addDays(today, d);
      const dow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d).getDay();
      const hours = catalog.businessHours.find(
        (h) => h.business_id === business.id && h.day_of_week === dow,
      );
      if (!hours || hours.is_closed || !hours.opens_at || !hours.closes_at) continue;

      const openMin = timeToMinutes(hours.opens_at);
      const closeMin = timeToMinutes(hours.closes_at);
      // Offset each business a little so the "openings now" rail shows a
      // spread of times rather than everyone's opening hour.
      const stagger = 15 * (fnv1a(business.slug) % 8);
      let cursor = ceilTo(
        d === 0
          ? Math.max(openMin, nowMinutes + LEAD_TIME_MINUTES + 5) + stagger
          : openMin + 90 + stagger,
        15,
      );

      while (
        cursor < closeMin - 30 &&
        out.filter((s) => s.business_id === business.id).length < wanted
      ) {
        const service = isFlagship
          ? services[out.filter((s) => s.business_id === business.id).length % services.length]
          : services[Math.floor(rand() * services.length)];
        const eligible = staff.filter((m) =>
          catalog.staffServices.some((ss) => ss.staff_id === m.id && ss.service_id === service.id),
        );
        const member = (eligible.length ? eligible : staff)[Math.floor(rand() * (eligible.length || staff.length))];
        const startTime = minutesToTime(cursor);

        const clash =
          existing.some(
            (s) => s.staff_id === member.id && s.date === date && s.start_time === startTime,
          ) ||
          out.some((s) => s.staff_id === member.id && s.date === date && s.start_time === startTime) ||
          overlapsAppointment(catalog.appointments, member.id, date, cursor, service.duration_minutes);

        if (!clash && cursor + service.duration_minutes <= closeMin) {
          const discount = isFlagship ? 20 : [0, 15, 20, 25][Math.floor(rand() * 4)];
          out.push(
            makeSlot({
              key: `showcase-${member.id}-${date}-${startTime}`,
              business_id: business.id,
              staff_id: member.id,
              service,
              date,
              startTime,
              endTime: addMinutes(startTime, service.duration_minutes),
              isLastMinute:
                minutesFromNow(date, startTime, now, today) <=
                DEFAULT_PLATFORM_SETTINGS.last_minute_window_hours * 60,
              discount,
              rand,
            }),
          );
        }
        cursor += 45;
      }
    }
  }

  return out;
}

function servicesFor(catalog: Catalog, member: Staff, services: Service[]): Service[] {
  const allowed = new Set(
    catalog.staffServices.filter((ss) => ss.staff_id === member.id).map((ss) => ss.service_id),
  );
  const list = services.filter((s) => allowed.has(s.id) && s.price_cents > 0);
  return list.length ? list : services.filter((s) => s.price_cents > 0);
}

function overlapsAppointment(
  appointments: Appointment[],
  staffId: string,
  date: string,
  startMin: number,
  duration: number,
): boolean {
  return appointments.some((a) => {
    if (a.staff_id !== staffId || a.date !== date) return false;
    const aStart = timeToMinutes(a.start_time);
    const aEnd = timeToMinutes(a.end_time);
    return startMin < aEnd && startMin + duration > aStart;
  });
}

function overlapsSlot(
  slots: OpenSlot[],
  staffId: string,
  date: string,
  startMin: number,
  duration: number,
): boolean {
  return slots.some((s) => {
    if (s.staff_id !== staffId || s.date !== date) return false;
    const sStart = timeToMinutes(s.start_time);
    const sEnd = timeToMinutes(s.end_time);
    return startMin < sEnd && startMin + duration > sStart;
  });
}

function minutesFromNow(date: string, time: string, now: Date, today: string): number {
  const dayDelta = Math.round(
    (new Date(`${date}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86_400_000,
  );
  return dayDelta * 1440 + timeToMinutes(time) - timeToMinutes(toTimeOnly(now));
}

function ceilTo(value: number, step: number): number {
  return Math.ceil(value / step) * step;
}
