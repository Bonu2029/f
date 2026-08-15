import 'server-only';
import { hashToken } from '@/lib/crypto';
import { getServiceSupabase } from '@/lib/supabase/server';
import { errors } from '@/lib/errors';

/**
 * Public photo-upload tokens.
 *
 * A token is:
 *   - 32 random bytes, base64url encoded (256 bits of entropy),
 *   - stored only as an HMAC-SHA256 hash, so a database leak is not replayable,
 *   - bound to exactly one lead in one organisation,
 *   - expiring (3 days) and capped at a maximum number of files,
 *   - revocable.
 *
 * The customer needs no account, and the token grants nothing except uploading
 * images against that single lead.
 */

export interface ResolvedUploadToken {
  id: string;
  organizationId: string;
  leadId: string;
  maxFiles: number;
  usedCount: number;
  businessName: string;
  expiresAt: string;
}

export async function resolveUploadToken(token: string): Promise<ResolvedUploadToken> {
  if (!token || token.length < 20 || token.length > 128) throw errors.tokenInvalid();

  const svc = getServiceSupabase();
  const { data } = await svc
    .from('upload_tokens')
    .select('id, organization_id, lead_id, max_files, used_count, revoked, expires_at')
    .eq('token_hash', hashToken(token))
    .maybeSingle();

  if (!data || data.revoked) throw errors.tokenInvalid();
  if (new Date(data.expires_at as string) < new Date()) throw errors.tokenExpired();

  const { data: business } = await svc
    .from('business_profiles')
    .select('display_name')
    .eq('organization_id', data.organization_id as string)
    .maybeSingle();

  return {
    id: data.id as string,
    organizationId: data.organization_id as string,
    leadId: data.lead_id as string,
    maxFiles: data.max_files as number,
    usedCount: data.used_count as number,
    businessName: (business?.display_name as string) ?? 'the business',
    expiresAt: data.expires_at as string,
  };
}

/** Increments the use counter after a successful upload. */
export async function consumeUploadSlot(tokenId: string, count: number): Promise<void> {
  const svc = getServiceSupabase();
  const { data } = await svc.from('upload_tokens').select('used_count').eq('id', tokenId).maybeSingle();
  await svc
    .from('upload_tokens')
    .update({ used_count: ((data?.used_count as number) ?? 0) + count })
    .eq('id', tokenId);
}
