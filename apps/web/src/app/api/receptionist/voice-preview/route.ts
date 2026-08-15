import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { isValidVoice } from '@afd/shared';
import { requireSession } from '@/lib/auth';
import { getAIProvider } from '@/lib/providers/ai';
import { clientIp, enforceRateLimit } from '@/lib/rate-limit';
import { errorResponse, errors } from '@/lib/errors';
import { newRequestId } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const schema = z.object({
  voice: z.string().min(1).max(40),
  text: z.string().trim().min(1).max(300).optional(),
});

/**
 * Renders a real audio sample of a voice speaking the organisation's own
 * greeting, so the preview button plays what the caller will actually hear.
 */
export async function POST(request: NextRequest) {
  const requestId = newRequestId();
  try {
    const ctx = await requireSession();
    await enforceRateLimit('voicePreview', `${clientIp(request.headers)}:${ctx.user.id}`);

    const input = schema.parse(await request.json());
    if (!isValidVoice(input.voice)) throw errors.validation('That voice is not available.');

    const provider = getAIProvider();
    const sample = await provider.synthesizeVoiceSample({
      voice: input.voice,
      text:
        input.text ??
        `Thanks for calling ${ctx.active.organizationName}. This is the virtual receptionist. How can I help you today?`,
    });

    return new NextResponse(new Uint8Array(sample.audio), {
      headers: {
        'content-type': sample.mimeType,
        'cache-control': 'private, max-age=300',
        'x-demo-audio': provider.isMock ? 'true' : 'false',
      },
    });
  } catch (err) {
    return errorResponse(err, requestId);
  }
}
