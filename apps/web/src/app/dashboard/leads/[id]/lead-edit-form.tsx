'use client';

import { useActionState } from 'react';
import { LEAD_STATUSES } from '@afd/shared';
import { Alert, Button, Field, Input, Select, Textarea } from '@/components/ui';
import { updateLeadAction } from '@/server/actions';
import type { ActionResult } from '@/lib/errors';

/**
 * Editable lead record. Values are seeded from the server and preserved on a
 * failed submit, because losing typed notes to a validation error is worse than
 * the error itself.
 */
export function LeadEditForm({
  leadId,
  initial,
  canEdit,
}: {
  leadId: string;
  canEdit: boolean;
  initial: Record<string, string>;
}) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    updateLeadAction.bind(null, leadId),
    null,
  );

  const fields = state?.fields ?? {};

  return (
    <form action={action} className="space-y-4">
      {state?.ok && <Alert tone="positive" title={state.message ?? 'Saved'} />}
      {state && !state.ok && <Alert tone="critical" title={state.message ?? 'That did not save'} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="name" error={fields.name}>
          <Input name="name" defaultValue={initial.name} disabled={!canEdit} />
        </Field>
        <Field label="Phone" htmlFor="phone" error={fields.phone}>
          <Input name="phone" defaultValue={initial.phone} inputMode="tel" disabled={!canEdit} />
        </Field>
        <Field label="Email" htmlFor="email" error={fields.email}>
          <Input name="email" type="email" defaultValue={initial.email} disabled={!canEdit} />
        </Field>
        <Field label="Service requested" htmlFor="service_requested" error={fields.service_requested}>
          <Input name="service_requested" defaultValue={initial.service_requested} disabled={!canEdit} />
        </Field>
      </div>

      <Field label="Address" htmlFor="address" error={fields.address}>
        <Input name="address" defaultValue={initial.address} disabled={!canEdit} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="City" htmlFor="city" error={fields.city}>
          <Input name="city" defaultValue={initial.city} disabled={!canEdit} />
        </Field>
        <Field label="State" htmlFor="state" error={fields.state}>
          <Input name="state" defaultValue={initial.state} disabled={!canEdit} />
        </Field>
        <Field label="ZIP" htmlFor="postal_code" error={fields.postal_code}>
          <Input name="postal_code" defaultValue={initial.postal_code} inputMode="numeric" disabled={!canEdit} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Status" htmlFor="status">
          <Select name="status" defaultValue={initial.status} disabled={!canEdit}>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, ' ')}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Urgency" htmlFor="urgency">
          <Select name="urgency" defaultValue={initial.urgency} disabled={!canEdit}>
            {['emergency', 'urgent', 'soon', 'flexible', 'unknown'].map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Estimated value"
          htmlFor="estimated_value"
          hint="Dollars. Optional."
          error={fields.estimated_value}
        >
          <Input
            name="estimated_value"
            defaultValue={initial.estimated_value}
            inputMode="decimal"
            placeholder="0.00"
            disabled={!canEdit}
          />
        </Field>
      </div>

      <Field label="What the customer said" htmlFor="description" error={fields.description}>
        <Textarea name="description" defaultValue={initial.description} rows={3} disabled={!canEdit} />
      </Field>

      <Field label="Internal notes" htmlFor="notes" hint="Only your team sees this." error={fields.notes}>
        <Textarea name="notes" defaultValue={initial.notes} rows={3} disabled={!canEdit} />
      </Field>

      {canEdit && (
        <Button type="submit" loading={pending}>
          {pending ? 'Saving' : 'Save changes'}
        </Button>
      )}
    </form>
  );
}
