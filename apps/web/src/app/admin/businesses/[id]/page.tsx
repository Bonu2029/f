import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { formatPhone, scheduledEnd } from '@afd/shared';
import { requirePlatformAdmin } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase/server';
import { listOrganizationMembers } from '@/server/members';
import { AUDIT_ACTIONS, recordAudit } from '@/lib/audit';
import { Badge, Card, CardContent, CardHeader, CardTitle, Table, Td, Th } from '@/components/ui';
import { StatusBadge } from '@/components/dashboard/badges';
import { AdminOrgActions } from './admin-actions';

export const metadata: Metadata = { title: 'Business detail', robots: { index: false } };
export const dynamic = 'force-dynamic';

/**
 * Read-only inspection of one tenant, plus the small set of support actions an
 * operator legitimately needs. There is deliberately NO "log in as customer"
 * function — impersonation would defeat the tenant isolation this product is
 * built on.
 */
export default async function AdminBusinessPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePlatformAdmin();
  const { id } = await params;
  const svc = getServiceSupabase();

  const { data: org } = await svc.from('organizations').select('*').eq('id', id).maybeSingle();
  if (!org) notFound();

  // Viewing a customer account is itself an auditable event.
  await recordAudit({
    organizationId: id,
    actorUserId: admin.id,
    actorEmail: admin.email ?? null,
    action: AUDIT_ACTIONS.ADMIN_VIEWED_ORG,
    targetType: 'organization',
    targetId: id,
  });

  const [subscription, business, phone, members, calls, errorEvents, agent] = await Promise.all([
    svc.from('subscriptions').select('*').eq('organization_id', id).maybeSingle(),
    svc.from('business_profiles').select('*').eq('organization_id', id).maybeSingle(),
    svc.from('phone_numbers').select('*').eq('organization_id', id),
    // Two queries behind one call: organization_members and profiles have no
    // foreign key between them, so an embedded select returns nothing.
    listOrganizationMembers(id),
    svc
      .from('calls')
      .select('id, started_at, duration_seconds, billable_minutes, result, disposition')
      .eq('organization_id', id)
      .order('started_at', { ascending: false })
      .limit(10),
    svc
      .from('error_events')
      .select('id, scope, message, created_at, severity')
      .eq('organization_id', id)
      .order('created_at', { ascending: false })
      .limit(10),
    svc.from('ai_agents').select('active, voice_id, name, vapi_assistant_id, vapi_sync_error').eq('organization_id', id).maybeSingle(),
  ]);


  return (
    <div className="space-y-5">
      <Link href="/admin/businesses" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> All businesses
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{org.name as string}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {org.slug as string} · created {new Date(org.created_at as string).toLocaleDateString()} ·{' '}
            {org.timezone as string}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={org.status as string} />
          {org.ai_paused ? <Badge tone="critical">AI paused</Badge> : null}
          {org.is_demo ? <Badge tone="caution">Demo</Badge> : null}
          {subscription.data?.founder ? (
            <Badge tone="brand">Founder #{subscription.data.founder_slot as number}</Badge>
          ) : null}
        </div>
      </header>

      <AdminOrgActions
        organizationId={id}
        aiPaused={Boolean(org.ai_paused)}
        usedMinutes={(subscription.data?.used_minutes as number) ?? 0}
        ownerEmail={members.find((m) => m.role === 'owner')?.email ?? ''}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
          </CardHeader>
          <CardContent>
            {subscription.data ? (
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <Detail label="Plan" value={subscription.data.plan as string} />
                <Detail label="Status" value={subscription.data.status as string} />
                <Detail
                  label="Minutes"
                  value={`${subscription.data.used_minutes as number} / ${subscription.data.included_minutes as number}`}
                />
                <Detail
                  label="Renews"
                  value={
                    subscription.data.billing_period_end
                      ? new Date(subscription.data.billing_period_end as string).toLocaleDateString()
                      : '—'
                  }
                />
                <Detail label="Stripe customer" value={(subscription.data.stripe_customer_id as string) ?? '—'} />
                <Detail
                  label="Scheduled to end"
                  value={(() => {
                    // Both of Stripe's signals. Reading only the boolean shows
                    // "No" for a portal cancellation, which is what support
                    // would tell a customer who had already cancelled.
                    const ending = scheduledEnd({
                      cancelAtPeriodEnd: subscription.data.cancel_at_period_end as boolean | null,
                      cancelAt: subscription.data.cancel_at as string | null,
                      billingPeriodEnd: subscription.data.billing_period_end as string | null,
                    });
                    if (!ending.ending) return 'No';
                    return ending.endsAt
                      ? `Yes — ${new Date(ending.endsAt).toLocaleDateString()}`
                      : 'Yes';
                  })()}
                />
              </dl>
            ) : (
              <p className="text-sm text-ink-subtle">No subscription record.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Receptionist</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <Detail label="Name" value={(agent.data?.name as string) ?? '—'} />
              <Detail label="Voice" value={(agent.data?.voice_id as string) ?? '—'} />
              <Detail label="Active" value={agent.data?.active ? 'Yes' : 'No'} />
              <Detail
                label="Assistant"
                value={
                  agent.data?.vapi_sync_error
                    ? 'Out of sync'
                    : agent.data?.vapi_assistant_id
                      ? 'Published'
                      : 'Not created'
                }
              />
              <Detail label="Industry" value={(business.data?.industry as string) ?? '—'} />
              <Detail
                label="Phone"
                value={
                  (phone.data ?? [])
                    .filter((p) => p.status === 'active')
                    .map((p) => formatPhone(p.phone_number as string))
                    .join(', ') || '—'
                }
              />
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1.5 text-sm">
            {members.map((m) => (
              <li key={m.id} className="flex justify-between">
                <span className="text-ink-muted">
                  {[m.firstName, m.lastName].filter(Boolean).join(' ') || m.email || 'No profile'}
                </span>
                <Badge tone={m.role === 'owner' ? 'brand' : 'neutral'}>{m.role}</Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent calls</CardTitle>
        </CardHeader>
        <CardContent>
          {(calls.data ?? []).length === 0 ? (
            <p className="text-sm text-ink-subtle">No calls yet.</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>When</Th>
                  <Th>Result</Th>
                  <Th className="text-right">Duration</Th>
                  <Th className="text-right">Billed</Th>
                </tr>
              </thead>
              <tbody>
                {(calls.data ?? []).map((c) => (
                  <tr key={c.id as string}>
                    <Td className="text-sm text-ink-muted">
                      {new Date(c.started_at as string).toLocaleString()}
                    </Td>
                    <Td className="text-sm">{(c.disposition as string) ?? (c.result as string)}</Td>
                    <Td className="text-right tabular text-sm">{c.duration_seconds as number}s</Td>
                    <Td className="text-right tabular text-sm">{c.billable_minutes as number} min</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent errors</CardTitle>
        </CardHeader>
        <CardContent>
          {(errorEvents.data ?? []).length === 0 ? (
            <p className="text-sm text-ink-subtle">No errors recorded.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {(errorEvents.data ?? []).map((e) => (
                <li key={e.id as string} className="rounded-lg border border-line p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone="critical">{e.scope as string}</Badge>
                    <span className="text-xs text-ink-subtle">
                      {new Date(e.created_at as string).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 text-ink-muted">{e.message as string}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-ink-subtle">
        Customer call transcripts and lead details are intentionally not shown here. Support access
        to customer conversation content should require an explicit, separately-audited process.
      </p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-ink-faint">{label}</dt>
      <dd className="mt-0.5 truncate text-ink">{value}</dd>
    </div>
  );
}
