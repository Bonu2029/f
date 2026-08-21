import 'server-only';
import { getServiceSupabase } from '@/lib/supabase/server';
import { log } from '@/lib/logger';

/**
 * Members of an organisation, with the person behind each membership.
 *
 * This exists because the obvious way to write it does not work and does not
 * say so. `organization_members.user_id` and `profiles.id` both reference
 * `auth.users`, but there is no foreign key BETWEEN them — so PostgREST cannot
 * infer the relationship, and `select('role, profile:profiles(email)')` returns
 * PGRST200. Every call site discarded the error and read `null` profiles from an
 * empty result.
 *
 * The consequences were entirely silent: no owner has ever received an
 * operational email — new lead, usage alert, payment failure, job summary — and
 * the team page listed memberships with nobody attached to them.
 *
 * Two queries, with both errors checked. Slower than an embed and correct,
 * which is the right trade for something whose failure mode is silence.
 */

export interface OrganizationMember {
  id: string;
  userId: string;
  role: string;
  createdAt: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
}

export async function listOrganizationMembers(
  organizationId: string,
  options: { roles?: string[] } = {},
): Promise<OrganizationMember[]> {
  const svc = getServiceSupabase();

  let query = svc
    .from('organization_members')
    .select('id, user_id, role, created_at')
    .eq('organization_id', organizationId);

  if (options.roles?.length) query = query.in('role', options.roles);

  const { data: members, error: membersError } = await query;
  if (membersError) {
    log.error('could not read organisation members', {
      event: 'members.read_failed',
      organization_id: organizationId,
      error: membersError.message,
    });
    return [];
  }
  if (!members?.length) return [];

  const userIds = members.map((m) => m.user_id as string);
  const { data: profiles, error: profilesError } = await svc
    .from('profiles')
    .select('id, email, first_name, last_name')
    .in('id', userIds);

  if (profilesError) {
    // Loud, because the caller is about to behave as though these people have
    // no email address — which is how notifications disappear.
    log.error('could not read member profiles', {
      event: 'members.profiles_read_failed',
      organization_id: organizationId,
      error: profilesError.message,
    });
  }

  const byId = new Map(
    (profiles ?? []).map((p) => [
      p.id as string,
      {
        email: (p.email as string) ?? null,
        firstName: (p.first_name as string) ?? null,
        lastName: (p.last_name as string) ?? null,
      },
    ]),
  );

  const missing = userIds.filter((id) => !byId.has(id));
  if (missing.length > 0) {
    log.warn('members with no profile row', {
      event: 'members.profile_missing',
      organization_id: organizationId,
      count: missing.length,
    });
  }

  return members.map((m) => {
    const profile = byId.get(m.user_id as string);
    return {
      id: m.id as string,
      userId: m.user_id as string,
      role: m.role as string,
      createdAt: (m.created_at as string) ?? null,
      email: profile?.email ?? null,
      firstName: profile?.firstName ?? null,
      lastName: profile?.lastName ?? null,
    };
  });
}
