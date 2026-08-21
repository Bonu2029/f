import { NextResponse, type NextRequest } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/server';
import { vapiEnv, DEMO_MODE } from '@/lib/env';
import { childLogger, newRequestId } from '@/lib/logger';
import { recordErrorEvent } from '@/lib/audit';
import { sha256Hex } from '@/lib/crypto';
import { constantTimeEqual } from '@/lib/crypto';
import { ingestCallReport, recordUnservedCall } from '@/server/calls';
import {
  assistantIdFrom,
  toReport,
  toolCallsFrom,
  type VapiMessage,
  type VapiWebhookPayload,
} from '@/server/vapi-report';
import { runBookingTool } from '@/server/vapi-tools';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Vapi webhook — the authoritative record of what happened on a call.
 *
 * Guarantees:
 *   1. The shared secret is verified before anything is read. Vapi echoes the
 *      `secret` we set on the assistant back in the `x-vapi-secret` header.
 *   2. The organisation is resolved from the assistant id, which only we can
 *      have set. Nothing a caller says can change which tenant a call lands in.
 *   3. Every event is claimed in `webhook_events` first, so Vapi's retries are
 *      safe.
 *   4. A processing failure returns 500 so Vapi retries, and the failure is
 *      visible in the admin panel.
 */
export async function POST(request: NextRequest) {
  const requestId = newRequestId();
  const logger = childLogger({ request_id: requestId, provider: 'vapi', event: 'webhook.vapi' });

  const rawBody = await request.text();

  if (!verifySecret(request, logger)) {
    return NextResponse.json({ error: { message: 'Invalid secret' } }, { status: 401 });
  }

  let payload: VapiWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as VapiWebhookPayload;
  } catch {
    return NextResponse.json({ error: { message: 'Malformed JSON' } }, { status: 400 });
  }

  const message: VapiMessage = payload.message ?? {};
  const type = message.type ?? 'unknown';
  const vapiCallId = message.call?.id ?? null;

  // Tool calls happen while the caller is still on the line, so they are
  // answered here rather than queued: the model is waiting for the reply, and
  // a slow or absent answer becomes silence on a live phone call.
  //
  // Deliberately handled before the idempotency claim below. That ledger exists
  // to stop a retried terminal report being ingested twice; a conversation may
  // legitimately call the same tool several times, and de-duplicating those
  // would leave the model waiting for an answer that never comes.
  if (type === 'tool-calls') {
    return await handleToolCalls(message, vapiCallId, logger);
  }

  // Only the terminal report carries the transcript and analysis. Status
  // updates are acknowledged so Vapi stops retrying them.
  if (type !== 'end-of-call-report') {
    logger.debug('non-terminal vapi event acknowledged', { type });
    return NextResponse.json({ received: true, ignored: type });
  }

  if (!vapiCallId) {
    return NextResponse.json({ error: { message: 'Missing call id' } }, { status: 400 });
  }

  const svc = getServiceSupabase();
  const eventId = `${vapiCallId}:${type}`;

  const { data: claimed, error: claimError } = await svc.rpc('claim_webhook_event', {
    p_provider: 'vapi',
    p_event_id: eventId,
    p_event_type: type,
    p_digest: sha256Hex(rawBody),
  });

  if (claimError) {
    logger.error('could not claim webhook event', { error: claimError.message });
    return NextResponse.json({ error: { message: 'Storage unavailable' } }, { status: 500 });
  }
  if (claimed === false) {
    logger.info('duplicate delivery ignored', { vapi_call_id: vapiCallId });
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    const assistantId = assistantIdFrom(message);

    if (!assistantId) {
      await complete(eventId, 'skipped', 'No assistant id on the report');
      return NextResponse.json({ received: true, ignored: 'no_assistant' });
    }

    // The one trusted mapping from a call to a tenant.
    const { data: rows } = await svc.rpc('resolve_call_by_assistant', {
      p_assistant_id: assistantId,
    });
    const resolution = (Array.isArray(rows) ? rows[0] : rows) as
      | { organization_id: string | null; servable: boolean; reason: string }
      | undefined;

    if (!resolution?.organization_id) {
      logger.warn('call report for an unknown assistant', { assistant_id: assistantId });
      await complete(eventId, 'skipped', 'unknown_assistant');
      return NextResponse.json({ received: true, ignored: 'unknown_assistant' });
    }

    const organizationId = resolution.organization_id;

    if (!resolution.servable) {
      // The call still happened, so record it rather than discarding it.
      await recordUnservedCall({
        organizationId,
        vapiCallId,
        callerPhone: message.call?.customer?.number ?? null,
        reason: humanReason(resolution.reason),
      });
      await complete(eventId, 'processed');
      return NextResponse.json({ received: true, servable: false, reason: resolution.reason });
    }

    const report = toReport(vapiCallId, assistantId, message);
    const result = await ingestCallReport({ organizationId, report, isDemo: DEMO_MODE });

    await complete(eventId, 'processed');
    logger.info('call report ingested', {
      organization_id: organizationId,
      call_id: result.callId,
      billable_minutes: result.billableMinutes,
    });

    return NextResponse.json({
      received: true,
      call_id: result.callId,
      lead_id: result.leadId,
      duplicate: result.duplicate,
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    await complete(eventId, 'failed', detail);
    await recordErrorEvent({ scope: 'webhook.vapi', message: detail, requestId });
    logger.error('processing failed', { error: detail });
    // 500 so Vapi retries.
    return NextResponse.json({ error: { message: 'Processing failed' } }, { status: 500 });
  }
}

/* -------------------------------------------------------------------------- */

/**
 * Answers the tools the receptionist called mid-conversation.
 *
 * The tenant is resolved the same way a call report is — from the assistant id
 * in this secret-verified request — never from the tool arguments. That is what
 * stops anything a caller says from reaching another business's diary.
 *
 * Every path returns 200 with a sentence. A non-200 leaves the model with no
 * result at all, and a model with no result improvises — which on a live call
 * means inventing an appointment.
 */
async function handleToolCalls(
  message: VapiMessage,
  vapiCallId: string | null,
  logger: ReturnType<typeof childLogger>,
): Promise<NextResponse> {
  const calls = toolCallsFrom(message);
  if (calls.length === 0) {
    return NextResponse.json({ results: [] });
  }

  const assistantId = assistantIdFrom(message);
  const refuse = (reason: string) =>
    NextResponse.json({
      results: calls.map((c) => ({
        toolCallId: c.id,
        result: `${reason} Do not offer or confirm any appointment time. Take the caller's name, number, address and what they need, and tell them the team will call to arrange it.`,
      })),
    });

  if (!assistantId) {
    logger.warn('tool call with no assistant id');
    return refuse('This call could not be identified, so the diary was not read.');
  }

  const svc = getServiceSupabase();
  const { data: rows } = await svc.rpc('resolve_call_by_assistant', { p_assistant_id: assistantId });
  const resolution = (Array.isArray(rows) ? rows[0] : rows) as
    | { organization_id: string | null; servable: boolean; reason: string }
    | undefined;

  if (!resolution?.organization_id) {
    logger.warn('tool call for an unknown assistant', { assistant_id: assistantId });
    return refuse('This call could not be matched to a business, so nothing was booked.');
  }
  if (!resolution.servable) {
    // Same gate as a call report: an account that cannot be served must not be
    // able to write appointments into its own diary through the back door.
    logger.info('tool call refused for an unservable organisation', { reason: resolution.reason });
    return refuse(`Booking is unavailable: ${humanReason(resolution.reason)}`);
  }

  const results = [];
  for (const call of calls) {
    const { result } = await runBookingTool({
      organizationId: resolution.organization_id,
      vapiCallId: vapiCallId ?? '',
      name: call.name,
      args: call.args,
    });
    results.push({ toolCallId: call.id, result });
  }

  logger.info('tool calls answered', {
    organization_id: resolution.organization_id,
    tools: calls.map((c) => c.name),
  });

  return NextResponse.json({ results });
}

/**
 * Verifies the shared secret Vapi echoes back. Compared in constant time so the
 * secret cannot be recovered by timing the endpoint.
 */
function verifySecret(request: NextRequest, logger: ReturnType<typeof childLogger>): boolean {
  if (DEMO_MODE) {
    logger.warn('DEMO_MODE: accepting Vapi webhook without secret verification');
    return true;
  }
  const presented = request.headers.get('x-vapi-secret') ?? '';
  if (!presented) return false;
  try {
    return constantTimeEqual(presented, vapiEnv.webhookSecret);
  } catch {
    return false;
  }
}

async function complete(eventId: string, status: 'processed' | 'failed' | 'skipped', error?: string) {
  const svc = getServiceSupabase();
  await svc.rpc('complete_webhook_event', {
    p_provider: 'vapi',
    p_event_id: eventId,
    p_status: status,
    p_error: error?.slice(0, 500) ?? null,
  });
}

function humanReason(reason: string): string {
  if (reason === 'ai_paused') return 'The receptionist is paused.';
  if (reason === 'agent_inactive') return 'The receptionist has not been activated yet.';
  if (reason.startsWith('subscription_')) return 'The subscription is not active.';
  if (reason.startsWith('organization_')) return 'The account is not active.';
  return reason;
}
