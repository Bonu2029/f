/**
 * Pure domain logic shared by the web app, the voice worker and the tests.
 * No I/O — every function here is deterministic and unit-tested.
 */

import type {
  AvailabilityRule,
  AvailabilitySettings,
  BusinessHoursDay,
  Lead,
  LeadScore,
  ServiceArea,
  Urgency,
} from './types';

/* -------------------------------------------------------------------------- */
/* Phone numbers                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Normalises a US/CA phone number to E.164. Returns null when the input cannot
 * be interpreted confidently — callers must handle null rather than guessing.
 */
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = String(input).trim();
  if (trimmed.startsWith('+')) {
    const digits = trimmed.slice(1).replace(/\D/g, '');
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}

/** Formats E.164 for display: +14155550123 -> (415) 555-0123. */
export function formatPhone(e164: string | null | undefined): string {
  if (!e164) return '';
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164);
  if (m) return `(${m[1]}) ${m[2]}-${m[3]}`;
  return e164;
}

/** Masks a phone number for logs: +14155550123 -> +1415•••0123 */
export function maskPhone(e164: string | null | undefined): string {
  if (!e164) return '';
  if (e164.length <= 8) return '•'.repeat(e164.length);
  return `${e164.slice(0, 5)}•••${e164.slice(-4)}`;
}

/* -------------------------------------------------------------------------- */
/* Service area matching                                                      */
/* -------------------------------------------------------------------------- */

export interface ServiceAreaQuery {
  postal_code?: string | null;
  city?: string | null;
  state?: string | null;
}

export interface ServiceAreaMatch {
  covered: boolean;
  /** Which rule matched, for explaining the answer. */
  matchedRule: ServiceArea | null;
  reason: string;
  /** True when the query was too vague to decide. */
  indeterminate: boolean;
}

const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();
const normZip = (s: string | null | undefined) => (s ?? '').trim().replace(/\D/g, '').slice(0, 5);

/**
 * Decides whether a location falls inside the configured service area.
 *
 * `radius` rules cannot be evaluated without a geocoder, so they are treated as
 * indeterminate rather than silently claiming coverage — the AI is instructed to
 * say a human will confirm. This is deliberate: never promise coverage we cannot
 * verify.
 */
export function matchServiceArea(
  areas: ServiceArea[],
  query: ServiceAreaQuery,
): ServiceAreaMatch {
  const active = areas.filter((a) => a.active);
  if (active.length === 0) {
    return {
      covered: false,
      matchedRule: null,
      reason: 'No service area has been configured for this business.',
      indeterminate: true,
    };
  }

  const zip = normZip(query.postal_code);
  const city = norm(query.city);
  const state = norm(query.state);

  if (!zip && !city && !state) {
    return {
      covered: false,
      matchedRule: null,
      reason: 'No location was provided.',
      indeterminate: true,
    };
  }

  for (const a of active) {
    if (a.type === 'postal_code' && zip && normZip(a.postal_code) === zip) {
      return { covered: true, matchedRule: a, reason: `ZIP ${zip} is in the service area.`, indeterminate: false };
    }
    if (a.type === 'city' && city && norm(a.city) === city) {
      if (a.state && state && norm(a.state) !== state) continue;
      return {
        covered: true,
        matchedRule: a,
        reason: `${query.city} is in the service area.`,
        indeterminate: false,
      };
    }
    if (a.type === 'state' && state && norm(a.state) === state) {
      return {
        covered: true,
        matchedRule: a,
        reason: `${query.state} is in the service area.`,
        indeterminate: false,
      };
    }
  }

  const hasRadius = active.some((a) => a.type === 'radius');
  if (hasRadius) {
    return {
      covered: false,
      matchedRule: null,
      reason:
        'This business uses a distance-based service area which cannot be confirmed automatically. Say that someone will confirm coverage when they follow up.',
      indeterminate: true,
    };
  }

  return {
    covered: false,
    matchedRule: null,
    reason: 'That location is outside the configured service area.',
    indeterminate: false,
  };
}

/* -------------------------------------------------------------------------- */
/* Lead scoring — deliberately transparent, no hidden model                    */
/* -------------------------------------------------------------------------- */

export interface LeadScoreResult {
  score: LeadScore;
  reasons: string[];
}

