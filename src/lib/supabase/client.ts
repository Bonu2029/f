"use client";

import { createBrowserClient } from "@supabase/ssr";
import { requireSupabaseEnv } from "./env";

/** Browser client. Only ever sees the public anon key. */
export function createClient() {
  const { supabaseUrl, supabaseAnonKey } = requireSupabaseEnv();
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
