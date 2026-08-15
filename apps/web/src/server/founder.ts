import 'server-only';
import { unstable_cache } from 'next/cache';
import { FOUNDER_RESERVATION_TTL_MINUTES, FOUNDER_SLOT_COUNT } from '@afd/shared';
import { getServiceSupabase } from '@/lib/supabase/server';
import { AUDIT_ACTIONS, recordAudit } from '@/lib/audit';
import { log } from '@/lib/logger';

/**
 * Founding 50 inventory.
 *
 * All slot arithmetic happens inside Postgres functions (0003_functions.sql) so
 * two simultaneous checkouts cannot claim the same final spot. This module is a
 * thin, audited wrapper.
 */

export interface FounderStats {
  total: number;
  active: number;
  reserved: number;
  remaining: number;
  soldOut: boolean;
}

async function readStats(): Promise<FounderStats> {
  const svc = getServiceSupabase();
  const { data, error } = await svc.rpc('founder_slot_stats');
  if (error) {
    log.warn('founder stats query failed', { event: 'founder.stats_failed', error: error.message });
    // Fail closed: if we cannot prove slots remain, do not offer founder pricing.
    return { total: FOUNDER_SLOT_COUNT, active: FOUNDER_SLOT_COUNT, reserved: 0, remaining: 0, soldOut: true };
  }
  const row = (Array.isArray(data) ? data[0] : data) as {
    total: number;
    active: number;
    reserved: number;
    remaining: number;
  };
  return { ...row, soldOut: row.remaining <= 0 };
}

/**
 * Cached for 30 seconds so the marketing site's live counter does not hit the
 * database on every request, while still reflecting real state promptly.
 */
export const getFounderStats = unstable_cache(readStats, ['founder-stats'], {
  revalidate: 30,
  tags: ['founder-stats'],
});

/** Uncached read — used at checkout, where staleness is not acceptable. */
export const getFounderStatsFresh = readStats;

/**
 * Reserves a slot for an organisation about to enter checkout.
 * Returns null when the Founding 50 is exhausted; the caller then falls back to
 * standard pricing rather than failing the signup.
 */
export async function reserveFounderSlot(input: {
  organizationId: string;
  userId: string;
  userEmail: string;
}): Promise<number | null> {
  const svc = getServiceSupabase();
  const { data, error } = await svc.rpc('reserve_founder_slot', {
    p_organization_id: input.organizationId,
    p_user_id: input.userId,
    p_ttl_minutes: FOUNDER_RESERVATION_TTL_MINUTES,
  });

  if (error) {
    log.error('founder reservation failed', {
      event: 'founder.reserve_failed',
      organization_id: input.organizationId,
      error: error.message,
    });
    return null;
  }

  const slot = typeof data === 'number' ? data : null;
  if (slot) {
    await recordAudit({
      organizationId: input.organizationId,
      actorUserId: input.userId,
      actorEmail: input.userEmail,
      action: AUDIT_ACTIONS.FOUNDER_RESERVED,
      targetType: 'founder_claim',
      targetId: String(slot),
      metadata: { slot, ttl_minutes: FOUNDER_RESERVATION_TTL_MINUTES },
    });
  }
  return slot;
}

/**
 * Permanently activates the founder slot after a confirmed payment.
 * Called only from the Stripe webhook — never from a redirect.
 */
export async function activateFounderSlot(organizationId: string): Promise<number | null> {
  const svc = getServiceSupabase();
  const { data, error } = await svc.rpc('activate_founder_slot', {
    p_organization_id: organizationId,
  });
  if (error) {
    log.error('founder activation failed', {
      event: 'founder.activate_failed',
      organization_id: organizationId,
      error: error.message,
    });
    return null;
  }
  const slot = typeof data === 'number' ? data : null;
  if (slot) {
    await recordAudit({
      organizationId,
      action: AUDIT_ACTIONS.FOUNDER_ACTIVATED,
      targetType: 'founder_claim',
      targetId: String(slot),
      metadata: { slot },
    });
  }
  return slot;
}

/** Frees a reservation that never turned into a payment. */
export async function releaseFounderReservation(organizationId: string): Promise<void> {
  const svc = getServiceSupabase();
  const { data, error } = await svc.rpc('release_founder_reservation', {
    p_organization_id: organizationId,
  });
  if (error) {
    log.warn('founder release failed', { event: 'founder.release_failed', error: error.message });
    return;
  }
  if (data === true) {
    await recordAudit({
      organizationId,
      action: AUDIT_ACTIONS.FOUNDER_RELEASED,
      targetType: 'founder_claim',
      metadata: { reason: 'checkout_abandoned' },
    });
  }
}

/** Sweeps lapsed reservations. Invoked by the scheduled cron endpoint. */
export async function expireFounderReservations(): Promise<number> {
  const svc = getServiceSupabase();
  const { data, error } = await svc.rpc('expire_founder_reservations');
  if (error) {
    log.error('founder expiry sweep failed', { event: 'founder.expire_failed', error: error.message });
    return 0;
  }
  return typeof data === 'number' ? data : 0;
}

/**
 * Server-authoritative plan eligibility.
 *
 * This is the ONLY place that decides whether a checkout gets founder pricing.
 * The client's requested plan is advisory: asking for `founder` when no slot is
 * available silently yields `standard`.
 */
export async function resolveEligiblePlan(input: {
  organizationId: string;
  userId: string;
  userEmail: string;
  requested?: 'founder' | 'standard';
}): Promise<{ plan: 'founder' | 'standard'; founderSlot: number | null; downgraded: boolean }> {
  if (input.requested === 'standard') {
    return { plan: 'standard', founderSlot: null, downgraded: false };
  }

  const svc = getServiceSupabase();

  // An organisation that already burned a founder slot and cancelled does not
  // get another one — that is what protects the meaning of "first 50".
  const { data: priorClaim } = await svc
    .from('founder_claims')
    .select('status, slot_number')
    .eq('organization_id', input.organizationId)
    .in('status', ['expired', 'released'])
    .limit(1)
    .maybeSingle();

  const { data: liveClaim } = await svc
    .from('founder_claims')
    .select('status, slot_number')
    .eq('organization_id', input.organizationId)
    .in('status', ['reserved', 'active'])
    .maybeSingle();

  if (liveClaim) {
    return { plan: 'founder', founderSlot: liveClaim.slot_number as number, downgraded: false };
  }

  const stats = await getFounderStatsFresh();
  if (stats.soldOut) {
    return { plan: 'standard', founderSlot: null, downgraded: input.requested === 'founder' };
  }

  const slot = await reserveFounderSlot(input);
  if (slot == null) {
    return { plan: 'standard', founderSlot: null, downgraded: input.requested === 'founder' };
  }

  if (priorClaim) {
    log.info('organization re-reserved a founder slot after an earlier lapse', {
      event: 'founder.re_reserved',
      organization_id: input.organizationId,
    });
  }

  return { plan: 'founder', founderSlot: slot, downgraded: false };
}
