/**
 * What the customer and the owner are told after a booking.
 *
 * Pure text assembly, kept out of the sending path so the words a real customer
 * receives can be tested exactly. A confirmation is the only written record the
 * caller gets — if it names the wrong day, nobody finds out until the van
 * arrives at an empty house.
 */

export type ConfirmationChannel = 'sms' | 'email' | 'none';

export interface BookingFacts {
  businessName: string;
  /** Already rendered in the business's timezone. */
  whenSpoken: string;
  customerName: string;
  service: string | null;
  address: string | null;
  /** Who is going, when the business tracks that. */
  employeeName: string | null;
  businessPhone: string | null;
  notes: string | null;
  durationMinutes: number;
}

/**
 * Which channel a confirmation can actually go out on.
 *
 * Decided from what is configured and what the caller gave us, never from what
 * would be nice. `none` is a real answer and the caller must act on it rather
 * than smoothing it over.
 */
export function confirmationChannel(input: {
  smsConfigured: boolean;
  customerPhone: string | null;
  customerEmail: string | null;
}): ConfirmationChannel {
  if (input.smsConfigured && input.customerPhone) return 'sms';
  if (input.customerEmail) return 'email';
  return 'none';
}

/**
 * What the receptionist may say about the confirmation, on the call.
 *
 * This exists because the first version of the booking tool told the model to
 * "say they will get a confirmation" unconditionally, while nothing sent one.
 * A promise made in a voice, to a person, about something that will not happen
 * is the worst kind of defect this product can ship — the caller has no way to
 * discover it until they are waiting.
 */
export function confirmationPromise(channel: ConfirmationChannel): string {
  switch (channel) {
    case 'sms':
      return 'Tell them a text message confirming it is on its way.';
    case 'email':
      return 'Tell them a confirmation email is on its way.';
    case 'none':
      return 'Do not promise any confirmation message — none will be sent. Read the day and time back to them clearly instead, so they have it.';
  }
}

/**
 * The text message.
 *
 * Kept under a single segment's worth of characters where possible: a long SMS
 * is split by the carrier and can arrive out of order, which for a confirmation
 * means the time and the date landing separately.
 */
export function customerConfirmationSms(facts: BookingFacts): string {
  const parts = [`${facts.businessName}: your appointment is confirmed for ${facts.whenSpoken}.`];
  if (facts.service) parts.push(`For: ${facts.service}.`);
  if (facts.address) parts.push(`At: ${facts.address}.`);
  if (facts.businessPhone) parts.push(`Questions: ${facts.businessPhone}`);
  return parts.join(' ');
}

export function customerConfirmationEmail(facts: BookingFacts): { subject: string; text: string } {
  const lines = [
    `Hello ${facts.customerName},`,
    '',
    `Your appointment with ${facts.businessName} is confirmed for ${facts.whenSpoken}.`,
    '',
  ];
  if (facts.service) lines.push(`What we are doing: ${facts.service}`);
  if (facts.address) lines.push(`Where: ${facts.address}`);
  lines.push(`How long we expect it to take: ${describeDuration(facts.durationMinutes)}`);
  if (facts.businessPhone) {
    lines.push('', `If you need to change it, call ${facts.businessPhone}.`);
  } else {
    // Never invent a way to reach the business. Silence is better than a number
    // that rings nowhere.
    lines.push('', 'If you need to change it, reply to this message.');
  }
  lines.push('', `— ${facts.businessName}`);

  return {
    subject: `Confirmed: ${facts.whenSpoken} with ${facts.businessName}`,
    text: lines.join('\n'),
  };
}

/**
 * The job summary the owner gets.
 *
 * Written so that reading it is enough — the whole point of the product is that
 * the owner does almost nothing after the call, and that fails if the summary
 * sends them back to a transcript to find the address.
 */
export function ownerJobSummaryEmail(
  facts: BookingFacts & { customerPhone: string | null },
): { subject: string; text: string } {
  const lines = [
    `${facts.customerName} booked ${facts.service ?? 'a visit'} for ${facts.whenSpoken}.`,
    '',
    'THE JOB',
    `  What: ${facts.service ?? 'Not stated on the call'}`,
    `  When: ${facts.whenSpoken} (${describeDuration(facts.durationMinutes)})`,
    `  Where: ${facts.address ?? 'No address given on the call'}`,
    `  Who is going: ${facts.employeeName ?? 'Not assigned'}`,
    '',
    'THE CUSTOMER',
    `  Name: ${facts.customerName}`,
    `  Phone: ${facts.customerPhone ?? 'Not given'}`,
  ];

  if (facts.notes) lines.push('', 'NOTES FROM THE CALL', `  ${facts.notes}`);

  // Named explicitly. An owner who does not know which gaps exist will assume
  // the receptionist collected everything and turn up unable to do the job.
  const missing: string[] = [];
  if (!facts.address) missing.push('the address');
  if (!facts.customerPhone) missing.push('a phone number');
  if (!facts.service) missing.push('what the work is');
  if (missing.length) {
    lines.push('', `STILL NEEDED: ${missing.join(', ')}. The caller did not give this.`);
  }

  return {
    subject: `Booked: ${facts.customerName}, ${facts.whenSpoken}`,
    text: lines.join('\n'),
  };
}

function describeDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const hourPart = `${hours} hour${hours === 1 ? '' : 's'}`;
  return rest ? `${hourPart} ${rest} minutes` : hourPart;
}
