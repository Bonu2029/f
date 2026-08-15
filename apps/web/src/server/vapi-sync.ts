import 'server-only';
import {
  buildAssistantConfig,
  buildSystemPrompt,
  priceForPrompt,
  type AssistantBuildInput,
  type BusinessHoursDay,
} from '@afd/shared';
import { getServiceSupabase } from '@/lib/supabase/server';
import { getVapiProvider } from '@/lib/providers/vapi';
import { absoluteUrl, vapiEnv } from '@/lib/env';
import { AUDIT_ACTIONS, recordAudit, recordErrorEvent } from '@/lib/audit';
import { childLogger } from '@/lib/logger';
import { errors } from '@/lib/errors';

/**
 * Keeps each organisation's Vapi assistant in step with its stored settings.
 *
 * This is the single path from "the owner saved something" to "the receptionist
 * behaves differently on the next call". It runs only on the server, reads the
 * organisation's own rows, and records the resulting assistant id back on
 * `ai_agents` so the webhook can map an inbound call to a tenant.
 */

export interface SyncResult {
  assistantId: string;
  created: boolean;
  isDemo: boolean;
}

/** Loads everything the assistant prompt needs, in one fan-out. */
async function loadAssistantInput(organizationId: string): Promise<AssistantBuildInput | null> {
  const svc = getServiceSupabase();

  const [org, business, agent, services, areas, faqs, rules] = await Promise.all([
    svc.from('organizations').select('name, timezone').eq('id', organizationId).maybeSingle(),
    svc.from('business_profiles').select('*').eq('organization_id', organizationId).maybeSingle(),
    svc.from('ai_agents').select('*').eq('organization_id', organizationId).maybeSingle(),
    svc
      .from('services')
      .select('name, description, price_type, exact_price, starting_price, max_price, price_notes')
      .eq('organization_id', organizationId)
      .eq('active', true)
      .order('name'),
    svc
      .from('service_areas')
      .select('type, city, state, postal_code, center_postal_code, radius_miles')
      .eq('organization_id', organizationId)
      .eq('active', true),
    svc
      .from('faqs')
      .select('question, answer')
      .eq('organization_id', organizationId)
      .eq('active', true)
      .limit(40),
    svc
      .from('ai_rules')
      .select('title, instruction')
      .eq('organization_id', organizationId)
      .eq('enabled', true)
      .order('priority')
      .limit(40),
  ]);

  if (!org.data || !agent.data) return null;

  const timezone = (business.data?.timezone as string) ?? (org.data.timezone as string);

  const describedAreas = (areas.data ?? [])
    .map((a) => {
      switch (a.type) {
        case 'postal_code':
          return a.postal_code as string;
        case 'city':
          return [a.city, a.state].filter(Boolean).join(', ');
        case 'state':
          return `all of ${a.state as string}`;
        case 'radius':
          return `${a.radius_miles as number} miles around ${a.center_postal_code as string}`;
        default:
          return '';
      }
    })
    .filter(Boolean);

  return {
    organizationName: org.data.name as string,
    business: {
      displayName: (business.data?.display_name as string) ?? (org.data.name as string),
      industry: (business.data?.industry as string) ?? null,
      description: (business.data?.business_description as string) ?? null,
      phone: (business.data?.public_phone as string) ?? null,
      email: (business.data?.email as string) ?? null,
      website: (business.data?.website as string) ?? null,
      address: (business.data?.address as string) ?? null,
      city: (business.data?.city as string) ?? null,
      state: (business.data?.state as string) ?? null,
      postalCode: (business.data?.postal_code as string) ?? null,
      timezone,
      hours: ((business.data?.business_hours as BusinessHoursDay[]) ?? []),
    },
    services: (services.data ?? []).map((s) => ({
      name: s.name as string,
      description: (s.description as string) ?? null,
      price: priceForPrompt({
        priceType: s.price_type as string,
        exactPrice: (s.exact_price as number) ?? null,
        startingPrice: (s.starting_price as number) ?? null,
        maxPrice: (s.max_price as number) ?? null,
        priceNotes: (s.price_notes as string) ?? null,
      }),
    })),
    serviceAreas: describedAreas,
    faqs: (faqs.data ?? []).map((f) => ({
      question: f.question as string,
      answer: f.answer as string,
    })),
    agent: {
      displayName: agent.data.name as string,
      greeting: agent.data.greeting as string,
      voice: agent.data.voice_id as string,
      personality: agent.data.personality as string,
      transferPhone: agent.data.transfer_enabled ? ((agent.data.transfer_phone as string) ?? null) : null,
      instructions: (agent.data.instructions as string) ?? null,
      bookingEnabled: Boolean(agent.data.appointment_booking_enabled),
    },
    rules: (rules.data ?? []).map((r) => ({
      title: r.title as string,
      instruction: r.instruction as string,
    })),
    serverUrl: absoluteUrl('/api/webhooks/vapi'),
    serverSecret: vapiEnv.webhookSecretOrPlaceholder,
    model: vapiEnv.openaiModel,
  };
}

/**
 * Creates the assistant if the organisation has none, otherwise updates it.
 *
 * Called after every settings save. Failures are surfaced to the caller AND
 * recorded, because an assistant that silently stops matching the dashboard is
 * the worst possible outcome — the owner would think a change had applied.
 */
