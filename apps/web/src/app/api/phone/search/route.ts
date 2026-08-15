import { NextResponse, type NextRequest } from 'next/server';
import { phoneSearchSchema } from '@afd/shared';
import { requireRole } from '@/lib/auth';
import { getTelephonyProvider } from '@/lib/providers/telephony';
import { clientIp, enforceRateLimit } from '@/lib/rate-limit';
import { errorResponse } from '@/lib/errors';
import { newRequestId } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/** Searches the carrier for available voice+SMS numbers in an area code. */
export async function POST(request: NextRequest) {
  const requestId = newRequestId();
  try {
    const ctx = await requireRole('admin');
    await enforceRateLimit('phoneSearch', `${clientIp(request.headers)}:${ctx.user.id}`);

    const input = phoneSearchSchema.parse(await request.json());
    const provider = getTelephonyProvider();
    const numbers = await provider.searchAvailableNumbers({
      areaCode: input.area_code ?? null,
      contains: input.contains ?? null,
      country: input.country,
      limit: 12,
    });

    return NextResponse.json({
      numbers: numbers.filter((n) => n.capabilities.voice),
      demo: provider.isMock,
    });
  } catch (err) {
    return errorResponse(err, requestId);
  }
}
