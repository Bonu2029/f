import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Check, X } from 'lucide-react';
import { formatPhone } from '@afd/shared';
import { requireSession } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase/server';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { BrowserTest } from '@/components/dashboard/browser-test';
import { getReadinessChecklist } from '@/server/organizations';

export const metadata: Metadata = { title: 'Test your receptionist' };
export const dynamic = 'force-dynamic';

export default async function OnboardingTestPage() {
  const ctx = await requireSession();
  const svc = getServiceSupabase();

  const [readiness, { data: number }] = await Promise.all([
    getReadinessChecklist(ctx.active.organizationId),
    svc
      .from('phone_numbers')
      .select('phone_number')
      .eq('organization_id', ctx.active.organizationId)
      .eq('status', 'active')
      .maybeSingle(),
  ]);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Test your receptionist</h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Have a conversation with it before real customers do.
        </p>
      </header>

      <Card>
        <CardContent className="pt-5">
          <BrowserTest canTest />
          {number && (
            <p className="mt-4 rounded-lg bg-surface-sunken px-3 py-2 text-sm text-ink-muted">
              Your AI number is{' '}
              <strong className="tabular text-ink">{formatPhone(number.phone_number as string)}</strong>.
              Calling it uses telephony minutes and appears in your call history.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Readiness checklist</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button asChild>
          <Link href="/onboarding/live">
            Next: go live <ArrowRight aria-hidden />
          </Link>
        </Button>
      </div>
    </div>
  );
}
