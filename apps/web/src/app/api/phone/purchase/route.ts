import { NextResponse, type NextRequest } from 'next/server';
import { phonePurchaseSchema } from '@afd/shared';
import { requireRole, getSubscriptionState, isServiceable } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase/server';
import { getTelephonyProvider } from '@/lib/providers/telephony';
import { twilioEnv, DEMO_MODE } from '@/lib/env';
import { clientIp, enforceRateLimit } from '@/lib/rate-limit';
import { errorResponse, errors } from '@/lib/errors';
import { AUDIT_ACTIONS, recordAudit, recordErrorEvent } from '@/lib/audit';
import { newRequestId, childLogger } from '@/lib/logger';
import { advanceOnboarding } from '@/server/organizations';
import { getPlan } from '@afd/shared';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * Provisions a phone number and attaches it to the SIP trunk that routes calls
 * to OpenAI Realtime.
 *
 * Failure handling is deliberate: if the trunk attachment fails after purchase,
 * the number is released again so the customer is not left paying a carrier for
 * a number that cannot receive AI calls.
 */
export async function POST(request: NextRequest) {
  const requestId = newRequestId();
  const logger = childLogger({ request_id: requestId, event: 'phone.purchase' });

  try {
    const ctx = await requireRole('admin');
    await enforceRateLimit('phonePurchase', `${clientIp(request.headers)}:${ctx.active.organizationId}`);

    const subscription = await getSubscriptionState(ctx.active.organizationId);
    if (!isServiceable(subscription?.status)) throw errors.subscriptionRequired();

    const svc = getServiceSupabase();
    const plan = getPlan(subscription?.plan);
    const { count } = await svc
      .from('phone_numbers')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', ctx.active.organizationId)
      .eq('status', 'active');

    if ((count ?? 0) >= plan.includedPhoneNumbers) {
      throw errors.conflict(
        `Your plan includes ${plan.includedPhoneNumbers} AI phone number. Release the current number before getting another.`,
      );
    }

    const input = phonePurchaseSchema.parse(await request.json());
    const provider = getTelephonyProvider();

    const purchased = await provider.purchaseNumber(
      input.phone_number,
      `${ctx.active.organizationName} — AI receptionist`,
    );

    if (!DEMO_MODE) {
      try {
        await provider.attachToSipTrunk(purchased.sid, twilioEnv.sipTrunkSid);
      } catch (err) {
        // Roll the purchase back rather than leaving a number that cannot work.
        logger.error('trunk attach failed, releasing number', { error: err });
        await provider.releaseNumber(purchased.sid).catch(() => undefined);
        await recordErrorEvent({
          organizationId: ctx.active.organizationId,
          scope: 'phone.trunk_attach',
          message: 'Number purchase rolled back because SIP trunk attachment failed.',
          requestId,
        });
        throw errors.phoneProvisioningFailed(
          'The number could not be connected to the AI, so it was released and you have not been charged for it.',
        );
      }
    }

    const { error } = await svc.from('phone_numbers').insert({
      organization_id: ctx.active.organizationId,
      twilio_sid: purchased.sid,
      phone_number: purchased.phoneNumber,
      friendly_name: `${ctx.active.organizationName} — AI receptionist`,
      capabilities: purchased.capabilities,
      status: 'active',
      is_demo: provider.isMock,
    });

    if (error) {
      await provider.releaseNumber(purchased.sid).catch(() => undefined);
      throw errors.phoneProvisioningFailed('The number could not be saved, so it was released.');
    }

    await advanceOnboarding(ctx.active.organizationId, 5);
    await recordAudit({
      organizationId: ctx.active.organizationId,
      actorUserId: ctx.user.id,
      actorEmail: ctx.user.email ?? null,
      action: AUDIT_ACTIONS.PHONE_PROVISIONED,
      targetType: 'phone_number',
      targetId: purchased.sid,
      metadata: { number: purchased.phoneNumber, demo: provider.isMock },
    });

    logger.info('number provisioned', {
      organization_id: ctx.active.organizationId,
      demo: provider.isMock,
    });

    return NextResponse.json({
      phone_number: purchased.phoneNumber,
      capabilities: purchased.capabilities,
      demo: provider.isMock,
    });
  } catch (err) {
    return errorResponse(err, requestId);
  }
}
