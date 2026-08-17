import 'server-only';
import {
  computeAvailableSlots,
  type BookableEmployee,
  type Slot,
} from '@afd/shared';
import { getServiceSupabase } from '@/lib/supabase/server';
import { errors } from '@/lib/errors';
import { log } from '@/lib/logger';

/**
 * Turning a business's schedule into times that can actually be offered.
 *
 * The arithmetic lives in `@afd/shared/booking` as a pure function. This module
 * is only the part that cannot be pure: reading the tenant's rows, and writing
 * the appointment.
 */

/** Postgres exclusion_violation — the overlap constraint from 0010 firing. */
const EXCLUSION_VIOLATION = '23P01';

export interface AvailabilityQuery {
  organizationId: string;
  /** Restricts to employees able to do this service, when it has any assigned. */
  serviceId?: string | null;
  fromISO: string;
  toISO: string;
  /** Overrides the service's own duration. */
  durationMinutes?: number;
  limit?: number;
}

export interface AvailabilityResult {
  slots: Slot[];
  timezone: string;
  durationMinutes: number;
  /** Names for display, so the caller does not need a second lookup. */
  employeeNames: Record<string, string>;
  /**
   * Why there is nothing to offer, when there is nothing to offer. An empty
   * list with no explanation is the least useful answer a scheduler can give.
   */
  emptyReason: string | null;
}

