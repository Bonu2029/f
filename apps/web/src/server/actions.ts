'use server';

import { revalidatePath } from 'next/cache';
import {
  aiAgentSchema,
  aiRuleSchema,
  employeeSchema,
  employeeAvailabilitySchema,
  employeeTimeOffSchema,
  businessProfileSchema,
  faqSchema,
  leadUpdateSchema,
  appointmentSchema,
  notificationPrefsSchema,
  policySchema,
  serviceAreaSchema,
  serviceSchema,
  normalizePhone,
  scoreLeadFromRecord,
} from '@afd/shared';
import { assertOrgAccess, requireRole, requireSession } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase/server';
import { AUDIT_ACTIONS, recordAudit } from '@/lib/audit';
import { actionError, actionOk, errors, type ActionResult } from '@/lib/errors';
import { advanceOnboarding, completeOnboarding, getReadinessChecklist } from '@/server/organizations';
import { syncAssistant, syncAssistantQuietly } from '@/server/vapi-sync';
import { bookAppointment } from '@/server/booking';

/**
 * Server Actions for every dashboard and onboarding mutation.
 *
 * Each one:
 *   1. resolves the caller's session and required role,
 *   2. re-validates input with the shared Zod schema,
 *   3. writes with an explicit `organization_id` filter,
 *   4. revalidates the affected route.
 *
 * The organisation is always taken from the session, never from the form.
 */

/** Dollars (as typed by a human) to integer cents. */
function toCents(value: FormDataEntryValue | null): number | null {
  if (value == null || value === '') return null;
  const n = Number(String(value).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

function num(value: FormDataEntryValue | null): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/* -------------------------------------------------------------------------- */
/* Assistant sync                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Pushes a settings change through to the organisation's Vapi assistant.
 *
 * The database write has already committed by the time this runs, so a provider
 * failure must not be reported as a failed save. It must not be reported as a
 * clean success either: the owner would believe a change was live when the
 * receptionist is still answering with the old configuration. The middle case
 * is what `warning` is for.
 */
async function syncAfterSave(
  ctx: { user: { id: string; email?: string | null } },
  organizationId: string,
  reason: string,
  savedMessage: string,
): Promise<ActionResult> {
  const sync = await syncAssistantQuietly({
    organizationId,
    actorUserId: ctx.user.id,
    actorEmail: ctx.user.email ?? null,
    reason,
  });

  revalidatePath('/dashboard/receptionist');

  return sync.ok
    ? actionOk(undefined, savedMessage)
    : { ok: true, warning: sync.message };
}

/* -------------------------------------------------------------------------- */
/* Business profile                                                           */
/* -------------------------------------------------------------------------- */

export async function saveBusinessProfileAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireRole('admin');
    const organizationId = ctx.active.organizationId;

    const hoursRaw = formData.get('business_hours');
    const business_hours = hoursRaw ? JSON.parse(String(hoursRaw)) : undefined;

    const input = businessProfileSchema.parse({
      display_name: formData.get('display_name'),
      legal_name: formData.get('legal_name'),
      industry: formData.get('industry'),
      website: formData.get('website'),
      public_phone: formData.get('public_phone'),
      email: formData.get('email'),
      address: formData.get('address'),
      city: formData.get('city'),
      state: formData.get('state'),
      postal_code: formData.get('postal_code'),
      country: formData.get('country') || 'US',
      timezone: formData.get('timezone') || ctx.active.timezone,
      business_description: formData.get('business_description'),
      emergency_information: formData.get('emergency_information'),
      emergency_phone: formData.get('emergency_phone'),
      ...(business_hours ? { business_hours } : {}),
    });

    const svc = getServiceSupabase();
    const { error } = await svc
      .from('business_profiles')
      .update({
        ...input,
        public_phone: normalizePhone(input.public_phone) ?? input.public_phone,
        emergency_phone: normalizePhone(input.emergency_phone) ?? input.emergency_phone,
      })
      .eq('organization_id', organizationId);
    if (error) throw errors.conflict(`Your business details could not be saved: ${error.message}`);

    // Keep the organisation record in step with the business name and timezone.
    await svc
      .from('organizations')
      .update({ name: input.display_name, timezone: input.timezone })
      .eq('id', organizationId);

    await advanceOnboarding(organizationId, 2);
    await recordAudit({
      organizationId,
      actorUserId: ctx.user.id,
      actorEmail: ctx.user.email ?? null,
      action: AUDIT_ACTIONS.ORG_UPDATED,
      targetType: 'business_profile',
      metadata: { fields: Object.keys(input) },
    });

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/settings/business');
    return syncAfterSave(
      ctx,
      organizationId,
      'business profile updated',
      'Business details saved. Your receptionist knows them from your next call.',
    );
  } catch (err) {
    return actionError(err);
  }
}

