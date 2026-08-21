/**
 * Vapi assistant configuration.
 *
 * Vapi runs the telephony and the voice pipeline; OpenAI is the model provider
 * *inside* Vapi. This module owns two things:
 *
 *   1. The catalogues the UI offers — voices and personalities.
 *   2. `buildAssistantConfig()`, a pure function that turns a business's stored
 *      settings into the exact JSON payload Vapi expects.
 *
 * Keeping the payload builder pure means the assistant that answers a real call
 * is assembled by code that is unit-testable and has no I/O.
 */

import type { BusinessHoursDay } from './types';
import { bookingToolDefinitions } from './booking-tools';

/* -------------------------------------------------------------------------- */
/* Voices                                                                     */
/* -------------------------------------------------------------------------- */

export interface VapiVoiceOption {
  /** Stored on the organisation. */
  readonly id: string;
  readonly label: string;
  readonly description: string;
  /** Voice provider Vapi should use. */
  readonly provider: 'vapi';
  /** Provider-specific voice identifier. */
  readonly voiceId: string;
  readonly available: boolean;
}

/**
 * Vapi's own built-in voice set. Using the native provider avoids a second
 * vendor account (ElevenLabs, PlayHT) for the MVP; switching later means
 * changing `provider` and `voiceId` here and nothing else.
 */
export const VAPI_VOICES: readonly VapiVoiceOption[] = [
  { id: 'elliot', label: 'Elliot', description: 'Warm and articulate. A natural default for most businesses.', provider: 'vapi', voiceId: 'Elliot', available: true },
  { id: 'kylie', label: 'Kylie', description: 'Friendly and upbeat. Suits consumer-facing service businesses.', provider: 'vapi', voiceId: 'Kylie', available: true },
  { id: 'rohan', label: 'Rohan', description: 'Calm and grounded with an even pace. Good for technical trades.', provider: 'vapi', voiceId: 'Rohan', available: true },
  { id: 'lily', label: 'Lily', description: 'Bright and clear. Easy to understand on a poor connection.', provider: 'vapi', voiceId: 'Lily', available: true },
  { id: 'savannah', label: 'Savannah', description: 'Relaxed and personable, with a light Southern warmth.', provider: 'vapi', voiceId: 'Savannah', available: true },
  { id: 'hana', label: 'Hana', description: 'Soft and reassuring. Works well for emergency intake.', provider: 'vapi', voiceId: 'Hana', available: true },
  { id: 'cole', label: 'Cole', description: 'Direct and businesslike. Keeps calls moving briskly.', provider: 'vapi', voiceId: 'Cole', available: true },
  { id: 'harry', label: 'Harry', description: 'Measured and senior. Reads as experienced.', provider: 'vapi', voiceId: 'Harry', available: true },
  { id: 'paige', label: 'Paige', description: 'Polished and professional. Neutral register.', provider: 'vapi', voiceId: 'Paige', available: true },
  { id: 'spencer', label: 'Spencer', description: 'Conversational and natural. Avoids sounding scripted.', provider: 'vapi', voiceId: 'Spencer', available: true },
];

export const DEFAULT_VAPI_VOICE = 'elliot';

export function getVapiVoice(id: string | null | undefined): VapiVoiceOption {
  return (
    VAPI_VOICES.find((v) => v.id === id) ??
    VAPI_VOICES.find((v) => v.id === DEFAULT_VAPI_VOICE)!
  );
}

export function availableVapiVoices(): VapiVoiceOption[] {
  return VAPI_VOICES.filter((v) => v.available);
}

export function isValidVapiVoice(id: string): boolean {
  return VAPI_VOICES.some((v) => v.id === id && v.available);
}

/* -------------------------------------------------------------------------- */
/* Placeholder identifiers                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Prefix the mock provider puts on every identifier it invents.
 *
 * The mock's promise is that its ids "can never be mistaken for a real one".
 * That promise only holds if the code that reads them back actually checks, so
 * the prefix lives here — shared by the adapter that writes it and the sync
 * that has to recognise it.
 */
