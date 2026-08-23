import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TagPage } from "@/components/tag/tag-page";
import { getPublicTag, recordTagEvent } from "@/lib/data/public-tag";
import type { TagEventKind } from "@/lib/supabase/types";

// Tag details change whenever a business edits them, so never cache this page.
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ s?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const tag = await getPublicTag(code);

  if (!tag) return { title: "Tag not found" };

  return {
    title: `${tag.business_name}${tag.product_name ? ` · ${tag.product_name}` : ""}`,
    description: `Request service from ${tag.business_name}.`,
    robots: { index: false, follow: false },
  };
}

export default async function PublicTagPage({ params, searchParams }: Props) {
  const [{ code }, { s }] = await Promise.all([params, searchParams]);

  const tag = await getPublicTag(code);
  if (!tag) notFound();

  // NFC is the primary path; `?s=qr` marks the QR fallback.
  const kind: TagEventKind = s === "qr" ? "qr_scan" : "nfc_tap";
  await recordTagEvent(code, kind);

  return <TagPage tag={tag} />;
}
