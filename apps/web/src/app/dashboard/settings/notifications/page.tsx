import type { Metadata } from 'next';
import { requireSession } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { NotificationPrefsForm } from './prefs-form';

export const metadata: Metadata = { title: 'Notification settings' };
export const dynamic = 'force-dynamic';

export default async function NotificationSettingsPage() {
  const ctx = await requireSession();
  const svc = getServiceSupabase();

  const { data: prefs } = await svc
    .from('notification_preferences')
    .select('*')
    .eq('organization_id', ctx.active.organizationId)
    .maybeSingle();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email notifications</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-ink-muted">
          In-app notifications are always on. These control what is emailed to owners and admins.
        </p>
        <NotificationPrefsForm
          canEdit={ctx.active.role !== 'staff'}
          initial={{
            email_new_lead: (prefs?.email_new_lead as boolean) ?? true,
            email_appointment: (prefs?.email_appointment as boolean) ?? true,
            email_usage_alerts: (prefs?.email_usage_alerts as boolean) ?? true,
            email_billing: (prefs?.email_billing as boolean) ?? true,
          }}
        />
      </CardContent>
    </Card>
  );
}
