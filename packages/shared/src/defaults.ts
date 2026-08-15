/**
 * Industry catalogue, default receptionist rules and onboarding definitions.
 *
 * Industries are a *hint* used to seed sensible defaults and example questions.
 * Nothing in the product is hard-coded to a single industry — "other" is always
 * valid and every field remains editable.
 */

export interface Industry {
  readonly id: string;
  readonly label: string;
  /** Seed services suggested during onboarding. Owner reviews before saving. */
  readonly suggestedServices: readonly string[];
  /** Extra intake questions the AI should ask for this trade. */
  readonly intakeQuestions: readonly string[];
  readonly emergencyExample: string;
}

export const INDUSTRIES: readonly Industry[] = [
  {
    id: 'roofing',
    label: 'Roofing',
    suggestedServices: ['Roof repair', 'Roof replacement', 'Roof inspection', 'Gutter installation', 'Storm damage assessment'],
    intakeQuestions: [
      'Is the roof actively leaking right now?',
      'Roughly how old is the roof?',
      'Is this a single-family home, multi-family or commercial building?',
      'How many stories is the building?',
    ],
    emergencyExample:
      'Active leaks during rain and storm damage are emergencies. Collect the address, ask for photos, and transfer to the on-call number.',
  },
  {
    id: 'windows_doors',
    label: 'Windows & Doors',
    suggestedServices: ['Window replacement', 'Door installation', 'Glass repair', 'Screen repair', 'Patio door installation'],
    intakeQuestions: [
      'How many windows or doors are involved?',
      'Is any glass broken or is the opening unsecured right now?',
      'Do you know the approximate sizes?',
    ],
    emergencyExample: 'A broken window or door that leaves the property unsecured is urgent — transfer the call.',
  },
  {
    id: 'hvac',
    label: 'HVAC',
    suggestedServices: ['AC repair', 'AC installation', 'Furnace repair', 'Furnace installation', 'Maintenance tune-up', 'Duct cleaning'],
    intakeQuestions: [
      'Is the system running at all, or completely off?',
      'Is anyone in the home at risk from the temperature right now?',
      'What brand and roughly what age is the unit?',
      'Is this for heating or cooling?',
    ],
    emergencyExample:
      'No heat below freezing, no cooling in extreme heat, or any suspected gas smell is an emergency. Tell callers who smell gas to leave and call the gas company or 911 first.',
  },
  {
    id: 'plumbing',
    label: 'Plumbing',
    suggestedServices: ['Leak repair', 'Drain cleaning', 'Water heater repair', 'Water heater installation', 'Toilet repair', 'Repiping'],
    intakeQuestions: [
      'Is water actively running or flooding right now?',
      'Do you know where your main shut-off valve is?',
      'Which fixtures are affected?',
    ],
    emergencyExample: 'Active flooding, burst pipes and sewage backups are emergencies — transfer immediately.',
  },
  {
    id: 'cleaning',
    label: 'Cleaning Services',
    suggestedServices: ['Standard house cleaning', 'Deep cleaning', 'Move-in/move-out cleaning', 'Recurring cleaning', 'Post-construction cleaning'],
    intakeQuestions: [
      'How many bedrooms and bathrooms?',
      'Roughly what square footage?',
      'Is this one-time or recurring?',
      'Are there pets in the home?',
    ],
    emergencyExample: 'Cleaning work is rarely an emergency; treat same-day requests as urgent instead.',
  },
  {
    id: 'landscaping',
    label: 'Landscaping & Lawn',
    suggestedServices: ['Lawn mowing', 'Landscape design', 'Tree trimming', 'Mulching', 'Irrigation repair', 'Snow removal'],
    intakeQuestions: ['Roughly how large is the property?', 'Is this a one-time job or ongoing service?'],
    emergencyExample: 'A fallen tree blocking access or threatening a structure is an emergency.',
  },
  {
    id: 'painting',
    label: 'Painting',
    suggestedServices: ['Interior painting', 'Exterior painting', 'Cabinet refinishing', 'Deck staining', 'Drywall repair'],
    intakeQuestions: ['Interior, exterior or both?', 'How many rooms or what square footage?', 'Is any prep or repair work needed?'],
    emergencyExample: 'Painting is not usually an emergency service.',
  },
  {
    id: 'electrical',
    label: 'Electrical',
    suggestedServices: ['Electrical repair', 'Panel upgrade', 'Outlet & switch installation', 'Lighting installation', 'EV charger installation', 'Generator installation'],
    intakeQuestions: [
      'Is there any burning smell, smoke or sparking?',
      'Is the power out to part or all of the property?',
      'How old is the electrical panel?',
    ],
    emergencyExample:
      'Sparking, burning smells, smoke or exposed live wiring are emergencies. Tell the caller to call 911 if there is any sign of fire, then transfer.',
  },
  {
    id: 'general_contracting',
    label: 'General Contracting',
    suggestedServices: ['Kitchen remodel', 'Bathroom remodel', 'Home addition', 'Basement finishing', 'General repairs'],
    intakeQuestions: ['What is the scope of the project?', 'Do you have a budget range in mind?', 'What is your ideal timeline?'],
    emergencyExample: 'Structural damage or an unsafe building condition is an emergency.',
  },
  {
    id: 'remodeling',
    label: 'Remodeling',
    suggestedServices: ['Kitchen remodel', 'Bathroom remodel', 'Flooring installation', 'Tile work', 'Custom carpentry'],
    intakeQuestions: ['Which rooms are involved?', 'Have you had a design done already?', 'What is your target start date?'],
    emergencyExample: 'Remodeling is rarely an emergency service.',
  },
  {
    id: 'handyman',
    label: 'Handyman',
    suggestedServices: ['General repairs', 'Furniture assembly', 'TV mounting', 'Drywall patching', 'Fixture replacement'],
    intakeQuestions: ['What needs to be fixed?', 'Do you have the parts or materials already?'],
    emergencyExample: 'Treat anything unsafe — a hanging fixture, an unsecured door — as urgent.',
  },
  {
    id: 'auto_detailing',
    label: 'Auto Detailing',
    suggestedServices: ['Full detail', 'Interior detail', 'Exterior detail', 'Ceramic coating', 'Paint correction'],
    intakeQuestions: ['What year, make and model is the vehicle?', 'Mobile service at your location, or drop-off?'],
    emergencyExample: 'Detailing is not an emergency service.',
  },
  {
    id: 'pest_control',
    label: 'Pest Control',
    suggestedServices: ['General pest treatment', 'Termite inspection', 'Rodent control', 'Bed bug treatment', 'Recurring service'],
    intakeQuestions: ['What kind of pest are you seeing?', 'How long has this been going on?', 'Are there pets or small children in the home?'],
    emergencyExample: 'Wasp or hornet nests near an entrance, or a stinging-insect allergy in the home, are urgent.',
  },
  {
    id: 'garage_doors',
    label: 'Garage Doors',
    suggestedServices: ['Garage door repair', 'Spring replacement', 'Opener installation', 'New door installation'],
    intakeQuestions: ['Is the door stuck open or stuck closed?', 'Is a vehicle trapped inside?'],
    emergencyExample: 'A door stuck open overnight leaves the property unsecured — treat as urgent.',
  },
  {
    id: 'other',
    label: 'Other local service business',
    suggestedServices: [],
    intakeQuestions: ['What service are you looking for?', 'When do you need it done?'],
    emergencyExample: 'Define which situations should be treated as an emergency for your business.',
  },
];

