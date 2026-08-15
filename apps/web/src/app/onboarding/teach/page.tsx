import type { Metadata } from 'next';
import { requireSession } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase/server';
import { summarizeKnowledgeCoverage } from '@afd/shared';
import { loadOrgCallContext } from '@/server/call-context';
import { TrainingChat } from './training-chat';

export const metadata: Metadata = { title: 'Train your receptionist' };
export const dynamic = 'force-dynamic';

/**
 * The signature onboarding experience: a conversation that turns what the owner
 * says into structured, editable business knowledge.
 */
export default async function TeachPage() {
  const ctx = await requireSession();
  const svc = getServiceSupabase();

  const [{ data: history }, orgCtx] = await Promise.all([
    svc
      .from('training_messages')
      .select('id, role, content, extracted, created_at')
      .eq('organization_id', ctx.active.organizationId)
      .order('created_at')
      .limit(60),
    loadOrgCallContext(ctx.active.organizationId),
  ]);

  const coverage = orgCtx ? summarizeKnowledgeCoverage(orgCtx) : [];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Train your receptionist</h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Talk to your AI just like you would train a new employee.
        </p>
      </header>

      <TrainingChat
        businessName={ctx.active.organizationName}
        initialMessages={(history ?? []).map((m) => ({
          id: m.id as string,
          role: m.role as 'user' | 'assistant',
          content: m.content as string,
          changes: ((m.extracted as { changes?: unknown[] })?.changes ?? []) as Array<{
            kind: string;
            label: string;
            action: string;
          }>,
        }))}
        coverage={coverage}
      />
    </div>
  );
}
