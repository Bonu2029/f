import { NextResponse, type NextRequest } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/server';
import { openaiEnv, workerEnv, DEMO_MODE } from '@/lib/env';
import { childLogger, newRequestId } from '@/lib/logger';
import { recordErrorEvent } from '@/lib/audit';
import { sha256Hex, verifyHmacSignature } from '@/lib/crypto';
import { normalizePhone } from '@afd/shared';
import { recordFailedCall, startCall } from '@/server/calls';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * OpenAI Realtime `realtime.call.incoming` webhook.
 *
 * This is the trusted entry point for every inbound phone call:
 *
 *   Caller → Twilio number → Elastic SIP Trunk → sip:PROJECT@sip.api.openai.com
 *          → OpenAI fires this webhook → we resolve the tenant → the voice
 *            worker accepts the call and opens the realtime session.
 *
 * TENANT RESOLUTION IS BASED ON THE DIALLED NUMBER FROM SIP HEADERS. Nothing a
 * caller says or sends can change which business a call belongs to.
 */
export async function POST(request: NextRequest) {
  const requestId = newRequestId();
  const logger = childLogger({ request_id: requestId, provider: 'openai', event: 'webhook.call_incoming' });

  const rawBody = await request.text();

  if (!verifyOpenAiSignature(request, rawBody, logger)) {
    return NextResponse.json({ error: { message: 'Invalid signature' } }, { status: 401 });
  }

  let payload: OpenAiWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as OpenAiWebhookPayload;
  } catch {
    return NextResponse.json({ error: { message: 'Malformed JSON' } }, { status: 400 });
  }

  const eventId = payload.id ?? `openai_${sha256Hex(rawBody).slice(0, 32)}`;
  const eventType = payload.type ?? 'unknown';
  const svc = getServiceSupabase();

  const { data: claimed } = await svc.rpc('claim_webhook_event', {
    p_provider: 'openai',
    p_event_id: eventId,
    p_event_type: eventType,
    p_digest: sha256Hex(rawBody),
  });
  if (claimed === false) {
    logger.info('duplicate call webhook ignored', { openai_event_id: eventId });
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    if (eventType !== 'realtime.call.incoming') {
      logger.debug('unhandled openai event', { type: eventType });
      await complete(eventId, 'skipped');
      return NextResponse.json({ received: true });
    }

    const callId = payload.data?.call_id;
    if (!callId) {
      await complete(eventId, 'failed', 'Missing call_id');
      return NextResponse.json({ error: { message: 'Missing call_id' } }, { status: 400 });
    }

    const headersMap = sipHeaderMap(payload.data?.sip_headers ?? []);
    const dialled = extractDialledNumber(headersMap);
    const caller = extractCallerNumber(headersMap);

    if (!dialled) {
      logger.warn('could not determine dialled number from SIP headers', { call_id: callId });
      await complete(eventId, 'failed', 'No dialled number in SIP headers');
      return NextResponse.json({ action: 'reject', reason: 'unknown_number' }, { status: 200 });
    }

    // The one trusted mapping from a phone number to a tenant.
    const { data: resolutionRows, error: resolveError } = await svc.rpc('resolve_inbound_call', {
      p_dialled: dialled,
    });
    const resolution = (Array.isArray(resolutionRows) ? resolutionRows[0] : resolutionRows) as
      | {
          organization_id: string | null;
          phone_number_id: string | null;
          servable: boolean;
          reason: string;
          fallback_phone: string | null;
        }
      | undefined;

    if (resolveError || !resolution || !resolution.organization_id) {
      logger.warn('inbound call for an unknown number', { dialled_masked: mask(dialled) });
      await complete(eventId, 'skipped', 'unknown_number');
      return NextResponse.json({ action: 'reject', reason: 'unknown_number' });
    }

    const organizationId = resolution.organization_id;

    if (!resolution.servable) {
      // The business exists but cannot be served right now. Never drop the
      // call silently: fall back to a human number if one is configured, and
      // always leave a record the business can see.
      logger.warn('call not servable', {
        organization_id: organizationId,
        reason: resolution.reason,
      });
      await recordFailedCall({
        organizationId,
        externalCallId: callId,
        callerPhone: caller,
        businessPhone: dialled,
        reason: humanReason(resolution.reason),
      });
      await recordErrorEvent({
        organizationId,
        scope: 'call.not_servable',
        severity: 'warn',
        message: `Inbound call rejected: ${resolution.reason}`,
        requestId,
        metadata: { reason: resolution.reason },
      });
      await complete(eventId, 'processed');

      return NextResponse.json({
        action: resolution.fallback_phone ? 'refer' : 'reject',
        ...(resolution.fallback_phone ? { target: `tel:${resolution.fallback_phone}` } : {}),
        reason: resolution.reason,
      });
    }

    const { id: dbCallId } = await startCall({
      organizationId,
      externalCallId: callId,
      callerPhone: caller,
      businessPhone: dialled,
      isDemo: DEMO_MODE,
    });

    // Hand off to the voice worker, which owns the long-lived WebSocket. The
    // web app deliberately does not accept the call itself: serverless request
    // handlers cannot hold a realtime session open for the length of a call.
    const dispatched = await dispatchToWorker({
      callId,
      dbCallId,
      organizationId,
      callerPhone: caller,
      businessPhone: dialled,
      requestId,
    });

    if (!dispatched.ok) {
      await recordErrorEvent({
        organizationId,
        callId: dbCallId,
        scope: 'call.dispatch',
        message: `Voice worker did not accept the call: ${dispatched.error}`,
        requestId,
      });
      await recordFailedCall({
        organizationId,
        externalCallId: callId,
        callerPhone: caller,
        businessPhone: dialled,
        reason: 'The AI service could not be reached.',
      });
      await complete(eventId, 'failed', dispatched.error);

      return NextResponse.json({
        action: resolution.fallback_phone ? 'refer' : 'reject',
        ...(resolution.fallback_phone ? { target: `tel:${resolution.fallback_phone}` } : {}),
        reason: 'ai_unavailable',
      });
    }

    logger.info('call dispatched to voice worker', {
      organization_id: organizationId,
      call_id: dbCallId,
      openai_call_id: callId,
    });
    await complete(eventId, 'processed');
    return NextResponse.json({ received: true, action: 'accept', call_id: dbCallId });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await complete(eventId, 'failed', message);
    await recordErrorEvent({ scope: 'webhook.openai', message, requestId });
    logger.error('call webhook failed', { error: message });
    return NextResponse.json({ error: { message: 'Processing failed' } }, { status: 500 });
  }
}