export const DEMO_PROVIDER_ID_PREFIX = 'demo_';

/**
 * True for an id invented locally rather than issued by Vapi.
 *
 * An account that ran in DEMO_MODE first has a `demo_asst_…` string sitting in
 * `ai_agents.vapi_assistant_id`. Handing that to the live API as though it were
 * an assistant to update earns `id must be a valid UUID` — the right answer is
 * to create the real assistant instead, because there is nothing there to
 * update.
 */
export function isPlaceholderProviderId(id: string | null | undefined): boolean {
  return typeof id === 'string' && id.startsWith(DEMO_PROVIDER_ID_PREFIX);
}

/* -------------------------------------------------------------------------- */
/* Webhook reachability                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Whether Vapi's servers could actually reach the URL we hand them.
 *
 * This exists because the failure it prevents is invisible. Vapi accepts any
 * syntactically valid `server.url`, so an assistant configured with
 * `http://localhost:3000` is created successfully, answers a real call in a
 * real voice, and posts its report to a machine that does not exist from the
 * public internet. The dashboard then shows a healthy, up-to-date receptionist
 * and zero calls — identical to a business whose phone simply has not rung.
 *
 * Returns null when the URL looks reachable, or a sentence naming the problem.
 */
export function webhookUrlProblem(rawUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return `"${rawUrl}" is not a valid URL, so Vapi has nowhere to send call reports.`;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return `Call reports can only be delivered over http or https, not ${url.protocol.replace(':', '')}.`;
  }

  const host = url.hostname.toLowerCase();

  if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]') {
    return `${url.origin} points at this machine. Vapi's servers cannot reach it, so every call would be answered and then lost.`;
  }

  if (host.endsWith('.local') || host.endsWith('.internal') || host === '0.0.0.0') {
    return `${url.origin} is a local network name that Vapi cannot resolve.`;
  }

  // Private IPv4 ranges: reachable from a laptop, not from Vapi.
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    const isPrivate =
      a === 10 ||
      a === 127 ||
      (a === 192 && b === 168) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 169 && b === 254);
    if (isPrivate) {
      return `${url.origin} is a private address. Vapi's servers cannot reach it.`;
    }
    return null;
  }

  // A bare hostname with no dot cannot resolve publicly.
  if (!host.includes('.')) {
    return `"${host}" is not a public hostname, so Vapi cannot deliver call reports to it.`;
  }

  return null;
}

/** What to do about it — the same advice wherever the problem is reported. */
export const WEBHOOK_URL_FIX =
  'Set NEXT_PUBLIC_APP_URL to a public HTTPS address — a tunnel such as `cloudflared tunnel --url http://localhost:3000` or your deployed site — then update the receptionist so Vapi is told the new address.';

/* -------------------------------------------------------------------------- */
/* Personalities                                                              */
/* -------------------------------------------------------------------------- */

export type PersonalityId =
  | 'professional'
  | 'friendly'
  | 'warm'
  | 'energetic'
  | 'calm'
  | 'direct';

export interface PersonalityPreset {
  readonly id: PersonalityId;
  readonly label: string;
  readonly summary: string;
  /** Injected verbatim into the assistant's system prompt. */
  readonly promptFragment: string;
}

