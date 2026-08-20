import 'server-only';
import {
  billableMinutesForCall,
  billedSecondsFromTimestamps,
  newlyCrossedThresholds,
  normalizePhone,
  scoreLead,
  type CallDisposition,
  type Urgency,
} from '@afd/shared';
import { getServiceSupabase } from '@/lib/supabase/server';
import { getBillingProvider } from '@/lib/providers/billing';
import { childLogger } from '@/lib/logger';
import { recordErrorEvent } from '@/lib/audit';
import { notifyNewLead, notifyUsageThreshold } from '@/server/notifications';
import { callResultFor, type VapiEndOfCallReport } from '@/server/vapi-report';

export type { VapiEndOfCallReport };

/**
 * Call ingestion.
 *
 * Vapi runs the call and posts an end-of-call report when it finishes. This
 * module turns that one report into everything the dashboard shows: the call
 * row, the transcript, the lead, the usage entry, and the notifications.
 *
 * Timing comes from Vapi's own `startedAt` / `endedAt`, never from a browser.
 * The whole operation is idempotent on `vapi_call_id`, because Vapi retries a
 * webhook that does not return 200.
 */

const OUTCOME_TO_DISPOSITION: Record<string, CallDisposition> = {
  lead_captured: 'lead_captured',
  appointment_requested: 'lead_captured',
  question_answered: 'question_answered',
  transferred_to_human: 'transferred_to_human',
  spam: 'spam',
  wrong_number: 'wrong_number',
  out_of_service_area: 'out_of_service_area',
  no_intent: 'no_intent',
  unresolved: 'unresolved',
};

const URGENCIES: readonly Urgency[] = ['emergency', 'urgent', 'soon', 'flexible', 'unknown'];

function toUrgency(value: string | null | undefined): Urgency {
  return URGENCIES.includes(value as Urgency) ? (value as Urgency) : 'unknown';
}

function clean(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim();
  return trimmed && trimmed.toLowerCase() !== 'unknown' ? trimmed : null;
}

/**
 * Fallback plain-text transcript, built from the structured turns when the
 * provider did not send a flat one. Returns null rather than an empty string so
 * "no transcript" is distinguishable from "a transcript with nothing in it".
 */
function flattenTurns(turns: VapiEndOfCallReport['transcriptTurns']): string | null {
  if (!turns.length) return null;
  return turns
    .map((t) => `${t.role === 'assistant' ? 'AI' : t.role === 'user' ? 'Caller' : 'System'}: ${t.text}`)
    .join('\n');
}

export interface IngestResult {
  callId: string;
  duplicate: boolean;
  billableMinutes: number;
  leadId: string | null;
}

/**
 * Records a completed call. Safe to call more than once with the same report.
 */
