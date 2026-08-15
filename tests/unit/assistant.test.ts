import { describe, expect, it } from 'vitest';
import {
  DEFAULT_VAPI_VOICE,
  availableVapiVoices,
  buildAssistantConfig,
  buildSystemPrompt,
  getPersonality,
  getVapiVoice,
  isValidVapiVoice,
  priceForPrompt,
  safetyRules,
  type AssistantBuildInput,
} from '@afd/shared';

/**
 * The assistant payload is the only thing that decides how a real call goes, so
 * it is tested as a pure function: given stored settings, what does the voice
 * provider actually receive?
 */

function input(overrides: Partial<AssistantBuildInput> = {}): AssistantBuildInput {
  return {
    organizationName: "Daniel's HVAC",
    business: {
      displayName: "Daniel's HVAC",
      industry: 'hvac',
      description: 'Residential heating and cooling in Philadelphia.',
      phone: '+12155550100',
      email: 'office@danielshvac.test',
      website: 'https://danielshvac.test',
      address: '412 Chestnut Street',
      city: 'Philadelphia',
      state: 'PA',
      postalCode: '19106',
      timezone: 'America/New_York',
      hours: [
        { weekday: 1, closed: false, open: '07:30', close: '18:00' },
        { weekday: 0, closed: true, open: '00:00', close: '00:00' },
      ],
    },
    services: [
      { name: 'AC repair', description: 'Diagnostic and repair.', price: 'starting at $149' },
      { name: 'Commercial RTU service', description: null, price: null },
    ],
    serviceAreas: ['19106', 'Philadelphia, PA'],
    faqs: [{ question: 'Do you offer free estimates?', answer: 'Yes, on replacements.' }],
    agent: {
      displayName: 'Mia',
      greeting: 'Thanks for calling. This is Mia.',
      voice: 'elliot',
      personality: 'warm',
      transferPhone: null,
      instructions: null,
      bookingEnabled: true,
    },
    rules: [],
    serverUrl: 'https://app.test/api/webhooks/vapi',
    serverSecret: 'shhh',
    model: 'gpt-4o',
    ...overrides,
  };
}

describe('voice catalogue', () => {
  it('only offers voices that are marked available', () => {
    expect(availableVapiVoices().every((v) => v.available)).toBe(true);
    expect(availableVapiVoices().length).toBeGreaterThan(0);
  });

  it('falls back to the default voice rather than crashing on an unknown id', () => {
    expect(getVapiVoice('does-not-exist').id).toBe(DEFAULT_VAPI_VOICE);
    expect(getVapiVoice(null).id).toBe(DEFAULT_VAPI_VOICE);
  });

  it('rejects voice ids that are not in the catalogue', () => {
    expect(isValidVapiVoice('elliot')).toBe(true);
    expect(isValidVapiVoice('scarlett-johansson')).toBe(false);
  });
});

describe('safety rules', () => {
  it('always forbids inventing prices, faking actions and claiming to be human', () => {
    const rules = safetyRules(false).join(' ');
    expect(rules).toMatch(/Never invent a price/i);
    expect(rules).toMatch(/Never claim you have completed an action/i);
    expect(rules).toMatch(/Never claim or imply that you are human/i);
    expect(rules).toMatch(/Never ask for, repeat or record credit card numbers/i);
  });

  it('tells the assistant to take a message when transfer is off', () => {
    expect(safetyRules(false).join(' ')).toMatch(/Live transfer is not available/i);
    expect(safetyRules(true).join(' ')).toMatch(/transfer the call/i);
  });
});

