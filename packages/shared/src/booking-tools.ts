/**
 * The tools the receptionist can call while a caller is still on the phone.
 *
 * This module holds the two pure parts: the JSON schemas Vapi needs in order to
 * offer the tools to the model, and the wording used to speak a time out loud.
 * Everything that touches the schedule lives on the server, because the model
 * must never be the thing that decides whether a slot is free.
 *
 * The whole design turns on one rule: the assistant may only book a time this
 * server has just offered it. It receives opaque slot identifiers, not freedom
 * to name a time, and the server re-derives availability before writing. A
 * model that hallucinates "how about Tuesday at three" cannot turn that into an
 * appointment, because Tuesday at three will not be in the offered set.
 */

/** Names of the tools, used by both the definition and the dispatcher. */
export const BOOKING_TOOL_NAMES = {
  checkAvailability: 'check_availability',
  bookAppointment: 'book_appointment',
} as const;

/**
 * Vapi function-tool definitions.
 *
 * `async: false` matters — the model waits for the real answer instead of
 * carrying on and improvising one.
 */
export function bookingToolDefinitions(input: {
  serverUrl: string;
  serverSecret: string;
  /** Offered so the model can name one; empty when the business has none. */
  serviceNames: string[];
}): Array<Record<string, unknown>> {
  const server = { url: input.serverUrl, secret: input.serverSecret };

  return [
    {
      type: 'function',
      async: false,
      server,
      function: {
        name: BOOKING_TOOL_NAMES.checkAvailability,
        description:
          'Find real appointment times this business can actually keep. Call this before mentioning any time to the caller. Never state a time that did not come back from this tool.',
        parameters: {
          type: 'object',
          properties: {
            service: {
              type: 'string',
              description: input.serviceNames.length
                ? `The service the caller needs, if known. One of: ${input.serviceNames.join(', ')}.`
                : 'The service the caller needs, if known.',
            },
            preferred_timing: {
              type: 'string',
              description:
                'What the caller said about when they want it, in their own words — for example "tomorrow morning", "as soon as possible", "next Tuesday". Leave empty if they have not said.',
            },
          },
          required: [],
        },
      },
    },
    {
      type: 'function',
      async: false,
      server,
      function: {
        name: BOOKING_TOOL_NAMES.bookAppointment,
        description:
          'Book one of the times that check_availability just offered. Only use a slot_id returned by that tool in this same call. Confirm the details with the caller before using this.',
        parameters: {
          type: 'object',
          properties: {
            slot_id: {
              type: 'string',
              description:
                'The exact slot_id from check_availability. Never invent one and never modify one.',
            },
            customer_name: { type: 'string', description: "The caller's full name." },
            customer_phone: {
              type: 'string',
              description: 'The best callback number, digits only where possible.',
            },
            address: { type: 'string', description: 'The service address for the visit.' },
            service: { type: 'string', description: 'What the work is.' },
            notes: {
              type: 'string',
              description: 'Anything the person doing the job needs to know before arriving.',
            },
          },
          required: ['slot_id', 'customer_name'],
        },
      },
    },
  ];
}

/* -------------------------------------------------------------------------- */
/* Why a requested time cannot be booked                                      */
/* -------------------------------------------------------------------------- */

export type UnbookableReason = 'not_a_time' | 'in_the_past' | 'beyond_horizon' | 'taken' | 'not_offered';

/**
 * Which of the several different things "that time is unavailable" can mean.
 *
 * They were all reported as "that time is no longer free", which is only true
 * for one of them. Told that, a receptionist says "sorry, someone just took
 * that" — inventing a history for a time the model made up, and teaching the
 * caller that the business is busier than it is. The distinction between "you
 * asked for something I never offered" and "that has genuinely just gone" is
 * the difference between a truthful sentence and a plausible one.
 */
export function classifyUnbookable(input: {
  slotId: string;
  nowISO: string;
  horizonDays: number;
  /** Whether an appointment already occupies that time. */
  alreadyBooked: boolean;
}): UnbookableReason {
  const requested = new Date(input.slotId).getTime();
  if (!Number.isFinite(requested)) return 'not_a_time';

  const now = new Date(input.nowISO).getTime();
  if (requested < now) return 'in_the_past';
  if (requested > now + input.horizonDays * 86_400_000) return 'beyond_horizon';

  return input.alreadyBooked ? 'taken' : 'not_offered';
}

/** What the receptionist should say, for each of those. */
export function unbookableSentence(reason: UnbookableReason): string {
  switch (reason) {
    case 'not_a_time':
      return 'That was not a time I offered, and nothing was booked.';
    case 'in_the_past':
      return 'That time has already passed, so nothing was booked.';
    case 'beyond_horizon':
      return 'That is further ahead than this business takes bookings, so nothing was booked.';
    case 'taken':
      return 'That time was taken while we were talking, and nothing was booked.';
    case 'not_offered':
      return 'That time is not one this business can take, and nothing was booked.';
  }
}

/* -------------------------------------------------------------------------- */
/* Saying a time out loud                                                     */
/* -------------------------------------------------------------------------- */

/**
 * How a time should be read to a caller.
 *
 * Returned as a finished phrase rather than parts, so the model has nothing to
 * assemble and therefore nothing to get wrong. "Tuesday the 25th of August at
 * 2:00 PM" is unambiguous over a phone line in a way "25/08 14:00" is not.
 */
export function describeSlotForSpeech(startISO: string, timeZone: string, nowISO?: string): string {
  const start = new Date(startISO);
  if (Number.isNaN(start.getTime())) return '';

  const day = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(start);

  const time = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(start);

  const relative = nowISO ? relativeDayWord(startISO, nowISO, timeZone) : null;
  return relative ? `${relative} at ${time}` : `${day} at ${time}`;
}

/**
 * "today" and "tomorrow" instead of the date, when that is what a person would
 * say. Anything further out keeps the weekday and date: "Thursday" alone is
 * ambiguous once it is more than a week away.
 */
function relativeDayWord(startISO: string, nowISO: string, timeZone: string): string | null {
  const key = (iso: string) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(iso));

  const target = key(startISO);
  const today = key(nowISO);
  if (target === today) return 'today';

  const tomorrow = key(new Date(new Date(nowISO).getTime() + 86_400_000).toISOString());
  if (target === tomorrow) return 'tomorrow';

  return null;
}

/**
 * The sentence the model reads when offering times.
 *
 * Deliberately assembled here rather than left to the model: the difference
 * between "I can do Tuesday at two" and "we might be able to do Tuesday" is the
 * difference between a kept promise and a missed appointment.
 */
export function describeOffer(
  slots: Array<{ startISO: string }>,
  timeZone: string,
  nowISO: string,
): string {
  const phrases = slots.map((s) => describeSlotForSpeech(s.startISO, timeZone, nowISO));
  if (phrases.length === 0) return '';
  if (phrases.length === 1) return phrases[0]!;
  if (phrases.length === 2) return `${phrases[0]} or ${phrases[1]}`;
  return `${phrases.slice(0, -1).join(', ')}, or ${phrases[phrases.length - 1]}`;
}