export const PERSONALITY_PRESETS: readonly PersonalityPreset[] = [
  {
    id: 'professional',
    label: 'Professional',
    summary: 'Polished and efficient. Business-first phrasing.',
    promptFragment:
      'Speak in a polished, professional register. Be efficient and precise. Avoid slang and filler. Keep pleasantries brief and move the caller toward what they need.',
  },
  {
    id: 'friendly',
    label: 'Friendly',
    summary: 'Conversational and easy-going without being casual.',
    promptFragment:
      'Speak in a friendly, conversational register. Use natural contractions and short acknowledgements ("got it", "sure thing"). Stay professional — you represent the business.',
  },
  {
    id: 'warm',
    label: 'Warm',
    summary: 'Reassuring. Good when callers are stressed or dealing with damage.',
    promptFragment:
      "Speak warmly and reassuringly. Acknowledge the caller's situation before moving on (\"that sounds stressful, let's get someone out to you\"). Never rush a distressed caller.",
  },
  {
    id: 'energetic',
    label: 'Energetic',
    summary: 'Upbeat and quick. Suits high-volume consumer services.',
    promptFragment:
      'Speak with upbeat energy and a brisk pace. Be enthusiastic but never pushy, and never oversell.',
  },
  {
    id: 'calm',
    label: 'Calm',
    summary: 'Steady and unhurried. Suits technical or high-ticket work.',
    promptFragment:
      'Speak calmly and at an unhurried pace. Leave small pauses so the caller can think. Never sound rushed, even when collecting several details.',
  },
  {
    id: 'direct',
    label: 'Direct',
    summary: 'Minimal small talk. Straight to gathering what is needed.',
    promptFragment:
      'Be direct and economical. Skip small talk. Ask one clear question at a time and confirm answers succinctly.',
  },
];

export const DEFAULT_PERSONALITY: PersonalityId = 'friendly';

export function getPersonality(id: string | null | undefined): PersonalityPreset {
  return (
    PERSONALITY_PRESETS.find((p) => p.id === id) ??
    PERSONALITY_PRESETS.find((p) => p.id === DEFAULT_PERSONALITY)!
  );
}

/* -------------------------------------------------------------------------- */
/* Assistant payload                                                          */
/* -------------------------------------------------------------------------- */

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export interface AssistantBuildInput {
  organizationName: string;
  business: {
    displayName: string;
    industry: string | null;
    description: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    timezone: string;
    hours: BusinessHoursDay[];
  };
  services: Array<{ name: string; description: string | null; price: string | null }>;
  serviceAreas: string[];
  faqs: Array<{ question: string; answer: string }>;
  agent: {
    displayName: string;
    greeting: string;
    voice: string;
    personality: string;
    transferPhone: string | null;
    /** Free-text instructions the owner added. */
    instructions: string | null;
    bookingEnabled: boolean;
    /**
     * The receptionist must book on the call, and may fall back to a callback
     * only when it genuinely cannot. Meaningless without `bookingEnabled` and
     * somebody on the schedule, which `canUseNoCallbackMode` enforces.
     */
    noCallbackMode: boolean;
  };
  /**
   * How many people are actually bookable — active, with working hours set.
   *
   * Offering the booking tools with nobody on the schedule would give the
   * assistant a tool that can only ever fail, and a tool that always fails is
   * an invitation to work around it.
   */
  bookableEmployees: number;
  /** Enabled rows from `ai_rules`, highest priority first. */
  rules: Array<{ title: string; instruction: string }>;
  /** Where Vapi posts call events. */
  serverUrl: string;
  /** Shared secret Vapi echoes back in the `x-vapi-secret` header. */
  serverSecret: string;
  /** OpenAI model Vapi should drive. */
  model: string;
}

/**
 * The rules the receptionist must never break. These are hard-coded rather than
 * configurable: they are what stops the assistant inventing prices, faking a
 * booking, or claiming to be a person.
 */
