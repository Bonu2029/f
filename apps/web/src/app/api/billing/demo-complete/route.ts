import { NextResponse, type NextRequest } from 'next/server';
import { getPlan, isPlanId } from '@afd/shared';
import { requireRole } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase/server';
import { DEMO_MODE, absoluteUrl } from '@/lib/env';
import { errorResponse, errors } from '@/lib/errors';
import { activateFounderSlot } from '@/server/founder';
import { AUDIT_ACTIONS, recordAudit } from '@/lib/audit';
import { log } from '@/lib/logger';

/**
 * Demo-mode completion of the checkout flow.
 *
 * This exists ONLY when DEMO_MODE is on. It performs the same state transition
 * the real Stripe webhook performs, so the rest of the product behaves
 * identically without faking a payment provider response. The resulting
 * subscription is visibly marked as demo in the billing UI.
 *
 * It refuses to run in production, and it re-checks that the caller is the
 * owner of the organisation named in the query string.
 */
export async function GET(request: NextRequest) {
  try {
    if (!DEMO_MODE) throw errors.notFound('That page');

    const url = new URL(request.url);
    const organizationId = url.searchParams.get('org') ?? '';
    const planParam = url.searchParams.get('plan');
    const planId = isPlanId(planParam) ? planParam : 'standard';

    const ctx = await requireRole('owner');
    if (ctx.active.organizationId !== organizationId) {
      throw errors.forbidden('complete checkout for that business');
    }

    const plan = getPlan(planId);
    const svc = getServiceSupabase();
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 86_400_000);

    await svc
      .from('subscriptions')
      .update({
        plan: planId,
        status: 'active',
        included_minutes: plan.includedMinutes,
        used_minutes: 0,
        billing_period_start: now.toISOString(),
        billing_period_end: periodEnd.toISOString(),
        stripe_customer_id: `cus_demo_${organizationId.slice(0, 8)}`,
        stripe_subscription_id: `sub_demo_${organizationId.slice(0, 8)}`,
      })
      .eq('organization_id', organizationId);

    await svc.from('organizations').update({ status: 'active' }).eq('id', organizationId);

    if (planId === 'founder') await activateFounderSlot(organizationId);

    await recordAudit({
      organizationId,
      actorUserId: ctx.user.id,
      actorEmail: ctx.user.email ?? null,
      action: AUDIT_ACTIONS.SUBSCRIPTION_CREATED,
      targetType: 'subscription',
      metadata: { plan: planId, demo: true, note: 'DEMO_MODE — no payment was taken.' },
    });

    log.info('[demo] subscription activated without payment', {
      organization_id: organizationId,
      plan: planId,
    });

    return NextResponse.redirect(absoluteUrl('/dashboard/settings/business?checkout=demo'));
  } catch (err) {
    return errorResponse(err);
  }
}