export function getIndustry(id: string | null | undefined): Industry {
  return INDUSTRIES.find((i) => i.id === id) ?? INDUSTRIES[INDUSTRIES.length - 1]!;
}

/* -------------------------------------------------------------------------- */
/* Default receptionist rules                                                 */
/* -------------------------------------------------------------------------- */

export interface DefaultRule {
  readonly title: string;
  readonly instruction: string;
  readonly priority: number;
  /** System rules are always applied and cannot be deleted, only reworded. */
  readonly is_system: boolean;
}

/**
 * Seeded into `ai_rules` when an organisation is created. The system rules
 * mirror the hard-coded safety block in the prompt builder so owners can see
 * exactly what their receptionist will and will not do.
 */
export const DEFAULT_AI_RULES: readonly DefaultRule[] = [
  {
    title: 'Never invent prices',
    instruction:
      'Only quote prices that are stored in the services list. If a price is not stored, say an estimate is required.',
    priority: 10,
    is_system: true,
  },
  {
    title: 'Never invent services',
    instruction:
      'Only confirm services that appear in the business knowledge. Otherwise take a message for the team.',
    priority: 20,
    is_system: true,
  },
  {
    title: 'Never invent availability',
    instruction: 'Only offer appointment times returned by the calendar availability tool.',
    priority: 30,
    is_system: true,
  },
  {
    title: 'Confirm details before booking',
    instruction:
      'Read back the caller name, phone number, address and appointment time before booking anything.',
    priority: 40,
    is_system: true,
  },
  {
    title: 'Answer truthfully about being AI',
    instruction:
      'If a caller asks whether they are speaking with a person, say immediately that you are the business\'s virtual receptionist. Never claim to be human.',
    priority: 50,
    is_system: true,
  },
  {
    title: 'Never take card numbers',
    instruction:
      'Do not ask for or repeat credit card, bank or social security numbers. Explain that payment is handled separately by the team.',
    priority: 60,
    is_system: true,
  },
  {
    title: 'Escalate emergencies',
    instruction:
      'If the caller describes an emergency, prioritise it: collect the address, then transfer to the emergency contact if transfers are enabled.',
    priority: 70,
    is_system: false,
  },
  {
    title: 'Ask whether the caller owns the property',
    instruction:
      'For work at a residence, politely confirm whether the caller owns the property or is a tenant, and note it on the lead.',
    priority: 80,
    is_system: false,
  },
];

