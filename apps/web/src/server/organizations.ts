import 'server-only';
import {
  DEFAULT_AI_RULES,
  DEFAULT_AGENT_NAME,
  DEFAULT_AVAILABILITY_SETTINGS,
  DEFAULT_BUSINESS_HOURS,
  defaultGreeting,
  DEFAULT_VAPI_VOICE,
  slugify,
  getPlan,
  ONBOARDING_TOTAL_STEPS,
} from '@afd/shared';
import { getServiceSupabase } from '@/lib/supabase/server';
import { AUDIT_ACTIONS, recordAudit } from '@/lib/audit';
import { errors } from '@/lib/errors';
import { log } from '@/lib/logger';

/**
 * Organisation bootstrap.
 *
 * Creating an organisation also creates every row the rest of the product
 * assumes exists: membership, business profile, agent, default rules,
 * availability, notification preferences and a placeholder subscription. Doing
 * it in one place means no screen ever has to cope with a half-built tenant.
 */

export interface CreateOrganizationInput {
  userId: string;
  userEmail: string;
  businessName: string;
  timezone?: string;
  industry?: string | null;
  isDemo?: boolean;
}

export async function createOrganization(input: CreateOrganizationInput) {
  const svc = getServiceSupabase();
  const timezone = input.timezone || 'America/New_York';
  const agentName = DEFAULT_AGENT_NAME;

  // One transaction, guarded by an advisory lock on the user. See
  // 0008_bootstrap_organization.sql for why this is not done from here: a
  // tenant assembled with nine round trips cannot be made atomic by the
  // client, and a half-built one breaks every screen that assumes otherwise.
  const { data, error } = await svc.rpc('bootstrap_organization', {
    p_user_id: input.userId,
    p_name: input.businessName,
    p_slug_base: slugify(input.businessName),
    p_timezone: timezone,
    p_industry: input.industry ?? null,
    p_is_demo: input.isDemo ?? false,
    p_agent_name: agentName,
    p_voice_id: DEFAULT_VAPI_VOICE,
    p_greeting: defaultGreeting(input.businessName, agentName),
    p_business_hours: DEFAULT_BUSINESS_HOURS,
    p_ai_rules: DEFAULT_AI_RULES,
    p_availability_settings: DEFAULT_AVAILABILITY_SETTINGS,
    p_included_minutes: getPlan('standard').includedMinutes,
  });

  const row = (Array.isArray(data) ? data[0] : data) as
    | {
        organization_id: string;
        organization_slug: string;
        organization_name: string;
        was_created: boolean;
      }
    | undefined;

  if (error || !row?.organization_id) {
    log.error('organization bootstrap failed', {
      event: 'org.bootstrap_failed',
      error: error?.message ?? 'no row returned',
    });
    // Nothing partial survives: the function is one transaction, so a failure
    // here really does mean nothing was written.
    throw errors.conflict('Your business could not be set up. Nothing was saved — please try again.');
  }

  if (!row.was_created) {
    // A refresh, a double submit, or a concurrent request that got there
    // first. The tenant exists and is complete, which is all the caller needs.
    log.info('organization already existed for owner', {
      event: 'org.bootstrap_reused',
      organization_id: row.organization_id,
    });
    return {
      id: row.organization_id,
      slug: row.organization_slug,
      name: row.organization_name,
    };
  }

  await recordAudit({
    organizationId: row.organization_id,
    actorUserId: input.userId,
    actorEmail: input.userEmail,
    action: AUDIT_ACTIONS.ORG_CREATED,
    targetType: 'organization',
    targetId: row.organization_id,
    metadata: { name: input.businessName, slug: row.organization_slug },
  });

  return {
    id: row.organization_id,
    slug: row.organization_slug,
    name: row.organization_name,
  };
}

/** Advances the stored onboarding step, never backwards. */
export async function advanceOnboarding(organizationId: string, step: number) {
  const svc = getServiceSupabase();
  const { data } = await svc
    .from('organizations')
    .select('onboarding_step')
    .eq('id', organizationId)
    .maybeSingle();
  const current = data?.onboarding_step ?? 1;
  if (step <= current) return;
  await svc
    .from('organizations')
    .update({ onboarding_step: Math.min(ONBOARDING_TOTAL_STEPS, step) })
    .eq('id', organizationId);
}