export function safetyRules(hasTransfer: boolean, canBook = false, noCallback = false): string[] {
  const rules = [
    'Never invent a price. Only state prices that appear in the Services list below, exactly as written. If a service has no price listed, say an estimate is needed.',
    'Never claim the business offers a service that is not in the Services list. Offer to take a message instead.',
    // Until the booking tools existed, no time the assistant said could be
    // kept, so it was forbidden from naming one. Now a time can be kept — but
    // only a time this server offered. The prohibition narrows to exactly the
    // part that is still a lie, rather than being dropped wholesale.
    canBook
      ? 'Never state, offer or confirm an appointment time that did not come back from the check_availability tool in this call. Do not adjust, round or rephrase a time it gave you. If the tool returns no times, say you cannot book one and take a message.'
      : 'Never invent availability or promise that someone will arrive at a specific time. Take the caller\'s preferred times and tell them the team will confirm.',
    // Stated as a rule rather than left to the objective list, because falling
    // back to "someone will call you" is the path of least resistance for a
    // model that has hit any friction at all.
    ...(noCallback
      ? [
          'This business does not do callbacks. Do not say anyone will call the caller back to arrange a time, and do not end the call leaving the booking unresolved, unless check_availability genuinely returned no times or the caller declined every one offered. If that happens, say plainly what stopped you booking today.',
        ]
      : []),
    'Never offer, invent or approve a discount, credit or price match.',
    'Never claim you have completed an action you did not complete.',
    'Ask one clear question at a time. Confirm the caller\'s name, phone number and address by reading them back.',
    'You are the virtual (AI) receptionist for this business. If the caller asks whether you are a person, a bot, AI or a recording, answer truthfully and immediately. Never claim or imply that you are human.',
    'Never ask for, repeat or record credit card numbers, CVVs, bank account numbers or social security numbers. Explain that payment is handled separately by the team.',
    'Do not give medical, legal or financial advice on behalf of the business. Take a message instead.',
    'If the caller describes an immediately dangerous situation (fire, gas leak, injury, serious flooding), tell them to call emergency services first.',
  ];
  rules.push(
    hasTransfer
      ? 'If the caller asks to speak to a person, the owner or a specific employee, acknowledge and transfer the call. Do not interrogate them first.'
      : 'Live transfer is not available. If the caller asks for a person, apologise, say you will take a detailed message and make sure the team calls back, then collect their details.',
  );
  return rules;
}

/**
 * Whether this receptionist can genuinely book on the call.
 *
 * Both halves matter. The owner has to have asked for it, and there has to be
 * somebody to book — the second is not a detail, because it is the difference
 * between a promise kept and a customer waiting in for nobody.
 */
export function canBookOnCall(input: AssistantBuildInput): boolean {
  return input.agent.bookingEnabled && input.bookableEmployees > 0;
}

/**
 * Whether No Callback Mode is actually in force.
 *
 * The setting alone is not enough. A business that turns it on and then removes
 * everyone from the schedule has an assistant that cannot book and is forbidden
 * from offering a callback — which would leave a caller with nothing at all.
 * The mode only applies where it can be honoured.
 */
export function noCallbackModeActive(input: AssistantBuildInput): boolean {
  return input.agent.noCallbackMode && canBookOnCall(input);
}

