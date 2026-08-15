import { NextResponse, type NextRequest } from 'next/server';
import { requireRole } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import { clientIp, enforceRateLimit } from '@/lib/rate-limit';
import { childLogger, newRequestId } from '@/lib/logger';
import { syncAssistant } from '@/server/vapi-sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Pushes the organisation's stored settings to its Vapi assistant.
 *
 * This is the SERVER side of "Update receptionist". The browser never talks to
 * Vapi and never sees VAPI_API_KEY — it posts here, we authenticate the session,
 * read the tenant's own rows, and call Vapi with the server-held key.
 *
 * Saves already trigger this automatically; this endpoint exists so an owner can
 * retry after a Vapi outage without having to re-save a form.
 */
export async function POST(request: NextRequest) {
  const requestId = newRequestId();
  const logger = childLogger({ request_id: requestId, event: 'vapi.sync.manual' });

  try {
    const ctx = await requireRole('admin');
    await enforceRateLimit('vapi_sync', `${clientIp(request.headers)}:${ctx.user.id}`);

    const result = await syncAssistant({
      organizationId: ctx.active.organizationId,
      actorUserId: ctx.user.id,
      actorEmail: ctx.user.email ?? null,
      reason: 'manual update from the dashboard',
    });

    logger.info('manual assistant sync succeeded', {
      organization_id: ctx.active.organizationId,
      assistant_id: result.assistantId,
    });

    return NextResponse.json({
      assistant_id: result.assistantId,
      created: result.created,
      demo: result.isDemo,
      synced_at: new Date().toISOString(),
      request_id: requestId,
    });
  } catch (err) {
    logger.error('manual assistant sync failed', { error: err });
    return errorResponse(err, requestId);
  }
}
