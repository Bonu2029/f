import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/page-shell";
import { Badge, Card } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { CALENDAR_INTEGRATIONS } from "@/lib/config";

export const metadata: Metadata = {
  title: "Integrations",
  description:
    "Planned calendar and booking-system integrations for NOW: Google Calendar, Square, Fresha, Vagaro, Booksy, Mindbody, Calendly and Apple Calendar.",
  alternates: { canonical: "/integrations" },
};

export default function Page() {
  return (
    <MarketingShell width="wide">
      <h1 className="text-[34px] font-bold leading-tight tracking-[-0.04em] text-ink sm:text-[42px]">
        Integrations
      </h1>
      <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-ink-soft">
        NOW is built so your existing calendar stays the source of truth. None of the integrations below
        are live yet — every one is clearly marked, and nothing on NOW pretends to sync until it does.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CALENDAR_INTEGRATIONS.map((integration) => (
          <Card key={integration.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-[16px] font-semibold text-ink">{integration.name}</h2>
              <Badge tone={integration.live ? "live" : "neutral"}>
                {integration.live ? "Live" : "Coming soon"}
              </Badge>
            </div>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">{integration.blurb}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-8 p-5">
        <h2 className="text-[18px] font-semibold text-ink">Available today</h2>
        <ul className="mt-3 space-y-2 text-[14px] text-ink-soft">
          <li>· Add any booking to your own calendar as a standard .ics file.</li>
          <li>· Publish, edit and remove availability directly in the NOW dashboard.</li>
          <li>· Block time so it never reaches the marketplace.</li>
        </ul>
        <ButtonLink href="/for-business" className="mt-5" variant="outline">
          See the business dashboard
        </ButtonLink>
      </Card>
    </MarketingShell>
  );
}
