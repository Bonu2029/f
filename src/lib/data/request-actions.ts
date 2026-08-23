"use server";

import { revalidatePath } from "next/cache";
import { createClientOrNull } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import type { ServiceRequestStatus } from "@/lib/supabase/types";

const allowed: ServiceRequestStatus[] = [
  "new",
  "in_progress",
  "scheduled",
  "closed",
];

/** Moves a service request through its states from the dashboard. */
export async function updateRequestStatusAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as ServiceRequestStatus;

  if (!id || !allowed.includes(status)) return;

  const session = await getSession();
  if (session.mode === "demo") return;

  const supabase = await createClientOrNull();
  if (!supabase) return;

  await supabase
    .from("service_requests")
    .update({ status })
    .eq("id", id)
    .eq("business_id", session.businessId);

  revalidatePath("/dashboard/requests");
  revalidatePath("/dashboard");
}
