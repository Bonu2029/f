/**
 * PLACEHOLDER MEMBERSHIP PRICING
 * ------------------------------
 * `pricePlaceholder` is intentionally not a real price. Each tier renders with
 * a visible "pricing to be confirmed" marker until approved figures replace it.
 */

export type MembershipTier = {
  id: string;
  name: string;
  cadence: string;
  positioning: string;
  pricePlaceholder: string;
  priceNote: string;
  benefits: string[];
  bestFor: string;
  featured?: boolean;
};

export const membershipTiers: MembershipTier[] = [
  {
    id: 'essential-reset',
    name: 'Essential Reset',
    cadence: 'Every four weeks',
    positioning: 'A monthly baseline that keeps the home from drifting.',
    pricePlaceholder: '$—',
    priceNote: 'Monthly rate to be confirmed',
    benefits: [
      'One cleaning visit every four weeks',
      'Saved home profile and preferences',
      'Preferred booking windows',
      'Member pricing on every visit',
      'Completed-service report after each visit',
    ],
    bestFor: 'Smaller homes, low-traffic households, or a maintenance layer between deep cleans.',
  },
  {
    id: 'consistent-home',
    name: 'Consistent Home',
    cadence: 'Every two weeks',
    positioning: 'The rhythm most households settle into.',
    pricePlaceholder: '$—',
    priceNote: 'Monthly rate to be confirmed',
    benefits: [
      'One cleaning visit every two weeks',
      'Saved personalized room plan',
      'Priority rescheduling',
      'Seasonal reset reminders you can decline',
      'Cleaning-history dashboard',
      'Rotating detail focus',
    ],
    bestFor: 'Families, pet households and anyone who wants the home to stay level rather than swing.',
    featured: true,
  },
  {
    id: 'always-ready',
    name: 'Always Ready',
    cadence: 'Weekly',
    positioning: 'For homes that host, work and run at full speed.',
    pricePlaceholder: '$—',
    priceNote: 'Monthly rate to be confirmed',
    benefits: [
      'One cleaning visit every week',
      'Priority appointment access',
      'Rotating detail-clean focus each visit',
      'Guest-Ready adjustment on any upcoming visit',
      'Recurring home-care recommendations',
      'Fastest correction-visit scheduling',
    ],
    bestFor: 'Larger homes, frequent hosts, multi-pet households and short-term rental owners.',
  },
];

export const membershipTerms = [
  {
    q: 'How is billing handled?',
    a: 'Members are billed on a recurring cycle tied to their plan cadence. The exact billing date and amount appear on the confirmation before anything is charged. Final billing mechanics are confirmed at launch with the payment provider.',
  },
  {
    q: 'How do I cancel?',
    a: 'Cancel from your dashboard. The notice period and the effect on an already-scheduled visit are stated in the terms you accept at signup — we do not hide it in a footnote.',
  },
  {
    q: 'How does rescheduling work?',
    a: 'Reschedule any visit from the dashboard. Members get priority access to alternate windows. Very late changes may fall under a short-notice policy, which is shown before you confirm.',
  },
  {
    q: 'Do unused visits roll over?',
    a: 'This has not been finalized. Rather than guess, we mark it as pending and will state the answer plainly in the membership terms before signups open.',
  },
  {
    q: 'How are add-ons priced for members?',
    a: 'Add-ons are priced individually and shown on the estimate before each visit. Membership does not silently bundle or unbundle them.',
  },
  {
    q: 'What is included versus extra?',
    a: 'Your plan covers the rooms and tasks in your saved cleaning plan. Anything outside it — appliance interiors, organization sessions, post-event work — appears as a separate, visible line.',
  },
];

export const seasonalSuggestions = [
  {
    season: 'Spring',
    items: ['Interior windows and sills', 'Closet reset', 'Light fixtures and fans', 'Baseboards throughout'],
  },
  {
    season: 'Summer',
    items: ['Balcony or patio reset', 'Entry and high-traffic floors', 'Refrigerator interior', 'Guest-room refresh'],
  },
  {
    season: 'Autumn',
    items: ['Oven interior before holiday cooking', 'Pantry and cabinet interiors', 'Pet-hair treatment', 'Guest-ready pass'],
  },
  {
    season: 'Winter',
    items: ['High-touch sanitizing focus', 'Laundry area detail', 'Post-event cleaning', 'Entryway and door frames'],
  },
];
