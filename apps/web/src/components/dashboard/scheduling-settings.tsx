'use client';

import { useActionState, useState } from 'react';
import { Alert, Button, Field, Input } from '@/components/ui';
import { saveSchedulingSettingsAction } from '@/server/actions';
import type { ActionResult } from '@/lib/errors';

export interface SchedulingSettingsValues {
  appointment_duration: number;
  buffer_before: number;
  buffer_after: number;
  min_notice_minutes: number;
  max_horizon_days: number;
}

/**
 * The numbers that decide which times get offered.
 *
 * Every one of these existed before this screen did, quietly shaping the slot
 * list: a business had 15 minutes held after each job and no way to discover
 * it, only the symptom — the hour straight after a booking never appearing.
 * The worked example below is the point of the page. A number of minutes in a
 * box does not tell an owner what their customer will be told; a sentence
 * naming an actual clock time does.
 */
export function SchedulingSettings({
  settings,
  canEdit,
}: {
  settings: SchedulingSettingsValues;
  canEdit: boolean;
}) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    saveSchedulingSettingsAction,
    null,
  );

  // Held locally so the worked example moves as the owner types, before saving.
  const [draft, setDraft] = useState<SchedulingSettingsValues>(settings);
  const set = (key: keyof SchedulingSettingsValues) => (value: string) =>
    setDraft((d) => ({ ...d, [key]: value === '' ? 0 : Number(value) }));

  return (
    <form action={action} className="space-y-4">
      {state?.ok && <Alert tone="positive" title={state.message ?? 'Saved'} />}
      {state && !state.ok && (
        <Alert tone="critical" title={state.message ?? 'Those settings did not save'} />
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Default job length"
          htmlFor="appointment_duration"
          hint="Minutes. Used when a service has no length of its own."
          error={state?.fields?.appointment_duration}
        >
          <Input
            name="appointment_duration"
            type="number"
            min={15}
            max={480}
            step={5}
            required
            disabled={!canEdit}
            value={draft.appointment_duration}
            onChange={(e) => set('appointment_duration')(e.target.value)}
          />
        </Field>

        <Field
          label="Gap before a job"
          htmlFor="buffer_before"
          hint="Minutes of travel or setup held before each appointment."
          error={state?.fields?.buffer_before}
        >
          <Input
            name="buffer_before"
            type="number"
            min={0}
            max={240}
            step={5}
            required
            disabled={!canEdit}
            value={draft.buffer_before}
            onChange={(e) => set('buffer_before')(e.target.value)}
          />
        </Field>

        <Field
          label="Gap after a job"
          htmlFor="buffer_after"
          hint="Minutes held after each appointment. Set this to 0 to allow back-to-back work."
          error={state?.fields?.buffer_after}
        >
          <Input
            name="buffer_after"
            type="number"
            min={0}
            max={240}
            step={5}
            required
            disabled={!canEdit}
            value={draft.buffer_after}
            onChange={(e) => set('buffer_after')(e.target.value)}
          />
        </Field>

        <Field
          label="Shortest notice"
          htmlFor="min_notice_minutes"
          hint="Minutes. Nothing sooner than this is offered, so nobody books you for ten minutes from now."
          error={state?.fields?.min_notice_minutes}
        >
          <Input
            name="min_notice_minutes"
            type="number"
            min={0}
            max={20160}
            step={15}
            required
            disabled={!canEdit}
            value={draft.min_notice_minutes}
            onChange={(e) => set('min_notice_minutes')(e.target.value)}
          />
        </Field>

        <Field
          label="How far ahead to book"
          htmlFor="max_horizon_days"
          hint="Days. The booking screen searches exactly this far."
          error={state?.fields?.max_horizon_days}
        >
          <Input
            name="max_horizon_days"
            type="number"
            min={1}
            max={365}
            step={1}
            required
            disabled={!canEdit}
            value={draft.max_horizon_days}
            onChange={(e) => set('max_horizon_days')(e.target.value)}
          />
        </Field>
      </div>

      <WorkedExample settings={draft} />

      {canEdit && (
        <Button type="submit" loading={pending}>
          {pending ? 'Saving' : 'Save scheduling settings'}
        </Button>
      )}
    </form>
  );
}

/** Turns the five numbers into the sentence an owner actually needs. */
function WorkedExample({ settings }: { settings: SchedulingSettingsValues }) {
  const { appointment_duration, buffer_before, buffer_after, min_notice_minutes } = settings;

  if (!Number.isFinite(appointment_duration) || appointment_duration < 15) {
    return (
      <Alert tone="caution" title="Set a job length of at least 15 minutes to see the effect." />
    );
  }

  // A fixed 9:00 start, so the arithmetic is checkable by hand.
  const clock = (minutesFromNine: number) => {
    const total = 9 * 60 + minutesFromNine;
    const hour24 = Math.floor(total / 60) % 24;
    const minute = total % 60;
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    return `${hour12}:${String(minute).padStart(2, '0')} ${hour24 < 12 ? 'am' : 'pm'}`;
  };

  const blockedFrom = -buffer_before;
  const blockedTo = appointment_duration + buffer_after;
  // Offered times land on the half hour, so round up to the next one.
  const nextOffer = Math.ceil(blockedTo / 30) * 30;

  const notice =
    min_notice_minutes === 0
      ? 'A caller can be offered the next free slot, however soon it is.'
      : `Nothing inside the next ${describeMinutes(min_notice_minutes)} is offered.`;

  return (
    <div className="rounded-lg border border-line bg-surface-sunken p-3 text-sm text-ink-muted">
      <p className="font-medium text-ink">What this means on a call</p>
      <p className="mt-1">
        A {appointment_duration}-minute job booked at 9:00 am holds{' '}
        <span className="font-medium text-ink">
          {clock(blockedFrom)} to {clock(blockedTo)}
        </span>
        {buffer_before + buffer_after > 0 ? ' once the gaps are counted' : ''}. The next time that
        person can be offered is{' '}
        <span className="font-medium text-ink">{clock(nextOffer)}</span>.
      </p>
      <p className="mt-1">{notice}</p>
    </div>
  );
}

/** "45 minutes", "2 hours", "1 hour 30 minutes". */
function describeMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const hourPart = `${hours} hour${hours === 1 ? '' : 's'}`;
  return rest ? `${hourPart} ${rest} minute${rest === 1 ? '' : 's'}` : hourPart;
}