/* -------------------------------------------------------------------------- */
/* Services / FAQs / Policies / Service areas                                 */
/* -------------------------------------------------------------------------- */

export async function saveServiceAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireRole('admin');
    const id = formData.get('id') ? String(formData.get('id')) : null;

    const input = serviceSchema.parse({
      name: formData.get('name'),
      description: formData.get('description'),
      price_type: formData.get('price_type') || 'quote_only',
      starting_price: toCents(formData.get('starting_price')),
      exact_price: toCents(formData.get('exact_price')),
      max_price: toCents(formData.get('max_price')),
      price_notes: formData.get('price_notes'),
      estimated_duration: num(formData.get('estimated_duration')),
      active: formData.get('active') !== 'false',
    });

    const svc = getServiceSupabase();
    const payload = { ...input, organization_id: ctx.active.organizationId };

    const { error } = id
      ? await svc.from('services').update(payload).eq('id', id).eq('organization_id', ctx.active.organizationId)
      : await svc.from('services').insert(payload);

    if (error) {
      if (/services_org_name_uniq/.test(error.message)) {
        return actionError(
          errors.validation('You already have a service with that name.', { name: 'Already exists' }),
        );
      }
      throw errors.conflict(`That service could not be saved: ${error.message}`);
    }

    revalidatePath('/dashboard/settings/business');
    return syncAfterSave(
      ctx,
      ctx.active.organizationId,
      id ? 'service updated' : 'service added',
      id ? 'Service updated.' : 'Service added.',
    );
  } catch (err) {
    return actionError(err);
  }
}

export async function deleteRecordAction(
  table: 'services' | 'faqs' | 'business_policies' | 'service_areas' | 'ai_rules',
  id: string,
): Promise<ActionResult> {
  try {
    const ctx = await requireRole('admin');
    const svc = getServiceSupabase();

    if (table === 'ai_rules') {
      // System rules define the receptionist's safety behaviour; they can be
      // disabled but not deleted.
      const { data } = await svc.from('ai_rules').select('is_system').eq('id', id).maybeSingle();
      if (data?.is_system) {
        return actionError(
          errors.forbidden('delete a built-in safety rule. You can disable it instead.'),
        );
      }
    }

    const { error } = await svc
      .from(table)
      .delete()
      .eq('id', id)
      .eq('organization_id', ctx.active.organizationId);
    if (error) throw errors.conflict(`That could not be deleted: ${error.message}`);

    revalidatePath('/dashboard/settings/business');
    return syncAfterSave(ctx, ctx.active.organizationId, `${table} row deleted`, 'Deleted.');
  } catch (err) {
    return actionError(err);
  }
}

export async function saveFaqAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await requireRole('admin');
    const id = formData.get('id') ? String(formData.get('id')) : null;
    const input = faqSchema.parse({
      question: formData.get('question'),
      answer: formData.get('answer'),
      active: formData.get('active') !== 'false',
    });

    const svc = getServiceSupabase();
    const payload = { ...input, organization_id: ctx.active.organizationId };
    const { error } = id
      ? await svc.from('faqs').update(payload).eq('id', id).eq('organization_id', ctx.active.organizationId)
      : await svc.from('faqs').insert(payload);
    if (error) throw errors.conflict(`That question could not be saved: ${error.message}`);

    revalidatePath('/dashboard/settings/business');
    return syncAfterSave(
      ctx,
      ctx.active.organizationId,
      id ? 'FAQ updated' : 'FAQ added',
      id ? 'Question updated.' : 'Question added.',
    );
  } catch (err) {
    return actionError(err);
  }
}

