import { describe, expect, it } from 'vitest';
import {
  computeAvailableSlots,
  localDateIn,
  spreadSlots,
  wallTimeToInstant,
  type BookableEmployee,
  type SlotRequest,
} from '@afd/shared';

/**
 * The engine that decides what a caller is promised.
 *
 * Offering a time nobody works, or a time already taken, is the worst failure
 * this product has: the customer only finds out when nobody arrives. So the
 * cases below lean on the ones that break naive date code — the two days a year
 * clocks move, and the boundary arithmetic around buffers.
 */

const TZ = 'America/New_York';

function employee(overrides: Partial<BookableEmployee> = {}): BookableEmployee {
  return {
    id: 'dave',
    // Monday to Friday, 08:00–17:00 local.
    availability: [1, 2, 3, 4, 5].map((weekday) => ({
      weekday,
      start_time: '08:00',
      end_time: '17:00',
    })),
    timeOff: [],
    busy: [],
    ...overrides,
  };
}

function request(overrides: Partial<SlotRequest> = {}): SlotRequest {
  return {
    // Wednesday 2 September 2026, local morning.
    fromISO: '2026-09-02T04:00:00Z',
    toISO: '2026-09-03T04:00:00Z',
    nowISO: '2026-09-01T12:00:00Z',
    timezone: TZ,
    durationMinutes: 60,
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 0,
    minNoticeMinutes: 0,
    slotIntervalMinutes: 60,
    employees: [employee()],
    ...overrides,
  };
}

/** Local wall-clock "HH:MM" for an instant, for readable assertions. */
const at = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso));

/* -------------------------------------------------------------------------- */

describe('wall time to instant', () => {
  it('resolves an ordinary time', () => {
    // 2 September is daylight time: UTC-4.
    expect(wallTimeToInstant(2026, 9, 2, 8, 0, TZ)?.toISOString()).toBe('2026-09-02T12:00:00.000Z');
  });

  it('resolves a winter time at the other offset', () => {
    // 2 January is standard time: UTC-5. A fixed offset would be wrong here.
    expect(wallTimeToInstant(2026, 1, 2, 8, 0, TZ)?.toISOString()).toBe('2026-01-02T13:00:00.000Z');
  });

  it('refuses a wall time that does not exist', () => {
    // Clocks jump 02:00 → 03:00 on 8 March 2026. 02:30 never happens, and
    // returning an instant for it would book someone at a time their clock
    // never shows.
    expect(wallTimeToInstant(2026, 3, 8, 2, 30, TZ)).toBeNull();
  });

  it('picks the first occurrence of an ambiguous wall time', () => {
    // Clocks fall back 02:00 → 01:00 on 1 November 2026, so 01:30 happens
    // twice. The earlier one is what a person means.
    expect(wallTimeToInstant(2026, 11, 1, 1, 30, TZ)?.toISOString()).toBe('2026-11-01T05:30:00.000Z');
  });

  it('reads back the local date for an instant', () => {
    // 03:00 UTC is still the previous evening in New York — the case that makes
    // day-by-day iteration go wrong if done in UTC.
    expect(localDateIn(new Date('2026-09-03T03:00:00Z'), TZ)).toEqual({
      year: 2026,
      month: 9,
      day: 2,
      weekday: 3,
    });
  });
});

