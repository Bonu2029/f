export type CleaningMode = {
  id: string;
  name: string;
  tagline: string;
  body: string;
  points: string[];
  tone: 'mint' | 'airy' | 'champagne' | 'lavender' | 'sage';
};

export const cleaningModes: CleaningMode[] = [
  {
    id: 'everyday-reset',
    name: 'Everyday Reset',
    tagline: 'Keep the rhythm you already have.',
    body: 'Regular maintenance across the rooms you use most, so the home never has to be reclaimed from scratch.',
    points: ['Consistent room plan', 'Priority Zones first', 'Same checklist every visit'],
    tone: 'mint',
  },
  {
    id: 'deep-restore',
    name: 'Deep Restore',
    tagline: 'Reset the baseline, then maintain it.',
    body: 'For buildup, neglected corners, seasonal changes or a first visit. Slower, more detailed, more thorough.',
    points: ['Baseboards and frames', 'Buildup removal', 'Hard-to-reach areas'],
    tone: 'airy',
  },
  {
    id: 'guest-ready',
    name: 'Guest Ready',
    tagline: 'For the twelve hours before people arrive.',
    body: 'Attention shifts to what guests actually see and touch: the entry, the guest bath, the kitchen and the living room.',
    points: ['Entry and guest bath first', 'Fresh linens', 'Presentation details'],
    tone: 'champagne',
  },
  {
    id: 'quiet-clean',
    name: 'Quiet Clean',
    tagline: 'A visit you barely notice.',
    body: 'For calls, naps and focused work. Lower-noise equipment where possible, text-only arrival and a scheduled vacuuming window.',
    points: ['No doorbell', 'Text-only updates', 'Closed doors stay closed'],
    tone: 'lavender',
  },
  {
    id: 'pet-friendly',
    name: 'Pet-Friendly Clean',
    tagline: 'Built around the animals who live here.',
    body: 'Product choices, door discipline and process notes shaped by your pet profile — including escape risk and safe rooms.',
    points: ['Pet-safe product selection', 'Door and gate protocol', 'Hair-focused passes'],
    tone: 'sage',
  },
  {
    id: 'fragrance-free',
    name: 'Fragrance-Free Clean',
    tagline: 'No scent, no surprises.',
    body: 'Unscented products throughout, with your specific ingredient avoidances recorded and applied on every visit.',
    points: ['Unscented products only', 'Ingredient avoid list', 'Ventilation preferences'],
    tone: 'airy',
  },
];

export const trustPoints = [
  {
    title: 'Background-checked team',
    body: 'Every person who enters a customer home completes an identity and background screening before their first visit.',
  },
  {
    title: 'Insured service',
    body: 'LumaNest carries business liability coverage. Certificate details are available on request for property managers.',
  },
  {
    title: 'Secure customer profiles',
    body: 'Access notes, alarm details and entry instructions are stored with restricted access and shared only with the assigned team.',
  },
  {
    title: 'Clear arrival windows',
    body: 'You get a scheduled window and an update when the team is on the way — no waiting all day.',
  },
  {
    title: 'Personalized home instructions',
    body: 'Do Not Disturb Zones, fragile surfaces and product preferences travel with every appointment automatically.',
  },
  {
    title: 'Completed-service checklist',
    body: 'After each visit you receive a report of what was completed, what was skipped and why.',
  },
  {
    title: 'Satisfaction support',
    body: 'If something was missed, tell us within the window described in our terms and we will schedule a correction visit.',
  },
];

export const howItWorksSteps = [
  {
    title: 'Tell us about your home',
    body: 'Rooms, surfaces, pets, sensitivities and the areas that matter most. Once — not before every visit.',
  },
  {
    title: 'Build or select your plan',
    body: 'Use Build Your Clean for a room-by-room plan, or pick a service and let us shape it around your profile.',
  },
  {
    title: 'Choose your schedule and preferences',
    body: 'Date, arrival window, communication style, entry instructions and cleaning mode.',
  },
  {
    title: 'Receive your completed cleaning report',
    body: 'A checklist of what was done, notes from the team and anything we recommend for next time.',
  },
];

