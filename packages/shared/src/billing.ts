/**
 * Billing arithmetic.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  THE BILLING RULE (single source of truth for the whole product)
 *
 *  Voice usage is metered PER CALL and rounded UP to the next whole minute:
 *
 *      billable_minutes(call) = ceil(billed_seconds / 60)
 *
 *  `billed_seconds` is the wall-clock time between the moment the AI answers
 *  (`answered_at`) and the moment the call ends (`ended_at`), taken from
 *  provider/session timestamps recorded by the voice worker — never from the
 *  browser. Ringing time before answer is not billed. A call that connects for
 *  1 second bills 1 minute; a call of 61 seconds bills 2 minutes.
 *
 *  A billing period's total is the SUM of per-call rounded minutes, not the
 *  rounding of the summed seconds. Overage is anything above the plan's
 *  included minutes, charged at the plan's per-minute rate.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { getPlan, type PlanId } from './plans';

/** Rounds a single call's connected seconds up to whole billable minutes. */
export function billableMinutesForCall(billedSeconds: number): number {
  if (!Number.isFinite(billedSeconds) || billedSeconds <= 0) return 0;
  return Math.ceil(billedSeconds / 60);
}

/**
 * Computes the connected (billable) seconds of a call from session timestamps.
 * Returns 0 when the call never connected.
 */
export function billedSecondsFromTimestamps(
  answeredAt: Date | string | null | undefined,
  endedAt: Date | string | null | undefined,
): number {
  if (!answeredAt || !endedAt) return 0;
  const start = answeredAt instanceof Date ? answeredAt : new Date(answeredAt);
  const end = endedAt instanceof Date ? endedAt : new Date(endedAt);
  const ms = end.getTime() - start.getTime();
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.round(ms / 1000);
}

export interface UsageSummary {
  readonly plan: PlanId;
  readonly includedMinutes: number;
  readonly usedMinutes: number;
  readonly remainingMinutes: number;
  readonly overageMinutes: number;
  readonly overageCents: number;
  readonly percentUsed: number;
  /** null, 70, 90 or 100 — the highest threshold crossed. */
  readonly thresholdCrossed: UsageThreshold | null;
}

export type UsageThreshold = 70 | 90 | 100;

export const USAGE_THRESHOLDS: readonly UsageThreshold[] = [70, 90, 100];

export function summarizeUsage(planId: string | null | undefined, usedMinutes: number): UsageSummary {
  const plan = getPlan(planId);
  const used = Math.max(0, Math.round(usedMinutes));
  const included = plan.includedMinutes;
  const overage = Math.max(0, used - included);
  const percent = included > 0 ? (used / included) * 100 : 0;

  let crossed: UsageThreshold | null = null;
  for (const t of USAGE_THRESHOLDS) {
    if (percent >= t) crossed = t;
  }

  return {
    plan: plan.id,
    includedMinutes: included,
    usedMinutes: used,
    remainingMinutes: Math.max(0, included - used),
    overageMinutes: overage,
    overageCents: overage * plan.overageCentsPerMinute,
    percentUsed: Math.min(999, Math.round(percent * 10) / 10),
    thresholdCrossed: crossed,
  };
}

/**
 * Given the minutes used before and after a call, returns the usage thresholds
 * that were newly crossed by that call, so notifications fire exactly once.
 */
export function newlyCrossedThresholds(
  planId: string | null | undefined,
  minutesBefore: number,
  minutesAfter: number,
): UsageThreshold[] {
  const included = getPlan(planId).includedMinutes;
  if (included <= 0) return [];
  const pctBefore = (minutesBefore / included) * 100;
  const pctAfter = (minutesAfter / included) * 100;
  return USAGE_THRESHOLDS.filter((t) => pctBefore < t && pctAfter >= t);
}

/** Formats cents as USD for display, always 2dp (e.g. "$1.20"). */
export function formatMoney(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
}

/**
 * The billing period key used by `usage_ledger.billing_period`.
 * Derived from the subscription's period start so it lines up with Stripe
 * invoices rather than calendar months. Format: `YYYY-MM-DD`.
 */
export function billingPeriodKey(periodStart: Date | string | null | undefined): string {
  const d = periodStart ? new Date(periodStart) : new Date();
  const iso = Number.isNaN(d.getTime()) ? new Date() : d;
  return iso.toISOString().slice(0, 10);
}

/* -------------------------------------------------------------------------- */
/* Scheduled cancellation                                                     */
/* -------------------------------------------------------------------------- */

export interface ScheduledEnd {
  /** Whether this subscription is set to stop rather than renew. */
  ending: boolean;
  /** The day it stops, when one is known. */
  endsAt: string | null;
}

/**
 * Whether a subscription is going to end, and when.
 *
 * Stripe expresses this two different ways. `cancel_at_period_end` is the older
 * boolean; a cancellation made through the customer portal instead sets
 * `cancel_at` to a timestamp and leaves that boolean false. Reading only one of
 * them showed "Renews 22 September" to a customer who had cancelled — the
 * screen they check precisely to find out how long they have left.
 *
 * The date is preferred over the period end because they are not always the
 * same: a cancellation can be scheduled for any future moment through the API,
 * and inferring the day from the billing period produces a confident wrong
 * answer rather than an obvious blank.
 */
export function scheduledEnd(input: {
  cancelAtPeriodEnd: boolean | null | undefined;
  /** Stripe's `cancel_at`, as an ISO string or epoch seconds. */
  cancelAt: string | number | null | undefined;
  billingPeriodEnd: string | null | undefined;
}): ScheduledEnd {
  const cancelAt = toIso(input.cancelAt);
  if (cancelAt) return { ending: true, endsAt: cancelAt };

  if (input.cancelAtPeriodEnd) {
    // No explicit date, so the period end is the correct answer rather than a
    // guess: that is what the boolean means.
    return { ending: true, endsAt: toIso(input.billingPeriodEnd) };
  }

  return { ending: false, endsAt: null };
}

function toIso(value: string | number | null | undefined): string | null {
  if (value == null || value === '') return null;
  const date = typeof value === 'number' ? new Date(value * 1000) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
