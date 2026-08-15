import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { assertWorkerRequest } from '@/lib/worker-auth';
import { errorResponse, errors } from '@/lib/errors';
import { getServiceSupabase } from '@/lib/supabase/server';
import { endCall } from '@/server/calls';
import { notifyTransferFailed } from '@/server/notifications';
import { newRequestId, childLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const bodySchema = z.object({
  call_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  ended_at: z.string().optional(),
  result: z.enum(['completed', 'transferred', 'failed', 'abandoned', 'rejected']).optional(),
  error_message: z.string().max(1000).nullable().optional(),
  transfer_succeeded: z.boolean().nullable().optional(),
});

/**
 * Finalises a call: duration, usage, summary and any overage report.
 * Idempotent — a repeated delivery returns the already-recorded figures.
 */
export async function POST(request: NextRequest) {
  const requestId = newRequestId();
  const logger = childLogger({ request_id: requestId, event: 'internal.call_end' });
  try {
    assertWorkerRequest(request.headers);
    const body = bodySchema.parse(await request.json());

    const svc = getServiceSupabase();
    const { data: call } = await svc
      .from('calls')
      .select('organization_id')
      .eq('id', body.call_id)
      .maybeSingle();
    if (!call || call.organization_id !== body.organization_id) throw errors.notFound('That call');

    if (body.transfer_succeeded === false) {
      await notifyTransferFailed({
        organizationId: body.organization_id,
        callId: body.call_id,
        destination: 'the configured transfer number',
      });
    }

    const usage = await endCall({
      callId: body.call_id,
      endedAt: body.ended_at ? new Date(body.ended_at) : new Date(),
      ...(body.result ? { result: body.result } : {}),
      ...(body.error_message !== undefined ? { errorMessage: body.error_message } : {}),
      ...(body.transfer_succeeded !== undefined ? { transferSucceeded: body.transfer_succeeded } : {}),
    });

    logger.info('call finalised', {
      call_id: body.call_id,
      organization_id: body.organization_id,
      billable_minutes: usage.billableMinutes,
    });

    return NextResponse.json({
      billed_seconds: usage.billedSeconds,
      billable_minutes: usage.billableMinutes,
    });
  } catch (err) {
    logger.error('call finalisation failed', { error: err });
    return errorResponse(err, requestId);
  }
}
