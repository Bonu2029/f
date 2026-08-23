"use server";

import { revalidatePath } from "next/cache";
import { createClientOrNull } from "@/lib/supabase/server";
import { serviceRequestSchema } from "@/lib/validation/schemas";
import { parseForm, type FormState } from "@/lib/validation/form";
import { normalizeTagCode } from "@/lib/tag-code";
import { getPublicTag } from "@/lib/data/public-tag";

export type ServiceRequestState = FormState & { businessName?: string };

/**
 * Submits a service request from a public tag page.
 *
 * The customer is never asked to create an account. The request goes through
 * submit_service_request(), a SECURITY DEFINER function that attaches it to
 * the right business without exposing any table to anonymous callers.
 */
export async function submitServiceRequestAction(
  _prev: ServiceRequestState,
  formData: FormData,
): Promise<ServiceRequestState> {
  const code = normalizeTagCode(String(formData.get("code") ?? ""));
  if (!code) return { ok: false, message: "This tag is no longer active." };

  const parsed = parseForm(serviceRequestSchema, formData);
  if (parsed.errors) return parsed.errors;

  const tag = await getPublicTag(code);
  if (!tag) return { ok: false, message: "This tag is no longer active." };

  const supabase = await createClientOrNull();

  if (!supabase) {
    return {
      ok: true,
      businessName: tag.business_name,
      message: "Demo mode: this request was not sent anywhere.",
    };
  }

  const { error } = await supabase.rpc("submit_service_request", {
    tag_code: code,
    request_kind: parsed.data.kind,
    name: parsed.data.name,
    phone: parsed.data.phone,
    body: parsed.data.message,
    photo: parsed.data.photoUrl ?? null,
  });

  if (error) {
    return {
      ok: false,
      message: "We couldn't send that just now. Please try again or call us.",
    };
  }

  revalidatePath("/dashboard/requests");

  return { ok: true, businessName: tag.business_name };
}