export interface LeadScoreInput {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  postal_code?: string | null;
  service_requested?: string | null;
  urgency?: Urgency | null;
  in_service_area?: boolean | null;
  appointment_booked?: boolean;
  is_property_owner?: boolean | null;
}

/**
 * Rule-based lead scoring. Every point is explained in `reasons` and surfaced
 * in the UI so the business owner can see exactly why a lead is hot or cold.
 *
 * hot  ≥ 5 points · warm ≥ 3 points · cold otherwise
 */
export function scoreLead(input: LeadScoreInput): LeadScoreResult {
  let points = 0;
  const reasons: string[] = [];

  if (input.phone) {
    points += 2;
    reasons.push('Callback number captured (+2)');
  } else {
    reasons.push('No callback number (0)');
  }

  if (input.name) {
    points += 1;
    reasons.push('Name captured (+1)');
  }

  if (input.address || input.postal_code) {
    points += 1;
    reasons.push('Service location captured (+1)');
  }

  if (input.service_requested) {
    points += 1;
    reasons.push('Asked for a specific service (+1)');
  } else {
    reasons.push('No specific service identified (0)');
  }

  if (input.in_service_area === true) {
    points += 2;
    reasons.push('Inside the service area (+2)');
  } else if (input.in_service_area === false) {
    points -= 2;
    reasons.push('Outside the service area (−2)');
  }

  switch (input.urgency) {
    case 'emergency':
      points += 3;
      reasons.push('Emergency (+3)');
      break;
    case 'urgent':
      points += 2;
      reasons.push('Urgent (+2)');
      break;
    case 'soon':
      points += 1;
      reasons.push('Wants work soon (+1)');
      break;
    case 'flexible':
      reasons.push('Timing is flexible (0)');
      break;
    default:
      reasons.push('Timing unknown (0)');
      break;
  }

  if (input.appointment_booked) {
    points += 3;
    reasons.push('Booked an appointment on the call (+3)');
  }

  if (input.is_property_owner === true) {
    points += 1;
    reasons.push('Caller owns the property (+1)');
  } else if (input.is_property_owner === false) {
    points -= 1;
    reasons.push('Caller does not own the property (−1)');
  }

  if (input.email) {
    points += 1;
    reasons.push('Email captured (+1)');
  }

  const score: LeadScore = points >= 5 ? 'hot' : points >= 3 ? 'warm' : 'cold';
  reasons.push(`Total: ${points} points → ${score}`);
  return { score, reasons };
}

export function scoreLeadFromRecord(
  lead: Pick<
    Lead,
    | 'name'
    | 'phone'
    | 'email'
    | 'address'
    | 'postal_code'
    | 'service_requested'
    | 'urgency'
    | 'in_service_area'
    | 'is_property_owner'
    | 'status'
  >,
): LeadScoreResult {
  return scoreLead({
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    address: lead.address,
    postal_code: lead.postal_code,
    service_requested: lead.service_requested,
    urgency: lead.urgency,
    in_service_area: lead.in_service_area,
    is_property_owner: lead.is_property_owner,
    appointment_booked: lead.status === 'appointment_booked',
  });
}

/* -------------------------------------------------------------------------- */
/* Availability                                                               */
/* -------------------------------------------------------------------------- */

export interface TimeSlot {
  /** ISO-8601 UTC instant. */
  start: string;
  end: string;
}

export interface BusySpan {
  start: string;
  end: string;
}

export const DEFAULT_AVAILABILITY_SETTINGS: Omit<AvailabilitySettings, 'organization_id' | 'updated_at'> = {
  appointment_duration: 60,
  buffer_before: 0,
  buffer_after: 15,
  min_notice_minutes: 120,
  max_horizon_days: 30,
  blackout_dates: [],
};

/** Minutes since midnight for "HH:MM". */
export function parseTimeOfDay(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return 0;
  return Number(m[1]) * 60 + Number(m[2]);
}

/**
 * Converts a wall-clock date + minutes-since-midnight in an IANA timezone into
 * a UTC Date. Uses Intl to find the zone's offset at that instant, iterating
 * once to settle DST boundaries.
 */
