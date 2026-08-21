/**
 * Appointment slot computation.
 *
 * Pure: given a business's schedule and what is already booked, it returns the
 * times that are genuinely free. No I/O, no clock of its own — `nowISO` is
 * passed in — so the thing that decides what a caller is offered can be tested
 * exhaustively, including the days of the year that break naive date code.
 *
 * The rule this exists to protect: a slot is offered only if someone can
 * actually be there. Offering a time nobody works, or a time already taken, is
 * the single worst failure this product has, because the customer only finds
 * out when nobody arrives.
 */

/* -------------------------------------------------------------------------- */
/* Timezone                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * How far the zone is ahead of UTC at a given instant, in milliseconds.
 *
 * Derived from `Intl` rather than a table, so it follows whatever rules the
 * runtime's tzdata carries — including the ones that change by legislation.
 */
function zoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);

  const at: Record<string, number> = {};
  for (const p of parts) if (p.type !== 'literal') at[p.type] = Number(p.value);

  const asIfUtc = Date.UTC(at.year!, at.month! - 1, at.day!, at.hour!, at.minute!, at.second!);
  return asIfUtc - instant.getTime();
}

/**
 * The instant at which a wall-clock time occurs in a zone, or null when that
 * time does not exist.
 *
 * "08:00 on Monday" is not an instant until you say where, and on two days a
 * year the answer is unusual: when clocks spring forward, 02:30 never happens,
 * and returning *something* for it would put an appointment at a time the
 * customer's clock never shows. Null is the honest answer, and the caller skips
 * that slot.
 *
 * When clocks fall back, 01:30 happens twice. This picks the first — the
 * earlier offset — which is the one a person means when they say "half one".
 */
export function wallTimeToInstant(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date | null {
  const naive = Date.UTC(year, month - 1, day, hour, minute);

  // Two passes: the first offset is measured at roughly the right moment, the
  // second at the corrected one. That converges for every real zone.
  let instant = new Date(naive - zoneOffsetMs(new Date(naive), timeZone));
  instant = new Date(naive - zoneOffsetMs(instant, timeZone));

  // Round-trip check. A wall time inside a spring-forward gap cannot come back
  // as itself, which is exactly how we detect it.
  const roundTrip = new Date(instant.getTime() + zoneOffsetMs(instant, timeZone));
  if (roundTrip.getUTCHours() !== hour || roundTrip.getUTCMinutes() !== minute) return null;

  return instant;
}

/** Calendar date and weekday as seen in the given zone. */
export function localDateIn(
  instant: Date,
  timeZone: string,
): { year: number; month: number; day: number; weekday: number } {
  const shifted = new Date(instant.getTime() + zoneOffsetMs(instant, timeZone));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
  };
}

function parseHhMm(value: string): { hour: number; minute: number } | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

/* -------------------------------------------------------------------------- */
/* Slots                                                                      */
/* -------------------------------------------------------------------------- */

export interface BookableEmployee {
  id: string;
  /** Weekly pattern. Several entries per weekday make a split shift. */
  availability: Array<{ weekday: number; start_time: string; end_time: string }>;
  /** Absences, as instants. */
  timeOff: Array<{ starts_at: string; ends_at: string }>;
  /** Appointments already on this person's calendar. */
  busy: Array<{ start_at: string; end_at: string }>;
}

export interface SlotRequest {
  /** Search window, as instants. */
  fromISO: string;
  toISO: string;
  nowISO: string;
  timezone: string;
  /** How long the job takes. */
  durationMinutes: number;
  /** Dead time held before and after every appointment — travel, cleanup. */
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  /** How soon a job may be booked. Stops the AI offering "in ten minutes". */
  minNoticeMinutes: number;
  /** Granularity of the times offered. 30 gives :00 and :30. */
  slotIntervalMinutes: number;
  employees: BookableEmployee[];
  /** Cap on how many are returned, so a wide search cannot be unbounded. */
  limit?: number;
}

export interface Slot {
  startISO: string;
  endISO: string;
  /** Everyone free for it. The caller picks; ties are resolved by the caller. */
  employeeIds: string[];
}

const MINUTE = 60_000;

interface Span {
  start: number;
  end: number;
}

/** Half-open overlap: touching spans do not conflict. */
function overlaps(a: Span, b: Span): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * Free times across the whole team, merged.
 *
 * A slot appears once, listing everyone who could take it, rather than once per
 * employee — a caller is offered a time, not a person, and duplicate times
 * would be noise on a phone call.
 */