export async function ingestCallReport(input: {
  organizationId: string;
  report: VapiEndOfCallReport;
  isDemo?: boolean;
}): Promise<IngestResult> {
  const { organizationId, report } = input;
  const svc = getServiceSupabase();
  const logger = childLogger({ organization_id: organizationId, event: 'call.ingest' });

  // Idempotency: Vapi retries until it gets a 200.
  const { data: existing } = await svc
    .from('calls')
    .select('id, lead_id, billable_minutes')
    .eq('vapi_call_id', report.callId)
    .maybeSingle();

  if (existing) {
    logger.info('duplicate call report ignored', { vapi_call_id: report.callId });
    return {
      callId: existing.id as string,
      duplicate: true,
      billableMinutes: (existing.billable_minutes as number) ?? 0,
      leadId: (existing.lead_id as string) ?? null,
    };
  }

  const startedAt = report.startedAt ? new Date(report.startedAt) : new Date();
  const endedAt = report.endedAt ? new Date(report.endedAt) : new Date();
  const billedSeconds = billedSecondsFromTimestamps(startedAt, endedAt);
  const durationSeconds = billedSeconds;
  const structured = report.structured ?? {};

  const transferred =
    structured.outcome === 'transferred_to_human' ||
    /forward|transfer/i.test(report.endedReason ?? '');

  const disposition =
    OUTCOME_TO_DISPOSITION[structured.outcome ?? ''] ??
    (transferred ? 'transferred_to_human' : 'unresolved');

  // Vapi's own status says "completed" for a call whose endedReason says the
  // assistant never heard anyone. Believe the reason, not the status.
  const flatTranscript = report.transcript ?? flattenTurns(report.transcriptTurns);
  const result = callResultFor({
    endedReason: report.endedReason,
    transferred,
    hasContent: Boolean(flatTranscript) || Boolean(report.summary),
  });

  const { data: call, error: callError } = await svc
    .from('calls')
    .insert({
      organization_id: organizationId,
      vapi_call_id: report.callId,
      vapi_assistant_id: report.assistantId,
      caller_phone: normalizePhone(report.customerNumber),
      business_phone: normalizePhone(report.businessNumber),
      direction: 'inbound',
      started_at: startedAt.toISOString(),
      answered_at: startedAt.toISOString(),
      ended_at: endedAt.toISOString(),
      duration_seconds: durationSeconds,
      billed_seconds: billedSeconds,
      billable_minutes: billableMinutesForCall(billedSeconds),
      result,
      disposition,
      transferred,
      transfer_succeeded: transferred ? true : null,
      appointment_booked: false,
      requested_appointment: clean(structured.requested_appointment),
      summary: report.summary,
      transcript: flatTranscript,
      ended_reason: report.endedReason,
      summary_json: {
        reason: clean(structured.service_requested) ?? report.summary ?? 'Not recorded',
        customer_name: clean(structured.customer_name),
        location: clean(structured.service_address) ?? clean(structured.postal_code),
        service: clean(structured.service_requested),
        result: disposition.replace(/_/g, ' '),
        appointment: clean(structured.requested_appointment),
        notes: null,
        follow_up_required: disposition !== 'question_answered',
      },
      recording_enabled: false,
      is_demo: input.isDemo ?? false,
    })
    .select('id')
    .single();

  if (callError || !call) {
    // Lost a race with a concurrent delivery — return the winner's row.
    const { data: raced } = await svc
      .from('calls')
      .select('id, lead_id, billable_minutes')
      .eq('vapi_call_id', report.callId)
      .maybeSingle();
    if (raced) {
      return {
        callId: raced.id as string,
        duplicate: true,
        billableMinutes: (raced.billable_minutes as number) ?? 0,
        leadId: (raced.lead_id as string) ?? null,
      };
    }
    throw new Error(`Could not record the call: ${callError?.message}`);
  }

  const callId = call.id as string;

  /* Transcript ------------------------------------------------------------ */
  if (report.transcriptTurns.length) {
    const rows = report.transcriptTurns.slice(0, 500).map((turn, index) => ({
      call_id: callId,
      organization_id: organizationId,
      role: turn.role,
      text: turn.text.slice(0, 8000),
      sequence: index + 1,
      timestamp: new Date(
        startedAt.getTime() + Math.round((turn.secondsFromStart ?? 0) * 1000),
      ).toISOString(),
    }));
    const { error } = await svc.from('call_transcript_messages').insert(rows);
    if (error) logger.warn('transcript insert failed', { error: error.message });
  }

  /* Lead ------------------------------------------------------------------ */
  let leadId: string | null = null;
  const leadWorthCreating =
    clean(structured.customer_name) ||
    clean(structured.customer_phone) ||
    clean(structured.service_requested);

  if (leadWorthCreating && !['spam', 'wrong_number'].includes(disposition)) {
    leadId = await createLeadFromCall({
      organizationId,
      callId,
      isDemo: input.isDemo ?? false,
      callerPhone: report.customerNumber,
      structured,
      disposition,
    });
  }

  /* Usage ----------------------------------------------------------------- */
  const { data: usage, error: usageError } = await svc.rpc('record_call_usage', {
    p_call_id: callId,
    p_billed_seconds: billedSeconds,
    p_ai_metadata: { provider: 'vapi', ended_reason: report.endedReason },
  });

  if (usageError) {
    await recordErrorEvent({
      organizationId,
      callId,
      scope: 'usage.record',
      message: `Usage recording failed: ${usageError.message}`,
    });
  }

  const usageRow = Array.isArray(usage) ? usage[0] : usage;
  const minutes = (usageRow?.billable_minutes as number) ?? billableMinutesForCall(billedSeconds);

  if (usageRow && !usageRow.already_recorded && !input.isDemo) {
    await Promise.all([
      handleUsageThresholds(
        organizationId,
        usageRow.used_minutes_before as number,
        usageRow.used_minutes_after as number,
      ),
      reportOverageToBilling(
        organizationId,
        callId,
        usageRow.used_minutes_before as number,
        usageRow.used_minutes_after as number,
      ),
    ]);
  }

  logger.info('call recorded', { call_id: callId, billable_minutes: minutes, disposition });
  return { callId, duplicate: false, billableMinutes: minutes, leadId };
}

