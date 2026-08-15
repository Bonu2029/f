import 'server-only';
import type Stripe from 'stripe';
import { getPlan, isPlanId, type SubscriptionStatus } from '@afd/shared';
import { getServiceSupabase } from '@/lib/supabase/server';
import { AUDIT_ACTIONS, recordAudit } from '@/lib/audit';
import { log } from '@/lib/logger';
import { activateFounderSlot, releaseFounderReservation } from '@/server/founder';
import { notifyPaymentFailed } from '@/server/notifications';

/**
 * Keeps our `subscriptions` table in step with Stripe.
 *
 * Stripe is the source of truth for subscription state. Every write here is
 * driven by a verified webhook, is idempotent, and never trusts a browser
 * redirect. `checkout.session.completed` alone is not enough — subscription
 * lifecycle events carry the authoritative status.
 */

const STATUS_MAP: Record<string, SubscriptionStatus> = {
  incomplete: 'incomplete',
  incomplete_expired: 'incomplete_expired',
  trialing: 'trialing',
  active: 'active',
  past_due: 'past_due',
  canceled: 'canceled',
  unpaid: 'unpaid',
  paused: 'paused',
};

/** Resolves the organisation for a Stripe object, via metadata then customer id. */
export async function resolveOrganizationId(input: {
  metadata?: Stripe.Metadata | null;
  customerId?: string | null;
  clientReferenceId?: string | null;
}): Promise<string | null> {
  const fromMetadata = input.metadata?.organization_id;
  if (fromMetadata) return fromMetadata;
  if (input.clientReferenceId) return input.clientReferenceId;

  if (input.customerId) {
    const svc = getServiceSupabase();
    const { data } = await svc
      .from('subscriptions')
      .select('organization_id')
      .eq('stripe_customer_id', input.customerId)
      .maybeSingle();
    if (data) return data.organization_id as string;
  }
  return null;
}

function periodBounds(subscription: Stripe.Subscription): { start: string | null; end: string | null } {
  // Period bounds live on the subscription item in current API versions, with
  // the legacy top-level fields kept for compatibility.
  const item = subscription.items?.data?.[0] as
    | (Stripe.SubscriptionItem & { current_period_start?: number; current_period_end?: number })
    | undefined;
  const legacy = subscription as unknown as {
    current_period_start?: number;
    current_period_end?: number;
  };
  const start = item?.current_period_start ?? legacy.current_period_start ?? null;
  const end = item?.current_period_end ?? legacy.current_period_end ?? null;
  return {
    start: start ? new Date(start * 1000).toISOString() : null,
    end: end ? new Date(end * 1000).toISOString() : null,
  };
}

/**
 * Applies a Stripe subscription object to our database.
 * Called for created / updated / deleted and after checkout completion.
 */
