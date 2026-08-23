"use server";

import { revalidatePath } from "next/cache";
import { createClientOrNull } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import { businessSettingsSchema } from "@/lib/validation/schemas";
import { parseForm, type FormState } from "@/lib/validation/form";

/** Updates the business details that appear on every customer tag page. */
export async function updateBusinessAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseForm(businessSettingsSchema, formData);
  if (parsed.errors) return parsed.errors;

  const session = await getSession();

  if (session.mode === "demo") {
    return {
      ok: true,
      message: "Demo mode: nothing was saved. Connect Supabase to save changes.",
    };
  }

  const supabase = await createClientOrNull();
  if (!supabase) return { ok: false, message: "Database is not available." };

  const input = parsed.data;

  const { error } = await supabase
    .from("businesses")
    .update({
      name: input.name,
      business_type: input.businessType,
      phone: input.phone,
      email: input.email,
      website: input.website ?? null,
      booking_url: input.bookingUrl ?? null,
      about: input.about || null,
    })
    .eq("id", session.businessId);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/dashboard", "layout");

  return { ok: true, message: "Saved. Your tag pages are updated." };
}
