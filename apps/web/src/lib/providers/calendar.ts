import 'server-only';
import { google } from 'googleapis';

/**
 * Use the OAuth2 client type that `googleapis` itself resolves. Importing the
 * type from `google-auth-library` directly can bind to a second, structurally
 * identical copy of the package and produce a spurious type mismatch.
 */
type GoogleOAuth2Client = InstanceType<typeof google.auth.OAuth2>;
import { DEMO_MODE, googleEnv } from '@/lib/env';
import { errors } from '@/lib/errors';
import { log } from '@/lib/logger';
import { decryptSecret, encryptSecret } from '@/lib/crypto';
import { getServiceSupabase } from '@/lib/supabase/server';
import type {
  CalendarBusySpan,
  CalendarEventInput,
  CalendarEventResult,
  CalendarListEntry,
  CalendarProvider,
} from './types';

/**
 * Google Calendar integration.
 *
 * Scopes requested are the minimum needed to read availability and manage the
 * events this product creates:
 *   - calendar.readonly    → list calendars, read busy times
 *   - calendar.events      → create / update / delete events we own
 *
 * Tokens are encrypted with AES-256-GCM before storage and are only ever
 * decrypted inside this module, on the server.
 */
export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'openid',
  'email',
];

export function googleOAuthClient(): GoogleOAuth2Client {
  return new google.auth.OAuth2(googleEnv.clientId, googleEnv.clientSecret, googleEnv.redirectUri);
}

export function googleAuthUrl(state: string): string {
  return googleOAuthClient().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: GOOGLE_SCOPES,
    state,
    include_granted_scopes: true,
  });
}

class GoogleCalendarProvider implements CalendarProvider {
  readonly name = 'google';
  readonly isMock = false;

  /**
   * Loads the organisation's stored credentials, refreshing the access token
   * when it has expired and persisting the rotated token.
   */
  private async authFor(organizationId: string): Promise<GoogleOAuth2Client> {
    const svc = getServiceSupabase();
    const { data } = await svc
      .from('calendar_connections')
      .select('encrypted_access_token, encrypted_refresh_token, expires_at, active')
      .eq('organization_id', organizationId)
      .eq('provider', 'google')
      .maybeSingle();

    if (!data || !data.active || !data.encrypted_refresh_token) {
      throw errors.calendarDisconnected();
    }

    const client = googleOAuthClient();
    client.setCredentials({
      access_token: data.encrypted_access_token ? decryptSecret(data.encrypted_access_token) : undefined,
      refresh_token: decryptSecret(data.encrypted_refresh_token),
      expiry_date: data.expires_at ? new Date(data.expires_at).getTime() : undefined,
    });

    // Persist rotated credentials so the next call does not have to refresh.
    client.on('tokens', (tokens) => {
      void (async () => {
        const patch: Record<string, unknown> = {};
        if (tokens.access_token) patch.encrypted_access_token = encryptSecret(tokens.access_token);
        if (tokens.refresh_token) patch.encrypted_refresh_token = encryptSecret(tokens.refresh_token);
        if (tokens.expiry_date) patch.expires_at = new Date(tokens.expiry_date).toISOString();
        if (Object.keys(patch).length === 0) return;
        await svc.from('calendar_connections').update(patch).eq('organization_id', organizationId).eq('provider', 'google');
      })();
    });

    return client;
  }

  private async markDisconnected(organizationId: string, reason: string) {
    const svc = getServiceSupabase();
    await svc
      .from('calendar_connections')
      .update({ active: false, last_error: reason.slice(0, 500) })
      .eq('organization_id', organizationId)
      .eq('provider', 'google');
    await svc.from('notifications').insert({
      organization_id: organizationId,
      kind: 'calendar_disconnected',
      title: 'Google Calendar disconnected',
      body: 'Your receptionist cannot check availability until the calendar is reconnected.',
      link: '/dashboard/settings/calendar',
    });
  }