export async function savePolicyAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await requireRole('admin');
    const id = formData.get('id') ? String(formData.get('id')) : null;
    const input = policySchema.parse({
      kind: formData.get('kind') || 'other',
      title: formData.get('title'),
      body: formData.get('body'),
      active: formData.get('active') !== 'false',
    });

    const svc = getServiceSupabase();
    const payload = { ...input, organization_id: ctx.active.organizationId };
    const { error } = id
      ? await svc.from('business_policies').update(payload).eq('id', id).eq('organization_id', ctx.active.organizationId)
      : await svc.from('business_policies').insert(payload);
    if (error) throw errors.conflict(`That policy could not be saved: ${error.message}`);

    revalidatePath('/dashboard/settings/business');
    return syncAfterSave(ctx, ctx.active.organizationId, 'policy saved', 'Policy saved.');
  } catch (err) {
    return actionError(err);
  }
}

export async function saveServiceAreaAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireRole('admin');
    const input = serviceAreaSchema.parse({
      type: formData.get('type'),
      city: formData.get('city'),
      state: formData.get('state'),
      postal_code: formData.get('postal_code'),
      center_postal_code: formData.get('center_postal_code'),
      radius_miles: num(formData.get('radius_miles')),
      active: true,
    });

    const svc = getServiceSupabase();
    const { error } = await svc
      .from('service_areas')
      .insert({ ...input, organization_id: ctx.active.organizationId });
    if (error) throw errors.conflict(`That service area could not be saved: ${error.message}`);

    revalidatePath('/dashboard/settings/business');
    return syncAfterSave(ctx, ctx.active.organizationId, 'service area added', 'Service area added.');
  } catch (err) {
    return actionError(err);
  }
}

/* -------------------------------------------------------------------------- */
/* Receptionist configuration                                                 */
/* -------------------------------------------------------------------------- */

export async function saveAgentAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await requireRole('admin');
    const organizationId = ctx.active.organizationId;

    const transferEnabled = formData.get('transfer_enabled') === 'on';
    const input = aiAgentSchema.parse({
      name: formData.get('name'),
      voice_id: formData.get('voice_id'),
      personality: formData.get('personality') || 'friendly',
      greeting: formData.get('greeting'),
      instructions: formData.get('instructions'),
      transfer_enabled: transferEnabled,
      transfer_phone: formData.get('transfer_phone'),
      appointment_booking_enabled: formData.get('appointment_booking_enabled') === 'on',
    });

    const svc = getServiceSupabase();
    const { error } = await svc
      .from('ai_agents')
      .update({
        ...input,
        transfer_phone: input.transfer_enabled ? normalizePhone(input.transfer_phone) : null,
      })
      .eq('organization_id', organizationId);

    if (error) throw errors.conflict(`Your receptionist settings could not be saved: ${error.message}`);

    await advanceOnboarding(organizationId, 2);
    await recordAudit({
      organizationId,
      actorUserId: ctx.user.id,
      actorEmail: ctx.user.email ?? null,
      action: AUDIT_ACTIONS.AGENT_UPDATED,
      targetType: 'ai_agent',
      metadata: { voice_id: input.voice_id, personality: input.personality },
    });

    return syncAfterSave(
      ctx,
      organizationId,
      'receptionist settings updated',
      'Saved. Your next call will use these settings.',
    );
  } catch (err) {
    return actionError(err);
  }
}

export async function saveRuleAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await requireRole('admin');
    const id = formData.get('id') ? String(formData.get('id')) : null;
    const input = aiRuleSchema.parse({
      title: formData.get('title'),
      instruction: formData.get('instruction'),
      priority: num(formData.get('priority')) ?? 100,
      enabled: formData.get('enabled') !== 'false',
    });

    const svc = getServiceSupabase();
    const { error } = id
      ? await svc
          .from('ai_rules')
          .update(input)
          .eq('id', id)
          .eq('organization_id', ctx.active.organizationId)
      : await svc.from('ai_rules').insert({ ...input, organization_id: ctx.active.organizationId });
    if (error) throw errors.conflict(`That rule could not be saved: ${error.message}`);

    return syncAfterSave(ctx, ctx.active.organizationId, 'receptionist rule saved', 'Rule saved.');
  } catch (err) {
    return actionError(err);
  }
}

export async function toggleRuleAction(id: string, enabled: boolean): Promise<ActionResult> {
  try {
    const ctx = await requireRole('admin');
    const svc = getServiceSupabase();
    const { error } = await svc
      .from('ai_rules')
      .update({ enabled })
      .eq('id', id)
      .eq('organization_id', ctx.active.organizationId);
    if (error) throw errors.conflict(error.message);
    return syncAfterSave(
      ctx,
      ctx.active.organizationId,
      enabled ? 'receptionist rule enabled' : 'receptionist rule disabled',
      enabled ? 'Rule enabled.' : 'Rule disabled.',
    );
  } catch (err) {
    return actionError(err);
  }
}

