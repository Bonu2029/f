import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * Middleware does two things and nothing else:
 *   1. Rotates the Supabase session cookie so Server Components see a fresh token.
 *   2. Bounces signed-out visitors away from private routes.
 *
 * It is NOT the authorisation boundary. Role checks and tenant scoping happen in
 * `lib/auth.ts` and in Postgres RLS — middleware is a convenience redirect, and
 * the app is safe even if it is bypassed.
 */

const PROTECTED_PREFIXES = ['/dashboard', '/onboarding', '/admin'];
const AUTH_ONLY_PREFIXES = ['/login', '/signup'];

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const path = request.nextUrl.pathname;

  if (!user && PROTECTED_PREFIXES.some((p) => path.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(url);
  }

  if (user && AUTH_ONLY_PREFIXES.some((p) => path === p)) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets, image optimisation, favicons and the
     * webhook routes — provider callbacks must never be redirected.
     */
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp3|wav)$).*)',
  ],
};
