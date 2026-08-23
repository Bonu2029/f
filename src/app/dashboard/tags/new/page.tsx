import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { ActivateTagForm } from "@/components/dashboard/activate-tag-form";
import { normalizeTagCode } from "@/lib/tag-code";
import { brand } from "@/config/brand";

export const metadata: Metadata = { title: "Activate Tag" };

export default async function ActivateTagPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Activate Tag"
        description={`Connect a ${brand.tagNoun} to the installation it's attached to.`}
      />
      <ActivateTagForm
        defaultCode={code ? (normalizeTagCode(code) ?? undefined) : undefined}
        today={today}
      />
    </div>
  );
}
