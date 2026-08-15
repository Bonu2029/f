import { describe, expect, it } from 'vitest';
import {
  REALTIME_TOOLS,
  buildRealtimeInstructions,
  summarizeKnowledgeCoverage,
  toolArgSchemas,
  toolFail,
  toolOk,
  toolsForAgent,
  type OrgCallContext,
} from '@afd/shared';

function context(over: Partial<OrgCallContext> = {}): OrgCallContext {
  const now = new Date().toISOString();
  return {
    organization: {
      id: 'org-1',
      name: "Daniel's HVAC",
      timezone: 'America/New_York',
      status: 'active',
      ai_paused: false,
    },
    business: {
      id: 'bp-1',
      organization_id: 'org-1',
      legal_name: null,
      display_name: "Daniel's HVAC",
      industry: 'hvac',
      website: null,
      public_phone: '+12155550100',
      email: null,
      address: null,
      city: 'Philadelphia',
      state: 'PA',
      postal_code: '19102',
      country: 'US',
      timezone: 'America/New_York',
      business_description: 'Residential heating and cooling.',
      business_hours: [{ weekday: 1, closed: false, open: '08:00', close: '17:00' }],
      emergency_information: 'No heat below 40°F is an emergency.',
      emergency_phone: '+12155550111',
      created_at: now,
      updated_at: now,
    },
    agent: {
      id: 'agent-1',
      organization_id: 'org-1',
      display_name: 'Mia',
      voice: 'marin',
      language: 'en',
      personality: 'friendly',
      speaking_pace: 'natural',
      response_length: 'balanced',
      greeting: "Thanks for calling Daniel's HVAC. This is Mia.",
      instructions: null,
      active: true,
      transfer_enabled: true,
      transfer_phone: '+12155550111',
      sms_enabled: true,
      appointment_booking_enabled: true,
      photo_requests_enabled: true,
      disclosure_setting: 'upfront',
      fallback_phone: null,
      created_at: now,
      updated_at: now,
    },
    services: [
      {
        id: 's1',
        organization_id: 'org-1',
        name: 'AC repair',
        description: 'Diagnostic and repair.',
        price_type: 'starting_at',
        starting_price: 14900,
        exact_price: null,
        max_price: null,
        price_notes: 'Waived if you proceed',
        estimated_duration: 90,
        active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 's2',
        organization_id: 'org-1',
        name: 'Commercial RTU service',
        description: null,
        price_type: 'quote_only',
        starting_price: null,
        exact_price: null,
        max_price: null,
        price_notes: null,
        estimated_duration: null,
        active: true,
        created_at: now,
        updated_at: now,
      },
    ],
    faqs: [
      {
        id: 'f1',
        organization_id: 'org-1',
        question: 'Do you charge for estimates?',
        answer: 'Replacement estimates are free.',
        active: true,
        created_at: now,
        updated_at: now,
      },
    ],
    policies: [
      {
        id: 'p1',
        organization_id: 'org-1',
        kind: 'cancellation',
        title: 'Cancellation policy',
        body: 'Cancel up to 2 hours before.',
        active: true,
        created_at: now,
        updated_at: now,
      },
    ],
    serviceAreas: [
      {
        id: 'a1',
        organization_id: 'org-1',
        type: 'postal_code',
        city: null,
        state: null,
        postal_code: '19020',
        center_postal_code: null,
        radius_miles: null,
        active: true,
        created_at: now,
      },
    ],
    rules: [
      {
        id: 'r1',
        organization_id: 'org-1',
        title: 'No same-day installs',
        instruction: 'Never schedule an installation for the same day.',
        priority: 90,
        enabled: true,
        is_system: false,
        created_at: now,
        updated_at: now,
      },
    ],
    subscription: { plan: 'founder', status: 'active', included_minutes: 200, used_minutes: 0 },
    calendarConnected: true,
    knowledgeDocumentCount: 2,
    ...over,
  };
}

describe('realtime prompt construction', () => {
  it('includes the business identity and description', () => {
    const prompt = buildRealtimeInstructions(context());
    expect(prompt).toContain("Daniel's HVAC");
    expect(prompt).toContain('Mia');
    expect(prompt).toContain('Residential heating and cooling.');
  });

  it('includes only stored prices, formatted for speech', () => {
    const prompt = buildRealtimeInstructions(context());
    expect(prompt).toContain('AC repair');
    expect(prompt).toContain('starting at $149');
    // Quote-only services must never carry an invented number.
    expect(prompt).toContain('quote only');
  });

  it('always carries the non-negotiable safety rules', () => {
    const prompt = buildRealtimeInstructions(context());
    expect(prompt).toMatch(/Never invent a price/i);
    expect(prompt).toMatch(/Never invent availability/i);
    expect(prompt).toMatch(/Never claim you have completed an action/i);
    expect(prompt).toMatch(/Never claim or imply that you are human/i);
    expect(prompt).toMatch(/credit card|card numbers/i);
  });

  it('includes the owner\'s own rules', () => {
    expect(buildRealtimeInstructions(context())).toContain('Never schedule an installation for the same day.');
  });

  it('tells the agent it cannot transfer when transfers are off', () => {
    const ctx = context();
    ctx.agent.transfer_enabled = false;
    const prompt = buildRealtimeInstructions(ctx);
    expect(prompt).toMatch(/Live transfer is disabled/i);
  });

  it('tells the agent not to book when booking is off', () => {
    const ctx = context();
    ctx.agent.appointment_booking_enabled = false;
    expect(buildRealtimeInstructions(ctx)).toMatch(/Appointment booking is disabled/i);
  });

  it('refuses to guess when no services are configured', () => {
    const ctx = context({ services: [] });
    const prompt = buildRealtimeInstructions(ctx);
    expect(prompt).toMatch(/Do not guess what the business does/i);
  });

  it('does not dump documents into the prompt', () => {
    const prompt = buildRealtimeInstructions(context());
    // Knowledge documents are reachable only through the search tool.
    expect(prompt).toContain('search_business_knowledge');
    expect(prompt.length).toBeLessThan(20_000);
  });

  it('caps the prompt even with a very large service catalogue', () => {
    const base = context();
    const many = Array.from({ length: 200 }, (_, i) => ({
      ...base.services[0]!,
      id: `s${i}`,
      name: `Service ${i}`,
    }));
    const prompt = buildRealtimeInstructions(context({ services: many }));
    expect(prompt).toContain('more services');
    expect(prompt.length).toBeLessThan(30_000);
  });

  it('passes the current time and caller number through when supplied', () => {
    const prompt = buildRealtimeInstructions(context(), {
      nowInOrgTimezone: 'Monday, August 17, 2026 at 1:00 PM EDT',
      callerPhone: '+12155550143',
    });
    expect(prompt).toContain('Monday, August 17, 2026');
    expect(prompt).toContain('+12155550143');
  });

  it('warns the agent when the service area cannot be verified', () => {
    const prompt = buildRealtimeInstructions(context({ serviceAreas: [] }));
    expect(prompt).toMatch(/check_service_area/);
  });
});