describe('computeAvailableSlots', () => {
  it('offers the working day, and nothing outside it', () => {
    const slots = computeAvailableSlots(request());
    expect(slots.map((s) => at(s.startISO))).toEqual([
      '08:00',
      '09:00',
      '10:00',
      '11:00',
      '12:00',
      '13:00',
      '14:00',
      '15:00',
      '16:00',
    ]);
  });

  it('does not offer a slot that would run past the end of the shift', () => {
    // 16:00 + 90 minutes ends at 17:30, past a 17:00 finish.
    const slots = computeAvailableSlots(request({ durationMinutes: 90 }));
    expect(slots.map((s) => at(s.startISO))).not.toContain('16:00');
    expect(at(slots[slots.length - 1]!.startISO)).toBe('15:00');
  });

  it('offers nothing on a day nobody works', () => {
    // 5 September 2026 is a Saturday.
    const slots = computeAvailableSlots(
      request({ fromISO: '2026-09-05T04:00:00Z', toISO: '2026-09-06T04:00:00Z' }),
    );
    expect(slots).toEqual([]);
  });

  it('offers nothing for an employee with no working hours', () => {
    const slots = computeAvailableSlots(request({ employees: [employee({ availability: [] })] }));
    expect(slots).toEqual([]);
  });

  it('leaves the gap in a split shift alone', () => {
    // The reason several rows per weekday exist: 12:00 is lunch, not a slot.
    const split = employee({
      availability: [
        { weekday: 3, start_time: '08:00', end_time: '12:00' },
        { weekday: 3, start_time: '13:00', end_time: '17:00' },
      ],
    });
    const times = computeAvailableSlots(request({ employees: [split] })).map((s) => at(s.startISO));
    expect(times).toEqual(['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00']);
    expect(times).not.toContain('12:00');
  });

  it('removes a slot that is already booked', () => {
    const booked = employee({
      busy: [{ start_at: '2026-09-02T14:00:00Z', end_at: '2026-09-02T15:00:00Z' }],
    });
    const times = computeAvailableSlots(request({ employees: [booked] })).map((s) => at(s.startISO));
    expect(times).not.toContain('10:00'); // 14:00Z is 10:00 local
    expect(times).toContain('11:00');
  });

  it('holds buffer time around an existing appointment', () => {
    // A job 10:00–11:00 with 30 minutes after it blocks until 11:30, so the
    // 11:00 slot goes and 12:00 stays.
    const booked = employee({
      busy: [{ start_at: '2026-09-02T14:00:00Z', end_at: '2026-09-02T15:00:00Z' }],
    });
    const times = computeAvailableSlots(
      request({ employees: [booked], bufferAfterMinutes: 30 }),
    ).map((s) => at(s.startISO));
    expect(times).not.toContain('11:00');
    expect(times).toContain('12:00');
  });

  it('treats back-to-back as free when there is no buffer', () => {
    const booked = employee({
      busy: [{ start_at: '2026-09-02T14:00:00Z', end_at: '2026-09-02T15:00:00Z' }],
    });
    const times = computeAvailableSlots(request({ employees: [booked] })).map((s) => at(s.startISO));
    // 11:00 local starts exactly as the 10:00 job ends.
    expect(times).toContain('11:00');
  });

  it('removes slots covered by time off', () => {
    const away = employee({
      timeOff: [{ starts_at: '2026-09-02T12:00:00Z', ends_at: '2026-09-02T16:00:00Z' }],
    });
    const times = computeAvailableSlots(request({ employees: [away] })).map((s) => at(s.startISO));
    expect(times).not.toContain('08:00');
    expect(times).not.toContain('11:00');
    expect(times).toContain('12:00');
  });

  it('refuses to offer anything inside the notice period', () => {
    // Standing at 09:15 local with four hours' notice, the earliest is 14:00.
    const times = computeAvailableSlots(
      request({ nowISO: '2026-09-02T13:15:00Z', minNoticeMinutes: 240 }),
    ).map((s) => at(s.startISO));
    expect(times).not.toContain('09:00');
    expect(times).not.toContain('12:00');
    expect(times[0]).toBe('14:00');
  });

  it('merges two people into one list of times, naming who is free', () => {
    // A caller is offered a time, not a person. Two vans free at 08:00 must
    // not read as two separate options.
    const priya = employee({
      id: 'priya',
      busy: [{ start_at: '2026-09-02T12:00:00Z', end_at: '2026-09-02T13:00:00Z' }],
    });
    const slots = computeAvailableSlots(request({ employees: [employee(), priya] }));

    const eight = slots.find((s) => at(s.startISO) === '08:00')!;
    expect(eight.employeeIds).toEqual(['dave']); // priya is busy 08:00–09:00
    const nine = slots.find((s) => at(s.startISO) === '09:00')!;
    expect(nine.employeeIds).toEqual(['dave', 'priya']);
    expect(slots.filter((s) => at(s.startISO) === '09:00')).toHaveLength(1);
  });

  it('skips the hour that does not exist when clocks spring forward', () => {
    // 8 March 2026 is a Sunday, so give the employee Sunday hours that span
    // the jump. 02:00–02:59 never happens; 01:00 and 03:00 do.
    const sunday = employee({
      availability: [{ weekday: 0, start_time: '00:00', end_time: '06:00' }],
    });
    const times = computeAvailableSlots(
      request({
        employees: [sunday],
        fromISO: '2026-03-08T00:00:00Z',
        toISO: '2026-03-09T00:00:00Z',
        nowISO: '2026-03-01T00:00:00Z',
      }),
    ).map((s) => at(s.startISO));

    expect(times).toContain('01:00');
    expect(times).not.toContain('02:00');
    expect(times).toContain('03:00');
  });

  it('keeps a full working day when clocks fall back', () => {
    // 1 November 2026: the day is 25 hours long. An 08:00–17:00 shift is still
    // nine slots — the extra hour is before the shift starts.
    const sunday = employee({
      availability: [{ weekday: 0, start_time: '08:00', end_time: '17:00' }],
    });
    const slots = computeAvailableSlots(
      request({
        employees: [sunday],
        fromISO: '2026-11-01T00:00:00Z',
        toISO: '2026-11-02T12:00:00Z',
        nowISO: '2026-10-25T00:00:00Z',
      }),
    );
    expect(slots).toHaveLength(9);
    expect(at(slots[0]!.startISO)).toBe('08:00');
  });

  it('returns nothing rather than guessing on nonsense input', () => {
    expect(computeAvailableSlots(request({ durationMinutes: 0 }))).toEqual([]);
    expect(computeAvailableSlots(request({ slotIntervalMinutes: 0 }))).toEqual([]);
    expect(computeAvailableSlots(request({ fromISO: 'not a date' }))).toEqual([]);
    // A window that closes before the notice period ends yields nothing.
    expect(computeAvailableSlots(request({ minNoticeMinutes: 60 * 24 * 30 }))).toEqual([]);
  });

  it('respects the limit so a wide search cannot run away', () => {
    const slots = computeAvailableSlots(
      request({ toISO: '2026-12-31T00:00:00Z', slotIntervalMinutes: 15, limit: 5 }),
    );
    expect(slots).toHaveLength(5);
  });
});

