import type { Metadata } from 'next';
import { CalendarCheck } from 'lucide-react';
import { formatPhone } from '@afd/shared';
import { requireSession } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, EmptyState, Table, Td, Th } from '@/components/ui';
import { StatusBadge } from '@/components/dashboard/badges';
import { AppointmentActions, NewAppointmentForm } from './appointment-forms';
import { BookingPanel } from './booking-panel';
import { findAvailableSlots } from '@/server/booking';

export const metadata: Metadata = { title: 'Appointments' };
export const dynamic = 'force-dynamic';

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const ctx = await requireSession();
  const svc = getServiceSupabase();
  const tz = ctx.active.timezone;
  const now = new Date();

  const params = await searchParams;
  const serviceId = params.service ?? '';

  // Two weeks is enough to answer "when can you come" without producing a wall
  // of times nobody reads.
  const availability = await findAvailableSlots({
    organizationId: ctx.active.organizationId,
    serviceId: serviceId || null,
    fromISO: now.toISOString(),
    toISO: new Date(now.getTime() + 14 * 86_400_000).toISOString(),
    limit: 60,
  });

  const [{ data: services }, { data: upcoming }, { data: past }] = await Promise.all([
    svc
      .from('services')
      .select('id, name')
      .eq('organization_id', ctx.active.organizationId)
      .eq('active', true)
      .order('name'),
    svc
      .from('appointments')
      .select('*')
      .eq('organization_id', ctx.active.organizationId)
      .gte('start_at', new Date(now.getTime() - 3600_000).toISOString())
      .order('start_at')
      .limit(100),
    svc
      .from('appointments')
      .select('*')
      .eq('organization_id', ctx.active.organizationId)
      .lt('start_at', new Date(now.getTime() - 3600_000).toISOString())
      .order('start_at', { ascending: false })
      .limit(50),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Appointments</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Booked by your receptionist or added by your team. Times shown in {tz}.
          </p>
        </div>
        <NewAppointmentForm />
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Book a real time</CardTitle>
        </CardHeader>
        <CardContent>
          <BookingPanel
            slots={availability.slots}
            employeeNames={availability.employeeNames}
            timezone={availability.timezone}
            durationMinutes={availability.durationMinutes}
            emptyReason={availability.emptyReason}
            services={(services ?? []).map((s) => ({ id: s.id as string, name: s.name as string }))}
            selectedServiceId={serviceId}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming</CardTitle>
        </CardHeader>
        <CardContent>
          {(upcoming ?? []).length === 0 ? (
            <EmptyState
              icon={<CalendarCheck className="size-6" aria-hidden />}
              title="Nothing scheduled"
              description="Appointments your receptionist books will appear here automatically."
            />
          ) : (
            <AppointmentTable rows={upcoming ?? []} timezone={tz} showActions />
          )}
        </CardContent>
      </Card>

      {(past ?? []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Past</CardTitle>
          </CardHeader>
          <CardContent>
            <AppointmentTable rows={past ?? []} timezone={tz} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AppointmentTable({
  rows,
  timezone,
  showActions,
}: {
  rows: Array<Record<string, unknown>>;
  timezone: string;
  showActions?: boolean;
}) {
  return (
    <Table>
      <thead>
        <tr>
          <Th>When</Th>
          <Th>Customer</Th>
          <Th>Service</Th>
          <Th>Address</Th>
          <Th>Source</Th>
          <Th>Status</Th>
          {showActions && <Th className="text-right">Actions</Th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((a) => (
          <tr key={a.id as string} className="hover:bg-surface-sunken">
            <Td>
              <span className="font-medium">
                {new Date(a.start_at as string).toLocaleString(undefined, {
                  timeZone: timezone,
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </span>
            </Td>
            <Td>
              <span className="font-medium">{a.customer_name as string}</span>
              <p className="text-xs tabular text-ink-subtle">
                {formatPhone(a.customer_phone as string)}
              </p>
            </Td>
            <Td className="text-sm text-ink-muted">{(a.service as string) ?? '—'}</Td>
            <Td className="max-w-[220px] truncate text-sm text-ink-muted">
              {(a.address as string) ?? '—'}
            </Td>
            <Td className="text-sm text-ink-subtle">
              {a.source === 'ai_call' ? 'AI receptionist' : a.source === 'demo_call' ? 'Demo call' : 'Manual'}
            </Td>
            <Td>
              <StatusBadge status={a.status as string} />
            </Td>
            {showActions && (
              <Td className="text-right">
                <AppointmentActions id={a.id as string} status={a.status as string} />
              </Td>
            )}
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
