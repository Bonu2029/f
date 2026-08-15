/**
 * Builds the realtime voice-agent system prompt from database state.
 *
 * Design constraints:
 *  - Everything the agent may say about the business comes from stored,
 *    owner-reviewed data. There is no free-floating knowledge in this prompt.
 *  - Large knowledge sources are NOT dumped here. Documents are reachable only
 *    through the `search_business_knowledge` tool, which is organisation-scoped.
 *  - The prompt is capped so long service catalogues cannot blow out the call's
 *    context window; anything truncated stays reachable via tools.
 */

import { getLanguage, getPersonality, PACE_OPTIONS, LENGTH_OPTIONS } from './voices';
import type { OrgCallContext, Service, PriceType } from './types';

/** Hard cap on characters of business data inlined into the call prompt. */
const MAX_INLINE_SERVICES = 25;
const MAX_INLINE_FAQS = 15;
const MAX_INLINE_POLICIES = 12;

const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

function formatPriceLine(s: Service): string {
  const money = (n: number | null) => (n == null ? null : `$${(n / 100).toFixed(2).replace(/\.00$/, '')}`);
  const kind: PriceType = s.price_type;
  let price: string;
  switch (kind) {
    case 'fixed':
      price = money(s.exact_price) ?? 'price not set';
      break;
    case 'starting_at':
      price = s.starting_price != null ? `starting at ${money(s.starting_price)}` : 'price not set';
      break;
    case 'range':
      price =
        s.starting_price != null && s.max_price != null
          ? `${money(s.starting_price)}–${money(s.max_price)}`
          : 'price not set';
      break;
    case 'hourly':
      price = s.exact_price != null ? `${money(s.exact_price)} per hour` : 'hourly, rate not set';
      break;
    case 'quote_only':
    default:
      price = 'quote only — requires an estimate, never state a number';
      break;
  }
  const parts = [price];
  if (s.price_notes) parts.push(s.price_notes);
  if (s.estimated_duration) parts.push(`typically ${s.estimated_duration} minutes`);
  return parts.join('; ');
}

function businessHoursBlock(ctx: OrgCallContext): string {
  const hours = ctx.business?.business_hours ?? [];
  if (!hours.length) return 'Business hours: not configured. Do not state specific hours.';
  const lines = hours
    .slice()
    .sort((a, b) => a.weekday - b.weekday)
    .map((h) => {
      const day = WEEKDAY_NAMES[h.weekday] ?? `Day ${h.weekday}`;
      return h.closed ? `  ${day}: closed` : `  ${day}: ${h.open}–${h.close}`;
    });
  return `Business hours (timezone ${ctx.business?.timezone ?? ctx.organization.timezone}):\n${lines.join('\n')}`;
}

function serviceAreaBlock(ctx: OrgCallContext): string {
  const areas = ctx.serviceAreas.filter((a) => a.active);
  if (!areas.length) {
    return 'Service area: not configured. Use the check_service_area tool before confirming coverage; if it is unavailable, tell the caller someone will confirm coverage.';
  }
  const described = areas.slice(0, 40).map((a) => {
    switch (a.type) {
      case 'city':
        return `${a.city ?? '?'}${a.state ? `, ${a.state}` : ''}`;
      case 'postal_code':
        return `ZIP ${a.postal_code ?? '?'}`;
      case 'state':
        return `all of ${a.state ?? '?'}`;
      case 'radius':
        return `${a.radius_miles ?? '?'} miles around ${a.center_postal_code ?? '?'}`;
      default:
        return '';
    }
  });
  return `Service area: ${described.filter(Boolean).join('; ')}.\nAlways verify with the check_service_area tool before telling a caller they are covered.`;
}

