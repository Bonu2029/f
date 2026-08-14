/**
 * NOW — domain model.
 *
 * Field names are snake_case and mirror the SQL schema in
 * `src/lib/supabase/schema.sql` one-to-one, so swapping the local repository
 * for Supabase queries is a transport change, not a remodelling exercise.
 *
 * Money is stored in **cents** everywhere. Never store money as a float.
 * Times are stored as local wall-clock strings ("14:30") plus a `date`
 * ("2026-08-14") so a business's calendar is stable regardless of the viewer's
 * timezone; `timezone` on the business is the source of truth for conversion.
 */

export type UUID = string;
/** ISO-8601 timestamp, e.g. "2026-08-14T18:30:00.000Z" */
export type Timestamp = string;
/** Calendar date, "YYYY-MM-DD" */
export type DateOnly = string;
/** Wall-clock time, 24h, "HH:mm" */
export type TimeOnly = string;
/** Money in cents. $32.00 => 3200 */
export type Cents = number;

/* -------------------------------------------------------------------------- */
/* Accounts                                                                    */
/* -------------------------------------------------------------------------- */

export type AccountType = "customer" | "business" | "admin";

export interface User {
  id: UUID;
  email: string;
  phone: string | null;
  full_name: string;
  avatar_url: string | null;
  account_type: AccountType;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface CustomerProfile {
  user_id: UUID;
  default_location_id: UUID | null;
  /** Free-text location the customer typed, used when geolocation is denied. */
  location_label: string | null;
  lat: number | null;
  lng: number | null;
  search_radius_miles: number;
  notification_prefs: NotificationPreferences;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface NotificationPreferences {
  appointment_reminders: boolean;
  last_minute_deals: boolean;
  favorite_businesses: boolean;
  nearby_openings: boolean;
  promotional: boolean;
}

/** A member of a business account (owner / manager / staff login). */
export interface BusinessMember {
  id: UUID;
  business_id: UUID;
  user_id: UUID;
  role: "owner" | "manager" | "staff";
  created_at: Timestamp;
}

/* -------------------------------------------------------------------------- */
/* Places — architecture supports many countries/states/cities                 */
/* -------------------------------------------------------------------------- */

export interface City {
  id: UUID;
  slug: string;
  name: string;
  state_code: string;
  country_code: string;
  lat: number;
  lng: number;
  timezone: string;
  is_live: boolean;
  neighborhoods: string[];
}

/* -------------------------------------------------------------------------- */
/* Businesses                                                                  */
/* -------------------------------------------------------------------------- */

export type VerificationStatus =
  | "unverified"
  | "pending"
  | "verified"
  | "rejected";

export type BusinessStatus =
  | "draft"
  | "pending"
  | "active"
  | "suspended"
  | "rejected";

export interface Business {
  id: UUID;
  slug: string;
  name: string;
  tagline: string;
  about: string;
  primary_category_id: UUID;
  category_ids: UUID[];
  status: BusinessStatus;
  verification_status: VerificationStatus;
  /** Deterministic art seed for the local media placeholder system. */
  media_seed: string;
  gallery_seeds: string[];
  phone: string;
  email: string;
  website: string | null;
  address_line1: string;
  address_line2: string | null;
  city_id: UUID;
  neighborhood: string;
  postal_code: string;
  lat: number;
  lng: number;
  timezone: string;
  rating: number;
  review_count: number;
  price_level: 1 | 2 | 3;
  parking_note: string | null;
  cancellation_policy: CancellationPolicy;
  /** Marketplace commission override in basis points. Null = platform default. */
  commission_bps_override: number | null;
  instant_book: boolean;
  auto_fill_cancellations: boolean;
  subscription_tier: "free" | "pro";
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface CancellationPolicy {
  /** Hours before start that a customer may cancel free of charge. */
  free_cancellation_hours: number;
  /** Percent of service price charged for a late cancellation. 0–100. */
  late_cancellation_fee_pct: number;
  no_show_fee_pct: number;
}

export interface BusinessHours {
  id: UUID;
  business_id: UUID;
  /** 0 = Sunday … 6 = Saturday */
  day_of_week: number;
  opens_at: TimeOnly | null;
  closes_at: TimeOnly | null;
  is_closed: boolean;
}

export interface BusinessVerification {
  id: UUID;
  business_id: UUID;
  status: VerificationStatus;
  business_registration_submitted: boolean;
  phone_verified: boolean;
  email_verified: boolean;
  address_verified: boolean;
  identity_verified: boolean;
  payout_account_connected: boolean;
  reviewed_by: UUID | null;
  reviewed_at: Timestamp | null;
  notes: string | null;
  created_at: Timestamp;
}

/* -------------------------------------------------------------------------- */
/* Catalog                                                                     */
/* -------------------------------------------------------------------------- */

export interface ServiceCategory {
  id: UUID;
  slug: string;
  /** Singular label, e.g. "Haircut" */
  name: string;
  /** Plural label used for SEO pages, e.g. "Haircuts" */
  plural_name: string;
  /** Lucide icon name, resolved by `src/components/ui/category-icon.tsx`. */
  icon: string;
  /** Search synonyms powering keyword matching. */
  synonyms: string[];
  sort_order: number;
  is_active: boolean;
}

export interface Service {
  id: UUID;
  business_id: UUID;
  category_id: UUID;
  name: string;
  description: string;
  duration_minutes: number;
  buffer_minutes: number;
  price_cents: Cents;
  deposit_cents: Cents | null;
  media_seed: string;
  online_booking_enabled: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: Timestamp;
}

export interface Staff {
  id: UUID;
  business_id: UUID;
  user_id: UUID | null;
  full_name: string;
  role: string;
  bio: string;
  media_seed: string;
  rating: number;
  review_count: number;
  is_active: boolean;
  accepts_online_booking: boolean;
  created_at: Timestamp;
}

/** Join table: which staff member can perform which service. */
export interface StaffService {
  staff_id: UUID;
  service_id: UUID;
}

export interface StaffAvailability {
  id: UUID;
  staff_id: UUID;
  day_of_week: number;
  starts_at: TimeOnly;
  ends_at: TimeOnly;
  is_working: boolean;
}

/* -------------------------------------------------------------------------- */
/* Availability — the heart of the marketplace                                 */
/* -------------------------------------------------------------------------- */

export type SlotStatus =
  | "available"
  | "held"
  | "booked"
  | "expired"
  | "blocked";

export interface OpenSlot {
  id: UUID;
  business_id: UUID;
  staff_id: UUID;
  service_id: UUID;
  date: DateOnly;
  start_time: TimeOnly;
  end_time: TimeOnly;
  status: SlotStatus;
  original_price_cents: Cents;
  /** Set when the business publishes a discount to fill the slot. */
  offer_price_cents: Cents | null;
  is_last_minute: boolean;
  /** Miles. Null = visible to everyone. */
  visibility_radius_miles: number | null;
  /** Set while status === "held"; the hold lapses at this instant. */
  held_until: Timestamp | null;
  held_by: UUID | null;
  /** Demo-side engagement counters shown on the "Fill this slot" receipt. */
  view_count: number;
  nearby_reach: number;
  published_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

/* -------------------------------------------------------------------------- */
/* Bookings                                                                    */
/* -------------------------------------------------------------------------- */

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled_by_customer"
  | "cancelled_by_business"
  | "no_show"
  | "refunded"
  | "disputed";

export interface Appointment {
  id: UUID;
  /** Short human-facing code, e.g. "NOW-4KD2". */
  reference: string;
  business_id: UUID;
  customer_id: UUID;
  staff_id: UUID;
  slot_id: UUID | null;
  date: DateOnly;
  start_time: TimeOnly;
  end_time: TimeOnly;
  status: AppointmentStatus;
  /** True when the booking originated from a published NOW opening. */
  from_open_slot: boolean;
  is_last_minute_deal: boolean;
  subtotal_cents: Cents;
  service_fee_cents: Cents;
  total_cents: Cents;
  /** Snapshot of commission at booking time — rates change, history doesn't. */
  commission_bps: number;
  commission_cents: Cents;
  payout_cents: Cents;
  customer_note: string | null;
  business_note: string | null;
  cancellation_reason: string | null;
  cancelled_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

/** Line items — an appointment can carry more than one service. */
export interface AppointmentService {
  id: UUID;
  appointment_id: UUID;
  service_id: UUID;
  /** Price actually charged, after any last-minute discount. */
  price_cents: Cents;
  list_price_cents: Cents;
  duration_minutes: number;
}

/* -------------------------------------------------------------------------- */
/* Money                                                                       */
/* -------------------------------------------------------------------------- */

export type PaymentStatus =
  | "requires_payment_method"
  | "processing"
  | "succeeded"
  | "failed"
  | "refunded"
  | "partially_refunded";

export interface Payment {
  id: UUID;
  appointment_id: UUID;
  customer_id: UUID;
  business_id: UUID;
  amount_cents: Cents;
  platform_fee_cents: Cents;
  payout_cents: Cents;
  refunded_cents: Cents;
  status: PaymentStatus;
  /** Populated by the Stripe integration; null in the prototype. */
  stripe_payment_intent_id: string | null;
  payment_method_brand: string | null;
  payment_method_last4: string | null;
  created_at: Timestamp;
}

export interface PaymentMethod {
  id: UUID;
  customer_id: UUID;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
  wallet: "apple_pay" | "google_pay" | null;
}

export type PayoutStatus = "pending" | "in_transit" | "paid" | "failed";

export interface Payout {
  id: UUID;
  business_id: UUID;
  amount_cents: Cents;
  status: PayoutStatus;
  period_start: DateOnly;
  period_end: DateOnly;
  arrival_date: DateOnly;
  stripe_payout_id: string | null;
  created_at: Timestamp;
}

/* -------------------------------------------------------------------------- */
/* Social proof & relationships                                                */
/* -------------------------------------------------------------------------- */

export interface Review {
  id: UUID;
  /** Required — a review cannot exist without a completed appointment. */
  appointment_id: UUID;
  business_id: UUID;
  customer_id: UUID;
  staff_id: UUID | null;
  rating: 1 | 2 | 3 | 4 | 5;
  body: string;
  photo_seeds: string[];
  business_reply: string | null;
  business_replied_at: Timestamp | null;
  is_reported: boolean;
  report_reason: string | null;
  is_hidden: boolean;
  created_at: Timestamp;
}

export interface Favorite {
  id: UUID;
  customer_id: UUID;
  business_id: UUID;
  /** Notify me when this business publishes a same-day opening. */
  alert_on_opening: boolean;
  created_at: Timestamp;
}

/* -------------------------------------------------------------------------- */
/* Communication                                                               */
/* -------------------------------------------------------------------------- */

/** Threads are always scoped to a booking relationship — not a social network. */
export interface MessageThread {
  id: UUID;
  business_id: UUID;
  customer_id: UUID;
  appointment_id: UUID | null;
  last_message_at: Timestamp;
  unread_for_customer: number;
  unread_for_business: number;
  created_at: Timestamp;
}

export interface Message {
  id: UUID;
  thread_id: UUID;
  sender_role: "customer" | "business" | "system";
  sender_id: UUID | null;
  body: string;
  created_at: Timestamp;
}

export type NotificationKind =
  | "reminder"
  | "opening"
  | "deal"
  | "booking"
  | "review"
  | "message"
  | "payout"
  | "system";

export interface AppNotification {
  id: UUID;
  user_id: UUID;
  kind: NotificationKind;
  title: string;
  body: string;
  href: string | null;
  read_at: Timestamp | null;
  created_at: Timestamp;
}

/* -------------------------------------------------------------------------- */
/* Offers, safety, settings                                                    */
/* -------------------------------------------------------------------------- */

export interface PromoOffer {
  id: UUID;
  business_id: UUID;
  slot_id: UUID | null;
  service_id: UUID;
  headline: string;
  discount_pct: number;
  starts_at: Timestamp;
  ends_at: Timestamp;
  max_redemptions: number;
  redemptions: number;
  is_active: boolean;
  created_at: Timestamp;
}

export type DisputeStatus = "open" | "under_review" | "resolved" | "rejected";
export type DisputeKind =
  | "booking_dispute"
  | "refund_request"
  | "reported_business"
  | "reported_customer"
  | "reported_review";

export interface Dispute {
  id: UUID;
  kind: DisputeKind;
  appointment_id: UUID | null;
  business_id: UUID | null;
  customer_id: UUID | null;
  review_id: UUID | null;
  opened_by_role: "customer" | "business" | "admin";
  reason: string;
  detail: string;
  status: DisputeStatus;
  resolution_note: string | null;
  amount_in_question_cents: Cents | null;
  created_at: Timestamp;
  resolved_at: Timestamp | null;
}

export interface PlatformSettings {
  /** Marketplace commission in basis points. 1200 = 12%. */
  commission_bps: number;
  /** Flat customer-side service fee. */
  customer_service_fee_cents: Cents;
  /** Percentage service fee applied on top of the flat fee. */
  customer_service_fee_bps: number;
  default_free_cancellation_hours: number;
  slot_hold_seconds: number;
  last_minute_window_hours: number;
  default_search_radius_miles: number;
  pro_subscription_price_cents: Cents;
  pro_commission_bps: number;
  supported_city_ids: UUID[];
  updated_at: Timestamp;
}

/* -------------------------------------------------------------------------- */
/* Read models — shapes the UI actually renders                                */
/* -------------------------------------------------------------------------- */

/** A slot joined with everything a card needs to render, plus distance. */
export interface SlotView {
  slot: OpenSlot;
  business: Business;
  service: Service;
  staff: Staff;
  category: ServiceCategory;
  distance_miles: number;
  /** Price the customer pays for this slot, after any discount. */
  price_cents: Cents;
  discount_pct: number;
  /** Minutes from "now" until the slot starts. Negative = already started. */
  minutes_until: number;
}

/** A business joined with its live availability, ranked for search results. */
export interface BusinessView {
  business: Business;
  category: ServiceCategory;
  distance_miles: number;
  from_price_cents: Cents;
  next_slot: SlotView | null;
  /** De-duplicated by start time — one pill per bookable moment. */
  upcoming_slots: SlotView[];
  /** Total openings across the horizon, before de-duplication. */
  slot_count: number;
  best_deal: SlotView | null;
  open_until: TimeOnly | null;
  is_open_now: boolean;
  services: Service[];
}

export interface AppointmentView {
  appointment: Appointment;
  business: Business;
  staff: Staff;
  customer: User;
  services: { service: Service; line: AppointmentService }[];
  category: ServiceCategory;
  review: Review | null;
}
