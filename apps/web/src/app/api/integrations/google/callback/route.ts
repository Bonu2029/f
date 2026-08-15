import { NextResponse, type NextRequest } from 'next/server';
import { google } from 'googleapis';
import { getServiceSupabase } from '@/lib/supabase/server';
import { googleOAuthClient } from '@/lib/providers/calendar';
import { encryptSecret } from '@/lib/crypto';
import { absoluteUrl } from '@/lib/env';
import { childLogger, newRequestId } from '@/lib/logger';
import { AUDIT_ACTIONS, recordAudit } from '@/lib/audit';
import { advanceOnboarding } from '@/server/organizations';

export const dynamic = 'force-dynamic';

/**
 * Google OAuth callback.
 *
 * Tokens are encrypted before they touch the database and never leave the
 * server. The state value is consumed (deleted) on use so the callback cannot
 * be replayed.
 */
export async function GET(request: NextRequest) {
  const requestId = newRequestId();
  const logger = childLogger({ request_id: requestId, provider: 'google', event: 'oauth.callback' });
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');

  const fail = (message: string) =>
    NextResponse.redirect(
      absoluteUrl(`/dashboard/settings/calendar?error=${encodeURIComponent(message)}`),
    );

  if (oauthError) {
    return fail(
      oauthError === 'access_denied'
        ? 'Google Calendar was not connected because access was declined.'
        : `Google returned an error: ${oauthError}`,
    );
  }
  if (!code || !state) return fail('The connection response was incomplete. Please try again.');

  const svc = getServiceSupabase();

  // Consume the state exactly once.
  const { data: stored } = await svc
    .from('oauth_states')
    .select('organization_id, user_id, expires_at, redirect_to')
    .eq('state', state)
    .eq('provider', 'google')
    .maybeSingle();
  await svc.from('oauth_states').delete().eq('state', state);

  if (!stored) {
    logger.warn('oauth state not found — possible CSRF or expired flow');
    return fail('That connection link is no longer valid. Start the connection again.');
  }
  if (new Date(stored.expires_at as string) < new Date()) {
    return fail('The connection window expired. Please try again.');
  }

  try {
    const client = googleOAuthClient();
    const { tokens } = await client.getToken(code);

    if (!tokens.refresh_token) {
      return fail(
        'Google did not return a long-lived token. Remove this app from your Google account permissions and connect again.',
      );
    }

    client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: client });
    const profile = await oauth2.userinfo.get();

    // Choose the primary calendar by default so booking works immediately.
    const calendar = google.calendar({ version: 'v3', auth: client });
    const list = await calendar.calendarList.list({ maxResults: 50 });
    const primary = list.data.items?.find((c) => c.primary) ?? list.data.items?.[0];

    await svc.from('calendar_connections').upsert(
      {
        organization_id: stored.organization_id as string,
        provider: 'google',
        external_account_id: profile.data.id ?? null,
        account_email: profile.data.email ?? null,
        encrypted_access_token: tokens.access_token ? encryptSecret(tokens.access_token) : null,
        encrypted_refresh_token: encryptSecret(tokens.refresh_token),
        expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        selected_calendar_id: primary?.id ?? 'primary',
        active: true,
        last_error: null,
      },
      { onConflict: 'organization_id,provider' },
    );

    await advanceOnboarding(stored.organization_id as string, 6);
    await recordAudit({
      organizationId: stored.organization_id as string,
      actorUserId: stored.user_id as string,
      action: AUDIT_ACTIONS.CALENDAR_CONNECTED,
      targetType: 'calendar_connection',
      metadata: { provider: 'google', calendar: primary?.summary ?? 'primary' },
    });

    logger.info('google calendar connected', { organization_id: stored.organization_id });
    return NextResponse.redirect(
      absoluteUrl(`${(stored.redirect_to as string) ?? '/dashboard/settings/calendar'}?connected=1`),
    );
  } catch (err) {
    logger.error('token exchange failed', { error: err });
    return fail('Google Calendar could not be connected. Nothing was saved — please try again.');
  }
}
