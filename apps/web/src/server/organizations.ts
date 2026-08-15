import 'server-only';
import {
  DEFAULT_AI_RULES,
  DEFAULT_AGENT_NAME,
  DEFAULT_AVAILABILITY_SETTINGS,
  DEFAULT_BUSINESS_HOURS,
  defaultGreeting,
  slugify,
  getPlan,
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

  // Slugs are globally unique; retry with a numeric suffix on collision.
  const base = slugify(input.businessName);
  let slug = base;
  for (let attempt = 0; attempt < 6; attempt++) {
    const { data: existing } = await svc.from('organizations').select('id').eq('slug', slug).maybeSingle();
    if (!existing) break;
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const { data: org, error: orgError } = await svc
    .from('organizations')
    .insert({
      name: input.businessName,
      slug,
      owner_user_id: input.userId,
      timezone,
      status: 'onboarding',
      onboarding_step: 1,
      is_demo: input.isDemo ?? false,
    })
    .select('*')
    .single();

  if (orgError || !org) {
    log.error('organization create failed', { event: 'org.create_failed', error: orgError });
    throw errors.conflict('That business could not be created. Please try again.');
  }

  const organizationId = org.id as string;
  const agentName = DEFAULT_AGENT_NAME;

  const results = await Promise.all([
    svc.from('organization_members').insert({
      organization_id: organizationId,
      user_id: input.userId,
      role: 'owner',
    }),
    svc.from('business_profiles').insert({
      organization_id: organizationId,
      display_name: input.businessName,
      industry: input.industry ?? null,
      timezone,
      business_hours: DEFAULT_BUSINESS_HOURS,
    }),
    svc.from('ai_agents').insert({
      organization_id: organizationId,
      display_name: agentName,
      greeting: defaultGreeting(input.businessName, agentName),
      active: false,
    }),
    svc.from('ai_rules').insert(
      DEFAULT_AI_RULES.map((r) => ({
        organization_id: organizationId,
        title: r.title,
        instruction: r.instruction,
        priority: r.priority,
        enabled: true,
        is_system: r.is_system,
      })),
    ),
    svc.from('availability_settings').insert({
      organization_id: organizationId,
      ...DEFAULT_AVAILABILITY_SETTINGS,
    }),
    svc.from('availability_rules').insert(
      DEFAULT_BUSINESS_HOURS.filter((d) => !d.closed).map((d) => ({
        organization_id: organizationId,
        weekday: d.weekday,
        start_time: d.open,
        end_time: d.close,
        active: true,
      })),
    ),
    svc.from('notification_preferences').insert({ organization_id: organizationId }),
    svc.from('subscriptions').insert({
      organization_id: organizationId,
      plan: 'standard',
      status: 'incomplete',
      included_minutes: getPlan('standard').includedMinutes,
      used_minutes: 0,
    }),
  ]);

  const failure = results.find((r) => r.error);
  if (failure?.error) {
    // Roll back so a partially built organisation never reaches the dashboard.
    await svc.from('organizations').delete().eq('id', organizationId);
    log.error('organization bootstrap failed, rolled back', {
      event: 'org.bootstrap_failed',
      organization_id: organizationId,
      error: failure.error,
    });
    throw errors.conflict('Your business could not be set up. Nothing was saved — please try again.');
  }

  await recordAudit({
    organizationId,
    actorUserId: input.userId,
    actorEmail: input.userEmail,
    action: AUDIT_ACTIONS.ORG_CREATED,
    targetType: 'organization',
    targetId: organizationId,
    metadata: { name: input.businessName, slug },
  });

  return { id: organizationId, slug, name: input.businessName as string };
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
    .update({ onboarding_step: Math.min(8, step) })
    .eq('id', organizationId);
}

export async function completeOnboarding(organizationId: string) {
  const svc = getServiceSupabase();
  await svc
    .from('organizations')
    .update({
      onboarding_step: 8,
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
  const [business, services, agent, phone, calendar, subscription] = await Promise.all([
    svc.from('business_profiles').select('display_name, business_description, business_hours').eq('organization_id', organizationId).maybeSingle(),
    svc.from('services').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('active', true),
    svc.from('ai_agents').select('greeting, voice, transfer_enabled, transfer_phone, active').eq('organization_id', organizationId).maybeSingle(),
    svc.from('phone_numbers').select('phone_number, is_demo').eq('organization_id', organizationId).eq('status', 'active').maybeSingle(),
    svc.from('calendar_connections').select('active').eq('organization_id', organizationId).eq('provider', 'google').maybeSingle(),
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
      href: '/onboarding/business',
      detail: business.data?.business_description ? 'Description saved' : 'Add a description',
    },
    {
      key: 'services',
      label: 'Knows your services',
      done: (services.count ?? 0) > 0,
      required: true,
      href: '/dashboard/knowledge',
      detail: `${services.count ?? 0} active`,
    },
    {
      key: 'hours',
      label: 'Knows your business hours',
      done: hours.length > 0,
      required: false,
      href: '/onboarding/business',
      detail: hours.length ? `${hours.length} days configured` : 'Not set',
    },
    {
      key: 'greeting',
      label: 'Has a greeting and a voice',
      done: Boolean(agent.data?.greeting && agent.data.greeting.length > 10 && agent.data?.voice),
      required: true,
      href: '/dashboard/receptionist',
      detail: agent.data?.voice ?? 'not set',
    },
    {
      key: 'phone',
      label: 'Has a phone number',
      done: Boolean(phone.data?.phone_number),
      required: true,
      href: '/dashboard/settings/phone',
      detail: phone.data?.phone_number ?? 'None yet',
    },
    {
      key: 'calendar',
      label: 'Can check availability',
      done: Boolean(calendar.data?.active),
      required: false,
      href: '/dashboard/settings/calendar',
      detail: calendar.data?.active ? 'Google Calendar connected' : 'Using internal availability',
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
