import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { DEFAULT_AVAILABILITY_SETTINGS } from '@afd/shared';
import { requireSession } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase/server';
import { googleEnv, DEMO_MODE } from '@/lib/env';
import { Alert, Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { CalendarConnection } from '@/components/dashboard/calendar-connection';
import { AvailabilityForm } from '@/components/dashboard/availability-form';

export const metadata: Metadata = { title: 'Connect your calendar' };
export const dynamic = 'force-dynamic';

export default async function OnboardingCalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const ctx = await requireSession();
  const params = await searchParams;
  const svc = getServiceSupabase();

  const [{ data: status }, { data: settings }, { data: rules }] = await Promise.all([
    svc.rpc('get_calendar_status', { org: ctx.active.organizationId }),
    svc.from('availability_settings').select('*').eq('organization_id', ctx.active.organizationId).maybeSingle(),
    svc
      .from('availability_rules')
      .select('weekday, start_time, end_time, active')
      .eq('organization_id', ctx.active.organizationId)
      .order('weekday'),
  ]);

  const connection = (Array.isArray(status) ? status[0] : status) as
    | { account_email: string | null; selected_calendar_id: string | null; active: boolean; last_error: string | null; has_refresh_token: boolean }
    | undefined;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Connect your calendar</h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Optional, but it is what lets your receptionist offer times that are genuinely free.
        </p>
      </header>

      {params.connected && <Alert tone="positive" title="Google Calendar connected" />}
      {params.error && <Alert tone="critical" title={params.error} />}

      <Card>
        <CardHeader>
          <CardTitle>Google Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <CalendarConnection
            canEdit
            configured={googleEnv.configured || DEMO_MODE}
            connection={
              connection?.active && connection.has_refresh_token
                ? {
                    accountEmail: connection.account_email,
                    selectedCalendarId: connection.selected_calendar_id,
                    lastError: connection.last_error,
                  }
                : null
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Or set your own availability</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-ink-muted">
            If you would rather not connect a calendar, your receptionist books against these hours
            instead. They also apply on top of a connected calendar.
          </p>
          <AvailabilityForm
            canEdit
            initial={{
              appointment_duration:
                (settings?.appointment_duration as number) ?? DEFAULT_AVAILABILITY_SETTINGS.appointment_duration,
              buffer_before: (settings?.buffer_before as number) ?? DEFAULT_AVAILABILITY_SETTINGS.buffer_before,
              buffer_after: (settings?.buffer_after as number) ?? DEFAULT_AVAILABILITY_SETTINGS.buffer_after,
              min_notice_minutes:
                (settings?.min_notice_minutes as number) ?? DEFAULT_AVAILABILITY_SETTINGS.min_notice_minutes,
              max_horizon_days:
                (settings?.max_horizon_days as number) ?? DEFAULT_AVAILABILITY_SETTINGS.max_horizon_days,
              blackout_dates: (settings?.blackout_dates as string[]) ?? [],
              rules: (rules ?? []).map((r) => ({
                weekday: r.weekday as number,
                start_time: r.start_time as string,
                end_time: r.end_time as string,
                active: r.active as boolean,
              })),
            }}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button asChild>
          <Link href="/onboarding/rules">
            Next: set the rules <ArrowRight aria-hidden />
          </Link>
        </Button>
      </div>
    </div>
  );
}