/* -------------------------------------------------------------------------- */

async function createLeadFromCall(input: {
  organizationId: string;
  callId: string;
  isDemo: boolean;
  callerPhone: string | null;
  structured: NonNullable<VapiEndOfCallReport['structured']>;
  disposition: CallDisposition;
}): Promise<string | null> {
  const svc = getServiceSupabase();
  const s = input.structured;

  const phone = normalizePhone(clean(s.customer_phone) ?? input.callerPhone);
  const postalCode = clean(s.postal_code);
  const inArea = await evaluateServiceArea(input.organizationId, postalCode);

  const scored = scoreLead({
    name: clean(s.customer_name),
    phone,
    email: clean(s.customer_email),
    address: clean(s.service_address),
    postal_code: postalCode,
    service_requested: clean(s.service_requested),
    urgency: toUrgency(s.urgency),
    in_service_area: inArea,
  });

  const { data: lead, error } = await svc
    .from('leads')
    .insert({
      organization_id: input.organizationId,
      call_id: input.callId,
      name: clean(s.customer_name),
      phone,
      email: clean(s.customer_email),
      address: clean(s.service_address),
      postal_code: postalCode,
      service_requested: clean(s.service_requested),
      description: clean(s.requested_appointment)
        ? `Caller asked for: ${clean(s.requested_appointment)}`
        : null,
      urgency: toUrgency(s.urgency),
      lead_score: scored.score,
      score_reasons: scored.reasons,
      status: 'new',
      source: input.isDemo ? 'demo_call' : 'ai_call',
      in_service_area: inArea,
    })
    .select('id, name, phone, service_requested')
    .single();

  if (error || !lead) return null;

  await svc.from('calls').update({ lead_id: lead.id }).eq('id', input.callId);

  const { data: business } = await svc
    .from('business_profiles')
    .select('display_name')
    .eq('organization_id', input.organizationId)
    .maybeSingle();

  await notifyNewLead({
    organizationId: input.organizationId,
    organizationName: (business?.display_name as string) ?? 'Your business',
    leadId: lead.id as string,
    leadName: (lead.name as string) ?? 'Unknown caller',
    service: (lead.service_requested as string) ?? 'General enquiry',
    phone: (lead.phone as string) ?? '',
  });

  return lead.id as string;
}

/**
 * Decides service-area coverage from the stored ZIP rules. Returns null when it
 * cannot be determined — the product never guesses coverage.
 */
async function evaluateServiceArea(
  organizationId: string,
  postalCode: string | null,
): Promise<boolean | null> {
  if (!postalCode) return null;
  const svc = getServiceSupabase();
  const { data } = await svc
    .from('service_areas')
    .select('type, postal_code')
    .eq('organization_id', organizationId)
    .eq('active', true);

  const zips = (data ?? [])
    .filter((a) => a.type === 'postal_code')
    .map((a) => String(a.postal_code ?? '').trim());
  if (zips.length === 0) return null;

  return zips.includes(postalCode.trim());
}

