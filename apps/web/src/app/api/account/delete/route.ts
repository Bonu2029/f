import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase/server';
import { getBillingProvider } from '@/lib/providers/billing';
import { getVapiProvider } from '@/lib/providers/vapi';
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
 *   2. Release the phone number and delete the assistant at Vapi.
 *   3. Delete the organisation, which cascades to tenant data.
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

    // 2. Release the Vapi phone number, then delete the assistant. Order matters:
    //    deleting an assistant that a live number still points at would leave the
    //    number ringing into nothing while we are still billed for it.
    const vapi = getVapiProvider();

    const { data: numbers } = await svc
      .from('phone_numbers')
      .select('vapi_phone_number_id')
      .eq('organization_id', organizationId)
      .not('vapi_phone_number_id', 'is', null);
    for (const n of numbers ?? []) {
      try {
        await vapi.releasePhoneNumber(n.vapi_phone_number_id as string);
        releasedResources.push('phone_number');
      } catch (err) {
        logger.warn('number release failed during deletion', { error: err });
      }
    }

    const { data: org } = await svc
      .from('organizations')
      .select('vapi_assistant_id')
      .eq('id', organizationId)
      .maybeSingle();
    if (org?.vapi_assistant_id) {
      try {
        await vapi.deleteAssistant(org.vapi_assistant_id as string);
        releasedResources.push('vapi_assistant');
      } catch (err) {
        logger.warn('assistant deletion failed during deletion', { error: err });
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

    // 3. Delete the organisation; tenant tables cascade.
    const { error } = await svc.from('organizations').delete().eq('id', organizationId);
    if (error) throw errors.conflict(`The account could not be deleted: ${error.message}`);

    logger.info('organization deleted', { organization_id: organizationId });
    return NextResponse.json({ deleted: true, released: releasedResources });
  } catch (err) {
    return errorResponse(err, requestId);
  }
}
