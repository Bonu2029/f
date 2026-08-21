import 'server-only';
import { getServiceSupabase } from '@/lib/supabase/server';

/**
 * How often the receptionist actually resolved the call.
 *
 * A switch labelled "No Callback Mode" is a claim, and an owner who turns it on
 * has no way to check it without listening to every call. Left unmeasured, the
 * mode's failures are exactly the ones that look like success: the caller is
 * dealt with politely, a lead appears in the dashboard, and nobody notices that
 * the business is still ringing people back.
 *
 * Nothing here is stored. A call that wanted work done and produced no
 * appointment is a callback, and that is already recorded — a duplicate column
 * saying the same thing is a column that can disagree with it.
 */

/** Dispositions that mean the caller wanted work done. */
const WANTED_WORK = ['lead_captured', 'appointment_requested'] as const;

export interface NoCallbackStats {
  /** Calls where the caller wanted work done. */
  wantedWork: number;
  /** Of those, the ones that left with a real appointment. */
  booked: number;
  /** Of those, the ones that did not — someone has to ring them back. */
  leftForCallback: number;
  /** 0–100, or null when nobody has called yet. */
  resolvedPercent: number | null;
  /** The most recent unresolved ones, so the owner can act on them today. */
  recentCallbacks: Array<{
    callId: string;
    startedAt: string;
    callerPhone: string | null;
    summary: string | null;
    endedReason: string | null;
  }>;
}

export async function noCallbackStats(
  organizationId: string,
  options: { sinceDays?: number; limit?: number } = {},
): Promise<NoCallbackStats> {
  const svc = getServiceSupabase();
  const since = new Date(Date.now() - (options.sinceDays ?? 30) * 86_400_000).toISOString();

  const { data } = await svc
    .from('calls')
    .select('id, started_at, caller_phone, summary, ended_reason, appointment_booked, disposition')
    .eq('organization_id', organizationId)
    .eq('is_demo', false)
    .in('disposition', WANTED_WORK as unknown as string[])
    .gte('started_at', since)
    .order('started_at', { ascending: false });

  const rows = data ?? [];
  const booked = rows.filter((r) => r.appointment_booked === true);
  const callbacks = rows.filter((r) => r.appointment_booked !== true);

  return {
    wantedWork: rows.length,
    booked: booked.length,
    leftForCallback: callbacks.length,
    // Null rather than 100 for an empty period. A business with no calls has
    // not achieved anything yet, and showing it a perfect score would be the
    // kind of flattering fiction this product exists to avoid.
    resolvedPercent: rows.length === 0 ? null : Math.round((booked.length / rows.length) * 100),
    recentCallbacks: callbacks.slice(0, options.limit ?? 5).map((r) => ({
      callId: r.id as string,
      startedAt: r.started_at as string,
      callerPhone: (r.caller_phone as string) ?? null,
      summary: (r.summary as string) ?? null,
      endedReason: (r.ended_reason as string) ?? null,
    })),
  };
}
