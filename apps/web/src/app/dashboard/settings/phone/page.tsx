import type { Metadata } from 'next';
import { formatPhone } from '@afd/shared';
import { requireSession } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase/server';
import { DEMO_MODE, twilioEnv } from '@/lib/env';
import { Alert, Badge, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { PhoneManager } from '@/components/dashboard/phone-manager';

export const metadata: Metadata = { title: 'Phone settings' };
export const dynamic = 'force-dynamic';

export default async function PhoneSettingsPage() {
  const ctx = await requireSession();
  const canEdit = ctx.active.role !== 'staff';
  const svc = getServiceSupabase();

  const { data: number } = await svc
    .from('phone_numbers')
    .select('*')
    .eq('organization_id', ctx.active.organizationId)
    .eq('status', 'active')
    .maybeSingle();

  return (
    <div className="space-y-5">
      {DEMO_MODE && (
        <Alert tone="caution" title="Demo mode">
          Numbers shown here are simulated and cannot receive real calls. Add your Twilio
          credentials and set <code>DEMO_MODE=false</code> to provision a real number.
        </Alert>
      )}

      {!DEMO_MODE && !twilioEnv.configured && (
        <Alert tone="critical" title="Telephony is not configured">
          Set <code>TWILIO_ACCOUNT_SID</code>, <code>TWILIO_AUTH_TOKEN</code> and{' '}
          <code>TWILIO_SIP_TRUNK_SID</code> to buy numbers. See SETUP.md.
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Your AI phone number</CardTitle>
        </CardHeader>
        <CardContent>
          <PhoneManager
            canEdit={canEdit}
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
          <CardTitle>Keeping your existing number</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-ink-muted">
          <p>
            You do not have to change the number on your van or your website. Set up call forwarding
            with your existing phone carrier so calls reach your AI number.
          </p>
          <div className="rounded-lg border border-line bg-surface-sunken p-4">
            <p className="font-medium text-ink">How to forward calls</p>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5">
              <li>Open your carrier&rsquo;s app or account portal (or dial their forwarding code).</li>
              <li>
                Choose the type of forwarding you want: all calls, only unanswered calls, or only
                outside business hours.
              </li>
              <li>
                Enter your AI number{' '}
                {number ? (
                  <strong className="tabular text-ink">{formatPhone(number.phone_number as string)}</strong>
                ) : (
                  'once you have one'
                )}{' '}
                as the destination.
              </li>
              <li>Call your own business number from another phone to confirm it works.</li>
            </ol>
            <p className="mt-3 text-xs">
              Common codes on US mobile carriers: <code>*72</code> forward all, <code>*73</code>{' '}
              cancel, <code>*71</code> forward when busy or unanswered. Availability depends entirely
              on your carrier — we cannot program your carrier for you.
            </p>
          </div>
          <p>
            <Badge tone="neutral">Coming later</Badge> Full number porting, so your existing number
            moves to us permanently, is not part of this release.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
