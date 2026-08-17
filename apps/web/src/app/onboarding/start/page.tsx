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
export default async function OnboardingStartPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  // Set by the redirect below, so the retry runs at most once.
  const alreadyRetried = params.created === '1';

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
    // Re-render from a clean request rather than re-reading mid-request.
    //
    // The read that follows a write here has been unreliable in a way worth
    // spelling out: the membership query embeds the organisation, and the
    // embed is subject to its own RLS check. When that check has not caught up
    // the embed comes back null, the membership is dropped, and the page
    // concludes there is no organisation — for a tenant that was just created
    // successfully. Redirecting sidesteps the whole problem: the next request
    // takes the ordinary path with nothing cached and nothing in flight.
    if (!alreadyRetried) redirect('/onboarding/start?created=1');

    // We have already been round once and still cannot see it.
    ctx = await getSessionContextFresh();
  }

  if (!ctx) {
    // Be precise about which half failed. The organisation was created — the
    // bootstrap is transactional and would have thrown otherwise — so this is
    // a visibility problem, and saying "could not be created" sends whoever
    // reads it looking in the wrong place.
    throw new Error(
      'Your business was created, but this account cannot see it yet. ' +
        'Refresh in a moment. If it persists, contact support.',
    );
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
