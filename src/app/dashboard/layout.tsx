import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { getSession } from "@/lib/session";
import { brand } from "@/config/brand";

// A dashboard always renders one business's private data — never cache it.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: `%s · ${brand.name}` },
};

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <Sidebar businessName={session.business.name} />
      <main className="min-w-0 flex-1 bg-white">
        <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
