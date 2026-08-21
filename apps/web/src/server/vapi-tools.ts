import 'server-only';
import {
  BOOKING_TOOL_NAMES,
  describeOffer,
  describeSlotForSpeech,
  spreadSlots,
  normalizePhone,
} from '@afd/shared';
import { findAvailableSlots, bookAppointment } from '@/server/booking';
import { getServiceSupabase } from '@/lib/supabase/server';
import { AppError } from '@/lib/errors';
import { childLogger } from '@/lib/logger';

/**
 * Running a tool the receptionist called mid-conversation.
 *
 * Three rules hold this together, and all three exist because the model is the
 * least trustworthy participant in the exchange:
 *
 *  1. The organisation comes from the assistant id in the secret-verified
 *     webhook. Nothing in the tool arguments can change which tenant is
 *     touched, so a caller cannot talk their way into another business's diary.
 *
 *  2. A time may only be booked if this server offered it moments earlier.
 *     Availability is re-derived on the way in, and a `slot_id` that is not in
 *     the current set is refused. A hallucinated time cannot become a booking.
 *
 *  3. Every reply is a sentence to read aloud. When something cannot be done,
 *     the reply says so plainly and says what to do instead — because the model
 *     will read whatever it is given, and a vague failure becomes an invented
 *     recovery.
 */

export interface ToolCallResult {
  /** Returned to Vapi and read by the model. */
  result: string;
}

/** How many options to offer. Three is what a person can hold in their head. */
const OFFER_COUNT = 3;

export async function runBookingTool(input: {
  organizationId: string;
  vapiCallId: string;
  name: string;
  args: Record<string, unknown>;
}): Promise<ToolCallResult> {
  const logger = childLogger({
    organization_id: input.organizationId,
    event: 'vapi.tool',
    tool: input.name,
  });

  try {
    switch (input.name) {
      case BOOKING_TOOL_NAMES.checkAvailability:
        return await checkAvailability(input);
      case BOOKING_TOOL_NAMES.bookAppointment:
        return await book(input);
      default:
        logger.warn('unknown tool requested', { tool: input.name });
        return {
          result: `There is no tool called ${input.name}. Tell the caller you will take their details and the team will confirm.`,
        };
    }
  } catch (err) {
    // A thrown error would be returned to Vapi as a failure the model has to
    // interpret. Give it a sentence instead, so the caller hears something
    // truthful rather than whatever the model decides an error means.
    const message = err instanceof AppError ? err.message : 'That could not be completed.';
    logger.error('tool call failed', { error: err instanceof Error ? err.message : String(err) });
    return {
      result: `${message} Do not offer a time. Take the caller's details and tell them the team will confirm.`,
    };
  }
}

/* -------------------------------------------------------------------------- */

async function checkAvailability(input: {
  organizationId: string;
  args: Record<string, unknown>;
}): Promise<ToolCallResult> {
  const requestedService = str(input.args.service);

  const serviceId = requestedService
    ? await matchServiceId(input.organizationId, requestedService)
    : null;

  const availability = await findAvailableSlots({
    organizationId: input.organizationId,
    serviceId,
    fromISO: new Date().toISOString(),
    limit: 200,
  });

  if (availability.slots.length === 0) {
    // Say why. "Nothing is available" invites the model to try again with a
    // different phrasing; a reason tells it to stop asking.
    return {
      result: `There are no bookable times. ${availability.emptyReason ?? ''} Do not offer any time. Take the caller's name, number, address and what they need, and tell them the team will call to arrange it.`.trim(),
    };
  }

  const offered = spreadSlots(availability.slots, OFFER_COUNT, availability.timezone);
  const nowISO = new Date().toISOString();

  const lines = offered.map((slot) => ({
    slot_id: slot.startISO,
    spoken: describeSlotForSpeech(slot.startISO, availability.timezone, nowISO),
  }));

  return {
    result: [
      `These times are free and can be kept: ${describeOffer(offered, availability.timezone, nowISO)}.`,
      `Each visit is ${availability.durationMinutes} minutes.`,
      'Offer these to the caller in your own words. When they choose one, call book_appointment with the matching slot_id exactly as written here.',
      JSON.stringify({ slots: lines }),
    ].join(' '),
  };
}

