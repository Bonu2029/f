import { NextResponse, type NextRequest } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/server';
import { vapiEnv, DEMO_MODE } from '@/lib/env';
import { childLogger, newRequestId } from '@/lib/logger';
import { recordErrorEvent } from '@/lib/audit';
import { sha256Hex } from '@/lib/crypto';
import { constantTimeEqual } from '@/lib/crypto';
import { ingestCallReport, recordUnservedCall, type VapiEndOfCallReport } from '@/server/calls';

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
    const assistantId =
      message.call?.assistantId ?? message.assistant?.id ?? message.call?.assistant?.id ?? null;

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

interface VapiWebhookPayload {
  message?: {
    type?: string;
    endedReason?: string;
    summary?: string;
    startedAt?: string;
    endedAt?: string;
    transcript?: string;
    assistant?: { id?: string };
    analysis?: {
      summary?: string;
      structuredData?: Record<string, unknown>;
    };
    artifact?: {
      messages?: Array<{ role?: string; message?: string; content?: string; secondsFromStart?: number }>;
      transcript?: string;
    };
    call?: {
      id?: string;
      assistantId?: string;
      phoneNumberId?: string;
      assistant?: { id?: string };
      customer?: { number?: string };
      phoneNumber?: { number?: string };
      startedAt?: string;
      endedAt?: string;
    };
  };
}

type VapiMessage = NonNullable<VapiWebhookPayload['message']>;

/** Normalises Vapi's payload into the shape the ingestion service expects. */
function toReport(callId: string, assistantId: string, message: VapiMessage): VapiEndOfCallReport {
  const turns = (message.artifact?.messages ?? [])
    .map((m) => {
      const role = m.role === 'bot' || m.role === 'assistant' ? 'assistant' : m.role === 'user' ? 'user' : 'system';
      const text = (m.message ?? m.content ?? '').trim();
      return text
        ? {
            role: role as 'assistant' | 'user' | 'system',
            text,
            ...(typeof m.secondsFromStart === 'number' ? { secondsFromStart: m.secondsFromStart } : {}),
          }
        : null;
    })
    .filter((t): t is NonNullable<typeof t> => t !== null);

  const structured = (message.analysis?.structuredData ?? null) as VapiEndOfCallReport['structured'];

  return {
    callId,
    assistantId,
    phoneNumberId: message.call?.phoneNumberId ?? null,
    customerNumber: message.call?.customer?.number ?? null,
    businessNumber: message.call?.phoneNumber?.number ?? null,
    startedAt: message.startedAt ?? message.call?.startedAt ?? null,
    endedAt: message.endedAt ?? message.call?.endedAt ?? null,
    endedReason: message.endedReason ?? null,
    summary: message.analysis?.summary ?? message.summary ?? null,
    transcriptTurns: turns,
    structured,
  };
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
