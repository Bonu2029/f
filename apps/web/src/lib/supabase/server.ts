import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabaseEnv } from '@/lib/env';

/**
 * Two distinct Supabase clients, kept deliberately separate:
 *
 *  1. `getServerSupabase()` — carries the signed-in user's session. Every query
 *     is filtered by RLS. This is what dashboard reads use.
 *
 *  2. `getServiceSupabase()` — service role, bypasses RLS. Only for operations
 *     that legitimately cross the user's own permissions (webhooks, the voice
 *     worker's tool calls, provisioning). Callers MUST scope by organization_id
 *     themselves; there is no safety net.
 *
 * The service key never leaves the server: it is read through `env.ts`, which
 * imports `server-only`.
 */

export async function getServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(supabaseEnv.url, supabaseEnv.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component where cookies are read-only. The
          // middleware refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}

let serviceClient: SupabaseClient | null = null;

/**
 * Service-role client. Singleton — it holds no per-request state and creating
 * one per request leaks sockets under load.
 */
export function getServiceSupabase(): SupabaseClient {
  if (!serviceClient) {
    serviceClient = createClient(supabaseEnv.url, supabaseEnv.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { 'x-application-name': 'ai-front-desk-server' } },
    });
  }
  return serviceClient;
}

/** Test hook — lets integration tests inject a stubbed service client. */
export function __setServiceSupabaseForTests(client: SupabaseClient | null) {
  serviceClient = client;
}
