import { describe, expect, it } from 'vitest';
import {
  BOOKING_TOOL_NAMES,
  classifyUnbookable,
  unbookableSentence,
  bookingToolDefinitions,
  buildAssistantConfig,
  canBookOnCall,
  describeOffer,
  describeSlotForSpeech,
  safetyRules,
  type AssistantBuildInput,
} from '@afd/shared';
import { toolCallsFrom } from '@/server/vapi-report';

const TZ = 'America/New_York';

describe('describeSlotForSpeech', () => {
  it('reads a time the way a person says it', () => {
    expect(describeSlotForSpeech('2026-09-02T18:00:00Z', TZ)).toBe('Wednesday, September 2 at 2:00 PM');
  });

  it('says today and tomorrow when that is what someone would say', () => {
    const now = '2026-09-02T13:00:00Z'; // 9am on the 2nd, local
    expect(describeSlotForSpeech('2026-09-02T18:00:00Z', TZ, now)).toBe('today at 2:00 PM');
    expect(describeSlotForSpeech('2026-09-03T18:00:00Z', TZ, now)).toBe('tomorrow at 2:00 PM');
  });

  it('keeps the date once it is further out, because a weekday alone is ambiguous', () => {
    const now = '2026-09-02T13:00:00Z';
    expect(describeSlotForSpeech('2026-09-10T18:00:00Z', TZ, now)).toBe(
      'Thursday, September 10 at 2:00 PM',
    );
  });

  it('uses the business timezone, not the server one', () => {
    // The same instant is a different hour in Los Angeles. A receptionist that
    // reads out UTC sends someone to a job three hours early.
    expect(describeSlotForSpeech('2026-09-02T18:00:00Z', 'America/Los_Angeles')).toBe(
      'Wednesday, September 2 at 11:00 AM',
    );
  });

  it('returns nothing for an unusable time rather than a broken phrase', () => {
    expect(describeSlotForSpeech('not a date', TZ)).toBe('');
  });
});

describe('describeOffer', () => {
  const now = '2026-09-02T13:00:00Z';
  const slot = (startISO: string) => ({ startISO });

  it('joins options the way they are spoken', () => {
    expect(
      describeOffer([slot('2026-09-02T18:00:00Z'), slot('2026-09-03T14:00:00Z')], TZ, now),
    ).toBe('today at 2:00 PM or tomorrow at 10:00 AM');
  });

  it('uses a list for three', () => {
    expect(
      describeOffer(
        [slot('2026-09-02T18:00:00Z'), slot('2026-09-03T14:00:00Z'), slot('2026-09-04T14:00:00Z')],
        TZ,
        now,
      ),
    ).toContain(', or ');
  });

  it('says nothing when there is nothing to offer', () => {
    expect(describeOffer([], TZ, now)).toBe('');
  });
});

/* -------------------------------------------------------------------------- */

function buildInput(overrides: Partial<AssistantBuildInput> = {}): AssistantBuildInput {
  return {
    organizationName: 'Yardley Plumbing',
    business: {
      displayName: 'Yardley Plumbing',
      industry: 'Plumbing',
      description: 'Drains and boilers.',
      phone: null,
      email: null,
      website: null,
      address: null,
      city: null,
      state: null,
      postalCode: null,
      timezone: TZ,
      hours: [],
    },
    services: [{ name: 'Drain clearing', description: null, price: '$149' }],
    serviceAreas: [],
    faqs: [],
    agent: {
      displayName: 'Mia',
      greeting: 'Thanks for calling Yardley Plumbing.',
      voice: 'elliot',
      personality: 'friendly',
      transferPhone: null,
      instructions: null,
      bookingEnabled: true,
    },
    rules: [],
    bookableEmployees: 2,
    serverUrl: 'https://example.com/api/webhooks/vapi',
    serverSecret: 'secret',
    model: 'gpt-4o',
    ...overrides,
  };
}

describe('canBookOnCall', () => {
  it('is true only when the owner asked for it AND someone can take the job', () => {
    expect(canBookOnCall(buildInput())).toBe(true);
  });

  it('is false when the owner has not enabled booking', () => {
    const off = buildInput();
    off.agent.bookingEnabled = false;
    expect(canBookOnCall(off)).toBe(false);
  });

  /**
   * The half that is easy to forget. Booking enabled with nobody on the
   * schedule gives the assistant a tool that can only ever fail — and a tool
   * that always fails is an invitation to work around it in front of a caller.
   */
  it('is false when nobody is bookable, however the setting is left', () => {
    expect(canBookOnCall(buildInput({ bookableEmployees: 0 }))).toBe(false);
  });
});