describe('tool exposure follows the owner\'s switches', () => {
  it('exposes everything when all capabilities are on', () => {
    const names = toolsForAgent({
      transfer_enabled: true,
      sms_enabled: true,
      appointment_booking_enabled: true,
      photo_requests_enabled: true,
    }).map((t) => t.name);
    expect(names).toEqual(REALTIME_TOOLS.map((t) => t.name));
  });

  it('hides transfer when transfers are off', () => {
    const names = toolsForAgent({
      transfer_enabled: false,
      sms_enabled: true,
      appointment_booking_enabled: true,
      photo_requests_enabled: true,
    }).map((t) => t.name);
    expect(names).not.toContain('transfer_call');
  });

  it('hides booking tools when booking is off', () => {
    const names = toolsForAgent({
      transfer_enabled: true,
      sms_enabled: true,
      appointment_booking_enabled: false,
      photo_requests_enabled: true,
    }).map((t) => t.name);
    expect(names).not.toContain('book_appointment');
    expect(names).not.toContain('check_calendar_availability');
  });

  it('hides photo requests when SMS is off, even if photos are enabled', () => {
    const names = toolsForAgent({
      transfer_enabled: true,
      sms_enabled: false,
      appointment_booking_enabled: true,
      photo_requests_enabled: true,
    }).map((t) => t.name);
    expect(names).not.toContain('send_sms');
    expect(names).not.toContain('send_photo_request');
  });
});

describe('tool schemas', () => {
  it('never accepts an organisation id from the model', () => {
    for (const tool of REALTIME_TOOLS) {
      const properties = Object.keys(
        (tool.parameters as { properties?: Record<string, unknown> }).properties ?? {},
      );
      expect(properties).not.toContain('organization_id');
      expect(properties).not.toContain('org_id');
      expect(properties).not.toContain('business_id');
    }
  });

  it('has a validation schema for every advertised tool', () => {
    for (const tool of REALTIME_TOOLS) {
      expect(toolArgSchemas[tool.name as keyof typeof toolArgSchemas]).toBeDefined();
    }
  });

  it('rejects a malformed lead id', () => {
    const result = toolArgSchemas.update_lead.safeParse({ lead_id: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('accepts a well-formed booking', () => {
    const result = toolArgSchemas.book_appointment.safeParse({
      start_at: '2026-08-17T17:00:00.000Z',
      customer_name: 'John Smith',
      duration_minutes: 90,
    });
    expect(result.success).toBe(true);
  });

  it('rejects a booking with no customer name', () => {
    expect(
      toolArgSchemas.book_appointment.safeParse({ start_at: '2026-08-17T17:00:00.000Z' }).success,
    ).toBe(false);
  });

  it('rejects a malformed requested date', () => {
    expect(
      toolArgSchemas.check_calendar_availability.safeParse({ requested_date: '17/08/2026' }).success,
    ).toBe(false);
  });

  it('caps SMS body length', () => {
    expect(toolArgSchemas.send_sms.safeParse({ body: 'x'.repeat(601) }).success).toBe(false);
    expect(toolArgSchemas.send_sms.safeParse({ body: 'Short message' }).success).toBe(true);
  });
});

describe('tool result envelope', () => {
  it('marks success explicitly', () => {
    const result = toolOk({ lead_id: 'abc' }, 'Saved.');
    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ lead_id: 'abc' });
  });

  it('makes failure unambiguous and tells the model to be honest', () => {
    const result = toolFail('Database unavailable');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Database unavailable');
    expect(result.message).toMatch(/honestly/i);
  });
});

describe('knowledge coverage panel', () => {
  it('reports what is configured and what is missing', () => {
    const coverage = summarizeKnowledgeCoverage(context());
    const byKey = Object.fromEntries(coverage.map((c) => [c.key, c]));
    expect(byKey.services!.ok).toBe(true);
    expect(byKey.hours!.ok).toBe(true);
    expect(byKey.cancellation!.ok).toBe(true);
    // Only one FAQ, so the panel flags it rather than claiming completeness.
    expect(byKey.faqs!.ok).toBe(false);
  });

  it('flags an empty business as unconfigured', () => {
    const coverage = summarizeKnowledgeCoverage(
      context({ services: [], faqs: [], policies: [], serviceAreas: [], business: null }),
    );
    expect(coverage.every((c) => !c.ok)).toBe(true);
  });
});
