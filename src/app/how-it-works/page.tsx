import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, CreditCard, Search, Zap } from "lucide-react";
import { MarketingShell } from "@/components/marketing/page-shell";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "How NOW works",
  description:
    "Search what you need, see who's actually available, book instantly. Here's how NOW works for customers and for businesses.",
  alternates: { canonical: "/how-it-works" },
};

const CUSTOMER_STEPS = [
  { icon: Search, title: "Search what you need", body: "A category, or a plain phrase like “haircut right now” or “nails after 5”." },
  { icon: CalendarCheck, title: "See who's actually available", body: "Every time shown is a real slot a business has opened, with price, distance and rating alongside it." },
  { icon: Zap, title: "Book instantly", body: "Pick a time, review the booking, confirm. The slot is held for you for five minutes while you check out." },
];

const BUSINESS_STEPS = [
  { icon: CalendarCheck, title: "Connect your schedule", body: "Add your hours, services and team once. Keep availability updated from one calendar." },
  { icon: Zap, title: "Publish open time", body: "Manually when a cancellation lands, or automatically on every freed-up slot." },
  { icon: Search, title: "Get booked", body: "Nearby customers see the opening within your chosen radius and can book it in a couple of taps." },
  { icon: CreditCard, title: "Get paid", body: "Payment is collected at booking and paid out weekly. Commission applies only to bookings NOW brings you." },
];

export default function Page() {
  return (
    <MarketingShell width="wide">
      <h1 className="text-[34px] font-bold leading-tight tracking-[-0.04em] text-ink sm:text-[44px]">
        Find it. Book it. Done.
      </h1>
      <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-ink-soft">
        NOW shows you local services with real availability — today, this afternoon, right now — so you
        can stop calling around to find out who has a gap.
      </p>

      <section className="mt-10">
        <h2 className="text-[22px] font-bold tracking-[-0.03em] text-ink">For customers</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {CUSTOMER_STEPS.map(({ icon: Icon, title, body }, i) => (
            <Card key={title} className="p-5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-[14px] font-bold text-white">
                  {i + 1}
                </span>
                <Icon className="h-[18px] w-[18px] text-brand-500" />
              </div>
              <h3 className="mt-3 text-[16px] font-semibold text-ink">{title}</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-muted">{body}</p>
            </Card>
          ))}
        </div>
        <ButtonLink href="/search" className="mt-5" size="lg">
          Find something available now
        </ButtonLink>
      </section>

      <section className="mt-12 border-t border-line pt-10">
        <h2 className="text-[22px] font-bold tracking-[-0.03em] text-ink">For businesses</h2>
        <p className="mt-1.5 max-w-2xl text-[15px] text-ink-soft">
          Empty slot? Fill it. Turn cancellations and unused time into revenue.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {BUSINESS_STEPS.map(({ icon: Icon, title, body }, i) => (
            <Card key={title} className="p-5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-[14px] font-bold text-white">
                  {i + 1}
                </span>
                <Icon className="h-[18px] w-[18px] text-ink-muted" />
              </div>
              <h3 className="mt-3 text-[16px] font-semibold text-ink">{title}</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-muted">{body}</p>
            </Card>
          ))}
        </div>
        <ButtonLink href="/for-business" className="mt-5" size="lg" variant="outline">
          List your business
        </ButtonLink>
      </section>

      <section className="mt-12 border-t border-line pt-10">
        <h2 className="text-[22px] font-bold tracking-[-0.03em] text-ink">What makes availability real</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            ["Businesses publish it themselves", "Openings come from a business's own calendar, not a guess about when they might be free."],
            ["Slots are held during checkout", "Once you start booking, that time is reserved for five minutes so nobody takes it from under you."],
            ["Two people can't take the same slot", "Booking is atomic. If a slot goes while you're deciding, we tell you straight away and show the closest alternatives."],
            ["Reviews need a completed booking", "There is no way to review a business you never actually visited."],
          ].map(([title, body]) => (
            <Card key={title} className="p-4">
              <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
              <p className="mt-1 text-[13.5px] leading-relaxed text-ink-muted">{body}</p>
            </Card>
          ))}
        </div>
        <p className="mt-5 text-[13px] text-ink-muted">
          Questions? <Link href="/support" className="font-medium text-brand-600 underline">Contact support</Link>.
        </p>
      </section>
    </MarketingShell>
  );
}