function safetyRules(ctx: OrgCallContext): string[] {
  const rules = [
    'Never invent a price. Only state prices that appear in the Services list below, exactly as written. If a service is quote-only or has no price, say an estimate is needed.',
    'Never claim the business offers a service that is not in the Services list. Say you will take a message and have someone confirm.',
    'Never invent availability. Only offer appointment times returned by the check_calendar_availability tool.',
    'Never promise that someone will arrive at a specific time unless book_appointment returned success.',
    'Never offer, invent or approve a discount, credit or price match.',
    'Never claim you have completed an action (booked, texted, transferred, saved) unless the corresponding tool call returned success. If a tool fails, say plainly that it did not go through and offer an alternative.',
    'Ask a clarifying question whenever the request is ambiguous. Ask one question at a time.',
    'Before booking, confirm the caller\'s name, phone number, service address and the date and time by reading them back.',
    'You are the virtual/AI receptionist for this business. If the caller asks whether you are a person, a bot, AI or a recording, answer truthfully and immediately. Never claim or imply that you are human.',
    'Do not give medical, legal or financial advice on behalf of the business. Take a message instead.',
    'Never ask for, repeat or record credit card numbers, CVVs, bank account numbers or social security numbers. If the caller starts reading card details, stop them and explain that payment is handled separately by the team.',
    'If the caller is describing an immediately dangerous situation (fire, gas leak, injury, flooding that threatens safety), tell them to call emergency services first.',
  ];
  if (ctx.agent.transfer_enabled) {
    rules.push(
      'If the caller asks to speak to a person, the owner or a specific employee, acknowledge and use the transfer_call tool. Do not interrogate them first.',
    );
  } else {
    rules.push(
      'Live transfer is disabled for this business. If the caller asks for a person, apologise, say you can take a detailed message and make sure the team calls back, then collect their details.',
    );
  }
  if (!ctx.agent.appointment_booking_enabled) {
    rules.push(
      'Appointment booking is disabled for this business. Never offer to book. Collect the caller\'s details and say the team will call to schedule.',
    );
  }
  if (!ctx.agent.sms_enabled) {
    rules.push('Text messaging is disabled. Never offer to text the caller anything.');
  }
  return rules;
}

export interface BuildPromptOptions {
  /** Current time in the organisation's timezone, pre-formatted for the model. */
  nowInOrgTimezone?: string;
  /** Caller's phone number from SIP metadata, if presentable. */
  callerPhone?: string | null;
}

