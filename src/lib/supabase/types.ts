/**
 * Application-level types for the database.
 *
 * These mirror supabase/migrations. Regenerate richer types with the Supabase
 * CLI if you prefer; the shapes below are what the app actually reads.
 */

export type TagStatus = "unassigned" | "active" | "inactive";
export type ServiceRequestStatus = "new" | "in_progress" | "scheduled" | "closed";
export type ServiceRequestKind = "service" | "appointment";
export type TagEventKind = "nfc_tap" | "qr_scan" | "direct";
export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "unpaid";

export type Business = {
  id: string;
  name: string;
  business_type: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  booking_url: string | null;
  about: string | null;
  created_at: string;
};

export type Profile = {
  id: string;
  business_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
};

export type Subscription = {
  id: string;
  business_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  tag_limit: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

export type Customer = {
  id: string;
  business_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
};

export type Installation = {
  id: string;
  business_id: string;
  customer_id: string | null;
  product_name: string;
  product_details: string | null;
  installed_on: string;
  warranty_expires_on: string | null;
  notes: string | null;
};

export type Tag = {
  id: string;
  business_id: string;
  code: string;
  installation_id: string | null;
  status: TagStatus;
  activated_at: string | null;
  last_tapped_at: string | null;
  tap_count: number;
  created_at: string;
};

export type ServiceRequest = {
  id: string;
  business_id: string;
  tag_id: string | null;
  customer_id: string | null;
  kind: ServiceRequestKind;
  status: ServiceRequestStatus;
  contact_name: string;
  contact_phone: string;
  message: string;
  photo_url: string | null;
  created_at: string;
};

export type TagEvent = {
  id: string;
  tag_id: string;
  business_id: string;
  kind: TagEventKind;
  created_at: string;
};

/** Exactly what a public tag page is allowed to render. */
export type PublicTagView = {
  code: string;
  business_name: string;
  business_phone: string | null;
  business_email: string | null;
  business_website: string | null;
  business_logo_url: string | null;
  business_about: string | null;
  booking_url: string | null;
  product_name: string | null;
  product_details: string | null;
  installed_on: string | null;
  warranty_expires_on: string | null;
};

/** A tag joined with its installation and customer, for the dashboard table. */
export type TagWithInstallation = Tag & {
  installations:
    | (Pick<
        Installation,
        "id" | "product_name" | "installed_on" | "warranty_expires_on"
      > & {
        customers: Pick<Customer, "id" | "name"> | null;
      })
    | null;
};
