import type { Metadata } from 'next';
import Link from 'next/link';
import { Check, X } from 'lucide-react';
import { formatPhone } from '@afd/shared';
import { requireSession } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase/server';
import { Alert, Button, Card, CardContent } from '@/components/ui';
import { getReadinessChecklist } from '@/server/organizations';
import { ActivateButton } from './activate-button';

export const metadata: Metadata = { title: 'Go live' };
export const dynamic = 'force-dynamic';

export default async function GoLivePage() {
  const ctx = await requireSession();
  const svc = getServiceSupabase();

  const [readiness, { data: number }] = await Promise.all([
    getReadinessChecklist(ctx.active.organizationId),
    svc
      .from('phone_numbers')
      .select('phone_number, is_demo')
      .eq('organization_id', ctx.active.organizationId)
      .eq('status', 'active')
      .maybeSingle(),
  ]);

  if (readiness.isLive) {
    return (
      <div className="space-y-5">
        <Alert tone="positive" title="Your receptionist is live">
          {number
            ? `Calls to ${formatPhone(number.phone_number as string)} are being answered${number.is_demo ? ' — though this is a demo number and cannot receive real calls' : ''}.`
            : 'It is active and ready.'}
        </Alert>
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/dashboard">Go to your dashboard</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/dashboard/receptionist">Adjust settings</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Activate your receptionist</h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Once you activate, calls to your AI number are answered immediately. You can pause it any
          time.
        </p>
      </header>

      <Card>
        <CardContent className="pt-5">
          <ul className="space-y-2">
            {readiness.items.map((item) => (
              <li key={item.key} className="flex items-start gap-2.5 text-sm">
                {item.done ? (
                  <Check className="mt-0.5 size-4 shrink-0 text-positive" aria-hidden />
                ) : (
                  <X className={`mt-0.5 size-4 shrink-0 ${item.required ? 'text-critical' : 'text-ink-faint'}`} aria-hidden />
                )}
                <span className="min-w-0 flex-1">
                  <Link href={item.href} className="font-medium text-ink hover:underline">
                    {item.label}
                  </Link>
                  <span className="block text-xs text-ink-subtle">
                    {item.detail}
                    {!item.done && !item.required ? ' · optional' : ''}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-6">
            <ActivateButton canGoLive={readiness.canGoLive} />
            {!readiness.canGoLive && (
              <p className="mt-2 text-sm text-ink-subtle">
                Finish the required items above first.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
