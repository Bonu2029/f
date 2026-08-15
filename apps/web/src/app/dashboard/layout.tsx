import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase/server';
import { DashboardShell } from '@/components/dashboard/shell';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireSession();

  // An organisation that has not paid yet belongs in the checkout step, not in
  // a dashboard full of empty states.
  const svc = getServiceSupabase();
  const [{ data: subscription }, { count: unread }] = await Promise.all([
    svc
      .from('subscriptions')
      .select('status')
      .eq('organization_id', ctx.active.organizationId)
      .maybeSingle(),
    svc
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', ctx.active.organizationId)
      .is('read_at', null),
  ]);

  if (!subscription || ['incomplete', 'incomplete_expired'].includes(subscription.status)) {
    redirect('/onboarding/start');
  }

  const name =
    [ctx.profile.first_name, ctx.profile.last_name].filter(Boolean).join(' ') ||
    ctx.profile.email.split('@')[0]!;

  return (
    <DashboardShell
      organizationName={ctx.active.organizationName}
      userName={name}
      userEmail={ctx.profile.email}
      role={ctx.active.role}
      unreadCount={unread ?? 0}
      isPlatformAdmin={ctx.isPlatformAdmin}
      isDemo={ctx.active.isDemo}
      aiPaused={ctx.active.aiPaused}
    >
      {children}
    </DashboardShell>
  );
}
