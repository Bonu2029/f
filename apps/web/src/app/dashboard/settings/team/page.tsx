import type { Metadata } from 'next';
import { getPlan, initialsOf } from '@afd/shared';
import { requireSession } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase/server';
import { Alert, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { TeamManager } from './team-manager';

export const metadata: Metadata = { title: 'Team' };
export const dynamic = 'force-dynamic';

export default async function TeamPage() {
  const ctx = await requireSession();
  const canManage = ctx.active.role !== 'staff';
  const svc = getServiceSupabase();

  const [{ data: members }, { data: invites }, { data: subscription }] = await Promise.all([
    svc
      .from('organization_members')
      .select('id, role, created_at, user_id, profile:profiles(first_name, last_name, email)')
      .eq('organization_id', ctx.active.organizationId)
      .order('created_at'),
    canManage
      ? svc
          .from('team_invites')
          .select('id, email, role, expires_at, created_at')
          .eq('organization_id', ctx.active.organizationId)
          .is('accepted_at', null)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    svc.from('subscriptions').select('plan').eq('organization_id', ctx.active.organizationId).maybeSingle(),
  ]);

  type MemberRow = {
    id: string;
    role: string;
    created_at: string;
    user_id: string;
    profile: { first_name: string | null; last_name: string | null; email: string } | null;
  };

  const plan = getPlan(subscription?.plan);
  const rows = ((members ?? []) as unknown as MemberRow[]).map((m) => ({
    id: m.id,
    role: m.role,
    userId: m.user_id,
    isSelf: m.user_id === ctx.user.id,
    name:
      [m.profile?.first_name, m.profile?.last_name].filter(Boolean).join(' ') ||
      m.profile?.email ||
      'Team member',
    email: m.profile?.email ?? '',
    initials: initialsOf(m.profile?.first_name, m.profile?.last_name, m.profile?.email),
  }));

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Team members</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-ink-muted">
            <strong className="text-ink">Owner</strong> can do everything including billing.{' '}
            <strong className="text-ink">Admin</strong> can change settings, knowledge and the
            receptionist. <strong className="text-ink">Staff</strong> can work calls, leads and
            appointments.
          </p>

          {!canManage && (
            <Alert tone="neutral" title="Read-only" className="mb-4">
              Only owners and admins can invite or remove people.
            </Alert>
          )}

          <TeamManager
            canManage={canManage}
            viewerRole={ctx.active.role}
            members={rows}
            invites={(invites ?? []).map((i) => ({
              id: i.id as string,
              email: i.email as string,
              role: i.role as string,
              expiresAt: i.expires_at as string,
            }))}
            seatsUsed={rows.length + (invites ?? []).length}
            seatLimit={plan.maxTeamMembers}
          />
        </CardContent>
      </Card>
    </div>
  );
}
