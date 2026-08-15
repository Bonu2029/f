'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { formatPhone } from '@afd/shared';
import { Alert, Badge, Button, Field, Input } from '@/components/ui';
import { activateReceptionistAction } from '@/server/actions';

export interface ReceptionistStatusProps {
  canEdit: boolean;
  canProvision: boolean;
  assistantId: string | null;
  syncedAt: string | null;
  syncError: string | null;
  phoneNumber: string | null;
  phoneIsDemo: boolean;
  isLive: boolean;
  canGoLive: boolean;
  missing: string[];
  subscriptionActive: boolean;
}

/**
 * Live status of the receptionist: whether the assistant matches what is saved,
 * which number it answers on, and whether it is activated.
 *
 * Every button here calls our own server, which then calls Vapi with the
 * server-held API key. Nothing about Vapi is reachable from this component.
 */
export function ReceptionistStatus(props: ReceptionistStatusProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [busy, setBusy] = useState<null | 'sync' | 'phone' | 'activate'>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [areaCode, setAreaCode] = useState('');

  async function post(path: string, body: unknown): Promise<Record<string, unknown> | null> {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!res.ok) {
      const err = json?.error as { message?: string; action?: string } | undefined;
      setError([err?.message, err?.action].filter(Boolean).join(' ') || 'That did not work.');
      return null;
    }
    return json;
  }

  async function resync() {
    setBusy('sync');
    setError(null);
    setNotice(null);
    const json = await post('/api/vapi/sync', {});
    setBusy(null);
    if (json) {
      setNotice(
        json.demo
          ? 'Settings were rebuilt locally. Vapi is not configured on this deployment, so no live assistant was updated.'
          : 'Your receptionist now matches your saved settings.',
      );
      startTransition(() => router.refresh());
    }
  }

  async function getNumber() {
    setBusy('phone');
    setError(null);
    setNotice(null);
    const json = await post('/api/vapi/phone-number', {
      area_code: areaCode.trim() || null,
    });
    setBusy(null);
    if (json) {
      setNotice(
        json.demo
          ? `${formatPhone(String(json.phone_number))} is a placeholder — it cannot receive calls until VAPI_API_KEY is configured.`
          : `${formatPhone(String(json.phone_number))} is yours. Forward your business line to it whenever you are ready.`,
      );
      startTransition(() => router.refresh());
    }
  }

  function activate() {
    setError(null);
    setNotice(null);
    setBusy('activate');
    startTransition(async () => {
      const result = await activateReceptionistAction();
      setBusy(null);
      if (result.ok) {
        setNotice(result.message ?? 'Your receptionist is live.');
        router.refresh();
      } else {
        setError(result.message ?? 'That did not work.');
      }
    });
  }

  const working = busy !== null || pending;

  return (
    <div className="space-y-4">
      {error && <Alert tone="critical" title={error} />}
      {notice && <Alert tone="positive" title={notice} />}

      {/* Assistant --------------------------------------------------------- */}
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-line p-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium text-ink">
            AI assistant
            {props.syncError ? (
              <Badge tone="critical">Out of date</Badge>
            ) : props.assistantId ? (
              <Badge tone="positive">Up to date</Badge>
            ) : (
              <Badge tone="neutral">Not created yet</Badge>
            )}
          </p>
          <p className="mt-1 text-xs text-ink-subtle">
            {props.syncError
              ? `Your last change was saved here but did not reach the voice provider: ${props.syncError}`
              : props.syncedAt
                ? `Last updated ${new Date(props.syncedAt).toLocaleString()}.`
                : 'It is created the first time you save your business or receptionist settings.'}
          </p>
        </div>
        {props.canEdit && (
          <Button type="button" variant="secondary" loading={busy === 'sync'} disabled={working} onClick={resync}>
            Update receptionist
          </Button>
        )}
      </div>

      {/* Phone number ------------------------------------------------------ */}
      <div className="rounded-lg border border-line p-4">
        <p className="flex items-center gap-2 text-sm font-medium text-ink">
          Phone number
          {props.phoneNumber ? (
            props.phoneIsDemo ? (
              <Badge tone="caution">Placeholder</Badge>
            ) : (
              <Badge tone="positive">Active</Badge>
            )
          ) : (
            <Badge tone="neutral">None yet</Badge>
          )}
        </p>

        {props.phoneNumber ? (
          <>
            <p className="mt-2 text-xl font-semibold tabular text-ink">{formatPhone(props.phoneNumber)}</p>
            <p className="mt-1 text-xs text-ink-subtle">
              {props.phoneIsDemo
                ? 'This number is a placeholder for development and cannot receive calls.'
                : 'Forward your existing business line to this number, or advertise it directly.'}
            </p>
          </>
        ) : (
          <>
            <p className="mt-1 text-xs text-ink-subtle">
              We will get you a number your receptionist answers on. You can forward your existing
              business line to it.
            </p>
            {props.canProvision ? (
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <Field label="Preferred area code" htmlFor="area_code" hint="Optional. Three digits.">
                  <Input
                    id="area_code"
                    value={areaCode}
                    onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
                    inputMode="numeric"
                    placeholder="215"
                    className="w-32"
                  />
                </Field>
                <Button type="button" loading={busy === 'phone'} disabled={working} onClick={getNumber}>
                  Get my number
                </Button>
              </div>
            ) : (
              <p className="mt-3 text-xs text-ink-subtle">
                {props.subscriptionActive
                  ? 'Only the account owner can add a phone number.'
                  : 'Start a subscription first — we do not reserve numbers for inactive accounts.'}
              </p>
            )}
          </>
        )}
      </div>

      {/* Activation -------------------------------------------------------- */}
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-line p-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium text-ink">
            Answering calls
            {props.isLive ? <Badge tone="positive">Live</Badge> : <Badge tone="caution">Not live</Badge>}
          </p>
          <p className="mt-1 text-xs text-ink-subtle">
            {props.isLive
              ? 'Your receptionist is answering. Pause it any time from the button at the top of this page.'
              : props.canGoLive
                ? 'Everything required is in place.'
                : `Still needed: ${props.missing.join(', ')}.`}
          </p>
        </div>
        {props.canEdit && !props.isLive && (
          <Button
            type="button"
            loading={busy === 'activate'}
            disabled={working || !props.canGoLive}
            onClick={activate}
          >
            Activate receptionist
          </Button>
        )}
      </div>
    </div>
  );
}
