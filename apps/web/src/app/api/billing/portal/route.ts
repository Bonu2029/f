import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase/server';
import { getBillingProvider } from '@/lib/providers/billing';
import { absoluteUrl } from '@/lib/env';
import { errorResponse, errors } from '@/lib/errors';
import { newRequestId } from '@/lib/logger';

/**
 * Redirects the owner to the Stripe Customer Portal, where payment methods,
 * invoices and cancellation are handled by Stripe rather than by us.
 */
export async function POST() {
  const requestId = newRequestId();
  try {
    const ctx = await requireRole('owner');
    const svc = getServiceSupabase();
    const { data } = await svc
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('organization_id', ctx.active.organizationId)
      .maybeSingle();

    if (!data?.stripe_customer_id) {
      throw errors.subscriptionRequired();
    }

    const session = await getBillingProvider().createPortalSession(
      data.stripe_customer_id as string,
      absoluteUrl('/dashboard/billing'),
    );
    return NextResponse.json({ url: session.url });
  } catch (err) {
    return errorResponse(err, requestId);
  }
}
