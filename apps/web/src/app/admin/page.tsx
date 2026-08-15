import type { Metadata } from 'next';
import Link from 'next/link';
import { formatMoney } from '@afd/shared';
import { requirePlatformAdmin } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase/server';
import { integrationStatus, DEMO_MODE } from '@/lib/env';
import { Badge, Card, CardContent, CardHeader, CardTitle, Progress } from '@/components/ui';

export const metadata: Metadata = { title: 'Platform admin' };
export const dynamic = 'force-dynamic';

interface PlatformMetrics {
  active_businesses: number;
  total_businesses: number;
  mrr_cents: number;
  founder: { total: number; active: number; reserved: number; remaining: number };
  calls_today: number;
  minutes_today: number;
  leads_today: number;
  appointments_today: number;
  subscriptions_by_status: Record<string, number>;
  webhooks_24h: Record<string, number>;
  errors_24h: number;
}

export default async function AdminOverviewPage() {
  await requirePlatformAdmin();
  const svc = getServiceSupabase();

  const [{ data }, assistants] = await Promise.all([
    svc.rpc('admin_platform_metrics'),
    svc
      .from('organizations')
      .select('vapi_assistant_id, vapi_sync_error')
      .not('vapi_assistant_id', 'is', null),
  ]);

  const m = (data ?? {}) as PlatformMetrics;
  const founder = m.founder ?? { total: 50, active: 0, reserved: 0, remaining: 50 };
  const claimed = founder.total - founder.remaining;
  const integrations = integrationStatus();

  // Voice health is derived from our own records rather than by polling Vapi, so
  // loading the admin page never depends on a third party being reachable.
  const assistantCount = assistants.data?.length ?? 0;
  const outOfSync = (assistants.data ?? []).filter((o) => o.vapi_sync_error).length;

  const webhookTotal = Object.values(m.webhooks_24h ?? {}).reduce((a, b) => a + b, 0);
  const webhookFailed = (m.webhooks_24h ?? {}).failed ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Platform overview</h1>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Active businesses" value={String(m.active_businesses ?? 0)} detail={`${m.total_businesses ?? 0} total`} />
        <Metric label="MRR" value={formatMoney(m.mrr_cents ?? 0)} detail="From active subscriptions" />
        <Metric label="Calls today" value={String(m.calls_today ?? 0)} detail={`${m.minutes_today ?? 0} billable minutes`} />
        <Metric label="Leads today" value={String(m.leads_today ?? 0)} detail={`${m.appointments_today ?? 0} appointments`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Founding 50</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-3xl font-semibold tabular text-ink">
              {claimed}
              <span className="text-base font-normal text-ink-subtle"> / {founder.total}</span>
            </p>
            <Progress value={claimed} max={founder.total} label={`${claimed} of ${founder.total} claimed`} />
            <ul className="space-y-1 text-sm text-ink-muted">
              <li>{founder.active} activated (permanent)</li>
              <li>{founder.reserved} reserved at checkout</li>
              <li>{founder.remaining} remaining</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5 text-sm">
              {Object.entries(m.subscriptions_by_status ?? {}).map(([status, count]) => (
                <li key={status} className="flex justify-between">
                  <span className="text-ink-muted">{status.replace(/_/g, ' ')}</span>
                  <span className="tabular font-medium text-ink">{count}</span>
                </li>
              ))}
              {Object.keys(m.subscriptions_by_status ?? {}).length === 0 && (
                <li className="text-ink-subtle">No subscriptions yet.</li>
              )}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Health</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <HealthRow
                label="Voice (Vapi)"
                ok={integrations.vapi || DEMO_MODE}
                detail={
                  integrations.vapi
                    ? 'API key configured'
                    : DEMO_MODE
                      ? 'Demo mode — no real calls'
                      : 'VAPI_API_KEY not set'
                }
              />
              <HealthRow
                label="Assistants"
                ok={outOfSync === 0}
                detail={`${assistantCount} live, ${outOfSync} out of sync`}
              />
              <HealthRow label="Database" ok detail="Reachable" />
              <HealthRow
                label="Webhooks (24h)"
                ok={webhookFailed === 0}
                detail={`${webhookTotal} received, ${webhookFailed} failed`}
              />
              <HealthRow
                label="Errors (24h)"
                ok={(m.errors_24h ?? 0) === 0}
                detail={`${m.errors_24h ?? 0} recorded`}
              />
            </ul>
            <div className="mt-4 border-t border-line pt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Integrations</p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {Object.entries(integrations).map(([key, enabled]) => (
                  <li key={key}>
                    <Badge tone={key === 'demoMode' ? (enabled ? 'caution' : 'neutral') : enabled ? 'positive' : 'critical'}>
                      {key}
                      {key === 'demoMode' ? (enabled ? ': on' : ': off') : enabled ? ' ✓' : ' ✗'}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      <p className="text-sm text-ink-subtle">
        <Link href="/admin/businesses" className="font-medium text-brand-600 hover:underline">
          View all businesses
        </Link>
      </p>
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-subtle">{label}</p>
        <p className="mt-2 text-2xl font-semibold tabular text-ink">{value}</p>
        <p className="mt-1 text-xs text-ink-subtle">{detail}</p>
      </CardContent>
    </Card>
  );
}

function HealthRow({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <li className="flex items-center justify-between gap-2">
      <span className="text-ink-muted">{label}</span>
      <Badge tone={ok ? 'positive' : 'critical'}>{detail}</Badge>
    </li>
  );
}
