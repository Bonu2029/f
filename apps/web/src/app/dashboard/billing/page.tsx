import type { Metadata } from 'next';
import { AlertCircle, Receipt } from 'lucide-react';
import { PLANS, formatMoney, getPlan, summarizeUsage } from '@afd/shared';
import { requireSession } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase/server';
import { getBillingProvider } from '@/lib/providers/billing';
import { DEMO_MODE } from '@/lib/env';
import { Alert, Badge, Card, CardContent, CardHeader, CardTitle, Progress, Table, Td, Th } from '@/components/ui';
import { StatusBadge } from '@/components/dashboard/badges';
import { BillingActions } from './billing-actions';

export const metadata: Metadata = { title: 'Billing' };
export const dynamic = 'force-dynamic';

export default async function BillingPage() {
  const ctx = await requireSession();
  const isOwner = ctx.active.role === 'owner';
  const svc = getServiceSupabase();

  const { data: subscription } = await svc
    .from('subscriptions')
    .select('*')
    .eq('organization_id', ctx.active.organizationId)
    .maybeSingle();

  const plan = getPlan(subscription?.plan);
  const usage = summarizeUsage(subscription?.plan, subscription?.used_minutes ?? 0);

  // Usage ledger for the current period — the audit trail behind the number.
  const { data: ledger } = await svc
    .from('usage_ledger')
    .select('id, billing_period, voice_seconds, billable_minutes, sms_count, created_at, call_id')
    .eq('organization_id', ctx.active.organizationId)
    .order('created_at', { ascending: false })
    .limit(15);

  let invoices: Awaited<ReturnType<ReturnType<typeof getBillingProvider>['listInvoices']>> = [];
  let invoiceError: string | null = null;
  if (isOwner && subscription?.stripe_customer_id) {
    try {
      invoices = await getBillingProvider().listInvoices(subscription.stripe_customer_id as string, 12);
    } catch {
      invoiceError = 'Invoices could not be loaded right now. Use Manage billing to view them in Stripe.';
    }
  }

  const renewal = subscription?.billing_period_end
    ? new Date(subscription.billing_period_end as string).toLocaleDateString(undefined, {
        timeZone: ctx.active.timezone,
        dateStyle: 'long',
      })
    : null;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Billing</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Your plan, usage and invoices. Payment details are held by Stripe — we never store them.
        </p>
      </header>

      {DEMO_MODE && (
        <Alert tone="caution" title="Demo mode">
          This deployment runs with mock billing, so no payment has been taken and no invoices exist.
          Set <code>DEMO_MODE=false</code> and add your Stripe keys to bill for real.
        </Alert>
      )}

      {subscription?.status === 'past_due' && (
        <Alert tone="critical" title="Your last payment did not go through">
          Your receptionist is still answering, but update your payment method to avoid interruption.
        </Alert>
      )}

      {subscription?.cancel_at_period_end && (
        <Alert tone="caution" title="Subscription ends at the end of this period">
          Your receptionist will stop answering on {renewal ?? 'the renewal date'}. You can reactivate
          from the billing portal.
          {subscription.founder ? ' Your Founding Member rate does not carry over to a new subscription.' : ''}
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Current plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold tracking-tight text-ink">
                ${(plan.priceCents / 100).toFixed(0)}
              </span>
              <span className="text-sm text-ink-subtle">/month</span>
            </div>
            <p className="text-sm font-medium text-ink">{plan.name}</p>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={(subscription?.status as string) ?? 'incomplete'} />
              {subscription?.founder && (
                <Badge tone="brand">Founding Member #{subscription.founder_slot as number}</Badge>
              )}
            </div>
            {renewal && (
              <p className="text-sm text-ink-subtle">
                {subscription?.cancel_at_period_end ? 'Ends' : 'Renews'} {renewal}
              </p>
            )}
            {subscription?.founder && (
              <p className="text-xs text-ink-subtle">
                Your rate holds while this subscription stays continuously active.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage this period</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-3xl font-semibold tabular tracking-tight text-ink">
              {usage.usedMinutes}
              <span className="text-base font-normal text-ink-subtle"> / {usage.includedMinutes} min</span>
            </p>
            <Progress
              value={usage.usedMinutes}
              max={usage.includedMinutes}
              tone={usage.percentUsed >= 100 ? 'critical' : usage.percentUsed >= 70 ? 'caution' : 'brand'}
              label={`${usage.usedMinutes} of ${usage.includedMinutes} minutes used`}
            />
            {usage.overageMinutes > 0 ? (
              <div className="rounded-lg border border-amber-200 bg-caution-soft px-3 py-2 text-sm">
                <p className="font-medium text-amber-900">
                  {usage.overageMinutes} minute{usage.overageMinutes === 1 ? '' : 's'} over ·{' '}
                  {formatMoney(usage.overageCents)}
                </p>
                <p className="mt-0.5 text-xs text-amber-900/80">
                  Estimated. Overage is billed by Stripe on your next invoice at{' '}
                  {formatMoney(plan.overageCentsPerMinute)} per minute.
                </p>
              </div>
            ) : (
              <p className="text-sm text-ink-subtle">
                {usage.remainingMinutes} minute{usage.remainingMinutes === 1 ? '' : 's'} remaining.
              </p>
            )}
            <p className="text-xs text-ink-subtle">
              Each call is rounded up to the next whole minute.
            </p>
          </CardContent>
        </Card>
      </div>

      {isOwner ? (
        <BillingActions hasCustomer={Boolean(subscription?.stripe_customer_id)} demo={DEMO_MODE} />
      ) : (
        <Alert tone="neutral" title="Billing is owner-only">
          Ask an owner on your team to change the plan or payment method.
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent usage</CardTitle>
        </CardHeader>
        <CardContent>
          {(ledger ?? []).length === 0 ? (
            <p className="text-sm text-ink-subtle">No usage recorded yet.</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>When</Th>
                  <Th>Type</Th>
                  <Th className="text-right">Seconds</Th>
                  <Th className="text-right">Billed minutes</Th>
                </tr>
              </thead>
              <tbody>
                {(ledger ?? []).map((row) => (
                  <tr key={row.id as string}>
                    <Td className="text-sm text-ink-muted">
                      {new Date(row.created_at as string).toLocaleString(undefined, {
                        timeZone: ctx.active.timezone,
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </Td>
                    <Td className="text-sm">{row.sms_count ? 'Text message' : 'Voice call'}</Td>
                    <Td className="text-right tabular">{(row.voice_seconds as number) || '—'}</Td>
                    <Td className="text-right tabular font-medium">
                      {(row.billable_minutes as number) || '—'}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>

      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="size-4 text-ink-faint" aria-hidden />
              Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            {invoiceError ? (
              <div className="flex items-start gap-2 text-sm text-ink-muted">
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-caution" aria-hidden />
                {invoiceError}
              </div>
            ) : invoices.length === 0 ? (
              <p className="text-sm text-ink-subtle">No invoices yet.</p>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Invoice</Th>
                    <Th>Date</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Amount</Th>
                    <Th className="text-right">Link</Th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id}>
                      <Td className="tabular text-sm">{inv.number ?? inv.id.slice(-8)}</Td>
                      <Td className="text-sm text-ink-muted">
                        {new Date(inv.created * 1000).toLocaleDateString()}
                      </Td>
                      <Td>
                        <StatusBadge status={inv.status ?? 'unknown'} />
                      </Td>
                      <Td className="text-right tabular">{formatMoney(inv.amountPaid)}</Td>
                      <Td className="text-right">
                        {inv.hostedUrl && (
                          <a
                            href={inv.hostedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-brand-600 hover:underline"
                          >
                            View
                          </a>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-ink-subtle">
        Plans available: {Object.values(PLANS).map((p) => `${p.name} $${p.priceCents / 100}/mo`).join(' · ')}.
      </p>
    </div>
  );
}
