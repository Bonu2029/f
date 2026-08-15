import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase/server';
import { errorResponse } from '@/lib/errors';
import { AUDIT_ACTIONS, recordAudit } from '@/lib/audit';
import { newRequestId } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * Disconnects Google Calendar and deletes the stored tokens outright, rather
 * than merely flagging the row inactive.
 */
export async function POST() {
  const requestId = newRequestId();
  try {
    const ctx = await requireRole('admin');
    const svc = getServiceSupabase();

    await svc
      .from('calendar_connections')
      .delete()
      .eq('organization_id', ctx.active.organizationId)
      .eq('provider', 'google');

    await recordAudit({
      organizationId: ctx.active.organizationId,
      actorUserId: ctx.user.id,
      actorEmail: ctx.user.email ?? null,
      action: AUDIT_ACTIONS.CALENDAR_DISCONNECTED,
      metadata: { provider: 'google', tokens_deleted: true },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err, requestId);
  }
}