export function zonedTimeToUtc(dateISO: string, minutesFromMidnight: number, timeZone: string): Date {
  const [y, mo, d] = dateISO.split('-').map(Number);
  const hours = Math.floor(minutesFromMidnight / 60);
  const minutes = minutesFromMidnight % 60;
  // First guess: treat the wall time as UTC, then correct by the zone offset.
  let utc = Date.UTC(y ?? 1970, (mo ?? 1) - 1, d ?? 1, hours, minutes, 0, 0);
  for (let i = 0; i < 2; i++) {
    const offset = timeZoneOffsetMs(new Date(utc), timeZone);
    utc = Date.UTC(y ?? 1970, (mo ?? 1) - 1, d ?? 1, hours, minutes, 0, 0) - offset;
  }
  return new Date(utc);
}

/** Offset of `timeZone` from UTC at `instant`, in milliseconds (east positive). */
export function timeZoneOffsetMs(instant: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(instant);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? '0');
  const asUTC = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour') % 24,
    get('minute'),
    get('second'),
  );
  return asUTC - instant.getTime();
}

/** YYYY-MM-DD for an instant, rendered in a timezone. */
export function dateKeyInZone(instant: Date, timeZone: string): string {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return dtf.format(instant);
}

/** Weekday index (0=Sunday) for an instant, rendered in a timezone. */
export function weekdayInZone(instant: Date, timeZone: string): number {
  const name = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(instant);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(name);
}

export interface GenerateSlotsInput {
  /** Days to consider, as YYYY-MM-DD in the business timezone. */
  dates: string[];
  timeZone: string;
  rules: Pick<AvailabilityRule, 'weekday' | 'start_time' | 'end_time' | 'active'>[];
  settings: Pick<
    AvailabilitySettings,
    'appointment_duration' | 'buffer_before' | 'buffer_after' | 'min_notice_minutes' | 'blackout_dates'
  >;
  busy: BusySpan[];
  now: Date;
  /** Override the appointment duration (minutes). */
  durationMinutes?: number;
  maxSlots?: number;
}

/**
 * Produces concrete bookable slots. A slot is offered only when the full
 * span (buffer_before + duration + buffer_after) is free of every busy span
 * and satisfies the minimum booking notice.
 */
export function generateSlots(input: GenerateSlotsInput): TimeSlot[] {
  const {
    dates,
    timeZone,
    rules,
    settings,
    busy,
    now,
    durationMinutes,
    maxSlots = 12,
  } = input;

  const duration = durationMinutes ?? settings.appointment_duration ?? 60;
  const before = settings.buffer_before ?? 0;
  const after = settings.buffer_after ?? 0;
  const step = Math.max(15, Math.min(duration, 60));
  const earliest = new Date(now.getTime() + (settings.min_notice_minutes ?? 0) * 60_000);
  const blackout = new Set(settings.blackout_dates ?? []);

  const busySpans = busy
    .map((b) => ({ start: new Date(b.start).getTime(), end: new Date(b.end).getTime() }))
    .filter((b) => Number.isFinite(b.start) && Number.isFinite(b.end) && b.end > b.start)
    .sort((a, b) => a.start - b.start);

  const out: TimeSlot[] = [];

  for (const date of dates) {
    if (out.length >= maxSlots) break;
    if (blackout.has(date)) continue;
    // Weekday of this local date at noon (avoids DST edge misclassification).
    const noon = zonedTimeToUtc(date, 12 * 60, timeZone);
    const weekday = weekdayInZone(noon, timeZone);

    const dayRules = rules.filter((r) => r.active !== false && r.weekday === weekday);
    for (const rule of dayRules) {
      const startMin = parseTimeOfDay(rule.start_time);
      const endMin = parseTimeOfDay(rule.end_time);
      if (endMin <= startMin) continue;

      for (let m = startMin; m + duration <= endMin; m += step) {
        if (out.length >= maxSlots) break;
        const slotStart = zonedTimeToUtc(date, m, timeZone);
        const slotEnd = new Date(slotStart.getTime() + duration * 60_000);
        if (slotStart < earliest) continue;

        const blockStart = slotStart.getTime() - before * 60_000;
        const blockEnd = slotEnd.getTime() + after * 60_000;
        const conflicts = busySpans.some((b) => b.start < blockEnd && b.end > blockStart);
        if (conflicts) continue;

        out.push({ start: slotStart.toISOString(), end: slotEnd.toISOString() });
      }
    }
  }

  return out.sort((a, b) => a.start.localeCompare(b.start)).slice(0, maxSlots);
}

