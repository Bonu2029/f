'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { CalendarClock } from 'lucide-react';
import { Alert, Button, Field, Input, Select, Textarea, cn } from '@/components/ui';
import { bookSlotAction } from '@/server/actions';
import type { ActionResult } from '@/lib/errors';

export interface OfferedSlot {
  startISO: string;
  endISO: string;
  employeeIds: string[];
}

/** The stored settings that produced this list. */
export interface SchedulingRules {
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  minNoticeMinutes: number;
  horizonDays: number;
}

/**
 * Booking against real availability.
 *
 * Every time shown here came from the schedule: someone works then, is not off,
 * and is not already booked. Nothing is generated to fill the grid — when there
 * is nothing to offer, the page says why rather than showing an empty week that
 * looks like a loading state.
 */
export function SlotPicker({
  slots,
  employeeNames,
  timezone,
  durationMinutes,
  rules,
  emptyReason,
  services,
  selectedServiceId,
  onServiceChange,
}: {
  slots: OfferedSlot[];
  employeeNames: Record<string, string>;
  timezone: string;
  durationMinutes: number;
  rules: SchedulingRules;
  emptyReason: string | null;
  services: Array<{ id: string; name: string }>;
  selectedServiceId: string;
  onServiceChange: (id: string) => void;
}) {
  const [chosen, setChosen] = useState<OfferedSlot | null>(null);
  const [employeeId, setEmployeeId] = useState<string>('');
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    bookSlotAction,
    null,
  );

  const dayFormat = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const timeFormat = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
  });

  // Group by the business's own day, not the browser's — an owner in another
  // timezone must still see their own schedule.
  const byDay = new Map<string, OfferedSlot[]>();
  for (const slot of slots) {
    const key = dayFormat.format(new Date(slot.startISO));
    byDay.set(key, [...(byDay.get(key) ?? []), slot]);
  }

  const pick = (slot: OfferedSlot) => {
    setChosen(slot);
    setEmployeeId(slot.employeeIds[0] ?? '');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Service" htmlFor="service_filter" hint={`Slots are ${durationMinutes} minutes.`}>
          <Select
            id="service_filter"
            value={selectedServiceId}
            onChange={(e) => {
              setChosen(null);
              onServiceChange(e.target.value);
            }}
            className="w-64"
          >
            <option value="">Any service</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <p className="pb-2 text-xs text-ink-subtle">Times shown in {timezone}.</p>
      </div>

      <p className="text-xs text-ink-subtle">
        Searching the next {rules.horizonDays} {rules.horizonDays === 1 ? 'day' : 'days'}.{' '}
        {describeGaps(rules)}{' '}
        <Link href="/dashboard/employees" className="font-medium text-brand-600 hover:underline">
          Change scheduling rules
        </Link>
        .
      </p>

      {state?.ok && <Alert tone="positive" title={state.message ?? 'Booked'} />}
      {state && !state.ok && (
        <Alert tone="critical" title={state.message ?? 'That could not be booked'}>
          {state.action && <p>{state.action}</p>}
        </Alert>
      )}

      {slots.length === 0 ? (
        <Alert tone="caution" title="No times to offer">
          {emptyReason ??
            `Nothing is free in the next ${rules.horizonDays} ${rules.horizonDays === 1 ? 'day' : 'days'}.`}
        </Alert>
      ) : (
        <div className="space-y-3">
          {[...byDay.entries()].map(([day, daySlots]) => (
            <div key={day}>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{day}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {daySlots.map((slot) => (
                  <button
                    key={slot.startISO}
                    type="button"
                    onClick={() => pick(slot)}
                    className={cn(
                      'rounded-lg border px-2.5 py-1.5 text-sm font-medium transition-colors',
                      chosen?.startISO === slot.startISO
                        ? 'border-brand-600 bg-brand-50 text-brand-700'
                        : 'border-line text-ink-muted hover:bg-surface-sunken hover:text-ink',
                    )}
                  >
                    {timeFormat.format(new Date(slot.startISO))}
                    <span className="ml-1.5 text-xs text-ink-faint">
                      {slot.employeeIds.length > 1
                        ? `${slot.employeeIds.length} free`
                        : (employeeNames[slot.employeeIds[0] ?? ''] ?? '')}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {chosen && (
        <form action={action} className="space-y-3 rounded-lg border border-line bg-surface-sunken p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-ink">
            <CalendarClock className="size-4 text-brand-600" aria-hidden />
            {dayFormat.format(new Date(chosen.startISO))} at{' '}
            {timeFormat.format(new Date(chosen.startISO))}
          </p>

          <input type="hidden" name="start_at" value={chosen.startISO} />
          <input type="hidden" name="end_at" value={chosen.endISO} />

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Who is going" htmlFor="employee_id" required>
              <Select
                name="employee_id"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                required
              >
                {chosen.employeeIds.map((id) => (
                  <option key={id} value={id}>
                    {employeeNames[id] ?? id}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Customer name"
              htmlFor="customer_name"
              required
              error={state?.fields?.customer_name}
            >
              <Input name="customer_name" required />
            </Field>
            <Field label="Phone" htmlFor="customer_phone">
              <Input name="customer_phone" inputMode="tel" />
            </Field>
            <Field label="Email" htmlFor="customer_email">
              <Input name="customer_email" type="email" />
            </Field>
          </div>
          <Field label="Address" htmlFor="address">
            <Input name="address" />
          </Field>
          <Field label="Notes" htmlFor="notes">
            <Textarea name="notes" rows={2} />
          </Field>
          <input
            type="hidden"
            name="service"
            value={services.find((s) => s.id === selectedServiceId)?.name ?? ''}
          />

          <div className="flex gap-2">
            <Button type="submit" loading={pending}>
              {pending ? 'Booking' : 'Book this time'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setChosen(null)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

/**
 * Names the gaps that removed times from this list.
 *
 * Without it the buffers are invisible: a job ending at 1:00 with 15 minutes
 * held after it makes 1:00 vanish from a grid that otherwise runs on the hour,
 * and the only available reading is that the page is broken.
 */
function describeGaps(rules: SchedulingRules): string {
  const parts: string[] = [];
  if (rules.bufferBeforeMinutes > 0) parts.push(`${rules.bufferBeforeMinutes} minutes before`);
  if (rules.bufferAfterMinutes > 0) parts.push(`${rules.bufferAfterMinutes} minutes after`);

  const gaps =
    parts.length === 0
      ? 'No gap is held around a job, so back-to-back times are offered.'
      : `A gap of ${parts.join(' and ')} each job is held, so the time straight after a booking is not offered.`;

  const notice =
    rules.minNoticeMinutes > 0
      ? ` Nothing sooner than ${
          rules.minNoticeMinutes < 60
            ? `${rules.minNoticeMinutes} minutes`
            : `${Math.round((rules.minNoticeMinutes / 60) * 10) / 10} hours`
        } from now is offered.`
      : '';

  return gaps + notice;
}
