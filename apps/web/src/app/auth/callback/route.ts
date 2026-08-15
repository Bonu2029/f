import { NextResponse, type NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';
import { appUrl } from '@/lib/env';
import { log } from '@/lib/logger';

/**
 * Supabase auth redirect target for email verification, magic links and
 * password recovery. Exchanges the one-time code for a session cookie.
 *
 * `next` is validated to be a same-origin path so the callback cannot be used
 * as an open redirect.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  const rawNext = url.searchParams.get('next') ?? '/dashboard';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/dashboard';

  const supabase = await getServerSupabase();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${appUrl}${next}`);
    log.warn('auth callback exchange failed', { event: 'auth.callback_failed', error: error.message });
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as 'email' | 'recovery' | 'invite' | 'magiclink' | 'signup',
      token_hash: tokenHash,
    });
    if (!error) return NextResponse.redirect(`${appUrl}${next}`);
    log.warn('auth otp verification failed', { event: 'auth.otp_failed', error: error.message });
  }

  return NextResponse.redirect(
    `${appUrl}/login?error=${encodeURIComponent('That link is invalid or has expired. Request a new one.')}`,
  );
}
