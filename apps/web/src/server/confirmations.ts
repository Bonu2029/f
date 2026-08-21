import 'server-only';
import {
  confirmationChannel,
  customerConfirmationEmail,
  customerConfirmationSms,
  describeSlotForSpeech,
  ownerJobSummaryEmail,
  type BookingFacts,
  type ConfirmationChannel,
} from '@afd/shared';
import { getServiceSupabase } from '@/lib/supabase/server';
import { getSmsProvider } from '@/lib/providers/sms';
import { getEmailProvider } from '@/lib/providers/email';
import { smsEnv } from '@/lib/env';
import { childLogger } from '@/lib/logger';
import { notifiableEmails, notificationPrefs, notify } from '@/server/notifications';

/**
 * Telling the customer, and telling the business.
 *
 * Every attempt is written to `message_deliveries` before this returns —
 * including the ones that were skipped and the ones a development adapter only
 * logged. Without that record, "we told them" and "we quietly told nobody" are
 * the same row in the database, and the first time anyone notices is a customer
 * saying they were never confirmed.
 *
 * Nothing here is allowed to fail the booking. The appointment is already
 * committed by the time this runs; a text that did not send is a problem to
 * report, not a reason to unbook a job the caller was told they had.
 */

export interface ConfirmationOutcome {
  /** What the customer confirmation actually went out on. */
  customerChannel: ConfirmationChannel;
  customerSent: boolean;
  /** True when an adapter logged the message rather than delivering it. */
  customerSimulated: boolean;
  /** The in-app notice, which needs no provider and so almost always lands. */
  ownerNotifiedInApp: boolean;
  /**
   * How many people actually received the job summary. Separate from the
   * in-app notice because they fail independently, and reporting one flag for
   * both let a run where nobody was emailed report itself as a success.
   */
  ownerSummaryRecipients: number;
}

/** Decided before booking, so the receptionist only promises what will happen. */
export function plannedConfirmationChannel(input: {
  customerPhone: string | null;
  customerEmail: string | null;
}): ConfirmationChannel {
  return confirmationChannel({
    smsConfigured: smsEnv.configured,
    customerPhone: input.customerPhone,
    customerEmail: input.customerEmail,
  });
}

