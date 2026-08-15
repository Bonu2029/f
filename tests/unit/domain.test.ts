import { describe, expect, it } from 'vitest';
import {
  formatPhone,
  generateSlots,
  isWithinBusinessHours,
  maskPhone,
  matchServiceArea,
  normalizePhone,
  scoreLead,
  slugify,
  zonedTimeToUtc,
  type ServiceArea,
} from '@afd/shared';

const area = (over: Partial<ServiceArea>): ServiceArea => ({
  id: crypto.randomUUID(),
  organization_id: 'org',
  type: 'postal_code',
  city: null,
  state: null,
  postal_code: null,
  center_postal_code: null,
  radius_miles: null,
  active: true,
  created_at: new Date().toISOString(),
  ...over,
});

describe('phone normalisation', () => {
  it('accepts common US formats', () => {
    expect(normalizePhone('(215) 555-0143')).toBe('+12155550143');
    expect(normalizePhone('215.555.0143')).toBe('+12155550143');
    expect(normalizePhone('12155550143')).toBe('+12155550143');
    expect(normalizePhone('+1 215 555 0143')).toBe('+12155550143');
  });

  it('returns null rather than guessing at nonsense', () => {
    expect(normalizePhone('12345')).toBeNull();
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone('not a phone')).toBeNull();
  });

  it('formats and masks for display and logs', () => {
    expect(formatPhone('+12155550143')).toBe('(215) 555-0143');
    expect(maskPhone('+12155550143')).toBe('+1215•••0143');
  });
});

describe('service area matching', () => {
  const areas = [
    area({ type: 'postal_code', postal_code: '19020' }),
    area({ type: 'city', city: 'Philadelphia', state: 'PA' }),
  ];

  it('matches an exact ZIP', () => {
    const result = matchServiceArea(areas, { postal_code: '19020' });
    expect(result.covered).toBe(true);
    expect(result.indeterminate).toBe(false);
  });

  it('matches a city case-insensitively', () => {
    expect(matchServiceArea(areas, { city: 'philadelphia' }).covered).toBe(true);
  });

  it('rejects a location outside the configured area', () => {
    const result = matchServiceArea(areas, { postal_code: '08102' });
    expect(result.covered).toBe(false);
    expect(result.indeterminate).toBe(false);
  });

  it('refuses to guess when no location was given', () => {
    const result = matchServiceArea(areas, {});
    expect(result.covered).toBe(false);
    expect(result.indeterminate).toBe(true);
  });

  it('refuses to guess for a radius rule it cannot evaluate', () => {
    const result = matchServiceArea(
      [area({ type: 'radius', center_postal_code: '19102', radius_miles: 25 })],
      { postal_code: '19406' },
    );
    expect(result.covered).toBe(false);
    expect(result.indeterminate).toBe(true);
  });

  it('is indeterminate when no service area is configured at all', () => {
    expect(matchServiceArea([], { postal_code: '19020' }).indeterminate).toBe(true);
  });

  it('ignores inactive rules', () => {
    const result = matchServiceArea([area({ postal_code: '19020', active: false })], {
      postal_code: '19020',
    });
    expect(result.covered).toBe(false);
  });
});

describe('lead scoring is transparent and rule-based', () => {
  it('scores a ready-to-book in-area caller as hot', () => {
    const result = scoreLead({
      name: 'John Smith',
      phone: '+12155550143',
      postal_code: '19020',
      service_requested: 'AC repair',
      urgency: 'urgent',
      in_service_area: true,
      appointment_booked: true,
    });
    expect(result.score).toBe('hot');
    expect(result.reasons.at(-1)).toContain('hot');
  });

  it('scores an out-of-area informational call as cold', () => {
    const result = scoreLead({ phone: null, in_service_area: false, urgency: 'unknown' });
    expect(result.score).toBe('cold');
    expect(result.reasons).toContain('Outside the service area (−2)');
  });

  it('explains every point it awarded', () => {
    const result = scoreLead({ name: 'A', phone: '+12155550143', service_requested: 'Repair' });
    expect(result.reasons.length).toBeGreaterThan(3);
    for (const reason of result.reasons) expect(reason).toBeTruthy();
  });

  it('lands mid-range leads as warm', () => {
    const result = scoreLead({
      phone: '+12155550143',
      service_requested: 'Duct cleaning',
      urgency: 'flexible',
    });
    expect(result.score).toBe('warm');
  });
});

