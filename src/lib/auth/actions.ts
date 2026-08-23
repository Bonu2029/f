"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getPlan } from "@/config/pricing";
import { brand } from "@/config/brand";
import {
  forgotPasswordSchema,
  logInSchema,
  resetPasswordSchema,
  signUpSchema,
} from "@/lib/validation/schemas";
import { parseForm, type FormState } from "@/lib/validation/form";

const NOT_CONFIGURED: FormState = {
  ok: false,
  message:
    "Accounts are not connected yet. Add your Supabase keys to enable sign-up and login.",
};

export async function signUpAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseForm(signUpSchema, formData);
  if (parsed.errors) return parsed.errors;

  if (!isSupabaseConfigured) return NOT_CONFIGURED;

  const input = parsed.data;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: { full_name: input.ownerName, business_name: input.businessName },
    },
  });

  if (error) return { ok: false, message: error.message };

  // Email confirmation is on: there is no session yet, so the business is
  // provisioned when they first sign in.
  if (!data.session) {
    return {
      ok: true,
      message: `Check your email to confirm your address, then log in to finish setting up ${brand.name}.`,
    };
  }

  const plan = getPlan(input.plan);
  const { error: provisionError } = await supabase.rpc("provision_business", {
    business_name: input.businessName,
    owner_name: input.ownerName,
    owner_email: input.email,
    business_type: input.businessType,
    phone: input.phone,
    website: input.website ?? null,
    plan: plan.id,
    plan_tag_limit: plan.tagLimit,
  });

  if (provisionError) return { ok: false, message: provisionError.message };

  revalidatePath("/dashboard", "layout");
  redirect("/dashboard");
}

export async function logInAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseForm(logInSchema, formData);
  if (parsed.errors) return parsed.errors;

  if (!isSupabaseConfigured) return NOT_CONFIGURED;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { ok: false, message: "That email and password did not match." };
  }

  revalidatePath("/dashboard", "layout");
  redirect("/dashboard");
}

export async function forgotPasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseForm(forgotPasswordSchema, formData);
  if (parsed.errors) return parsed.errors;

  if (!isSupabaseConfigured) return NOT_CONFIGURED;

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${brand.url}/auth/callback?next=/reset-password`,
  });

  // Always the same answer, so the form cannot be used to discover accounts.
  return {
    ok: true,
    message: "If that email has an account, a reset link is on its way.",
  };
}

export async function resetPasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseForm(resetPasswordSchema, formData);
  if (parsed.errors) return parsed.errors;

  if (!isSupabaseConfigured) return NOT_CONFIGURED;

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) return { ok: false, message: error.message };

  redirect("/dashboard");
}

export async function logOutAction() {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  revalidatePath("/", "layout");
  redirect("/");
}