describe('spreadSlots', () => {
  const slot = (startISO: string) => ({ startISO, endISO: startISO, employeeIds: ['dave'] });

  it('spreads options across days, and apart within a day', () => {
    // Consecutive slots on one day are a worse answer on the phone than
    // genuinely different times. Within a day the second option has to be far
    // enough from the first to be a real alternative: offering "eight, or half
    // past eight" asks the caller to choose between the same thing twice.
    const slots = [
      slot('2026-09-02T12:00:00Z'),
      slot('2026-09-02T13:00:00Z'),
      slot('2026-09-02T14:00:00Z'),
      slot('2026-09-03T12:00:00Z'),
    ];
    const picked = spreadSlots(slots, 3, TZ);
    expect(picked.map((s) => s.startISO)).toEqual([
      '2026-09-02T12:00:00Z',
      // 13:00 skipped — only an hour after the first.
      '2026-09-02T14:00:00Z',
      '2026-09-03T12:00:00Z',
    ]);
  });

  it('takes a close second option rather than offering fewer', () => {
    // A business with one short window still gets three offers. Separation is
    // a preference; returning less than exists is not.
    const slots = [
      slot('2026-09-02T12:00:00Z'),
      slot('2026-09-02T12:30:00Z'),
      slot('2026-09-02T13:00:00Z'),
    ];
    expect(spreadSlots(slots, 3, TZ)).toHaveLength(3);
  });

  it('falls back rather than returning fewer options than exist', () => {
    // A business open one day a week still gets three offers.
    const slots = [
      slot('2026-09-02T12:00:00Z'),
      slot('2026-09-02T13:00:00Z'),
      slot('2026-09-02T14:00:00Z'),
    ];
    expect(spreadSlots(slots, 3, TZ)).toHaveLength(3);
  });

  it('never invents options', () => {
    expect(spreadSlots([slot('2026-09-02T12:00:00Z')], 3, TZ)).toHaveLength(1);
    expect(spreadSlots([], 3, TZ)).toEqual([]);
  });
});
