import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase/server';
import { googleAuthUrl } from '@/lib/providers/calendar';
import { generateOAuthState } from '@/lib/crypto';
import { googleEnv } from '@/lib/env';
import { errorResponse, errors } from '@/lib/errors';
import { newRequestId } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * Starts the Google Calendar OAuth flow.
 *
 * The `state` value is random, single-use, bound to this user AND organisation,
 * expires in 10 minutes and is stored server-side. The callback refuses any
 * state it cannot find — that is the CSRF defence for the OAuth exchange.
 */
export async function POST() {
  const requestId = newRequestId();
  try {
    const ctx = await requireRole('admin');
    if (!googleEnv.configured) {
      throw errors.providerNotConfigured('Google', 'calendar booking');
    }

    const state = generateOAuthState();
    const svc = getServiceSupabase();

    const { error } = await svc.from('oauth_states').insert({
      state,
      organization_id: ctx.active.organizationId,
      user_id: ctx.user.id,
      provider: 'google',
      redirect_to: '/dashboard/settings/calendar',
      expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
    });
    if (error) throw errors.conflict('Could not start the connection. Please try again.');

    return NextResponse.json({ url: googleAuthUrl(state) });
  } catch (err) {
    return errorResponse(err, requestId);
  }
}
