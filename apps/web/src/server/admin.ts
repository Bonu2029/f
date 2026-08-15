'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requirePlatformAdmin } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase/server';
import { AUDIT_ACTIONS, recordAudit } from '@/lib/audit';
import { emailTemplates, sendEmail } from '@/lib/providers/email';
import { absoluteUrl } from '@/lib/env';
import { actionError, actionOk, errors, type ActionResult } from '@/lib/errors';
import { ONBOARDING_STEPS } from '@afd/shared';

/**
 * Platform-admin actions.
 *
 * Every one re-checks super-admin status server-side and writes an audit row
 * naming the operator. There is deliberately no impersonation action.
 */

export async function adminSetAiPausedAction(
  organizationId: string,
  paused: boolean,
  reason: string,
): Promise<ActionResult> {
  try {
    const admin = await requirePlatformAdmin();
    if (reason.trim().length < 5) {
      return actionError(errors.validation('Give a reason of at least 5 characters — it is recorded in the audit log.'));
    }

    const svc = getServiceSupabase();
    const { error } = await svc.from('organizations').update({ ai_paused: paused }).eq('id', organizationId);
    if (error) throw errors.conflict(error.message);

    await svc.from('notifications').insert({
      organization_id: organizationId,
      kind: paused ? 'ai_unavailable' : 'phone_issue',
      title: paused ? 'Your receptionist was paused by support' : 'Your receptionist was resumed by support',
      body: reason.slice(0, 500),
      link: '/dashboard/receptionist',
    });

    await recordAudit({
      organizationId,
      actorUserId: admin.id,
      actorEmail: admin.email ?? null,
      action: AUDIT_ACTIONS.ADMIN_PAUSED_AI,
      targetType: 'organization',
      targetId: organizationId,
      metadata: { paused, reason },
    });

    revalidatePath(`/admin/businesses/${organizationId}`);
    return actionOk(undefined, paused ? 'Receptionist paused.' : 'Receptionist resumed.');
  } catch (err) {
    return actionError(err);
  }
}

/**
 * Adjusts recorded usage — for genuine billing corrections only. The delta and
 * reason are permanently audited, and a compensating ledger row is written so
 * the usage history still reconciles.
 */
export async function adminAdjustUsageAction(
  organizationId: string,
  deltaMinutes: number,
  reason: string,
): Promise<ActionResult> {
  try {
    const admin = await requirePlatformAdmin();
    const parsed = z
      .object({ delta: z.number().int().min(-10_000).max(10_000), reason: z.string().trim().min(10) })
      .safeParse({ delta: deltaMinutes, reason });

    if (!parsed.success) {
      return actionError(
        errors.validation(
          'Enter a whole number of minutes and a reason of at least 10 characters — both are audited.',
        ),
      );
    }

    const svc = getServiceSupabase();
    const { data: sub } = await svc
      .from('subscriptions')
      .select('used_minutes')
      .eq('organization_id', organizationId)
      .maybeSingle();
    if (!sub) return actionError(errors.notFound('That subscription'));

    const next = Math.max(0, (sub.used_minutes as number) + parsed.data.delta);
    await svc.from('subscriptions').update({ used_minutes: next }).eq('organization_id', organizationId);

    await svc.from('usage_ledger').insert({
      organization_id: organizationId,
      billing_period: new Date().toISOString().slice(0, 10),
      voice_seconds: 0,
      billable_minutes: parsed.data.delta,
      sms_count: 0,
      ai_usage_metadata: { kind: 'admin_adjustment', reason: parsed.data.reason, operator: admin.email },
      reported_to_stripe: false,
    });

    await recordAudit({
      organizationId,
      actorUserId: admin.id,
      actorEmail: admin.email ?? null,
      action: AUDIT_ACTIONS.ADMIN_ADJUSTED_USAGE,
      targetType: 'subscription',
      targetId: organizationId,
      metadata: { delta: parsed.data.delta, reason: parsed.data.reason, from: sub.used_minutes, to: next },
    });

    revalidatePath(`/admin/businesses/${organizationId}`);
    return actionOk(undefined, `Usage adjusted by ${parsed.data.delta} minutes. Now ${next}.`);
  } catch (err) {
    return actionError(err);
  }
}

export async function adminResendOnboardingEmailAction(
  organizationId: string,
  email: string,
): Promise<ActionResult> {
  try {
    const admin = await requirePlatformAdmin();
    if (!email) return actionError(errors.validation('That business has no owner email on record.'));

    const svc = getServiceSupabase();
    const { data: org } = await svc
      .from('organizations')
      .select('name, onboarding_step')
      .eq('id', organizationId)
      .maybeSingle();
    if (!org) return actionError(errors.notFound('That business'));

    const step = ONBOARDING_STEPS.find((s) => s.index === (org.onboarding_step as number)) ?? ONBOARDING_STEPS[0]!;

    await sendEmail(
      email,
      emailTemplates.onboardingNudge({
        organizationName: org.name as string,
        url: absoluteUrl(`/onboarding/${step.slug}`),
        step: step.label,
      }),
    );

    await recordAudit({
      organizationId,
      actorUserId: admin.id,
      actorEmail: admin.email ?? null,
      action: AUDIT_ACTIONS.ADMIN_RESENT_ONBOARDING,
      targetType: 'organization',
      targetId: organizationId,
      metadata: { to: email, step: step.slug },
    });

    return actionOk(undefined, `Onboarding email sent to ${email}.`);
  } catch (err) {
    return actionError(err);
  }
}
