'use client';

import { createBrowserClient } from '@supabase/ssr';
import { normalizeSupabaseUrl } from '@afd/shared';

/**
 * Browser Supabase client.
 *
 * Uses the publishable (anon) key only — every request it makes is subject to
 * Row Level Security. The service-role key is never bundled.
 *
 * Both key names are read because Supabase renamed the concept: newer projects
 * issue `sb_publishable_…` keys, older ones a JWT-shaped anon key. Each
 * `process.env` reference is written out literally so Next can inline it at
 * build time; a computed lookup would silently produce `undefined`.
 */
export function createSupabaseBrowserClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL ?? '';
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    '';

  return createBrowserClient(normalizeSupabaseUrl(url), key);
}
