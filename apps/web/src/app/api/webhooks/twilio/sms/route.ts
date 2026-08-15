import { NextResponse, type NextRequest } from 'next/server';
import { normalizePhone } from '@afd/shared';
import { getServiceSupabase } from '@/lib/supabase/server';
import { getTelephonyProvider } from '@/lib/providers/telephony';
import { absoluteUrl } from '@/lib/env';
import { childLogger, newRequestId } from '@/lib/logger';
import { sha256Hex } from '@/lib/crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Inbound SMS. Records the message against the matching organisation and lead
 * so replies to a booking confirmation land in the right conversation.
 *
 * Twilio expects TwiML (or an empty 200) — we reply with empty TwiML so no
 * auto-response is sent on the business's behalf.
 */
export async function POST(request: NextRequest) {
  const requestId = newRequestId();
  const logger = childLogger({ request_id: requestId, provider: 'twilio', event: 'webhook.sms' });

  const raw = await request.text();
  const params = Object.fromEntries(new URLSearchParams(raw)) as Record<string, string>;

  const valid = getTelephonyProvider().verifyWebhook(
    request.headers.get('x-twilio-signature'),
    absoluteUrl('/api/webhooks/twilio/sms'),
    params,
  );
  if (!valid) {
    logger.warn('twilio sms signature rejected');
    return new NextResponse('Forbidden', { status: 403 });
  }

  const svc = getServiceSupabase();
  const messageSid = params.MessageSid ?? params.SmsSid ?? `sms_${sha256Hex(raw).slice(0, 24)}`;

  const { data: claimed } = await svc.rpc('claim_webhook_event', {
    p_provider: 'twilio',
    p_event_id: messageSid,
    p_event_type: 'sms.inbound',
    p_digest: sha256Hex(raw),
  });
  if (claimed === false) return twiml();

  try {
    const to = normalizePhone(params.To);
    const from = normalizePhone(params.From);
    if (!to) return twiml();

    const { data: number } = await svc
      .from('phone_numbers')
      .select('organization_id')
      .eq('phone_number', to)
      .eq('status', 'active')
      .maybeSingle();
    if (!number) return twiml();

    // Attach to the most recent lead with this phone number, if any.
    const { data: lead } = await svc
      .from('leads')
      .select('id')
      .eq('organization_id', number.organization_id)
      .eq('phone', from ?? '')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    await svc.from('sms_messages').insert({
      organization_id: number.organization_id,
      lead_id: lead?.id ?? null,
      direction: 'inbound',
      from_number: from ?? params.From ?? 'unknown',
      to_number: to,
      body: (params.Body ?? '').slice(0, 2000),
      provider_message_sid: messageSid,
      status: 'received',
    });

    await svc.rpc('complete_webhook_event', {
      p_provider: 'twilio',
      p_event_id: messageSid,
      p_status: 'processed',
    });
  } catch (err) {
    logger.error('inbound sms handling failed', { error: err });
    await svc.rpc('complete_webhook_event', {
      p_provider: 'twilio',
      p_event_id: messageSid,
      p_status: 'failed',
      p_error: err instanceof Error ? err.message.slice(0, 500) : 'unknown',
    });
  }

  return twiml();
}

function twiml() {
  return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
    status: 200,
    headers: { 'content-type': 'text/xml' },
  });
}
