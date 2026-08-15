import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { formatPhone } from '@afd/shared';
import { requireSession } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase/server';
import { DEMO_MODE } from '@/lib/env';
import { Alert, Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { PhoneManager } from '@/components/dashboard/phone-manager';

export const metadata: Metadata = { title: 'Get a phone number' };
export const dynamic = 'force-dynamic';

export default async function OnboardingPhonePage() {
  const ctx = await requireSession();
  const svc = getServiceSupabase();

  const { data: number } = await svc
    .from('phone_numbers')
    .select('*')
    .eq('organization_id', ctx.active.organizationId)
    .eq('status', 'active')
    .maybeSingle();

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Connect your phone</h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Get a new AI number, then forward your existing business line to it. Your customers keep
          dialling the number they already know.
        </p>
      </header>

      {DEMO_MODE && (
        <Alert tone="caution" title="Demo mode">
          Numbers here are simulated and cannot receive real calls.
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Option A — get a new AI number</CardTitle>
        </CardHeader>
        <CardContent>
          <PhoneManager
            canEdit
            current={
              number
                ? {
                    phone_number: number.phone_number as string,
                    display: formatPhone(number.phone_number as string),
                    is_demo: number.is_demo as boolean,
                    forwarding_mode: (number.forwarding_mode as string) ?? 'none',
                    forwarding_target: (number.forwarding_target as string) ?? '',
                    capabilities: number.capabilities as { voice: boolean; sms: boolean; mms: boolean },
                  }
                : null
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Option B — keep your current business number</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-ink-muted">
          <p>
            You do not port or give up your number. You set up call forwarding with your existing
            carrier so calls arrive at your AI number.
          </p>
          <ol className="list-decimal space-y-1.5 pl-5">
            <li>Get your AI number above.</li>
            <li>Open your carrier&rsquo;s app or portal, or dial their forwarding code.</li>
            <li>Choose: all calls, only unanswered calls, or only after hours.</li>
            <li>Set your AI number as the forwarding destination.</li>
            <li>Test by calling your business number from another phone.</li>
          </ol>
          <p className="text-xs">
            Forwarding options vary by carrier. We give you the steps, but we cannot configure your
            carrier for you.
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button asChild disabled={!number}>
          <Link href="/onboarding/calendar">
            Next: connect a calendar <ArrowRight aria-hidden />
          </Link>
        </Button>
      </div>
    </div>
  );
}
