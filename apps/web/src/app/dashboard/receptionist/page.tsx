import type { Metadata } from 'next';
import Link from 'next/link';
import { webhookUrlProblem } from '@afd/shared';
import { requireSession } from '@/lib/auth';
import { absoluteUrl, DEMO_MODE } from '@/lib/env';
import { getServiceSupabase } from '@/lib/supabase/server';
import { Alert, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { ReceptionistForm } from '@/components/dashboard/receptionist-form';
import { ReceptionistStatus } from '@/components/dashboard/receptionist-status';
import { RulesEditor } from '@/components/dashboard/rules-editor';
import { PauseToggle } from '@/components/dashboard/pause-toggle';
import { getReadinessChecklist } from '@/server/organizations';

export const metadata: Metadata = { title: 'AI Receptionist' };
export const dynamic = 'force-dynamic';

export default async function ReceptionistPage() {
  const ctx = await requireSession();
  const svc = getServiceSupabase();
  const canEdit = ctx.active.role !== 'staff';
  const organizationId = ctx.active.organizationId;

  const [
    { data: agent },
    { data: rules },
    { data: phone },
    { data: subscription },
    readiness,
    { data: bookable },
  ] = await Promise.all([
      svc.from('ai_agents').select('*').eq('organization_id', organizationId).maybeSingle(),
      svc.from('ai_rules').select('*').eq('organization_id', organizationId).order('priority'),
      svc
        .from('phone_numbers')
        .select('phone_number, is_demo')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .maybeSingle(),
      svc.from('subscriptions').select('status').eq('organization_id', organizationId).maybeSingle(),
      getReadinessChecklist(organizationId),
      // The join is the point: an active employee with no hours cannot be
      // offered to anyone, so No Callback Mode could not be honoured for them.
      svc
        .from('employees')
        .select('id, employee_availability!inner(id)')
        .eq('organization_id', organizationId)
        .eq('active', true),
    ]);

  const bookableCount = new Set((bookable ?? []).map((e) => e.id as string)).size;

  if (!agent) {
    return (
      <Alert tone="critical" title="Your receptionist configuration is missing">
        This should not happen. Contact support so we can rebuild it.
      </Alert>
    );
  }

  const subscriptionActive = ['active', 'trialing'].includes(subscription?.status ?? '');
  const missing = readiness.items.filter((i) => i.required && !i.done).map((i) => i.label);

  // Where Vapi posts the record of each call. Shown because when it is wrong,
  // every other indicator on this page still reads healthy — the assistant is
  // synced, the number is live, and calls simply never appear.
  const callbackUrl = absoluteUrl('/api/webhooks/vapi');
  const callbackProblem = DEMO_MODE ? null : webhookUrlProblem(callbackUrl);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">AI Receptionist</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Changes apply to your next call. You never need to contact us to make one.
          </p>
        </div>
        {canEdit && <PauseToggle paused={ctx.active.aiPaused} isLive={readiness.isLive} />}
      </header>

      {!canEdit && (
        <Alert tone="neutral" title="Read-only">
          Your role can view these settings but not change them. Ask an owner or admin.
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
          <CardDescription>
            What your receptionist is doing right now, and what it still needs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReceptionistStatus
            canEdit={canEdit}
            canProvision={ctx.active.role === 'owner' && subscriptionActive}
            assistantId={(agent.vapi_assistant_id as string) ?? null}
            syncedAt={(agent.vapi_synced_at as string) ?? null}
            syncError={(agent.vapi_sync_error as string) ?? null}
            phoneNumber={(phone?.phone_number as string) ?? null}
            phoneIsDemo={Boolean(phone?.is_demo)}
            isLive={readiness.isLive}
            isReachable={readiness.isReachable}
            canGoLive={readiness.canGoLive}
            missing={missing}
            subscriptionActive={subscriptionActive}
            callbackUrl={callbackUrl}
            callbackProblem={callbackProblem}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Voice and personality</CardTitle>
          <CardDescription>
            What your receptionist knows about your business lives in{' '}
            <Link href="/dashboard/settings/business" className="font-medium text-brand-600 hover:underline">
              Business Settings
            </Link>
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReceptionistForm
            canEdit={canEdit}
            organizationName={ctx.active.organizationName}
            bookableCount={bookableCount}
            initial={{
              name: agent.name as string,
              voice_id: agent.voice_id as string,
              personality: agent.personality as string,
              greeting: agent.greeting as string,
              instructions: (agent.instructions as string) ?? '',
              no_callback_mode: Boolean(agent.no_callback_mode),
              transfer_enabled: agent.transfer_enabled as boolean,
              transfer_phone: (agent.transfer_phone as string) ?? '',
              appointment_booking_enabled: agent.appointment_booking_enabled as boolean,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Receptionist rules</CardTitle>
          <CardDescription>
            Extra instructions added to every call. The built-in safety rules cannot be deleted.
          </CardDescription>
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
    </div>
  );
}
