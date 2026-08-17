'use client';

import { useActionState, useState, useTransition } from 'react';
import { CalendarOff, Clock, Plus, Trash2, UserPlus } from 'lucide-react';
import { availabilityBlockProblem, overlappingAvailability } from '@afd/shared';
import { Alert, Badge, Button, Field, Input, Select, Textarea, cn } from '@/components/ui';
import {
  deleteTimeOffAction,
  saveEmployeeAction,
  saveEmployeeHoursAction,
  saveEmployeeServicesAction,
  saveTimeOffAction,
  setEmployeeActiveAction,
} from '@/server/actions';
import type { ActionResult } from '@/lib/errors';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export interface EmployeeRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  active: boolean;
  hours: Array<{ id: string; weekday: number; start_time: string; end_time: string }>;
  timeOff: Array<{ id: string; starts_at: string; ends_at: string; reason: string | null }>;
  serviceIds: string[];
}

export interface ServiceRow {
  id: string;
  name: string;
}

/**
 * The team whose time can be booked.
 *
 * Everything here is real state the booking engine will read: a person with no
 * working hours genuinely cannot be offered, and the UI says so rather than
 * showing an empty week that looks like a default.
 */
export function EmployeeManager({
  employees,
  services,
  canEdit,
  timezone,
}: {
  employees: EmployeeRow[];
  services: ServiceRow[];
  canEdit: boolean;
  timezone: string;
}) {
  const [adding, setAdding] = useState(false);
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    saveEmployeeAction,
    null,
  );

  return (
    <div className="space-y-5">
      <Result state={state} />

      {employees.length === 0 ? (
        <Alert tone="caution" title="Nobody can be booked yet">
          Your receptionist can take a caller&rsquo;s preferred time, but it cannot offer a real
          appointment until at least one person has working hours here.
        </Alert>
      ) : null}

      <ul className="space-y-4">
        {employees.map((employee) => (
          <EmployeeCard
            key={employee.id}
            employee={employee}
            services={services}
            canEdit={canEdit}
            timezone={timezone}
          />
        ))}
      </ul>

      {canEdit &&
        (adding ? (
          <form action={action} className="space-y-3 rounded-lg border border-line p-4">
            <h3 className="text-sm font-semibold text-ink">Add someone</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name" htmlFor="name" required error={state?.fields?.name}>
                <Input name="name" required placeholder="Dave Nowak" />
              </Field>
              <Field label="Job title" htmlFor="job_title" hint="For your reference only.">
                <Input name="job_title" placeholder="Lead technician" />
              </Field>
              <Field label="Email" htmlFor="email" error={state?.fields?.email}>
                <Input name="email" type="email" />
              </Field>
              <Field label="Phone" htmlFor="phone">
                <Input name="phone" inputMode="tel" />
              </Field>
            </div>
            <Field label="Notes" htmlFor="notes">
              <Textarea name="notes" rows={2} />
            </Field>
            <div className="flex gap-2">
              <Button type="submit" loading={pending}>
                {pending ? 'Saving' : 'Add to team'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button variant="secondary" onClick={() => setAdding(true)}>
            <UserPlus aria-hidden /> Add someone
          </Button>
        ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Result({ state }: { state: ActionResult | null }) {
  if (!state) return null;
  if (state.ok) return <Alert tone="positive" title={state.message ?? 'Saved'} />;
  return (
    <Alert tone="critical" title={state.message ?? 'That did not save'}>
      {state.action && <p>{state.action}</p>}
    </Alert>
  );
}

function EmployeeCard({
  employee,
  services,
  canEdit,
  timezone,
}: {
  employee: EmployeeRow;
  services: ServiceRow[];
  canEdit: boolean;
  timezone: string;
}) {
  const [tab, setTab] = useState<'hours' | 'services' | 'time-off' | null>(null);
  const [busy, startTransition] = useTransition();

  const bookable = employee.active && employee.hours.length > 0;

  return (
    <li className="rounded-lg border border-line bg-surface">
      <div className="flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-medium text-ink">
            {employee.name}
            {!employee.active ? (
              <Badge tone="neutral">Off the schedule</Badge>
            ) : bookable ? (
              <Badge tone="positive">Bookable</Badge>
            ) : (
              <Badge tone="caution">No working hours</Badge>
            )}
          </p>
          <p className="mt-0.5 text-sm text-ink-subtle">
            {[employee.job_title, employee.email, employee.phone].filter(Boolean).join(' · ') ||
              'No contact details'}
          </p>
          <p className="mt-1 text-xs text-ink-subtle">
            {employee.hours.length === 0
              ? 'Cannot be offered for appointments until working hours are set.'
              : `${summariseHours(employee.hours)} · ${
                  employee.serviceIds.length === 0
                    ? 'any service'
                    : `${employee.serviceIds.length} service${employee.serviceIds.length === 1 ? '' : 's'}`
                }${employee.timeOff.length ? ` · ${employee.timeOff.length} upcoming absence${employee.timeOff.length === 1 ? '' : 's'}` : ''}`}
          </p>
        </div>

        {canEdit && (
          <div className="flex flex-wrap gap-1.5">
            <TabButton active={tab === 'hours'} onClick={() => setTab(tab === 'hours' ? null : 'hours')}>
              <Clock className="size-3.5" aria-hidden /> Hours
            </TabButton>
            <TabButton
              active={tab === 'services'}
              onClick={() => setTab(tab === 'services' ? null : 'services')}
            >
              Services
            </TabButton>
            <TabButton
              active={tab === 'time-off'}
              onClick={() => setTab(tab === 'time-off' ? null : 'time-off')}
            >
              <CalendarOff className="size-3.5" aria-hidden /> Time off
            </TabButton>
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() =>
                startTransition(async () => {
                  await setEmployeeActiveAction(employee.id, !employee.active);
                })
              }
            >
              {employee.active ? 'Remove from schedule' : 'Restore'}
            </Button>
          </div>
        )}
      </div>

      {tab === 'hours' && <HoursEditor employee={employee} timezone={timezone} />}
      {tab === 'services' && <ServicesEditor employee={employee} services={services} />}
      {tab === 'time-off' && <TimeOffEditor employee={employee} timezone={timezone} />}
    </li>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'border-brand-600 bg-brand-50 text-brand-700'
          : 'border-line text-ink-muted hover:bg-surface-sunken hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------------- */

interface Block {
  weekday: number;
  start_time: string;
  end_time: string;
}

function HoursEditor({ employee, timezone }: { employee: EmployeeRow; timezone: string }) {
  const [blocks, setBlocks] = useState<Block[]>(
    employee.hours.map((h) => ({
      weekday: h.weekday,
      start_time: h.start_time,
      end_time: h.end_time,
    })),
  );
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    saveEmployeeHoursAction,
    null,
  );

  const update = (index: number, patch: Partial<Block>) =>
    setBlocks((b) => b.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  /**
   * Which rows are impossible, checked as you type.
   *
   * The server refuses these too — it is the only check that counts — but a
   * refusal that arrives as a banner after a round trip is easy to miss, and
   * the row that caused it is not identified. Saying it here, next to the row,
   * means the mistake cannot be saved without being seen first.
   */
  const problems = blocks.map(availabilityBlockProblem);
  const firstProblem = problems.findIndex((p) => p !== null);
  const hasProblem = firstProblem !== -1;

  // Overlaps on one day are not an error — a split shift is two rows — but two
  // rows covering the same hours means one is redundant, and the booking engine
  // would offer that time twice.
  const overlaps = overlappingAvailability(blocks).length > 0;

  return (
    <form action={action} className="border-t border-line p-4">
      <input type="hidden" name="employee_id" value={employee.id} />
      <input type="hidden" name="blocks" value={JSON.stringify(blocks)} />

      <p className="text-sm text-ink-muted">
        When {employee.name} works, in {timezone}. Add two rows for one day to leave a gap for
        lunch — the gap will not be offered.
      </p>

      <Result state={state} />

      {hasProblem && (
        <Alert tone="critical" title="This cannot be saved yet" className="mt-3">
          {problems[firstProblem]} Fix the highlighted row.
        </Alert>
      )}
      {!hasProblem && overlaps && (
        <Alert tone="caution" title="Two blocks cover the same hours" className="mt-3">
          That time would be offered twice. Merge them, or change one.
        </Alert>
      )}

      <div className="mt-3 space-y-2">
        {blocks.length === 0 && (
          <p className="text-sm text-ink-subtle">
            No working hours. Nothing will be offered for this person.
          </p>
        )}
        {blocks.map((block, i) => (
          <div key={i} className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              aria-label="Day"
              value={String(block.weekday)}
              onChange={(e) => update(i, { weekday: Number(e.target.value) })}
              className="w-36"
            >
              {WEEKDAYS.map((d, index) => (
                <option key={d} value={index}>
                  {d}
                </option>
              ))}
            </Select>
            <Input
              aria-label="Start time"
              type="time"
              value={block.start_time}
              onChange={(e) => update(i, { start_time: e.target.value })}
              className="w-32"
              aria-invalid={problems[i] ? true : undefined}
            />
            <span className="text-sm text-ink-subtle">to</span>
            <Input
              aria-label="End time"
              type="time"
              value={block.end_time}
              onChange={(e) => update(i, { end_time: e.target.value })}
              className={cn('w-32', problems[i] && 'border-red-400')}
              aria-invalid={problems[i] ? true : undefined}
              aria-describedby={problems[i] ? `block-problem-${i}` : undefined}
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Remove this block"
              onClick={() => setBlocks((b) => b.filter((_, index) => index !== i))}
            >
              <Trash2 aria-hidden />
            </Button>
          </div>
          {problems[i] && (
            <p id={`block-problem-${i}`} role="alert" className="text-xs font-medium text-red-700">
              {problems[i]}
            </p>
          )}
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() =>
            setBlocks((b) => [...b, { weekday: 1, start_time: '08:00', end_time: '17:00' }])
          }
        >
          <Plus aria-hidden /> Add a block
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() =>
            setBlocks(
              [1, 2, 3, 4, 5].map((weekday) => ({
                weekday,
                start_time: '08:00',
                end_time: '17:00',
              })),
            )
          }
        >
          Weekdays, 8–5
        </Button>
        <Button type="submit" size="sm" loading={pending} disabled={hasProblem}>
          {pending ? 'Saving' : 'Save hours'}
        </Button>
      </div>
    </form>
  );
}

function ServicesEditor({ employee, services }: { employee: EmployeeRow; services: ServiceRow[] }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    saveEmployeeServicesAction,
    null,
  );

  return (
    <form action={action} className="border-t border-line p-4">
      <input type="hidden" name="employee_id" value={employee.id} />

      <p className="text-sm text-ink-muted">
        What {employee.name} can do. Tick nothing and they can be offered for any service — which is
        usually right for a small team.
      </p>

      <Result state={state} />

      {services.length === 0 ? (
        <p className="mt-3 text-sm text-ink-subtle">
          No services yet. Add them in Business Settings first.
        </p>
      ) : (
        <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
          {services.map((service) => (
            <label key={service.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="service_ids"
                value={service.id}
                defaultChecked={employee.serviceIds.includes(service.id)}
                className="size-4 rounded text-brand-600"
              />
              <span className="text-ink">{service.name}</span>
            </label>
          ))}
        </div>
      )}

      <Button type="submit" size="sm" className="mt-3" loading={pending}>
        {pending ? 'Saving' : 'Save services'}
      </Button>
    </form>
  );
}

function TimeOffEditor({ employee, timezone }: { employee: EmployeeRow; timezone: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    saveTimeOffAction,
    null,
  );
  const [busy, startTransition] = useTransition();

  return (
    <div className="border-t border-line p-4">
      <p className="text-sm text-ink-muted">
        Holidays and appointments away from work. These beat the weekly hours, so nothing is offered
        during them. Times are in {timezone}.
      </p>

      <Result state={state} />

      {employee.timeOff.length > 0 && (
        <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
          {employee.timeOff.map((off) => (
            <li key={off.id} className="flex items-center justify-between gap-3 p-2.5 text-sm">
              <span className="text-ink">
                {new Date(off.starts_at).toLocaleString()} → {new Date(off.ends_at).toLocaleString()}
                {off.reason ? <span className="text-ink-subtle"> · {off.reason}</span> : null}
              </span>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Remove this time off"
                disabled={busy}
                onClick={() =>
                  startTransition(async () => {
                    await deleteTimeOffAction(off.id);
                  })
                }
              >
                <Trash2 aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form action={action} className="mt-3 space-y-3">
        <input type="hidden" name="employee_id" value={employee.id} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="From" htmlFor="starts_at" required error={state?.fields?.starts_at}>
            <Input name="starts_at" type="datetime-local" required />
          </Field>
          <Field label="Until" htmlFor="ends_at" required error={state?.fields?.ends_at}>
            <Input name="ends_at" type="datetime-local" required />
          </Field>
        </div>
        <Field label="Reason" htmlFor="reason" hint="Optional. Only you see this.">
          <Input name="reason" placeholder="Holiday" />
        </Field>
        <Button type="submit" size="sm" loading={pending}>
          {pending ? 'Saving' : 'Add time off'}
        </Button>
      </form>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/** "Mon–Fri 08:00–17:00" where possible, otherwise a day count. */
function summariseHours(hours: EmployeeRow['hours']): string {
  const days = new Set(hours.map((h) => h.weekday));
  const sameSpan =
    hours.every((h) => h.start_time === hours[0]!.start_time && h.end_time === hours[0]!.end_time) &&
    days.size === hours.length;

  if (sameSpan && hours.length > 0) {
    const sorted = [...days].sort((a, b) => a - b);
    const contiguous = sorted.every((d, i) => i === 0 || d === sorted[i - 1]! + 1);
    const label =
      contiguous && sorted.length > 1
        ? `${WEEKDAYS[sorted[0]!]!.slice(0, 3)}–${WEEKDAYS[sorted[sorted.length - 1]!]!.slice(0, 3)}`
        : sorted.map((d) => WEEKDAYS[d]!.slice(0, 3)).join(', ');
    return `${label} ${hours[0]!.start_time}–${hours[0]!.end_time}`;
  }

  return `${hours.length} block${hours.length === 1 ? '' : 's'} across ${days.size} day${days.size === 1 ? '' : 's'}`;
}