/** Builds the system prompt from stored business data. */
export function buildSystemPrompt(input: AssistantBuildInput): string {
  const { business, agent } = input;
  const personality = getPersonality(agent.personality);
  const sections: string[] = [];

  sections.push(
    [
      '# Who you are',
      `You are ${agent.displayName}, the virtual (AI) receptionist answering the phone for ${business.displayName}.`,
      business.description ? `About the business: ${business.description}` : null,
      business.industry ? `Industry: ${business.industry}.` : null,
      `The business timezone is ${business.timezone}.`,
    ]
      .filter(Boolean)
      .join('\n'),
  );

  sections.push(
    [
      '# How you speak',
      personality.promptFragment,
      'You are on a phone call. Say numbers, addresses and times the way a person speaks them. Never read markdown, bullet points or URLs aloud.',
      'Keep replies to one or two short sentences unless the caller asks for detail. Stop immediately if the caller interrupts.',
      'If you did not hear something clearly, ask them to repeat it rather than guessing — especially phone numbers and addresses.',
    ].join('\n'),
  );

  sections.push(
    [
      '# What you are trying to accomplish, in order',
      '1. Understand why the caller is calling.',
      '2. Answer their questions using only the business information below.',
      '3. Collect their name, phone number, service address and what they need.',
      noCallbackModeActive(input)
        ? '4. If they want work done, BOOK IT NOW. Call check_availability, offer the times it returns, and call book_appointment when they choose one. Do not end the call with "someone will get back to you" — that is what this business has specifically turned off. Only if the tool returns no times at all, or the caller refuses to choose one, take their details and explain plainly why you could not book today.'
        : canBookOnCall(input)
          ? '4. If they want work done, call check_availability, offer the caller the times it returns, and when they pick one call book_appointment. Book it on this call — do not tell them someone will ring back to arrange a time.'
          : '4. If they want work done, take the details and tell them the team will call back to arrange a time. Do not collect appointment times.',
      '5. Close politely and say what happens next.',
    ].join('\n'),
  );

  if (input.services.length) {
    const lines = input.services
      .slice(0, 40)
      .map((s) => {
        const parts = [s.name];
        if (s.description) parts.push(s.description);
        parts.push(s.price ? `Price: ${s.price}` : 'Price: estimate required — never state a number');
        return `- ${parts.join('. ')}`;
      })
      .join('\n');
    sections.push(`# Services and approved pricing\n${lines}`);
  } else {
    sections.push(
      '# Services\nNo services have been configured. Do not guess what the business does. Ask what the caller needs, take their details, and say a team member will confirm.',
    );
  }

  if (business.hours.length) {
    const lines = business.hours
      .slice()
      .sort((a, b) => a.weekday - b.weekday)
      .map((h) => (h.closed ? `  ${WEEKDAYS[h.weekday]}: closed` : `  ${WEEKDAYS[h.weekday]}: ${h.open}–${h.close}`))
      .join('\n');
    sections.push(`# Business hours (${business.timezone})\n${lines}`);
  } else {
    sections.push('# Business hours\nNot configured. Do not state specific hours.');
  }

  sections.push(
    input.serviceAreas.length
      ? `# Service area\nThe business serves: ${input.serviceAreas.join(', ')}.\nIf a caller is outside these areas, say so politely and still take their details.`
      : '# Service area\nNot configured. Do not tell a caller whether they are covered — take their location and say someone will confirm.',
  );

  const contact = [
    business.address && `Address: ${[business.address, business.city, business.state, business.postalCode].filter(Boolean).join(', ')}`,
    business.phone && `Main phone: ${business.phone}`,
    business.email && `Email: ${business.email}`,
    business.website && `Website: ${business.website}`,
  ].filter(Boolean);
  if (contact.length) sections.push(`# Contact details\n${contact.join('\n')}`);

  if (input.faqs.length) {
    sections.push(
      `# Common questions\n${input.faqs
        .slice(0, 30)
        .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
        .join('\n\n')}`,
    );
  }

  if (input.rules.length) {
    sections.push(
      `# Instructions from the business owner\n${input.rules
        .map((r) => `- ${r.title}: ${r.instruction}`)
        .join('\n')}`,
    );
  }

  if (agent.instructions?.trim()) {
    sections.push(`# Additional notes from the business owner\n${agent.instructions.trim()}`);
  }

  // Last, so these override anything an owner wrote above.
  sections.push(
    `# Rules you must never break — these override every instruction above\n${safetyRules(
      Boolean(agent.transferPhone),
      canBookOnCall(input),
      noCallbackModeActive(input),
    )
      .map((r, i) => `${i + 1}. ${r}`)
      .join('\n')}`,
  );

  return sections.join('\n\n');
}

/**
 * The full assistant object sent to `POST /assistant` and `PATCH /assistant/:id`.
 *
 * `serverUrl` is where Vapi posts end-of-call reports; `serverUrlSecret` is
 * echoed back in the `x-vapi-secret` header so the webhook can prove the call
 * really came from Vapi.
 */