/** Pauses or resumes the receptionist. Takes effect on the next call. */
export async function setAiPausedAction(paused: boolean): Promise<ActionResult> {
  try {
    const ctx = await requireRole('admin');
    const svc = getServiceSupabase();
    const { error } = await svc
      .from('organizations')
      .update({ ai_paused: paused })
      .eq('id', ctx.active.organizationId);
    if (error) throw errors.conflict(error.message);

    await recordAudit({
      organizationId: ctx.active.organizationId,
      actorUserId: ctx.user.id,
      actorEmail: ctx.user.email ?? null,
      action: paused ? AUDIT_ACTIONS.ORG_PAUSED : AUDIT_ACTIONS.ORG_RESUMED,
    });

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/receptionist');
    return actionOk(
      undefined,
      paused
        ? 'Your receptionist is paused. Incoming calls will not be answered by the AI.'
        : 'Your receptionist is answering again.',
    );
  } catch (err) {
    return actionError(err);
  }
}

/** Final onboarding step — only succeeds when the checklist is genuinely met. */
export async function activateReceptionistAction(): Promise<ActionResult> {
  try {
    const ctx = await requireRole('admin');
    const organizationId = ctx.active.organizationId;

    const readiness = await getReadinessChecklist(organizationId);
    if (!readiness.canGoLive) {
      const missing = readiness.items.filter((i) => i.required && !i.done).map((i) => i.label);
      return actionError(
        errors.validation(
          `Your receptionist is not ready yet: ${missing.join(', ')}.`,
        ),
      );
    }

    // Push the current settings to Vapi FIRST. Activating an organisation whose
    // assistant was never created would put a number live with nothing behind it.
    await syncAssistant({
      organizationId,
      actorUserId: ctx.user.id,
      actorEmail: ctx.user.email ?? null,
      reason: 'activation',
    });

    const svc = getServiceSupabase();
    const { error } = await svc
      .from('ai_agents')
      .update({ active: true })
      .eq('organization_id', organizationId);
    if (error) throw errors.conflict(error.message);

    await svc.from('organizations').update({ ai_paused: false }).eq('id', organizationId);
    await completeOnboarding(organizationId);
    await recordAudit({
      organizationId,
      actorUserId: ctx.user.id,
      actorEmail: ctx.user.email ?? null,
      action: AUDIT_ACTIONS.AGENT_ACTIVATED,
    });

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/receptionist');
    return actionOk(undefined, 'Your receptionist is live and answering calls.');
  } catch (err) {
    return actionError(err);
  }
}

/* -------------------------------------------------------------------------- */
/* Employees, working hours and time off                                      */
/* -------------------------------------------------------------------------- */

/**
 * These do NOT trigger an assistant sync. Who is on shift changes what times
 * can be offered, not what the receptionist knows about the business, and the
 * booking engine reads availability live at call time. Re-publishing the
 * assistant every time someone edits a rota would be pure noise.
 */

export async function saveEmployeeAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireRole('admin');
    const id = formData.get('id') ? String(formData.get('id')) : null;

    const input = employeeSchema.parse({
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      job_title: formData.get('job_title'),
      notes: formData.get('notes'),
      active: formData.get('active') !== 'false',
    });

    const svc = getServiceSupabase();
    const payload = {
      ...input,
      phone: normalizePhone(input.phone) ?? input.phone,
      organization_id: ctx.active.organizationId,
    };

    const { error } = id
      ? await svc
          .from('employees')
          .update(payload)
          .eq('id', id)
          .eq('organization_id', ctx.active.organizationId)
      : await svc.from('employees').insert(payload);

    if (error) {
      if (/employees_org_name_uniq/.test(error.message)) {
        return actionError(
          errors.validation('Someone with that name is already on your team.', {
            name: 'Already exists',
          }),
        );
      }
      throw errors.conflict(`That person could not be saved: ${error.message}`);
    }

    revalidatePath('/dashboard/employees');
    return actionOk(undefined, id ? 'Saved.' : `${input.name} added.`);
  } catch (err) {
    return actionError(err);
  }
}

