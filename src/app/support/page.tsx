import type { Metadata } from "next";
import Link from "next/link";
import { CalendarX2, CreditCard, Flag, LifeBuoy, MessageSquare, ShieldCheck } from "lucide-react";
import { MarketingShell } from "@/components/marketing/page-shell";
import { Card } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { BRAND } from "@/lib/config";

export const metadata: Metadata = {
  title: "Help & support",
  description:
    "Get help with a NOW booking: cancellations, refunds, disputes, payments, reporting a business and account questions.",
  alternates: { canonical: "/support" },
};

const TOPICS = [
  {
    icon: CalendarX2,
    title: "Change or cancel a booking",
    body: "Open the booking from Bookings and use Cancel. Your free cancellation window is shown on the same screen.",
    href: "/bookings",
    cta: "Go to bookings",
  },
  {
    icon: CreditCard,
    title: "Payments and refunds",
    body: "Charges appear under Payment methods. Business-side cancellations are refunded in full, automatically.",
    href: "/account/payments",
    cta: "View charges",
  },
  {
    icon: MessageSquare,
    title: "Message a business",
    body: "Every booking has a message thread for running late, parking or a quick question before you arrive.",
    href: "/messages",
    cta: "Open messages",
  },
  {
    icon: Flag,
    title: "Report a problem",
    body: "Report a business from its profile, or dispute a specific booking from that booking's page. Reports go to the trust team.",
    href: "/legal/guidelines",
    cta: "Read the guidelines",
  },
];

const FAQS: [string, string][] = [
  [
    "Is the availability I see real?",
    "Yes. Every time shown is a slot a business published from its own calendar. When you start checkout the slot is held for you for five minutes, and if somebody takes it first we tell you immediately and show the closest alternatives.",
  ],
  [
    "Do I need an account to look around?",
    "No. Search, filters, business profiles and prices all work without signing in. You only need an account to complete a booking.",
  ],
  [
    "Why are some appointments discounted?",
    "Businesses publish last-minute openings — often a cancellation — at a reduced price to fill time that would otherwise be empty. The discounted price is the price you pay.",
  ],
  [
    "What does NOW charge?",
    "Customers pay the service price plus a small service fee shown at checkout. Businesses pay a marketplace commission only on bookings NOW brings them.",
  ],
  [
    "Can I leave a review without booking?",
    "No. A review requires a completed booking, which is why every review carries a verified badge.",
  ],
  [
    "What happens if I deny location access?",
    "Nothing breaks. Enter a neighbourhood, address or ZIP instead and every part of the app keeps working.",
  ],
];

export default function Page() {
  return (
    <MarketingShell width="wide">
      <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-[12.5px] font-semibold text-brand-700">
        <LifeBuoy className="h-3.5 w-3.5" />
        Support
      </span>
      <h1 className="mt-3 text-[34px] font-bold leading-tight tracking-[-0.04em] text-ink sm:text-[42px]">
        How can we help?
      </h1>
      <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-ink-soft">
        Most things can be sorted from your bookings in a couple of taps. If not, we&rsquo;re one message
        away.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {TOPICS.map(({ icon: Icon, title, body, href, cta }) => (
          <Card key={title} className="flex flex-col p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Icon className="h-5 w-5" />
            </span>
            <h2 className="mt-3 text-[16px] font-semibold text-ink">{title}</h2>
            <p className="mt-1.5 flex-1 text-[13.5px] leading-relaxed text-ink-muted">{body}</p>
            <ButtonLink href={href} variant="outline" size="sm" className="mt-4 self-start">
              {cta}
            </ButtonLink>
          </Card>
        ))}
      </div>

      <section className="mt-12 border-t border-line pt-10">
        <h2 className="text-[24px] font-bold tracking-[-0.03em] text-ink">Common questions</h2>
        <div className="mt-5 space-y-2.5">
          {FAQS.map(([q, a]) => (
            <details key={q} className="group rounded-2xl border border-line bg-surface p-4">
              <summary className="cursor-pointer list-none text-[15.5px] font-semibold text-ink marker:hidden">
                <span className="flex items-center justify-between gap-3">
                  {q}
                  <span className="text-ink-muted transition group-open:rotate-45">+</span>
                </span>
              </summary>
              <p className="mt-2.5 text-[14px] leading-relaxed text-ink-soft">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <Card className="mt-10 flex flex-wrap items-center gap-4 p-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-live-50 text-live-500">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[16px] font-semibold text-ink">Still stuck?</h2>
          <p className="mt-0.5 text-[13.5px] text-ink-muted">
            Email {BRAND.supportEmail} and include your booking reference — it starts with NOW-.
          </p>
        </div>
        <Link
          href={`mailto:${BRAND.supportEmail}`}
          className="rounded-xl bg-brand-500 px-4 py-2.5 text-[14px] font-semibold text-white transition hover:bg-brand-600"
        >
          Contact support
        </Link>
      </Card>

      <p className="mt-6 text-[12.5px] text-ink-muted">
        This is a product prototype — the support address is not monitored and no real bookings exist.
      </p>
    </MarketingShell>
  );
}
