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
  };
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
export function safetyRules(hasTransfer: boolean): string[] {
  const rules = [
    'Never invent a price. Only state prices that appear in the Services list below, exactly as written. If a service has no price listed, say an estimate is needed.',
    'Never claim the business offers a service that is not in the Services list. Offer to take a message instead.',
    'Never invent availability or promise that someone will arrive at a specific time. Take the caller\'s preferred times and tell them the team will confirm.',
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
      agent.bookingEnabled
        ? '4. If they want work done, collect their preferred day and time and tell them the team will confirm it.'
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
    },
    voice: { provider: voice.provider, voiceId: voice.voiceId },
    transcriber: { provider: 'deepgram', model: 'nova-2', language: 'en' },
    server: { url: input.serverUrl, secret: input.serverSecret },
    serverMessages: ['end-of-call-report', 'status-update'],
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