/**
 * Deactivating rather than deleting is the default for a reason: an employee
 * row is referenced by every appointment they ever worked, and removing them
 * would orphan that history.
 */
export async function setEmployeeActiveAction(
  employeeId: string,
  active: boolean,
): Promise<ActionResult> {
  try {
    const ctx = await requireRole('admin');
    const svc = getServiceSupabase();
    const { error } = await svc
      .from('employees')
      .update({ active })
      .eq('id', employeeId)
      .eq('organization_id', ctx.active.organizationId);
    if (error) throw errors.conflict(error.message);

    revalidatePath('/dashboard/employees');
    return actionOk(
      undefined,
      active ? 'Back on the schedule.' : 'Off the schedule. Existing appointments are unchanged.',
    );
  } catch (err) {
    return actionError(err);
  }
}

export async function saveEmployeeHoursAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireRole('admin');
    const employeeId = String(formData.get('employee_id') ?? '');
    if (!employeeId) return actionError(errors.validation('No employee was specified.'));

    // Sent as JSON because a week is several rows and a split shift is two rows
    // on one day — flat form fields cannot express that without inventing an
    // encoding.
    const raw = JSON.parse(String(formData.get('blocks') ?? '[]')) as unknown[];
    const blocks = raw.map((b) => employeeAvailabilitySchema.parse(b));

    const svc = getServiceSupabase();

    // Verify the employee belongs to this organisation before touching
    // anything: the id came from a form.
    const { data: employee } = await svc
      .from('employees')
      .select('id')
      .eq('id', employeeId)
      .eq('organization_id', ctx.active.organizationId)
      .maybeSingle();
    if (!employee) return actionError(errors.notFound('That person'));

    // Replace the pattern wholesale. Diffing rows would be more code and the
    // failure mode is worse: a half-applied rota.
    await svc
      .from('employee_availability')
      .delete()
      .eq('employee_id', employeeId)
      .eq('organization_id', ctx.active.organizationId);

    if (blocks.length) {
      const { error } = await svc.from('employee_availability').insert(
        blocks.map((b) => ({
          ...b,
          employee_id: employeeId,
          organization_id: ctx.active.organizationId,
        })),
      );
      if (error) throw errors.conflict(`Those hours could not be saved: ${error.message}`);
    }

    revalidatePath('/dashboard/employees');
    return actionOk(
      undefined,
      blocks.length
        ? 'Working hours saved.'
        : 'Working hours cleared — this person will not be offered for new appointments.',
    );
  } catch (err) {
    return actionError(err);
  }
}

export async function saveTimeOffAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireRole('admin');
    const employeeId = String(formData.get('employee_id') ?? '');

    const input = employeeTimeOffSchema.parse({
      starts_at: formData.get('starts_at'),
      ends_at: formData.get('ends_at'),
      reason: formData.get('reason'),
    });

    const svc = getServiceSupabase();
    const { data: employee } = await svc
      .from('employees')
      .select('id')
      .eq('id', employeeId)
      .eq('organization_id', ctx.active.organizationId)
      .maybeSingle();
    if (!employee) return actionError(errors.notFound('That person'));

    const { error } = await svc.from('employee_time_off').insert({
      organization_id: ctx.active.organizationId,
      employee_id: employeeId,
      starts_at: new Date(input.starts_at).toISOString(),
      ends_at: new Date(input.ends_at).toISOString(),
      reason: input.reason,
    });
    if (error) throw errors.conflict(`That time off could not be saved: ${error.message}`);

    revalidatePath('/dashboard/employees');
    return actionOk(undefined, 'Time off saved.');
  } catch (err) {
    return actionError(err);
  }
}

export async function deleteTimeOffAction(id: string): Promise<ActionResult> {
  try {
    const ctx = await requireRole('admin');
    const svc = getServiceSupabase();
    const { error } = await svc
      .from('employee_time_off')
      .delete()
      .eq('id', id)
      .eq('organization_id', ctx.active.organizationId);
    if (error) throw errors.conflict(error.message);
    revalidatePath('/dashboard/employees');
    return actionOk(undefined, 'Removed.');
  } catch (err) {
    return actionError(err);
  }
}

/**
 * Which services this person can do.
 *
 * A service with nobody assigned is treated as "anyone active can do it" by the
 * booking engine — the right default for a one-person business, and it stops a
 * newly added service being unbookable until someone remembers to tick a box.
 */
