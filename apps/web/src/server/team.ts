'use server';

import { revalidatePath } from 'next/cache';
import { getPlan, inviteSchema, roleAtLeast, type MemberRole } from '@afd/shared';
import { requireRole, requireSession } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase/server';
import { generateToken, hashToken } from '@/lib/crypto';
import { absoluteUrl } from '@/lib/env';
import { emailTemplates, sendEmail } from '@/lib/providers/email';
import { AUDIT_ACTIONS, recordAudit } from '@/lib/audit';
import { actionError, actionOk, errors, type ActionResult } from '@/lib/errors';

/**
 * Team management.
 *
 * Authorisation rules enforced here, server-side:
 *   - only owners and admins may invite;
 *   - nobody may grant a role higher than their own;
 *   - only an owner may create another owner, or change an owner's role;
 *   - the last owner cannot be removed or demoted (also enforced by a database
 *     trigger, so it holds even against direct SQL).
 */

export async function inviteMemberAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireRole('admin');
    const input = inviteSchema.parse({
      email: formData.get('email'),
      role: formData.get('role'),
    });
    const role = input.role as MemberRole;

    if (!roleAtLeast(ctx.active.role, role)) {
      return actionError(errors.forbidden(`invite someone as ${role}`));
    }

    const svc = getServiceSupabase();

    // Plan seat limit.
    const { data: subscription } = await svc
      .from('subscriptions')
      .select('plan')
      .eq('organization_id', ctx.active.organizationId)
      .maybeSingle();
    const plan = getPlan(subscription?.plan);

    const [{ count: memberCount }, { count: pendingCount }] = await Promise.all([
      svc
        .from('organization_members')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', ctx.active.organizationId),
      svc
        .from('team_invites')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', ctx.active.organizationId)
        .is('accepted_at', null),
    ]);

    if ((memberCount ?? 0) + (pendingCount ?? 0) >= plan.maxTeamMembers) {
      return actionError(
        errors.conflict(
          `Your plan allows ${plan.maxTeamMembers} team members. Remove someone, or cancel a pending invitation, before adding another.`,
        ),
      );
    }

    // Already a member?
    const { data: existingProfile } = await svc
      .from('profiles')
      .select('id')
      .eq('email', input.email)
      .maybeSingle();

    if (existingProfile) {
      const { data: existingMember } = await svc
        .from('organization_members')
        .select('id')
        .eq('organization_id', ctx.active.organizationId)
        .eq('user_id', existingProfile.id)
        .maybeSingle();
      if (existingMember) {
        return actionError(errors.conflict('That person is already on your team.'));
      }
    }

    const { token, hash } = generateToken(32);
    const expiresAt = new Date(Date.now() + 7 * 86_400_000);

    // Re-inviting replaces the pending invitation rather than upserting onto it.
    //
    // The uniqueness rule here is deliberately partial — one PENDING invite per
    // address, with accepted ones kept as history so someone who leaves can be
    // invited back. Postgres cannot infer a partial index for `ON CONFLICT
    // (organization_id, email)`, so the upsert this replaced raised 42P10 every
    // single time and nobody could invite a teammate at all. Clearing the
    // pending row first expresses the same intent in a way the index supports,
    // and it correctly retires the old token: a superseded invitation link must
    // stop working.
    await svc
      .from('team_invites')
      .delete()
      .eq('organization_id', ctx.active.organizationId)
      .eq('email', input.email)
      .is('accepted_at', null);

    const { error } = await svc.from('team_invites').insert({
      organization_id: ctx.active.organizationId,
      email: input.email,
      role,
      token_hash: hash,
      invited_by: ctx.user.id,
      expires_at: expiresAt.toISOString(),
      accepted_at: null,
    });
    if (error) throw errors.conflict(`The invitation could not be created: ${error.message}`);

    const inviterName =
      [ctx.profile.first_name, ctx.profile.last_name].filter(Boolean).join(' ') || ctx.profile.email;

    await sendEmail(
      input.email,
      emailTemplates.teamInvite({
        organizationName: ctx.active.organizationName,
        inviterName,
        acceptUrl: absoluteUrl(`/invite/${token}`),
        role,
      }),
    );

    await recordAudit({
      organizationId: ctx.active.organizationId,
      actorUserId: ctx.user.id,
      actorEmail: ctx.user.email ?? null,
      action: AUDIT_ACTIONS.MEMBER_INVITED,
      targetType: 'invite',
      targetId: input.email,
      metadata: { role },
    });

    revalidatePath('/dashboard/settings/team');
    return actionOk(undefined, `Invitation sent to ${input.email}.`);
  } catch (err) {
    return actionError(err);
  }
}

