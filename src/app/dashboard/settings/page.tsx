import type { Metadata } from "next";
import { DemoBanner } from "@/components/dashboard/demo-banner";
import { PageHeader } from "@/components/dashboard/page-header";
import { SettingsForm } from "@/components/dashboard/settings-form";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await getSession();

  return (
    <div className="space-y-8">
      {session.mode === "demo" ? <DemoBanner /> : null}

      <PageHeader
        title="Settings"
        description="These details appear on every customer tag page."
      />

      <div className="rounded-2xl border border-line bg-white p-6 shadow-soft sm:p-8">
        <h2 className="text-lg font-semibold text-ink-950">Logo</h2>
        <p className="mt-1 text-[0.9375rem] text-ink-700">
          Shown at the top of your customer pages.
        </p>
        <div className="mt-5 max-w-[9rem]">
          <ImagePlaceholder ratio="1 / 1" rounded="rounded-2xl" />
        </div>
        <p className="mt-3 text-sm text-ink-500">
          Logo upload is coming next. PNG or SVG, up to 2 MB.
        </p>
      </div>

      <SettingsForm business={session.business} />
    </div>
  );
}