export async function sendBookingConfirmations(input: {
  organizationId: string;
  appointmentId: string;
}): Promise<ConfirmationOutcome> {
  const svc = getServiceSupabase();
  const logger = childLogger({
    organization_id: input.organizationId,
    event: 'booking.confirmations',
    appointment_id: input.appointmentId,
  });

  const { data: appointment } = await svc
    .from('appointments')
    .select(
      'id, customer_name, customer_phone, customer_email, service, address, notes, start_at, end_at, employee_id, call_id, lead_id',
    )
    .eq('id', input.appointmentId)
    .eq('organization_id', input.organizationId)
    .maybeSingle();

  if (!appointment) {
    logger.warn('no appointment to confirm');
    return {
      customerChannel: 'none',
      customerSent: false,
      customerSimulated: false,
      ownerNotifiedInApp: false,
      ownerSummaryRecipients: 0,
    };
  }

  const [{ data: org }, { data: business }, { data: employee }] = await Promise.all([
    svc.from('organizations').select('name, timezone').eq('id', input.organizationId).maybeSingle(),
    svc
      .from('business_profiles')
      .select('display_name, public_phone, email, timezone')
      .eq('organization_id', input.organizationId)
      .maybeSingle(),
    appointment.employee_id
      ? svc.from('employees').select('name').eq('id', appointment.employee_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const timezone =
    (business?.timezone as string) ?? (org?.timezone as string) ?? 'America/New_York';
  const startAt = new Date(appointment.start_at as string);
  const endAt = new Date(appointment.end_at as string);

  const facts: BookingFacts & { customerPhone: string | null } = {
    businessName: (business?.display_name as string) ?? (org?.name as string) ?? 'Your appointment',
    whenSpoken: describeSlotForSpeech(startAt.toISOString(), timezone, new Date().toISOString()),
    customerName: appointment.customer_name as string,
    customerPhone: (appointment.customer_phone as string) ?? null,
    service: (appointment.service as string) ?? null,
    address: (appointment.address as string) ?? null,
    employeeName: (employee?.name as string) ?? null,
    businessPhone: (business?.public_phone as string) ?? null,
    notes: (appointment.notes as string) ?? null,
    durationMinutes: Math.max(0, Math.round((endAt.getTime() - startAt.getTime()) / 60_000)),
  };

  const record = async (row: {
    channel: 'sms' | 'email';
    recipient: string;
    purpose: string;
    body: string;
    status: 'sent' | 'failed' | 'skipped';
    simulated: boolean;
    provider?: string | null;
    providerMessageId?: string | null;
    error?: string | null;
  }) => {
    const { error } = await svc.from('message_deliveries').insert({
      organization_id: input.organizationId,
      appointment_id: appointment.id,
      call_id: appointment.call_id ?? null,
      lead_id: appointment.lead_id ?? null,
      channel: row.channel,
      recipient: row.recipient,
      purpose: row.purpose,
      body: row.body,
      status: row.status,
      simulated: row.simulated,
      provider: row.provider ?? null,
      provider_message_id: row.providerMessageId ?? null,
      error: row.error ?? null,
    });
    // Checked, because an unrecorded send is exactly the state this table exists
    // to make impossible.
    if (error) logger.error('could not record a delivery', { error: error.message });
  };

  /* ---- The customer ------------------------------------------------------ */

  const channel = plannedConfirmationChannel({
    customerPhone: facts.customerPhone,
    customerEmail: (appointment.customer_email as string) ?? null,
  });

  let customerSent = false;
  let customerSimulated = false;

  if (channel === 'sms') {
    const provider = getSmsProvider();
    const body = customerConfirmationSms(facts);
    customerSimulated = provider.isMock;
    try {
      const sent = await provider.send({ to: facts.customerPhone!, body });
      customerSent = true;
      await record({
        channel: 'sms',
        recipient: facts.customerPhone!,
        purpose: 'appointment_confirmation',
        body,
        status: 'sent',
        simulated: provider.isMock,
        provider: provider.name,
        providerMessageId: sent.id,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('confirmation text failed', { error: message });
      await record({
        channel: 'sms',
        recipient: facts.customerPhone!,
        purpose: 'appointment_confirmation',
        body,
        status: 'failed',
        simulated: provider.isMock,
        provider: provider.name,
        error: message,
      });
    }
  } else if (channel === 'email') {
    const provider = getEmailProvider();
    const to = appointment.customer_email as string;
    const { subject, text } = customerConfirmationEmail(facts);
    customerSimulated = provider.isMock;
    try {
      const sent = await provider.send({ to, subject, text });
      customerSent = true;
      await record({
        channel: 'email',
        recipient: to,
        purpose: 'appointment_confirmation',
        body: text,
        status: 'sent',
        simulated: provider.isMock,
        provider: provider.name,
        providerMessageId: sent.id,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('confirmation email failed', { error: message });
      await record({
        channel: 'email',
        recipient: to,
        purpose: 'appointment_confirmation',
        body: text,
        status: 'failed',
        simulated: provider.isMock,
        provider: provider.name,
        error: message,
      });
    }
  } else {
    // Recorded rather than passed over. "Nobody was told, and here is why" is
    // information the owner needs when the customer does not turn up.
    await record({
      channel: 'sms',
      recipient: facts.customerPhone ?? 'none on file',
      purpose: 'appointment_confirmation',
      body: customerConfirmationSms(facts),
      status: 'skipped',
      simulated: false,
      error: smsEnv.configured
        ? 'No phone number or email address was taken on the call.'
        : 'No text provider is configured, and no email address was taken on the call.',
    });
  }

  /* ---- The business ------------------------------------------------------ */

  const summary = ownerJobSummaryEmail(facts);
  let ownerNotifiedInApp = false;
  let ownerSummaryRecipients = 0;

  // In-app first. It does not depend on an email provider, so the job appears
  // in the dashboard even when nothing can be delivered.
  try {
    await notify({
      organizationId: input.organizationId,
      kind: 'appointment_booked',
      title: `Booked: ${facts.customerName}, ${facts.whenSpoken}`,
      body: [facts.service ?? 'Visit', facts.address].filter(Boolean).join(' · '),
      link: '/dashboard/appointments',
    });
    ownerNotifiedInApp = true;
  } catch (err) {
    logger.error('in-app booking notification failed', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Then the summary itself, to whoever asked for booking emails.
  try {
    const wanted = await notificationPrefs(input.organizationId);
    if (wanted.email_appointment) {
      const provider = getEmailProvider();
      const recipients = await notifiableEmails(input.organizationId);

      if (recipients.length === 0) {
        // Recorded rather than passed over: the owner asked for booking emails
        // and is not getting one, which they would otherwise learn by missing
        // a job.
        await record({
          channel: 'email',
          recipient: 'no owner or admin with an email address',
          purpose: 'owner_job_summary',
          body: summary.text,
          status: 'skipped',
          simulated: false,
          error: 'No owner or admin on this organisation has an email address on file.',
        });
      }

      for (const to of recipients) {
        try {
          const sent = await provider.send({ to, subject: summary.subject, text: summary.text });
          ownerSummaryRecipients += 1;
          await record({
            channel: 'email',
            recipient: to,
            purpose: 'owner_job_summary',
            body: summary.text,
            status: 'sent',
            simulated: provider.isMock,
            provider: provider.name,
            providerMessageId: sent.id,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          logger.error('owner job summary failed', { error: message, recipient: to });
          await record({
            channel: 'email',
            recipient: to,
            purpose: 'owner_job_summary',
            body: summary.text,
            status: 'failed',
            simulated: provider.isMock,
            provider: provider.name,
            error: message,
          });
        }
      }
    }
  } catch (err) {
    logger.error('could not work out who to send the job summary to', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  logger.info('confirmations processed', {
    channel,
    customer_sent: customerSent,
    simulated: customerSimulated,
    owner_notified_in_app: ownerNotifiedInApp,
    owner_summary_recipients: ownerSummaryRecipients,
  });

  return {
    customerChannel: channel,
    customerSent,
    customerSimulated,
    ownerNotifiedInApp,
    ownerSummaryRecipients,
  };
}