export const journeySteps = [
  {
    title: 'Choose a service or take CleanMatch',
    body: 'Start from a named service, or answer twelve short questions and let CleanMatch recommend one.',
    detail: 'No account needed to see availability or an estimate.',
  },
  {
    title: 'Create a personalized cleaning plan',
    body: 'Select rooms, set per-room priorities and add optional tasks in Build Your Clean.',
    detail: 'Your plan saves to your device immediately and to your account when you create one.',
  },
  {
    title: 'Set preferences and access instructions',
    body: 'Products, fragrance, pets, quiet-clean preferences, entry method, parking and alarm notes.',
    detail: 'Do Not Disturb Zones are recorded here and respected on every visit.',
  },
  {
    title: 'Receive appointment confirmation',
    body: 'A written confirmation with the plan, the arrival window, the price breakdown and preparation notes.',
    detail: 'Reschedule or adjust from your dashboard at any time.',
  },
  {
    title: 'Get arrival updates',
    body: 'A message when the team is on the way, in the format you chose — including text-only for Quiet Clean.',
    detail: 'No doorbell if you asked us not to use it.',
  },
  {
    title: 'Your plan is completed',
    body: 'The team follows your saved plan, starting with your Priority Zones.',
    detail: 'Anything that cannot be completed is noted rather than skipped silently.',
  },
  {
    title: 'Receive the cleaning report',
    body: 'A room-by-room checklist, notes from the team and recommended future maintenance.',
    detail: 'Photos are included only if you have given permission.',
  },
  {
    title: 'Give feedback or schedule the next visit',
    body: 'Rate the visit, request a correction, adjust the plan or book the next appointment in a tap.',
    detail: 'Your adjustments become part of the plan we follow next time.',
  },
];

export const uniqueFeatures = [
  {
    id: 'home-reset-score',
    name: 'Home Reset Score',
    body: 'A short, supportive questionnaire that helps you decide which rooms deserve attention first. It is a planning tool, not a judgment of your home.',
    href: '/home-profile#reset-score',
  },
  {
    id: 'rotating-detail',
    name: 'Rotating Detail Focus',
    body: 'Recurring customers pick one detailed area per visit — baseboards, cabinet fronts, doors, fixtures, windows, laundry or closets — and we rotate through them.',
    href: '/services/recurring-cleaning',
  },
  {
    id: 'guest-ready',
    name: 'Guest-Ready Mode',
    body: 'Convert any upcoming recurring visit into a guest-ready reset. Entry, guest bath, kitchen, living room, linens and presentation details move to the front.',
    href: '/customer-dashboard',
  },
  {
    id: 'quiet-clean',
    name: 'Quiet Clean Mode',
    body: 'No doorbell, text-only arrival, lower-noise equipment where possible, closed offices left alone and a scheduled vacuuming window.',
    href: '/home-profile#preferences',
  },
  {
    id: 'pet-profile',
    name: 'Pet Profile',
    body: 'Names, temperament, escape risk, safe rooms and product restrictions — recorded once and applied on every visit.',
    href: '/home-profile#pets',
  },
  {
    id: 'product-preferences',
    name: 'Product Preference Center',
    body: 'Standard professional, eco-conscious, fragrance-free, customer-provided — plus specific ingredients you want avoided.',
    href: '/home-profile#products',
  },
  {
    id: 'cleaning-memory',
    name: 'Cleaning Memory',
    body: 'Your profile remembers past plans and preferences so a repeat visit never starts with a blank form.',
    href: '/customer-dashboard',
  },
  {
    id: 'seasonal-planner',
    name: 'Seasonal Reset Planner',
    body: 'Optional seasonal suggestions surfaced at the right time of year. Nothing is ever added to your bill automatically.',
    href: '/membership#seasonal',
  },
  {
    id: 'photo-quote',
    name: 'Photo Quote Request',
    body: 'Send photos of the rooms in question so the estimate matches reality. Consent, size limits and a deletion window are stated up front.',
    href: '/contact#photo-quote',
  },
  {
    id: 'emergency-clean',
    name: 'Emergency Clean Request',
    body: 'For urgent needs. We will check the nearest available appointment and contact you — no same-day promises we cannot keep.',
    href: '/contact#emergency',
  },
];

