'use client';

import { useActionState, useState } from 'react';
import { Alert, Button, Switch } from '@/components/ui';
import { saveNotificationPrefsAction } from '@/server/actions';
import type { ActionResult } from '@/lib/errors';

export function NotificationPrefsForm({
  initial,
  canEdit,
}: {
  initial: Record<string, boolean>;
  canEdit: boolean;
}) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    saveNotificationPrefsAction,
    null,
  );
  const [values, setValues] = useState(initial);

  const toggle = (key: string) => (next: boolean) => setValues((v) => ({ ...v, [key]: next }));

  const items: Array<[string, string, string]> = [
    ['email_new_lead', 'New lead captured', 'Email when your receptionist saves a new caller.'],
    ['email_appointment', 'Appointment booked', 'Email when an appointment is scheduled.'],
    ['email_usage_alerts', 'Usage alerts', 'Email at 70%, 90% and 100% of your included minutes.'],
    ['email_billing', 'Billing problems', 'Email when a payment fails.'],
  ];

  return (
    <form action={action} className="space-y-4">
      {state?.ok && <Alert tone="positive" title={state.message ?? 'Saved'} />}
      {state && !state.ok && <Alert tone="critical" title={state.message ?? 'That did not save'} />}

      <div className="divide-y divide-line rounded-lg border border-line px-4">
        {items.map(([key, label, description]) => (
          <div key={key}>
            <Switch
              id={key}
              label={label}
              description={description}
              checked={Boolean(values[key])}
              onChange={toggle(key)}
              disabled={!canEdit}
            />
            <input type="hidden" name={key} value={values[key] ? 'on' : 'off'} />
          </div>
        ))}
      </div>

      {canEdit && (
        <Button type="submit" loading={pending}>
          {pending ? 'Saving' : 'Save preferences'}
        </Button>
      )}
    </form>
  );
}
