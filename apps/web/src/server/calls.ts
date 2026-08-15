import 'server-only';
import {
  billableMinutesForCall,
  billedSecondsFromTimestamps,
  newlyCrossedThresholds,
} from '@afd/shared';
import { getServiceSupabase } from '@/lib/supabase/server';
import { getAIProvider } from '@/lib/providers/ai';
import { getBillingProvider } from '@/lib/providers/billing';
import { childLogger } from '@/lib/logger';
import { recordErrorEvent } from '@/lib/audit';
import { notifyUsageThreshold } from '@/server/notifications';

/**
 * Call lifecycle.
 *
 * Timing is taken exclusively from provider/session timestamps supplied by the
 * voice worker. Nothing about a call's duration is ever accepted from a
 * browser.
 */

export interface StartCallInput {
  organizationId: string;
  externalCallId: string;
  callerPhone: string | null;
  businessPhone: string | null;
  isDemo?: boolean;
}

/**
 * Creates (or returns) the call row. Idempotent on `external_call_id` so a
 * retried webhook cannot create a second call for the same conversation.
 */
export async function startCall(input: StartCallInput): Promise<{ id: string; created: boolean }> {
  const svc = getServiceSupabase();

  const { data: existing } = await svc
    .from('calls')
    .select('id')
    .eq('external_call_id', input.externalCallId)
    .maybeSingle();
  if (existing) return { id: existing.id as string, created: false };

  const { data, error } = await svc
    .from('calls')
    .insert({
      organization_id: input.organizationId,
      external_call_id: input.externalCallId,
      caller_phone: input.callerPhone,
      business_phone: input.businessPhone,
      direction: 'inbound',
      started_at: new Date().toISOString(),
      result: 'in_progress',
      is_demo: input.isDemo ?? false,
    })
    .select('id')
    .single();

  if (error || !data) {
    // Lost a race with a concurrent delivery — fetch the winner's row.
    const { data: raced } = await svc
      .from('calls')
      .select('id')
      .eq('external_call_id', input.externalCallId)
      .maybeSingle();
    if (raced) return { id: raced.id as string, created: false };
    throw new Error(`Could not create call record: ${error?.message}`);
  }

  return { id: data.id as string, created: true };
}

export async function markCallAnswered(callId: string, answeredAt = new Date()): Promise<void> {
  const svc = getServiceSupabase();
  await svc
    .from('calls')
    .update({ answered_at: answeredAt.toISOString() })
    .eq('id', callId)
    .is('answered_at', null);
}

export async function appendTranscript(input: {
  callId: string;
  organizationId: string;
  role: 'assistant' | 'user' | 'system' | 'tool';
  text: string;
  sequence?: number;
  timestamp?: string;
}): Promise<void> {
  const svc = getServiceSupabase();
  const sequence =
    input.sequence ??
    (
      await svc
        .from('call_transcript_messages')
        .select('id', { count: 'exact', head: true })
        .eq('call_id', input.callId)
    ).count ??
    0;

  await svc.from('call_transcript_messages').insert({
    call_id: input.callId,
    organization_id: input.organizationId,
    role: input.role,
    text: input.text.slice(0, 8000),
    sequence: sequence + (input.sequence == null ? 1 : 0),
    timestamp: input.timestamp ?? new Date().toISOString(),
  });
}

export interface EndCallInput {
  callId: string;
  endedAt?: Date;
  result?: 'completed' | 'transferred' | 'failed' | 'abandoned' | 'rejected';
  errorMessage?: string | null;
  transferSucceeded?: boolean | null;
}

/**
 * Finalises a call: computes duration, records billable usage, generates the
 * summary and reports any overage to the billing meter.
 *
 * Every step is idempotent, because this runs from the voice worker AND from a
 * reconciliation sweep, and both may fire for the same call.
 */
