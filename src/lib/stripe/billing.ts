import "server-only";
import { getStripe } from "./client";
import { getPlan, plans, type PlanId } from "@/config/pricing";
import { brand } from "@/config/brand";

/**
 * The only place that talks to Stripe about subscriptions.
 *
 * Routes and server actions call these functions; none of them build Stripe
 * payloads themselves, and no price or plan detail is hard-coded here — it all
 * comes from `config/pricing.ts`.
 */

export type CheckoutParams = {
  planId: PlanId;
  businessId: string;
  email: string;
  stripeCustomerId?: string | null;
};

export async function createCheckoutSession({
  planId,
  businessId,
  email,
  stripeCustomerId,
}: CheckoutParams): Promise<{ url: string } | { error: string }> {
  const stripe = getStripe();
  if (!stripe) return { error: "Payments are not connected yet." };

  const plan = getPlan(planId);
  if (!plan.stripePriceId) {
    return { error: `No Stripe price is configured for the ${plan.name} plan.` };
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    customer: stripeCustomerId ?? undefined,
    customer_email: stripeCustomerId ? undefined : email,
    client_reference_id: businessId,
    subscription_data: { metadata: { business_id: businessId, plan_id: plan.id } },
    metadata: { business_id: businessId, plan_id: plan.id },
    success_url: `${brand.url}/dashboard/billing?checkout=success`,
    cancel_url: `${brand.url}/dashboard/billing?checkout=canceled`,
    allow_promotion_codes: true,
  });

  return session.url ? { url: session.url } : { error: "Stripe did not return a checkout URL." };
}

export async function createPortalSession(
  stripeCustomerId: string,
): Promise<{ url: string } | { error: string }> {
  const stripe = getStripe();
  if (!stripe) return { error: "Payments are not connected yet." };

  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${brand.url}/dashboard/billing`,
  });

  return { url: session.url };
}

/** Maps a Stripe price ID back to one of our plans. */
export function planIdForPrice(priceId: string | null | undefined): PlanId | null {
  if (!priceId) return null;
  const plan = plans.find((candidate) => candidate.stripePriceId === priceId);
  return plan ? plan.id : null;
}
