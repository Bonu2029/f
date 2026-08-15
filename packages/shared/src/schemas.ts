/**
 * Zod schemas shared between client forms and server route handlers.
 * The server always re-validates with these — client validation is a UX
 * affordance only and is never trusted.
 */

import { z } from 'zod';
import { MEMBER_ROLES } from './types';
import { isValidVapiVoice } from './vapi';

const trimmed = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v === '' ? null : (v ?? null)));

export const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address').max(254);

export const passwordSchema = z
  .string()
  .min(10, 'Use at least 10 characters')
  .max(128, 'Password is too long')
  .refine((v) => /[a-z]/.test(v) && /[A-Z]/.test(v) || /[^A-Za-z]/.test(v), {
    message: 'Mix in a number, symbol or capital letter',
  });

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9()\-.\s]{7,20}$/, 'Enter a valid phone number');

export const signupSchema = z.object({
  first_name: trimmed(80).min(1, 'Enter your first name'),
  last_name: trimmed(80).min(1, 'Enter your last name'),
  email: emailSchema,
  password: passwordSchema,
  business_name: trimmed(120).min(2, 'Enter your business name'),
  accept_terms: z.literal(true, { message: 'You must accept the terms to continue' }),
});
export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password'),
});

export const requestResetSchema = z.object({ email: emailSchema });

export const updatePasswordSchema = z
  .object({
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  });

/* -------------------------------------------------------------------------- */

export const businessHoursDaySchema = z.object({
  weekday: z.number().int().min(0).max(6),
  closed: z.boolean(),
  open: z.string().regex(/^\d{2}:\d{2}$/),
  close: z.string().regex(/^\d{2}:\d{2}$/),
});

export const businessProfileSchema = z.object({
  display_name: trimmed(120).min(2, 'Enter your business name'),
  legal_name: optionalText(160),
  industry: optionalText(60),
  website: z
    .string()
    .trim()
    .max(200)
    .optional()
    .nullable()
    .transform((v) => (v ? (v.startsWith('http') ? v : `https://${v}`) : null))
    .refine((v) => !v || /^https?:\/\/[^\s]+\.[^\s]+$/.test(v), 'Enter a valid website URL'),
  public_phone: optionalText(30),
  email: z
    .string()
    .trim()
    .max(254)
    .optional()
    .nullable()
    .transform((v) => (v === '' ? null : (v ?? null)))
    .refine((v) => !v || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), 'Enter a valid email'),
  address: optionalText(200),
  city: optionalText(80),
  state: optionalText(40),
  postal_code: optionalText(20),
  country: trimmed(2).default('US'),
  timezone: trimmed(64).min(1),
  business_description: optionalText(4000),
  emergency_information: optionalText(2000),
  emergency_phone: optionalText(30),
  business_hours: z.array(businessHoursDaySchema).max(7).optional(),
});
export type BusinessProfileInput = z.infer<typeof businessProfileSchema>;

export const serviceSchema = z.object({
  name: trimmed(120).min(1, 'Enter a service name'),
  description: optionalText(2000),
  price_type: z.enum(['fixed', 'starting_at', 'range', 'quote_only', 'hourly']),
  /** Prices are entered in dollars and stored as integer cents. */
  starting_price: z.number().min(0).max(1_000_000).optional().nullable(),
  exact_price: z.number().min(0).max(1_000_000).optional().nullable(),
  max_price: z.number().min(0).max(1_000_000).optional().nullable(),
  price_notes: optionalText(500),
  estimated_duration: z.number().int().min(0).max(2880).optional().nullable(),
  active: z.boolean().default(true),
});

export const faqSchema = z.object({
  question: trimmed(500).min(3, 'Enter a question'),
  answer: trimmed(4000).min(1, 'Enter an answer'),
  active: z.boolean().default(true),
});

export const policySchema = z.object({
  kind: z.enum([
    'cancellation',
    'refunds',
    'deposits',
    'service_areas',
    'emergency',
    'warranty',
    'financing',
    'payment_methods',
    'other',
  ]),
  title: trimmed(160).min(1, 'Enter a title'),
  body: trimmed(4000).min(1, 'Describe the policy'),
  active: z.boolean().default(true),
});