export function buildAssistantConfig(input: AssistantBuildInput): Record<string, unknown> {
  const voice = getVapiVoice(input.agent.voice);

  const config: Record<string, unknown> = {
    name: `${input.business.displayName} — ${input.agent.displayName}`,
    firstMessage: input.agent.greeting,
    firstMessageMode: 'assistant-speaks-first',
    model: {
      provider: 'openai',
      model: input.model,
      temperature: 0.4,
      messages: [{ role: 'system', content: buildSystemPrompt(input) }],
      // Only attached when a booking could actually be honoured. An assistant
      // holding a tool it cannot use is worse than one that knows it cannot
      // book: it will try, fail, and then improvise in front of the caller.
      ...(canBookOnCall(input)
        ? {
            tools: bookingToolDefinitions({
              serverUrl: input.serverUrl,
              serverSecret: input.serverSecret,
              serviceNames: input.services.map((s) => s.name),
            }),
          }
        : {}),
    },
    voice: { provider: voice.provider, voiceId: voice.voiceId },
    transcriber: { provider: 'deepgram', model: 'nova-2', language: 'en' },
    server: { url: input.serverUrl, secret: input.serverSecret },
    serverMessages: canBookOnCall(input)
      ? ['end-of-call-report', 'status-update', 'tool-calls']
      : ['end-of-call-report', 'status-update'],
    // Recording is off: the product stores transcripts, not audio.
    artifactPlan: { recordingEnabled: false, transcriptPlan: { enabled: true } },
    analysisPlan: {
      summaryPlan: {
        enabled: true,
        messages: [
          {
            role: 'system',
            content:
              'Summarise this call in two or three sentences: why the customer called, what was agreed, and any follow-up needed. State only what is in the transcript. Never comment on the caller as a person.',
          },
        ],
      },
      structuredDataPlan: {
        enabled: true,
        schema: {
          type: 'object',
          properties: {
            customer_name: { type: 'string', description: "The caller's full name, or empty if not given." },
            customer_phone: { type: 'string', description: 'Best callback number, or empty.' },
            customer_email: { type: 'string', description: 'Email address, or empty.' },
            service_address: { type: 'string', description: 'Service address, or empty.' },
            postal_code: { type: 'string', description: 'ZIP or postal code, or empty.' },
            service_requested: { type: 'string', description: 'What the caller wants done, or empty.' },
            urgency: { type: 'string', enum: ['emergency', 'urgent', 'soon', 'flexible', 'unknown'] },
            requested_appointment: {
              type: 'string',
              description: 'Any day/time the caller asked for, in plain words. Empty if none.',
            },
            outcome: {
              type: 'string',
              enum: [
                'lead_captured',
                'appointment_requested',
                'question_answered',
                'transferred_to_human',
                'spam',
                'wrong_number',
                'out_of_service_area',
                'no_intent',
                'unresolved',
              ],
            },
          },
          required: ['customer_name', 'customer_phone', 'service_requested', 'urgency', 'outcome'],
        },
      },
    },
    endCallFunctionEnabled: true,
    silenceTimeoutSeconds: 30,
    maxDurationSeconds: 1800,
    backgroundSound: 'off',
  };

  if (input.agent.transferPhone) {
    config.forwardingPhoneNumber = input.agent.transferPhone;
  }

  return config;
}

/** Formats a stored cents price for the prompt, or null when there is none. */
export function priceForPrompt(input: {
  priceType: string;
  exactPrice: number | null;
  startingPrice: number | null;
  maxPrice: number | null;
  priceNotes: string | null;
}): string | null {
  const money = (n: number | null) => (n == null ? null : `$${(n / 100).toFixed(2).replace(/\.00$/, '')}`);
  let base: string | null = null;

  switch (input.priceType) {
    case 'fixed':
      base = money(input.exactPrice);
      break;
    case 'hourly':
      base = input.exactPrice != null ? `${money(input.exactPrice)} per hour` : null;
      break;
    case 'starting_at':
      base = input.startingPrice != null ? `starting at ${money(input.startingPrice)}` : null;
      break;
    case 'range':
      base =
        input.startingPrice != null && input.maxPrice != null
          ? `${money(input.startingPrice)} to ${money(input.maxPrice)}`
          : null;
      break;
    default:
      base = null;
  }

  if (!base) return null;
  return input.priceNotes ? `${base} (${input.priceNotes})` : base;
}
