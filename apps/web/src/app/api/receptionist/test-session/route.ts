import { NextResponse } from 'next/server';
import { buildRealtimeInstructions } from '@afd/shared';
import { requireRole } from '@/lib/auth';
import { getAIProvider } from '@/lib/providers/ai';
import { openaiEnv } from '@/lib/env';
import { errorResponse, errors } from '@/lib/errors';
import { newRequestId } from '@/lib/logger';
import { loadOrgCallContext, nowInZone } from '@/server/call-context';

export const dynamic = 'force-dynamic';

/**
 * Mints a short-lived OpenAI Realtime client secret for the in-browser test.
 *
 * The standing OPENAI_API_KEY never reaches the browser: this is the officially
 * supported ephemeral credential, scoped to one session and expiring in minutes.
 * The browser test does not consume telephony minutes, and no telephony tools
 * are exposed to it.
 */
export async function POST() {
  const requestId = newRequestId();
  try {
    const ctx = await requireRole('admin');
    const orgCtx = await loadOrgCallContext(ctx.active.organizationId);
    if (!orgCtx) throw errors.notFound('Your business configuration');

    const timezone = orgCtx.business?.timezone ?? orgCtx.organization.timezone;
    const instructions = [
      buildRealtimeInstructions(orgCtx, { nowInOrgTimezone: nowInZone(timezone) }),
      '',
      '# Test mode',
      'You are in a browser test with the BUSINESS OWNER, not a customer. Behave exactly as you would on a real call so they can judge you accurately, but you have no tools available: if you would normally book, text or transfer, say plainly what you would do instead of claiming you did it.',
    ].join('\n');

    const secret = await getAIProvider().createRealtimeClientSecret({
      model: openaiEnv.realtimeModel,
      voice: orgCtx.agent.voice,
      instructions,
    });

    return NextResponse.json({
      client_secret: secret.value,
      expires_at: secret.expiresAt,
      model: openaiEnv.realtimeModel,
      voice: orgCtx.agent.voice,
    });
  } catch (err) {
    return errorResponse(err, requestId);
  }
}