/**
 * PLACEHOLDER TESTIMONIALS
 * These are written examples of the kind of feedback the site will display.
 * They are labelled as placeholders in the UI and must be replaced with real,
 * permissioned customer reviews before launch.
 */
export const testimonials = [
  {
    quote:
      'The part that changed things for us was not having to leave a note every week. The plan was already right when they arrived.',
    context: 'Placeholder — recurring cleaning, two-bedroom apartment',
  },
  {
    quote:
      'We asked for fragrance-free and text-only arrival. Both were followed on every visit without a reminder.',
    context: 'Placeholder — fragrance-free preferences, family home',
  },
  {
    quote:
      'The completed report told us what could not be finished and why. That honesty is the reason we rebooked.',
    context: 'Placeholder — deep cleaning, first visit',
  },
  {
    quote:
      'Turnover photos land in my inbox before the next guest checks in. I stopped driving over to verify.',
    context: 'Placeholder — short-term rental turnover',
  },
  {
    quote:
      'Do Not Disturb Zones sound like a small feature. For a home office with paperwork everywhere, it is the whole thing.',
    context: 'Placeholder — work-from-home household',
  },
];

export const generalFaqs = [
  {
    category: 'Booking',
    q: 'Do I need an account to see prices or availability?',
    a: 'No. You can run an instant estimate, build a plan and view available arrival windows without creating an account. An account is only needed when you want to save a plan across devices or manage recurring visits.',
  },
  {
    category: 'Booking',
    q: 'How far in advance should I book?',
    a: 'Earlier is easier, especially for weekend and end-of-month windows. If you need something sooner, use the emergency clean request and we will check the nearest available appointment.',
  },
  {
    category: 'Pricing',
    q: 'Why is the price a range and not a single number?',
    a: 'Because your home is not a spreadsheet. The estimate is built from your inputs and shown as an itemized breakdown. The final amount changes only if the scope changes or the property is substantially different from what was submitted.',
  },
  {
    category: 'Pricing',
    q: 'Do you charge more for pets?',
    a: 'There is a small time adjustment per pet, shown as its own line in the estimate. It covers extra passes on fabric and edges, not a surcharge for having animals.',
  },
  {
    category: 'Pricing',
    q: 'Is tipping expected?',
    a: 'It is never expected. If you would like to, there is a tip option in your dashboard after a completed visit.',
  },
  {
    category: 'Your home',
    q: 'What if I do not want a cleaner in certain rooms?',
    a: 'Mark them as Do Not Disturb Zones in your home profile. Rooms, cabinets, drawers and desks can all be marked. The team sees these before the visit and does not open, move or enter them.',
  },
  {
    category: 'Your home',
    q: 'Can I request specific products?',
    a: 'Yes. Choose standard professional, eco-conscious, fragrance-free or customer-provided products, and list any ingredients you want avoided. We follow the list; we do not assess sensitivities or make health claims.',
  },
  {
    category: 'Your home',
    q: 'What should I do before the visit?',
    a: 'Clear surfaces you want cleaned underneath, secure valuables, medications and personal documents, and let us know where pets will be. Everything else is on us.',
  },
  {
    category: 'Trust',
    q: 'Are your cleaners background-checked?',
    a: 'Yes. Identity verification and a background screening are completed before a team member works in customer homes.',
  },
  {
    category: 'Trust',
    q: 'How do you handle keys and entry codes?',
    a: 'Access details are stored with restricted access and shared only with the assigned team for the scheduled appointment. Physical keys are logged in and out. Full detail is on the Trust & Safety page.',
  },
  {
    category: 'Trust',
    q: 'Do you take photos of my home?',
    a: 'Only with your permission, and only of the areas you approve. Photo permission is off by default and can be withdrawn at any time from your profile.',
  },
  {
    category: 'Membership',
    q: 'Can I pause or cancel a membership?',
    a: 'Yes. Cancellation and rescheduling terms, including notice periods, are stated in full on the membership page and in our terms.',
  },
  {
    category: 'Membership',
    q: 'Do unused visits roll over?',
    a: 'This depends on the final membership terms, which are still being confirmed. The membership page marks this clearly rather than guessing.',
  },
];
