'use client';

import { useActionState, useState } from 'react';
import { Check, PhoneCall, Search } from 'lucide-react';
import { formatPhone } from '@afd/shared';
import { Alert, Badge, Button, Field, Input, Select, cn } from '@/components/ui';
import { saveForwardingAction } from '@/server/actions';
import type { ActionResult } from '@/lib/errors';

interface AvailableNumber {
  phoneNumber: string;
  friendlyName: string;
  locality: string | null;
  region: string | null;
  capabilities: { voice: boolean; sms: boolean; mms: boolean };
}

interface Current {
  phone_number: string;
  display: string;
  is_demo: boolean;
  forwarding_mode: string;
  forwarding_target: string;
  capabilities: { voice: boolean; sms: boolean; mms: boolean };
}

/**
 * Number search and provisioning. Only numbers with voice capability are
 * offered, because a number that cannot take a call cannot run a receptionist.
 */
export function PhoneManager({ current, canEdit }: { current: Current | null; canEdit: boolean }) {
  const [areaCode, setAreaCode] = useState('');
  const [results, setResults] = useState<AvailableNumber[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; action?: string } | null>(null);
  const [demoNotice, setDemoNotice] = useState(false);

  const [forwardState, forwardAction, forwardPending] = useActionState<ActionResult | null, FormData>(
    saveForwardingAction,
    null,
  );

  async function search() {
    setSearching(true);
    setError(null);
    setResults(null);
    try {
      const res = await fetch('/api/phone/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ area_code: areaCode || null, country: 'US' }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError({ message: json?.error?.message ?? 'The number search failed.', action: json?.error?.action });
        return;
      }
      setResults(json.numbers as AvailableNumber[]);
      setDemoNotice(Boolean(json.demo));
    } catch {
      setError({ message: 'We could not reach the phone provider. Please try again.' });
    } finally {
      setSearching(false);
    }
  }

  async function purchase(phoneNumber: string) {
    setBuying(phoneNumber);
    setError(null);
    try {
      const res = await fetch('/api/phone/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phoneNumber }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError({ message: json?.error?.message ?? 'The number could not be provisioned.', action: json?.error?.action });
        return;
      }
      window.location.reload();
    } catch {
      setError({ message: 'We could not reach the phone provider. No number was purchased.' });
    } finally {
      setBuying(null);
    }
  }

  if (current) {
    return (
      <div className="space-y-5">
        <div className="rounded-lg border border-line bg-surface-sunken p-4">
          <div className="flex flex-wrap items-center gap-3">
            <PhoneCall className="size-5 text-brand-600" aria-hidden />
            <span className="text-xl font-semibold tabular tracking-tight text-ink">
              {current.display}
            </span>
            {current.is_demo && <Badge tone="caution">Demo number</Badge>}
            {current.capabilities?.voice && <Badge tone="positive">Voice</Badge>}
            {current.capabilities?.sms && <Badge tone="positive">SMS</Badge>}
          </div>
          <p className="mt-2 text-sm text-ink-muted">
            {current.is_demo
              ? 'This number is simulated and will not receive real calls.'
              : 'Calls to this number are answered by your AI receptionist.'}
          </p>
        </div>

        <form action={forwardAction} className="space-y-4">
          <h3 className="text-sm font-semibold text-ink">Forwarding from your existing line</h3>
          <p className="text-sm text-ink-muted">
            Record what you have set up with your carrier so your team knows. Changing this here does
            not change your carrier&rsquo;s settings.
          </p>

          {forwardState?.ok && <Alert tone="positive" title={forwardState.message ?? 'Saved'} />}
          {forwardState && !forwardState.ok && (
            <Alert tone="critical" title={forwardState.message ?? 'That did not save'} />
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Forwarding setup" htmlFor="forwarding_mode">
              <Select name="forwarding_mode" defaultValue={current.forwarding_mode} disabled={!canEdit}>
                <option value="none">Not forwarding — customers dial the AI number directly</option>
                <option value="all">Forward all calls</option>
                <option value="missed_only">Forward only missed calls</option>
                <option value="after_hours">Forward after hours</option>
              </Select>
            </Field>
            <Field
              label="Your existing business number"
              htmlFor="forwarding_target"
              hint="The number your customers already dial."
            >
              <Input
                name="forwarding_target"
                defaultValue={current.forwarding_target}
                inputMode="tel"
                disabled={!canEdit}
              />
            </Field>
          </div>

          {canEdit && (
            <Button type="submit" loading={forwardPending}>
              {forwardPending ? 'Saving' : 'Save forwarding setup'}
            </Button>
          )}
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-muted">
        Choose a number in your area code. Only voice-capable numbers are shown, and we prefer ones
        that can also send texts.
      </p>

      {error && (
        <Alert tone="critical" title={error.message}>
          {error.action && <p>{error.action}</p>}
        </Alert>
      )}
      {demoNotice && (
        <Alert tone="caution" title="Demo numbers">
          These are simulated results, not real available numbers.
        </Alert>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <Field label="Area code" htmlFor="area_code" hint="Leave blank to see any area code." className="flex-1">
          <Input
            value={areaCode}
            onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
            inputMode="numeric"
            placeholder="215"
            disabled={!canEdit}
          />
        </Field>
        <Button variant="secondary" loading={searching} disabled={!canEdit} onClick={search}>
          <Search aria-hidden /> {searching ? 'Searching' : 'Search numbers'}
        </Button>
      </div>

      {results && results.length === 0 && (
        <Alert tone="caution" title="No numbers available in that area code">
          Try a nearby area code, or leave it blank to see whatever is available.
        </Alert>
      )}

      {results && results.length > 0 && (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {results.map((n) => (
            <li key={n.phoneNumber} className="flex flex-wrap items-center justify-between gap-3 p-3">
              <div>
                <p className="font-medium tabular text-ink">{formatPhone(n.phoneNumber)}</p>
                <p className="text-xs text-ink-subtle">
                  {[n.locality, n.region].filter(Boolean).join(', ') || 'United States'}
                  {n.capabilities.sms ? ' · voice + SMS' : ' · voice only'}
                </p>
              </div>
              <Button
                size="sm"
                loading={buying === n.phoneNumber}
                disabled={!canEdit || Boolean(buying)}
                onClick={() => purchase(n.phoneNumber)}
                className={cn(!n.capabilities.sms && 'opacity-80')}
              >
                <Check aria-hidden /> {buying === n.phoneNumber ? 'Setting up' : 'Use this number'}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
