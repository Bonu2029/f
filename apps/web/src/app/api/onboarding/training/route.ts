import { NextResponse, type NextRequest } from 'next/server';
import { trainingMessageSchema } from '@afd/shared';
import { requireRole } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase/server';
import { getAIProvider } from '@/lib/providers/ai';
import { clientIp, enforceRateLimit } from '@/lib/rate-limit';
import { errorResponse } from '@/lib/errors';
import { newRequestId, childLogger } from '@/lib/logger';
import { applyExtractedKnowledge } from '@/server/knowledge';
import { advanceOnboarding } from '@/server/organizations';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * One turn of the "Teach Your AI" conversation.
 *
 * The assistant's reply and the knowledge it extracted are both returned. The
 * extraction is applied to the database immediately AND reported back to the UI
 * as an explicit list of changes — nothing is written invisibly.
 */
export async function POST(request: NextRequest) {
  const requestId = newRequestId();
  const logger = childLogger({ request_id: requestId, event: 'onboarding.training' });

  try {
    const ctx = await requireRole('admin');
    await enforceRateLimit('training', `${clientIp(request.headers)}:${ctx.user.id}`);

    const { message } = trainingMessageSchema.parse(await request.json());
    const organizationId = ctx.active.organizationId;
    const svc = getServiceSupabase();

    const [{ data: history }, { data: business }] = await Promise.all([
      svc
        .from('training_messages')
        .select('role, content')
        .eq('organization_id', organizationId)
        .order('created_at')
        .limit(40),
      svc
        .from('business_profiles')
        .select('display_name, industry')
        .eq('organization_id', organizationId)
        .maybeSingle(),
    ]);

    await svc.from('training_messages').insert({
      organization_id: organizationId,
      role: 'user',
      content: message,
    });

    const provider = getAIProvider();
    const turn = await provider.trainingTurn({
      businessName: (business?.display_name as string) ?? ctx.active.organizationName,
      industry: (business?.industry as string) ?? null,
      history: (history ?? []).map((h) => ({
        role: h.role === 'assistant' ? ('assistant' as const) : ('user' as const),
        content: h.content as string,
      })),
      message,
    });

    const changes = await applyExtractedKnowledge(organizationId, turn.extracted);

    await svc.from('training_messages').insert({
      organization_id: organizationId,
      role: 'assistant',
      content: turn.reply,
      extracted: { changes },
    });

    await advanceOnboarding(organizationId, 3);

    logger.info('training turn completed', {
      organization_id: organizationId,
      changes: changes.length,
      demo: provider.isMock,
    });

    return NextResponse.json({ reply: turn.reply, changes, demo: provider.isMock });
  } catch (err) {
    return errorResponse(err, requestId);
  }
}