export function computeAvailableSlots(request: SlotRequest): Slot[] {
  const {
    timezone,
    durationMinutes,
    bufferBeforeMinutes,
    bufferAfterMinutes,
    minNoticeMinutes,
    slotIntervalMinutes,
    employees,
    limit = 200,
  } = request;

  if (durationMinutes <= 0 || slotIntervalMinutes <= 0) return [];

  const from = new Date(request.fromISO).getTime();
  const to = new Date(request.toISO).getTime();
  const now = new Date(request.nowISO).getTime();
  if (!Number.isFinite(from) || !Number.isFinite(to) || !Number.isFinite(now)) return [];

  // Nothing before this may be offered, however free the calendar looks.
  const earliest = Math.max(from, now + minNoticeMinutes * MINUTE);
  if (earliest >= to) return [];

  const durationMs = durationMinutes * MINUTE;
  const stepMs = slotIntervalMinutes * MINUTE;

  /** start → employees free for it. */
  const byStart = new Map<number, Set<string>>();

  for (const employee of employees) {
    if (employee.availability.length === 0) continue;

    const off: Span[] = employee.timeOff.map((t) => ({
      start: new Date(t.starts_at).getTime(),
      end: new Date(t.ends_at).getTime(),
    }));

    // An existing appointment holds its buffers too, so the gap between two
    // jobs is real travel time rather than a number in a settings page.
    const busy: Span[] = employee.busy.map((b) => ({
      start: new Date(b.start_at).getTime() - bufferBeforeMinutes * MINUTE,
      end: new Date(b.end_at).getTime() + bufferAfterMinutes * MINUTE,
    }));

    // Walk calendar days in the business's own zone. Starting a day early and
    // ending a day late covers shifts whose local day differs from the UTC day
    // at the window's edges.
    const first = localDateIn(new Date(earliest - 86_400_000), timezone);
    const cursor = Date.UTC(first.year, first.month - 1, first.day);
    const lastDay = localDateIn(new Date(to + 86_400_000), timezone);
    const finish = Date.UTC(lastDay.year, lastDay.month - 1, lastDay.day);

    for (let day = cursor; day <= finish; day += 86_400_000) {
      const date = new Date(day);
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth() + 1;
      const dayOfMonth = date.getUTCDate();
      const weekday = date.getUTCDay();

      for (const block of employee.availability) {
        if (block.weekday !== weekday) continue;

        const opens = parseHhMm(block.start_time);
        const closes = parseHhMm(block.end_time);
        if (!opens || !closes) continue;

        const blockStart = wallTimeToInstant(year, month, dayOfMonth, opens.hour, opens.minute, timezone);
        const blockEnd = wallTimeToInstant(year, month, dayOfMonth, closes.hour, closes.minute, timezone);
        if (!blockStart || !blockEnd) continue;

        const shiftStart = blockStart.getTime();
        const shiftEnd = blockEnd.getTime();
        if (shiftEnd <= shiftStart) continue;

        // Align to the interval from the top of the shift, so a 08:00 start
        // yields 08:00, 08:30 … rather than times that drift by a minute.
        for (let start = shiftStart; start + durationMs <= shiftEnd; start += stepMs) {
          if (start < earliest) continue;
          if (start >= to) break;

          const candidate: Span = {
            start: start - bufferBeforeMinutes * MINUTE,
            end: start + durationMs + bufferAfterMinutes * MINUTE,
          };
          const bare: Span = { start, end: start + durationMs };

          if (off.some((o) => overlaps(bare, o))) continue;
          if (busy.some((b) => overlaps(candidate, b))) continue;

          const holders = byStart.get(start) ?? new Set<string>();
          holders.add(employee.id);
          byStart.set(start, holders);
        }
      }
    }
  }

  return [...byStart.entries()]
    .sort((a, b) => a[0] - b[0])
    .slice(0, limit)
    .map(([start, ids]) => ({
      startISO: new Date(start).toISOString(),
      endISO: new Date(start + durationMs).toISOString(),
      employeeIds: [...ids].sort(),
    }));
}

/** How far apart two options on the same day should be, when there is a choice. */
const SAME_DAY_GAP_MS = 2 * 60 * 60 * 1000;

/**
 * The next few distinct times to read out on a call.
 *
 * Spread across days rather than offering the first three consecutive slots of
 * one morning: "tomorrow at nine, tomorrow at half past nine, tomorrow at ten"
 * is a worse answer for a caller than three genuinely different options.
 */
export function spreadSlots(slots: Slot[], count: number, timeZone: string): Slot[] {
  const chosen: Slot[] = [];
  const dayKey = (slot: Slot) => {
    const { year, month, day } = localDateIn(new Date(slot.startISO), timeZone);
    return `${year}-${month}-${day}`;
  };

  for (const slot of slots) {
    if (chosen.length >= count) break;
    const key = dayKey(slot);
    const sameDay = chosen.filter((s) => dayKey(s) === key);
    if (sameDay.length >= 2) continue;

    // Two options an hour apart is barely a choice — "eight, or half past
    // eight" asks a caller to pick between the same thing twice. A morning and
    // an afternoon is a real question.
    if (sameDay.length === 1) {
      const gap = Math.abs(
        new Date(slot.startISO).getTime() - new Date(sameDay[0]!.startISO).getTime(),
      );
      if (gap < SAME_DAY_GAP_MS) continue;
    }

    chosen.push(slot);
  }

  // If spreading did not find enough — a business open two days a week — fall
  // back to the plain order rather than returning fewer options than exist.
  if (chosen.length < count) {
    for (const slot of slots) {
      if (chosen.length >= count) break;
      if (!chosen.includes(slot)) chosen.push(slot);
    }
    chosen.sort((a, b) => a.startISO.localeCompare(b.startISO));
  }

  return chosen;
}
