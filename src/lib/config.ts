import type { PlatformSettings } from "./types";

/**
 * Platform configuration.
 *
 * The marketplace commission lives here and *only* here. Every price
 * calculation goes through `src/lib/pricing.ts`, which reads these settings,
 * so changing the take rate is a one-line change (or, later, a row in
 * `platform_settings` edited from the admin console).
 */
export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  /** 12% marketplace fee on bookings acquired through NOW. */
  commission_bps: 1200,
  /** Flat customer-side service fee, $1.49. */
  customer_service_fee_cents: 149,
  /** Plus 4% of subtotal. */
  customer_service_fee_bps: 400,
  default_free_cancellation_hours: 4,
  /** Checkout hold window: 5 minutes. */
  slot_hold_seconds: 300,
  /** A slot starting within this window is treated as "last minute". */
  last_minute_window_hours: 8,
  default_search_radius_miles: 10,
  /** NOW Business Pro — $39/mo. */
  pro_subscription_price_cents: 3900,
  /** Pro accounts pay a reduced 9% commission. */
  pro_commission_bps: 900,
  supported_city_ids: [],
  updated_at: "2026-01-01T00:00:00.000Z",
};

export const BRAND = {
  name: "NOW",
  line: "Available when you need it.",
  prompt: "What do you need right now?",
  searchPlaceholder: "Search haircuts, nails, cleaning, detailing…",
  supportEmail: "support@booknow.demo",
} as const;

/** The launch market. Additional cities are data, not code. */
export const DEFAULT_CITY_SLUG = "philadelphia";

export const SEARCH_RADIUS_OPTIONS = [1, 3, 5, 10, 25] as const;

export const DISCOUNT_PRESETS = [0, 10, 15, 20] as const;

export const VISIBILITY_RADIUS_OPTIONS = [
  { value: 3, label: "3 miles" },
  { value: 5, label: "5 miles" },
  { value: 10, label: "10 miles" },
  { value: null, label: "Everyone" },
] as const;

/**
 * Integrations the architecture is designed around. `live: false` means the
 * UI says "Coming soon" — we never imply an integration works when it doesn't.
 */
export const CALENDAR_INTEGRATIONS = [
  { id: "google", name: "Google Calendar", blurb: "Two-way sync for staff calendars.", live: false },
  { id: "square", name: "Square Appointments", blurb: "Import services, staff and bookings.", live: false },
  { id: "fresha", name: "Fresha", blurb: "Sync availability and pricing.", live: false },
  { id: "vagaro", name: "Vagaro", blurb: "Mirror your existing calendar.", live: false },
  { id: "booksy", name: "Booksy", blurb: "Keep both calendars in step.", live: false },
  { id: "mindbody", name: "Mindbody", blurb: "Class and appointment sync.", live: false },
  { id: "calendly", name: "Calendly", blurb: "Publish unused meeting slots.", live: false },
  { id: "apple", name: "Apple Calendar", blurb: "Subscribe via secure .ics feed.", live: false },
] as const;

/** Feature flags — everything not yet real is explicitly off. */
export const FEATURES = {
  supabaseAuth: false,
  stripePayments: false,
  liveMap: false,
  voiceSearch: false,
  pushNotifications: false,
} as const;