export async function syncAssistant(input: {
  organizationId: string;
  actorUserId?: string | null;
  actorEmail?: string | null;
  reason: string;
}): Promise<SyncResult> {
  const logger = childLogger({ organization_id: input.organizationId, event: 'vapi.sync' });
  const svc = getServiceSupabase();
  const vapi = getVapiProvider();

  const buildInput = await loadAssistantInput(input.organizationId);
  if (!buildInput) {
    throw errors.notFound('That business configuration');
  }

  const config = buildAssistantConfig(buildInput);
  // Stored alongside the id so an owner can read exactly what their receptionist
  // was told, rather than inferring it from the settings that produced it.
  const systemPrompt = buildSystemPrompt(buildInput);

  const { data: agent } = await svc
    .from('ai_agents')
    .select('vapi_assistant_id')
    .eq('organization_id', input.organizationId)
    .maybeSingle();

  const existingId = (agent?.vapi_assistant_id as string | null) ?? null;

  try {
    let assistantId: string;
    let created = false;

    if (existingId) {
      const updated = await vapi.updateAssistant(existingId, config);
      assistantId = updated.id;
    } else {
      const createdAssistant = await vapi.createAssistant(config);
      assistantId = createdAssistant.id;
      created = true;
    }

    await svc
      .from('ai_agents')
      .update({
        vapi_assistant_id: assistantId,
        system_prompt: systemPrompt,
        vapi_synced_at: new Date().toISOString(),
        vapi_sync_error: null,
      })
      .eq('organization_id', input.organizationId);

    await recordAudit({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId ?? null,
      actorEmail: input.actorEmail ?? null,
      action: created ? AUDIT_ACTIONS.VAPI_ASSISTANT_CREATED : AUDIT_ACTIONS.VAPI_ASSISTANT_UPDATED,
      targetType: 'vapi_assistant',
      targetId: assistantId,
      metadata: { reason: input.reason, demo: vapi.isMock },
    });

    logger.info('assistant synced', { assistant_id: assistantId, created, demo: vapi.isMock });
    return { assistantId, created, isDemo: vapi.isMock };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    // Record the failure on the agent so the UI can say the receptionist is out
    // of date rather than implying the save took effect.
    await svc
      .from('ai_agents')
      .update({ vapi_sync_error: message.slice(0, 500) })
      .eq('organization_id', input.organizationId);

    await recordErrorEvent({
      organizationId: input.organizationId,
      scope: 'vapi.sync',
      message: `Assistant sync failed: ${message}`,
      metadata: { reason: input.reason },
    });

    throw err;
  }
}

/**
 * Best-effort sync used after a settings save.
 *
 * The save itself has already succeeded, so a Vapi failure must not roll it
 * back — but the caller gets a truthful warning to show the owner.
 */
export async function syncAssistantQuietly(input: {
  organizationId: string;
  actorUserId?: string | null;
  actorEmail?: string | null;
  reason: string;
}): Promise<{ ok: true; result: SyncResult } | { ok: false; message: string }> {
  try {
    return { ok: true, result: await syncAssistant(input) };
  } catch (err) {
    const message =
      err instanceof Error && 'message' in err
        ? err.message
        : 'The receptionist could not be updated.';
    return {
      ok: false,
      message: `Your settings were saved, but the receptionist could not be updated: ${message} Use "Update receptionist" to retry.`,
    };
  }
}

/**
 * Provisions a phone number and points it at the organisation's assistant.
 * Creates the assistant first when there is not one yet, because a number with
 * no assistant answers with silence.
 */
export async function provisionPhoneNumber(input: {
  organizationId: string;
  areaCode?: string | null;
  actorUserId?: string | null;
  actorEmail?: string | null;
}): Promise<{ phoneNumber: string; phoneNumberId: string; isDemo: boolean }> {
  const svc = getServiceSupabase();
  const vapi = getVapiProvider();

  const [{ data: org }, { data: agent }, { data: existingNumber }] = await Promise.all([
    svc.from('organizations').select('name').eq('id', input.organizationId).maybeSingle(),
    svc
      .from('ai_agents')
      .select('vapi_assistant_id')
      .eq('organization_id', input.organizationId)
      .maybeSingle(),
    svc
      .from('phone_numbers')
      .select('phone_number')
      .eq('organization_id', input.organizationId)
      .eq('status', 'active')
      .maybeSingle(),
  ]);
  if (!org) throw errors.notFound('That business');

  if (existingNumber) {
    throw errors.conflict('This business already has an AI phone number.');
  }

  let assistantId = (agent?.vapi_assistant_id as string | null) ?? null;
  if (!assistantId) {
    const synced = await syncAssistant({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId ?? null,
      actorEmail: input.actorEmail ?? null,
      reason: 'phone number provisioning',
    });
    assistantId = synced.assistantId;
  }

  const provisioned = await vapi.provisionPhoneNumber({
    areaCode: input.areaCode ?? null,
    assistantId,
    name: String(org.name).slice(0, 40),
  });

  const { error } = await svc.from('phone_numbers').insert({
    organization_id: input.organizationId,
    phone_number: provisioned.number,
    friendly_name: `${org.name} — AI receptionist`,
    vapi_phone_number_id: provisioned.id,
    capabilities: { voice: true, sms: false, mms: false },
    status: 'active',
    is_demo: vapi.isMock,
  });

  if (error) {
    // Give the number back rather than leaving an orphan billing on the account.
    await vapi.releasePhoneNumber(provisioned.id).catch(() => undefined);
    throw errors.phoneProvisioningFailed('The number could not be saved, so it was released.');
  }

  await recordAudit({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId ?? null,
    actorEmail: input.actorEmail ?? null,
    action: AUDIT_ACTIONS.PHONE_PROVISIONED,
    targetType: 'vapi_phone_number',
    targetId: provisioned.id,
    metadata: { number: provisioned.number, demo: vapi.isMock },
  });

  return { phoneNumber: provisioned.number, phoneNumberId: provisioned.id, isDemo: vapi.isMock };
}
