import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { assertWorkerRequest } from '@/lib/worker-auth';
import { errorResponse, errors } from '@/lib/errors';
import { getServiceSupabase } from '@/lib/supabase/server';
import { newRequestId } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  call_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  messages: z
    .array(
      z.object({
        role: z.enum(['assistant', 'user', 'system', 'tool']),
        text: z.string().min(1).max(8000),
        sequence: z.number().int().min(0),
        timestamp: z.string().optional(),
      }),
    )
    .min(1)
    .max(50),
});

/**
 * Appends transcript messages. Batched by the worker to keep write volume sane
 * during a live conversation.
 *
 * `upsert` on (call_id, sequence) makes a retried batch harmless.
 */
export async function POST(request: NextRequest) {
  const requestId = newRequestId();
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

    const { error } = await svc.from('call_transcript_messages').upsert(
      body.messages.map((m) => ({
        call_id: body.call_id,
        organization_id: body.organization_id,
        role: m.role,
        text: m.text,
        sequence: m.sequence,
        timestamp: m.timestamp ?? new Date().toISOString(),
      })),
      { onConflict: 'call_id,sequence' },
    );
    if (error) throw errors.conflict(error.message);

    return NextResponse.json({ stored: body.messages.length });
  } catch (err) {
    return errorResponse(err, requestId);
  }
}