describe('buildSystemPrompt', () => {
  it('states the prices that are stored, and refuses to state ones that are not', () => {
    const prompt = buildSystemPrompt(input());
    expect(prompt).toContain('Price: starting at $149');
    expect(prompt).toContain('Price: estimate required — never state a number');
  });

  it('does not let the assistant guess what the business does when no service exists', () => {
    const prompt = buildSystemPrompt(input({ services: [] }));
    expect(prompt).toMatch(/No services have been configured/);
    expect(prompt).toMatch(/Do not guess what the business does/);
  });

  it('does not let the assistant state hours or coverage it has not been given', () => {
    const prompt = buildSystemPrompt(
      input({
        business: { ...input().business, hours: [] },
        serviceAreas: [],
      }),
    );
    expect(prompt).toMatch(/Do not state specific hours/);
    expect(prompt).toMatch(/Do not tell a caller whether they are covered/);
  });

  it('includes the business timezone so times are never ambiguous', () => {
    expect(buildSystemPrompt(input())).toContain('America/New_York');
  });

  it('applies the chosen personality', () => {
    const prompt = buildSystemPrompt(input());
    expect(prompt).toContain(getPersonality('warm').promptFragment);
  });

  it('includes owner rules and notes, but puts the safety rules last so they win', () => {
    const prompt = buildSystemPrompt(
      input({
        rules: [{ title: 'Ask about ownership', instruction: 'Ask whether they own the property.' }],
        agent: { ...input().agent, instructions: 'We do not service oil furnaces.' },
      }),
    );
    expect(prompt).toContain('Ask whether they own the property.');
    expect(prompt).toContain('We do not service oil furnaces.');
    expect(prompt.indexOf('Rules you must never break')).toBeGreaterThan(
      prompt.indexOf('Ask whether they own the property.'),
    );
  });

  it('stops collecting appointment times when booking is turned off', () => {
    const off = buildSystemPrompt(
      input({ agent: { ...input().agent, bookingEnabled: false } }),
    );
    expect(off).toMatch(/Do not collect appointment times/);
  });
});

describe('buildAssistantConfig', () => {
  it('drives OpenAI as the model provider through Vapi', () => {
    const config = buildAssistantConfig(input()) as Record<string, Record<string, unknown>>;
    expect(config.model.provider).toBe('openai');
    expect(config.model.model).toBe('gpt-4o');
  });

  it('points the provider at our webhook with the shared secret', () => {
    const config = buildAssistantConfig(input()) as Record<string, Record<string, unknown>>;
    expect(config.server.url).toBe('https://app.test/api/webhooks/vapi');
    expect(config.server.secret).toBe('shhh');
    expect(config.serverMessages).toContain('end-of-call-report');
  });

  it('never enables call recording', () => {
    const config = buildAssistantConfig(input()) as Record<string, Record<string, unknown>>;
    expect(config.artifactPlan.recordingEnabled).toBe(false);
  });

  it('omits the forwarding number entirely when transfer is off', () => {
    expect(buildAssistantConfig(input())).not.toHaveProperty('forwardingPhoneNumber');
    const withTransfer = buildAssistantConfig(
      input({ agent: { ...input().agent, transferPhone: '+12155550111' } }),
    );
    expect(withTransfer.forwardingPhoneNumber).toBe('+12155550111');
  });

  it('uses the greeting verbatim as the first thing a caller hears', () => {
    expect(buildAssistantConfig(input()).firstMessage).toBe('Thanks for calling. This is Mia.');
  });

  it('asks the provider for the structured fields the lead record needs', () => {
    const config = buildAssistantConfig(input()) as unknown as {
      analysisPlan: { structuredDataPlan: { schema: { properties: Record<string, unknown> } } };
    };
    const props = Object.keys(config.analysisPlan.structuredDataPlan.schema.properties);
    expect(props).toEqual(
      expect.arrayContaining([
        'customer_name',
        'customer_phone',
        'service_requested',
        'urgency',
        'outcome',
      ]),
    );
  });
});

describe('priceForPrompt', () => {
  const base = { exactPrice: null, startingPrice: null, maxPrice: null, priceNotes: null };

  it('formats each pricing model the way a person would say it', () => {
    expect(priceForPrompt({ ...base, priceType: 'fixed', exactPrice: 9900 })).toBe('$99');
    expect(priceForPrompt({ ...base, priceType: 'hourly', exactPrice: 12550 })).toBe('$125.50 per hour');
    expect(priceForPrompt({ ...base, priceType: 'starting_at', startingPrice: 14900 })).toBe(
      'starting at $149',
    );
    expect(
      priceForPrompt({ ...base, priceType: 'range', startingPrice: 45000, maxPrice: 120000 }),
    ).toBe('$450 to $1200');
  });

  it('returns null rather than a number when there is no approved price', () => {
    expect(priceForPrompt({ ...base, priceType: 'quote_only' })).toBeNull();
    // A range missing its upper bound is incomplete — better silent than wrong.
    expect(priceForPrompt({ ...base, priceType: 'range', startingPrice: 45000 })).toBeNull();
    expect(priceForPrompt({ ...base, priceType: 'fixed' })).toBeNull();
  });

  it('appends the owner’s pricing note so caveats are read out too', () => {
    expect(
      priceForPrompt({ ...base, priceType: 'fixed', exactPrice: 9900, priceNotes: 'per system' }),
    ).toBe('$99 (per system)');
  });
});