/* -------------------------------------------------------------------------- */
/* Greeting                                                                   */
/* -------------------------------------------------------------------------- */

export function defaultGreeting(businessName: string, agentName: string): string {
  return `Thanks for calling ${businessName}. This is ${agentName}, the virtual receptionist. How can I help you today?`;
}

export const DEFAULT_AGENT_NAME = 'Mia';

/* -------------------------------------------------------------------------- */
/* Onboarding                                                                 */
/* -------------------------------------------------------------------------- */

export interface OnboardingStep {
  readonly index: number;
  readonly slug: string;
  readonly label: string;
  readonly description: string;
  /** Whether the step must be completed before the receptionist can go live. */
  readonly required: boolean;
}

export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  { index: 1, slug: 'business', label: 'Business', description: 'Tell us about your business', required: true },
  { index: 2, slug: 'teach', label: 'Teach Your AI', description: 'Train your receptionist in conversation', required: true },
  { index: 3, slug: 'voice', label: 'Voice', description: 'Pick how your receptionist sounds', required: true },
  { index: 4, slug: 'phone', label: 'Phone', description: 'Get an AI number or forward your own', required: true },
  { index: 5, slug: 'calendar', label: 'Calendar', description: 'Connect a calendar or set your hours', required: false },
  { index: 6, slug: 'rules', label: 'Rules', description: 'Set the boundaries for your receptionist', required: false },
  { index: 7, slug: 'test', label: 'Test', description: 'Talk to your receptionist before going live', required: false },
  { index: 8, slug: 'live', label: 'Go Live', description: 'Activate your AI receptionist', required: true },
];

export const ONBOARDING_TOTAL_STEPS = ONBOARDING_STEPS.length;

export function stepBySlug(slug: string): OnboardingStep | undefined {
  return ONBOARDING_STEPS.find((s) => s.slug === slug);
}

/* -------------------------------------------------------------------------- */
/* AI training conversation                                                   */
/* -------------------------------------------------------------------------- */

/** The questions the training assistant works through, in order. */
export const TRAINING_QUESTIONS: readonly string[] = [
  'What services do you offer?',
  'What do those services typically cost?',
  'Which cities or ZIP codes do you service?',
  'What are your business hours?',
  'What should I do with emergency calls?',
  'What questions should I ask a new customer before booking?',
  'Am I allowed to give estimates over the phone?',
  'What should I never promise a customer?',
  'When should I transfer a call to you instead of handling it?',
  'What information do you need before I book an appointment?',
  'Do you have a cancellation or deposit policy I should mention?',
];

export const TRAINING_SYSTEM_PROMPT = `You are helping a small business owner train their new AI receptionist. You are talking to the OWNER, not to a customer.

Your job:
1. Work through the topics below conversationally, one question at a time. Never ask more than one question per message.
2. Acknowledge what they told you in one short sentence, then ask the next thing.
3. Whenever the owner tells you something concrete, call the record_business_knowledge tool to save it. Call it as often as you learn something — do not batch everything until the end.
4. If an answer is vague ("we do most things", "it depends"), ask one specific follow-up to pin it down. Do not invent details to fill gaps.
5. Never make up prices, services, hours or policies. Only record what the owner actually said.
6. Keep your messages short — two or three sentences maximum. This is a chat, not an essay.
7. When you have covered the topics, summarise what the receptionist now knows and tell them they can edit anything in the Knowledge section.

Topics to cover, in roughly this order:
${TRAINING_QUESTIONS.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Start by greeting them by business name if you know it, and asking the first question.`;