export async function endCall(input: EndCallInput): Promise<{
  billableMinutes: number;
  billedSeconds: number;
}> {
  const svc = getServiceSupabase();
  const logger = childLogger({ call_id: input.callId, event: 'call.end' });
  const endedAt = input.endedAt ?? new Date();

  const { data: call } = await svc
    .from('calls')
    .select('id, organization_id, started_at, answered_at, ended_at, transferred, appointment_booked, lead_id, is_demo, result')
    .eq('id', input.callId)
    .maybeSingle();

  if (!call) throw new Error(`endCall: unknown call ${input.callId}`);

  // Already finalised — return the recorded figures rather than recomputing.
  if (call.ended_at) {
    const { data: existing } = await svc
      .from('calls')
      .select('billed_seconds, billable_minutes')
      .eq('id', input.callId)
      .single();
    return {
      billableMinutes: (existing?.billable_minutes as number) ?? 0,
      billedSeconds: (existing?.billed_seconds as number) ?? 0,
    };
  }

  const billedSeconds = billedSecondsFromTimestamps(call.answered_at as string | null, endedAt);
  const durationSeconds = Math.max(
    0,
    Math.round((endedAt.getTime() - new Date(call.started_at as string).getTime()) / 1000),
  );

  await svc
    .from('calls')
    .update({
      ended_at: endedAt.toISOString(),
      duration_seconds: durationSeconds,
      billed_seconds: billedSeconds,
      billable_minutes: billableMinutesForCall(billedSeconds),
      result: input.result ?? (call.transferred ? 'transferred' : 'completed'),
      ...(input.errorMessage ? { error_message: input.errorMessage } : {}),
      ...(input.transferSucceeded != null ? { transfer_succeeded: input.transferSucceeded } : {}),
    })
    .eq('id', input.callId);

  // Usage is recorded by a database function so the ledger insert, the call
  // update and the subscription counter move together and exactly once.
  const { data: usage, error: usageError } = await svc.rpc('record_call_usage', {
    p_call_id: input.callId,
    p_billed_seconds: billedSeconds,
    p_ai_metadata: { model: process.env.OPENAI_REALTIME_MODEL ?? 'unknown' },
  });

  if (usageError) {
    await recordErrorEvent({
      organizationId: call.organization_id as string,
      callId: input.callId,
      scope: 'usage.record',
      message: `Usage recording failed: ${usageError.message}`,
    });
  }

  const usageRow = Array.isArray(usage) ? usage[0] : usage;
  const minutes = (usageRow?.billable_minutes as number) ?? billableMinutesForCall(billedSeconds);

  if (usageRow && !usageRow.already_recorded && !call.is_demo) {
    await Promise.all([
      handleUsageThresholds(
        call.organization_id as string,
        usageRow.used_minutes_before as number,
        usageRow.used_minutes_after as number,
      ),
      reportOverageToBilling(call.organization_id as string, input.callId, usageRow.used_minutes_before as number, usageRow.used_minutes_after as number),
    ]);
  }

  // Summary generation is deliberately last: a failure here must not affect
  // billing, and the call detail page renders fine without it.
  void generateCallSummary(input.callId).catch((err) => {
    logger.warn('summary generation failed', { error: err instanceof Error ? err.message : String(err) });
  });

  return { billableMinutes: minutes, billedSeconds };
}

/* -------------------------------------------------------------------------- */

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
 * Reports minutes used beyond the plan allowance to the billing meter.
 * Only the newly-overage portion of this call is reported, and the ledger id
 * is used as the idempotency identifier.
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
  const overageBefore = Math.max(0, before - included);
  const overageAfter = Math.max(0, after - included);
  const delta = overageAfter - overageBefore;
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
 * Generates the structured post-call summary. Skipped silently when there is no
 * transcript — an empty summary is better than an invented one.
 */
export async function generateCallSummary(callId: string): Promise<void> {
  const svc = getServiceSupabase();

  const { data: call } = await svc
    .from('calls')
    .select('id, organization_id, summary, appointment_booked, transferred, lead_id')
    .eq('id', callId)
    .maybeSingle();
  if (!call || call.summary) return;

  const { data: messages } = await svc
    .from('call_transcript_messages')
    .select('role, text')
    .eq('call_id', callId)
    .in('role', ['assistant', 'user'])
    .order('sequence');

  if (!messages || messages.length === 0) return;

  const { data: business } = await svc
    .from('business_profiles')
    .select('display_name')
    .eq('organization_id', call.organization_id as string)
    .maybeSingle();

  const summary = await getAIProvider().summarizeCall({
    businessName: (business?.display_name as string) ?? 'the business',
    transcript: messages as Array<{ role: string; text: string }>,
    appointmentBooked: Boolean(call.appointment_booked),
    transferred: Boolean(call.transferred),
    leadCaptured: Boolean(call.lead_id),
  });

  await svc
    .from('calls')
    .update({
      summary: summary.summary,
      summary_json: summary.structured,
      call_tone: summary.call_tone,
      // Never overwrite a disposition the agent set explicitly via end_call.
      ...(call.transferred ? {} : { disposition: summary.disposition }),
    })
    .eq('id', callId);
}

/**
 * Marks a call as failed when the AI could not be reached at all, so the
 * business sees a missed call rather than nothing.
 */
export async function recordFailedCall(input: {
  organizationId: string | null;
  externalCallId: string;
  callerPhone: string | null;
  businessPhone: string | null;
  reason: string;
}): Promise<void> {
  const svc = getServiceSupabase();
  if (!input.organizationId) return;

  await svc.from('calls').upsert(
    {
      organization_id: input.organizationId,
      external_call_id: input.externalCallId,
      caller_phone: input.callerPhone,
      business_phone: input.businessPhone,
      direction: 'inbound',
      started_at: new Date().toISOString(),
      ended_at: new Date().toISOString(),
      result: 'failed',
      error_message: input.reason,
    },
    { onConflict: 'external_call_id' },
  );

  await svc.from('notifications').insert({
    organization_id: input.organizationId,
    kind: 'ai_unavailable',
    title: 'A call could not be answered by the AI',
    body: `${input.callerPhone ?? 'A caller'} reached your number but the receptionist could not answer: ${input.reason}`,
    link: '/dashboard/calls',
  });
}
