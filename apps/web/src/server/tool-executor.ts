import 'server-only';
import {
  billingPeriodKey,
  formatPhone,
  matchServiceArea,
  normalizePhone,
  scoreLead,
  toolArgSchemas,
  toolFail,
  toolOk,
  type ToolResult,
} from '@afd/shared';
import { getServiceSupabase } from '@/lib/supabase/server';
import { getTelephonyProvider } from '@/lib/providers/telephony';
import { getCalendarProvider, hasCalendarConnection } from '@/lib/providers/calendar';
import { generateToken } from '@/lib/crypto';
import { absoluteUrl } from '@/lib/env';
import { childLogger } from '@/lib/logger';
import { recordErrorEvent } from '@/lib/audit';
import { formatSlot, getAvailability } from '@/server/availability';
import { loadOrgCallContext } from '@/server/call-context';
import { notifyAppointmentBooked, notifyNewLead, notifyTransferFailed } from '@/server/notifications';

/**
 * Executes a realtime tool call on behalf of the voice agent.
 *
 * SECURITY MODEL
 *  - `organizationId` and `callId` come from the trusted call session that the
 *    voice worker holds. They are NEVER read from the tool arguments, so the
 *    model cannot address another tenant.
 *  - Every argument object is re-validated with the shared Zod schema before it
 *    touches the database.
 *  - Capability checks (is SMS enabled? is booking enabled?) are re-applied
 *    here even though disabled tools are not advertised to the model, because
 *    an owner may switch a capability off mid-call.
 */

export interface ToolCallContext {
  organizationId: string;
  callId: string;
  callerPhone: string | null;
  businessPhone: string | null;
  /** Demo calls never consume plan minutes or send real messages. */
  isDemo: boolean;
}

export interface ToolExecutionOutcome {
  result: ToolResult;
  /** Signals the worker to take an out-of-band action on the SIP session. */
  sideEffect?:
    | { type: 'transfer'; destination: string }
    | { type: 'hangup'; disposition: string };
}

export async function executeTool(
  ctx: ToolCallContext,
  name: string,
  rawArgs: unknown,
): Promise<ToolExecutionOutcome> {
  const logger = childLogger({
    organization_id: ctx.organizationId,
    call_id: ctx.callId,
    event: `tool.${name}`,
  });

  try {
    const schema = toolArgSchemas[name as keyof typeof toolArgSchemas];
    if (!schema) {
      return { result: toolFail(`Unknown tool "${name}".`, 'That is not something you can do.') };
    }
    const parsed = schema.safeParse(rawArgs ?? {});
    if (!parsed.success) {
      logger.warn('tool arguments rejected', { issues: parsed.error.issues.map((i) => i.message) });
      return {
        result: toolFail(
          `Invalid arguments: ${parsed.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`,
          'Something was missing from that request. Ask the caller for the detail again.',
        ),
      };
    }

    const outcome = await dispatch(ctx, name, parsed.data as never, logger);
    logger.info('tool executed', { ok: outcome.result.ok });
    return outcome;
  } catch (err) {
    await recordErrorEvent({
      organizationId: ctx.organizationId,
      callId: ctx.callId,
      scope: `tool.${name}`,
      message: err instanceof Error ? err.message : String(err),
    });
    return {
      result: toolFail(
        err instanceof Error ? err.message : 'Tool execution failed',
        'That did not go through. Tell the caller honestly and offer to take a message.',
      ),
    };
  }
}

/* -------------------------------------------------------------------------- */

