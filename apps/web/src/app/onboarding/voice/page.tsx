import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { requireSession } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase/server';
import { Alert, Button, Card, CardContent } from '@/components/ui';
import { ReceptionistForm } from '@/components/dashboard/receptionist-form';

export const metadata: Metadata = { title: 'Choose a voice' };
export const dynamic = 'force-dynamic';

export default async function OnboardingVoicePage() {
  const ctx = await requireSession();
  const svc = getServiceSupabase();

  const { data: agent } = await svc
    .from('ai_agents')
    .select('*')
    .eq('organization_id', ctx.active.organizationId)
    .maybeSingle();

  if (!agent) {
    return <Alert tone="critical" title="Your receptionist configuration is missing. Contact support." />;
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Choose your receptionist</h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Give it a name, pick how it sounds, and decide what it is allowed to do.
        </p>
      </header>

      <Card>
        <CardContent className="pt-5">
          <ReceptionistForm
            canEdit
            organizationName={ctx.active.organizationName}
            initial={{
              display_name: agent.display_name as string,
              voice: agent.voice as string,
              language: agent.language as string,
              personality: agent.personality as string,
              speaking_pace: agent.speaking_pace as string,
              response_length: agent.response_length as string,
              greeting: agent.greeting as string,
              instructions: (agent.instructions as string) ?? '',
              transfer_enabled: agent.transfer_enabled as boolean,
              transfer_phone: (agent.transfer_phone as string) ?? '',
              sms_enabled: agent.sms_enabled as boolean,
              appointment_booking_enabled: agent.appointment_booking_enabled as boolean,
              photo_requests_enabled: agent.photo_requests_enabled as boolean,
              disclosure_setting: agent.disclosure_setting as string,
              fallback_phone: (agent.fallback_phone as string) ?? '',
            }}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button asChild>
          <Link href="/onboarding/phone">
            Next: get a phone number <ArrowRight aria-hidden />
          </Link>
        </Button>
      </div>
    </div>
  );
}
