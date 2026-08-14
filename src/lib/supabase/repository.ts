import type {
  AppNotification,
  Appointment,
  Business,
  DateOnly,
  Dispute,
  Message,
  OpenSlot,
  Payout,
  Review,
  Service,
  Staff,
  UUID,
} from "../types";
import type { LatLng } from "../geo";

/**
 * The data contract between the UI and whatever is behind it.
 *
 * The prototype satisfies this with an in-memory store; production satisfies it
 * with Supabase (see `schema.sql` — each method below has a matching query or
 * RPC). Keeping it explicit is also what would make a public API practical
 * later: `searchAvailability`, `getServices`, `getSlots`, `bookSlot` and
 * `cancelAppointment` are exactly the operations an outside client would need.
 */
export interface MarketplaceRepository {
  /* ---- Discovery ------------------------------------------------------- */
  searchAvailability(params: {
    origin: LatLng;
    radiusMiles?: number;
    categorySlug?: string | null;
    from?: Date;
    to?: Date;
    maxPriceCents?: number | null;
    dealsOnly?: boolean;
    limit?: number;
  }): Promise<SlotSearchRow[]>;

  getBusinessBySlug(slug: string): Promise<BusinessDetail | null>;
  getServices(businessId: UUID): Promise<Service[]>;
  getStaff(businessId: UUID): Promise<Staff[]>;
  getSlots(businessId: UUID, from: DateOnly, to: DateOnly): Promise<OpenSlot[]>;

  /* ---- Booking --------------------------------------------------------- */
  /** Locks the slot row; rejects with `slot_already_booked` when it's gone. */
  holdSlot(slotId: UUID, customerId: UUID): Promise<OpenSlot>;
  releaseSlot(slotId: UUID): Promise<void>;
  bookSlot(slotId: UUID, customerId: UUID, note?: string | null): Promise<Appointment>;
  cancelAppointment(
    appointmentId: UUID,
    by: "customer" | "business",
    reason: string,
  ): Promise<Appointment>;
  listAppointments(params: {
    customerId?: UUID;
    businessId?: UUID;
    from?: DateOnly;
    to?: DateOnly;
  }): Promise<Appointment[]>;

  /* ---- Business management --------------------------------------------- */
  publishSlot(input: {
    businessId: UUID;
    staffId: UUID;
    serviceId: UUID;
    date: DateOnly;
    startTime: string;
    discountPct: number;
    visibilityRadiusMiles: number | null;
  }): Promise<OpenSlot>;
  unpublishSlot(slotId: UUID): Promise<void>;
  upsertService(service: Service): Promise<Service>;
  upsertStaff(staff: Staff, serviceIds: UUID[]): Promise<Staff>;
  updateBusiness(businessId: UUID, patch: Partial<Business>): Promise<Business>;
  listPayouts(businessId: UUID): Promise<Payout[]>;

  /* ---- Social ----------------------------------------------------------- */
  createReview(input: {
    appointmentId: UUID;
    rating: 1 | 2 | 3 | 4 | 5;
    body: string;
    photoUrls?: string[];
  }): Promise<Review>;
  replyToReview(reviewId: UUID, body: string): Promise<Review>;
  toggleFavorite(businessId: UUID, customerId: UUID): Promise<boolean>;

  /* ---- Communication ---------------------------------------------------- */
  sendMessage(input: {
    threadId?: UUID;
    businessId: UUID;
    customerId: UUID;
    appointmentId?: UUID | null;
    body: string;
    role: "customer" | "business";
  }): Promise<Message>;
  listNotifications(userId: UUID): Promise<AppNotification[]>;
  markNotificationRead(notificationId: UUID): Promise<void>;

  /* ---- Safety ----------------------------------------------------------- */
  createDispute(input: Omit<Dispute, "id" | "status" | "created_at" | "resolved_at">): Promise<Dispute>;
}

/** One row of `search_availability()`. */
export interface SlotSearchRow {
  slot_id: UUID;
  business_id: UUID;
  business_name: string;
  business_slug: string;
  service_id: UUID;
  service_name: string;
  staff_id: UUID;
  staff_name: string;
  date: DateOnly;
  start_time: string;
  price_cents: number;
  list_price_cents: number;
  rating: number;
  review_count: number;
  distance_miles: number;
}

export interface BusinessDetail {
  business: Business;
  services: Service[];
  staff: Staff[];
  reviews: Review[];
}

/**
 * Errors the booking path can raise. The UI maps each to a sentence a customer
 * can act on — never a raw database error.
 */
export const BOOKING_ERRORS = {
  slot_not_found: "That appointment is no longer available.",
  slot_already_booked: "That appointment was just booked. Here are the next closest times.",
  slot_held_by_other: "Someone else is checking out with this time right now.",
  slot_not_bookable: "That time isn't bookable any more.",
} as const;

export type BookingErrorCode = keyof typeof BOOKING_ERRORS;

export function bookingErrorMessage(code: string): string {
  return (
    BOOKING_ERRORS[code as BookingErrorCode] ??
    "We couldn't complete that booking. Please try another time."
  );
}
