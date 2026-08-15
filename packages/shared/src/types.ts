/**
 * Domain types mirroring the database schema in `supabase/migrations`.
 * These are hand-maintained rather than generated so the shared package has no
 * dependency on a live database, but the field names match the SQL exactly.
 */

export type Uuid = string;
/** ISO-8601 UTC timestamp. All timestamps are stored in UTC. */
export type Timestamp = string;

export type MemberRole = 'owner' | 'admin' | 'staff';
export const MEMBER_ROLES: readonly MemberRole[] = ['owner', 'admin', 'staff'];

/** Role ranking used for server-side authorisation checks. Higher wins. */
export const ROLE_RANK: Record<MemberRole, number> = { staff: 1, admin: 2, owner: 3 };

export function roleAtLeast(role: MemberRole | null | undefined, minimum: MemberRole): boolean {
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export type OrganizationStatus = 'onboarding' | 'active' | 'paused' | 'cancelled' | 'suspended';

export type SubscriptionStatus =
  | 'incomplete'
  | 'incomplete_expired'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'paused';

/** Subscription states in which the AI receptionist is allowed to answer calls. */
export const SERVICEABLE_SUBSCRIPTION_STATUSES: readonly SubscriptionStatus[] = [
  'trialing',
  'active',
  'past_due',
];

export type FounderClaimStatus = 'reserved' | 'active' | 'expired' | 'released';

export type PriceType = 'fixed' | 'starting_at' | 'range' | 'quote_only' | 'hourly';

export type ProcessingStatus = 'pending' | 'processing' | 'ready' | 'failed';

export type CallDirection = 'inbound' | 'outbound';

export type CallResult =
  | 'in_progress'
  | 'completed'
  | 'transferred'
  | 'voicemail'
  | 'abandoned'
  | 'failed'
  | 'rejected';

export type CallDisposition =
  | 'lead_captured'
  | 'appointment_booked'
  | 'question_answered'
  | 'transferred_to_human'
  | 'spam'
  | 'wrong_number'
  | 'out_of_service_area'
  | 'no_intent'
  | 'unresolved';

export type LeadStatus =
  | 'new'
  | 'qualified'
  | 'appointment_booked'
  | 'contacted'
  | 'won'
  | 'lost';

export const LEAD_STATUSES: readonly LeadStatus[] = [
  'new',
  'qualified',
  'appointment_booked',
  'contacted',
  'won',
  'lost',
];

export type LeadScore = 'hot' | 'warm' | 'cold';

export type Urgency = 'emergency' | 'urgent' | 'soon' | 'flexible' | 'unknown';

export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type SmsDirection = 'inbound' | 'outbound';
export type SmsStatus = 'queued' | 'sending' | 'sent' | 'delivered' | 'undelivered' | 'failed' | 'received';

export type ServiceAreaType = 'city' | 'postal_code' | 'radius' | 'state';

export type PhoneNumberStatus = 'provisioning' | 'active' | 'released' | 'failed';

export type ForwardingMode = 'all' | 'missed_only' | 'after_hours' | 'none';

export type WebhookProvider = 'stripe' | 'twilio' | 'openai' | 'google';
export type WebhookStatus = 'received' | 'processed' | 'failed' | 'skipped';

export type NotificationKind =
  | 'lead_created'
  | 'appointment_booked'
  | 'transfer_failed'
  | 'usage_70'
  | 'usage_90'
  | 'usage_100'
  | 'payment_failed'
  | 'calendar_disconnected'
  | 'phone_issue'
  | 'ai_unavailable';

/* -------------------------------------------------------------------------- */

export interface Profile {
  id: Uuid;
  first_name: string | null;
  last_name: string | null;
  email: string;
  avatar_url: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Organization {
  id: Uuid;
  name: string;
  slug: string;
  owner_user_id: Uuid;
  timezone: string;
  status: OrganizationStatus;
  onboarding_step: number;
  onboarding_completed_at: Timestamp | null;
  ai_paused: boolean;
  is_demo: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface OrganizationMember {
  id: Uuid;
  organization_id: Uuid;
  user_id: Uuid;
  role: MemberRole;
  created_at: Timestamp;
}

export interface BusinessHoursDay {
  /** 0 = Sunday … 6 = Saturday */
  weekday: number;
  closed: boolean;
  /** "HH:MM" 24h, in the organisation timezone. */
  open: string;
  close: string;
}

export interface BusinessProfile {
  id: Uuid;
  organization_id: Uuid;
  legal_name: string | null;
  display_name: string;
  industry: string | null;
  website: string | null;
  public_phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string;
  timezone: string;
  business_description: string | null;
  business_hours: BusinessHoursDay[];
  emergency_information: string | null;
  emergency_phone: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Service {
  id: Uuid;
  organization_id: Uuid;
  name: string;
  description: string | null;
  price_type: PriceType;
  starting_price: number | null;
  exact_price: number | null;
  max_price: number | null;
  price_notes: string | null;
  estimated_duration: number | null;
  active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Faq {
  id: Uuid;
  organization_id: Uuid;
  question: string;
  answer: string;
  active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export type PolicyKind =
  | 'cancellation'
  | 'refunds'
  | 'deposits'
  | 'service_areas'
  | 'emergency'
  | 'warranty'
  | 'financing'
  | 'payment_methods'
  | 'other';

export interface BusinessPolicy {
  id: Uuid;
  organization_id: Uuid;
  kind: PolicyKind;
  title: string;
  body: string;
  active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface ServiceArea {
  id: Uuid;
  organization_id: Uuid;
  type: ServiceAreaType;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  center_postal_code: string | null;
  radius_miles: number | null;
  active: boolean;
  created_at: Timestamp;
}

export interface AiAgent {
  id: Uuid;
  organization_id: Uuid;
  display_name: string;
  voice: string;
  language: string;
  personality: string;
  speaking_pace: string;
  response_length: string;
  greeting: string;
  instructions: string | null;
  active: boolean;
  transfer_enabled: boolean;
  transfer_phone: string | null;
  sms_enabled: boolean;
  appointment_booking_enabled: boolean;
  photo_requests_enabled: boolean;
  disclosure_setting: string;
  fallback_phone: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface AiRule {
  id: Uuid;
  organization_id: Uuid;
  title: string;
  instruction: string;
  priority: number;
  enabled: boolean;
  is_system: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface KnowledgeDocument {
  id: Uuid;
  organization_id: Uuid;
  filename: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  processing_status: ProcessingStatus;
  processing_error: string | null;
  extracted_text: string | null;
  created_at: Timestamp;
}

export interface KnowledgeChunk {
  id: Uuid;
  organization_id: Uuid;
  document_id: Uuid;
  chunk_index: number;
  content: string;
  created_at: Timestamp;
}

export interface PhoneNumber {
  id: Uuid;
  organization_id: Uuid;
  twilio_sid: string | null;
  phone_number: string;
  friendly_name: string | null;
  capabilities: { voice: boolean; sms: boolean; mms: boolean };
  status: PhoneNumberStatus;
  forwarding_target: string | null;
  forwarding_mode: ForwardingMode;
  is_demo: boolean;
  created_at: Timestamp;
}

export interface CalendarConnection {
  id: Uuid;
  organization_id: Uuid;
  provider: string;
  external_account_id: string | null;
  account_email: string | null;
  selected_calendar_id: string | null;
  expires_at: Timestamp | null;
  active: boolean;
  last_error: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface AvailabilityRule {
  id: Uuid;
  organization_id: Uuid;
  weekday: number;
  start_time: string;
  end_time: string;
  active: boolean;
}

export interface AvailabilitySettings {
  organization_id: Uuid;
  appointment_duration: number;
  buffer_before: number;
  buffer_after: number;
  min_notice_minutes: number;
  max_horizon_days: number;
  blackout_dates: string[];
  updated_at: Timestamp;
}

export interface Lead {
  id: Uuid;
  organization_id: Uuid;
  call_id: Uuid | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  service_requested: string | null;
  description: string | null;
  urgency: Urgency;
  lead_score: LeadScore;
  score_reasons: string[];
  status: LeadStatus;
  estimated_value: number | null;
  source: string;
  is_property_owner: boolean | null;
  in_service_area: boolean | null;
  notes: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface LeadPhoto {
  id: Uuid;
  organization_id: Uuid;
  lead_id: Uuid;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  uploaded_at: Timestamp;
}

export interface Call {
  id: Uuid;
  organization_id: Uuid;
  external_call_id: string | null;
  caller_phone: string | null;
  business_phone: string | null;
  direction: CallDirection;
  started_at: Timestamp;
  answered_at: Timestamp | null;
  ended_at: Timestamp | null;
  duration_seconds: number;
  billed_seconds: number;
  billable_minutes: number;
  result: CallResult;
  disposition: CallDisposition | null;
  transferred: boolean;
  transfer_succeeded: boolean | null;
  appointment_booked: boolean;
  lead_id: Uuid | null;
  summary: string | null;
  summary_json: CallSummary | null;
  call_tone: string | null;
  recording_enabled: boolean;
  error_message: string | null;
  is_demo: boolean;
  created_at: Timestamp;
}

export interface CallSummary {
  reason: string;
  customer_name: string | null;
  location: string | null;
  service: string | null;
  result: string;
  appointment: string | null;
  notes: string | null;
  follow_up_required: boolean;
}

export interface CallTranscriptMessage {
  id: Uuid;
  call_id: Uuid;
  organization_id: Uuid;
  role: 'assistant' | 'user' | 'system' | 'tool';
  text: string;
  timestamp: Timestamp;
  sequence: number;
}

export interface Appointment {
  id: Uuid;
  organization_id: Uuid;
  lead_id: Uuid | null;
  call_id: Uuid | null;
  external_calendar_event_id: string | null;
  calendar_provider: string | null;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  service: string | null;
  address: string | null;
  start_at: Timestamp;
  end_at: Timestamp;
  status: AppointmentStatus;
  notes: string | null;
  source: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface SmsMessage {
  id: Uuid;
  organization_id: Uuid;
  lead_id: Uuid | null;
  call_id: Uuid | null;
  direction: SmsDirection;
  from_number: string;
  to_number: string;
  body: string;
  provider_message_sid: string | null;
  status: SmsStatus;
  error_message: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface UsageLedgerEntry {
  id: Uuid;
  organization_id: Uuid;
  call_id: Uuid | null;
  billing_period: string;
  voice_seconds: number;
  billable_minutes: number;
  sms_count: number;
  ai_usage_metadata: Record<string, unknown>;
  reported_to_stripe: boolean;
  created_at: Timestamp;
}

export interface Subscription {
  id: Uuid;
  organization_id: Uuid;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: string;
  status: SubscriptionStatus;
  billing_period_start: Timestamp | null;
  billing_period_end: Timestamp | null;
  included_minutes: number;
  used_minutes: number;
  cancel_at_period_end: boolean;
  founder: boolean;
  founder_slot: number | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface FounderClaim {
  id: Uuid;
  user_id: Uuid | null;
  organization_id: Uuid;
  slot_number: number;
  status: FounderClaimStatus;
  reserved_at: Timestamp;
  expires_at: Timestamp | null;
  activated_at: Timestamp | null;
}

export interface WebhookEvent {
  id: Uuid;
  provider: WebhookProvider;
  provider_event_id: string;
  event_type: string;
  status: WebhookStatus;
  error_message: string | null;
  payload_digest: string | null;
  received_at: Timestamp;
  processed_at: Timestamp | null;
}

export interface AuditLog {
  id: Uuid;
  organization_id: Uuid | null;
  actor_user_id: Uuid | null;
  actor_email: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  created_at: Timestamp;
}

export interface Notification {
  id: Uuid;
  organization_id: Uuid;
  kind: NotificationKind;
  title: string;
  body: string | null;
  link: string | null;
  read_at: Timestamp | null;
  created_at: Timestamp;
}

export interface UploadToken {
  id: Uuid;
  organization_id: Uuid;
  lead_id: Uuid;
  token_hash: string;
  expires_at: Timestamp;
  max_files: number;
  used_count: number;
  revoked: boolean;
  created_at: Timestamp;
}

export interface TeamInvite {
  id: Uuid;
  organization_id: Uuid;
  email: string;
  role: MemberRole;
  token_hash: string;
  invited_by: Uuid | null;
  expires_at: Timestamp;
  accepted_at: Timestamp | null;
  created_at: Timestamp;
}

/** Everything the realtime agent needs, resolved once at call start. */
export interface OrgCallContext {
  organization: Pick<Organization, 'id' | 'name' | 'timezone' | 'status' | 'ai_paused'>;
  business: BusinessProfile | null;
  agent: AiAgent;
  services: Service[];
  faqs: Faq[];
  policies: BusinessPolicy[];
  serviceAreas: ServiceArea[];
  rules: AiRule[];
  subscription: Pick<Subscription, 'plan' | 'status' | 'included_minutes' | 'used_minutes'> | null;
  calendarConnected: boolean;
  knowledgeDocumentCount: number;
}
