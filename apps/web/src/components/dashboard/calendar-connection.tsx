'use client';

import { useEffect, useState } from 'react';
import { CalendarCheck, Link2, Unlink } from 'lucide-react';
import { Alert, Badge, Button, Select } from '@/components/ui';

/**
 * Google Calendar connection state. Tokens live server-side only; this
 * component sees an account email and a calendar id, never a credential.
 */
export function CalendarConnection({
  connection,
  canEdit,
  configured,
}: {
  connection: { accountEmail: string | null; selectedCalendarId: string | null; lastError: string | null } | null;
  canEdit: boolean;
  configured: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; action?: string } | null>(null);
  const [calendars, setCalendars] = useState<Array<{ id: string; summary: string; primary: boolean }>>([]);
  const [selected, setSelected] = useState(connection?.selectedCalendarId ?? 'primary');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!connection) return;
    void (async () => {
      try {
        const res = await fetch('/api/integrations/google/calendars');
        if (!res.ok) return;
        const json = await res.json();
        setCalendars(json.calendars ?? []);
      } catch {
        /* the list is a convenience; failure is not fatal */
      }
    })();
  }, [connection]);

  async function connect() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/integrations/google/connect', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        setError({ message: json?.error?.message ?? 'The connection could not be started.', action: json?.error?.action });
        setBusy(false);
        return;
      }
      window.location.href = json.url;
    } catch {
      setError({ message: 'We could not start the connection. Please try again.' });
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/integrations/google/disconnect', { method: 'POST' });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError({ message: json?.error?.message ?? 'The calendar could not be disconnected.' });
        return;
      }
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  async function selectCalendar(id: string) {
    setSelected(id);
    setSaved(false);
    const res = await fetch('/api/integrations/google/calendars', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ calendar_id: id }),
    });
    if (res.ok) setSaved(true);
  }

  if (!configured) {
    return (
      <Alert tone="caution" title="Google Calendar is not configured on this deployment">
        Set <code>GOOGLE_CLIENT_ID</code>, <code>GOOGLE_CLIENT_SECRET</code> and{' '}
        <code>GOOGLE_REDIRECT_URI</code>, then restart. Your receptionist will use the internal
        availability below in the meantime.
      </Alert>
    );
  }

  if (!connection) {
    return (
      <div className="space-y-3">
        {error && (
          <Alert tone="critical" title={error.message}>
            {error.action && <p>{error.action}</p>}
          </Alert>
        )}
        <p className="text-sm text-ink-muted">
          Connecting a calendar lets your receptionist see when you are genuinely free before it
          offers a time, and writes the appointment straight into your day.
        </p>
        <Button loading={busy} disabled={!canEdit} onClick={connect}>
          <Link2 aria-hidden /> Connect Google Calendar
        </Button>
        <p className="text-xs text-ink-subtle">
          We request read access to your calendar list and busy times, plus permission to manage the
          events this product creates. Nothing else.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && <Alert tone="critical" title={error.message} />}
      {connection.lastError && (
        <Alert tone="caution" title="The last calendar request failed">
          {connection.lastError}
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface-sunken p-4">
        <CalendarCheck className="size-5 text-positive" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink">{connection.accountEmail ?? 'Google account'}</p>
          <p className="text-xs text-ink-subtle">Connected</p>
        </div>
        <Badge tone="positive">Active</Badge>
      </div>

      {calendars.length > 0 && (
        <div>
          <label htmlFor="calendar" className="block text-sm font-medium text-ink">
            Book into which calendar?
          </label>
          <Select
            id="calendar"
            className="mt-1.5"
            value={selected}
            onChange={(e) => selectCalendar(e.target.value)}
            disabled={!canEdit}
          >
            {calendars.map((c) => (
              <option key={c.id} value={c.id}>
                {c.summary}
                {c.primary ? ' (primary)' : ''}
              </option>
            ))}
          </Select>
          {saved && <p className="mt-1.5 text-xs text-positive">Saved.</p>}
        </div>
      )}

      {canEdit && (
        <Button variant="secondary" loading={busy} onClick={disconnect}>
          <Unlink aria-hidden /> Disconnect
        </Button>
      )}
    </div>
  );
}
