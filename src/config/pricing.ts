/**
 * Pricing configuration.
 *
 * All plan data lives here so pricing can change in one place. Stripe price
 * IDs are read from the environment, never hard-coded, and payment logic
 * elsewhere in the app only ever refers to a plan by its `id`.
 */

export type PlanId = "starter" | "business" | "pro";

export type Plan = {
  id: PlanId;
  name: string;
  /** Monthly price in whole US dollars. */
  price: number;
  currency: "usd";
  interval: "month";
  /** How many tags the plan includes. */
  tagLimit: number;
  tagline: string;
  features: string[];
  cta: string;
  badge?: string;
  highlighted?: boolean;
  /** Stripe price ID, supplied per environment. */
  stripePriceId?: string;
};

export const plans: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    price: 39,
    currency: "usd",
    interval: "month",
    tagLimit: 90,
    tagline: "90 ServiceTags",
    features: [
      "Business dashboard",
      "Customer service pages",
      "Tag management",
      "Request service buttons",
    ],
    cta: "Start Starter",
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER,
  },
  {
    id: "business",
    name: "Business",
    price: 49,
    currency: "usd",
    interval: "month",
    tagLimit: 150,
    tagline: "150 ServiceTags",
    features: ["Everything in Starter", "More active tags", "Priority support"],
    cta: "Choose Business",
    badge: "Most Popular",
    highlighted: true,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS,
  },
  {
    id: "pro",
    name: "Pro",
    price: 79,
    currency: "usd",
    interval: "month",
    tagLimit: 300,
    tagline: "300 ServiceTags",
    features: [
      "Everything in Business",
      "Built for growing service companies",
    ],
    cta: "Choose Pro",
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO,
  },
];

export const pricingNote =
  "Need more tags? Additional tag packs will be available.";

export const defaultPlanId: PlanId = "starter";

export function getPlan(id: string | null | undefined): Plan {
  return plans.find((plan) => plan.id === id) ?? plans[0];
}
