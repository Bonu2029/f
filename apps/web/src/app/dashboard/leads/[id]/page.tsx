import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Info } from 'lucide-react';
import { formatDuration, formatPhone } from '@afd/shared';
import { requireSession } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { LeadScoreBadge, StatusBadge, UrgencyBadge } from '@/components/dashboard/badges';
import { LeadPhotos } from '@/components/dashboard/lead-photos';
import { LeadEditForm } from './lead-edit-form';

export const metadata: Metadata = { title: 'Lead' };
export const dynamic = 'force-dynamic';

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireSession();
  const svc = getServiceSupabase();

  const { data: lead } = await svc
    .from('leads')
    .select('*')
    .eq('id', id)
    .eq('organization_id', ctx.active.organizationId)
    .maybeSingle();

  if (!lead) notFound();

  const [{ data: calls }, { data: appointments }, { data: messages }] = await Promise.all([
    svc
      .from('calls')
      .select('id, started_at, duration_seconds, summary, disposition')
      .eq('lead_id', id)
      .eq('organization_id', ctx.active.organizationId)
      .order('started_at', { ascending: false }),
    svc
      .from('appointments')
      .select('id, start_at, service, status')
      .eq('lead_id', id)
      .eq('organization_id', ctx.active.organizationId)
      .order('start_at'),
    svc
      .from('sms_messages')
      .select('id, direction, body, status, created_at')
      .eq('lead_id', id)
      .eq('organization_id', ctx.active.organizationId)
      .order('created_at'),
  ]);

  const reasons = (lead.score_reasons as string[]) ?? [];
  const tz = ctx.active.timezone;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Link
        href="/dashboard/leads"
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden /> All leads
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            {(lead.name as string) || 'Unnamed caller'}
          </h1>
          <p className="mt-1 text-sm tabular text-ink-muted">
            {formatPhone(lead.phone as string) || 'No phone number captured'}
            {lead.email ? ` · ${lead.email as string}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <LeadScoreBadge score={lead.lead_score as 'hot' | 'warm' | 'cold'} />
          <UrgencyBadge urgency={lead.urgency as string} />
          <StatusBadge status={lead.status as string} />
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Lead details</CardTitle>
            </CardHeader>
            <CardContent>
              <LeadEditForm
                leadId={id}
                canEdit
                initial={{
                  name: (lead.name as string) ?? '',
                  phone: (lead.phone as string) ?? '',
                  email: (lead.email as string) ?? '',
                  address: (lead.address as string) ?? '',
                  city: (lead.city as string) ?? '',
                  state: (lead.state as string) ?? '',
                  postal_code: (lead.postal_code as string) ?? '',
                  service_requested: (lead.service_requested as string) ?? '',
                  description: (lead.description as string) ?? '',
                  urgency: (lead.urgency as string) ?? 'unknown',
                  status: (lead.status as string) ?? 'new',
                  estimated_value:
                    lead.estimated_value != null ? String((lead.estimated_value as number) / 100) : '',
                  notes: (lead.notes as string) ?? '',
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Call history</CardTitle>
            </CardHeader>
            <CardContent>
              {(calls ?? []).length === 0 ? (
                <p className="text-sm text-ink-subtle">No calls are linked to this lead.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {(calls ?? []).map((c) => (
                    <li key={c.id} className="py-3 first:pt-0 last:pb-0">
                      <Link
                        href={`/dashboard/calls/${c.id}`}
                        className="text-sm font-medium text-brand-600 hover:underline"
                      >
                        {new Date(c.started_at as string).toLocaleString(undefined, {
                          timeZone: tz,
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </Link>
                      <span className="ml-2 text-xs text-ink-subtle">
                        {formatDuration(c.duration_seconds as number)}
                      </span>
                      {c.summary && (
                        <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{c.summary as string}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="size-4 text-ink-faint" aria-hidden />
                Why this score
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reasons.length === 0 ? (
                <p className="text-sm text-ink-subtle">No scoring detail was recorded.</p>
              ) : (
                <ul className="space-y-1.5 text-sm text-ink-muted">
                  {reasons.map((r, i) => (
                    <li key={i} className={i === reasons.length - 1 ? 'pt-1.5 font-medium text-ink' : ''}>
                      {r}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Photos from the customer</CardTitle>
            </CardHeader>
            <CardContent>
              <LeadPhotos leadId={id} organizationId={ctx.active.organizationId} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              {(appointments ?? []).length === 0 ? (
                <p className="text-sm text-ink-subtle">Nothing booked yet.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {(appointments ?? []).map((a) => (
                    <li key={a.id}>
                      <p className="font-medium text-ink">
                        {new Date(a.start_at as string).toLocaleString(undefined, {
                          timeZone: tz,
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </p>
                      <p className="text-ink-muted">{(a.service as string) ?? 'Appointment'}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Messages</CardTitle>
            </CardHeader>
            <CardContent>
              {(messages ?? []).length === 0 ? (
                <p className="text-sm text-ink-subtle">No texts have been exchanged.</p>
              ) : (
                <ul className="space-y-2.5 text-sm">
                  {(messages ?? []).map((m) => (
                    <li key={m.id}>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                        {m.direction === 'outbound' ? 'Sent' : 'Received'} · {m.status as string}
                      </p>
                      <p className="mt-0.5 rounded-lg bg-surface-sunken px-3 py-2 text-ink-muted">
                        {m.body as string}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
