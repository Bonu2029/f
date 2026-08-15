'use client';

import { useActionState, useState, useTransition } from 'react';
import { Plus } from 'lucide-react';
import { Alert, Button, Card, CardContent, Field, Input, Select, Textarea } from '@/components/ui';
import { saveAppointmentAction, setAppointmentStatusAction } from '@/server/actions';
import type { ActionResult } from '@/lib/errors';

export function NewAppointmentForm() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    saveAppointmentAction,
    null,
  );

  if (state?.ok && open) setTimeout(() => setOpen(false), 600);

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus aria-hidden /> New appointment
      </Button>
    );
  }

  const fields = state?.fields ?? {};

  return (
    <Card className="w-full">
      <CardContent className="pt-5">
        <form action={action} className="space-y-4">
          <h2 className="font-semibold text-ink">New appointment</h2>

          {state && !state.ok && <Alert tone="critical" title={state.message ?? 'That did not save'} />}
          {state?.ok && <Alert tone="positive" title={state.message ?? 'Saved'} />}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Customer name" htmlFor="customer_name" required error={fields.customer_name}>
              <Input name="customer_name" required />
            </Field>
            <Field label="Phone" htmlFor="customer_phone" error={fields.customer_phone}>
              <Input name="customer_phone" inputMode="tel" />
            </Field>
            <Field label="Starts" htmlFor="start_at" required error={fields.start_at}>
              <Input name="start_at" type="datetime-local" required />
            </Field>
            <Field label="Ends" htmlFor="end_at" required error={fields.end_at}>
              <Input name="end_at" type="datetime-local" required />
            </Field>
            <Field label="Service" htmlFor="service" error={fields.service}>
              <Input name="service" />
            </Field>
            <Field label="Status" htmlFor="status">
              <Select name="status" defaultValue="scheduled">
                {['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'].map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, ' ')}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Address" htmlFor="address" error={fields.address}>
            <Input name="address" />
          </Field>

          <Field label="Notes" htmlFor="notes" error={fields.notes}>
            <Textarea name="notes" rows={2} />
          </Field>

          <div className="flex gap-2">
            <Button type="submit" loading={pending}>
              {pending ? 'Saving' : 'Create appointment'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function AppointmentActions({ id, status }: { id: string; status: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function update(next: 'confirmed' | 'completed' | 'cancelled' | 'no_show') {
    setError(null);
    startTransition(async () => {
      const result = await setAppointmentStatusAction(id, next);
      if (!result.ok) setError(result.message ?? 'That did not save.');
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex justify-end gap-1">
        {status === 'scheduled' && (
          <Button size="sm" variant="secondary" disabled={pending} onClick={() => update('confirmed')}>
            Confirm
          </Button>
        )}
        {status !== 'completed' && status !== 'cancelled' && (
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => update('completed')}>
            Complete
          </Button>
        )}
        {status !== 'cancelled' && (
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => update('cancelled')}>
            Cancel
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-xs text-critical">
          {error}
        </p>
      )}
    </div>
  );
}
