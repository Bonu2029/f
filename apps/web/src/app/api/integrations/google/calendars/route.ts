import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import { getCalendarProvider } from '@/lib/providers/calendar';
import { getServiceSupabase } from '@/lib/supabase/server';
import { errorResponse } from '@/lib/errors';
import { newRequestId } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/** Lists the connected account's calendars so the owner can pick one. */
export async function GET() {
  const requestId = newRequestId();
  try {
    const ctx = await requireRole('admin');
    const calendars = await getCalendarProvider().listCalendars(ctx.active.organizationId);
    return NextResponse.json({ calendars });
  } catch (err) {
    return errorResponse(err, requestId);
  }
}

/** Selects which calendar the receptionist books into. */
export async function POST(request: NextRequest) {
  const requestId = newRequestId();
  try {
    const ctx = await requireRole('admin');
    const { calendar_id } = z
      .object({ calendar_id: z.string().min(1).max(300) })
      .parse(await request.json());

    const svc = getServiceSupabase();
    await svc
      .from('calendar_connections')
      .update({ selected_calendar_id: calendar_id })
      .eq('organization_id', ctx.active.organizationId)
      .eq('provider', 'google');

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err, requestId);
  }
}
