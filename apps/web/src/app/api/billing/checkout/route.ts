import { NextResponse, type NextRequest } from 'next/server';
import { checkoutSchema, getPlan } from '@afd/shared';
import { requireRole } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase/server';
import { getBillingProvider } from '@/lib/providers/billing';
import { absoluteUrl, stripeEnv, DEMO_MODE } from '@/lib/env';
import { clientIp, enforceRateLimit } from '@/lib/rate-limit';
import { errorResponse, errors } from '@/lib/errors';
import { newRequestId, childLogger } from '@/lib/logger';
import { resolveEligiblePlan } from '@/server/founder';

/**
 * Starts a Stripe Checkout session.
 *
 * Plan eligibility is decided ENTIRELY server-side by `resolveEligiblePlan`.
 * A request body asking for `founder` is treated as a preference, not an
 * instruction: if no slot is free the session is created at standard pricing.
 * There is no code path where the client can choose the price it pays.
 */
export async function POST(request: NextRequest) {
  const requestId = newRequestId();
  const logger = childLogger({ request_id: requestId, event: 'billing.checkout' });

  try {
    // Only an owner may start a subscription.
    const ctx = await requireRole('owner');
    await enforceRateLimit('checkout', `${clientIp(request.headers)}:${ctx.user.id}`);

    const body = await request.json().catch(() => ({}));
    const { plan: requested } = checkoutSchema.parse(body);

    const svc = getServiceSupabase();
    const organizationId = ctx.active.organizationId;

    const { data: subscription } = await svc
      .from('subscriptions')
      .select('status, stripe_customer_id, stripe_subscription_id')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (subscription && ['active', 'trialing'].includes(subscription.status)) {
      throw errors.conflict('This business already has an active subscription.');
    }

    const eligibility = await resolveEligiblePlan({
      organizationId,
      userId: ctx.user.id,
      userEmail: ctx.user.email ?? '',
      ...(requested ? { requested } : {}),
    });

    const plan = getPlan(eligibility.plan);
    const priceId =
      eligibility.plan === 'founder' ? safePriceId('founder') : safePriceId('standard');

    const billing = getBillingProvider();
    const session = await billing.createCheckoutSession({
      organizationId,
      userId: ctx.user.id,
      email: ctx.user.email ?? ctx.profile.email,
      planId: eligibility.plan,
      priceId,
      overagePriceId: stripeEnv.overagePriceId ?? null,
      successUrl: absoluteUrl('/dashboard/settings/business?checkout=success'),
      cancelUrl: absoluteUrl('/dashboard/billing?checkout=cancelled'),
      existingCustomerId: subscription?.stripe_customer_id ?? null,
      founderSlot: eligibility.founderSlot,
    });

    // Record the intended plan so the webhook can reconcile even if metadata is
    // lost. The subscription is NOT activated here — only the webhook does that.
    await svc
      .from('subscriptions')
      .update({
        plan: eligibility.plan,
        included_minutes: plan.includedMinutes,
        ...(session.customerId ? { stripe_customer_id: session.customerId } : {}),
      })
      .eq('organization_id', organizationId);

    logger.info('checkout session created', {
      organization_id: organizationId,
      plan: eligibility.plan,
      founder_slot: eligibility.founderSlot,
      downgraded: eligibility.downgraded,
      demo: DEMO_MODE,
    });

    return NextResponse.json({
      url: session.url,
      plan: eligibility.plan,
      founderSlot: eligibility.founderSlot,
      downgraded: eligibility.downgraded,
      demo: billing.isMock,
      request_id: requestId,
    });
  } catch (err) {
    logger.error('checkout failed', { error: err });
    return errorResponse(err, requestId);
  }
}

function safePriceId(plan: 'founder' | 'standard'): string {
  if (DEMO_MODE) return `price_demo_${plan}`;
  return plan === 'founder' ? stripeEnv.founderPriceId : stripeEnv.standardPriceId;
}
