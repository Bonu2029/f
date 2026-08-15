import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase/server';
import { getBillingProvider } from '@/lib/providers/billing';
import { getTelephonyProvider } from '@/lib/providers/telephony';
import { errorResponse, errors } from '@/lib/errors';
import { AUDIT_ACTIONS, recordAudit } from '@/lib/audit';
import { childLogger, newRequestId } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Account deletion.
 *
 * Order matters, because provider resources cost money and cannot be released
 * once our record of them is gone:
 *   1. Cancel the subscription with the billing provider.
 *   2. Release the phone number with the telephony provider.
 *   3. Delete stored files.
 *   4. Delete the organisation, which cascades to tenant data.
 *
 * Audit rows survive: `audit_logs.organization_id` is ON DELETE SET NULL, so the
 * compliance record of the deletion itself is preserved.
 */
export async function POST(request: NextRequest) {
  const requestId = newRequestId();
  const logger = childLogger({ request_id: requestId, event: 'account.delete' });

  try {
    const ctx = await requireRole('owner');
    const { confirm } = z.object({ confirm: z.string() }).parse(await request.json());

    if (confirm !== ctx.active.organizationName) {
      throw errors.validation(
        'The confirmation text did not match your business name, so nothing was deleted.',
      );
    }

    const organizationId = ctx.active.organizationId;
    const svc = getServiceSupabase();
    const releasedResources: string[] = [];

    // 1. Cancel billing.
    const { data: subscription } = await svc
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('organization_id', organizationId)
      .maybeSingle();
    if (subscription?.stripe_subscription_id) {
      try {
        await getBillingProvider().cancelSubscription(subscription.stripe_subscription_id as string, false);
        releasedResources.push('subscription');
      } catch (err) {
        logger.warn('subscription cancellation failed during deletion', { error: err });
      }
    }

    // 2. Release phone numbers.
    const { data: numbers } = await svc
      .from('phone_numbers')
      .select('twilio_sid')
      .eq('organization_id', organizationId)
      .not('twilio_sid', 'is', null);
    for (const n of numbers ?? []) {
      try {
        await getTelephonyProvider().releaseNumber(n.twilio_sid as string);
        releasedResources.push('phone_number');
      } catch (err) {
        logger.warn('number release failed during deletion', { error: err });
      }
    }

    // 3. Delete stored files.
    for (const bucket of ['knowledge', 'lead-photos'] as const) {
      const { data: files } = await svc.storage.from(bucket).list(organizationId, { limit: 1000 });
      if (files?.length) {
        await svc.storage
          .from(bucket)
          .remove(files.map((f) => `${organizationId}/${f.name}`))
          .catch(() => undefined);
      }
    }

    // Audit BEFORE deletion so the record is written while the row still exists.
    await recordAudit({
      organizationId,
      actorUserId: ctx.user.id,
      actorEmail: ctx.user.email ?? null,
      action: AUDIT_ACTIONS.ACCOUNT_DELETION_REQUESTED,
      targetType: 'organization',
      targetId: organizationId,
      metadata: { released: releasedResources, note: 'Founder slot intentionally not returned to inventory.' },
    });

    // 4. Delete the organisation; tenant tables cascade.
    const { error } = await svc.from('organizations').delete().eq('id', organizationId);
    if (error) throw errors.conflict(`The account could not be deleted: ${error.message}`);

    logger.info('organization deleted', { organization_id: organizationId });
    return NextResponse.json({ deleted: true, released: releasedResources });
  } catch (err) {
    return errorResponse(err, requestId);
  }
}
