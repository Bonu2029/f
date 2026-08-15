import { NextResponse, type NextRequest } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { getServiceSupabase } from '@/lib/supabase/server';
import { cronSecret } from '@/lib/env';
import { childLogger, newRequestId } from '@/lib/logger';
import { expireFounderReservations } from '@/server/founder';
import { endCall } from '@/server/calls';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Scheduled maintenance. Run every 5–15 minutes (see DEPLOYMENT.md).
 *
 *  1. Expire lapsed founder reservations so abandoned checkouts free their slot.
 *  2. Close calls the worker never finalised (crash, network partition) so no
 *     call is billed at zero or left "in progress" forever.
 *  3. Purge expired OAuth state and upload tokens.
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

  results.founder_reservations_expired = await expireFounderReservations();

  // Calls still open after two hours cannot be live; finalise them from their
  // last known timestamps so usage and summaries are not lost.
  const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const { data: stale } = await svc
    .from('calls')
    .select('id')
    .is('ended_at', null)
    .lt('started_at', cutoff)
    .limit(50);

  let recovered = 0;
  for (const call of stale ?? []) {
    try {
      await endCall({ callId: call.id as string, result: 'abandoned', errorMessage: 'Call was never finalised by the voice worker.' });
      recovered += 1;
    } catch (err) {
      logger.warn('stale call recovery failed', { call_id: call.id, error: err });
    }
  }
  results.stale_calls_recovered = recovered;

  const { count: statesDeleted } = await svc
    .from('oauth_states')
    .delete({ count: 'exact' })
    .lt('expires_at', new Date().toISOString());
  results.oauth_states_purged = statesDeleted ?? 0;

  const { count: tokensRevoked } = await svc
    .from('upload_tokens')
    .update({ revoked: true }, { count: 'exact' })
    .eq('revoked', false)
    .lt('expires_at', new Date().toISOString());
  results.upload_tokens_expired = tokensRevoked ?? 0;

  logger.info('maintenance completed', results);
  return NextResponse.json({ ok: true, results });
}
