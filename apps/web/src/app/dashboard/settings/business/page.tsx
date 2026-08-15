import type { Metadata } from 'next';
import { requireSession } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase/server';
import { Alert, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { BusinessTabs } from '@/components/dashboard/business-tabs';

export const metadata: Metadata = { title: 'Business settings' };
export const dynamic = 'force-dynamic';

export default async function BusinessSettingsPage() {
  const ctx = await requireSession();
  const canEdit = ctx.active.role !== 'staff';
  const svc = getServiceSupabase();
  const organizationId = ctx.active.organizationId;

  const [{ data: business }, { data: services }, { data: areas }, { data: faqs }, { data: agent }] =
    await Promise.all([
      svc.from('business_profiles').select('*').eq('organization_id', organizationId).maybeSingle(),
      svc.from('services').select('*').eq('organization_id', organizationId).order('name'),
      svc.from('service_areas').select('*').eq('organization_id', organizationId).order('created_at'),
      svc.from('faqs').select('*').eq('organization_id', organizationId).order('created_at'),
      svc
        .from('ai_agents')
        .select('vapi_sync_error, vapi_synced_at')
        .eq('organization_id', organizationId)
        .maybeSingle(),
    ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business settings</CardTitle>
        <CardDescription>
          This is what your receptionist knows. Every change is pushed to it when you save.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!canEdit && (
          <Alert tone="neutral" title="Read-only">
            Your role can view these details but not change them.
          </Alert>
        )}

        {agent?.vapi_sync_error ? (
          <Alert tone="caution" title="Your receptionist is behind these settings">
            <p>
              The last change was saved here but did not reach the voice provider:{' '}
              {agent.vapi_sync_error as string}
            </p>
            <p>
              Use <strong>Update receptionist</strong> on the AI Receptionist page to retry.
            </p>
          </Alert>
        ) : null}

        <BusinessTabs
          canEdit={canEdit}
          organizationName={ctx.active.organizationName}
          business={business ?? null}
          services={services ?? []}
          areas={areas ?? []}
          faqs={faqs ?? []}
        />
      </CardContent>
    </Card>
  );
}
