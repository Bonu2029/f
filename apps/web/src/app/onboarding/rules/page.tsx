import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { requireSession } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase/server';
import { Button, Card, CardContent } from '@/components/ui';
import { RulesEditor } from '@/components/dashboard/rules-editor';

export const metadata: Metadata = { title: 'Set the rules' };
export const dynamic = 'force-dynamic';

export default async function OnboardingRulesPage() {
  const ctx = await requireSession();
  const svc = getServiceSupabase();

  const { data: rules } = await svc
    .from('ai_rules')
    .select('*')
    .eq('organization_id', ctx.active.organizationId)
    .order('priority');

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Set the rules</h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          The safety rules below are always on. Add your own for anything specific to how you work.
        </p>
      </header>

      <Card>
        <CardContent className="pt-5">
          <RulesEditor
            canEdit
            rules={(rules ?? []).map((r) => ({
              id: r.id as string,
              title: r.title as string,
              instruction: r.instruction as string,
              enabled: r.enabled as boolean,
              is_system: r.is_system as boolean,
              priority: r.priority as number,
            }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <h2 className="text-sm font-semibold text-ink">Rules other businesses add</h2>
          <ul className="mt-2 space-y-1.5 text-sm text-ink-muted">
            <li>&ldquo;Never quote a roofing project without an inspection.&rdquo;</li>
            <li>&ldquo;Transfer any call involving an active water leak.&rdquo;</li>
            <li>&ldquo;We don&rsquo;t service New Jersey — take a message and say so politely.&rdquo;</li>
            <li>&ldquo;Ask whether the caller owns the property before booking.&rdquo;</li>
            <li>&ldquo;Do not schedule same-day installations.&rdquo;</li>
          </ul>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button asChild>
          <Link href="/onboarding/test">
            Next: test it <ArrowRight aria-hidden />
          </Link>
        </Button>
      </div>
    </div>
  );
}
