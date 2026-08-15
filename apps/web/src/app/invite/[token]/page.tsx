import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { brand } from '@afd/shared';
import { getUser } from '@/lib/auth';
import { acceptInviteAction } from '@/server/team';
import { BrandMark } from '@/components/brand-mark';
import { Alert, Button, Card, CardContent } from '@/components/ui';

export const metadata: Metadata = { title: 'Accept invitation', robots: { index: false } };
export const dynamic = 'force-dynamic';

/**
 * Invitation acceptance. Signed-out visitors are sent to sign in first and
 * returned here, so the invite can only be redeemed by the invited address.
 */
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user = await getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);
  }

  const result = await acceptInviteAction(token);
  if (result.ok) redirect('/dashboard');

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-lg items-center px-4">
          <BrandMark />
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-lg flex-1 px-4 py-12">
        <Card>
          <CardContent className="space-y-4 pt-6">
            <Alert tone="critical" title={result.message ?? 'This invitation cannot be used'}>
              {result.action && <p>{result.action}</p>}
            </Alert>
            <p className="text-sm text-ink-muted">
              Ask whoever invited you to send a new invitation, or contact{' '}
              <a className="text-brand-600 hover:underline" href={`mailto:${brand.contact.support}`}>
                {brand.contact.support}
              </a>
              .
            </p>
            <Button asChild variant="secondary">
              <Link href="/dashboard">Go to your dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
