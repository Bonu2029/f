import type { Metadata } from 'next';
import { requireSession } from '@/lib/auth';
import { Alert, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { AccountDangerZone } from './danger-zone';

export const metadata: Metadata = { title: 'Account' };
export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const ctx = await requireSession();
  const isOwner = ctx.active.role === 'owner';

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Export your data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-ink-muted">
            Download everything this account holds about your business: profile, services, FAQs,
            policies, service areas, leads, calls, transcripts, appointments and messages, as a
            single JSON file.
          </p>
          {!isOwner && <Alert tone="neutral" title="Only an owner can export account data." />}
          <AccountDangerZone isOwner={isOwner} organizationName={ctx.active.organizationName} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data retention</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-ink-muted">
          <p>
            While your subscription is active we keep your business data, calls, transcripts, leads
            and appointments so they are available in your dashboard.
          </p>
          <p>
            After deletion, operational data is removed and provisioned resources such as your phone
            number are released. Billing and audit records are retained where financial and legal
            record-keeping obligations require it.
          </p>
          <p className="text-xs text-ink-subtle">
            Retention periods should be reviewed with counsel before commercial launch — see the
            Privacy Policy, which is currently a template.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
