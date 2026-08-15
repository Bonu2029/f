import type { Metadata } from 'next';
import { requireSession } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase/server';
import { Alert, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { ReceptionistForm } from '@/components/dashboard/receptionist-form';
import { RulesEditor } from '@/components/dashboard/rules-editor';
import { PauseToggle } from '@/components/dashboard/pause-toggle';
import { BrowserTest } from '@/components/dashboard/browser-test';
import { getReadinessChecklist } from '@/server/organizations';

export const metadata: Metadata = { title: 'Receptionist' };
export const dynamic = 'force-dynamic';

export default async function ReceptionistPage() {
  const ctx = await requireSession();
  const svc = getServiceSupabase();
  const canEdit = ctx.active.role !== 'staff';

  const [{ data: agent }, { data: rules }, readiness] = await Promise.all([
    svc.from('ai_agents').select('*').eq('organization_id', ctx.active.organizationId).maybeSingle(),
    svc
      .from('ai_rules')
      .select('*')
      .eq('organization_id', ctx.active.organizationId)
      .order('priority'),
    getReadinessChecklist(ctx.active.organizationId),
  ]);

  if (!agent) {
    return (
      <Alert tone="critical" title="Your receptionist configuration is missing">
        This should not happen. Contact support so we can rebuild it.
      </Alert>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Receptionist</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Changes apply to the next call. You never need to contact us to make one.
          </p>
        </div>
        {canEdit && <PauseToggle paused={ctx.active.aiPaused} isLive={readiness.isLive} />}
      </header>

      {!readiness.isLive && (
        <Alert tone="caution" title="Not answering calls yet">
          {readiness.canGoLive
            ? 'Everything required is in place — activate your receptionist from the setup wizard.'
            : `Still needed: ${readiness.items.filter((i) => i.required && !i.done).map((i) => i.label).join(', ')}.`}
        </Alert>
      )}

      {!canEdit && (
        <Alert tone="neutral" title="Read-only">
          Your role can view these settings but not change them. Ask an owner or admin.
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Voice and personality</CardTitle>
        </CardHeader>
        <CardContent>
          <ReceptionistForm
            canEdit={canEdit}
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

      <Card>
        <CardHeader>
          <CardTitle>Receptionist rules</CardTitle>
        </CardHeader>
        <CardContent>
          <RulesEditor
            canEdit={canEdit}
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
        <CardHeader>
          <CardTitle>Test your receptionist</CardTitle>
        </CardHeader>
        <CardContent>
          <BrowserTest canTest={canEdit} />
        </CardContent>
      </Card>
    </div>
  );
}
