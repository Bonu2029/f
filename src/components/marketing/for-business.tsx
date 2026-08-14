"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, CalendarClock, CheckCircle2, CreditCard, MapPin, Star, Zap } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/primitives";
import { DEFAULT_PLATFORM_SETTINGS } from "@/lib/config";
import { bpsToPct, formatCents } from "@/lib/pricing";

const BENEFITS = [
  { icon: Zap, title: "Fill cancellations", body: "Publish a freed-up slot in seconds and let nearby customers claim it." },
  { icon: MapPin, title: "Reach nearby customers", body: "People searching for what you do, within the radius you choose." },
  { icon: CalendarClock, title: "Accept bookings instantly", body: "Real availability, confirmed on the spot — no phone tag." },
  { icon: BarChart3, title: "Manage availability", body: "One calendar for bookings, blocked time and published openings." },
  { icon: CreditCard, title: "Get paid", body: "Payments collected at booking, paid out on a weekly schedule." },
  { icon: Star, title: "Build reviews", body: "Only customers who completed a booking can review you." },
];

const STEPS = [
  { n: 1, title: "Connect your schedule", body: "Import your hours and services, or set them up in a few minutes." },
  { n: 2, title: "Publish open time", body: "Manually when something frees up, or automatically on every cancellation." },
  { n: 3, title: "Get booked", body: "Nearby customers see the opening and book it — you get a notification." },
  { n: 4, title: "Get paid", body: "The booking is charged up front and paid out to your account weekly." },
];