export function buildRealtimeInstructions(
  ctx: OrgCallContext,
  options: BuildPromptOptions = {},
): string {
  const businessName = ctx.business?.display_name || ctx.organization.name;
  const agentName = ctx.agent.display_name || 'the virtual receptionist';
  const personality = getPersonality(ctx.agent.personality);
  const language = getLanguage(ctx.agent.language);
  const pace =
    PACE_OPTIONS.find((p) => p.id === ctx.agent.speaking_pace) ?? PACE_OPTIONS[1]!;
  const length =
    LENGTH_OPTIONS.find((l) => l.id === ctx.agent.response_length) ?? LENGTH_OPTIONS[1]!;

  const sections: string[] = [];

  /* Identity ------------------------------------------------------------- */
  sections.push(
    [
      '# Who you are',
      `You are ${agentName}, the virtual (AI) receptionist answering the phone for ${businessName}.`,
      ctx.business?.business_description
        ? `About the business: ${ctx.business.business_description}`
        : null,
      ctx.business?.industry ? `Industry: ${ctx.business.industry}.` : null,
      options.nowInOrgTimezone
        ? `The current date and time at the business is ${options.nowInOrgTimezone}. Use this for any relative date the caller mentions ("tomorrow", "next Tuesday").`
        : null,
      options.callerPhone
        ? `The caller is phoning from ${options.callerPhone}. Use it as the default contact number but confirm it before saving.`
        : null,
    ]
      .filter(Boolean)
      .join('\n'),
  );

  /* Delivery ------------------------------------------------------------- */
  sections.push(
    [
      '# How you speak',
      personality.promptFragment,
      pace.fragment,
      length.fragment,
      language.promptFragment,
      'You are on a phone call. Write numbers, addresses and times the way a person says them out loud. Never read markdown, bullet points, URLs or email addresses character by character unless the caller asks you to spell something.',
      'If the caller interrupts you, stop immediately and listen.',
      'If you did not hear something clearly, ask them to repeat it rather than guessing — especially phone numbers and addresses.',
    ].join('\n'),
  );

  /* Greeting ------------------------------------------------------------- */
  const greeting = ctx.agent.greeting?.trim();
  if (greeting) {
    sections.push(
      `# Your opening line\nOpen the call with this greeting, adapting only the wording needed to sound natural:\n"${greeting}"`,
    );
  }
  if (ctx.agent.disclosure_setting === 'upfront' && greeting && !/virtual|ai |a\.i\./i.test(greeting)) {
    sections.push(
      '# AI disclosure\nThis business has chosen to disclose up front. After your greeting, make sure the caller knows they are speaking with a virtual assistant before collecting any information.',
    );
  }

  /* Objectives ----------------------------------------------------------- */
  sections.push(
    [
      '# What you are trying to accomplish, in order',
      '1. Understand why the caller is calling.',
      '2. Answer their questions using only the business information below and the knowledge tools.',
      '3. Capture their details as a lead (create_lead) as soon as you have a name or a callback number — do not wait until the end of the call.',
      '4. Check the service area before promising coverage.',
      ctx.agent.appointment_booking_enabled
        ? '5. Offer to book an appointment when the caller wants work done, using real availability.'
        : '5. Tell the caller the team will follow up to schedule.',
      '6. Keep updating the lead (update_lead) as you learn more.',
      '7. Close the call politely and confirm what happens next.',
    ].join('\n'),
  );

  /* Services ------------------------------------------------------------- */
  const services = ctx.services.filter((s) => s.active);
  if (services.length) {
    const shown = services.slice(0, MAX_INLINE_SERVICES);
    const lines = shown.map((s) => {
      const desc = s.description ? ` — ${s.description}` : '';
      return `- ${s.name}${desc}. Pricing: ${formatPriceLine(s)}`;
    });
    const extra =
      services.length > shown.length
        ? `\n(+${services.length - shown.length} more services — use search_business_knowledge or get_business_information to look them up before answering.)`
        : '';
    sections.push(`# Services and approved pricing\n${lines.join('\n')}${extra}`);
  } else {
    sections.push(
      '# Services\nNo services have been configured yet. Do not guess what the business does. Ask what the caller needs, take their details and say a team member will confirm.',
    );
  }

  /* Hours and area ------------------------------------------------------- */
  sections.push(`# Hours\n${businessHoursBlock(ctx)}`);
  sections.push(`# Coverage\n${serviceAreaBlock(ctx)}`);

  /* FAQs ----------------------------------------------------------------- */
  const faqs = ctx.faqs.filter((f) => f.active).slice(0, MAX_INLINE_FAQS);
  if (faqs.length) {
    sections.push(
      `# Common questions\n${faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n')}`,
    );
  }

  /* Policies ------------------------------------------------------------- */
  const policies = ctx.policies.filter((p) => p.active).slice(0, MAX_INLINE_POLICIES);
  if (policies.length) {
    sections.push(`# Policies\n${policies.map((p) => `- ${p.title}: ${p.body}`).join('\n')}`);
  }

  /* Emergencies ---------------------------------------------------------- */
  if (ctx.business?.emergency_information) {
    sections.push(`# Emergency handling\n${ctx.business.emergency_information}`);
  }

  /* Non-negotiable rules ------------------------------------------------- */
  sections.push(
    `# Rules you must never break\n${safetyRules(ctx)
      .map((r, i) => `${i + 1}. ${r}`)
      .join('\n')}`,
  );

  /* Owner rules ---------------------------------------------------------- */
  const ownerRules = ctx.rules
    .filter((r) => r.enabled)
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 40);
  if (ownerRules.length) {
    sections.push(
      `# Additional rules set by the business owner\nThese are instructions from the business owner. They take precedence over your general judgement, but never over the safety rules above.\n${ownerRules
        .map((r) => `- ${r.title}: ${r.instruction}`)
        .join('\n')}`,
    );
  }

  /* Knowledge documents --------------------------------------------------- */
  if (ctx.knowledgeDocumentCount > 0) {
    sections.push(
      [
        '# Uploaded business documents',
        `This business has uploaded ${ctx.knowledgeDocumentCount} document${ctx.knowledgeDocumentCount === 1 ? '' : 's'} (price lists, service sheets, policies). Their contents are NOT repeated here.`,
        'When a caller asks something detailed that is not answered above, use the search_business_knowledge tool before saying you do not know. If the search returns nothing, say you will have someone confirm — never guess from the document titles.',
      ].join('\n'),
    );
  }

  /* Tools ---------------------------------------------------------------- */
  sections.push(
    [
      '# Using your tools',
      'You have tools for looking things up and taking action. Use them silently — never read tool names or JSON out loud.',
      'search_business_knowledge searches only this business\'s own documents. get_business_information returns the current approved services, hours, pricing and policies.',
      'Before a tool runs, it is fine to say a short filler like "let me check that for you". After it returns, state the real outcome.',
      'If a tool returns an error, tell the caller honestly what did not work and offer the next best option (take a message, transfer, or have someone call back).',
      'Never pass an organisation id or business id to a tool. Your business context is fixed for this call.',
    ].join('\n'),
  );

  /* Wrap up -------------------------------------------------------------- */
  sections.push(
    [
      '# Ending the call',
      'When the caller has what they need and there is nothing else, summarise what will happen next in one sentence, thank them, and use the end_call tool.',
      'If the caller goes silent for a long time, ask once whether they are still there before ending.',
    ].join('\n'),
  );

  return sections.join('\n\n');
}