export async function completeOnboarding(organizationId: string) {
  const svc = getServiceSupabase();
  await svc
    .from('organizations')
    .update({
      onboarding_step: ONBOARDING_TOTAL_STEPS,
      onboarding_completed_at: new Date().toISOString(),
      status: 'active',
    })
    .eq('id', organizationId);
}

/**
 * Everything the "Go Live" checklist needs. Each item is derived from real
 * database state, so the button is only enabled when the receptionist can
 * genuinely answer a call.
 */
export async function getReadinessChecklist(organizationId: string) {
  const svc = getServiceSupabase();
  const [business, services, agent, phone, subscription] = await Promise.all([
    svc
      .from('business_profiles')
      .select('display_name, business_description, business_hours')
      .eq('organization_id', organizationId)
      .maybeSingle(),
    svc
      .from('services')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('active', true),
    svc
      .from('ai_agents')
      .select('greeting, voice_id, transfer_enabled, transfer_phone, active, vapi_assistant_id, vapi_sync_error')
      .eq('organization_id', organizationId)
      .maybeSingle(),
    svc
      .from('phone_numbers')
      .select('phone_number, is_demo')
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .maybeSingle(),
    svc.from('subscriptions').select('status').eq('organization_id', organizationId).maybeSingle(),
  ]);

  const hours = (business.data?.business_hours as unknown[] | null) ?? [];

  const items = [
    {
      key: 'subscription',
      label: 'Subscription active',
      done: ['active', 'trialing', 'past_due'].includes(subscription.data?.status ?? ''),
      required: true,
      href: '/dashboard/billing',
      detail: subscription.data?.status ?? 'none',
    },
    {
      key: 'business',
      label: 'Knows your business name and what you do',
      done: Boolean(business.data?.display_name && business.data?.business_description),
      required: true,
      href: '/dashboard/settings/business',
      detail: business.data?.business_description ? 'Description saved' : 'Add a description',
    },
    {
      key: 'services',
      label: 'Knows your services',
      done: (services.count ?? 0) > 0,
      required: true,
      href: '/dashboard/settings/business',
      detail: `${services.count ?? 0} active`,
    },
    {
      key: 'hours',
      label: 'Knows your business hours',
      done: hours.length > 0,
      required: false,
      href: '/dashboard/settings/business',
      detail: hours.length ? `${hours.length} days configured` : 'Not set',
    },
    {
      key: 'greeting',
      label: 'Has a greeting and a voice',
      done: Boolean(agent.data?.greeting && agent.data.greeting.length > 10 && agent.data?.voice_id),
      required: true,
      href: '/dashboard/receptionist',
      detail: (agent.data?.voice_id as string) ?? 'not set',
    },
    {
      // Without an assistant at the voice provider there is literally nothing to
      // answer the phone, so this is required rather than advisory.
      key: 'assistant',
      label: 'Published to the voice provider',
      done: Boolean(agent.data?.vapi_assistant_id) && !agent.data?.vapi_sync_error,
      required: true,
      href: '/dashboard/receptionist',
      detail: agent.data?.vapi_sync_error
        ? 'Last update failed'
        : agent.data?.vapi_assistant_id
          ? 'Up to date'
          : 'Not published yet',
    },
    {
      key: 'phone',
      label: 'Has a phone number',
      done: Boolean(phone.data?.phone_number),
      required: true,
      href: '/dashboard/receptionist',
      detail: phone.data?.phone_number ?? 'None yet',
    },
    {
      key: 'transfer',
      label: 'Human transfer configured',
      done: Boolean(agent.data?.transfer_enabled && agent.data?.transfer_phone),
      required: false,
      href: '/dashboard/receptionist',
      detail: agent.data?.transfer_enabled ? 'Enabled' : 'Off',
    },
  ];

  return {
    items,
    canGoLive: items.filter((i) => i.required).every((i) => i.done),
    isLive: Boolean(agent.data?.active),
  };
}
