import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";
import { planIdForPrice } from "@/lib/stripe/billing";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlan } from "@/config/pricing";
import type { SubscriptionStatus } from "@/lib/supabase/types";

/**
 * Stripe webhook.
 *
 * Runs without a user session, so it uses the service-role client. Every
 * request is signature-verified before anything is written.
 */
export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const businessId = session.client_reference_id ?? session.metadata?.business_id;
      if (businessId && typeof session.subscription === "string") {
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        await syncSubscription(businessId, subscription);
      }
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const businessId = subscription.metadata?.business_id;
      if (businessId) await syncSubscription(businessId, subscription);
      break;
    }

    default:
      // Everything else is acknowledged and ignored.
      break;
  }

  return NextResponse.json({ received: true });
}

async function syncSubscription(
  businessId: string,
  subscription: Stripe.Subscription,
) {
  const item = subscription.items.data[0];
  const planId = planIdForPrice(item?.price.id);
  const plan = getPlan(planId);

  const periodEnd = item?.current_period_end
    ? new Date(item.current_period_end * 1000).toISOString()
    : null;

  const supabase = createAdminClient();

  await supabase
    .from("subscriptions")
    .update({
      plan_id: plan.id,
      status: subscription.status as SubscriptionStatus,
      tag_limit: plan.tagLimit,
      stripe_customer_id:
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id,
      stripe_subscription_id: subscription.id,
      current_period_end: periodEnd,
      cancel_at_period_end: subscription.cancel_at_period_end,
    })
    .eq("business_id", businessId);
}
