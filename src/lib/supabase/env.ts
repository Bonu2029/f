/**
 * Supabase environment access.
 *
 * The app runs in "demo mode" when Supabase is not configured, so the UI can
 * be reviewed before any keys exist. Nothing here reads a secret key — the
 * service role key is only ever loaded in `admin.ts`, which is server-only.
 */

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** True once a real Supabase project is wired up. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export function requireSupabaseEnv() {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment.",
    );
  }
  return { supabaseUrl, supabaseAnonKey };
}