async function handleUsageThresholds(organizationId: string, before: number, after: number) {
  const svc = getServiceSupabase();
  const { data: sub } = await svc
    .from('subscriptions')
    .select('plan, included_minutes, billing_period_start')
    .eq('organization_id', organizationId)
    .maybeSingle();
  if (!sub) return;

  const crossed = newlyCrossedThresholds(sub.plan as string, before, after);
  if (crossed.length === 0) return;

  const { data: org } = await svc.from('organizations').select('name').eq('id', organizationId).maybeSingle();
  const period = (sub.billing_period_start as string | null)?.slice(0, 10) ?? 'current period';

  for (const threshold of crossed) {
    await notifyUsageThreshold({
      organizationId,
      organizationName: (org?.name as string) ?? 'Your business',
      threshold,
      used: after,
      included: sub.included_minutes as number,
      billingPeriod: period,
    });
  }
}

/**
 * Reports minutes beyond the plan allowance to the Stripe billing meter. Only
 * the newly-overage portion of this call is reported, keyed on the call id so a
 * retry cannot double-charge.
 */
async function reportOverageToBilling(
  organizationId: string,
  callId: string,
  before: number,
  after: number,
) {
  const svc = getServiceSupabase();
  const { data: sub } = await svc
    .from('subscriptions')
    .select('included_minutes, stripe_customer_id')
    .eq('organization_id', organizationId)
    .maybeSingle();
  if (!sub?.stripe_customer_id) return;

  const included = sub.included_minutes as number;
  const delta = Math.max(0, after - included) - Math.max(0, before - included);
  if (delta <= 0) return;

  try {
    await getBillingProvider().reportUsage({
      customerId: sub.stripe_customer_id as string,
      quantity: delta,
      identifier: `call_${callId}`,
    });
    await svc.from('usage_ledger').update({ reported_to_stripe: true }).eq('call_id', callId);
  } catch (err) {
    await recordErrorEvent({
      organizationId,
      callId,
      scope: 'billing.report_usage',
      message: `Overage of ${delta} minute(s) could not be reported: ${err instanceof Error ? err.message : String(err)}`,
      metadata: { delta },
    });
  }
}

/**
 * Records a call that could not be served, so the business sees a missed call
 * rather than nothing at all.
 *
 * Throws when the call cannot be written. That matters more than it looks: this
 * runs inside the Vapi webhook, and the caller turns a throw into a 500 so Vapi
 * retries. Swallowing the error here — which is what happened before — produced
 * a webhook marked `processed`, a notification saying a caller was missed, and
 * no call row for the owner to look at.
 */
export async function recordUnservedCall(input: {
  organizationId: string;
  vapiCallId: string;
  callerPhone: string | null;
  reason: string;
}): Promise<void> {
  const svc = getServiceSupabase();
  const { error } = await svc.from('calls').upsert(
    {
      organization_id: input.organizationId,
      vapi_call_id: input.vapiCallId,
      caller_phone: normalizePhone(input.callerPhone),
      direction: 'inbound',
      started_at: new Date().toISOString(),
      ended_at: new Date().toISOString(),
      result: 'failed',
      ended_reason: input.reason,
      error_message: input.reason,
    },
    { onConflict: 'vapi_call_id' },
  );

  if (error) {
    throw new Error(`Could not record the unserved call: ${error.message}`);
  }

  await svc.from('notifications').insert({
    organization_id: input.organizationId,
    kind: 'ai_unavailable',
    title: 'A call was not answered by your receptionist',
    body: `${input.callerPhone ?? 'A caller'} reached your number but the receptionist could not answer: ${input.reason}`,
    link: '/dashboard/calls',
  });
}
