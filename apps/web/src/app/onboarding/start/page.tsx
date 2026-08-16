import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionContext, getSessionContextFresh, requireUser } from '@/lib/auth';
import { createOrganization } from '@/server/organizations';
import { getServiceSupabase } from '@/lib/supabase/server';
import { StartCheckout } from './start-checkout';
import { getFounderStatsFresh } from '@/server/founder';

export const metadata: Metadata = { title: 'Set up your business' };
export const dynamic = 'force-dynamic';

/**
 * The bridge between "verified account" and "paying customer with a tenant".
 *
 * On first visit it creates the organisation from the signup metadata, then
 * shows the plan the server has decided this user is eligible for. If they
 * already have an active subscription it sends them into the wizard instead.
 */
export default async function OnboardingStartPage() {
  const user = await requireUser();

  let ctx = await getSessionContext();

  if (!ctx) {
    const businessName =
      (user.user_metadata?.business_name as string | undefined)?.trim() ||
      `${(user.user_metadata?.first_name as string | undefined) ?? 'My'} business`;

    await createOrganization({
      userId: user.id,
      userEmail: user.email ?? '',
      businessName,
    });
    // Fresh read, not the cached one: getSessionContext() is memoised per
    // request and would hand back the null captured before the organisation
    // existed, making a successful bootstrap look like a failure.
    ctx = await getSessionContextFresh();
  }

  if (!ctx) {
    // Bootstrap genuinely failed; do not pretend otherwise.
    throw new Error('Your business could not be created. Please refresh, or contact support.');
  }

  const svc = getServiceSupabase();
  const { data: subscription } = await svc
    .from('subscriptions')
    .select('status, plan, founder')
    .eq('organization_id', ctx.active.organizationId)
    .maybeSingle();

  if (subscription && ['active', 'trialing', 'past_due'].includes(subscription.status)) {
    redirect('/dashboard/settings/business');
  }

  const stats = await getFounderStatsFresh();

  return (
    <StartCheckout
      businessName={ctx.active.organizationName}
      founderAvailable={!stats.soldOut}
      remaining={stats.remaining}
      total={stats.total}
      firstName={ctx.profile.first_name}
    />
  );
}
