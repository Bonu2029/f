import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { buildRealtimeInstructions, toolsForAgent } from '@afd/shared';
import { assertWorkerRequest } from '@/lib/worker-auth';
import { errorResponse, errors } from '@/lib/errors';
import { openaiEnv } from '@/lib/env';
import { loadOrgCallContext, nowInZone } from '@/server/call-context';
import { markCallAnswered } from '@/server/calls';
import { getServiceSupabase } from '@/lib/supabase/server';
import { newRequestId, childLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  call_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  caller_phone: z.string().nullable().optional(),
});

/**
 * Returns the complete realtime session configuration for a call: the model,
 * voice, dynamically-built instructions and the tool list filtered to what the
 * organisation has enabled.
 *
 * The worker never constructs a prompt itself — it receives one built from the
 * owner's current settings, so a change made in the dashboard applies to the
 * very next call with no deploy.
 */
export async function POST(request: NextRequest) {
  const requestId = newRequestId();
  const logger = childLogger({ request_id: requestId, event: 'internal.session' });
  try {
    assertWorkerRequest(request.headers);
    const body = bodySchema.parse(await request.json());

    const svc = getServiceSupabase();
    // Confirm the call really belongs to the organisation the worker claims.
    const { data: call } = await svc
      .from('calls')
      .select('id, organization_id, caller_phone, is_demo')
      .eq('id', body.call_id)
      .maybeSingle();

    if (!call || call.organization_id !== body.organization_id) {
      throw errors.notFound('That call');
    }

    const ctx = await loadOrgCallContext(body.organization_id);
    if (!ctx) throw errors.notFound('That business');

    const timezone = ctx.business?.timezone ?? ctx.organization.timezone;
    const instructions = buildRealtimeInstructions(ctx, {
      nowInOrgTimezone: nowInZone(timezone),
      callerPhone: body.caller_phone ?? (call.caller_phone as string | null),
    });

    await markCallAnswered(body.call_id);

    logger.info('session configuration issued', {
      organization_id: body.organization_id,
      call_id: body.call_id,
      voice: ctx.agent.voice,
      instruction_chars: instructions.length,
    });

    return NextResponse.json({
      model: openaiEnv.realtimeModel,
      voice: ctx.agent.voice,
      instructions,
      tools: toolsForAgent(ctx.agent),
      timezone,
      greeting: ctx.agent.greeting,
      transfer_enabled: ctx.agent.transfer_enabled,
      fallback_phone: ctx.agent.fallback_phone ?? ctx.agent.transfer_phone ?? null,
      is_demo: Boolean(call.is_demo),
    });
  } catch (err) {
    logger.error('session configuration failed', { error: err });
    return errorResponse(err, requestId);
  }
}