export async function saveEmployeeServicesAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireRole('admin');
    const employeeId = String(formData.get('employee_id') ?? '');
    const serviceIds = formData.getAll('service_ids').map(String).filter(Boolean);

    const svc = getServiceSupabase();
    const { data: employee } = await svc
      .from('employees')
      .select('id')
      .eq('id', employeeId)
      .eq('organization_id', ctx.active.organizationId)
      .maybeSingle();
    if (!employee) return actionError(errors.notFound('That person'));

    // Only accept services this organisation actually owns, so a tampered form
    // cannot link another tenant's service.
    const { data: owned } = await svc
      .from('services')
      .select('id')
      .eq('organization_id', ctx.active.organizationId)
      .in('id', serviceIds.length ? serviceIds : ['00000000-0000-0000-0000-000000000000']);

    const valid = (owned ?? []).map((r) => r.id as string);

    await svc
      .from('service_employees')
      .delete()
      .eq('employee_id', employeeId)
      .eq('organization_id', ctx.active.organizationId);

    if (valid.length) {
      const { error } = await svc.from('service_employees').insert(
        valid.map((serviceId) => ({
          organization_id: ctx.active.organizationId,
          service_id: serviceId,
          employee_id: employeeId,
        })),
      );
      if (error) throw errors.conflict(`Those services could not be saved: ${error.message}`);
    }

    revalidatePath('/dashboard/employees');
    return actionOk(
      undefined,
      valid.length ? 'Services saved.' : 'Cleared — this person can be offered for any service.',
    );
  } catch (err) {
    return actionError(err);
  }
}

/* -------------------------------------------------------------------------- */
/* Booking against real availability                                          */
/* -------------------------------------------------------------------------- */

/**
 * Books one of the slots the engine offered.
 *
 * The slot is re-derived here rather than trusted from the form: a start time
 * arriving from a browser is a request, not a fact, and the overlap constraint
 * in Postgres is what finally decides. See server/booking.ts.
 */
export async function bookSlotAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireSession();

    const startISO = String(formData.get('start_at') ?? '');
    const endISO = String(formData.get('end_at') ?? '');
    const employeeId = String(formData.get('employee_id') ?? '');
    const customerName = String(formData.get('customer_name') ?? '').trim();

    if (!startISO || !endISO || !employeeId) {
      return actionError(errors.validation('Choose a time before booking.'));
    }
    if (!customerName) {
      return actionError(
        errors.validation('Enter the customer name.', { customer_name: 'Required' }),
      );
    }

    const result = await bookAppointment({
      organizationId: ctx.active.organizationId,
      employeeId,
      startISO,
      endISO,
      customerName,
      customerPhone: normalizePhone(String(formData.get('customer_phone') ?? '')) ?? null,
      customerEmail: String(formData.get('customer_email') ?? '') || null,
      service: String(formData.get('service') ?? '') || null,
      address: String(formData.get('address') ?? '') || null,
      notes: String(formData.get('notes') ?? '') || null,
      source: 'manual',
    });

    revalidatePath('/dashboard/appointments');
    return actionOk({ appointmentId: result.appointmentId }, `Booked for ${customerName}.`);
  } catch (err) {
    return actionError(err);
  }
}

/* -------------------------------------------------------------------------- */
/* Leads and appointments                                                     */
/* -------------------------------------------------------------------------- */

export async function updateLeadAction(
  leadId: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireSession();
    const svc = getServiceSupabase();

    const { data: lead } = await svc
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .eq('organization_id', ctx.active.organizationId)
      .maybeSingle();
    if (!lead) return actionError(errors.notFound('That lead'));

    const input = leadUpdateSchema.parse({
      name: formData.get('name'),
      phone: formData.get('phone'),
      email: formData.get('email'),
      address: formData.get('address'),
      city: formData.get('city'),
      state: formData.get('state'),
      postal_code: formData.get('postal_code'),
      service_requested: formData.get('service_requested'),
      description: formData.get('description'),
      ...(formData.get('urgency') ? { urgency: formData.get('urgency') } : {}),
      ...(formData.get('status') ? { status: formData.get('status') } : {}),
      estimated_value: toCents(formData.get('estimated_value')),
      notes: formData.get('notes'),
    });

    const merged = { ...lead, ...input };
    const scored = scoreLeadFromRecord(merged as never);

    const { error } = await svc
      .from('leads')
      .update({
        ...input,
        phone: normalizePhone(input.phone) ?? input.phone,
        lead_score: scored.score,
        score_reasons: scored.reasons,
      })
      .eq('id', leadId)
      .eq('organization_id', ctx.active.organizationId);
    if (error) throw errors.conflict(`That lead could not be saved: ${error.message}`);

    revalidatePath('/dashboard/leads');
    revalidatePath(`/dashboard/leads/${leadId}`);
    return actionOk(undefined, 'Lead updated.');
  } catch (err) {
    return actionError(err);
  }
}

