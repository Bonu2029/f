import { NextResponse, type NextRequest } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/server';
import { clientIp, enforceRateLimit } from '@/lib/rate-limit';
import { errorResponse, errors } from '@/lib/errors';
import { childLogger, newRequestId } from '@/lib/logger';
import { consumeUploadSlot, resolveUploadToken } from '@/server/upload-tokens';
import { notify } from '@/server/notifications';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

/**
 * Public photo upload. No account required — the bearer of a valid, unexpired
 * token may attach images to exactly one lead.
 *
 * Defences:
 *   - rate limited per IP,
 *   - token validated against a stored hash, expiry and revocation,
 *   - MIME allow-list AND magic-byte sniffing (a renamed .exe is rejected),
 *   - per-file size cap and a per-token file count cap,
 *   - stored in a private bucket under the owning organisation's prefix.
 */
export async function POST(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const requestId = newRequestId();
  const logger = childLogger({ request_id: requestId, event: 'upload.public' });

  try {
    await enforceRateLimit('publicUpload', clientIp(request.headers));
    const { token } = await context.params;
    const resolved = await resolveUploadToken(token);

    const form = await request.formData();
    const files = form.getAll('files').filter((f): f is File => f instanceof File);
    if (files.length === 0) throw errors.uploadRejected('No photos were received.');

    const remaining = resolved.maxFiles - resolved.usedCount;
    if (remaining <= 0) {
      throw errors.uploadRejected(
        'This link has already received the maximum number of photos. Contact the business if you need to send more.',
      );
    }
    if (files.length > remaining) {
      throw errors.uploadRejected(
        `You can upload ${remaining} more photo${remaining === 1 ? '' : 's'} with this link.`,
      );
    }

    const svc = getServiceSupabase();
    const stored: Array<{ name: string; path: string }> = [];

    for (const file of files) {
      if (file.size === 0) throw errors.uploadRejected(`"${file.name}" is empty.`);
      if (file.size > MAX_FILE_BYTES) {
        throw errors.uploadRejected(
          `"${file.name}" is ${(file.size / 1e6).toFixed(1)} MB. Each photo must be under 15 MB.`,
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const sniffed = sniffImageType(buffer);
      if (!sniffed || !ALLOWED_MIME.has(sniffed)) {
        throw errors.uploadRejected(
          `"${file.name}" is not a photo we can accept. Send a JPEG, PNG, WebP or HEIC image.`,
        );
      }

      const extension = sniffed.split('/')[1]!.replace('jpeg', 'jpg');
      const path = `${resolved.organizationId}/${resolved.leadId}/${crypto.randomUUID()}.${extension}`;

      const { error } = await svc.storage
        .from('lead-photos')
        .upload(path, buffer, { contentType: sniffed, upsert: false });
      if (error) {
        logger.error('photo storage failed', { error: error.message });
        throw errors.providerUnavailable('Photo storage');
      }

      await svc.from('lead_photos').insert({
        organization_id: resolved.organizationId,
        lead_id: resolved.leadId,
        storage_path: path,
        mime_type: sniffed,
        size_bytes: file.size,
      });

      stored.push({ name: file.name, path });
    }

    await consumeUploadSlot(resolved.id, stored.length);

    const { data: lead } = await svc
      .from('leads')
      .select('name')
      .eq('id', resolved.leadId)
      .maybeSingle();

    await notify({
      organizationId: resolved.organizationId,
      kind: 'lead_created',
      title: `${stored.length} photo${stored.length === 1 ? '' : 's'} uploaded`,
      body: `${(lead?.name as string) ?? 'A customer'} sent photos for their enquiry.`,
      link: `/dashboard/leads/${resolved.leadId}`,
    });

    logger.info('public photos uploaded', {
      organization_id: resolved.organizationId,
      count: stored.length,
    });

    return NextResponse.json({
      uploaded: stored.length,
      remaining: resolved.maxFiles - resolved.usedCount - stored.length,
    });
  } catch (err) {
    return errorResponse(err, requestId);
  }
}

/**
 * Identifies an image by its magic bytes rather than trusting the client's
 * Content-Type header.
 */
export function sniffImageType(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';

  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  const riff = buffer.toString('ascii', 0, 4);
  const webp = buffer.toString('ascii', 8, 12);
  if (riff === 'RIFF' && webp === 'WEBP') return 'image/webp';

  // ISO base media file format: HEIC / HEIF brands.
  if (buffer.toString('ascii', 4, 8) === 'ftyp') {
    const brand = buffer.toString('ascii', 8, 12);
    if (['heic', 'heix', 'hevc', 'heim', 'heis'].includes(brand)) return 'image/heic';
    if (['mif1', 'msf1', 'heif'].includes(brand)) return 'image/heif';
  }

  return null;
}
