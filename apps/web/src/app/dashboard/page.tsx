import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarCheck,
  Clock,
  PhoneCall,
  PhoneForwarded,
  Users,
} from 'lucide-react';
import {
  PLANS,
  formatDuration,
  formatPhone,
  greetingForTime,
  summarizeUsage,
} from '@afd/shared';
import { requireSession } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase/server';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Progress,
  Table,
  Td,
  Th,
} from '@/components/ui';
import { BarChart, OutcomeBreakdown, labelFor } from '@/components/dashboard/charts';
import { getReadinessChecklist } from '@/server/organizations';
import { LeadScoreBadge, StatusBadge } from '@/components/dashboard/badges';

export const metadata: Metadata = { title: 'Dashboard' };
export const dynamic = 'force-dynamic';

interface DashboardMetrics {
  calls_answered: number;
  calls_total: number;
  calls_transferred: number;
  leads_captured: number;
  appointments_booked: number;
  minutes_used: number;
  included_minutes: number;
  calls_by_day: Array<{ day: string; calls: number; booked: number }>;
  leads_by_day: Array<{ day: string; leads: number }>;
  outcomes: Array<{ disposition: string; count: number }>;
}

export default async function DashboardPage() {
  const ctx = await requireSession();
  const organizationId = ctx.active.organizationId;
  const svc = getServiceSupabase();

  const [metricsRes, subscriptionRes, recentCalls, recentLeads, readiness] = await Promise.all([
    svc.rpc('dashboard_metrics', { p_organization_id: organizationId, p_days: 30 }),
    svc
      .from('subscriptions')
      .select('plan, status, used_minutes, included_minutes, founder, founder_slot, billing_period_end')
      .eq('organization_id', organizationId)
      .maybeSingle(),
    svc
      .from('calls')
      .select('id, caller_phone, summary, summary_json, result, disposition, duration_seconds, started_at, transferred, appointment_booked')
      .eq('organization_id', organizationId)
      .order('started_at', { ascending: false })
      .limit(6),
    svc
      .from('leads')
      .select('id, name, phone, service_requested, lead_score, status, created_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(6),
    getReadinessChecklist(organizationId),
  ]);

  const metrics = (metricsRes.data ?? {}) as DashboardMetrics;
  const subscription = subscriptionRes.data;
  const usage = summarizeUsage(subscription?.plan, subscription?.used_minutes ?? 0);
  const plan = PLANS[(subscription?.plan as 'founder' | 'standard') ?? 'standard'] ?? PLANS.standard;

  const firstName = ctx.profile.first_name ?? ctx.profile.email.split('@')[0]!;
  const greeting = greetingForTime(new Date(), ctx.active.timezone);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            {greeting}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {readiness.isLive
              ? readiness.isReachable
                ? 'Here is what your receptionist has handled in the last 30 days.'
                : 'Your receptionist is switched on, but has no number for callers to reach.'
              : 'Your receptionist is not answering calls yet.'}
          </p>
        </div>
        {subscription?.founder && (
          <Badge tone="brand" className="py-1">
            Founding Member #{subscription.founder_slot} · $
            {(PLANS.founder.priceCents / 100).toFixed(0)}/month
          </Badge>
        )}
      </header>

      {!readiness.isLive && (
        <Alert
          tone="caution"
          title="Your receptionist is not live yet"
          action={
            <Button asChild size="sm">
              <Link href="/dashboard/receptionist">
                Finish setup <ArrowRight aria-hidden />
              </Link>
            </Button>
          }
        >
          {readiness.canGoLive
            ? 'Everything required is configured — activate it whenever you are ready.'
            : `Still to do: ${readiness.items
                .filter((i) => i.required && !i.done)
                .map((i) => i.label)
                .join(', ')}.`}
        </Alert>
      )}

      {/*
        Switched on and unreachable is its own state, and the least obvious
        one — every other indicator reads healthy while no call can arrive.
      */}
      {readiness.isLive && !readiness.isReachable && (
        <Alert
          tone="caution"
          title="Nobody can call your receptionist yet"
          action={
            <Button asChild size="sm">
              <Link href="/dashboard/receptionist">
                Get a number <ArrowRight aria-hidden />
              </Link>
            </Button>
          }
        >
          It is switched on and would answer, but you have no phone number. Get one, or forward
          your existing business line to it.
        </Alert>
      )}

      {ctx.active.aiPaused && readiness.isLive && (
        <Alert tone="critical" title="Your receptionist is paused">
          Incoming calls are not being answered by the AI. Resume it from the{' '}
          <Link className="font-medium underline" href="/dashboard/receptionist">
            Receptionist page
          </Link>
          .
        </Alert>
      )}

      {usage.thresholdCrossed === 100 && (
        <Alert tone="caution" title="You have used all your included minutes">
          Your receptionist is still answering. Additional minutes are billed at $
          {(plan.overageCentsPerMinute / 100).toFixed(2)} each — currently{' '}
          {usage.overageMinutes} minute{usage.overageMinutes === 1 ? '' : 's'} over.
        </Alert>
      )}

      {/* Metric cards ---------------------------------------------------- */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          icon={<PhoneCall className="size-4" aria-hidden />}
          label="Calls answered"
          value={metrics.calls_answered ?? 0}
          detail={`${metrics.calls_total ?? 0} received`}
        />
        <MetricCard
          icon={<Users className="size-4" aria-hidden />}
          label="Leads captured"
          value={metrics.leads_captured ?? 0}
          detail={
            metrics.calls_answered
              ? `${Math.round(((metrics.leads_captured ?? 0) / metrics.calls_answered) * 100)}% of answered calls`
              : 'No calls yet'
          }
        />
        <MetricCard
          icon={<CalendarCheck className="size-4" aria-hidden />}
          label="Appointments booked"
          value={metrics.appointments_booked ?? 0}
          detail={
            metrics.leads_captured
              ? `${Math.round(((metrics.appointments_booked ?? 0) / metrics.leads_captured) * 100)}% of leads`
              : '—'
          }
        />
        <MetricCard
          icon={<PhoneForwarded className="size-4" aria-hidden />}
          label="Calls transferred"
          value={metrics.calls_transferred ?? 0}
          detail={
            metrics.calls_answered
              ? `${Math.round(((metrics.calls_transferred ?? 0) / metrics.calls_answered) * 100)}% of answered calls`
              : '—'
          }
        />
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-ink-subtle">
              <Clock className="size-4" aria-hidden />
              <span className="text-xs font-medium uppercase tracking-wide">Minutes used</span>
            </div>
            <p className="mt-2 text-2xl font-semibold tabular text-ink">
              {usage.usedMinutes}
              <span className="text-base font-normal text-ink-subtle"> / {usage.includedMinutes}</span>
            </p>
            <Progress
              className="mt-2"
              value={usage.usedMinutes}
              max={usage.includedMinutes}
              tone={usage.percentUsed >= 100 ? 'critical' : usage.percentUsed >= 70 ? 'caution' : 'brand'}
              label={`${usage.usedMinutes} of ${usage.includedMinutes} minutes used`}
            />
            <p className="mt-1.5 text-xs text-ink-subtle">
              {usage.overageMinutes > 0
                ? `${usage.overageMinutes} min over · $${(usage.overageCents / 100).toFixed(2)}`
                : `${usage.remainingMinutes} minutes remaining`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts ---------------------------------------------------------- */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Calls over the last 30 days</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              label="Calls per day"
              data={(metrics.calls_by_day ?? []).map((d) => ({ day: d.day, value: d.calls }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Call outcomes</CardTitle>
          </CardHeader>
          <CardContent>
            <OutcomeBreakdown outcomes={metrics.outcomes ?? []} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Leads over the last 30 days</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              tone="positive"
              label="Leads per day"
              data={(metrics.leads_by_day ?? []).map((d) => ({ day: d.day, value: d.leads }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appointments booked per day</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              label="Appointments per day"
              data={(metrics.calls_by_day ?? []).map((d) => ({ day: d.day, value: d.booked }))}
            />
          </CardContent>
        </Card>
      </div>

      {/* Recent activity ------------------------------------------------- */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent calls</CardTitle>
            <Link href="/dashboard/calls" className="text-sm font-medium text-brand-600 hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {(recentCalls.data ?? []).length === 0 ? (
              <EmptyState
                icon={<PhoneCall className="size-6" aria-hidden />}
                title="No calls yet"
                description="Once your receptionist starts answering, conversations will appear here."
              />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Caller</Th>
                    <Th>Reason</Th>
                    <Th>Result</Th>
                    <Th className="text-right">Duration</Th>
                  </tr>
                </thead>
                <tbody>
                  {(recentCalls.data ?? []).map((call) => {
                    const summary = call.summary_json as { reason?: string } | null;
                    return (
                      <tr key={call.id} className="hover:bg-surface-sunken">
                        <Td>
                          <Link href={`/dashboard/calls/${call.id}`} className="font-medium hover:underline tabular">
                            {formatPhone(call.caller_phone as string) || 'Unknown'}
                          </Link>
                          <p className="text-xs text-ink-subtle">
                            {new Date(call.started_at as string).toLocaleString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </p>
                        </Td>
                        <Td className="max-w-[220px]">
                          <span className="line-clamp-2 text-sm text-ink-muted">
                            {summary?.reason ?? call.summary ?? '—'}
                          </span>
                        </Td>
                        <Td>
                          <Badge
                            tone={
                              call.appointment_booked ? 'positive' : call.transferred ? 'brand' : 'neutral'
                            }
                          >
                            {call.appointment_booked
                              ? 'Booked'
                              : call.transferred
                                ? 'Transferred'
                                : labelFor((call.disposition as string) ?? 'unrecorded')}
                          </Badge>
                        </Td>
                        <Td className="text-right tabular text-ink-muted">
                          {formatDuration(call.duration_seconds as number)}
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent leads</CardTitle>
            <Link href="/dashboard/leads" className="text-sm font-medium text-brand-600 hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {(recentLeads.data ?? []).length === 0 ? (
              <EmptyState
                icon={<Users className="size-6" aria-hidden />}
                title="No leads yet"
                description="Callers your receptionist captures details from will show up here."
              />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Customer</Th>
                    <Th>Service</Th>
                    <Th>Score</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {(recentLeads.data ?? []).map((lead) => (
                    <tr key={lead.id} className="hover:bg-surface-sunken">
                      <Td>
                        <Link href={`/dashboard/leads/${lead.id}`} className="font-medium hover:underline">
                          {(lead.name as string) || 'Unnamed caller'}
                        </Link>
                        <p className="text-xs tabular text-ink-subtle">
                          {formatPhone(lead.phone as string)}
                        </p>
                      </Td>
                      <Td className="text-sm text-ink-muted">{(lead.service_requested as string) ?? '—'}</Td>
                      <Td>
                        <LeadScoreBadge score={lead.lead_score as 'hot' | 'warm' | 'cold'} />
                      </Td>
                      <Td>
                        <StatusBadge status={lead.status as string} />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center gap-2 text-ink-subtle">
          {icon}
          <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
        </div>
        <p className="mt-2 text-2xl font-semibold tabular text-ink">{value}</p>
        <p className="mt-1.5 text-xs text-ink-subtle">{detail}</p>
      </CardContent>
    </Card>
  );
}
