import "server-only";
import { redirect } from "next/navigation";
import { createClientOrNull } from "@/lib/supabase/server";
import type { Business, Profile, Subscription } from "@/lib/supabase/types";
import {
  demoBusiness,
  demoSubscription,
  DEMO_BUSINESS_ID,
} from "@/lib/demo/data";

export type Session = {
  /** "demo" means Supabase is not configured and sample data is shown. */
  mode: "live" | "demo";
  businessId: string;
  business: Business;
  profile: Profile;
  subscription: Subscription | null;
};

const demoProfile: Profile = {
  id: "00000000-0000-0000-0000-0000000000u1",
  business_id: DEMO_BUSINESS_ID,
  full_name: "Sample Owner",
  email: "owner@abcplumbing.example",
  phone: demoBusiness.phone,
  role: "owner",
};

/**
 * Loads the signed-in user's business. Redirects to /login when there is no
 * session. Falls back to demo content when Supabase has not been configured.
 */
export async function getSession(): Promise<Session> {
  const supabase = await createClientOrNull();

  if (!supabase) {
    return {
      mode: "demo",
      businessId: DEMO_BUSINESS_ID,
      business: demoBusiness,
      profile: demoProfile,
      subscription: demoSubscription,
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (!profile) redirect("/signup?finish=1");

  const [{ data: business }, { data: subscription }] = await Promise.all([
    supabase
      .from("businesses")
      .select("*")
      .eq("id", profile.business_id)
      .single<Business>(),
    supabase
      .from("subscriptions")
      .select("*")
      .eq("business_id", profile.business_id)
      .maybeSingle<Subscription>(),
  ]);

  if (!business) redirect("/login");

  return {
    mode: "live",
    businessId: profile.business_id,
    business,
    profile,
    subscription: subscription ?? null,
  };
}
