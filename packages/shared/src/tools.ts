/**
 * Realtime tool (function-calling) definitions exposed to the voice agent.
 *
 * SECURITY: none of these schemas accept an organization id. The organisation
 * is bound to the call session server-side when the inbound call is resolved
 * from the dialled phone number, and the voice worker attaches it to every
 * tool invocation. The model cannot address another tenant's data.
 */

import { z } from 'zod';

export interface RealtimeToolDefinition {
  readonly type: 'function';
  readonly name: string;
  readonly description: string;
  readonly parameters: Record<string, unknown>;
}

const str = (description: string) => ({ type: 'string', description });

export const REALTIME_TOOLS: readonly RealtimeToolDefinition[] = [
  {
    type: 'function',
    name: 'get_business_information',
    description:
      'Look up current approved information about the business: hours, address, services, pricing, policies. Use when the caller asks something factual you were not given up front.',
    parameters: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          enum: ['hours', 'address', 'services', 'pricing', 'policies', 'contact', 'all'],
          description: 'Which part of the business information to retrieve.',
        },
      },
      required: ['topic'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'search_business_knowledge',
    description:
      'Search this business\'s uploaded documents and knowledge base for an answer. Use for detailed or unusual questions. Returns excerpts only from this business.',
    parameters: {
      type: 'object',
      properties: {
        query: str('What to search for, in natural language.'),
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'check_service_area',
    description:
      'Check whether the business services a location. Always call this before telling a caller they are inside or outside the service area.',
    parameters: {
      type: 'object',
      properties: {
        postal_code: str('5-digit ZIP or postal code, if the caller gave one.'),
        city: str('City name, if given.'),
        state: str('Two-letter state code, if given.'),
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'create_lead',
    description:
      'Save the caller as a lead. Call this as soon as you have at least a name or a callback number — do not wait until the end of the call. Returns a lead id used by the other tools.',
    parameters: {
      type: 'object',
      properties: {
        customer_name: str('Caller full name.'),
        phone: str('Best callback number in E.164 or as spoken.'),
        email: str('Email address, if offered.'),
        address: str('Street address of the job site.'),
        city: str('City.'),
        state: str('State.'),
        postal_code: str('ZIP / postal code.'),
        requested_service: str('The service they are asking about, in the business\'s own words if possible.'),
        notes: str('Anything useful for the team: symptoms, property details, constraints.'),
        urgency: {
          type: 'string',
          enum: ['emergency', 'urgent', 'soon', 'flexible', 'unknown'],
          description: 'How quickly the caller needs help.',
        },
        is_property_owner: {
          type: 'boolean',
          description: 'Whether the caller owns the property, if you asked.',
        },
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'update_lead',
    description:
      'Update the lead you already created with new information learned later in the call.',
    parameters: {
      type: 'object',
      properties: {
        lead_id: str('The id returned by create_lead.'),
        customer_name: str('Caller full name.'),
        phone: str('Best callback number.'),
        email: str('Email address.'),
        address: str('Street address.'),
        city: str('City.'),
        state: str('State.'),
        postal_code: str('ZIP / postal code.'),
        requested_service: str('Service requested.'),
        notes: str('Additional notes to append.'),
        urgency: {
          type: 'string',
          enum: ['emergency', 'urgent', 'soon', 'flexible', 'unknown'],
        },
        is_property_owner: { type: 'boolean' },
      },
      required: ['lead_id'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'check_calendar_availability',
    description:
      'Get real bookable appointment slots. Never offer a time that did not come from this tool.',
    parameters: {
      type: 'object',
      properties: {
        requested_date: str('Date the caller asked about, as YYYY-MM-DD in the business timezone. Omit for the soonest availability.'),
        service: str('Service to be performed, so the right duration is used.'),
        duration_minutes: {
          type: 'integer',
          description: 'Override the default appointment length, in minutes.',
        },
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'book_appointment',
    description:
      'Book one of the slots returned by check_calendar_availability. Do NOT tell the caller the appointment is booked until this returns success.',
    parameters: {
      type: 'object',
      properties: {
        lead_id: str('Lead id from create_lead.'),
        start_at: str('Exact slot start in ISO-8601 with offset, copied from check_calendar_availability.'),
        duration_minutes: { type: 'integer', description: 'Slot length in minutes.' },
        customer_name: str('Name for the appointment.'),
        customer_phone: str('Contact phone.'),
        customer_email: str('Contact email, if known.'),
        service: str('Service being booked.'),
        address: str('Service address.'),
        notes: str('Notes for the technician.'),
      },
      required: ['start_at', 'customer_name'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'send_sms',
    description:
      'Send a text message to the caller. Only use for things the caller agreed to receive: confirmations, directions, links.',
    parameters: {
      type: 'object',
      properties: {
        to: str('Destination number. Defaults to the caller if omitted.'),
        body: str('Message text. Keep under 300 characters. Never include prices you were not given.'),
        lead_id: str('Lead id to attach the message to.'),
      },
      required: ['body'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'send_photo_request',
    description:
      'Text the caller a secure, expiring link where they can upload photos of the problem. Use when photos would help the team quote or prepare.',
    parameters: {
      type: 'object',
      properties: {
        lead_id: str('Lead id the photos should attach to. Required — create the lead first.'),
        to: str('Destination number. Defaults to the caller.'),
        reason: str('What the photos should show, e.g. "the damaged section of roof".'),
      },
      required: ['lead_id'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'transfer_call',
    description:
      'Transfer the caller to a human at the business. Only available when the business enabled transfers.',
    parameters: {
      type: 'object',
      properties: {
        reason: str('Why the call is being transferred. Recorded for the business.'),
      },
      required: ['reason'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'add_internal_note',
    description:
      'Attach a private note to this call and lead for the business to read later. The caller never sees it.',
    parameters: {
      type: 'object',
      properties: {
        note: str('The note text.'),
        lead_id: str('Lead id, if a lead exists.'),
      },
      required: ['note'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'end_call',
    description: 'Hang up gracefully after saying goodbye.',
    parameters: {
      type: 'object',
      properties: {
        disposition: {
          type: 'string',
          enum: [
            'lead_captured',
            'appointment_booked',
            'question_answered',
            'spam',
            'wrong_number',
            'out_of_service_area',
            'no_intent',
            'unresolved',
          ],
          description: 'How the call ended, from your point of view.',
        },
      },
      required: ['disposition'],
      additionalProperties: false,
    },
  },
];

export const TOOL_NAMES = REALTIME_TOOLS.map((t) => t.name);
export type ToolName = (typeof TOOL_NAMES)[number];

/* -------------------------------------------------------------------------- */
/* Server-side argument validation                                            */
/* -------------------------------------------------------------------------- */

const urgencyEnum = z.enum(['emergency', 'urgent', 'soon', 'flexible', 'unknown']);
const optStr = z.string().trim().max(2000).optional().nullable();

export const toolArgSchemas = {
  get_business_information: z.object({
    topic: z.enum(['hours', 'address', 'services', 'pricing', 'policies', 'contact', 'all']),
  }),
  search_business_knowledge: z.object({
    query: z.string().trim().min(1).max(500),
  }),
  check_service_area: z.object({
    postal_code: optStr,
    city: optStr,
    state: optStr,
  }),
  create_lead: z.object({
    customer_name: optStr,
    phone: optStr,
    email: optStr,
    address: optStr,
    city: optStr,
    state: optStr,
    postal_code: optStr,
    requested_service: optStr,
    notes: optStr,
    urgency: urgencyEnum.optional().nullable(),
    is_property_owner: z.boolean().optional().nullable(),
  }),
  update_lead: z.object({
    lead_id: z.string().uuid(),
    customer_name: optStr,
    phone: optStr,
    email: optStr,
    address: optStr,
    city: optStr,
    state: optStr,
    postal_code: optStr,
    requested_service: optStr,
    notes: optStr,
    urgency: urgencyEnum.optional().nullable(),
    is_property_owner: z.boolean().optional().nullable(),
  }),
  check_calendar_availability: z.object({
    requested_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'requested_date must be YYYY-MM-DD')
      .optional()
      .nullable(),
    service: optStr,
    duration_minutes: z.number().int().min(15).max(480).optional().nullable(),
  }),
  book_appointment: z.object({
    lead_id: z.string().uuid().optional().nullable(),
    start_at: z.string().min(1).max(64),
    duration_minutes: z.number().int().min(15).max(480).optional().nullable(),
    customer_name: z.string().trim().min(1).max(200),
    customer_phone: optStr,
    customer_email: optStr,
    service: optStr,
    address: optStr,
    notes: optStr,
  }),
  send_sms: z.object({
    to: optStr,
    body: z.string().trim().min(1).max(600),
    lead_id: z.string().uuid().optional().nullable(),
  }),
  send_photo_request: z.object({
    lead_id: z.string().uuid(),
    to: optStr,
    reason: optStr,
  }),
  transfer_call: z.object({
    reason: z.string().trim().min(1).max(500),
  }),
  add_internal_note: z.object({
    note: z.string().trim().min(1).max(2000),
    lead_id: z.string().uuid().optional().nullable(),
  }),
  end_call: z.object({
    disposition: z.enum([
      'lead_captured',
      'appointment_booked',
      'question_answered',
      'spam',
      'wrong_number',
      'out_of_service_area',
      'no_intent',
      'unresolved',
    ]),
  }),
} as const;

export type ToolArgs = {
  [K in keyof typeof toolArgSchemas]: z.infer<(typeof toolArgSchemas)[K]>;
};

/** Envelope every tool returns to the model. Keeps failure explicit. */
export interface ToolResult<T = unknown> {
  ok: boolean;
  data?: T;
  /** Plain-language message the model may paraphrase to the caller. */
  message?: string;
  error?: string;
}

export function toolOk<T>(data: T, message?: string): ToolResult<T> {
  return message === undefined ? { ok: true, data } : { ok: true, data, message };
}

export function toolFail(error: string, message?: string): ToolResult<never> {
  return {
    ok: false,
    error,
    message:
      message ??
      'That did not go through. Tell the caller honestly that it failed and offer to take a message or have someone call them back.',
  };
}

/**
 * Filters the tool list down to what a given organisation has enabled, so the
 * model is never offered a capability the owner switched off.
 */
export function toolsForAgent(agent: {
  transfer_enabled: boolean;
  sms_enabled: boolean;
  appointment_booking_enabled: boolean;
  photo_requests_enabled: boolean;
}): RealtimeToolDefinition[] {
  return REALTIME_TOOLS.filter((t) => {
    if (t.name === 'transfer_call') return agent.transfer_enabled;
    if (t.name === 'send_sms') return agent.sms_enabled;
    if (t.name === 'send_photo_request') return agent.sms_enabled && agent.photo_requests_enabled;
    if (t.name === 'check_calendar_availability' || t.name === 'book_appointment') {
      return agent.appointment_booking_enabled;
    }
    return true;
  });
}
