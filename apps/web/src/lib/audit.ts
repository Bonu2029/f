import 'server-only';
import { getServiceSupabase } from '@/lib/supabase/server';
import { log } from '@/lib/logger';

/**
 * Audit logging and structured error recording.
 *
 * Audit writes are best-effort: a failure to log must never break the operation
 * the user asked for, but it is always reported to the application log.
 */

export interface AuditEntry {
  organizationId?: string | null;
  actorUserId?: string | null;
  actorEmail?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}

/** Actions worth keeping a permanent record of. */
export const AUDIT_ACTIONS = {
  ORG_CREATED: 'organization.created',
  ORG_UPDATED: 'organization.updated',
  ORG_DELETED: 'organization.deleted',
  ORG_PAUSED: 'organization.ai_paused',
  ORG_RESUMED: 'organization.ai_resumed',
  MEMBER_INVITED: 'member.invited',
  MEMBER_JOINED: 'member.joined',
  MEMBER_ROLE_CHANGED: 'member.role_changed',
  MEMBER_REMOVED: 'member.removed',
  SUBSCRIPTION_CREATED: 'subscription.created',
  SUBSCRIPTION_UPDATED: 'subscription.updated',
  SUBSCRIPTION_CANCELLED: 'subscription.cancelled',
  FOUNDER_RESERVED: 'founder.slot_reserved',
  FOUNDER_ACTIVATED: 'founder.slot_activated',
  FOUNDER_RELEASED: 'founder.slot_released',
  PHONE_PROVISIONED: 'phone.provisioned',
  VAPI_ASSISTANT_CREATED: 'vapi.assistant_created',
  VAPI_ASSISTANT_UPDATED: 'vapi.assistant_updated',
  PHONE_RELEASED: 'phone.released',
  CALENDAR_CONNECTED: 'calendar.connected',
  CALENDAR_DISCONNECTED: 'calendar.disconnected',
  AGENT_UPDATED: 'agent.updated',
  AGENT_ACTIVATED: 'agent.activated',
  DATA_EXPORTED: 'account.data_exported',
  ACCOUNT_DELETION_REQUESTED: 'account.deletion_requested',
  ADMIN_VIEWED_ORG: 'admin.viewed_organization',
  ADMIN_PAUSED_AI: 'admin.paused_ai',
  ADMIN_ADJUSTED_USAGE: 'admin.adjusted_usage',
  ADMIN_RESENT_ONBOARDING: 'admin.resent_onboarding_email',
} as const;

export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    const svc = getServiceSupabase();
    const { error } = await svc.from('audit_logs').insert({
      organization_id: entry.organizationId ?? null,
      actor_user_id: entry.actorUserId ?? null,
      actor_email: entry.actorEmail ?? null,
      action: entry.action,
      target_type: entry.targetType ?? null,
      target_id: entry.targetId ?? null,
      metadata: entry.metadata ?? {},
      ip_address: entry.ipAddress ?? null,
    });
    if (error) throw error;
  } catch (err) {
    log.warn('audit log write failed', {
      event: 'audit.write_failed',
      action: entry.action,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export interface ErrorEventInput {
  organizationId?: string | null;
  severity?: 'warn' | 'error' | 'fatal';
  scope: string;
  message: string;
  requestId?: string | null;
  callId?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Persists an operational error so it appears in the admin panel's error feed.
 * Also emitted to the structured log.
 */
export async function recordErrorEvent(input: ErrorEventInput): Promise<void> {
  log.error(input.message, {
    event: 'error_event',
    scope: input.scope,
    organization_id: input.organizationId ?? undefined,
    call_id: input.callId ?? undefined,
    request_id: input.requestId ?? undefined,
    ...input.metadata,
  });
  try {
    const svc = getServiceSupabase();
    await svc.from('error_events').insert({
      organization_id: input.organizationId ?? null,
      severity: input.severity ?? 'error',
      scope: input.scope,
      message: input.message.slice(0, 2000),
      request_id: input.requestId ?? null,
      call_id: input.callId ?? null,
      metadata: input.metadata ?? {},
    });
  } catch {
    // The structured log above is the durable record when the DB is unreachable.
  }
}