  private async handle<T>(organizationId: string, fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (/invalid_grant|unauthorized|invalid credentials|401/i.test(message)) {
        await this.markDisconnected(organizationId, message);
        throw errors.calendarDisconnected();
      }
      log.error('google calendar call failed', { provider: 'google', organization_id: organizationId, error: err });
      throw errors.providerUnavailable('Google Calendar');
    }
  }

  private async selectedCalendarId(organizationId: string): Promise<string> {
    const svc = getServiceSupabase();
    const { data } = await svc
      .from('calendar_connections')
      .select('selected_calendar_id')
      .eq('organization_id', organizationId)
      .eq('provider', 'google')
      .maybeSingle();
    return data?.selected_calendar_id ?? 'primary';
  }

  async listCalendars(organizationId: string): Promise<CalendarListEntry[]> {
    return this.handle(organizationId, async () => {
      const auth = await this.authFor(organizationId);
      const cal = google.calendar({ version: 'v3', auth });
      const res = await cal.calendarList.list({ maxResults: 50 });
      return (res.data.items ?? []).map((c) => ({
        id: c.id ?? '',
        summary: c.summary ?? c.id ?? 'Calendar',
        primary: Boolean(c.primary),
        timeZone: c.timeZone ?? null,
      }));
    });
  }

  async getBusy(organizationId: string, fromISO: string, toISO: string): Promise<CalendarBusySpan[]> {
    return this.handle(organizationId, async () => {
      const auth = await this.authFor(organizationId);
      const calendarId = await this.selectedCalendarId(organizationId);
      const cal = google.calendar({ version: 'v3', auth });
      const res = await cal.freebusy.query({
        requestBody: { timeMin: fromISO, timeMax: toISO, items: [{ id: calendarId }] },
      });
      const busy = res.data.calendars?.[calendarId]?.busy ?? [];
      return busy
        .filter((b): b is { start: string; end: string } => Boolean(b.start && b.end))
        .map((b) => ({ start: b.start, end: b.end }));
    });
  }

  async createEvent(organizationId: string, event: CalendarEventInput): Promise<CalendarEventResult> {
    return this.handle(organizationId, async () => {
      const auth = await this.authFor(organizationId);
      const calendarId = await this.selectedCalendarId(organizationId);
      const cal = google.calendar({ version: 'v3', auth });
      const res = await cal.events.insert({
        calendarId,
        // Deterministic id derived from the booking key prevents a retried
        // booking from creating a second event.
        requestBody: {
          id: googleEventId(event.idempotencyKey),
          summary: event.summary,
          description: event.description ?? undefined,
          location: event.location ?? undefined,
          start: { dateTime: event.startISO, timeZone: event.timeZone },
          end: { dateTime: event.endISO, timeZone: event.timeZone },
          ...(event.attendeeEmail ? { attendees: [{ email: event.attendeeEmail }] } : {}),
        },
      });
      return { externalId: res.data.id ?? '', htmlLink: res.data.htmlLink ?? null };
    }).catch(async (err) => {
      // A duplicate id means the event already exists — treat as success.
      if (err instanceof Error && /duplicate|already exists|409/i.test(err.message)) {
        return { externalId: googleEventId(event.idempotencyKey), htmlLink: null };
      }
      throw err;
    });
  }

  async cancelEvent(organizationId: string, externalId: string): Promise<void> {
    await this.handle(organizationId, async () => {
      const auth = await this.authFor(organizationId);
      const calendarId = await this.selectedCalendarId(organizationId);
      const cal = google.calendar({ version: 'v3', auth });
      await cal.events.delete({ calendarId, eventId: externalId });
    });
  }

  async rescheduleEvent(
    organizationId: string,
    externalId: string,
    startISO: string,
    endISO: string,
  ): Promise<CalendarEventResult> {
    return this.handle(organizationId, async () => {
      const auth = await this.authFor(organizationId);
      const calendarId = await this.selectedCalendarId(organizationId);
      const cal = google.calendar({ version: 'v3', auth });
      const res = await cal.events.patch({
        calendarId,
        eventId: externalId,
        requestBody: { start: { dateTime: startISO }, end: { dateTime: endISO } },
      });
      return { externalId: res.data.id ?? externalId, htmlLink: res.data.htmlLink ?? null };
    });
  }
}

/**
 * Google event ids must be 5–1024 chars of base32hex (a–v, 0–9). Derive one
 * deterministically from the idempotency key.
 */
function googleEventId(key: string): string {
  const hex = Buffer.from(key).toString('hex');
  const mapped = hex.replace(/[0-9a-f]/g, (c) => (/[0-9]/.test(c) ? c : c));
  return `afd${mapped}`.slice(0, 200);
}

/* -------------------------------------------------------------------------- */
/* Mock                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Demo calendar. Availability comes entirely from the organisation's internal
 * availability rules (which is a real product path, not a fake one) and events
 * are recorded only in our own `appointments` table.
 */
class MockCalendarProvider implements CalendarProvider {
  readonly name = 'mock-calendar';
  readonly isMock = true;

  async listCalendars(): Promise<CalendarListEntry[]> {
    return [{ id: 'primary', summary: 'Demo calendar', primary: true, timeZone: 'America/New_York' }];
  }

  async getBusy(): Promise<CalendarBusySpan[]> {
    return [];
  }

  async createEvent(_organizationId: string, event: CalendarEventInput): Promise<CalendarEventResult> {
    return { externalId: `demo_${googleEventId(event.idempotencyKey).slice(0, 32)}`, htmlLink: null };
  }

  async cancelEvent(): Promise<void> {
    /* no external calendar in demo mode */
  }

  async rescheduleEvent(
    _organizationId: string,
    externalId: string,
  ): Promise<CalendarEventResult> {
    return { externalId, htmlLink: null };
  }
}

/* -------------------------------------------------------------------------- */

let cached: CalendarProvider | null = null;

export function getCalendarProvider(): CalendarProvider {
  if (cached) return cached;
  cached = DEMO_MODE || !googleEnv.configured ? new MockCalendarProvider() : new GoogleCalendarProvider();
  return cached;
}

export function __setCalendarProviderForTests(p: CalendarProvider | null) {
  cached = p;
}

/** True when this organisation has a live Google connection. */
export async function hasCalendarConnection(organizationId: string): Promise<boolean> {
  const svc = getServiceSupabase();
  const { data } = await svc
    .from('calendar_connections')
    .select('active, encrypted_refresh_token')
    .eq('organization_id', organizationId)
    .eq('provider', 'google')
    .maybeSingle();
  return Boolean(data?.active && data.encrypted_refresh_token);
}

export { GoogleCalendarProvider, MockCalendarProvider };
