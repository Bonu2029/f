import 'server-only';
import {
  DEFAULT_AVAILABILITY_SETTINGS,
  dateKeyInZone,
  generateSlots,
  upcomingDates,
  type BusySpan,
  type TimeSlot,
} from '@afd/shared';
import { getServiceSupabase } from '@/lib/supabase/server';
import { getCalendarProvider, hasCalendarConnection } from '@/lib/providers/calendar';
import { log } from '@/lib/logger';

/**
 * Availability resolution.
 *
 * Busy time comes from two independent sources, always unioned:
 *   1. Google Calendar free/busy, when connected.
 *   2. Appointments already booked in our own database.
 *
 * The second source is what stops the AI from double-booking a slot it just
 * filled, even if Google's index has not caught up yet.
 */

export interface AvailabilityQuery {
  organizationId: string;
  timezone: string;
  /** YYYY-MM-DD in the business timezone. Omit for the soonest availability. */
  requestedDate?: string | null;
  durationMinutes?: number | null;
  maxSlots?: number;
  now?: Date;
}

export interface AvailabilityResult {
  slots: TimeSlot[];
  source: 'google' | 'internal';
  timezone: string;
  durationMinutes: number;
  /** Set when the calendar could not be reached; slots then come from our DB only. */
  degraded: boolean;
}

export async function getAvailability(query: AvailabilityQuery): Promise<AvailabilityResult> {
  const svc = getServiceSupabase();
  const now = query.now ?? new Date();

  const [settingsRes, rulesRes] = await Promise.all([
    svc.from('availability_settings').select('*').eq('organization_id', query.organizationId).maybeSingle(),
    svc
      .from('availability_rules')
      .select('weekday, start_time, end_time, active')
      .eq('organization_id', query.organizationId)
      .eq('active', true),
  ]);

  const settings = {
    ...DEFAULT_AVAILABILITY_SETTINGS,
    ...(settingsRes.data ?? {}),
  } as typeof DEFAULT_AVAILABILITY_SETTINGS;

  const rules = rulesRes.data ?? [];
  if (rules.length === 0) {
    return {
      slots: [],
      source: 'internal',
      timezone: query.timezone,
      durationMinutes: query.durationMinutes ?? settings.appointment_duration,
      degraded: false,
    };
  }

  const duration = query.durationMinutes ?? settings.appointment_duration;

  // Which dates to consider.
  const dates = query.requestedDate
    ? [query.requestedDate]
    : upcomingDates(now, Math.min(settings.max_horizon_days, 14), query.timezone);

  const windowStart = new Date(now.getTime() - 60_000);
  const lastDate = dates[dates.length - 1] ?? dateKeyInZone(now, query.timezone);
  const windowEnd = new Date(`${lastDate}T23:59:59.000Z`);

  // Source 1: appointments in our own database.
  const { data: existing } = await svc
    .from('appointments')
    .select('start_at, end_at')
    .eq('organization_id', query.organizationId)
    .in('status', ['scheduled', 'confirmed'])
    .gte('start_at', windowStart.toISOString())
    .lte('start_at', windowEnd.toISOString());

  const busy: BusySpan[] = (existing ?? []).map((a) => ({
    start: a.start_at as string,
    end: a.end_at as string,
  }));

  // Source 2: the connected calendar.
  let source: 'google' | 'internal' = 'internal';
  let degraded = false;
  if (await hasCalendarConnection(query.organizationId)) {
    source = 'google';
    try {
      const external = await getCalendarProvider().getBusy(
        query.organizationId,
        windowStart.toISOString(),
        windowEnd.toISOString(),
      );
      busy.push(...external);
    } catch (err) {
      // Availability still works from our own bookings — but say so rather than
      // silently offering times that might already be taken elsewhere.
      degraded = true;
      log.warn('calendar busy lookup failed, falling back to internal bookings', {
        event: 'calendar.busy_failed',
        organization_id: query.organizationId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const slots = generateSlots({
    dates,
    timeZone: query.timezone,
    rules,
    settings,
    busy,
    now,
    durationMinutes: duration,
    maxSlots: query.maxSlots ?? 6,
  });

  return { slots, source, timezone: query.timezone, durationMinutes: duration, degraded };
}

/** Human-readable slot label in the business timezone, e.g. "Mon Aug 17, 1:00 PM". */
export function formatSlot(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}
