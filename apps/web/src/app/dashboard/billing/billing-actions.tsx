'use client';

import { useState } from 'react';
import { CreditCard, ExternalLink } from 'lucide-react';
import { Alert, Button, Card, CardContent } from '@/components/ui';

/**
 * Billing controls. Payment methods, invoices and cancellation are all handled
 * inside the Stripe Customer Portal — this app never touches card data.
 */
export function BillingActions({ hasCustomer, demo }: { hasCustomer: boolean; demo: boolean }) {
  const [loading, setLoading] = useState<'portal' | 'checkout' | null>(null);
  const [error, setError] = useState<{ message: string; action?: string } | null>(null);

  async function openPortal() {
    setLoading('portal');
    setError(null);
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        setError({ message: json?.error?.message ?? 'The billing portal could not be opened.', action: json?.error?.action });
        setLoading(null);
        return;
      }
      window.location.href = json.url;
    } catch {
      setError({ message: 'We could not reach the billing service. Please try again.' });
      setLoading(null);
    }
  }

  async function startCheckout() {
    setLoading('checkout');
    setError(null);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) {
        setError({ message: json?.error?.message ?? 'Checkout could not be started.', action: json?.error?.action });
        setLoading(null);
        return;
      }
      window.location.href = json.url;
    } catch {
      setError({ message: 'We could not reach the billing service. Please try again.' });
      setLoading(null);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 pt-5">
        {error && (
          <Alert tone="critical" title={error.message}>
            {error.action && <p>{error.action}</p>}
          </Alert>
        )}

        <div className="flex flex-wrap gap-3">
          {hasCustomer ? (
            <Button loading={loading === 'portal'} onClick={openPortal}>
              <CreditCard aria-hidden /> Manage billing
            </Button>
          ) : (
            <Button loading={loading === 'checkout'} onClick={startCheckout}>
              <CreditCard aria-hidden /> Start subscription
            </Button>
          )}
        </div>

        <p className="text-xs text-ink-subtle">
          {demo
            ? 'Demo mode: the portal link is a local placeholder because no Stripe customer exists.'
            : 'Opens the Stripe Customer Portal, where you can update your card, download invoices and cancel.'}
          {!demo && <ExternalLink className="ml-1 inline size-3" aria-hidden />}
        </p>
      </CardContent>
    </Card>
  );
}
