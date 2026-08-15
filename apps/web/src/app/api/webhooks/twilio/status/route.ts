import { NextResponse, type NextRequest } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/server';
import { getTelephonyProvider } from '@/lib/providers/telephony';
import { absoluteUrl } from '@/lib/env';
import { childLogger, newRequestId } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STATUS_MAP: Record<string, string> = {
  queued: 'queued',
  accepted: 'queued',
  sending: 'sending',
  sent: 'sent',
  delivered: 'delivered',
  undelivered: 'undelivered',
  failed: 'failed',
};

/**
 * Twilio message status callback. Keeps `sms_messages.status` honest so the
 * dashboard shows delivery outcomes rather than assuming success.
 */
export async function POST(request: NextRequest) {
  const requestId = newRequestId();
  const logger = childLogger({ request_id: requestId, provider: 'twilio', event: 'webhook.sms_status' });

  const raw = await request.text();
  const params = Object.fromEntries(new URLSearchParams(raw)) as Record<string, string>;

  const valid = getTelephonyProvider().verifyWebhook(
    request.headers.get('x-twilio-signature'),
    absoluteUrl('/api/webhooks/twilio/status'),
    params,
  );
  if (!valid) return new NextResponse('Forbidden', { status: 403 });

  const sid = params.MessageSid ?? params.SmsSid;
  const status = STATUS_MAP[params.MessageStatus ?? ''] ?? null;
  if (!sid || !status) return NextResponse.json({ received: true });

  const svc = getServiceSupabase();
  const { error } = await svc
    .from('sms_messages')
    .update({
      status,
      ...(params.ErrorMessage || params.ErrorCode
        ? { error_message: `${params.ErrorCode ?? ''} ${params.ErrorMessage ?? ''}`.trim() }
        : {}),
    })
    .eq('provider_message_sid', sid);

  if (error) logger.warn('sms status update failed', { error: error.message });
  return NextResponse.json({ received: true });
}
