import { describe, expect, it } from 'vitest';
import {
  billableMinutesForCall,
  billedSecondsFromTimestamps,
  billingPeriodKey,
  formatMoney,
  newlyCrossedThresholds,
  summarizeUsage,
  scheduledEnd,
} from '@afd/shared';

/**
 * The billing rule is the single most important piece of arithmetic in the
 * product, so it is pinned down exactly.
 *
 *   billable_minutes = ceil(billed_seconds / 60), per call
 */
describe('billing rule: ceil(seconds / 60) per call', () => {
  it('bills a one-second call as one minute', () => {
    expect(billableMinutesForCall(1)).toBe(1);
  });

  it('bills exactly 60 seconds as one minute', () => {
    expect(billableMinutesForCall(60)).toBe(1);
  });

  it('bills 61 seconds as two minutes', () => {
    expect(billableMinutesForCall(61)).toBe(2);
  });

  it('bills a zero-length call as nothing', () => {
    expect(billableMinutesForCall(0)).toBe(0);
    expect(billableMinutesForCall(-5)).toBe(0);
  });

  it('rounds each call independently rather than summing seconds first', () => {
    // Three 30-second calls bill 3 minutes, not 2 (90s / 60 rounded up).
    const perCall = [30, 30, 30].reduce((sum, s) => sum + billableMinutesForCall(s), 0);
    expect(perCall).toBe(3);
    expect(billableMinutesForCall(90)).toBe(2);
  });

  it('handles a long call', () => {
    expect(billableMinutesForCall(3600)).toBe(60);
    expect(billableMinutesForCall(3601)).toBe(61);
  });
});

describe('billed seconds from session timestamps', () => {
  it('measures from answer to end, not from ring', () => {
    const answered = '2026-08-15T10:00:00.000Z';
    const ended = '2026-08-15T10:03:34.000Z';
    expect(billedSecondsFromTimestamps(answered, ended)).toBe(214);
  });

  it('bills nothing when the call was never answered', () => {
    expect(billedSecondsFromTimestamps(null, '2026-08-15T10:03:00.000Z')).toBe(0);
    expect(billedSecondsFromTimestamps(undefined, undefined)).toBe(0);
  });

  it('bills nothing for a negative interval', () => {
    expect(
      billedSecondsFromTimestamps('2026-08-15T10:05:00.000Z', '2026-08-15T10:00:00.000Z'),
    ).toBe(0);
  });
});

describe('usage summary', () => {
  it('reports remaining minutes below the allowance', () => {
    const usage = summarizeUsage('founder', 143);
    expect(usage.includedMinutes).toBe(200);
    expect(usage.remainingMinutes).toBe(57);
    expect(usage.overageMinutes).toBe(0);
    expect(usage.overageCents).toBe(0);
    expect(usage.percentUsed).toBeCloseTo(71.5, 1);
    expect(usage.thresholdCrossed).toBe(70);
  });

  it('prices overage at the plan rate', () => {
    const usage = summarizeUsage('founder', 212);
    expect(usage.overageMinutes).toBe(12);
    expect(usage.overageCents).toBe(120);
    expect(formatMoney(usage.overageCents)).toBe('$1.20');
    expect(usage.thresholdCrossed).toBe(100);
  });

  it('uses the standard allowance for the standard plan', () => {
    expect(summarizeUsage('standard', 0).includedMinutes).toBe(500);
  });

  it('falls back to the standard plan for an unknown id', () => {
    expect(summarizeUsage('nonsense', 10).plan).toBe('standard');
  });
});

describe('usage thresholds fire exactly once', () => {
  it('reports a threshold only on the call that crosses it', () => {
    expect(newlyCrossedThresholds('founder', 139, 141)).toEqual([70]);
    expect(newlyCrossedThresholds('founder', 141, 150)).toEqual([]);
  });

  it('can cross several thresholds in one long call', () => {
    expect(newlyCrossedThresholds('founder', 100, 205)).toEqual([70, 90, 100]);
  });

  it('reports nothing once past 100%', () => {
    expect(newlyCrossedThresholds('founder', 250, 300)).toEqual([]);
  });
});

describe('billing period key', () => {
  it('derives a YYYY-MM-DD key from the subscription period start', () => {
    expect(billingPeriodKey('2026-08-14T00:00:00.000Z')).toBe('2026-08-14');
  });

  it('falls back to today when no period is known', () => {
    expect(billingPeriodKey(null)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

/**
 * A customer cancelled through the Stripe portal and the application went on
 * telling them they were renewing. Stripe recorded the cancellation by setting
 * `cancel_at` and left `cancel_at_period_end` false; only the boolean was read.
 */
describe('scheduledEnd', () => {
  // The real instant behind Stripe's cancel_at from the observed subscription.
  const periodEnd = '2026-09-22T15:36:11.000Z';

  it('sees a portal cancellation, which sets a date and not the flag', () => {
    // The exact shape observed from Stripe: cancel_at set, boolean false.
    expect(
      scheduledEnd({ cancelAtPeriodEnd: false, cancelAt: 1790091371, billingPeriodEnd: periodEnd }),
    ).toEqual({ ending: true, endsAt: periodEnd });
  });

  it('still honours the older boolean on its own', () => {
    expect(
      scheduledEnd({ cancelAtPeriodEnd: true, cancelAt: null, billingPeriodEnd: periodEnd }),
    ).toEqual({ ending: true, endsAt: periodEnd });
  });

  it('says a subscription is renewing only when neither signal is set', () => {
    expect(
      scheduledEnd({ cancelAtPeriodEnd: false, cancelAt: null, billingPeriodEnd: periodEnd }),
    ).toEqual({ ending: false, endsAt: null });
  });

  /**
   * The two dates are not interchangeable. A cancellation scheduled through the
   * API for an arbitrary day must not be reported as the billing period end —
   * that is the one number a customer reads to know how long they have left.
   */
  it('reports the scheduled date, not the period end, when they differ', () => {
    expect(
      scheduledEnd({
        cancelAtPeriodEnd: false,
        cancelAt: '2026-08-30T00:00:00.000Z',
        billingPeriodEnd: periodEnd,
      }).endsAt,
    ).toBe('2026-08-30T00:00:00.000Z');
  });

  it('accepts epoch seconds and ISO alike, since both reach it', () => {
    const fromEpoch = scheduledEnd({ cancelAtPeriodEnd: false, cancelAt: 1790091371, billingPeriodEnd: null });
    const fromIso = scheduledEnd({ cancelAtPeriodEnd: false, cancelAt: periodEnd, billingPeriodEnd: null });
    expect(fromEpoch.endsAt).toBe(fromIso.endsAt);
  });

  it('says ending without a date rather than inventing one', () => {
    expect(
      scheduledEnd({ cancelAtPeriodEnd: true, cancelAt: null, billingPeriodEnd: null }),
    ).toEqual({ ending: true, endsAt: null });
    // Garbage in a date field is not a date.
    expect(
      scheduledEnd({ cancelAtPeriodEnd: false, cancelAt: 'soon', billingPeriodEnd: null }).ending,
    ).toBe(false);
  });
});
