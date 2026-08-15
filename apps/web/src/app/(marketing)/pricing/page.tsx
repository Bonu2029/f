import type { Metadata } from 'next';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { PLANS, formatPrice } from '@afd/shared';
import { getFounderStats } from '@/server/founder';
import { Badge, Button, Card, CardContent, Progress } from '@/components/ui';
import { FaqList } from '@/components/marketing/faq';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'One plan, one price, no per-seat billing. Founding Member pricing while spots remain.',
};

export const revalidate = 30;

export default async function PricingPage() {
  const stats = await getFounderStats().catch(() => null);
  const founderAvailable = Boolean(stats && !stats.soldOut);
  const plan = founderAvailable ? PLANS.founder : PLANS.standard;
  const claimed = stats ? stats.total - stats.remaining : PLANS.founder.capacity ?? 50;

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:py-20">
      <div className="text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-ink">
          One price. Everything included.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-ink-muted">
          No setup fee, no per-user charge, no contract. Just a receptionist that answers your phone.
        </p>
      </div>

      <Card className="mx-auto mt-12 max-w-2xl overflow-hidden">
        {founderAvailable && (
          <div className="border-b border-brand-100 bg-brand-50 px-6 py-3 text-center">
            <Badge tone="brand" className="py-1">
              Founding Member — limited to {PLANS.founder.capacity} businesses
            </Badge>
          </div>
        )}

        <CardContent className="pt-8">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-ink">{plan.name}</h2>

            <div className="mt-4 flex items-baseline justify-center gap-3">
              {plan.compareAtCents && (
                <span className="text-3xl text-ink-faint line-through" aria-label="Regular price">
                  {formatPrice(plan.compareAtCents)}
                </span>
              )}
              <span className="text-6xl font-semibold tracking-tight text-ink">
                {formatPrice(plan.priceCents)}
              </span>
              <span className="text-ink-subtle">/month</span>
            </div>

            <p className="mx-auto mt-4 max-w-md text-sm text-ink-muted">{plan.blurb}</p>
          </div>

          {founderAvailable && stats && (
            <div className="mx-auto mt-8 max-w-sm">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-ink">
                  {stats.remaining} of {stats.total} remaining
                </span>
                <span className="text-ink-subtle tabular">{claimed} claimed</span>
              </div>
              <Progress
                value={claimed}
                max={stats.total}
                className="mt-2"
                label={`${claimed} of ${stats.total} Founding Member spots claimed`}
              />
              {stats.reserved > 0 && (
                <p className="mt-2 text-center text-xs text-ink-subtle">
                  {stats.reserved} spot{stats.reserved === 1 ? '' : 's'} currently reserved at
                  checkout.
                </p>
              )}
            </div>
          )}

          <ul className="mx-auto mt-8 grid max-w-lg gap-2.5 sm:grid-cols-2">
            {plan.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-ink-muted">
                <Check className="mt-0.5 size-4 shrink-0 text-positive" aria-hidden />
                {f}
              </li>
            ))}
          </ul>

          <div className="mt-8 text-center">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/signup">
                {founderAvailable ? 'Claim my Founding spot' : `Get started — ${formatPrice(plan.priceCents)}/mo`}
              </Link>
            </Button>
            <p className="mt-3 text-xs text-ink-subtle">
              Additional minutes {formatPrice(plan.overageCentsPerMinute)} each. Each call is rounded
              up to the next whole minute. Cancel any time from the billing portal.
            </p>
          </div>
        </CardContent>
      </Card>

      {founderAvailable && (
        <Card className="mx-auto mt-6 max-w-2xl border-line bg-surface-sunken shadow-none">
          <CardContent className="pt-5 text-sm text-ink-muted">
            <p className="font-medium text-ink">After the Founding 50</p>
            <p className="mt-1">
              Once all {PLANS.founder.capacity} spots are claimed, new businesses join at{' '}
              {formatPrice(PLANS.standard.priceCents)}/month with{' '}
              {PLANS.standard.includedMinutes} included minutes. Founding Members keep{' '}
              {formatPrice(PLANS.founder.priceCents)}/month for as long as their subscription stays
              continuously active.
            </p>
          </CardContent>
        </Card>
      )}

      <section className="mt-16">
        <h2 className="text-2xl font-semibold tracking-tight text-ink">Pricing questions</h2>
        <div className="mt-6">
          <FaqList />
        </div>
      </section>
    </div>
  );
}
