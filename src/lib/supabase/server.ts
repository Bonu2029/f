import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { isSupabaseConfigured, requireSupabaseEnv } from "./env";

/**
 * Request-scoped Supabase client that reads the user's session from cookies.
 * All dashboard queries go through this, so row level security applies.
 */
export async function createClient() {
  const { supabaseUrl, supabaseAnonKey } = requireSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
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
          // Called from a Server Component; middleware refreshes the session.
        }
      },
    },
  });
}

/** Returns null instead of throwing when Supabase has not been configured. */
export async function createClientOrNull() {
  if (!isSupabaseConfigured) return null;
  return createClient();
}