/* -------------------------------------------------------------------------- */

async function book(input: {
  organizationId: string;
  vapiCallId: string;
  args: Record<string, unknown>;
}): Promise<ToolCallResult> {
  const slotId = str(input.args.slot_id);
  const customerName = str(input.args.customer_name);

  if (!slotId) {
    return {
      result:
        'No slot_id was given, so nothing was booked. Call check_availability first and use one of the slot_id values it returns.',
    };
  }
  if (!customerName) {
    return { result: 'Ask the caller for their name, then call book_appointment again. Nothing was booked.' };
  }

  const requestedService = str(input.args.service);
  const serviceId = requestedService
    ? await matchServiceId(input.organizationId, requestedService)
    : null;

  // Re-derive. This is the check that makes an invented time impossible: the
  // slot has to still be on the list this server would offer right now, not
  // merely have been on it when the sentence started.
  const availability = await findAvailableSlots({
    organizationId: input.organizationId,
    serviceId,
    fromISO: new Date().toISOString(),
    limit: 500,
  });

  const slot = availability.slots.find((s) => s.startISO === slotId);
  if (!slot) {
    const alternatives = spreadSlots(availability.slots, OFFER_COUNT, availability.timezone);
    const nowISO = new Date().toISOString();
    return {
      result: alternatives.length
        ? `That time is no longer free and nothing was booked. Offer these instead: ${describeOffer(alternatives, availability.timezone, nowISO)}. ${JSON.stringify({ slots: alternatives.map((s) => ({ slot_id: s.startISO, spoken: describeSlotForSpeech(s.startISO, availability.timezone, nowISO) })) })}`
        : 'That time is no longer free and nothing was booked. Do not offer another time. Take the caller\'s details and tell them the team will call to arrange it.',
    };
  }

  const employeeId = slot.employeeIds[0];
  if (!employeeId) {
    return {
      result:
        'Nobody is free for that time after all, so nothing was booked. Take the caller\'s details and tell them the team will confirm.',
    };
  }

  const booking = await bookAppointment({
    organizationId: input.organizationId,
    employeeId,
    startISO: slot.startISO,
    endISO: slot.endISO,
    customerName,
    customerPhone: normalizePhone(str(input.args.customer_phone)) ?? null,
    address: str(input.args.address) ?? null,
    service: requestedService ?? null,
    notes: str(input.args.notes) ?? null,
    vapiCallId: input.vapiCallId,
    source: 'ai_call',
  });

  const spoken = describeSlotForSpeech(
    slot.startISO,
    availability.timezone,
    new Date().toISOString(),
  );

  return {
    result: `Booked. ${customerName} is confirmed for ${spoken}. Tell the caller it is booked, read the day and time back to them, and say they will get a confirmation. Reference ${booking.appointmentId.slice(0, 8)}.`,
  };
}

/* -------------------------------------------------------------------------- */

/**
 * Matches what the caller said to a service the business actually offers.
 *
 * Returns null when nothing matches, which the booking engine treats as "any
 * service" rather than refusing — a caller describing a job in their own words
 * should not narrow the diary to nothing.
 */
async function matchServiceId(organizationId: string, spoken: string): Promise<string | null> {
  const svc = getServiceSupabase();
  const { data } = await svc
    .from('services')
    .select('id, name')
    .eq('organization_id', organizationId)
    .eq('active', true);

  if (!data?.length) return null;

  const needle = spoken.trim().toLowerCase();
  const exact = data.find((s) => String(s.name).toLowerCase() === needle);
  if (exact) return exact.id as string;

  const partial = data.find(
    (s) =>
      String(s.name).toLowerCase().includes(needle) || needle.includes(String(s.name).toLowerCase()),
  );
  return partial ? (partial.id as string) : null;
}

/** Tool arguments arrive as whatever the model produced. */
function str(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}
