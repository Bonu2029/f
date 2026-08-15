import 'server-only';
import type { NotificationKind } from '@afd/shared';
import { getServiceSupabase } from '@/lib/supabase/server';
import { emailTemplates, sendEmail } from '@/lib/providers/email';
import { absoluteUrl } from '@/lib/env';
import { log } from '@/lib/logger';

/**
 * In-app notifications, with optional email fan-out honouring the
 * organisation's notification preferences.
 */

export interface NotifyInput {
  organizationId: string;
  kind: NotificationKind;
  title: string;
  body?: string | null;
  link?: string | null;
  /** When set, the notification is created at most once for this key. */
  dedupeKey?: string;
}

export async function notify(input: NotifyInput): Promise<void> {
  const svc = getServiceSupabase();

  if (input.dedupeKey) {
    const { data: existing } = await svc
      .from('notifications')
      .select('id')
      .eq('organization_id', input.organizationId)
      .eq('kind', input.kind)
      .ilike('body', `%${input.dedupeKey}%`)
      .limit(1)
      .maybeSingle();
    if (existing) return;
  }

  const { error } = await svc.from('notifications').insert({
    organization_id: input.organizationId,
    kind: input.kind,
    title: input.title,
    body: input.body ?? null,
    link: input.link ?? null,
  });
  if (error) {
    log.warn('notification insert failed', { event: 'notification.failed', error: error.message });
  }
}

/** Owners and admins who should receive operational email. */
async function notifiableEmails(organizationId: string): Promise<string[]> {
  const svc = getServiceSupabase();
  const { data } = await svc
    .from('organization_members')
    .select('role, profile:profiles(email)')
    .eq('organization_id', organizationId)
    .in('role', ['owner', 'admin']);
  type Row = { role: string; profile: { email: string } | null };
  return ((data ?? []) as unknown as Row[])
    .map((r) => r.profile?.email)
    .filter((e): e is string => Boolean(e));
}

async function prefs(organizationId: string) {
  const svc = getServiceSupabase();
  const { data } = await svc
    .from('notification_preferences')
    .select('*')
    .eq('organization_id', organizationId)
    .maybeSingle();
  return {
    email_new_lead: data?.email_new_lead ?? true,
    email_appointment: data?.email_appointment ?? true,
    email_usage_alerts: data?.email_usage_alerts ?? true,
    email_billing: data?.email_billing ?? true,
  };
}

export async function notifyNewLead(input: {
  organizationId: string;
  organizationName: string;
  leadId: string;
  leadName: string;
  service: string;
  phone: string;
}): Promise<void> {
  const link = `/dashboard/leads/${input.leadId}`;
  await notify({
    organizationId: input.organizationId,
    kind: 'lead_created',
    title: `New lead: ${input.leadName}`,
    body: `${input.service}${input.phone ? ` · ${input.phone}` : ''}`,
    link,
  });

  const p = await prefs(input.organizationId);
  if (!p.email_new_lead) return;
  const recipients = await notifiableEmails(input.organizationId);
  const message = emailTemplates.newLead({
    organizationName: input.organizationName,
    leadName: input.leadName,
    service: input.service,
    phone: input.phone,
    url: absoluteUrl(link),
  });
  await Promise.all(recipients.map((to) => sendEmail(to, message)));
}

export async function notifyAppointmentBooked(input: {
  organizationId: string;
  organizationName: string;
  appointmentId: string;
  customer: string;
  service: string;
  when: string;
}): Promise<void> {
  const link = `/dashboard/appointments`;
  await notify({
    organizationId: input.organizationId,
    kind: 'appointment_booked',
    title: `Appointment booked: ${input.customer}`,
    body: `${input.service} · ${input.when}`,
    link,
  });

  const p = await prefs(input.organizationId);
  if (!p.email_appointment) return;
  const recipients = await notifiableEmails(input.organizationId);
  const message = emailTemplates.appointmentBooked({
    organizationName: input.organizationName,
    customer: input.customer,
    when: input.when,
    service: input.service,
    url: absoluteUrl(link),
  });
  await Promise.all(recipients.map((to) => sendEmail(to, message)));
}

export async function notifyUsageThreshold(input: {
  organizationId: string;
  organizationName: string;
  threshold: 70 | 90 | 100;
  used: number;
  included: number;
  billingPeriod: string;
}): Promise<void> {
  const kind = (`usage_${input.threshold}` as NotificationKind);
  await notify({
    organizationId: input.organizationId,
    kind,
    title:
      input.threshold >= 100
        ? 'All included AI minutes used'
        : `${input.threshold}% of AI minutes used`,
    body: `${input.used} of ${input.included} minutes used this period (${input.billingPeriod}).`,
    link: '/dashboard/billing',
    dedupeKey: input.billingPeriod,
  });

  const p = await prefs(input.organizationId);
  if (!p.email_usage_alerts) return;
  const recipients = await notifiableEmails(input.organizationId);
  const message = emailTemplates.usageAlert({
    organizationName: input.organizationName,
    percent: input.threshold,
    used: input.used,
    included: input.included,
    url: absoluteUrl('/dashboard/billing'),
  });
  await Promise.all(recipients.map((to) => sendEmail(to, message)));
}

export async function notifyPaymentFailed(input: {
  organizationId: string;
  organizationName: string;
}): Promise<void> {
  await notify({
    organizationId: input.organizationId,
    kind: 'payment_failed',
    title: 'Payment failed',
    body: 'Update your payment method to keep your receptionist answering.',
    link: '/dashboard/billing',
  });
  const p = await prefs(input.organizationId);
  if (!p.email_billing) return;
  const recipients = await notifiableEmails(input.organizationId);
  const message = emailTemplates.paymentFailed({
    organizationName: input.organizationName,
    url: absoluteUrl('/dashboard/billing'),
  });
  await Promise.all(recipients.map((to) => sendEmail(to, message)));
}

export async function notifyTransferFailed(input: {
  organizationId: string;
  callId: string;
  destination: string;
}): Promise<void> {
  await notify({
    organizationId: input.organizationId,
    kind: 'transfer_failed',
    title: 'A call could not be transferred',
    body: `The receptionist tried to reach ${input.destination} and could not connect. It offered to take a message instead.`,
    link: `/dashboard/calls/${input.callId}`,
  });
}
