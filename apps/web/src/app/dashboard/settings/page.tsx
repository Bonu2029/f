import type { Metadata } from 'next';
import { requireSession } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase/server';
import { Alert, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { BusinessForm } from '@/components/dashboard/business-form';

export const metadata: Metadata = { title: 'Business settings' };
export const dynamic = 'force-dynamic';

export default async function BusinessSettingsPage() {
  const ctx = await requireSession();
  const canEdit = ctx.active.role !== 'staff';
  const svc = getServiceSupabase();

  const { data: business } = await svc
    .from('business_profiles')
    .select('*')
    .eq('organization_id', ctx.active.organizationId)
    .maybeSingle();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business details</CardTitle>
      </CardHeader>
      <CardContent>
        {!canEdit && (
          <Alert tone="neutral" title="Read-only" className="mb-4">
            Your role can view these details but not change them.
          </Alert>
        )}
        <BusinessForm
          canEdit={canEdit}
          showImport={false}
          initial={{
            display_name: (business?.display_name as string) ?? ctx.active.organizationName,
            legal_name: (business?.legal_name as string) ?? '',
            industry: (business?.industry as string) ?? '',
            website: (business?.website as string) ?? '',
            public_phone: (business?.public_phone as string) ?? '',
            email: (business?.email as string) ?? '',
            address: (business?.address as string) ?? '',
            city: (business?.city as string) ?? '',
            state: (business?.state as string) ?? '',
            postal_code: (business?.postal_code as string) ?? '',
            country: (business?.country as string) ?? 'US',
            timezone: (business?.timezone as string) ?? ctx.active.timezone,
            business_description: (business?.business_description as string) ?? '',
            emergency_information: (business?.emergency_information as string) ?? '',
            emergency_phone: (business?.emergency_phone as string) ?? '',
            business_hours: (business?.business_hours as unknown[]) ?? [],
          }}
        />
      </CardContent>
    </Card>
  );
}
