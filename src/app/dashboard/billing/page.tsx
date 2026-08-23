import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { DemoBanner } from "@/components/dashboard/demo-banner";
import { PageHeader } from "@/components/dashboard/page-header";
import { getSession } from "@/lib/session";
import { getTags } from "@/lib/data/dashboard";
import { getPlan, plans, pricingNote } from "@/config/pricing";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Billing" };

const notices: Record<string, { tone: "success" | "info" | "error"; text: string }> = {
  success: { tone: "success", text: "Your plan is updated. Thanks!" },
  canceled: { tone: "info", text: "Checkout was canceled. Nothing changed." },
  unavailable: {
    tone: "info",
    text: "Payments are not connected yet. Add your Stripe keys to enable checkout.",
  },
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; portal?: string }>;
}) {
  const [session, params] = await Promise.all([getSession(), searchParams]);
  const tags = await getTags(session);

  const current = getPlan(session.subscription?.plan_id);
  const limit = session.subscription?.tag_limit ?? current.tagLimit;
  const activeTags = tags.filter((tag) => tag.status === "active").length;

  const notice =
    (params.checkout && notices[params.checkout]) ??
    (params.portal && notices[params.portal]) ??
    null;

  return (
    <div className="space-y-8">
      {session.mode === "demo" ? <DemoBanner /> : null}

      <PageHeader title="Billing" description="Your plan and tag allowance." />

      {notice ? <Alert tone={notice.tone}>{notice.text}</Alert> : null}

      <section className="rounded-2xl border border-line bg-white p-6 shadow-soft sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-ink-950">
                {current.name}
              </h2>
              {session.subscription?.status === "trialing" ? (
                <Badge tone="accent">Trial</Badge>
              ) : null}
            </div>
            <p className="mt-1 text-[0.9375rem] text-ink-700">
              ${current.price}/month · {limit} tags
            </p>
            {session.subscription?.current_period_end ? (
              <p className="mt-1 text-sm text-ink-500">
                {session.subscription.cancel_at_period_end ? "Ends" : "Renews"}{" "}
                {formatDate(session.subscription.current_period_end)}
              </p>
            ) : null}
          </div>

          <form action="/api/billing/portal" method="post">
            <button
              type="submit"
              className="rounded-full border border-line-strong px-5 py-2.5 text-[0.9375rem] font-medium text-ink-950 transition-colors hover:bg-surface-muted"
            >
              Manage Billing
            </button>
          </form>
        </div>

        <div className="mt-6 border-t border-line pt-6">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-ink-700">Active tags</span>
            <span className="font-medium text-ink-950 tabular-nums">
              {activeTags} of {limit}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-sunken">
            <div
              className="h-full rounded-full bg-accent-500"
              style={{ width: `${Math.min(100, (activeTags / limit) * 100)}%` }}
            />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink-950">Change plan</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = plan.id === current.id;

            return (
              <div
                key={plan.id}
                className={cn(
                  "flex flex-col rounded-2xl border bg-white p-6 shadow-soft",
                  isCurrent ? "border-ink-950" : "border-line",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-ink-950">{plan.name}</h3>
                  {isCurrent ? <Badge tone="neutral">Current</Badge> : null}
                </div>

                <p className="mt-3 text-2xl font-semibold text-ink-950">
                  ${plan.price}
                  <span className="text-sm font-normal text-ink-500">/month</span>
                </p>
                <p className="mt-1 text-sm text-ink-700">{plan.tagline}</p>

                <form
                  action="/api/billing/checkout"
                  method="post"
                  className="mt-6"
                >
                  <input type="hidden" name="plan" value={plan.id} />
                  <button
                    type="submit"
                    disabled={isCurrent}
                    className={cn(
                      "h-11 w-full rounded-full text-[0.9375rem] font-medium transition-colors",
                      isCurrent
                        ? "cursor-not-allowed bg-surface-muted text-ink-400"
                        : "bg-accent-500 text-white hover:bg-accent-600",
                    )}
                  >
                    {isCurrent ? "Current plan" : plan.cta}
                  </button>
                </form>
              </div>
            );
          })}
        </div>

        <p className="mt-6 text-sm text-ink-500">{pricingNote}</p>
      </section>
    </div>
  );
}