/* -------------------------------------------------------------------------- */

interface OpenAiWebhookPayload {
  id?: string;
  type?: string;
  data?: {
    call_id?: string;
    sip_headers?: Array<{ name: string; value: string }>;
  };
}

async function complete(eventId: string, status: 'processed' | 'failed' | 'skipped', error?: string) {
  const svc = getServiceSupabase();
  await svc.rpc('complete_webhook_event', {
    p_provider: 'openai',
    p_event_id: eventId,
    p_status: status,
    p_error: error?.slice(0, 500) ?? null,
  });
}

/**
 * Verifies the webhook signature.
 *
 * OpenAI signs with the Standard Webhooks scheme: the signed payload is
 * `{id}.{timestamp}.{body}` and the header carries one or more
 * `v1,<base64 signature>` values.
 */
function verifyOpenAiSignature(
  request: NextRequest,
  rawBody: string,
  logger: ReturnType<typeof childLogger>,
): boolean {
  if (DEMO_MODE) {
    logger.warn('DEMO_MODE: accepting call webhook without signature verification');
    return true;
  }

  const signatureHeader =
    request.headers.get('webhook-signature') ?? request.headers.get('openai-signature');
  const webhookId = request.headers.get('webhook-id') ?? '';
  const timestamp = request.headers.get('webhook-timestamp') ?? '';

  if (!signatureHeader) return false;

  // Reject replays older than five minutes.
  const ts = Number(timestamp);
  if (Number.isFinite(ts) && Math.abs(Date.now() / 1000 - ts) > 300) {
    logger.warn('webhook timestamp outside tolerance');
    return false;
  }

  let secret = openaiEnv.webhookSecret;
  if (secret.startsWith('whsec_')) secret = secret.slice(6);
  const key = Buffer.from(secret, 'base64').toString('binary');

  const signedPayload = `${webhookId}.${timestamp}.${rawBody}`;
  const candidates = signatureHeader
    .split(' ')
    .map((part) => (part.includes(',') ? part.split(',')[1]! : part));

  return candidates.some((sig) => verifyHmacSignature(signedPayload, sig, key, 'base64'));
}

function sipHeaderMap(headers: Array<{ name: string; value: string }>): Map<string, string> {
  const map = new Map<string, string>();
  for (const h of headers) {
    if (h?.name) map.set(h.name.toLowerCase(), h.value ?? '');
  }
  return map;
}

/** Pulls the E.164 dialled number out of the To / Diversion SIP headers. */
export function extractDialledNumber(headers: Map<string, string>): string | null {
  for (const key of ['to', 'diversion', 'x-called-number', 'request-uri']) {
    const raw = headers.get(key);
    const parsed = parseSipUser(raw);
    if (parsed) return parsed;
  }
  return null;
}

export function extractCallerNumber(headers: Map<string, string>): string | null {
  for (const key of ['from', 'p-asserted-identity', 'remote-party-id', 'x-caller-number']) {
    const raw = headers.get(key);
    const parsed = parseSipUser(raw);
    if (parsed) return parsed;
  }
  return null;
}

/** `"Name" <sip:+14155550123@host>;tag=x` → `+14155550123` */
export function parseSipUser(value: string | null | undefined): string | null {
  if (!value) return null;
  const uri = /sips?:([^@;>\s]+)@/i.exec(value);
  const candidate = uri?.[1] ?? /<tel:([^>]+)>/i.exec(value)?.[1] ?? value;
  return normalizePhone(candidate);
}

function mask(phone: string): string {
  return phone.length > 6 ? `${phone.slice(0, 5)}•••${phone.slice(-3)}` : '•••';
}

function humanReason(reason: string): string {
  if (reason === 'ai_paused') return 'The receptionist is paused.';
  if (reason === 'agent_inactive') return 'The receptionist has not been activated yet.';
  if (reason.startsWith('subscription_')) return 'The subscription is not active.';
  if (reason.startsWith('organization_')) return 'The account is not active.';
  return reason;
}

async function dispatchToWorker(input: {
  callId: string;
  dbCallId: string;
  organizationId: string;
  callerPhone: string | null;
  businessPhone: string;
  requestId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${workerEnv.url}/calls/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization: `Bearer ${workerEnv.secret}`,
        'x-request-id': input.requestId,
      },
      body: JSON.stringify({
        openai_call_id: input.callId,
        call_id: input.dbCallId,
        organization_id: input.organizationId,
        caller_phone: input.callerPhone,
        business_phone: input.businessPhone,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { ok: false, error: `worker responded ${res.status}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
