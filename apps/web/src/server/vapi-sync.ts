import 'server-only';
import {
  buildAssistantConfig,
  buildSystemPrompt,
  priceForPrompt,
  isPlaceholderProviderId,
  webhookUrlProblem,
  WEBHOOK_URL_FIX,
  type AssistantBuildInput,
  type BusinessHoursDay,
} from '@afd/shared';
import { getServiceSupabase } from '@/lib/supabase/server';
import { getVapiProvider } from '@/lib/providers/vapi';
import { absoluteUrl, vapiEnv } from '@/lib/env';
import { AUDIT_ACTIONS, recordAudit, recordErrorEvent } from '@/lib/audit';
import { childLogger, log } from '@/lib/logger';
import { AppError, errors } from '@/lib/errors';

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

  const [org, business, agent, services, areas, faqs, rules, bookable] = await Promise.all([
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
    // Who could actually take a job. `employee_availability` is the join that
    // matters: an active employee with no hours cannot be offered to anyone.
    svc
      .from('employees')
      .select('id, employee_availability!inner(id)')
      .eq('organization_id', organizationId)
      .eq('active', true),
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
    bookableEmployees: new Set((bookable.data ?? []).map((e) => e.id as string)).size,
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

  // Refuse before touching Vapi rather than after. A live assistant pointed at
  // an unreachable callback URL is the worst state this system can be in: it
  // answers real calls in a real voice and the business never learns anyone
  // rang. The mock provider posts nothing anywhere, so it is exempt.
  if (!vapi.isMock) {
    const problem = webhookUrlProblem(buildInput.serverUrl);
    if (problem) {
      logger.error('refused to sync an assistant with an unreachable callback URL', {
        server_url: buildInput.serverUrl,
      });
      throw new AppError(
        'provider_not_configured',
        `Your receptionist was not updated, because ${problem.charAt(0).toLowerCase()}${problem.slice(1)}`,
        { action: WEBHOOK_URL_FIX },
      );
    }
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

  const storedId = (agent?.vapi_assistant_id as string | null) ?? null;

  // An account that ran in DEMO_MODE carries a locally invented id. There is no
  // assistant behind it, so updating it is not a thing that can succeed — Vapi
  // answers "id must be a valid UUID" and the receptionist stays broken until
  // someone edits the database by hand. Create the real one instead. The stored
  // id is overwritten below, which is what retires the placeholder.
  const replacingPlaceholder = !vapi.isMock && isPlaceholderProviderId(storedId);
  if (replacingPlaceholder) {
    logger.info('replacing a demo placeholder assistant with a real one', {
      placeholder_id: storedId,
    });
  }

  const existingId = replacingPlaceholder ? null : storedId;

  try {
    let assistantId: string;
    let created = false;

    if (existingId) {
      try {
        const updated = await vapi.updateAssistant(existingId, config);
        assistantId = updated.id;
      } catch (err) {
        // Deleted at Vapi — by us during testing, or by someone in the
        // dashboard. Rebuild it rather than leaving the business with a
        // receptionist that exists only in our own database.
        if (!(err instanceof AppError) || err.code !== 'not_found') throw err;
        logger.warn('the recorded assistant no longer exists at Vapi; creating a replacement', {
          assistant_id: existingId,
        });
        const rebuilt = await vapi.createAssistant(config);
        assistantId = rebuilt.id;
        created = true;
      }
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
      .select('id, phone_number, is_demo')
      .eq('organization_id', input.organizationId)
      .eq('status', 'active')
      .maybeSingle(),
  ]);
  if (!org) throw errors.notFound('That business');

  if (existingNumber) {
    // The placeholder from demo mode is not a number — it cannot ring, and
    // refusing to buy a real one because of it would leave the business stuck
    // with a phone line that does not exist. Retire it and continue.
    if (existingNumber.is_demo && !vapi.isMock) {
      await svc.from('phone_numbers').update({ status: 'released' }).eq('id', existingNumber.id);
      log.info('retired a demo placeholder number before provisioning a real one', {
        event: 'vapi.placeholder_number_retired',
        organization_id: input.organizationId,
      });
    } else {
      throw errors.conflict('This business already has an AI phone number.');
    }
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
