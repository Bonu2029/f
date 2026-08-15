import { NextResponse, type NextRequest } from 'next/server';
import { websiteImportSchema } from '@afd/shared';
import { requireRole } from '@/lib/auth';
import { getAIProvider } from '@/lib/providers/ai';
import { clientIp, enforceRateLimit } from '@/lib/rate-limit';
import { errorResponse, errors } from '@/lib/errors';
import { newRequestId, childLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BLOCKED_HOSTS = /^(localhost$|127\.|10\.|192\.168\.|169\.254\.|0\.|\[?::1\]?$|172\.(1[6-9]|2\d|3[01])\.)/i;

/**
 * Suggests business information from a public website.
 *
 * The result is returned to the browser for REVIEW — it is never written to the
 * database here. The owner edits and saves it themselves, so the AI can never
 * silently publish something it misread.
 *
 * SSRF protection: only http(s), no private address ranges, one hop, a response
 * size cap and a hard timeout.
 */
export async function POST(request: NextRequest) {
  const requestId = newRequestId();
  const logger = childLogger({ request_id: requestId, event: 'business.import_website' });

  try {
    const ctx = await requireRole('admin');
    await enforceRateLimit('websiteImport', `${clientIp(request.headers)}:${ctx.user.id}`);

    const { url } = websiteImportSchema.parse(await request.json());
    const target = new URL(url);

    if (!/^https?:$/.test(target.protocol) || BLOCKED_HOSTS.test(target.hostname)) {
      throw errors.validation('That address cannot be fetched. Use a public website URL.');
    }

    let response: Response;
    try {
      response = await fetch(target.toString(), {
        redirect: 'follow',
        headers: { 'user-agent': 'AIFrontDesk-Importer/1.0 (+business setup)' },
        signal: AbortSignal.timeout(12_000),
      });
    } catch {
      throw errors.validation(
        'We could not reach that website. Check the address, or enter your details manually.',
      );
    }

    if (!response.ok) {
      throw errors.validation(
        `That website returned ${response.status}. Check the address, or enter your details manually.`,
      );
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
      throw errors.validation('That link is not a web page we can read.');
    }

    const html = (await response.text()).slice(0, 400_000);
    const text = htmlToText(html);
    if (text.length < 120) {
      throw errors.validation(
        'There was not enough readable text on that page. Try your services or about page, or enter details manually.',
      );
    }

    const suggestion = await getAIProvider().extractFromWebsite({ url: target.toString(), text });
    logger.info('website import produced suggestions', { organization_id: ctx.active.organizationId });

    return NextResponse.json({
      suggestion,
      source: target.toString(),
      note: 'Nothing has been saved. Review each field and save the ones that are correct.',
    });
  } catch (err) {
    return errorResponse(err, requestId);
  }
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/(p|div|li|h[1-6]|tr|section)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 60_000);
}
