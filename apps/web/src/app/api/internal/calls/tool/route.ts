import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { assertWorkerRequest } from '@/lib/worker-auth';
import { errorResponse, errors } from '@/lib/errors';
import { getServiceSupabase } from '@/lib/supabase/server';
import { executeTool } from '@/server/tool-executor';
import { newRequestId, childLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const bodySchema = z.object({
  call_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  tool: z.string().min(1).max(64),
  /** Raw arguments from the model; re-validated inside the executor. */
  arguments: z.unknown(),
});

/**
 * Executes one realtime tool call.
 *
 * The organisation is taken from the verified call record, NOT from the request
 * body — even though the worker sends it, we re-derive it and reject a mismatch.
 * That means a compromised worker still cannot reach another tenant's data.
 */
export async function POST(request: NextRequest) {
  const requestId = newRequestId();
  const logger = childLogger({ request_id: requestId, event: 'internal.tool' });
  try {
    assertWorkerRequest(request.headers);
    const body = bodySchema.parse(await request.json());

    const svc = getServiceSupabase();
    const { data: call } = await svc
      .from('calls')
      .select('id, organization_id, caller_phone, business_phone, is_demo, ended_at')
      .eq('id', body.call_id)
      .maybeSingle();

    if (!call) throw errors.notFound('That call');
    if (call.organization_id !== body.organization_id) {
      logger.error('organization mismatch on tool call — rejected', {
        call_id: body.call_id,
        claimed: body.organization_id,
      });
      throw errors.forbidden('run tools for that call');
    }
    if (call.ended_at) throw errors.conflict('That call has already ended.');

    const outcome = await executeTool(
      {
        organizationId: call.organization_id as string,
        callId: call.id as string,
        callerPhone: (call.caller_phone as string) ?? null,
        businessPhone: (call.business_phone as string) ?? null,
        isDemo: Boolean(call.is_demo),
      },
      body.tool,
      body.arguments,
    );

    return NextResponse.json({
      result: outcome.result,
      ...(outcome.sideEffect ? { side_effect: outcome.sideEffect } : {}),
    });
  } catch (err) {
    logger.error('tool execution endpoint failed', { error: err });
    return errorResponse(err, requestId);
  }
}