export async function saveAppointmentAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireSession();
    const id = formData.get('id') ? String(formData.get('id')) : null;

    const input = appointmentSchema.parse({
      customer_name: formData.get('customer_name'),
      customer_phone: formData.get('customer_phone'),
      customer_email: formData.get('customer_email'),
      service: formData.get('service'),
      address: formData.get('address'),
      start_at: new Date(String(formData.get('start_at'))).toISOString(),
      end_at: new Date(String(formData.get('end_at'))).toISOString(),
      status: formData.get('status') || 'scheduled',
      notes: formData.get('notes'),
      lead_id: formData.get('lead_id') || null,
    });

    if (new Date(input.end_at) <= new Date(input.start_at)) {
      return actionError(
        errors.validation('The end time must be after the start time.', { end_at: 'Must be later than the start' }),
      );
    }

    const svc = getServiceSupabase();
    const payload = {
      ...input,
      organization_id: ctx.active.organizationId,
      customer_phone: normalizePhone(input.customer_phone),
      source: 'manual',
    };

    const { error } = id
      ? await svc
          .from('appointments')
          .update(payload)
          .eq('id', id)
          .eq('organization_id', ctx.active.organizationId)
      : await svc.from('appointments').insert(payload);

    if (error) {
      if (/appointments_slot_uniq/.test(error.message)) {
        return actionError(
          errors.conflict('There is already an appointment at that exact time. Pick another slot.'),
        );
      }
      throw errors.conflict(`That appointment could not be saved: ${error.message}`);
    }

    revalidatePath('/dashboard/appointments');
    return actionOk(undefined, id ? 'Appointment updated.' : 'Appointment created.');
  } catch (err) {
    return actionError(err);
  }
}

export async function setAppointmentStatusAction(
  appointmentId: string,
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show',
): Promise<ActionResult> {
  try {
    const ctx = await requireSession();
    const svc = getServiceSupabase();
    const { error } = await svc
      .from('appointments')
      .update({ status })
      .eq('id', appointmentId)
      .eq('organization_id', ctx.active.organizationId);
    if (error) throw errors.conflict(error.message);
    revalidatePath('/dashboard/appointments');
    return actionOk(undefined, 'Appointment updated.');
  } catch (err) {
    return actionError(err);
  }
}

/* -------------------------------------------------------------------------- */
/* Notifications                                                              */
/* -------------------------------------------------------------------------- */

export async function saveNotificationPrefsAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireRole('admin');
    const input = notificationPrefsSchema.parse({
      email_new_lead: formData.get('email_new_lead') === 'on',
      email_appointment: formData.get('email_appointment') === 'on',
      email_usage_alerts: formData.get('email_usage_alerts') === 'on',
      email_billing: formData.get('email_billing') === 'on',
    });

    const svc = getServiceSupabase();
    await svc
      .from('notification_preferences')
      .upsert({ organization_id: ctx.active.organizationId, ...input }, { onConflict: 'organization_id' });

    revalidatePath('/dashboard/settings/notifications');
    return actionOk(undefined, 'Notification settings saved.');
  } catch (err) {
    return actionError(err);
  }
}

export async function markNotificationsReadAction(): Promise<ActionResult> {
  try {
    const ctx = await requireSession();
    const svc = getServiceSupabase();
    await svc
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('organization_id', ctx.active.organizationId)
      .is('read_at', null);
    revalidatePath('/dashboard');
    return actionOk();
  } catch (err) {
    return actionError(err);
  }
}

/* -------------------------------------------------------------------------- */
/* Organisation-scoped helper used by API routes with an explicit id          */
/* -------------------------------------------------------------------------- */

export async function assertCanManage(organizationId: string) {
  return assertOrgAccess(organizationId, 'admin');
}