export async function findAvailableSlots(query: AvailabilityQuery): Promise<AvailabilityResult> {
  const svc = getServiceSupabase();
  const { organizationId } = query;

  const [{ data: org }, { data: settings }, { data: service }, { data: employees }] =
    await Promise.all([
      svc.from('organizations').select('timezone').eq('id', organizationId).maybeSingle(),
      svc
        .from('availability_settings')
        .select('appointment_duration, buffer_before, buffer_after, min_notice_minutes')
        .eq('organization_id', organizationId)
        .maybeSingle(),
      query.serviceId
        ? svc
            .from('services')
            .select('id, estimated_duration')
            .eq('id', query.serviceId)
            .eq('organization_id', organizationId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      svc
        .from('employees')
        .select('id, name')
        .eq('organization_id', organizationId)
        .eq('active', true),
    ]);

  const timezone = (org?.timezone as string) ?? 'America/New_York';
  const durationMinutes =
    query.durationMinutes ??
    (service?.estimated_duration as number | null) ??
    (settings?.appointment_duration as number | null) ??
    60;

  const employeeNames = Object.fromEntries(
    (employees ?? []).map((e) => [e.id as string, e.name as string]),
  );

  const empty = (reason: string): AvailabilityResult => ({
    slots: [],
    timezone,
    durationMinutes,
    employeeNames,
    emptyReason: reason,
  });

  if (!employees || employees.length === 0) {
    return empty('Nobody is on the schedule yet. Add someone under Team & availability.');
  }

  // Capability. A service with nobody assigned is open to everyone — the right
  // default for a one-person business, and it stops a newly added service being
  // unbookable until a box is ticked.
  let eligible = employees.map((e) => e.id as string);
  if (query.serviceId) {
    const { data: assigned } = await svc
      .from('service_employees')
      .select('employee_id')
      .eq('organization_id', organizationId)
      .eq('service_id', query.serviceId);

    const assignedIds = (assigned ?? []).map((a) => a.employee_id as string);
    if (assignedIds.length > 0) {
      eligible = eligible.filter((id) => assignedIds.includes(id));
      if (eligible.length === 0) {
        return empty('Nobody active is assigned to this service.');
      }
    }
  }

  // Fetch only what the window needs, with a day of slack either side so a
  // shift that straddles midnight in the business's zone is not clipped.
  const windowFrom = new Date(new Date(query.fromISO).getTime() - 86_400_000).toISOString();
  const windowTo = new Date(new Date(query.toISO).getTime() + 86_400_000).toISOString();

  const [{ data: hours }, { data: timeOff }, { data: busy }] = await Promise.all([
    svc
      .from('employee_availability')
      .select('employee_id, weekday, start_time, end_time')
      .eq('organization_id', organizationId)
      .in('employee_id', eligible),
    svc
      .from('employee_time_off')
      .select('employee_id, starts_at, ends_at')
      .eq('organization_id', organizationId)
      .in('employee_id', eligible)
      .lt('starts_at', windowTo)
      .gt('ends_at', windowFrom),
    svc
      .from('appointments')
      .select('employee_id, start_at, end_at')
      .eq('organization_id', organizationId)
      .in('employee_id', eligible)
      .in('status', ['scheduled', 'confirmed'])
      .lt('start_at', windowTo)
      .gt('end_at', windowFrom),
  ]);

  const bookable: BookableEmployee[] = eligible.map((id) => ({
    id,
    availability: (hours ?? [])
      .filter((h) => h.employee_id === id)
      .map((h) => ({
        weekday: h.weekday as number,
        start_time: h.start_time as string,
        end_time: h.end_time as string,
      })),
    timeOff: (timeOff ?? [])
      .filter((t) => t.employee_id === id)
      .map((t) => ({ starts_at: t.starts_at as string, ends_at: t.ends_at as string })),
    busy: (busy ?? [])
      .filter((b) => b.employee_id === id)
      .map((b) => ({ start_at: b.start_at as string, end_at: b.end_at as string })),
  }));

  if (bookable.every((e) => e.availability.length === 0)) {
    return empty('Nobody has working hours set, so no time can be offered.');
  }

  const slots = computeAvailableSlots({
    fromISO: query.fromISO,
    toISO: query.toISO,
    nowISO: new Date().toISOString(),
    timezone,
    durationMinutes,
    bufferBeforeMinutes: (settings?.buffer_before as number | null) ?? 0,
    bufferAfterMinutes: (settings?.buffer_after as number | null) ?? 0,
    minNoticeMinutes: (settings?.min_notice_minutes as number | null) ?? 0,
    slotIntervalMinutes: 30,
    employees: bookable,
    ...(query.limit ? { limit: query.limit } : {}),
  });

  return {
    slots,
    timezone,
    durationMinutes,
    employeeNames,
    emptyReason: slots.length === 0 ? 'Every slot in this window is taken or outside working hours.' : null,
  };
}

/* -------------------------------------------------------------------------- */

export interface BookingInput {
  organizationId: string;
  employeeId: string;
  startISO: string;
  endISO: string;
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  service?: string | null;
  address?: string | null;
  notes?: string | null;
  leadId?: string | null;
  callId?: string | null;
  source?: string;
}

export interface BookingResult {
  appointmentId: string;
}

/**
 * Writes the appointment.
 *
 * The overlap constraint added in 0010 is the authority, not the availability
 * check above. Two callers can be offered the same slot a second apart and both
 * accept; by the time the second write arrives the first is committed, and no
 * amount of checking beforehand closes that window. So the write is allowed to
 * fail, and a rejection is translated into something the caller can act on
 * rather than a stack trace.
 */
export async function bookAppointment(input: BookingInput): Promise<BookingResult> {
  const svc = getServiceSupabase();

  // Confirm the employee belongs to this organisation. The id reaches here from
  // a form or, later, from a tool call during a phone conversation.
  const { data: employee } = await svc
    .from('employees')
    .select('id, active')
    .eq('id', input.employeeId)
    .eq('organization_id', input.organizationId)
    .maybeSingle();

  if (!employee) throw errors.notFound('That person');
  if (!employee.active) {
    throw errors.conflict('That person is no longer on the schedule. Choose someone else.');
  }

  const { data, error } = await svc
    .from('appointments')
    .insert({
      organization_id: input.organizationId,
      employee_id: input.employeeId,
      customer_name: input.customerName,
      customer_phone: input.customerPhone ?? null,
      customer_email: input.customerEmail ?? null,
      service: input.service ?? null,
      address: input.address ?? null,
      start_at: input.startISO,
      end_at: input.endISO,
      status: 'scheduled',
      notes: input.notes ?? null,
      lead_id: input.leadId ?? null,
      call_id: input.callId ?? null,
      source: input.source ?? 'manual',
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === EXCLUSION_VIOLATION) {
      log.info('booking lost a race for the slot', {
        event: 'booking.slot_taken',
        organization_id: input.organizationId,
        employee_id: input.employeeId,
      });
      throw errors.conflict(
        'That time was taken while you were booking it. Pick another and nothing was saved.',
      );
    }
    log.error('booking failed', {
      event: 'booking.failed',
      organization_id: input.organizationId,
      error: error.message,
    });
    throw errors.conflict(`That appointment could not be booked: ${error.message}`);
  }

  log.info('appointment booked', {
    event: 'booking.created',
    organization_id: input.organizationId,
    appointment_id: data.id,
  });

  return { appointmentId: data.id as string };
}
