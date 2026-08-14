import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

/** Shared chrome for public content pages: legal, support, how it works, SEO. */
export function MarketingShell({
  children,
  width = "prose",
}: {
  children: ReactNode;
  width?: "prose" | "wide";
}) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-line/70 bg-canvas/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 pt-safe sm:px-6">
          <Link href="/" aria-label="NOW home">
            <Logo size={28} />
          </Link>
          <nav className="ml-auto flex items-center gap-4 text-[13.5px] font-semibold text-ink-soft">
            <Link href="/search" className="hidden hover:text-ink sm:block">
              Search
            </Link>
            <Link href="/deals" className="hidden hover:text-ink sm:block">
              Deals
            </Link>
            <Link href="/for-business" className="hover:text-ink">
              For business
            </Link>
          </nav>
        </div>
      </header>

      <main
        id="main"
        className={cn("mx-auto px-4 py-8 sm:px-6 sm:py-12", width === "prose" ? "max-w-3xl" : "max-w-6xl")}
      >
        {children}
      </main>

      <footer className="mt-6 border-t border-line">
        <div className="mx-auto max-w-6xl px-4 py-8 text-[12.5px] text-ink-muted sm:px-6">
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/" className="hover:text-ink">Home</Link>
            <Link href="/philadelphia" className="hover:text-ink">Philadelphia</Link>
            <Link href="/for-business" className="hover:text-ink">For business</Link>
            <Link href="/how-it-works" className="hover:text-ink">How it works</Link>
            <Link href="/integrations" className="hover:text-ink">Integrations</Link>
            <Link href="/legal/terms" className="hover:text-ink">Terms</Link>
            <Link href="/legal/privacy" className="hover:text-ink">Privacy</Link>
            <Link href="/legal/business-terms" className="hover:text-ink">Business terms</Link>
            <Link href="/legal/cancellation-policy" className="hover:text-ink">Cancellations</Link>
            <Link href="/legal/guidelines" className="hover:text-ink">Community guidelines</Link>
            <Link href="/support" className="hover:text-ink">Support</Link>
          </div>
          <p className="mt-3 leading-relaxed">
            NOW is a product prototype. All businesses, reviews, prices and availability are fictional
            demo data and no real bookings or payments are processed.
          </p>
        </div>
      </footer>
    </div>
  );
}

/** Long-form document layout with the legal-review disclaimer. */
export function LegalPage({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  updated: string;
  intro: string;
  sections: { heading: string; body: string[] }[];
}) {
  return (
    <MarketingShell>
      <p className="text-[13px] font-semibold text-brand-600">Legal</p>
      <h1 className="mt-1.5 text-[32px] font-bold leading-tight tracking-[-0.035em] text-ink sm:text-[40px]">
        {title}
      </h1>
      <p className="mt-2 text-[13.5px] text-ink-muted">Last updated {updated}</p>

      <div className="mt-6 rounded-2xl border border-caution-500/30 bg-caution-50 p-4">
        <p className="text-[13.5px] font-semibold text-caution-700">Placeholder document</p>
        <p className="mt-1 text-[13px] leading-relaxed text-caution-700/90">
          This page is a structural placeholder written for a product prototype. It is not legal advice
          and must be reviewed and rewritten by a qualified lawyer before NOW operates commercially.
        </p>
      </div>

      <p className="mt-6 text-[15.5px] leading-relaxed text-ink-soft">{intro}</p>

      <div className="mt-8 space-y-8">
        {sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-[19px] font-semibold tracking-[-0.02em] text-ink">{section.heading}</h2>
            <div className="mt-2 space-y-3">
              {section.body.map((paragraph, i) => (
                <p key={i} className="text-[14.5px] leading-relaxed text-ink-soft">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-10 text-[13px] text-ink-muted">
        Questions about this document? Write to{" "}
        <a href="mailto:support@booknow.demo" className="font-medium text-brand-600 underline">
          support@booknow.demo
        </a>
        .
      </p>
    </MarketingShell>
  );
}