export function ForBusinessScreen() {
  const s = DEFAULT_PLATFORM_SETTINGS;

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-line/70 bg-canvas/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 pt-safe sm:px-6">
          <Link href="/" aria-label="NOW home">
            <Logo size={28} />
          </Link>
          <Badge tone="brand">for business</Badge>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/auth/login" className="hidden text-[13.5px] font-semibold text-ink-soft hover:text-ink sm:block">
              Sign in
            </Link>
            <ButtonLink href="/for-business/onboarding" size="sm">
              List your business
            </ButtonLink>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* ---- Hero -------------------------------------------------------- */}
        <section className="py-12 sm:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <Badge tone="urgent">Empty slot? Fill it.</Badge>
              <h1 className="mt-4 text-[34px] font-bold leading-[1.08] tracking-[-0.04em] text-ink sm:text-[46px]">
                Grow your business with NOW
              </h1>
              <p className="mt-4 max-w-lg text-[16px] leading-relaxed text-ink-soft sm:text-[17px]">
                Turn empty appointment slots into paying customers. Publish a cancellation and people
                nearby can book it within minutes.
              </p>
              <div className="mt-6 flex flex-wrap gap-2.5">
                <ButtonLink href="/for-business/onboarding" size="lg">
                  List your business
                </ButtonLink>
                <ButtonLink href="/dashboard" size="lg" variant="outline">
                  See the dashboard demo
                </ButtonLink>
              </div>
              <p className="mt-4 text-[13px] text-ink-muted">
                No monthly fee to start. {bpsToPct(s.commission_bps)} commission only on bookings NOW
                brings you — bookings you take yourself are free.
              </p>
            </div>

            {/* Product proof, not decoration: the metric businesses care about. */}
            <Card className="overflow-hidden p-5">
              <p className="text-[13px] font-semibold text-brand-700">Revenue recovered by NOW</p>
              <p className="mt-1.5 text-[40px] font-bold leading-none tracking-[-0.04em] text-ink">$640</p>
              <p className="mt-1.5 text-[13.5px] text-ink-soft">14 empty slots filled this month</p>

              <div className="mt-5 space-y-2">
                {[
                  { time: "2:30 PM", label: "Gel Manicure", price: "$48", tag: "20% off" },
                  { time: "4:15 PM", label: "Classic Manicure", price: "$32", tag: null },
                  { time: "5:30 PM", label: "Spa Pedicure", price: "$44", tag: "20% off" },
                ].map((row) => (
                  <div
                    key={row.time}
                    className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-2.5"
                  >
                    <span className="w-[62px] shrink-0 text-[13px] font-semibold tabular-nums text-ink">
                      {row.time}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink-soft">{row.label}</span>
                    {row.tag && <Badge tone="urgent">{row.tag}</Badge>}
                    <span className="text-[14px] font-semibold tabular-nums text-ink">{row.price}</span>
                  </div>
                ))}
                <div className="flex items-center gap-3 rounded-xl border border-live-500/30 bg-live-50 px-3.5 py-2.5">
                  <span className="w-[62px] shrink-0 text-[13px] font-semibold tabular-nums text-live-700">
                    6:00 PM
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-live-700">
                    Just booked by a customer nearby
                  </span>
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-live-500" />
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* ---- Benefits ----------------------------------------------------- */}
        <section className="border-t border-line py-12 sm:py-16">
          <h2 className="text-[26px] font-bold tracking-[-0.03em] text-ink sm:text-[32px]">
            Everything you need to sell your time
          </h2>
          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map(({ icon: Icon, title, body }) => (
              <Card key={title} className="p-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-3 text-[15.5px] font-semibold text-ink">{title}</h3>
                <p className="mt-1 text-[13.5px] leading-relaxed text-ink-muted">{body}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* ---- How it works -------------------------------------------------- */}
        <section id="how" className="border-t border-line py-12 sm:py-16">
          <h2 className="text-[26px] font-bold tracking-[-0.03em] text-ink sm:text-[32px]">How it works</h2>
          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step) => (
              <Card key={step.n} className="p-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-[14px] font-bold text-white">
                  {step.n}
                </span>
                <h3 className="mt-3 text-[15.5px] font-semibold text-ink">{step.title}</h3>
                <p className="mt-1 text-[13.5px] leading-relaxed text-ink-muted">{step.body}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* ---- Pricing ------------------------------------------------------- */}
        <section className="border-t border-line py-12 sm:py-16">
          <h2 className="text-[26px] font-bold tracking-[-0.03em] text-ink sm:text-[32px]">Simple pricing</h2>
          <p className="mt-2 max-w-xl text-[15px] text-ink-soft">
            You only pay when NOW brings you a booking. There is nothing to pay on your existing
            customers.
          </p>

          <div className="mt-7 grid gap-3 lg:grid-cols-2">
            <Card className="p-5">
              <p className="text-[13px] font-semibold text-ink-muted">Free</p>
              <p className="mt-1 text-[32px] font-bold tracking-[-0.035em] text-ink">
                {bpsToPct(s.commission_bps)}
                <span className="text-[15px] font-medium text-ink-muted"> per NOW booking</span>
              </p>
              <ul className="mt-4 space-y-2 text-[13.5px] text-ink-soft">
                {[
                  "Unlimited services, staff and openings",
                  "Fill This Slot and last-minute deals",
                  "Calendar, customers and messaging",
                  "Weekly payouts",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-live-500" />
                    {item}
                  </li>
                ))}
              </ul>
              <ButtonLink href="/for-business/onboarding" className="mt-5" fullWidth>
                Get started free
              </ButtonLink>
            </Card>

            <Card className="border-brand-200 p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[13px] font-semibold text-brand-700">NOW Business Pro</p>
                <Badge tone="brand">Coming soon</Badge>
              </div>
              <p className="mt-1 text-[32px] font-bold tracking-[-0.035em] text-ink">
                {formatCents(s.pro_subscription_price_cents, { showCents: false })}
                <span className="text-[15px] font-medium text-ink-muted">/month</span>
              </p>
              <ul className="mt-4 space-y-2 text-[13.5px] text-ink-soft">
                {[
                  `Lower ${bpsToPct(s.pro_commission_bps)} commission`,
                  "Automated cancellation filling",
                  "Advanced analytics and customer reactivation",
                  "Featured placement and marketing tools",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="mt-5" fullWidth disabled>
                Available at launch
              </Button>
            </Card>
          </div>
        </section>

        {/* ---- CTA ----------------------------------------------------------- */}
        <section className="border-t border-line py-12 sm:py-16">
          <Card className="flex flex-wrap items-center gap-5 p-6">
            <div className="min-w-0 flex-1">
              <h2 className="text-[22px] font-bold tracking-[-0.03em] text-ink">
                Empty slot tomorrow at 2:30?
              </h2>
              <p className="mt-1.5 text-[14.5px] text-ink-soft">
                List your business and publish your first opening in under ten minutes.
              </p>
            </div>
            <ButtonLink href="/for-business/onboarding" size="lg" trailing={<ArrowRight className="h-4 w-4" />}>
              List your business
            </ButtonLink>
          </Card>
        </section>

        <footer className="border-t border-line py-8 text-[12.5px] text-ink-muted">
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/" className="hover:text-ink">NOW marketplace</Link>
            <Link href="/integrations" className="hover:text-ink">Integrations</Link>
            <Link href="/legal/business-terms" className="hover:text-ink">Business terms</Link>
            <Link href="/legal/privacy" className="hover:text-ink">Privacy</Link>
            <Link href="/support" className="hover:text-ink">Support</Link>
          </div>
          <p className="mt-3">
            NOW is a product prototype. Businesses, reviews and figures shown are fictional demo data.
          </p>
        </footer>
      </main>
    </div>
  );
}
