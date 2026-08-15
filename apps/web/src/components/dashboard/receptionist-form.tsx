'use client';

import { useActionState, useState } from 'react';
import { PERSONALITY_PRESETS, availableVapiVoices, defaultGreeting } from '@afd/shared';
import { Alert, Button, Field, Input, Switch, Textarea, cn } from '@/components/ui';
import { saveAgentAction } from '@/server/actions';
import type { ActionResult } from '@/lib/errors';

interface Initial {
  display_name: string;
  voice: string;
  personality: string;
  greeting: string;
  instructions: string;
  transfer_enabled: boolean;
  transfer_phone: string;
  appointment_booking_enabled: boolean;
}

/**
 * Receptionist configuration.
 *
 * Every control here maps to a field that is written into the assistant Vapi
 * runs, so a change genuinely alters the next call. There is no voice preview
 * button: we would have to synthesise audio through a provider we do not call
 * directly, and a button that plays a stand-in clip would be lying about which
 * voice answers the phone.
 */
export function ReceptionistForm({
  initial,
  canEdit,
  organizationName,
}: {
  initial: Initial;
  canEdit: boolean;
  organizationName: string;
}) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveAgentAction, null);

  const [voice, setVoice] = useState(initial.voice);
  const [personality, setPersonality] = useState(initial.personality);
  const [agentName, setAgentName] = useState(initial.display_name);
  const [greeting, setGreeting] = useState(initial.greeting);
  const [transferEnabled, setTransferEnabled] = useState(initial.transfer_enabled);
  const [bookingEnabled, setBookingEnabled] = useState(initial.appointment_booking_enabled);

  const fields = state?.fields ?? {};
  const voices = availableVapiVoices();

  return (
    <form action={action} className="space-y-6">
      {state?.ok && <Alert tone="positive" title={state.message ?? 'Saved'} />}
      {state && !state.ok && (
        <Alert tone="critical" title={state.message ?? 'That did not save'}>
          {state.action && <p>{state.action}</p>}
        </Alert>
      )}

      <Field
        label="Receptionist name"
        htmlFor="display_name"
        required
        hint="What it calls itself on the phone."
        error={fields.display_name}
      >
        <Input
          name="display_name"
          value={agentName}
          onChange={(e) => setAgentName(e.target.value)}
          disabled={!canEdit}
          required
        />
      </Field>

      <Field
        label="Greeting"
        htmlFor="greeting"
        required
        hint="The first thing every caller hears."
        error={fields.greeting}
      >
        <Textarea
          name="greeting"
          value={greeting}
          onChange={(e) => setGreeting(e.target.value)}
          rows={2}
          disabled={!canEdit}
          required
        />
      </Field>

      {canEdit && (
        <button
          type="button"
          className="-mt-3 block text-sm font-medium text-brand-600 hover:underline"
          onClick={() => setGreeting(defaultGreeting(organizationName, agentName || 'Mia'))}
        >
          Reset to the suggested greeting
        </button>
      )}

      {/* Voice picker ---------------------------------------------------- */}
      <fieldset>
        <legend className="text-sm font-medium text-ink">Voice</legend>
        <p className="mt-1 text-xs text-ink-subtle">
          The voice callers hear. It changes on your next call after you save.
        </p>
        {fields.voice && <p className="mt-1 text-xs text-critical-600">{fields.voice}</p>}
        <input type="hidden" name="voice" value={voice} />

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {voices.map((v) => (
            <label
              key={v.id}
              className={cn(
                'flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-colors',
                voice === v.id ? 'border-brand-600 bg-brand-50' : 'border-line bg-surface',
              )}
            >
              <input
                type="radio"
                name="voice_choice"
                checked={voice === v.id}
                onChange={() => setVoice(v.id)}
                disabled={!canEdit}
                className="mt-1 size-4 shrink-0 text-brand-600"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-ink">{v.label}</span>
                <span className="block text-xs text-ink-subtle">{v.description}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Personality ------------------------------------------------------ */}
      <fieldset>
        <legend className="text-sm font-medium text-ink">Personality</legend>
        <p className="mt-1 text-xs text-ink-subtle">How it speaks to your callers.</p>
        <input type="hidden" name="personality" value={personality} />

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {PERSONALITY_PRESETS.map((p) => (
            <label
              key={p.id}
              className={cn(
                'flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-colors',
                personality === p.id ? 'border-brand-600 bg-brand-50' : 'border-line bg-surface',
              )}
            >
              <input
                type="radio"
                name="personality_choice"
                checked={personality === p.id}
                onChange={() => setPersonality(p.id)}
                disabled={!canEdit}
                className="mt-1 size-4 shrink-0 text-brand-600"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-ink">{p.label}</span>
                <span className="block text-xs text-ink-subtle">{p.summary}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <Field
        label="Extra instructions"
        htmlFor="instructions"
        hint="Anything else the receptionist should know. Added to every call."
        error={fields.instructions}
      >
        <Textarea name="instructions" defaultValue={initial.instructions} rows={3} disabled={!canEdit} />
      </Field>

      {/* Capabilities ---------------------------------------------------- */}
      <fieldset className="divide-y divide-line rounded-lg border border-line px-4">
        <legend className="px-1 text-sm font-medium text-ink">What it is allowed to do</legend>

        <Switch
          id="appointment_booking_enabled"
          label="Collect appointment requests"
          description="Takes the caller's preferred day and time. Your team confirms it — the receptionist never promises a slot."
          checked={bookingEnabled}
          onChange={setBookingEnabled}
          disabled={!canEdit}
        />
        <input type="hidden" name="appointment_booking_enabled" value={bookingEnabled ? 'on' : 'off'} />

        <Switch
          id="transfer_enabled"
          label="Transfer calls to a person"
          description="Hands the caller over when they ask for someone."
          checked={transferEnabled}
          onChange={setTransferEnabled}
          disabled={!canEdit}
        />
        <input type="hidden" name="transfer_enabled" value={transferEnabled ? 'on' : 'off'} />
      </fieldset>

      <Field
        label="Transfer number"
        htmlFor="transfer_phone"
        required={transferEnabled}
        hint="Where callers are sent when they ask for a person."
        error={fields.transfer_phone}
      >
        <Input
          name="transfer_phone"
          defaultValue={initial.transfer_phone}
          inputMode="tel"
          placeholder="(215) 555-0100"
          disabled={!canEdit || !transferEnabled}
        />
      </Field>

      <p className="text-xs text-ink-subtle">
        Whatever you configure, the receptionist always answers truthfully when a caller asks whether
        it is a person. It will never claim to be human, quote a price you have not stored, or invent
        a service you do not offer.
      </p>

      {canEdit && (
        <Button type="submit" size="lg" loading={pending}>
          {pending ? 'Saving' : 'Save receptionist settings'}
        </Button>
      )}
    </form>
  );
}