describe('timezone handling', () => {
  it('converts a wall-clock time in a zone to the right UTC instant', () => {
    // 2026-08-17 13:00 in New York (EDT, UTC-4) is 17:00 UTC.
    const utc = zonedTimeToUtc('2026-08-17', 13 * 60, 'America/New_York');
    expect(utc.toISOString()).toBe('2026-08-17T17:00:00.000Z');
  });

  it('handles a winter date on the other side of DST', () => {
    // 2026-01-15 13:00 in New York (EST, UTC-5) is 18:00 UTC.
    const utc = zonedTimeToUtc('2026-01-15', 13 * 60, 'America/New_York');
    expect(utc.toISOString()).toBe('2026-01-15T18:00:00.000Z');
  });

  it('decides open/closed against business hours in the org timezone', () => {
    const hours = [{ weekday: 1, closed: false, open: '08:00', close: '17:00' }];
    // Monday 2026-08-17, 12:00 New York.
    const midday = zonedTimeToUtc('2026-08-17', 12 * 60, 'America/New_York');
    const evening = zonedTimeToUtc('2026-08-17', 20 * 60, 'America/New_York');
    expect(isWithinBusinessHours(hours, midday, 'America/New_York')).toBe(true);
    expect(isWithinBusinessHours(hours, evening, 'America/New_York')).toBe(false);
  });
});

describe('availability slot generation', () => {
  const settings = {
    appointment_duration: 60,
    buffer_before: 0,
    buffer_after: 15,
    min_notice_minutes: 60,
    blackout_dates: [] as string[],
  };
  const rules = [{ weekday: 1, start_time: '09:00', end_time: '12:00', active: true }];
  // Monday 2026-08-17 at 06:00 New York.
  const now = zonedTimeToUtc('2026-08-17', 6 * 60, 'America/New_York');

  it('offers slots inside the configured window', () => {
    const slots = generateSlots({
      dates: ['2026-08-17'],
      timeZone: 'America/New_York',
      rules,
      settings,
      busy: [],
      now,
    });
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0]!.start).toBe('2026-08-17T13:00:00.000Z'); // 09:00 EDT
  });

  it('never offers a slot that overlaps a busy span', () => {
    const slots = generateSlots({
      dates: ['2026-08-17'],
      timeZone: 'America/New_York',
      rules,
      settings,
      busy: [{ start: '2026-08-17T13:00:00.000Z', end: '2026-08-17T14:00:00.000Z' }],
      now,
    });
    expect(slots.some((s) => s.start === '2026-08-17T13:00:00.000Z')).toBe(false);
  });

  it('respects the buffer after an existing appointment', () => {
    // A booking ending at 14:00 UTC plus a 15-minute buffer blocks 14:00.
    const slots = generateSlots({
      dates: ['2026-08-17'],
      timeZone: 'America/New_York',
      rules,
      settings,
      busy: [{ start: '2026-08-17T13:30:00.000Z', end: '2026-08-17T14:00:00.000Z' }],
      now,
    });
    expect(slots.some((s) => s.start === '2026-08-17T13:00:00.000Z')).toBe(false);
  });

  it('respects the minimum booking notice', () => {
    const late = zonedTimeToUtc('2026-08-17', 8 * 60 + 30, 'America/New_York');
    const slots = generateSlots({
      dates: ['2026-08-17'],
      timeZone: 'America/New_York',
      rules,
      settings,
      busy: [],
      now: late,
    });
    // 09:00 is inside the 60-minute notice window, so it is not offered.
    expect(slots.some((s) => s.start === '2026-08-17T13:00:00.000Z')).toBe(false);
  });

  it('offers nothing on a blackout date', () => {
    const slots = generateSlots({
      dates: ['2026-08-17'],
      timeZone: 'America/New_York',
      rules,
      settings: { ...settings, blackout_dates: ['2026-08-17'] },
      busy: [],
      now,
    });
    expect(slots).toHaveLength(0);
  });

  it('offers nothing on a day with no availability rule', () => {
    const slots = generateSlots({
      dates: ['2026-08-16'], // Sunday
      timeZone: 'America/New_York',
      rules,
      settings,
      busy: [],
      now,
    });
    expect(slots).toHaveLength(0);
  });
});

describe('slugify', () => {
  it('produces DNS-safe slugs', () => {
    expect(slugify("Daniel's HVAC")).toBe('daniel-s-hvac');
    expect(slugify('  Multiple   Spaces  ')).toBe('multiple-spaces');
  });

  it('always returns something usable', () => {
    expect(slugify('!!!')).toBe('business');
    expect(slugify('')).toBe('business');
  });
});
