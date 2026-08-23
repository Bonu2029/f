import "server-only";
import { headers } from "next/headers";
import { createClientOrNull } from "@/lib/supabase/server";
import type { PublicTagView, TagEventKind } from "@/lib/supabase/types";
import { demoBusiness, DEMO_TAG_CODE } from "@/lib/demo/data";
import { normalizeTagCode } from "@/lib/tag-code";

/**
 * Loads the public view of a tag.
 *
 * Reads through public_tag_view(), which is the only path anonymous visitors
 * have into the database. It returns the installing business's details and the
 * installed item — never the customer's name, phone, email, address or the
 * business's internal notes.
 */
export async function getPublicTag(
  rawCode: string,
): Promise<PublicTagView | null> {
  const code = normalizeTagCode(rawCode);
  if (!code) return null;

  const supabase = await createClientOrNull();

  if (!supabase) {
    return code === DEMO_TAG_CODE ? demoPublicTag() : null;
  }

  const { data } = await supabase
    .rpc("public_tag_view", { tag_code: code })
    .maybeSingle<PublicTagView>();

  return data ?? null;
}

/** Logs a tap or scan. Failures never block the page from rendering. */
export async function recordTagEvent(rawCode: string, kind: TagEventKind) {
  const code = normalizeTagCode(rawCode);
  if (!code) return;

  const supabase = await createClientOrNull();
  if (!supabase) return;

  const headerList = await headers();

  try {
    await supabase.rpc("record_tag_event", {
      tag_code: code,
      event_kind: kind,
      ua: headerList.get("user-agent"),
      ref: headerList.get("referer"),
    });
  } catch {
    // Analytics must never break a customer's page.
  }
}

function demoPublicTag(): PublicTagView {
  return {
    code: DEMO_TAG_CODE,
    business_name: demoBusiness.name,
    business_phone: demoBusiness.phone,
    business_email: demoBusiness.email,
    business_website: demoBusiness.website,
    business_logo_url: null,
    business_about: demoBusiness.about,
    booking_url: null,
    product_name: "Water Heater",
    product_details: "50 gallon gas water heater, garage installation.",
    installed_on: "2026-08-02",
    warranty_expires_on: "2032-08-02",
  };
}