describe('safetyRules', () => {
  it('forbids naming any time at all when booking is not possible', () => {
    const rules = safetyRules(false, false).join('\n');
    expect(rules).toContain('Never invent availability');
    expect(rules).not.toContain('check_availability');
  });

  /**
   * The rule narrows rather than disappearing. Before the tools existed, no
   * time the assistant said could be kept. Now one can — but only one this
   * server offered, and that is exactly what stays prohibited.
   */
  it('narrows to the part that is still a lie once booking works', () => {
    const rules = safetyRules(false, true).join('\n');
    expect(rules).toContain('check_availability');
    expect(rules).toMatch(/Never state, offer or confirm an appointment time that did not come back/);
    expect(rules).toContain('Do not adjust, round or rephrase a time it gave you');
  });

  it('keeps every other prohibition in both modes', () => {
    for (const canBook of [true, false]) {
      const rules = safetyRules(false, canBook).join('\n');
      expect(rules).toContain('Never invent a price');
      expect(rules).toContain('Never claim you have completed an action you did not complete');
      expect(rules).toMatch(/answer truthfully/);
    }
  });
});

describe('the assistant payload', () => {
  it('carries both booking tools when a booking can be honoured', () => {
    const config = buildAssistantConfig(buildInput());
    const model = config.model as { tools?: Array<{ function: { name: string } }> };
    expect(model.tools?.map((t) => t.function.name)).toEqual([
      BOOKING_TOOL_NAMES.checkAvailability,
      BOOKING_TOOL_NAMES.bookAppointment,
    ]);
    expect(config.serverMessages).toContain('tool-calls');
  });

  it('carries no tools when nobody could take the job', () => {
    const config = buildAssistantConfig(buildInput({ bookableEmployees: 0 }));
    expect((config.model as { tools?: unknown }).tools).toBeUndefined();
    // And Vapi is not asked to send tool events we would have to refuse.
    expect(config.serverMessages).not.toContain('tool-calls');
  });

  it('tells the model to book on the call rather than promise a callback', () => {
    const prompt = (buildAssistantConfig(buildInput()).model as {
      messages: Array<{ content: string }>;
    }).messages[0]!.content;
    expect(prompt).toContain('Book it on this call');
    expect(prompt).not.toContain('the team will confirm it');
  });

  it('still promises a callback when it cannot book', () => {
    const prompt = (buildAssistantConfig(buildInput({ bookableEmployees: 0 })).model as {
      messages: Array<{ content: string }>;
    }).messages[0]!.content;
    expect(prompt).toContain('the team will call back to arrange a time');
  });

  it('waits for the tool result instead of carrying on without it', () => {
    // async: true would let the model keep talking and invent the answer.
    const tools = bookingToolDefinitions({
      serverUrl: 'https://example.com/api/webhooks/vapi',
      serverSecret: 's',
      serviceNames: [],
    });
    for (const tool of tools) expect(tool.async).toBe(false);
  });

  it('sends the tools to our own webhook, with the secret', () => {
    const tools = bookingToolDefinitions({
      serverUrl: 'https://example.com/api/webhooks/vapi',
      serverSecret: 'shhh',
      serviceNames: [],
    });
    for (const tool of tools) {
      expect(tool.server).toEqual({ url: 'https://example.com/api/webhooks/vapi', secret: 'shhh' });
    }
  });

  it('requires a slot_id, so a time cannot be booked without one being offered', () => {
    const [, bookTool] = bookingToolDefinitions({
      serverUrl: 'https://example.com',
      serverSecret: 's',
      serviceNames: [],
    });
    const fn = (bookTool as { function: { parameters: { required: string[]; properties: Record<string, unknown> } } })
      .function;
    expect(fn.parameters.required).toContain('slot_id');
    // There is deliberately no free-text time field: the only way to express a
    // time is an identifier this server issued.
    expect(Object.keys(fn.parameters.properties)).not.toContain('start_time');
    expect(Object.keys(fn.parameters.properties)).not.toContain('appointment_time');
  });
});

