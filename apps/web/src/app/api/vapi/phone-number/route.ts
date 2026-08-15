import { NextResponse, type NextRequest } from 'next/server';
import { phoneProvisionSchema } from '@afd/shared';
import { requireRole } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase/server';
import { errorResponse, errors } from '@/lib/errors';
import { clientIp, enforceRateLimit } from '@/lib/rate-limit';
import { childLogger, newRequestId } from '@/lib/logger';
import { provisionPhoneNumber } from '@/server/vapi-sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Gets the business its AI phone number.
 *
 * Only an owner can do this, because it starts a recurring charge on our Vapi
 * account. The subscription is checked first: we do not buy numbers for accounts
 * that are not paying.
 */
export async function POST(request: NextRequest) {
  const requestId = newRequestId();
  const logger = childLogger({ request_id: requestId, event: 'vapi.phone.provision' });

  try {
    const ctx = await requireRole('owner');
    await enforceRateLimit('phonePurchase', `${clientIp(request.headers)}:${ctx.user.id}`);

    const body = await request.json().catch(() => ({}));
    const { area_code } = phoneProvisionSchema.parse(body);

    const svc = getServiceSupabase();
    const { data: subscription } = await svc
      .from('subscriptions')
      .select('status')
      .eq('organization_id', ctx.active.organizationId)
      .maybeSingle();

    if (!['active', 'trialing'].includes(subscription?.status ?? '')) {
      throw errors.subscriptionRequired();
    }

    const result = await provisionPhoneNumber({
      organizationId: ctx.active.organizationId,
      areaCode: area_code ?? null,
      actorUserId: ctx.user.id,
      actorEmail: ctx.user.email ?? null,
    });

    logger.info('phone number provisioned', {
      organization_id: ctx.active.organizationId,
      demo: result.isDemo,
    });

    return NextResponse.json({
      phone_number: result.phoneNumber,
      phone_number_id: result.phoneNumberId,
      demo: result.isDemo,
      request_id: requestId,
    });
  } catch (err) {
    logger.error('phone number provisioning failed', { error: err });
    return errorResponse(err, requestId);
  }
}