/** Next `count` calendar dates (YYYY-MM-DD in `timeZone`) starting from `from`. */
export function upcomingDates(from: Date, count: number, timeZone: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(dateKeyInZone(new Date(from.getTime() + i * 86_400_000), timeZone));
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Business hours                                                             */
/* -------------------------------------------------------------------------- */

export const DEFAULT_BUSINESS_HOURS: BusinessHoursDay[] = [
  { weekday: 0, closed: true, open: '09:00', close: '17:00' },
  { weekday: 1, closed: false, open: '08:00', close: '17:00' },
  { weekday: 2, closed: false, open: '08:00', close: '17:00' },
  { weekday: 3, closed: false, open: '08:00', close: '17:00' },
  { weekday: 4, closed: false, open: '08:00', close: '17:00' },
  { weekday: 5, closed: false, open: '08:00', close: '17:00' },
  { weekday: 6, closed: true, open: '09:00', close: '13:00' },
];

export function isWithinBusinessHours(
  hours: BusinessHoursDay[],
  instant: Date,
  timeZone: string,
): boolean {
  const weekday = weekdayInZone(instant, timeZone);
  const day = hours.find((h) => h.weekday === weekday);
  if (!day || day.closed) return false;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(instant);
  const minutes = parseTimeOfDay(parts);
  return minutes >= parseTimeOfDay(day.open) && minutes < parseTimeOfDay(day.close);
}

/* -------------------------------------------------------------------------- */
/* Misc                                                                       */
/* -------------------------------------------------------------------------- */

/** URL/DNS-safe slug derived from a business name, with a stable fallback. */
export function slugify(input: string): string {
  const base = input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return base || 'business';
}

export function initialsOf(first?: string | null, last?: string | null, email?: string | null): string {
  const f = (first ?? '').trim();
  const l = (last ?? '').trim();
  if (f || l) return `${f.charAt(0)}${l.charAt(0)}`.toUpperCase() || '?';
  const e = (email ?? '').trim();
  return e ? e.charAt(0).toUpperCase() : '?';
}

/** Greeting suited to the time of day in the given timezone. */
export function greetingForTime(instant: Date, timeZone: string): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', hour12: false }).format(instant),
  );
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Human duration: 95 -> "1m 35s". */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0s';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m ? `${m}m ${s}s` : `${s}s`;
}

/* -------------------------------------------------------------------------- */
/* Supabase configuration                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Normalises a Supabase project URL.
 *
 * The Supabase dashboard shows several URLs and it is easy to copy the wrong
 * one: the REST endpoint (`https://<ref>.supabase.co/rest/v1/`) looks like the
 * project URL but breaks every client call with a confusing 404. Rather than
 * making that a support ticket, strip the API path and any trailing slash so
 * either form works.
 */
export function normalizeSupabaseUrl(raw: string): string {
  return raw
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/(rest|auth|storage|realtime|functions)\/v\d+$/i, '');
}

/* -------------------------------------------------------------------------- */
/* Working hours                                                              */
/* -------------------------------------------------------------------------- */

export interface AvailabilityBlock {
  weekday: number;
  start_time: string;
  end_time: string;
}

/**
 * Why a single block cannot be saved, or null when it is fine.
 *
 * Wall-clock "HH:MM" strings compare correctly with `<` because they are
 * zero-padded and fixed width, which is one of the reasons they are stored that
 * way rather than as minute counts.
 */
export function availabilityBlockProblem(block: AvailabilityBlock): string | null {
  if (!block.start_time || !block.end_time) return 'Both times are needed.';
  if (block.end_time <= block.start_time) return 'The end time must be after the start time.';
  return null;
}

/**
 * Indexes of blocks that overlap another block on the same day.
 *
 * Not an error: a split shift is two rows on one weekday, which is normal in
 * trades. But two rows covering the same hours means the booking engine would
 * offer that time twice, so it is worth saying out loud.
 *
 * Touching blocks (09:00–12:00 and 12:00–17:00) do not overlap — the boundary
 * belongs to neither, and treating them as a clash would flag the most ordinary
 * way of writing a day with a break in it.
 */
export function overlappingAvailability(blocks: AvailabilityBlock[]): number[] {
  const clashing = new Set<number>();
  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      const a = blocks[i]!;
      const b = blocks[j]!;
      if (a.weekday !== b.weekday) continue;
      if (a.start_time < b.end_time && b.start_time < a.end_time) {
        clashing.add(i);
        clashing.add(j);
      }
    }
  }
  return [...clashing].sort((a, b) => a - b);
}