export async function syncSubscription(
  subscription: Stripe.Subscription,
  organizationIdHint?: string | null,
): Promise<void> {
  const svc = getServiceSupabase();
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id ?? null;

  const organizationId =
    organizationIdHint ??
    (await resolveOrganizationId({ metadata: subscription.metadata, customerId }));

  if (!organizationId) {
    log.warn('stripe subscription without a resolvable organization', {
      provider: 'stripe',
      event: 'subscription.unresolved',
      subscription_id: subscription.id,
    });
    return;
  }

  const metaPlan = subscription.metadata?.plan;
  const { data: current } = await svc
    .from('subscriptions')
    .select('plan, status, founder, founder_slot')
    .eq('organization_id', organizationId)
    .maybeSingle();

  const planId = isPlanId(metaPlan) ? metaPlan : isPlanId(current?.plan) ? current!.plan : 'standard';
  const plan = getPlan(planId);
  const status = STATUS_MAP[subscription.status] ?? 'incomplete';
  const { start, end } = periodBounds(subscription);

  const becameActive = status === 'active' || status === 'trialing';
  const wasActive = current?.status === 'active' || current?.status === 'trialing';

  // A new billing period resets the metered allowance.
  const periodChanged =
    start != null &&
    (
      await svc
        .from('subscriptions')
        .select('billing_period_start')
        .eq('organization_id', organizationId)
        .maybeSingle()
    ).data?.billing_period_start !== start;

  await svc
    .from('subscriptions')
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      plan: planId,
      status,
      billing_period_start: start,
      billing_period_end: end,
      included_minutes: plan.includedMinutes,
      cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
      ...(periodChanged ? { used_minutes: 0 } : {}),
    })
    .eq('organization_id', organizationId);

  // Founder activation happens exactly once, on the transition into a paid
  // state. It is intentionally irreversible: cancelling never reopens the slot.
  if (planId === 'founder' && becameActive && !current?.founder) {
    const slot = await activateFounderSlot(organizationId);
    log.info('founder slot activated from stripe event', {
      provider: 'stripe',
      organization_id: organizationId,
      slot,
    });
  }

  // An organisation that never completed payment gives its reservation back.
  if (planId === 'founder' && !becameActive && !current?.founder && status === 'incomplete_expired') {
    await releaseFounderReservation(organizationId);
  }

  if (becameActive && !wasActive) {
    await svc
      .from('organizations')
      .update({ status: 'active' })
      .eq('id', organizationId)
      .in('status', ['onboarding', 'paused', 'cancelled']);
    await recordAudit({
      organizationId,
      action: AUDIT_ACTIONS.SUBSCRIPTION_CREATED,
      targetType: 'subscription',
      targetId: subscription.id,
      metadata: { plan: planId, status },
    });
  } else {
    await recordAudit({
      organizationId,
      action: AUDIT_ACTIONS.SUBSCRIPTION_UPDATED,
      targetType: 'subscription',
      targetId: subscription.id,
      metadata: { plan: planId, status, cancel_at_period_end: subscription.cancel_at_period_end },
    });
  }
}

/**
 * Handles a cancelled subscription: the receptionist stops answering, but
 * customer data is retained per the documented retention policy and the founder
 * slot is NOT returned to inventory.
 */
export async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const svc = getServiceSupabase();
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : null;
  const organizationId = await resolveOrganizationId({ metadata: subscription.metadata, customerId });
  if (!organizationId) return;

  await svc
    .from('subscriptions')
    .update({ status: 'canceled', cancel_at_period_end: false })
    .eq('organization_id', organizationId);

  await svc.from('organizations').update({ status: 'cancelled' }).eq('id', organizationId);

  // Stop consuming paid AI resources.
  await svc.from('ai_agents').update({ active: false }).eq('organization_id', organizationId);

  await svc.from('notifications').insert({
    organization_id: organizationId,
    kind: 'payment_failed',
    title: 'Subscription cancelled',
    body: 'Your AI receptionist has stopped answering calls. Your data is retained and you can reactivate at current pricing.',
    link: '/dashboard/billing',
  });

  await recordAudit({
    organizationId,
    action: AUDIT_ACTIONS.SUBSCRIPTION_CANCELLED,
    targetType: 'subscription',
    targetId: subscription.id,
    metadata: { note: 'Founder slot intentionally not returned to inventory.' },
  });
}

export async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const svc = getServiceSupabase();
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : null;
  const organizationId = await resolveOrganizationId({
    metadata: invoice.metadata ?? null,
    customerId,
  });
  if (!organizationId) return;

  const line = invoice.lines?.data?.[0];
  const period = line?.period;
  if (period?.start && period?.end) {
    // A paid invoice starts a fresh allowance window.
    await svc.rpc('reset_usage_for_period', {
      p_organization_id: organizationId,
      p_period_start: new Date(period.start * 1000).toISOString(),
      p_period_end: new Date(period.end * 1000).toISOString(),
    });
  }

  await svc
    .from('subscriptions')
    .update({ status: 'active' })
    .eq('organization_id', organizationId)
    .in('status', ['past_due', 'unpaid', 'incomplete']);
}

export async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const svc = getServiceSupabase();
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : null;
  const organizationId = await resolveOrganizationId({
    metadata: invoice.metadata ?? null,
    customerId,
  });
  if (!organizationId) return;

  await svc.from('subscriptions').update({ status: 'past_due' }).eq('organization_id', organizationId);

  const { data: org } = await svc.from('organizations').select('name').eq('id', organizationId).maybeSingle();
  await notifyPaymentFailed({
    organizationId,
    organizationName: (org?.name as string) ?? 'Your business',
  });
}
