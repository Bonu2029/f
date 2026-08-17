import type { Metadata } from 'next';
import Link from 'next/link';
import { DEFAULT_AVAILABILITY_SETTINGS } from '@afd/shared';
import { requireSession } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase/server';
import { Alert, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import {
  EmployeeManager,
  type EmployeeRow,
  type ServiceRow,
} from '@/components/dashboard/employee-manager';
import {
  SchedulingSettings,
  type SchedulingSettingsValues,
} from '@/components/dashboard/scheduling-settings';

export const metadata: Metadata = { title: 'Team & availability' };
export const dynamic = 'force-dynamic';

export default async function EmployeesPage() {
  const ctx = await requireSession();
  const svc = getServiceSupabase();
  const canEdit = ctx.active.role !== 'staff';
  const organizationId = ctx.active.organizationId;

  // Only absences that have not finished: a list of last year's holidays is
  // noise, and the booking engine only cares about the future.
  const now = new Date().toISOString();

  const [
    { data: employees },
    { data: hours },
    { data: timeOff },
    { data: assignments },
    { data: services },
    { data: settings },
  ] = await Promise.all([
      svc
        .from('employees')
        .select('id, name, email, phone, job_title, active')
        .eq('organization_id', organizationId)
        .order('active', { ascending: false })
        .order('name'),
      svc
        .from('employee_availability')
        .select('id, employee_id, weekday, start_time, end_time')
        .eq('organization_id', organizationId)
        .order('weekday')
        .order('start_time'),
      svc
        .from('employee_time_off')
        .select('id, employee_id, starts_at, ends_at, reason')
        .eq('organization_id', organizationId)
        .gte('ends_at', now)
        .order('starts_at'),
      svc
        .from('service_employees')
        .select('service_id, employee_id')
        .eq('organization_id', organizationId),
      svc
        .from('services')
        .select('id, name')
        .eq('organization_id', organizationId)
        .eq('active', true)
        .order('name'),
      svc
        .from('availability_settings')
        .select(
          'appointment_duration, buffer_before, buffer_after, min_notice_minutes, max_horizon_days',
        )
        .eq('organization_id', organizationId)
        .maybeSingle(),
    ]);

  const rows: EmployeeRow[] = (employees ?? []).map((e) => ({
    id: e.id as string,
    name: e.name as string,
    email: (e.email as string) ?? null,
    phone: (e.phone as string) ?? null,
    job_title: (e.job_title as string) ?? null,
    active: e.active as boolean,
    hours: (hours ?? [])
      .filter((h) => h.employee_id === e.id)
      .map((h) => ({
        id: h.id as string,
        weekday: h.weekday as number,
        start_time: h.start_time as string,
        end_time: h.end_time as string,
      })),
    timeOff: (timeOff ?? [])
      .filter((t) => t.employee_id === e.id)
      .map((t) => ({
        id: t.id as string,
        starts_at: t.starts_at as string,
        ends_at: t.ends_at as string,
        reason: (t.reason as string) ?? null,
      })),
    serviceIds: (assignments ?? [])
      .filter((a) => a.employee_id === e.id)
      .map((a) => a.service_id as string),
  }));

  const serviceRows: ServiceRow[] = (services ?? []).map((s) => ({
    id: s.id as string,
    name: s.name as string,
  }));

  // A pre-existing organisation created before the settings row existed falls
  // back to the same defaults the booking engine uses, so the screen never
  // shows numbers that differ from the ones actually being applied.
  const scheduling: SchedulingSettingsValues = {
    appointment_duration:
      (settings?.appointment_duration as number | null) ??
      DEFAULT_AVAILABILITY_SETTINGS.appointment_duration,
    buffer_before:
      (settings?.buffer_before as number | null) ?? DEFAULT_AVAILABILITY_SETTINGS.buffer_before,
    buffer_after:
      (settings?.buffer_after as number | null) ?? DEFAULT_AVAILABILITY_SETTINGS.buffer_after,
    min_notice_minutes:
      (settings?.min_notice_minutes as number | null) ??
      DEFAULT_AVAILABILITY_SETTINGS.min_notice_minutes,
    max_horizon_days:
      (settings?.max_horizon_days as number | null) ??
      DEFAULT_AVAILABILITY_SETTINGS.max_horizon_days,
  };

  const bookable = rows.filter((r) => r.active && r.hours.length > 0).length;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Team &amp; availability</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Who does the work, and when they are free. This is the schedule your receptionist will
          check before it offers anyone a time.
        </p>
      </header>

      {!canEdit && (
        <Alert tone="neutral" title="Read-only">
          Your role can see the schedule but not change it. Ask an owner or admin.
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            {bookable === 0
              ? 'Nobody is bookable yet'
              : `${bookable} ${bookable === 1 ? 'person' : 'people'} bookable`}
          </CardTitle>
          <CardDescription>
            Right now the receptionist records the time a caller asks for and your team confirms it.
            Everything on this page is what a real booking engine needs — it is not yet wired to the
            phone, and nothing here changes what happens on a call today.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmployeeManager
            employees={rows}
            services={serviceRows}
            canEdit={canEdit}
            timezone={ctx.active.timezone}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scheduling rules</CardTitle>
          <CardDescription>
            These apply to everyone above and decide which times can be offered at all. They have
            been running with these values since your account was created — this is the first screen
            that shows them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SchedulingSettings settings={scheduling} canEdit={canEdit} />
        </CardContent>
      </Card>

      <p className="text-sm text-ink-subtle">
        Services live in{' '}
        <Link href="/dashboard/settings/business" className="font-medium text-brand-600 hover:underline">
          Business Settings
        </Link>
        . People who can sign in are managed under{' '}
        <Link href="/dashboard/settings/team" className="font-medium text-brand-600 hover:underline">
          Team
        </Link>{' '}
        — that is a different list, because most field staff never need an account.
      </p>
    </div>
  );
}
