import 'server-only';
import { brand } from '@afd/shared';
import { emailEnv } from '@/lib/env';
import { log } from '@/lib/logger';
import type { EmailMessage, EmailProvider } from './types';

/**
 * Email delivery behind a provider interface.
 *
 * The console adapter is the default and is honest about what it does: it logs
 * the message rather than claiming a send. Set EMAIL_PROVIDER=resend and supply
 * RESEND_API_KEY to deliver for real.
 */

class ResendEmailProvider implements EmailProvider {
  readonly name = 'resend';
  readonly isMock = false;

  async send(message: EmailMessage): Promise<{ id: string }> {
    const key = emailEnv.resendApiKey;
    if (!key) throw new Error('RESEND_API_KEY is not set');
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: emailEnv.from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        ...(message.html ? { html: message.html } : {}),
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      log.error('resend send failed', { provider: 'resend', status: res.status, detail });
      throw new Error(`Email provider returned ${res.status}`);
    }
    const json = (await res.json()) as { id: string };
    return { id: json.id };
  }
}

class ConsoleEmailProvider implements EmailProvider {
  readonly name = 'console';
  readonly isMock = true;

  async send(message: EmailMessage): Promise<{ id: string }> {
    log.info('email (console adapter — not delivered)', {
      provider: 'console',
      event: 'email.simulated',
      to: message.to,
      subject: message.subject,
      body_preview: message.text.slice(0, 200),
    });
    return { id: `console_${crypto.randomUUID()}` };
  }
}

let cached: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (cached) return cached;
  cached =
    emailEnv.provider === 'resend' && emailEnv.resendApiKey
      ? new ResendEmailProvider()
      : new ConsoleEmailProvider();
  return cached;
}

export function __setEmailProviderForTests(p: EmailProvider | null) {
  cached = p;
}

/* -------------------------------------------------------------------------- */
/* Templates                                                                  */
/* -------------------------------------------------------------------------- */

function wrap(title: string, bodyLines: string[], cta?: { label: string; url: string }): EmailMessage['html'] {
  const body = bodyLines.map((l) => `<p style="margin:0 0 14px;line-height:1.6;color:#44403c">${l}</p>`).join('');
  const button = cta
    ? `<p style="margin:24px 0 0"><a href="${cta.url}" style="display:inline-block;background:${brand.colors.primary};color:#fff;text-decoration:none;padding:11px 20px;border-radius:8px;font-weight:600">${cta.label}</a></p>`
    : '';
  return `<div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px">
  <p style="font-weight:700;font-size:15px;color:${brand.colors.primary};margin:0 0 24px">${brand.name}</p>
  <h1 style="font-size:20px;margin:0 0 16px;color:#1c1917">${title}</h1>
  ${body}${button}
  <p style="margin:32px 0 0;font-size:12px;color:#a8a29e">Sent by ${brand.name}. Questions? ${brand.contact.support}</p>
</div>`;
}

export const emailTemplates = {
  teamInvite(input: { organizationName: string; inviterName: string; acceptUrl: string; role: string }): EmailMessage {
    const lines = [
      `${input.inviterName} invited you to join <strong>${input.organizationName}</strong> on ${brand.name} as a ${input.role}.`,
      'The link below expires in 7 days.',
    ];
    return {
      to: '',
      subject: `Join ${input.organizationName} on ${brand.name}`,
      text: `${input.inviterName} invited you to join ${input.organizationName} on ${brand.name} as a ${input.role}.\n\nAccept: ${input.acceptUrl}\n\nThis link expires in 7 days.`,
      html: wrap('You have been invited', lines, { label: 'Accept invitation', url: input.acceptUrl }),
    };
  },

  newLead(input: { organizationName: string; leadName: string; service: string; phone: string; url: string }): EmailMessage {
    const lines = [
      `Your receptionist captured a new lead for <strong>${input.organizationName}</strong>.`,
      `<strong>${input.leadName}</strong> — ${input.service}<br/>${input.phone}`,
    ];
    return {
      to: '',
      subject: `New lead: ${input.leadName} (${input.service})`,
      text: `New lead for ${input.organizationName}\n\n${input.leadName}\n${input.service}\n${input.phone}\n\nView: ${input.url}`,
      html: wrap('New lead captured', lines, { label: 'View lead', url: input.url }),
    };
  },

  appointmentBooked(input: { organizationName: string; customer: string; when: string; service: string; url: string }): EmailMessage {
    const lines = [
      `Your receptionist booked an appointment for <strong>${input.organizationName}</strong>.`,
      `<strong>${input.customer}</strong> — ${input.service}<br/>${input.when}`,
    ];
    return {
      to: '',
      subject: `Appointment booked: ${input.customer}, ${input.when}`,
      text: `Appointment booked for ${input.organizationName}\n\n${input.customer}\n${input.service}\n${input.when}\n\nView: ${input.url}`,
      html: wrap('Appointment booked', lines, { label: 'View appointment', url: input.url }),
    };
  },

  usageAlert(input: { organizationName: string; percent: number; used: number; included: number; url: string }): EmailMessage {
    const lines =
      input.percent >= 100
        ? [
            `<strong>${input.organizationName}</strong> has used all ${input.included} included AI minutes this billing period.`,
            'Your receptionist keeps answering — additional minutes are billed at the published overage rate.',
          ]
        : [
            `<strong>${input.organizationName}</strong> has used ${input.used} of ${input.included} included AI minutes (${input.percent}%) this billing period.`,
          ];
    return {
      to: '',
      subject:
        input.percent >= 100
          ? `You have used all your included AI minutes`
          : `${input.percent}% of your AI minutes used`,
      text: lines.map((l) => l.replace(/<[^>]+>/g, '')).join('\n\n') + `\n\nBilling: ${input.url}`,
      html: wrap('Usage update', lines, { label: 'View billing', url: input.url }),
    };
  },

  paymentFailed(input: { organizationName: string; url: string }): EmailMessage {
    const lines = [
      `We could not process the latest payment for <strong>${input.organizationName}</strong>.`,
      'Your receptionist keeps answering for now, but update your payment method to avoid interruption.',
    ];
    return {
      to: '',
      subject: 'Payment failed — action needed',
      text: `We could not process the latest payment for ${input.organizationName}.\n\nUpdate your payment method: ${input.url}`,
      html: wrap('Payment failed', lines, { label: 'Update payment method', url: input.url }),
    };
  },

  onboardingNudge(input: { organizationName: string; url: string; step: string }): EmailMessage {
    const lines = [
      `Your AI receptionist for <strong>${input.organizationName}</strong> is not live yet.`,
      `The next step is <strong>${input.step}</strong>. It takes a couple of minutes.`,
    ];
    return {
      to: '',
      subject: `Finish setting up your receptionist`,
      text: `Your AI receptionist for ${input.organizationName} is not live yet. Next step: ${input.step}.\n\nContinue: ${input.url}`,
      html: wrap('Finish setting up', lines, { label: 'Continue setup', url: input.url }),
    };
  },
};

/** Sends a templated email to one recipient. Never throws into the caller. */
export async function sendEmail(to: string, message: EmailMessage): Promise<void> {
  try {
    await getEmailProvider().send({ ...message, to });
  } catch (err) {
    log.warn('email send failed', { event: 'email.failed', error: err instanceof Error ? err.message : String(err) });
  }
}
