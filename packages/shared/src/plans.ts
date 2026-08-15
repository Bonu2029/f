/**
 * Plan catalogue.
 *
 * The billing system is driven entirely by this table plus the Stripe price ids
 * in the environment. Adding a plan later (Starter / Professional /
 * Multi-location) means appending an entry here, adding a price id and running
 * `npm run stripe:setup` — no schema change and no code change elsewhere.
 */

export type PlanId = 'founder' | 'standard';

export interface PlanDefinition {
  readonly id: PlanId;
  readonly name: string;
  /** Monthly recurring price in cents. */
  readonly priceCents: number;
  /** Price shown struck-through next to the real price, or null. */
  readonly compareAtCents: number | null;
  /** AI voice minutes included each billing period. */
  readonly includedMinutes: number;
  /** Per-minute price for usage above `includedMinutes`, in cents. */
  readonly overageCentsPerMinute: number;
  /** How many AI phone numbers the plan allows. */
  readonly includedPhoneNumbers: number;
  /** Maximum team members (owner included). */
  readonly maxTeamMembers: number;
  /** True when the plan is capacity-limited (Founding 50). */
  readonly limited: boolean;
  /** Total number of seats available for a limited plan. */
  readonly capacity: number | null;
  /** Env var holding the Stripe price id for the recurring base fee. */
  readonly stripePriceEnvVar: string;
  readonly features: readonly string[];
  /** Shown on the pricing card under the price. */
  readonly blurb: string;
  /** Publicly selectable at checkout. Retired plans stay for existing subs. */
  readonly publiclySelectable: boolean;
}

/** Total number of Founding Member seats that will ever exist. */
export const FOUNDER_SLOT_COUNT = 50;

/** Minutes a founder reservation is held while the user is in Stripe Checkout. */
export const FOUNDER_RESERVATION_TTL_MINUTES = 30;

const SHARED_FEATURES = [
  'AI receptionist that answers 24/7',
  'One AI phone number',
  'Business knowledge training',
  'Lead capture and scoring',
  'Appointment booking',
  'Call transcripts',
  'AI call summaries',
  'SMS follow-ups and photo requests',
  'Voice and personality selection',
  'Human call transfer',
] as const;

export const PLANS: Record<PlanId, PlanDefinition> = {
  founder: {
    id: 'founder',
    name: 'Founding Member',
    priceCents: 2000,
    compareAtCents: 4900,
    includedMinutes: 200,
    overageCentsPerMinute: 10,
    includedPhoneNumbers: 1,
    maxTeamMembers: 5,
    limited: true,
    capacity: FOUNDER_SLOT_COUNT,
    stripePriceEnvVar: 'STRIPE_FOUNDER_PRICE_ID',
    features: [`${200} AI call minutes included`, ...SHARED_FEATURES],
    blurb:
      'Lock in your $20/month Founding Member rate while your subscription remains continuously active.',
    publiclySelectable: true,
  },
  standard: {
    id: 'standard',
    name: 'AI Front Desk',
    priceCents: 4900,
    compareAtCents: null,
    includedMinutes: 500,
    overageCentsPerMinute: 10,
    includedPhoneNumbers: 1,
    maxTeamMembers: 10,
    limited: false,
    capacity: null,
    stripePriceEnvVar: 'STRIPE_STANDARD_PRICE_ID',
    features: [`${500} AI call minutes included`, ...SHARED_FEATURES],
    blurb: 'Everything you need to stop missing calls, billed monthly. Cancel anytime.',
    publiclySelectable: true,
  },
};

export const PLAN_IDS = Object.keys(PLANS) as PlanId[];

export function getPlan(id: string | null | undefined): PlanDefinition {
  if (id && id in PLANS) return PLANS[id as PlanId];
  return PLANS.standard;
}

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === 'string' && value in PLANS;
}

/** Formats cents as a whole-dollar price when possible, else 2dp. */
export function formatPrice(cents: number): string {
  const dollars = cents / 100;
  return Number.isInteger(dollars)
    ? `$${dollars}`
    : `$${dollars.toFixed(2)}`;
}
