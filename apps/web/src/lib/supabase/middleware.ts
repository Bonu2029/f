import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { normalizeSupabaseUrl } from '@afd/shared';

/**
 * Refreshes the Supabase auth cookie on every request and reports who is
 * signed in.
 *
 * This runs in middleware so an expired access token is rotated before any
 * Server Component tries to read it.
 *
 * `configured` is deliberately separate from `user`. Collapsing the two — as
 * this file used to, by returning `user: null` when the environment was
 * incomplete — makes "Supabase is not set up" look exactly like "nobody is
 * signed in". The visible symptom is a login that succeeds and then bounces
 * straight back to the login page, with nothing anywhere saying why. Keeping
 * them apart lets the caller let the request through instead, so the page
 * raises the real error naming the missing variable.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  // Both names are read because Supabase renamed the concept: newer projects
  // issue `sb_publishable_…`, older ones a JWT-shaped anon key. Each reference
  // is written out literally so Next can inline it — a computed lookup would
  // silently produce `undefined` here and log nobody in.
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!rawUrl || !key) {
    return { response, user: null, configured: false as const };
  }

  const supabase = createServerClient(normalizeSupabaseUrl(rawUrl), key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user, configured: true as const };
}
