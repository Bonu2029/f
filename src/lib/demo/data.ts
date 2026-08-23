/**
 * Demo content.
 *
 * Used only when Supabase is not configured, so the dashboard and a sample tag
 * page can be reviewed before any account exists. Every screen that renders
 * this data shows a "Demo data" banner. Nothing here is presented as a real
 * customer, statistic or result.
 */

import type {
  Business,
  Customer,
  ServiceRequest,
  Subscription,
  TagEvent,
  TagWithInstallation,
} from "@/lib/supabase/types";

export const DEMO_BUSINESS_ID = "00000000-0000-0000-0000-0000000000b1";

export const demoBusiness: Business = {
  id: DEMO_BUSINESS_ID,
  name: "ABC Plumbing",
  business_type: "Plumbing",
  phone: "(555) 010-4477",
  email: "office@abcplumbing.example",
  website: "https://abcplumbing.example",
  logo_url: null,
  booking_url: null,
  about: "Residential plumbing, water heaters and repiping.",
  created_at: "2026-06-01T09:00:00.000Z",
};

export const demoSubscription: Subscription = {
  id: "00000000-0000-0000-0000-0000000000s1",
  business_id: DEMO_BUSINESS_ID,
  plan_id: "business",
  status: "trialing",
  tag_limit: 150,
  stripe_customer_id: null,
  stripe_subscription_id: null,
  current_period_end: null,
  cancel_at_period_end: false,
};

export const demoCustomers: Customer[] = [
  {
    id: "c1",
    business_id: DEMO_BUSINESS_ID,
    name: "Dana Whitfield",
    phone: "(555) 010-2288",
    email: "dana@example.com",
    address: "412 Ridgeline Dr",
    notes: null,
    created_at: "2026-08-02T15:12:00.000Z",
  },
  {
    id: "c2",
    business_id: DEMO_BUSINESS_ID,
    name: "Marcus Bell",
    phone: "(555) 010-9931",
    email: null,
    address: "78 Harbor St",
    notes: null,
    created_at: "2026-07-19T18:40:00.000Z",
  },
  {
    id: "c3",
    business_id: DEMO_BUSINESS_ID,
    name: "Priya Raman",
    phone: "(555) 010-5510",
    email: "priya@example.com",
    address: "1290 Alder Way",
    notes: null,
    created_at: "2026-07-04T13:05:00.000Z",
  },
];

function tag(
  code: string,
  status: TagWithInstallation["status"],
  product: string | null,
  customerIndex: number | null,
  installedOn: string | null,
  lastTap: string | null,
  taps: number,
  warranty: string | null = null,
): TagWithInstallation {
  const customer =
    customerIndex === null
      ? null
      : {
          id: demoCustomers[customerIndex].id,
          name: demoCustomers[customerIndex].name,
        };

  return {
    id: `tag-${code}`,
    business_id: DEMO_BUSINESS_ID,
    code,
    installation_id: product ? `inst-${code}` : null,
    status,
    activated_at: installedOn ? `${installedOn}T16:00:00.000Z` : null,
    last_tapped_at: lastTap,
    tap_count: taps,
    created_at: "2026-06-10T09:00:00.000Z",
    installations: product
      ? {
          id: `inst-${code}`,
          product_name: product,
          installed_on: installedOn as string,
          warranty_expires_on: warranty,
          customers: customer,
        }
      : null,
  };
}

export const demoTags: TagWithInstallation[] = [
  tag("AB72KD", "active", "Water Heater", 0, "2026-08-02", "2026-08-21T14:22:00.000Z", 4, "2032-08-02"),
  tag("QM19XR", "active", "Tankless Water Heater", 1, "2026-07-19", "2026-08-18T09:41:00.000Z", 2, "2036-07-19"),
  tag("TD40HV", "active", "Water Softener", 2, "2026-07-04", null, 0, "2031-07-04"),
  tag("KP83ZL", "unassigned", null, null, null, null, 0),
  tag("RN25WC", "unassigned", null, null, null, null, 0),
];

export const demoRequests: ServiceRequest[] = [
  {
    id: "r1",
    business_id: DEMO_BUSINESS_ID,
    tag_id: "tag-AB72KD",
    customer_id: "c1",
    kind: "service",
    status: "new",
    contact_name: "Dana Whitfield",
    contact_phone: "(555) 010-2288",
    message: "Water heater is making a knocking sound in the morning.",
    photo_url: null,
    created_at: "2026-08-21T14:24:00.000Z",
  },
  {
    id: "r2",
    business_id: DEMO_BUSINESS_ID,
    tag_id: "tag-QM19XR",
    customer_id: "c2",
    kind: "appointment",
    status: "scheduled",
    contact_name: "Marcus Bell",
    contact_phone: "(555) 010-9931",
    message: "Would like the annual flush booked for next week.",
    photo_url: null,
    created_at: "2026-08-18T09:44:00.000Z",
  },
];

export const demoEvents: (TagEvent & { code: string })[] = [
  {
    id: "e1",
    tag_id: "tag-AB72KD",
    business_id: DEMO_BUSINESS_ID,
    kind: "nfc_tap",
    created_at: "2026-08-21T14:22:00.000Z",
    code: "AB72KD",
  },
  {
    id: "e2",
    tag_id: "tag-QM19XR",
    business_id: DEMO_BUSINESS_ID,
    kind: "nfc_tap",
    created_at: "2026-08-18T09:41:00.000Z",
    code: "QM19XR",
  },
  {
    id: "e3",
    tag_id: "tag-AB72KD",
    business_id: DEMO_BUSINESS_ID,
    kind: "qr_scan",
    created_at: "2026-08-11T11:02:00.000Z",
    code: "AB72KD",
  },
];

/** The tag code used by the sample public page in demo mode. */
export const DEMO_TAG_CODE = "AB72KD";