async function dispatch(
  ctx: ToolCallContext,
  name: string,
  args: Record<string, unknown>,
  logger: ReturnType<typeof childLogger>,
): Promise<ToolExecutionOutcome> {
  const svc = getServiceSupabase();

  switch (name) {
    /* ---------------------------------------------------------------- */
    case 'get_business_information': {
      const topic = args.topic as string;
      const orgCtx = await loadOrgCallContext(ctx.organizationId);
      if (!orgCtx) return { result: toolFail('Business context unavailable.') };

      const money = (n: number | null | undefined) => (n == null ? null : `$${(n / 100).toFixed(2).replace(/\.00$/, '')}`);
      const payload: Record<string, unknown> = {};

      if (topic === 'hours' || topic === 'all') payload.business_hours = orgCtx.business?.business_hours ?? [];
      if (topic === 'address' || topic === 'contact' || topic === 'all') {
        payload.address = {
          address: orgCtx.business?.address ?? null,
          city: orgCtx.business?.city ?? null,
          state: orgCtx.business?.state ?? null,
          postal_code: orgCtx.business?.postal_code ?? null,
        };
        payload.contact = {
          phone: orgCtx.business?.public_phone ?? null,
          email: orgCtx.business?.email ?? null,
          website: orgCtx.business?.website ?? null,
        };
      }
      if (topic === 'services' || topic === 'pricing' || topic === 'all') {
        payload.services = orgCtx.services.map((s) => ({
          name: s.name,
          description: s.description,
          price_type: s.price_type,
          starting_price: money(s.starting_price),
          exact_price: money(s.exact_price),
          max_price: money(s.max_price),
          price_notes: s.price_notes,
          estimated_duration_minutes: s.estimated_duration,
        }));
      }
      if (topic === 'policies' || topic === 'all') {
        payload.policies = orgCtx.policies.map((p) => ({ title: p.title, body: p.body }));
      }

      return { result: toolOk(payload) };
    }

    /* ---------------------------------------------------------------- */
    case 'search_business_knowledge': {
      const query = args.query as string;
      const { data, error } = await svc.rpc('search_org_knowledge', {
        p_organization_id: ctx.organizationId,
        p_query: query,
        p_limit: 5,
      });
      if (error) {
        logger.warn('knowledge search failed', { error: error.message });
        return { result: toolFail('Knowledge search failed.', 'Say you could not look that up right now.') };
      }
      const rows = (data ?? []) as Array<{ filename: string; content: string }>;
      if (rows.length === 0) {
        return {
          result: toolOk(
            { matches: [] },
            'Nothing in the business knowledge covers that. Do not guess — offer to take a message.',
          ),
        };
      }
      return {
        result: toolOk({
          matches: rows.map((r) => ({ source: r.filename, excerpt: r.content.slice(0, 900) })),
        }),
      };
    }

    /* ---------------------------------------------------------------- */
    case 'check_service_area': {
      const { data: areas } = await svc
        .from('service_areas')
        .select('*')
        .eq('organization_id', ctx.organizationId)
        .eq('active', true);

      const match = matchServiceArea((areas ?? []) as never, {
        postal_code: args.postal_code as string | null,
        city: args.city as string | null,
        state: args.state as string | null,
      });

      return {
        result: toolOk(
          { covered: match.covered, indeterminate: match.indeterminate, reason: match.reason },
          match.indeterminate
            ? `Coverage could not be confirmed automatically. ${match.reason} Do not promise service — say someone will confirm.`
            : match.covered
              ? 'That location is inside the service area.'
              : 'That location is outside the service area. Be polite and offer to take their details anyway.',
        ),
      };
    }

    /* ---------------------------------------------------------------- */
    case 'create_lead': {
      // A call produces at most one lead. A second create_lead updates it,
      // which is what stops a chatty model from filling the CRM with dupes.
      const { data: existing } = await svc
        .from('leads')
        .select('id')
        .eq('organization_id', ctx.organizationId)
        .eq('call_id', ctx.callId)
        .maybeSingle();

      if (existing) {
        return dispatch(ctx, 'update_lead', { ...args, lead_id: existing.id }, logger);
      }

      const phone = normalizePhone((args.phone as string) ?? ctx.callerPhone);
      const inArea = await evaluateServiceArea(ctx.organizationId, {
        postal_code: args.postal_code as string | null,
        city: args.city as string | null,
        state: args.state as string | null,
      });

      const scored = scoreLead({
        name: args.customer_name as string | null,
        phone,
        email: args.email as string | null,
        address: args.address as string | null,
        postal_code: args.postal_code as string | null,
        service_requested: args.requested_service as string | null,
        urgency: (args.urgency as never) ?? 'unknown',
        in_service_area: inArea,
        is_property_owner: (args.is_property_owner as boolean | null) ?? null,
      });

      const { data: lead, error } = await svc
        .from('leads')
        .insert({
          organization_id: ctx.organizationId,
          call_id: ctx.callId,
          name: (args.customer_name as string) ?? null,
          phone,
          email: (args.email as string) ?? null,
          address: (args.address as string) ?? null,
          city: (args.city as string) ?? null,
          state: (args.state as string) ?? null,
          postal_code: (args.postal_code as string) ?? null,
          service_requested: (args.requested_service as string) ?? null,
          description: (args.notes as string) ?? null,
          urgency: (args.urgency as string) ?? 'unknown',
          lead_score: scored.score,
          score_reasons: scored.reasons,
          status: 'new',
          source: ctx.isDemo ? 'demo_call' : 'ai_call',
          is_property_owner: (args.is_property_owner as boolean | null) ?? null,
          in_service_area: inArea,
        })
        .select('id, name, phone, service_requested')
        .single();

      if (error || !lead) {
        logger.error('lead insert failed', { error: error?.message });
        return { result: toolFail('Could not save the lead.') };
      }

      await svc.from('calls').update({ lead_id: lead.id }).eq('id', ctx.callId);

      const orgName = await organizationName(ctx.organizationId);
      await notifyNewLead({
        organizationId: ctx.organizationId,
        organizationName: orgName,
        leadId: lead.id as string,
        leadName: (lead.name as string) ?? 'Unknown caller',
        service: (lead.service_requested as string) ?? 'General enquiry',
        phone: formatPhone(lead.phone as string),
      });

      return {
        result: toolOk(
          { lead_id: lead.id, lead_score: scored.score },
          'The caller has been saved. Use this lead_id for booking, texts and photo requests.',
        ),
      };
    }

    /* ---------------------------------------------------------------- */
    case 'update_lead': {
      const leadId = args.lead_id as string;
      const { data: current } = await svc
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .eq('organization_id', ctx.organizationId) // tenant scoping
        .maybeSingle();

      if (!current) return { result: toolFail('That lead does not exist for this business.') };

      const patch: Record<string, unknown> = {};
      const map: Array<[string, string]> = [
        ['customer_name', 'name'],
        ['email', 'email'],
        ['address', 'address'],
        ['city', 'city'],
        ['state', 'state'],
        ['postal_code', 'postal_code'],
        ['requested_service', 'service_requested'],
        ['urgency', 'urgency'],
      ];
      for (const [from, to] of map) {
        const v = args[from];
        if (v != null && v !== '') patch[to] = v;
      }
      if (args.phone) {
        const normalised = normalizePhone(args.phone as string);
        if (normalised) patch.phone = normalised;
      }
      if (args.is_property_owner != null) patch.is_property_owner = args.is_property_owner;
      if (args.notes) {
        patch.description = [current.description, args.notes].filter(Boolean).join('\n');
      }

      const merged = { ...current, ...patch } as Record<string, unknown>;
      if (patch.postal_code || patch.city || patch.state) {
        merged.in_service_area = await evaluateServiceArea(ctx.organizationId, {
          postal_code: merged.postal_code as string | null,
          city: merged.city as string | null,
          state: merged.state as string | null,
        });
        patch.in_service_area = merged.in_service_area;
      }

      const scored = scoreLead({
        name: merged.name as string | null,
        phone: merged.phone as string | null,
        email: merged.email as string | null,
        address: merged.address as string | null,
        postal_code: merged.postal_code as string | null,
        service_requested: merged.service_requested as string | null,
        urgency: merged.urgency as never,
        in_service_area: merged.in_service_area as boolean | null,
        is_property_owner: merged.is_property_owner as boolean | null,
        appointment_booked: merged.status === 'appointment_booked',
      });
      patch.lead_score = scored.score;
      patch.score_reasons = scored.reasons;

      const { error } = await svc.from('leads').update(patch).eq('id', leadId).eq('organization_id', ctx.organizationId);
      if (error) return { result: toolFail('Could not update the lead.') };

      return { result: toolOk({ lead_id: leadId, lead_score: scored.score }) };
    }

    /* ---------------------------------------------------------------- */
    case 'check_calendar_availability': {
      const agent = await agentConfig(ctx.organizationId);
      if (!agent?.appointment_booking_enabled) {
        return {
          result: toolFail(
            'Appointment booking is disabled for this business.',
            'Booking is turned off. Tell the caller the team will call them back to schedule.',
          ),
        };
      }

      const orgCtx = await loadOrgCallContext(ctx.organizationId);
      const timezone = orgCtx?.business?.timezone ?? orgCtx?.organization.timezone ?? 'America/New_York';

      const availability = await getAvailability({
        organizationId: ctx.organizationId,
        timezone,
        requestedDate: (args.requested_date as string) ?? null,
        durationMinutes: (args.duration_minutes as number) ?? null,
        maxSlots: 5,
      });

      if (availability.slots.length === 0) {
        return {
          result: toolOk(
            { slots: [], timezone },
            'There is nothing open then. Offer to look at another day, or take their details for a callback.',
          ),
        };
      }

      return {
        result: toolOk(
          {
            timezone,
            duration_minutes: availability.durationMinutes,
            source: availability.source,
            slots: availability.slots.map((s) => ({
              start_at: s.start,
              end_at: s.end,
              label: formatSlot(s.start, timezone),
            })),
          },
          availability.degraded
            ? 'These times come from our own bookings only — the connected calendar did not respond. Offer them, but say the team will confirm.'
            : 'Offer these times. Read them naturally and only book one the caller picks.',
        ),
      };
    }

    /* ---------------------------------------------------------------- */
    case 'book_appointment': {
      const agent = await agentConfig(ctx.organizationId);
      if (!agent?.appointment_booking_enabled) {
        return { result: toolFail('Appointment booking is disabled for this business.') };
      }

      const startAt = new Date(args.start_at as string);
      if (Number.isNaN(startAt.getTime())) {
        return { result: toolFail('start_at is not a valid timestamp.') };
      }

      const orgCtx = await loadOrgCallContext(ctx.organizationId);
      const timezone = orgCtx?.business?.timezone ?? orgCtx?.organization.timezone ?? 'America/New_York';
      const duration = (args.duration_minutes as number) ?? 60;
      const endAt = new Date(startAt.getTime() + duration * 60_000);

      // Re-verify the slot is still free at the moment of booking. This closes
      // the window between offering a time and the caller accepting it.
      const stillFree = await getAvailability({
        organizationId: ctx.organizationId,
        timezone,
        requestedDate: new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(startAt),
        durationMinutes: duration,
        maxSlots: 40,
      });
      const offered = stillFree.slots.some((s) => Math.abs(new Date(s.start).getTime() - startAt.getTime()) < 60_000);
      if (!offered) {
        return {
          result: toolFail(
            'That time is no longer available.',
            'That slot was just taken. Apologise, check availability again and offer another time.',
          ),
        };
      }

      const leadId = (args.lead_id as string) ?? null;
      const idempotencyKey = `${ctx.callId}:${startAt.toISOString()}`;

      // Database insert first: the unique index on (organization_id, start_at)
      // is the authoritative guard against a double booking.
      const { data: appointment, error } = await svc
        .from('appointments')
        .insert({
          organization_id: ctx.organizationId,
          lead_id: leadId,
          call_id: ctx.callId,
          customer_name: args.customer_name as string,
          customer_phone: normalizePhone((args.customer_phone as string) ?? ctx.callerPhone),
          customer_email: (args.customer_email as string) ?? null,
          service: (args.service as string) ?? null,
          address: (args.address as string) ?? null,
          start_at: startAt.toISOString(),
          end_at: endAt.toISOString(),
          status: 'scheduled',
          notes: (args.notes as string) ?? null,
          source: ctx.isDemo ? 'demo_call' : 'ai_call',
        })
        .select('id')
        .single();

      if (error || !appointment) {
        const duplicate = /duplicate key|appointments_slot_uniq/i.test(error?.message ?? '');
        return {
          result: toolFail(
            duplicate ? 'That slot was booked by someone else a moment ago.' : 'Could not save the appointment.',
            duplicate
              ? 'That time was just taken. Apologise and offer a different slot.'
              : 'The booking did not save. Do NOT tell the caller it is booked — offer a callback instead.',
          ),
        };
      }

      // External calendar event, best effort. A failure here does not lose the
      // appointment: it stays in our database and the business is notified.
      let externalId: string | null = null;
      if (await hasCalendarConnection(ctx.organizationId)) {
        try {
          const event = await getCalendarProvider().createEvent(ctx.organizationId, {
            summary: `${args.service ?? 'Appointment'} — ${args.customer_name}`,
            description: [
              `Booked by the AI receptionist.`,
              args.customer_phone ? `Phone: ${args.customer_phone}` : null,
              args.notes ? `Notes: ${args.notes}` : null,
            ]
              .filter(Boolean)
              .join('\n'),
            location: (args.address as string) ?? undefined,
            startISO: startAt.toISOString(),
            endISO: endAt.toISOString(),
            timeZone: timezone,
            attendeeEmail: (args.customer_email as string) ?? null,
            idempotencyKey,
          });
          externalId = event.externalId;
          await svc
            .from('appointments')
            .update({ external_calendar_event_id: externalId, calendar_provider: 'google' })
            .eq('id', appointment.id);
        } catch (err) {
          logger.warn('calendar event creation failed; appointment kept locally', {
            error: err instanceof Error ? err.message : String(err),
          });
          await recordErrorEvent({
            organizationId: ctx.organizationId,
            callId: ctx.callId,
            scope: 'calendar.create_event',
            message: 'Appointment saved locally but not written to Google Calendar.',
            metadata: { appointment_id: appointment.id },
          });
        }
      }

      await svc.from('calls').update({ appointment_booked: true }).eq('id', ctx.callId);
      if (leadId) {
        await svc
          .from('leads')
          .update({ status: 'appointment_booked' })
          .eq('id', leadId)
          .eq('organization_id', ctx.organizationId);
      }

      const label = formatSlot(startAt.toISOString(), timezone);
      const orgName = await organizationName(ctx.organizationId);
      await notifyAppointmentBooked({
        organizationId: ctx.organizationId,
        organizationName: orgName,
        appointmentId: appointment.id as string,
        customer: args.customer_name as string,
        service: (args.service as string) ?? 'Appointment',
        when: label,
      });

      // Confirmation SMS, if enabled and we have a number.
      const confirmTo = normalizePhone((args.customer_phone as string) ?? ctx.callerPhone);
      if (agent.sms_enabled && confirmTo) {
        await sendSmsInternal(ctx, {
          to: confirmTo,
          body: `${orgName}: you're booked for ${label}. Reply here if you need to change it.`,
          leadId,
        }).catch(() => undefined);
      }

      return {
        result: toolOk(
          {
            appointment_id: appointment.id,
            start_at: startAt.toISOString(),
            label,
            calendar_synced: Boolean(externalId),
          },
          `Booked for ${label}. You may now confirm this to the caller.`,
        ),
      };
    }

    /* ---------------------------------------------------------------- */
    case 'send_sms': {
      const agent = await agentConfig(ctx.organizationId);
      if (!agent?.sms_enabled) {
        return { result: toolFail('Text messaging is disabled for this business.') };
      }
      const to = normalizePhone((args.to as string) ?? ctx.callerPhone);
      if (!to) return { result: toolFail('No valid destination number.', 'Ask the caller for the best number to text.') };

      const sent = await sendSmsInternal(ctx, {
        to,
        body: args.body as string,
        leadId: (args.lead_id as string) ?? null,
      });
      return sent.ok
        ? { result: toolOk({ status: sent.status }, 'The text has been sent.') }
        : { result: toolFail(sent.error ?? 'SMS failed', 'The text did not send. Tell the caller and offer another way.') };
    }

    /* ---------------------------------------------------------------- */
    case 'send_photo_request': {
      const agent = await agentConfig(ctx.organizationId);
      if (!agent?.sms_enabled || !agent.photo_requests_enabled) {
        return { result: toolFail('Photo requests are disabled for this business.') };
      }

      const leadId = args.lead_id as string;
      const { data: lead } = await svc
        .from('leads')
        .select('id, phone')
        .eq('id', leadId)
        .eq('organization_id', ctx.organizationId)
        .maybeSingle();
      if (!lead) return { result: toolFail('That lead does not exist for this business.') };

      const to = normalizePhone((args.to as string) ?? (lead.phone as string) ?? ctx.callerPhone);
      if (!to) return { result: toolFail('No number to text the link to.', 'Ask for the best mobile number.') };

      // Single-use, expiring, hashed at rest.
      const { token, hash } = generateToken(32);
      const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
      const { error: tokenError } = await svc.from('upload_tokens').insert({
        organization_id: ctx.organizationId,
        lead_id: leadId,
        token_hash: hash,
        expires_at: expiresAt.toISOString(),
        max_files: 10,
      });
      if (tokenError) return { result: toolFail('Could not create the upload link.') };

      const orgName = await organizationName(ctx.organizationId);
      const url = absoluteUrl(`/upload/${token}`);
      const reason = (args.reason as string) ?? 'the issue';
      const sent = await sendSmsInternal(ctx, {
        to,
        body: `${orgName}: upload photos of ${reason} securely here — ${url} (link expires in 3 days)`,
        leadId,
      });

      if (!sent.ok) {
        return {
          result: toolFail(sent.error ?? 'SMS failed', 'The link did not send. Offer to email it or have someone follow up.'),
        };
      }

      return {
        result: toolOk({ sent_to: to, expires_at: expiresAt.toISOString() }, 'The secure upload link has been texted.'),
      };
    }

    /* ---------------------------------------------------------------- */
    case 'transfer_call': {
      const agent = await agentConfig(ctx.organizationId);
      if (!agent?.transfer_enabled || !agent.transfer_phone) {
        return {
          result: toolFail(
            'Transfers are not enabled for this business.',
            'You cannot transfer. Apologise, and offer to take a detailed message instead.',
          ),
        };
      }
      const destination = normalizePhone(agent.transfer_phone);
      if (!destination) {
        await notifyTransferFailed({
          organizationId: ctx.organizationId,
          callId: ctx.callId,
          destination: agent.transfer_phone,
        });
        return { result: toolFail('The configured transfer number is not valid.') };
      }

      await svc
        .from('calls')
        .update({ transferred: true, disposition: 'transferred_to_human' })
        .eq('id', ctx.callId);
      await svc.from('call_transcript_messages').insert({
        call_id: ctx.callId,
        organization_id: ctx.organizationId,
        role: 'system',
        text: `Transfer requested: ${args.reason as string}`,
        sequence: await nextSequence(ctx.callId),
      });

      return {
        result: toolOk(
          { destination_masked: `•••${destination.slice(-4)}` },
          'Tell the caller you are connecting them now, then stop speaking.',
        ),
        sideEffect: { type: 'transfer', destination },
      };
    }

    /* ---------------------------------------------------------------- */
    case 'add_internal_note': {
      const note = args.note as string;
      const leadId = (args.lead_id as string) ?? null;

      await svc.from('call_transcript_messages').insert({
        call_id: ctx.callId,
        organization_id: ctx.organizationId,
        role: 'system',
        text: `Internal note: ${note}`,
        sequence: await nextSequence(ctx.callId),
      });

      if (leadId) {
        const { data: lead } = await svc
          .from('leads')
          .select('notes')
          .eq('id', leadId)
          .eq('organization_id', ctx.organizationId)
          .maybeSingle();
        if (lead) {
          await svc
            .from('leads')
            .update({ notes: [lead.notes, note].filter(Boolean).join('\n') })
            .eq('id', leadId)
            .eq('organization_id', ctx.organizationId);
        }
      }
      return { result: toolOk({ saved: true }, 'Noted. Do not read this back to the caller.') };
    }

    /* ---------------------------------------------------------------- */
    case 'end_call': {
      const disposition = args.disposition as string;
      await svc.from('calls').update({ disposition }).eq('id', ctx.callId);
      return {
        result: toolOk({ ending: true }, 'Say goodbye briefly, then the call will end.'),
        sideEffect: { type: 'hangup', disposition },
      };
    }

    default:
      return { result: toolFail(`Tool "${name}" is not implemented.`) };
  }
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

async function agentConfig(organizationId: string) {
  const svc = getServiceSupabase();
  const { data } = await svc
    .from('ai_agents')
    .select('transfer_enabled, transfer_phone, sms_enabled, appointment_booking_enabled, photo_requests_enabled, fallback_phone')
    .eq('organization_id', organizationId)
    .maybeSingle();
  return data;
}

async function organizationName(organizationId: string): Promise<string> {
  const svc = getServiceSupabase();
  const { data } = await svc
    .from('business_profiles')
    .select('display_name')
    .eq('organization_id', organizationId)
    .maybeSingle();
  if (data?.display_name) return data.display_name as string;
  const { data: org } = await svc.from('organizations').select('name').eq('id', organizationId).maybeSingle();
  return (org?.name as string) ?? 'the business';
}

async function evaluateServiceArea(
  organizationId: string,
  query: { postal_code?: string | null; city?: string | null; state?: string | null },
): Promise<boolean | null> {
  if (!query.postal_code && !query.city && !query.state) return null;
  const svc = getServiceSupabase();
  const { data } = await svc
    .from('service_areas')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('active', true);
  const match = matchServiceArea((data ?? []) as never, query);
  return match.indeterminate ? null : match.covered;
}

async function nextSequence(callId: string): Promise<number> {
  const svc = getServiceSupabase();
  const { count } = await svc
    .from('call_transcript_messages')
    .select('id', { count: 'exact', head: true })
    .eq('call_id', callId);
  return (count ?? 0) + 1;
}

/**
 * Sends an SMS and records it. Used by both the `send_sms` tool and the
 * automatic booking confirmation, so every outbound message is auditable.
 */
async function sendSmsInternal(
  ctx: ToolCallContext,
  input: { to: string; body: string; leadId: string | null },
): Promise<{ ok: boolean; status?: string; error?: string }> {
  const svc = getServiceSupabase();

  const { data: number } = await svc
    .from('phone_numbers')
    .select('phone_number, capabilities')
    .eq('organization_id', ctx.organizationId)
    .eq('status', 'active')
    .maybeSingle();

  const from = (number?.phone_number as string) ?? ctx.businessPhone;
  if (!from) return { ok: false, error: 'No SMS-capable number is configured for this business.' };

  const { data: row } = await svc
    .from('sms_messages')
    .insert({
      organization_id: ctx.organizationId,
      lead_id: input.leadId,
      call_id: ctx.callId,
      direction: 'outbound',
      from_number: from,
      to_number: input.to,
      body: input.body,
      status: 'queued',
    })
    .select('id')
    .single();

  try {
    const sent = await getTelephonyProvider().sendSms({
      to: input.to,
      from,
      body: input.body,
      statusCallbackUrl: absoluteUrl('/api/webhooks/twilio/status'),
    });
    if (row) {
      await svc
        .from('sms_messages')
        .update({ provider_message_sid: sent.sid, status: 'sent' })
        .eq('id', row.id);
    }
    // SMS is metered separately from voice minutes.
    await svc.from('usage_ledger').insert({
      organization_id: ctx.organizationId,
      billing_period: billingPeriodKey(null),
      sms_count: 1,
      voice_seconds: 0,
      billable_minutes: 0,
      ai_usage_metadata: { kind: 'sms', call_id: ctx.callId },
    });
    return { ok: true, status: sent.status };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (row) {
      await svc.from('sms_messages').update({ status: 'failed', error_message: message }).eq('id', row.id);
    }
    return { ok: false, error: message };
  }
}

export { sendSmsInternal };
