'use client';

import { useActionState, useState } from 'react';
import { Alert, Button, Field, Input, Switch } from '@/components/ui';
import { saveAvailabilityAction } from '@/server/actions';
import type { ActionResult } from '@/lib/errors';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface Rule {
  weekday: number;
  start_time: string;
  end_time: string;
  active: boolean;
}

export function AvailabilityForm({
  initial,
  canEdit,
}: {
  canEdit: boolean;
  initial: {
    appointment_duration: number;
    buffer_before: number;
    buffer_after: number;
    min_notice_minutes: number;
    max_horizon_days: number;
    blackout_dates: string[];
    rules: Rule[];
  };
}) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    saveAvailabilityAction,
    null,
  );

  const [rules, setRules] = useState<Rule[]>(() =>
    Array.from({ length: 7 }, (_, weekday) => {
      const existing = initial.rules.find((r) => r.weekday === weekday);
      return (
        existing ?? {
          weekday,
          start_time: '08:00',
          end_time: '17:00',
          active: weekday >= 1 && weekday <= 5,
        }
      );
    }),
  );
  const [blackouts, setBlackouts] = useState<string[]>(initial.blackout_dates);
  const [newBlackout, setNewBlackout] = useState('');

  function update(weekday: number, patch: Partial<Rule>) {
    setRules((r) => r.map((rule) => (rule.weekday === weekday ? { ...rule, ...patch } : rule)));
  }

  return (
    <form action={action} className="space-y-6">
      {state?.ok && <Alert tone="positive" title={state.message ?? 'Saved'} />}
      {state && !state.ok && <Alert tone="critical" title={state.message ?? 'That did not save'} />}

      <input type="hidden" name="rules" value={JSON.stringify(rules.filter((r) => r.active))} />
      <input type="hidden" name="blackout_dates" value={JSON.stringify(blackouts)} />

      <div className="divide-y divide-line rounded-lg border border-line">
        {rules.map((rule) => (
          <div key={rule.weekday} className="flex flex-wrap items-center gap-3 px-3 py-2">
            <span className="w-24 shrink-0 text-sm font-medium text-ink">{WEEKDAYS[rule.weekday]}</span>
            <div className="flex-1">
              <Switch
                id={`avail-${rule.weekday}`}
                label={rule.active ? 'Taking appointments' : 'No appointments'}
                checked={rule.active}
                onChange={(next) => update(rule.weekday, { active: next })}
                disabled={!canEdit}
              />
            </div>
            {rule.active && (
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  value={rule.start_time}
                  onChange={(e) => update(rule.weekday, { start_time: e.target.value })}
                  className="w-32"
                  aria-label={`${WEEKDAYS[rule.weekday]} first appointment`}
                  disabled={!canEdit}
                />
                <span className="text-ink-subtle">to</span>
                <Input
                  type="time"
                  value={rule.end_time}
                  onChange={(e) => update(rule.weekday, { end_time: e.target.value })}
                  className="w-32"
                  aria-label={`${WEEKDAYS[rule.weekday]} last appointment`}
                  disabled={!canEdit}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Appointment length (minutes)" htmlFor="appointment_duration" required>
          <Input
            name="appointment_duration"
            type="number"
            min={15}
            max={480}
            step={15}
            defaultValue={initial.appointment_duration}
            disabled={!canEdit}
          />
        </Field>
        <Field label="Buffer before (minutes)" htmlFor="buffer_before">
          <Input
            name="buffer_before"
            type="number"
            min={0}
            max={240}
            defaultValue={initial.buffer_before}
            disabled={!canEdit}
          />
        </Field>
        <Field label="Buffer after (minutes)" htmlFor="buffer_after" hint="Travel or clean-up time.">
          <Input
            name="buffer_after"
            type="number"
            min={0}
            max={240}
            defaultValue={initial.buffer_after}
            disabled={!canEdit}
          />
        </Field>
        <Field
          label="Minimum notice (minutes)"
          htmlFor="min_notice_minutes"
          hint="How soon from now the first bookable slot may be."
        >
          <Input
            name="min_notice_minutes"
            type="number"
            min={0}
            max={20160}
            defaultValue={initial.min_notice_minutes}
            disabled={!canEdit}
          />
        </Field>
        <Field
          label="How far ahead (days)"
          htmlFor="max_horizon_days"
          hint="The furthest out the receptionist will book."
        >
          <Input
            name="max_horizon_days"
            type="number"
            min={1}
            max={365}
            defaultValue={initial.max_horizon_days}
            disabled={!canEdit}
          />
        </Field>
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-ink">Blackout dates</legend>
        <p className="mt-1 text-xs text-ink-subtle">Holidays and days you are closed.</p>
        {blackouts.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {blackouts.map((d) => (
              <li
                key={d}
                className="flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-sm"
              >
                {new Date(`${d}T12:00:00`).toLocaleDateString()}
                {canEdit && (
                  <button
                    type="button"
                    aria-label={`Remove ${d}`}
                    onClick={() => setBlackouts((b) => b.filter((x) => x !== d))}
                    className="text-ink-faint hover:text-critical"
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {canEdit && (
          <div className="mt-3 flex gap-2">
            <Input
              type="date"
              value={newBlackout}
              onChange={(e) => setNewBlackout(e.target.value)}
              className="w-48"
              aria-label="Add a blackout date"
            />
            <Button
              type="button"
              variant="secondary"
              disabled={!newBlackout || blackouts.includes(newBlackout)}
              onClick={() => {
                setBlackouts((b) => [...b, newBlackout].sort());
                setNewBlackout('');
              }}
            >
              Add
            </Button>
          </div>
        )}
      </fieldset>

      {canEdit && (
        <Button type="submit" size="lg" loading={pending}>
          {pending ? 'Saving' : 'Save availability'}
        </Button>
      )}
    </form>
  );
}
