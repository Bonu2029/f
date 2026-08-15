import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Phone } from 'lucide-react';
import { formatDuration, formatPhone } from '@afd/shared';
import { requireSession } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase/server';
import { Alert, Badge, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { labelFor } from '@/components/dashboard/charts';
import { TranscriptViewer } from '@/components/dashboard/transcript-viewer';

export const metadata: Metadata = { title: 'Call detail' };
export const dynamic = 'force-dynamic';

/**
 * Full record of a single call. Everything shown is scoped to the caller's
 * organisation by an explicit filter — a call id from another tenant 404s.
 */
export default async function CallDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireSession();
  const svc = getServiceSupabase();

  const { data: call } = await svc
    .from('calls')
    .select('*')
    .eq('id', id)
    .eq('organization_id', ctx.active.organizationId)
    .maybeSingle();

  if (!call) notFound();

  const [{ data: transcript }, { data: lead }, { data: appointment }] =
    await Promise.all([
      svc
        .from('call_transcript_messages')
        .select('id, role, text, timestamp, sequence')
        .eq('call_id', id)
        .eq('organization_id', ctx.active.organizationId)
        .order('sequence'),
      call.lead_id
        ? svc
            .from('leads')
            .select('id, name, phone, email, service_requested, lead_score, status, address, city, state, postal_code')
            .eq('id', call.lead_id as string)
            .eq('organization_id', ctx.active.organizationId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      svc
        .from('appointments')
        .select('id, start_at, end_at, service, customer_name, status')
        .eq('call_id', id)
        .eq('organization_id', ctx.active.organizationId)
        .maybeSingle(),
    ]);

  const summary = call.summary_json as {
    reason?: string;
    customer_name?: string | null;
    location?: string | null;
    service?: string | null;
    result?: string;
    appointment?: string | null;
    notes?: string | null;
    follow_up_required?: boolean;
  } | null;

  const tz = ctx.active.timezone;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Link
        href="/dashboard/calls"
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden /> All calls
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight tabular text-ink">
            <Phone className="size-5 text-ink-faint" aria-hidden />
            {formatPhone(call.caller_phone as string) || 'Unknown caller'}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {new Date(call.started_at as string).toLocaleString(undefined, {
              timeZone: tz,
              dateStyle: 'full',
              timeStyle: 'short',
            })}{' '}
            · {formatDuration(call.duration_seconds as number)} · {call.billable_minutes as number} billable
            minute{call.billable_minutes === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {call.is_demo && <Badge tone="caution">Demo call</Badge>}
          <Badge
            tone={
              call.result === 'failed'
                ? 'critical'
                : call.appointment_booked
                  ? 'positive'
                  : call.transferred
                    ? 'brand'
                    : 'neutral'
            }
          >
            {labelFor((call.disposition as string) ?? (call.result as string))}
          </Badge>
        </div>
      </header>

      {call.result === 'failed' && (
        <Alert tone="critical" title="This call was not answered by the AI">
          {(call.error_message as string) ??
            'The receptionist could not take this call. Check your subscription and receptionist status.'}
        </Alert>
      )}

      {call.transferred && (
        <Alert
          tone={call.transfer_succeeded === false ? 'caution' : 'brand'}
          title={
            call.transfer_succeeded === false
              ? 'Transfer attempted but did not connect'
              : 'Transferred to a person'
          }
        >
          {call.transfer_succeeded === false
            ? 'The receptionist told the caller it could not connect them and offered to take a message.'
            : 'The caller was handed over to your configured transfer number.'}
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {summary ? (
                <dl className="grid gap-3 sm:grid-cols-2">
                  <SummaryField label="Reason" value={summary.reason} span />
                  <SummaryField label="Customer" value={summary.customer_name} />
                  <SummaryField label="Location" value={summary.location} />
                  <SummaryField label="Service" value={summary.service} />
                  <SummaryField label="Result" value={summary.result} />
                  <SummaryField
                    label="Requested time"
                    value={(call.requested_appointment as string | null) ?? summary.appointment}
                  />
                  <SummaryField label="Notes" value={summary.notes} span />
                  {call.call_tone && <SummaryField label="Call tone" value={call.call_tone as string} />}
                </dl>
              ) : call.summary ? (
                <p className="text-sm text-ink-muted">{call.summary as string}</p>
              ) : (
                <p className="text-sm text-ink-subtle">
                  No summary was generated for this call — usually because no conversation was
                  captured.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Transcript</CardTitle>
            </CardHeader>
            <CardContent>
              <TranscriptViewer
                messages={(transcript ?? []).map((m) => ({
                  id: m.id as string,
                  role: m.role as string,
                  text: m.text as string,
                  timestamp: m.timestamp as string,
                }))}
                timezone={tz}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {lead && (
            <Card>
              <CardHeader>
                <CardTitle>Lead</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Link
                  href={`/dashboard/leads/${lead.id}`}
                  className="font-medium text-brand-600 hover:underline"
                >
                  {(lead.name as string) || 'Unnamed caller'}
                </Link>
                <p className="tabular text-ink-muted">{formatPhone(lead.phone as string)}</p>
                {lead.service_requested && <p className="text-ink-muted">{lead.service_requested as string}</p>}
                {(lead.city || lead.postal_code) && (
                  <p className="text-ink-muted">
                    {[lead.city, lead.state, lead.postal_code].filter(Boolean).join(', ')}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {appointment && (
            <Card>
              <CardHeader>
                <CardTitle>Appointment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p className="font-medium text-ink">
                  {new Date(appointment.start_at as string).toLocaleString(undefined, {
                    timeZone: tz,
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
                <p className="text-ink-muted">{(appointment.service as string) ?? 'Appointment'}</p>
                <Badge tone="positive">{appointment.status as string}</Badge>
              </CardContent>
            </Card>
          )}


        </div>
      </div>
    </div>
  );
}

function SummaryField({
  label,
  value,
  span,
}: {
  label: string;
  value?: string | null;
  span?: boolean;
}) {
  if (!value) return null;
  return (
    <div className={span ? 'sm:col-span-2' : undefined}>
      <dt className="text-xs font-medium uppercase tracking-wide text-ink-faint">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink">{value}</dd>
    </div>
  );
}
