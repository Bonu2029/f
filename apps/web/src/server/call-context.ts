import 'server-only';
import type { OrgCallContext } from '@afd/shared';
import { getServiceSupabase } from '@/lib/supabase/server';

/**
 * Loads everything the voice agent needs for one call, in a single fan-out.
 *
 * The organisation id passed in ALWAYS comes from `resolve_inbound_call()`,
 * which maps the dialled number (from SIP metadata) to a tenant. It is never
 * derived from anything the caller or the model can influence.
 */
export async function loadOrgCallContext(organizationId: string): Promise<OrgCallContext | null> {
  const svc = getServiceSupabase();

  const [org, business, agent, services, faqs, policies, areas, rules, subscription, calendar, docs] =
    await Promise.all([
      svc.from('organizations').select('id, name, timezone, status, ai_paused').eq('id', organizationId).maybeSingle(),
      svc.from('business_profiles').select('*').eq('organization_id', organizationId).maybeSingle(),
      svc.from('ai_agents').select('*').eq('organization_id', organizationId).maybeSingle(),
      svc.from('services').select('*').eq('organization_id', organizationId).eq('active', true).order('name'),
      svc.from('faqs').select('*').eq('organization_id', organizationId).eq('active', true).limit(50),
      svc.from('business_policies').select('*').eq('organization_id', organizationId).eq('active', true).limit(30),
      svc.from('service_areas').select('*').eq('organization_id', organizationId).eq('active', true).limit(200),
      svc.from('ai_rules').select('*').eq('organization_id', organizationId).eq('enabled', true).order('priority'),
      svc.from('subscriptions').select('plan, status, included_minutes, used_minutes').eq('organization_id', organizationId).maybeSingle(),
      svc.from('calendar_connections').select('active').eq('organization_id', organizationId).eq('provider', 'google').maybeSingle(),
      svc.from('knowledge_documents').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('processing_status', 'ready'),
    ]);

  if (!org.data || !agent.data) return null;

  return {
    organization: org.data as OrgCallContext['organization'],
    business: (business.data ?? null) as OrgCallContext['business'],
    agent: agent.data as OrgCallContext['agent'],
    services: (services.data ?? []) as OrgCallContext['services'],
    faqs: (faqs.data ?? []) as OrgCallContext['faqs'],
    policies: (policies.data ?? []) as OrgCallContext['policies'],
    serviceAreas: (areas.data ?? []) as OrgCallContext['serviceAreas'],
    rules: (rules.data ?? []) as OrgCallContext['rules'],
    subscription: (subscription.data ?? null) as OrgCallContext['subscription'],
    calendarConnected: Boolean(calendar.data?.active),
    knowledgeDocumentCount: docs.count ?? 0,
  };
}

/** Current wall-clock time formatted for the organisation's timezone. */
export function nowInZone(timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date());
}
