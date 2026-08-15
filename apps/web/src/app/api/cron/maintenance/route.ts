import { NextResponse, type NextRequest } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { getServiceSupabase } from '@/lib/supabase/server';
import { cronSecret } from '@/lib/env';
import { childLogger, newRequestId } from '@/lib/logger';
import { expireFounderReservations } from '@/server/founder';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Scheduled maintenance. Run every 5–15 minutes (see DEPLOYMENT.md).
 *
 *  1. Expire lapsed founder reservations so abandoned checkouts free their slot.
 *  2. Expire team invitations that were never accepted.
 *  3. Purge expired OAuth state.
 *
 * Calls are written only when Vapi posts a completed end-of-call report, so
 * there are no half-finished call rows to reconcile here.
 */
export async function POST(request: NextRequest) {
  const requestId = newRequestId();
  const logger = childLogger({ request_id: requestId, event: 'cron.maintenance' });

  const secret = cronSecret();
  if (!secret) {
    return NextResponse.json({ error: { message: 'CRON_SECRET is not configured' } }, { status: 503 });
  }
  const presented = (request.headers.get('authorization') ?? '').replace(/^Bearer /, '');
  const a = Buffer.from(presented);
  const b = Buffer.from(secret);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: { message: 'Forbidden' } }, { status: 403 });
  }

  const svc = getServiceSupabase();
  const results: Record<string, number> = {};
  const now = new Date().toISOString();

  results.founder_reservations_expired = await expireFounderReservations();

  // Expired invitations are removed so the partial unique index frees up and the
  // same address can be invited again.
  const { count: invitesExpired } = await svc
    .from('team_invites')
    .delete({ count: 'exact' })
    .is('accepted_at', null)
    .lt('expires_at', now);
  results.team_invites_expired = invitesExpired ?? 0;

  const { count: statesDeleted } = await svc
    .from('oauth_states')
    .delete({ count: 'exact' })
    .lt('expires_at', now);
  results.oauth_states_purged = statesDeleted ?? 0;

  logger.info('maintenance completed', results);
  return NextResponse.json({ ok: true, results });
}