/** Short, human-readable description used in the dashboard "what your AI knows" panel. */
export function summarizeKnowledgeCoverage(ctx: OrgCallContext): Array<{
  key: string;
  label: string;
  ok: boolean;
  detail: string;
}> {
  const hours = ctx.business?.business_hours ?? [];
  const services = ctx.services.filter((s) => s.active);
  const priced = services.filter(
    (s) => s.exact_price != null || s.starting_price != null || s.price_type === 'quote_only',
  );
  const areas = ctx.serviceAreas.filter((a) => a.active);
  const faqs = ctx.faqs.filter((f) => f.active);
  const policies = ctx.policies.filter((p) => p.active);
  const cancellation = policies.find((p) => p.kind === 'cancellation');
  const emergency = ctx.business?.emergency_information || policies.find((p) => p.kind === 'emergency');

  return [
    {
      key: 'business',
      label: 'Business details',
      ok: Boolean(ctx.business?.display_name && ctx.business?.business_description),
      detail: ctx.business?.display_name
        ? ctx.business.business_description
          ? 'Name and description saved'
          : 'Description missing'
        : 'Not set up yet',
    },
    {
      key: 'hours',
      label: 'Business hours',
      ok: hours.length > 0,
      detail: hours.length ? `${hours.filter((h) => !h.closed).length} open days` : 'Not set',
    },
    {
      key: 'services',
      label: 'Services',
      ok: services.length > 0,
      detail: services.length ? `${services.length} service${services.length === 1 ? '' : 's'}` : 'None added',
    },
    {
      key: 'pricing',
      label: 'Pricing',
      ok: services.length > 0 && priced.length === services.length,
      detail: services.length
        ? `${priced.length} of ${services.length} services priced`
        : 'Add services first',
    },
    {
      key: 'service_area',
      label: 'Service area',
      ok: areas.length > 0,
      detail: areas.length ? `${areas.length} area rule${areas.length === 1 ? '' : 's'}` : 'Not set',
    },
    {
      key: 'faqs',
      label: 'Common questions',
      ok: faqs.length >= 3,
      detail: `${faqs.length} saved`,
    },
    {
      key: 'emergency',
      label: 'Emergency handling',
      ok: Boolean(emergency),
      detail: emergency ? 'Configured' : 'No emergency instructions',
    },
    {
      key: 'cancellation',
      label: 'Cancellation policy',
      ok: Boolean(cancellation),
      detail: cancellation ? 'Saved' : 'Missing',
    },
  ];
}