export const serviceAreaSchema = z
  .object({
    type: z.enum(['city', 'postal_code', 'radius', 'state']),
    city: optionalText(80),
    state: optionalText(40),
    postal_code: optionalText(20),
    center_postal_code: optionalText(20),
    radius_miles: z.number().int().min(1).max(500).optional().nullable(),
    active: z.boolean().default(true),
  })
  .refine(
    (v) =>
      (v.type === 'city' && !!v.city) ||
      (v.type === 'postal_code' && !!v.postal_code) ||
      (v.type === 'state' && !!v.state) ||
      (v.type === 'radius' && !!v.center_postal_code && !!v.radius_miles),
    { message: 'Fill in the fields required for this area type' },
  );

/**
 * Receptionist settings the owner can change.
 *
 * Deliberately limited to what actually reaches the assistant Vapi runs. Fields
 * that would imply a capability we have not built (outbound SMS, photo request
 * links) are not accepted here, because a control that saves but changes nothing
 * is worse than no control at all.
 */
export const aiAgentSchema = z
  .object({
    display_name: trimmed(60).min(1, 'Give your receptionist a name'),
    voice: trimmed(40).refine(isValidVapiVoice, 'Choose one of the available voices'),
    personality: z.enum(['professional', 'friendly', 'warm', 'energetic', 'calm', 'direct']),
    greeting: trimmed(600).min(10, 'Write a greeting of at least 10 characters'),
    instructions: optionalText(4000),
    transfer_enabled: z.boolean(),
    transfer_phone: optionalText(30),
    appointment_booking_enabled: z.boolean(),
    active: z.boolean().optional(),
  })
  .refine((v) => !v.transfer_enabled || !!v.transfer_phone, {
    message: 'Add a transfer number, or turn transfers off',
    path: ['transfer_phone'],
  });

export const aiRuleSchema = z.object({
  title: trimmed(160).min(1, 'Give the rule a short title'),
  instruction: trimmed(2000).min(1, 'Describe what the receptionist should do'),
  priority: z.number().int().min(0).max(1000).default(100),
  enabled: z.boolean().default(true),
});

export const availabilitySettingsSchema = z.object({
  appointment_duration: z.number().int().min(15).max(480),
  buffer_before: z.number().int().min(0).max(240),
  buffer_after: z.number().int().min(0).max(240),
  min_notice_minutes: z.number().int().min(0).max(20160),
  max_horizon_days: z.number().int().min(1).max(365),
  blackout_dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(200).default([]),
  rules: z
    .array(
      z.object({
        weekday: z.number().int().min(0).max(6),
        start_time: z.string().regex(/^\d{2}:\d{2}$/),
        end_time: z.string().regex(/^\d{2}:\d{2}$/),
        active: z.boolean().default(true),
      }),
    )
    .max(50),
});

export const leadUpdateSchema = z.object({
  name: optionalText(200),
  phone: optionalText(30),
  email: optionalText(254),
  address: optionalText(200),
  city: optionalText(80),
  state: optionalText(40),
  postal_code: optionalText(20),
  service_requested: optionalText(200),
  description: optionalText(4000),
  urgency: z.enum(['emergency', 'urgent', 'soon', 'flexible', 'unknown']).optional(),
  status: z.enum(['new', 'qualified', 'appointment_booked', 'contacted', 'won', 'lost']).optional(),
  estimated_value: z.number().min(0).max(100_000_000).optional().nullable(),
  notes: optionalText(8000),
  is_property_owner: z.boolean().optional().nullable(),
});

export const appointmentSchema = z.object({
  customer_name: trimmed(200).min(1, 'Enter the customer name'),
  customer_phone: optionalText(30),
  customer_email: optionalText(254),
  service: optionalText(200),
  address: optionalText(200),
  start_at: z.string().min(1),
  end_at: z.string().min(1),
  status: z.enum(['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show']).default('scheduled'),
  notes: optionalText(4000),
  lead_id: z.string().uuid().optional().nullable(),
});

export const inviteSchema = z.object({
  email: emailSchema,
  role: z.enum(MEMBER_ROLES as unknown as [string, ...string[]]),
});

/** Vapi picks the number; the owner may only express an area-code preference. */
export const phoneProvisionSchema = z.object({
  area_code: z
    .string()
    .trim()
    .regex(/^\d{3}$/, 'Enter a 3-digit area code')
    .optional()
    .nullable(),
});

export const checkoutSchema = z.object({
  /**
   * Requested plan. The server independently re-derives eligibility — a client
   * asking for `founder` when no slot is available is silently downgraded.
   */
  plan: z.enum(['founder', 'standard']).optional(),
});

export const notificationPrefsSchema = z.object({
  email_new_lead: z.boolean(),
  email_appointment: z.boolean(),
  email_usage_alerts: z.boolean(),
  email_billing: z.boolean(),
});
