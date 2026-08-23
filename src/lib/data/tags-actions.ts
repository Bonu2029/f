"use server";

import { revalidatePath } from "next/cache";
import { createClientOrNull } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import { activateTagSchema } from "@/lib/validation/schemas";
import { parseForm, type FormState } from "@/lib/validation/form";
import { normalizeTagCode } from "@/lib/tag-code";
import { getPlan } from "@/config/pricing";

export type ActivateTagState = FormState & { code?: string };

/**
 * Connects a physical tag to an installation.
 *
 * Creates the customer and installation records, then activates the tag. The
 * tag's public URL is derived from its code and never changes, so everything
 * below can be edited later without touching the NFC chip.
 */
export async function activateTagAction(
  _prev: ActivateTagState,
  formData: FormData,
): Promise<ActivateTagState> {
  const parsed = parseForm(activateTagSchema, formData);
  if (parsed.errors) return parsed.errors;

  const input = parsed.data;
  const code = normalizeTagCode(input.code);

  if (!code) {
    return {
      ok: false,
      fieldErrors: { code: "That tag ID doesn't look right." },
      message: "Please check the highlighted fields.",
    };
  }

  const session = await getSession();

  if (session.mode === "demo") {
    return {
      ok: true,
      code,
      message:
        "Demo mode: nothing was saved. Connect Supabase to activate real tags.",
    };
  }

  const supabase = await createClientOrNull();
  if (!supabase) return { ok: false, message: "Database is not available." };

  // Stay inside the plan's tag allowance.
  const limit =
    session.subscription?.tag_limit ?? getPlan(session.subscription?.plan_id).tagLimit;

  const { count } = await supabase
    .from("tags")
    .select("id", { count: "exact", head: true })
    .eq("business_id", session.businessId)
    .eq("status", "active");

  if ((count ?? 0) >= limit) {
    return {
      ok: false,
      message: `Your plan includes ${limit} active tags. Upgrade in Billing to activate more.`,
    };
  }

  // A code can only ever belong to one business.
  const { data: existing } = await supabase
    .from("tags")
    .select("id, business_id, status")
    .eq("code", code)
    .maybeSingle<{ id: string; business_id: string; status: string }>();

  if (existing && existing.business_id !== session.businessId) {
    return {
      ok: false,
      fieldErrors: { code: "That tag ID is already in use." },
    };
  }

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .insert({
      business_id: session.businessId,
      name: input.customerName,
      phone: input.customerPhone || null,
      email: input.customerEmail || null,
    })
    .select("id")
    .single<{ id: string }>();

  if (customerError) return { ok: false, message: customerError.message };

  const { data: installation, error: installationError } = await supabase
    .from("installations")
    .insert({
      business_id: session.businessId,
      customer_id: customer.id,
      product_name: input.productName,
      installed_on: input.installedOn,
      warranty_expires_on: input.warrantyExpiresOn ?? null,
      notes: input.notes || null,
    })
    .select("id")
    .single<{ id: string }>();

  if (installationError) return { ok: false, message: installationError.message };

  const tagRow = {
    business_id: session.businessId,
    code,
    installation_id: installation.id,
    status: "active" as const,
    activated_at: new Date().toISOString(),
  };

  const { error: tagError } = existing
    ? await supabase.from("tags").update(tagRow).eq("id", existing.id)
    : await supabase.from("tags").insert(tagRow);

  if (tagError) return { ok: false, message: tagError.message };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/tags");
  revalidatePath(`/t/${code}`);

  return { ok: true, code };
}
