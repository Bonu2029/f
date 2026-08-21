import 'server-only';
import { smsEnv } from '@/lib/env';
import { log } from '@/lib/logger';
import type { SmsMessage, SmsProvider } from './types';

/**
 * Text messages behind a provider interface.
 *
 * The console adapter is the default and is honest about what it does: it logs
 * the message rather than claiming a send, and reports `isMock`. That flag is
 * load-bearing — it is recorded against every delivery, and it decides whether
 * the receptionist is allowed to tell a caller a text is coming.
 *
 * Vapi does not send SMS, so this is a separate vendor. It is deliberately the
 * only place in the product that knows that.
 */

class TwilioSmsProvider implements SmsProvider {
  readonly name = 'twilio';
  readonly isMock = false;

  get from(): string | null {
    return smsEnv.fromNumber ?? null;
  }

  async send(message: SmsMessage): Promise<{ id: string }> {
    const sid = smsEnv.accountSid;
    const token = smsEnv.authToken;
    const from = smsEnv.fromNumber;
    if (!sid || !token || !from) throw new Error('Twilio is not fully configured');

    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: message.to, From: from, Body: message.body }),
      signal: AbortSignal.timeout(15_000),
    });

    const json = (await res.json().catch(() => null)) as { sid?: string; message?: string } | null;
    if (!res.ok) {
      // Twilio's own message names the real problem — an unverified number, a
      // number that cannot receive SMS — far better than "send failed".
      throw new Error(json?.message ?? `Twilio returned ${res.status}`);
    }
    if (!json?.sid) throw new Error('Twilio accepted the message but returned no id');
    return { id: json.sid };
  }
}

class ConsoleSmsProvider implements SmsProvider {
  readonly name = 'console';
  readonly isMock = true;
  readonly from = null;

  async send(message: SmsMessage): Promise<{ id: string }> {
    log.info('sms (console adapter — not delivered)', {
      provider: 'console',
      event: 'sms.simulated',
      to: message.to,
      body_preview: message.body.slice(0, 200),
    });
    return { id: `console_${crypto.randomUUID()}` };
  }
}

let cached: SmsProvider | null = null;

export function getSmsProvider(): SmsProvider {
  if (!cached) cached = smsEnv.configured ? new TwilioSmsProvider() : new ConsoleSmsProvider();
  return cached;
}

export function __setSmsProviderForTests(p: SmsProvider | null) {
  cached = p;
}
