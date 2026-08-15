import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase/server';
import { errorResponse } from '@/lib/errors';
import { AUDIT_ACTIONS, recordAudit } from '@/lib/audit';
import { newRequestId } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Full data export for the organisation, as JSON.
 *
 * Deliberately excludes anything that is a credential: OAuth tokens, upload
 * token hashes and invite token hashes are never exported.
 */
export async function GET() {
  const requestId = newRequestId();
  try {
    const ctx = await requireRole('owner');
    const organizationId = ctx.active.organizationId;
    const svc = getServiceSupabase();

    const table = (name: string, columns = '*') =>
      svc.from(name).select(columns).eq('organization_id', organizationId).limit(10_000);

    const [
      organization,
      business,
      services,
      faqs,
      policies,
      areas,
      agent,
      rules,
      availability,
      availabilitySettings,
      phoneNumbers,
      leads,
      calls,
      transcripts,
      appointments,
      messages,
      usage,
      subscription,
      documents,
      members,
    ] = await Promise.all([
      svc.from('organizations').select('*').eq('id', organizationId).maybeSingle(),
      table('business_profiles'),
      table('services'),
      table('faqs'),
      table('business_policies'),
      table('service_areas'),
      table('ai_agents'),
      table('ai_rules'),
      table('availability_rules'),
      table('availability_settings'),
      table('phone_numbers', 'id, phone_number, capabilities, status, forwarding_mode, created_at'),
      table('leads'),
      table('calls'),
      table('call_transcript_messages'),
      table('appointments'),
      table('sms_messages'),
      table('usage_ledger'),
      table('subscriptions', 'plan, status, billing_period_start, billing_period_end, included_minutes, used_minutes, founder, founder_slot, created_at'),
      table('knowledge_documents', 'id, filename, mime_type, size_bytes, processing_status, extracted_text, created_at'),
      svc
        .from('organization_members')
        .select('role, created_at, profile:profiles(first_name, last_name, email)')
        .eq('organization_id', organizationId),
    ]);

    const payload = {
      exported_at: new Date().toISOString(),
      note: 'Credentials, OAuth tokens and security token hashes are intentionally excluded from this export.',
      organization: organization.data,
      business_profile: business.data,
      services: services.data,
      faqs: faqs.data,
      policies: policies.data,
      service_areas: areas.data,
      ai_agent: agent.data,
      ai_rules: rules.data,
      availability_rules: availability.data,
      availability_settings: availabilitySettings.data,
      phone_numbers: phoneNumbers.data,
      team: members.data,
      leads: leads.data,
      calls: calls.data,
      call_transcripts: transcripts.data,
      appointments: appointments.data,
      sms_messages: messages.data,
      usage_ledger: usage.data,
      subscription: subscription.data,
      knowledge_documents: documents.data,
    };

    await recordAudit({
      organizationId,
      actorUserId: ctx.user.id,
      actorEmail: ctx.user.email ?? null,
      action: AUDIT_ACTIONS.DATA_EXPORTED,
      metadata: { records: Object.keys(payload).length },
    });

    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        'content-type': 'application/json',
        'content-disposition': `attachment; filename="${ctx.active.organizationSlug}-export.json"`,
        'cache-control': 'no-store',
      },
    });
  } catch (err) {
    return errorResponse(err, requestId);
  }
}
