/**
 * Supabase integration seam.
 *
 * Nothing here talks to Supabase yet — `FEATURES.supabaseAuth` is false and the
 * marketplace runs against the local store in `src/lib/store`. This module
 * exists so the swap is mechanical:
 *
 *   1. `npm i @supabase/supabase-js @supabase/ssr`
 *   2. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   3. Apply `schema.sql`
 *   4. Fill in the bodies below and flip the feature flag
 *
 * The service-role key must never appear in this file or anywhere under
 * `src/app` that ships to the browser — it belongs in a server-only module or
 * an edge function.
 */

import type { MarketplaceRepository } from "./repository";

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function readSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  return readSupabaseConfig() != null;
}

/**
 * The repository the app would use in production.
 *
 * Every method maps onto exactly one query or RPC in `schema.sql`, and the
 * shapes are the ones `src/lib/types.ts` already defines — which is why the
 * local store could be swapped for this without touching a component.
 */
export function createSupabaseRepository(): MarketplaceRepository {
  throw new Error(
    "Supabase is not configured. The prototype runs on the local marketplace store; " +
      "see src/lib/supabase/schema.sql for the target schema.",
  );
}