/* -------------------------------------------------------------------------- */

describe('toolCallsFrom', () => {
  it('reads the list Vapi sends, with arguments as a JSON string', () => {
    expect(
      toolCallsFrom({
        type: 'tool-calls',
        toolCallList: [
          {
            id: 'call_abc',
            function: { name: 'check_availability', arguments: '{"service":"Drain clearing"}' },
          },
        ],
      }),
    ).toEqual([
      { id: 'call_abc', name: 'check_availability', args: { service: 'Drain clearing' } },
    ]);
  });

  it('reads arguments that already arrived as an object', () => {
    expect(
      toolCallsFrom({
        toolCalls: [{ id: 'c1', function: { name: 'book_appointment', arguments: { slot_id: 'x' } } }],
      })[0]?.args,
    ).toEqual({ slot_id: 'x' });
  });

  it('reads the nested toolCall shape', () => {
    expect(
      toolCallsFrom({
        toolWithToolCallList: [
          { toolCall: { id: 'c2', function: { name: 'check_availability', arguments: '{}' } } },
        ],
      }),
    ).toEqual([{ id: 'c2', name: 'check_availability', args: {} }]);
  });

  it('survives arguments the model produced badly', () => {
    // Empty args make the tool ask for what is missing, which is recoverable on
    // a call. Guessing at the intent would not be.
    const parsed = toolCallsFrom({
      toolCallList: [{ id: 'c3', function: { name: 'book_appointment', arguments: '{not json' } }],
    });
    expect(parsed).toEqual([{ id: 'c3', name: 'book_appointment', args: {} }]);
  });

  it('drops entries with no id or no name rather than inventing one', () => {
    // A result with a made-up toolCallId would never reach the model, leaving
    // it waiting mid-sentence.
    expect(
      toolCallsFrom({
        toolCallList: [
          { function: { name: 'check_availability' } },
          { id: 'c4', function: {} },
          { id: 'c5', function: { name: '' } },
        ],
      }),
    ).toEqual([]);
  });

  it('returns nothing for a message with no tool calls', () => {
    expect(toolCallsFrom({})).toEqual([]);
    expect(toolCallsFrom({ type: 'tool-calls' })).toEqual([]);
  });
});

/**
 * "That time is no longer free" was returned for every unbookable request,
 * including times the model invented. The receptionist then tells the caller
 * someone just took it — a history for a time that never existed, and a
 * business that sounds busier than it is.
 */
describe('classifyUnbookable', () => {
  const now = '2026-09-02T13:00:00Z';
  const base = { nowISO: now, horizonDays: 30, alreadyBooked: false };

  it('knows a genuinely taken time from one that was never offered', () => {
    expect(classifyUnbookable({ ...base, slotId: '2026-09-03T14:00:00Z', alreadyBooked: true })).toBe(
      'taken',
    );
    expect(classifyUnbookable({ ...base, slotId: '2026-09-03T14:07:00Z' })).toBe('not_offered');
  });

  it('recognises a time that is not a time', () => {
    expect(classifyUnbookable({ ...base, slotId: 'next Tuesday' })).toBe('not_a_time');
    expect(classifyUnbookable({ ...base, slotId: '' })).toBe('not_a_time');
  });

  it('recognises the past', () => {
    expect(classifyUnbookable({ ...base, slotId: '2026-09-01T14:00:00Z' })).toBe('in_the_past');
  });

  it('recognises further ahead than the business books', () => {
    expect(classifyUnbookable({ ...base, slotId: '2027-01-01T14:00:00Z' })).toBe('beyond_horizon');
    // And respects the organisation's own setting rather than a constant.
    expect(
      classifyUnbookable({ ...base, horizonDays: 2, slotId: '2026-09-10T14:00:00Z' }),
    ).toBe('beyond_horizon');
  });

  it('gives each case its own sentence, and never claims a time was taken unless it was', () => {
    const sentences = (
      ['not_a_time', 'in_the_past', 'beyond_horizon', 'taken', 'not_offered'] as const
    ).map(unbookableSentence);

    expect(new Set(sentences).size).toBe(5);
    for (const s of sentences) expect(s).toContain('nothing was booked');

    const takenClaims = sentences.filter((s) => /taken/i.test(s));
    expect(takenClaims).toEqual(['That time was taken while we were talking, and nothing was booked.']);
  });
});
