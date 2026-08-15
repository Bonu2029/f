import type { Metadata } from 'next';
import Link from 'next/link';
import { requireSession } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase/server';
import { Alert, Button, Card, CardContent } from '@/components/ui';
import { BusinessForm } from '@/components/dashboard/business-form';

export const metadata: Metadata = { title: 'Tell us about your business' };
export const dynamic = 'force-dynamic';

export default async function OnboardingBusinessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const ctx = await requireSession();
  const params = await searchParams;
  const svc = getServiceSupabase();

  const { data: business } = await svc
    .from('business_profiles')
    .select('*')
    .eq('organization_id', ctx.active.organizationId)
    .maybeSingle();

  return (
    <div className="space-y-5">
      {params.checkout === 'success' && (
        <Alert tone="positive" title="Payment received — welcome aboard">
          Let&rsquo;s teach your receptionist about your business.
        </Alert>
      )}
      {params.checkout === 'demo' && (
        <Alert tone="caution" title="Demo subscription activated">
          No payment was taken because this deployment runs in demo mode.
        </Alert>
      )}

      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Tell us about your business</h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          This is what your receptionist tells callers. You can change any of it later.
        </p>
      </header>

      <Card>
        <CardContent className="pt-5">
          <BusinessForm
            canEdit
            showImport
            submitLabel="Save and continue"
            initial={{
              display_name: (business?.display_name as string) ?? ctx.active.organizationName,
              legal_name: (business?.legal_name as string) ?? '',
              industry: (business?.industry as string) ?? '',
              website: (business?.website as string) ?? '',
              public_phone: (business?.public_phone as string) ?? '',
              email: (business?.email as string) ?? ctx.profile.email,
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

      <div className="flex justify-end">
        <Button asChild variant="secondary">
          <Link href="/onboarding/teach">Next: teach your AI</Link>
        </Button>
      </div>
    </div>
  );
}