export async function changeMemberRoleAction(
  memberId: string,
  role: MemberRole,
): Promise<ActionResult> {
  try {
    const ctx = await requireRole('admin');
    if (!roleAtLeast(ctx.active.role, role)) {
      return actionError(errors.forbidden(`grant the ${role} role`));
    }

    const svc = getServiceSupabase();
    const { data: member } = await svc
      .from('organization_members')
      .select('id, role, user_id')
      .eq('id', memberId)
      .eq('organization_id', ctx.active.organizationId)
      .maybeSingle();
    if (!member) return actionError(errors.notFound('That team member'));

    if (member.role === 'owner' && ctx.active.role !== 'owner') {
      return actionError(errors.forbidden("change an owner's role"));
    }

    const { error } = await svc
      .from('organization_members')
      .update({ role })
      .eq('id', memberId)
      .eq('organization_id', ctx.active.organizationId);

    if (error) {
      if (/at least one owner/i.test(error.message)) {
        return actionError(
          errors.conflict('Your organisation must keep at least one owner. Promote someone else first.'),
        );
      }
      throw errors.conflict(error.message);
    }

    await recordAudit({
      organizationId: ctx.active.organizationId,
      actorUserId: ctx.user.id,
      actorEmail: ctx.user.email ?? null,
      action: AUDIT_ACTIONS.MEMBER_ROLE_CHANGED,
      targetType: 'member',
      targetId: memberId,
      metadata: { from: member.role, to: role },
    });

    revalidatePath('/dashboard/settings/team');
    return actionOk(undefined, 'Role updated.');
  } catch (err) {
    return actionError(err);
  }
}

export async function removeMemberAction(memberId: string): Promise<ActionResult> {
  try {
    const ctx = await requireRole('admin');
    const svc = getServiceSupabase();

    const { data: member } = await svc
      .from('organization_members')
      .select('id, role, user_id')
      .eq('id', memberId)
      .eq('organization_id', ctx.active.organizationId)
      .maybeSingle();
    if (!member) return actionError(errors.notFound('That team member'));

    if (member.role === 'owner' && ctx.active.role !== 'owner') {
      return actionError(errors.forbidden('remove an owner'));
    }

    const { error } = await svc
      .from('organization_members')
      .delete()
      .eq('id', memberId)
      .eq('organization_id', ctx.active.organizationId);

    if (error) {
      if (/at least one owner/i.test(error.message)) {
        return actionError(
          errors.conflict('Your organisation must keep at least one owner.'),
        );
      }
      throw errors.conflict(error.message);
    }

    await recordAudit({
      organizationId: ctx.active.organizationId,
      actorUserId: ctx.user.id,
      actorEmail: ctx.user.email ?? null,
      action: AUDIT_ACTIONS.MEMBER_REMOVED,
      targetType: 'member',
      targetId: memberId,
      metadata: { role: member.role },
    });

    revalidatePath('/dashboard/settings/team');
    return actionOk(undefined, 'Team member removed.');
  } catch (err) {
    return actionError(err);
  }
}

export async function cancelInviteAction(inviteId: string): Promise<ActionResult> {
  try {
    const ctx = await requireRole('admin');
    const svc = getServiceSupabase();
    await svc
      .from('team_invites')
      .delete()
      .eq('id', inviteId)
      .eq('organization_id', ctx.active.organizationId);
    revalidatePath('/dashboard/settings/team');
    return actionOk(undefined, 'Invitation cancelled.');
  } catch (err) {
    return actionError(err);
  }
}

/**
 * Accepts an invitation for the signed-in user.
 * The token is matched by hash and must be unexpired and unused.
 */
export async function acceptInviteAction(token: string): Promise<ActionResult<{ organizationId: string }>> {
  try {
    const ctx = await requireSession().catch(() => null);
    const svc = getServiceSupabase();

    const { data: invite } = await svc
      .from('team_invites')
      .select('id, organization_id, email, role, expires_at, accepted_at')
      .eq('token_hash', hashToken(token))
      .maybeSingle();

    if (!invite) return actionError(errors.tokenInvalid());
    if (invite.accepted_at) {
      return actionError(errors.conflict('That invitation has already been used.'));
    }
    if (new Date(invite.expires_at as string) < new Date()) {
      return actionError(errors.tokenExpired());
    }
    if (!ctx) return actionError(errors.unauthenticated());

    // The invitation is addressed to a specific email.
    if (ctx.profile.email.toLowerCase() !== String(invite.email).toLowerCase()) {
      return actionError(
        errors.forbidden(
          `accept this invitation. It was sent to ${invite.email} — sign in with that address instead`,
        ),
      );
    }

    const { error } = await svc.from('organization_members').upsert(
      {
        organization_id: invite.organization_id as string,
        user_id: ctx.user.id,
        role: invite.role as MemberRole,
      },
      { onConflict: 'organization_id,user_id' },
    );
    if (error) throw errors.conflict(error.message);

    await svc
      .from('team_invites')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invite.id);

    await recordAudit({
      organizationId: invite.organization_id as string,
      actorUserId: ctx.user.id,
      actorEmail: ctx.profile.email,
      action: AUDIT_ACTIONS.MEMBER_JOINED,
      targetType: 'member',
      metadata: { role: invite.role },
    });

    return actionOk({ organizationId: invite.organization_id as string }, 'You have joined the team.');
  } catch (err) {
    return actionError(err);
  }
}
