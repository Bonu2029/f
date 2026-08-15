import 'server-only';
import OpenAI from 'openai';
import { DEMO_MODE, openaiEnv } from '@/lib/env';
import { errors } from '@/lib/errors';
import { log } from '@/lib/logger';
import type {
  AIProvider,
  CallSummaryResult,
  ChatMessage,
  ExtractedKnowledge,
  TrainingTurnResult,
} from './types';

/* -------------------------------------------------------------------------- */
/* JSON schemas for structured outputs                                        */
/* -------------------------------------------------------------------------- */

const knowledgeSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    services: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          description: { type: ['string', 'null'] },
          price_type: {
            type: ['string', 'null'],
            enum: ['fixed', 'starting_at', 'range', 'quote_only', 'hourly', null],
          },
          starting_price: { type: ['number', 'null'], description: 'US dollars' },
          exact_price: { type: ['number', 'null'], description: 'US dollars' },
          max_price: { type: ['number', 'null'], description: 'US dollars' },
          price_notes: { type: ['string', 'null'] },
          estimated_duration: { type: ['number', 'null'], description: 'minutes' },
        },
        required: ['name', 'description', 'price_type', 'starting_price', 'exact_price', 'max_price', 'price_notes', 'estimated_duration'],
      },
    },
    faqs: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: { question: { type: 'string' }, answer: { type: 'string' } },
        required: ['question', 'answer'],
      },
    },
    policies: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          kind: {
            type: 'string',
            enum: ['cancellation', 'refunds', 'deposits', 'service_areas', 'emergency', 'warranty', 'financing', 'payment_methods', 'other'],
          },
          title: { type: 'string' },
          body: { type: 'string' },
        },
        required: ['kind', 'title', 'body'],
      },
    },
    service_areas: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          type: { type: 'string', enum: ['city', 'postal_code', 'state', 'radius'] },
          city: { type: ['string', 'null'] },
          state: { type: ['string', 'null'] },
          postal_code: { type: ['string', 'null'] },
          center_postal_code: { type: ['string', 'null'] },
          radius_miles: { type: ['number', 'null'] },
        },
        required: ['type', 'city', 'state', 'postal_code', 'center_postal_code', 'radius_miles'],
      },
    },
    rules: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: { title: { type: 'string' }, instruction: { type: 'string' } },
        required: ['title', 'instruction'],
      },
    },
    business: {
      type: 'object',
      additionalProperties: false,
      properties: {
        business_description: { type: ['string', 'null'] },
        emergency_information: { type: ['string', 'null'] },
        business_hours: {
          type: ['array', 'null'],
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              weekday: { type: 'number' },
              closed: { type: 'boolean' },
              open: { type: 'string' },
              close: { type: 'string' },
            },
            required: ['weekday', 'closed', 'open', 'close'],
          },
        },
      },
      required: ['business_description', 'emergency_information', 'business_hours'],
    },
  },
  required: ['services', 'faqs', 'policies', 'service_areas', 'rules', 'business'],
} as const;

const trainingSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    reply: { type: 'string', description: 'Your next message to the business owner. Two or three sentences maximum.' },
    extracted: knowledgeSchema,
  },
  required: ['reply', 'extracted'],
} as const;

const summarySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: { type: 'string', description: 'Two or three sentence plain-language summary.' },
    reason: { type: 'string', description: 'Why the customer called.' },
    customer_name: { type: ['string', 'null'] },
    location: { type: ['string', 'null'] },
    service: { type: ['string', 'null'] },
    result: { type: 'string' },
    appointment: { type: ['string', 'null'] },
    notes: { type: ['string', 'null'] },
    follow_up_required: { type: 'boolean' },
    disposition: {
      type: 'string',
      enum: ['lead_captured', 'appointment_booked', 'question_answered', 'transferred_to_human', 'spam', 'wrong_number', 'out_of_service_area', 'no_intent', 'unresolved'],
    },
    call_tone: {
      type: ['string', 'null'],
      description: 'How the conversation went overall: calm, frustrated, urgent, positive. Describe the conversation only — never infer anything about the caller as a person.',
    },
  },
  required: ['summary', 'reason', 'customer_name', 'location', 'service', 'result', 'appointment', 'notes', 'follow_up_required', 'disposition', 'call_tone'],
} as const;

const websiteSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    display_name: { type: ['string', 'null'] },
    industry: { type: ['string', 'null'] },
    public_phone: { type: ['string', 'null'] },
    email: { type: ['string', 'null'] },
    address: { type: ['string', 'null'] },
    city: { type: ['string', 'null'] },
    state: { type: ['string', 'null'] },
    postal_code: { type: ['string', 'null'] },
    ...knowledgeSchema.properties,
  },
  required: [
    'display_name', 'industry', 'public_phone', 'email', 'address', 'city', 'state', 'postal_code',
    ...knowledgeSchema.required,
  ],
} as const;

/* -------------------------------------------------------------------------- */
/* OpenAI adapter                                                             */
/* -------------------------------------------------------------------------- */

class OpenAIProvider implements AIProvider {
  readonly name = 'openai';
  readonly isMock = false;

  private client() {
    return new OpenAI({ apiKey: openaiEnv.apiKey });
  }

  /**
   * Calls the Responses API with a strict JSON schema and parses the result.
   * Structured outputs mean the model cannot return prose where we expect data.
   */
  private async structured<T>(system: string, input: string, schema: { name: string; schema: unknown }): Promise<T> {
    try {
      const res = await this.client().responses.create({
        model: openaiEnv.textModel,
        input: [
          { role: 'system', content: system },
          { role: 'user', content: input },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: schema.name,
            strict: true,
            schema: schema.schema as Record<string, unknown>,
          },
        },
      });
      const text = res.output_text;
      if (!text) throw new Error('Model returned no output');
      return JSON.parse(text) as T;
    } catch (err) {
      log.error('openai structured call failed', { provider: 'openai', error: err });
      throw errors.providerUnavailable('OpenAI');
    }
  }

  async trainingTurn(input: {
    businessName: string;
    industry: string | null;
    history: ChatMessage[];
    message: string;
  }): Promise<TrainingTurnResult> {
    const { TRAINING_SYSTEM_PROMPT } = await import('@afd/shared');
    const system = `${TRAINING_SYSTEM_PROMPT}

The business is called "${input.businessName}"${input.industry ? ` and is in the ${input.industry} industry` : ''}.

Return JSON with two fields:
  reply    — your next message to the owner.
  extracted — ONLY the new facts contained in the owner's latest message. Leave arrays empty when nothing new was said. Never invent prices, hours or policies the owner did not state. Prices are in US dollars.`;

    const conversation = [...input.history, { role: 'user' as const, content: input.message }]
      .slice(-24)
      .map((m) => `${m.role === 'user' ? 'OWNER' : 'ASSISTANT'}: ${m.content}`)
      .join('\n\n');

    const result = await this.structured<{ reply: string; extracted: ExtractedKnowledge }>(
      system,
      conversation,
      { name: 'training_turn', schema: trainingSchema },
    );
    return { reply: result.reply, extracted: result.extracted ?? {} };
  }

  async summarizeCall(input: {
    businessName: string;
    transcript: Array<{ role: string; text: string }>;
    appointmentBooked: boolean;
    transferred: boolean;
    leadCaptured: boolean;
  }): Promise<CallSummaryResult> {
    const system = `You summarise phone calls answered by an AI receptionist for ${input.businessName}. Be factual and concise. Only state what is in the transcript — never speculate. Never infer or comment on the caller's age, gender, accent, ethnicity, health or any other personal characteristic. "call_tone" describes the conversation, not the person.

Known outcomes: appointment_booked=${input.appointmentBooked}, transferred=${input.transferred}, lead_captured=${input.leadCaptured}.`;

    const transcript = input.transcript
      .map((m) => `${m.role === 'assistant' ? 'RECEPTIONIST' : 'CALLER'}: ${m.text}`)
      .join('\n');

    const r = await this.structured<{
      summary: string;
      reason: string;
      customer_name: string | null;
      location: string | null;
      service: string | null;
      result: string;
      appointment: string | null;
      notes: string | null;
      follow_up_required: boolean;
      disposition: string;
      call_tone: string | null;
    }>(system, transcript || '(no transcript captured)', { name: 'call_summary', schema: summarySchema });

    return {
      summary: r.summary,
      structured: {
        reason: r.reason,
        customer_name: r.customer_name,
        location: r.location,
        service: r.service,
        result: r.result,
        appointment: r.appointment,
        notes: r.notes,
        follow_up_required: r.follow_up_required,
      },
      disposition: r.disposition,
      call_tone: r.call_tone,
    };
  }

  async extractFromWebsite(input: { url: string; text: string }) {
    const system = `You extract business information from a company's own website so the owner can review it. Extract only what the page actually says. If something is not stated, return null or an empty array — never guess. Prices are in US dollars.`;
    return this.structured<ExtractedKnowledge & Record<string, string | null>>(
      system,
      `Website: ${input.url}\n\n${input.text.slice(0, 40_000)}`,
      { name: 'website_extraction', schema: websiteSchema },
    );
  }

  async synthesizeVoiceSample(input: { voice: string; text: string }) {
    try {
      const res = await this.client().audio.speech.create({
        model: openaiEnv.ttsModel,
        voice: input.voice as never,
        input: input.text,
        response_format: 'mp3',
      });
      return { audio: Buffer.from(await res.arrayBuffer()), mimeType: 'audio/mpeg' };
    } catch (err) {
      log.error('openai tts failed', { provider: 'openai', error: err });
      throw errors.providerUnavailable('OpenAI text-to-speech');
    }
  }

  /**
   * Mints an ephemeral Realtime client secret for the in-browser test.
   *
   * This is the ONLY OpenAI credential that ever reaches the browser, it is
   * scoped to a single Realtime session and it expires in minutes. The standing
   * API key never leaves the server.
   */
  async createRealtimeClientSecret(input: { model: string; voice: string; instructions: string }) {
    try {
      const res = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiEnv.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session: {
            type: 'realtime',
            model: input.model,
            instructions: input.instructions,
            audio: { output: { voice: input.voice } },
          },
        }),
      });
      if (!res.ok) {
        const detail = await res.text();
        log.error('openai client secret failed', { provider: 'openai', status: res.status, detail });
        throw errors.providerUnavailable('OpenAI Realtime');
      }
      const json = (await res.json()) as { value: string; expires_at: number };
      return { value: json.value, expiresAt: json.expires_at };
    } catch (err) {
      if (err instanceof Error && err.name === 'AppError') throw err;
      log.error('openai client secret error', { provider: 'openai', error: err });
      throw errors.providerUnavailable('OpenAI Realtime');
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Mock adapter                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Deterministic stand-in for OpenAI. It performs genuine (if simple) parsing of
 * the owner's text so the training flow produces real database rows in demo
 * mode — it does not fabricate business facts that were never typed.
 */
class MockAIProvider implements AIProvider {
  readonly name = 'mock-ai';
  readonly isMock = true;

  private static readonly QUESTIONS = [
    'What services do you offer?',
    'What do those services typically cost?',
    'Which cities or ZIP codes do you service?',
    'What are your business hours?',
    'What should I do with emergency calls?',
    'What questions should I ask a new customer before booking?',
    'What should I never promise a customer?',
    'When should I transfer a call to you instead of handling it?',
  ];

  async trainingTurn(input: {
    businessName: string;
    industry: string | null;
    history: ChatMessage[];
    message: string;
  }): Promise<TrainingTurnResult> {
    const asked = input.history.filter((m) => m.role === 'assistant').length;
    const next = MockAIProvider.QUESTIONS[asked] ?? null;
    const extracted = extractKnowledgeHeuristically(input.message);

    const acknowledged = summariseExtraction(extracted);
    const reply = next
      ? `${acknowledged} ${next}`
      : `${acknowledged} That covers the basics — you can review and edit everything in the Knowledge section whenever you like.`;

    return { reply, extracted };
  }

  async summarizeCall(input: {
    businessName: string;
    transcript: Array<{ role: string; text: string }>;
    appointmentBooked: boolean;
    transferred: boolean;
    leadCaptured: boolean;
  }): Promise<CallSummaryResult> {
    const callerLines = input.transcript.filter((m) => m.role === 'user').map((m) => m.text);
    const reason = callerLines[0]?.slice(0, 200) ?? 'No caller speech was captured.';
    const result = input.appointmentBooked
      ? 'Appointment booked'
      : input.transferred
        ? 'Transferred to a person'
        : input.leadCaptured
          ? 'Lead captured'
          : 'Call handled';
    return {
      summary: `[Demo summary] ${result}. Caller said: "${reason}"`,
      structured: {
        reason,
        customer_name: null,
        location: null,
        service: null,
        result,
        appointment: null,
        notes: null,
        follow_up_required: !input.appointmentBooked,
      },
      disposition: input.appointmentBooked
        ? 'appointment_booked'
        : input.transferred
          ? 'transferred_to_human'
          : input.leadCaptured
            ? 'lead_captured'
            : 'question_answered',
      call_tone: 'neutral',
    };
  }

  async extractFromWebsite(input: { url: string; text: string }) {
    return {
      display_name: null,
      industry: null,
      public_phone: /(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/.exec(input.text)?.[0] ?? null,
      email: /[\w.+-]+@[\w-]+\.[\w.]+/.exec(input.text)?.[0] ?? null,
      address: null,
      city: null,
      state: null,
      postal_code: /\b\d{5}\b/.exec(input.text)?.[0] ?? null,
      ...extractKnowledgeHeuristically(input.text),
    };
  }

  async synthesizeVoiceSample() {
    // A valid, silent 0.1s WAV so the preview player has real audio to play and
    // the UI never pretends a sample was generated when it was not.
    return { audio: silentWav(), mimeType: 'audio/wav' };
  }

  async createRealtimeClientSecret(): Promise<{ value: string; expiresAt: number }> {
    throw errors.providerNotConfigured(
      'OpenAI',
      'the in-browser receptionist test. Add OPENAI_API_KEY and set DEMO_MODE=false to try it, or call your AI number instead',
    );
  }
}

/** Very small heuristic extractor used only by the mock provider. */
function extractKnowledgeHeuristically(text: string): ExtractedKnowledge {
  const out: ExtractedKnowledge = {};
  const services: NonNullable<ExtractedKnowledge['services']> = [];

  // "AC repair $150" / "roof repair starting at $400"
  const servicePattern =
    /([A-Za-z][A-Za-z /&'-]{2,40}?)\s*(?:costs?|is|for|:)?\s*(starting at|from|around|about)?\s*\$\s?([\d,]+(?:\.\d{2})?)/gi;
  let m: RegExpExecArray | null;
  while ((m = servicePattern.exec(text)) !== null) {
    const name = m[1]!.trim().replace(/^(we (do|offer)|our)\s+/i, '');
    if (name.length < 3) continue;
    const dollars = Number(m[3]!.replace(/,/g, ''));
    const isStarting = Boolean(m[2]);
    services.push({
      name,
      description: null,
      price_type: isStarting ? 'starting_at' : 'fixed',
      starting_price: isStarting ? dollars : null,
      exact_price: isStarting ? null : dollars,
      max_price: null,
      price_notes: null,
      estimated_duration: null,
    });
    if (services.length >= 8) break;
  }
  if (services.length) out.services = services;

  const zips = [...new Set(text.match(/\b\d{5}\b/g) ?? [])].slice(0, 10);
  if (zips.length) {
    out.service_areas = zips.map((z) => ({
      type: 'postal_code' as const,
      city: null,
      state: null,
      postal_code: z,
      center_postal_code: null,
      radius_miles: null,
    }));
  }

  if (/emergenc/i.test(text)) {
    out.business = { emergency_information: text.slice(0, 500) };
  }

  return out;
}

function summariseExtraction(k: ExtractedKnowledge): string {
  const bits: string[] = [];
  if (k.services?.length) bits.push(`${k.services.length} service${k.services.length === 1 ? '' : 's'}`);
  if (k.service_areas?.length) bits.push(`${k.service_areas.length} service area${k.service_areas.length === 1 ? '' : 's'}`);
  if (k.faqs?.length) bits.push(`${k.faqs.length} FAQ${k.faqs.length === 1 ? '' : 's'}`);
  return bits.length ? `Got it — saved ${bits.join(', ')}.` : 'Got it.';
}

/** 100ms of silence, 8kHz mono PCM, as a well-formed WAV file. */
function silentWav(): Buffer {
  const sampleRate = 8000;
  const samples = sampleRate / 10;
  const dataSize = samples * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
  return buf;
}

/* -------------------------------------------------------------------------- */

let cached: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (cached) return cached;
  cached = DEMO_MODE || !openaiEnv.configured ? new MockAIProvider() : new OpenAIProvider();
  return cached;
}

export function __setAIProviderForTests(p: AIProvider | null) {
  cached = p;
}

export { OpenAIProvider, MockAIProvider };
