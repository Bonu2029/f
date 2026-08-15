'use client';

import { useState } from 'react';
import { Check, ShieldCheck } from 'lucide-react';
import { PLANS, formatPrice } from '@afd/shared';
import { Alert, Badge, Button, Card, CardContent } from '@/components/ui';

/**
 * Plan confirmation before Stripe Checkout.
 *
 * The plan shown here is a *display* of what the server already decided. When
 * the user continues, the server re-derives eligibility and may return a
 * different plan — which is surfaced honestly rather than silently swapped.
 */
export function StartCheckout({
  businessName,
  founderAvailable,
  remaining,
  total,
  firstName,
}: {
  businessName: string;
  founderAvailable: boolean;
  remaining: number;
  total: number;
  firstName: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; action?: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const plan = founderAvailable ? PLANS.founder : PLANS.standard;

  async function startCheckout() {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: founderAvailable ? 'founder' : 'standard' }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError({ message: json?.error?.message ?? 'Checkout could not be started.', action: json?.error?.action });
        setLoading(false);
        return;
      }

      if (json.downgraded) {
        setNotice(
          'The last Founding Member spot was claimed while you were deciding. Continuing at the standard price instead.',
        );
      }

      window.location.href = json.url;
    } catch {
      setError({
        message: 'We could not reach the billing service. Nothing was charged — please try again.',
      });
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          {firstName ? `You're almost there, ${firstName}` : 'You’re almost there'}
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Confirm your plan for <strong className="text-ink">{businessName}</strong>, then we&rsquo;ll
          set up your receptionist together.
        </p>
      </div>

      {error && (
        <Alert tone="critical" title={error.message} className="mt-6">
          {error.action && <p>{error.action}</p>}
        </Alert>
      )}
      {notice && <Alert tone="caution" title="Plan changed" className="mt-6">{notice}</Alert>}

      <Card className="mt-6">
        {founderAvailable && (
          <div className="border-b border-brand-100 bg-brand-50 px-5 py-2.5 text-center">
            <Badge tone="brand">
              {remaining} of {total} Founding Member spots left
            </Badge>
          </div>
        )}
        <CardContent className="pt-6">
          <div className="flex items-baseline justify-center gap-2">
            {plan.compareAtCents && (
              <span className="text-xl text-ink-faint line-through">
                {formatPrice(plan.compareAtCents)}
              </span>
            )}
            <span className="text-4xl font-semibold tracking-tight text-ink">
              {formatPrice(plan.priceCents)}
            </span>
            <span className="text-sm text-ink-subtle">/month</span>
          </div>
          <p className="mt-2 text-center text-sm font-medium text-ink">{plan.name}</p>
          <p className="mt-1 text-center text-xs text-ink-subtle">{plan.blurb}</p>

          <ul className="mt-6 space-y-2">
            {plan.features.slice(0, 7).map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-ink-muted">
                <Check className="mt-0.5 size-4 shrink-0 text-positive" aria-hidden />
                {f}
              </li>
            ))}
          </ul>

          <Button size="lg" className="mt-7 w-full" loading={loading} onClick={startCheckout}>
            {loading ? 'Opening secure checkout' : `Continue — ${formatPrice(plan.priceCents)}/month`}
          </Button>

          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-ink-subtle">
            <ShieldCheck className="size-3.5" aria-hidden />
            Payment is handled by Stripe. We never see your card details.
          </p>
          <p className="mt-2 text-center text-xs text-ink-subtle">
            Additional minutes {formatPrice(plan.overageCentsPerMinute)} each. Cancel any time.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
