import type { Metadata } from 'next';
import { DEFAULT_AVAILABILITY_SETTINGS } from '@afd/shared';
import { requireSession } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase/server';
import { googleEnv, DEMO_MODE } from '@/lib/env';
import { Alert, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { CalendarConnection } from '@/components/dashboard/calendar-connection';
import { AvailabilityForm } from '@/components/dashboard/availability-form';

export const metadata: Metadata = { title: 'Calendar settings' };
export const dynamic = 'force-dynamic';

export default async function CalendarSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const ctx = await requireSession();
  const params = await searchParams;
  const canEdit = ctx.active.role !== 'staff';
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
    | {
        provider: string;
        account_email: string | null;
        selected_calendar_id: string | null;
        active: boolean;
        last_error: string | null;
        has_refresh_token: boolean;
      }
    | undefined;

  return (
    <div className="space-y-5">
      {params.connected && (
        <Alert tone="positive" title="Google Calendar connected">
          Your receptionist now checks real availability before offering a time.
        </Alert>
      )}
      {params.error && <Alert tone="critical" title={params.error} />}

      {DEMO_MODE && (
        <Alert tone="caution" title="Demo mode">
          Calendar integration is simulated. Availability comes from your internal hours below.
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Google Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <CalendarConnection
            canEdit={canEdit}
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
          <CardTitle>Your availability</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-ink-muted">
            These hours decide which slots the receptionist may offer. If Google Calendar is
            connected, busy times from that calendar are subtracted as well.
          </p>
          <AvailabilityForm
            canEdit={canEdit}
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
    </div>
  );
}
