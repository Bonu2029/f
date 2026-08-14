import type { Action } from "./actions";
import { byId, replace, type MarketplaceState } from "./state";
import type { Appointment, MessageThread, OpenSlot } from "../types";
import { priceBooking } from "../pricing";
import { addMinutes, timeToMinutes } from "../time";
import { stableId } from "../utils";

/**
 * The single pure reducer for the marketplace.
 *
 * It is deliberately defensive: an action that no longer makes sense (booking
 * a slot somebody else already took, cancelling a completed appointment) is a
 * no-op rather than a crash, because the same guard has to hold on a server
 * where two customers really can race for one slot.
 */
export function reducer(state: MarketplaceState, action: Action): MarketplaceState {
  switch (action.type) {
    case "tick": {
      if (action.now === state.now) return state;
      // Expire lapsed checkout holds so the slot returns to inventory.
      const slots = state.slots.map((s) => {
        if (s.status !== "held" || !s.held_until) return s;
        if (new Date(s.held_until).getTime() > action.now) return s;
        return { ...s, status: "available" as const, held_until: null, held_by: null };
      });
      return { ...state, now: action.now, slots };
    }

    /* ---- Availability --------------------------------------------------- */

    case "slot/hold": {
      const slot = byId(state.slots, action.slot_id);
      if (!slot) return state;
      if (slot.status !== "available" && slot.held_by !== action.customer_id) return state;
      return {
        ...state,
        slots: replace(state.slots, (s) => s.id === action.slot_id, (s) => ({
          ...s,
          status: "held",
          held_until: action.held_until,
          held_by: action.customer_id,
          updated_at: new Date(state.now).toISOString(),
        })),
      };
    }

    case "slot/release": {
      const slot = byId(state.slots, action.slot_id);
      if (!slot || slot.status !== "held") return state;
      return {
        ...state,
        slots: replace(state.slots, (s) => s.id === action.slot_id, (s) => ({
          ...s,
          status: "available",
          held_until: null,
          held_by: null,
        })),
      };
    }

    case "slot/publish": {
      if (byId(state.slots, action.slot.id)) return state;
      const slot: OpenSlot = {
        ...action.slot,
        created_at: action.slot.created_at ?? new Date(state.now).toISOString(),
        updated_at: new Date(state.now).toISOString(),
      };
      return { ...state, slots: [...state.slots, slot] };
    }

    case "slot/unpublish": {
      const slot = byId(state.slots, action.slot_id);
      if (!slot || slot.status === "booked") return state;
      return { ...state, slots: state.slots.filter((s) => s.id !== action.slot_id) };
    }

    case "slot/view":
      return {
        ...state,
        slots: replace(state.slots, (s) => s.id === action.slot_id, (s) => ({
          ...s,
          view_count: s.view_count + 1,
        })),
      };

    /* ---- Bookings ------------------------------------------------------- */

    case "appointment/book": {
      const slot = byId(state.slots, action.slot_id);
      if (!slot) return state;
      // Atomicity guard: the slot must still be ours to take.
      if (slot.status === "booked" || slot.status === "blocked" || slot.status === "expired") {
        return state;
      }
      if (slot.status === "held" && slot.held_by && slot.held_by !== action.customer_id) {
        return state;
      }
      const business = byId(state.businesses, slot.business_id);
      const service = byId(state.services, slot.service_id);
      if (!business || !service) return state;

      const price = slot.offer_price_cents ?? slot.original_price_cents;
      const money = priceBooking(price, business, state.settings);

      const appointment: Appointment = {
        id: action.appointment_id,
        reference: action.reference,
        business_id: slot.business_id,
        customer_id: action.customer_id,
        staff_id: slot.staff_id,
        slot_id: slot.id,
        date: slot.date,
        start_time: slot.start_time,
        end_time: slot.end_time,
        status: "confirmed",
        from_open_slot: true,
        is_last_minute_deal: slot.offer_price_cents != null,
        subtotal_cents: money.subtotal_cents,
        service_fee_cents: money.service_fee_cents,
        total_cents: money.total_cents,
        commission_bps: money.commission_bps,
        commission_cents: money.commission_cents,
        payout_cents: money.payout_cents,
        customer_note: action.customer_note,
        business_note: null,
        cancellation_reason: null,
        cancelled_at: null,
        created_at: action.created_at,
        updated_at: action.created_at,
      };

      const { threads, messages } = ensureThread(state, {
        thread_id: action.thread_id,
        business_id: slot.business_id,
        customer_id: action.customer_id,
        appointment_id: appointment.id,
        message_id: action.message_id,
        body: `Booking confirmed — ${service.name}, ${slot.date} at ${slot.start_time}.`,
        at: action.created_at,
        role: "system",
      });

      const owner = ownerUserId(state, slot.business_id);

      return {
        ...state,
        slots: replace(state.slots, (s) => s.id === slot.id, (s) => ({
          ...s,
          status: "booked",
          held_until: null,
          held_by: null,
          updated_at: action.created_at,
        })),
        appointments: [...state.appointments, appointment],
        appointmentServices: [
          ...state.appointmentServices,
          {
            id: action.appointment_service_id,
            appointment_id: appointment.id,
            service_id: service.id,
            price_cents: price,
            list_price_cents: slot.original_price_cents,
            duration_minutes: service.duration_minutes,
          },
        ],
        payments: [
          ...state.payments,
          {
            id: action.payment_id,
            appointment_id: appointment.id,
            customer_id: action.customer_id,
            business_id: slot.business_id,
            amount_cents: money.total_cents,
            platform_fee_cents: money.commission_cents + money.service_fee_cents,
            payout_cents: money.payout_cents,
            refunded_cents: 0,
            status: "succeeded",
            stripe_payment_intent_id: null,
            payment_method_brand: "Visa",
            payment_method_last4: "4242",
            created_at: action.created_at,
          },
        ],
        threads,
        messages,
        notifications: [
          {
            id: action.notification_ids[0],
            user_id: action.customer_id,
            kind: "booking",
            title: "You're booked",
            body: `${business.name} · ${service.name}`,
            href: `/bookings/${appointment.id}`,
            read_at: null,
            created_at: action.created_at,
          },
          ...(owner
            ? [
                {
                  id: action.notification_ids[1],
                  user_id: owner,
                  kind: "booking" as const,
                  title: `Your ${formatShort(slot.start_time)} opening was booked`,
                  body: `${service.name} · ${customerName(state, action.customer_id)}`,
                  href: "/dashboard/bookings",
                  read_at: null,
                  created_at: action.created_at,
                },
              ]
            : []),
          ...state.notifications,
        ],
      };
    }

    case "appointment/create": {
      const business = byId(state.businesses, action.business_id);
      const service = byId(state.services, action.service_id);
      if (!business || !service) return state;
      const money = priceBooking(service.price_cents, business, state.settings);
      const appointment: Appointment = {
        id: action.appointment_id,
        reference: action.reference,
        business_id: action.business_id,
        customer_id: action.customer_id,
        staff_id: action.staff_id,
        slot_id: null,
        date: action.date,
        start_time: action.start_time,
        end_time: addMinutes(action.start_time, service.duration_minutes),
        status: "confirmed",
        from_open_slot: false,
        is_last_minute_deal: false,
        subtotal_cents: money.subtotal_cents,
        service_fee_cents: money.service_fee_cents,
        total_cents: money.total_cents,
        commission_bps: money.commission_bps,
        commission_cents: money.commission_cents,
        payout_cents: money.payout_cents,
        customer_note: null,
        business_note: action.business_note,
        cancellation_reason: null,
        cancelled_at: null,
        created_at: action.created_at,
        updated_at: action.created_at,
      };
      return {
        ...state,
        appointments: [...state.appointments, appointment],
        appointmentServices: [
          ...state.appointmentServices,
          {
            id: action.appointment_service_id,
            appointment_id: appointment.id,
            service_id: service.id,
            price_cents: service.price_cents,
            list_price_cents: service.price_cents,
            duration_minutes: service.duration_minutes,
          },
        ],
      };
    }

    case "appointment/cancel": {
      const appt = byId(state.appointments, action.appointment_id);
      if (!appt) return state;
      if (appt.status !== "confirmed" && appt.status !== "pending") return state;

      const business = byId(state.businesses, appt.business_id);
      const service = serviceForAppointment(state, appt.id);

      let slots = appt.slot_id
        ? replace(state.slots, (s) => s.id === appt.slot_id, (s) => ({
            ...s,
            status: "available" as const,
            held_by: null,
            held_until: null,
          }))
        : state.slots;

      // A business cancellation frees real inventory — republish it.
      if (action.by === "business" && action.republish_slot_id && service && !appt.slot_id) {
        slots = [
          ...slots,
          {
            id: action.republish_slot_id,
            business_id: appt.business_id,
            staff_id: appt.staff_id,
            service_id: service.id,
            date: appt.date,
            start_time: appt.start_time,
            end_time: appt.end_time,
            status: "available",
            original_price_cents: service.price_cents,
            offer_price_cents: null,
            is_last_minute: true,
            visibility_radius_miles: null,
            held_until: null,
            held_by: null,
            view_count: 0,
            nearby_reach: 60,
            published_at: action.at,
            created_at: action.at,
            updated_at: action.at,
          },
        ];
      }

      const notifyUser =
        action.by === "customer" ? ownerUserId(state, appt.business_id) : appt.customer_id;

      return {
        ...state,
        slots,
        appointments: replace(state.appointments, (a) => a.id === appt.id, (a) => ({
          ...a,
          status: action.by === "customer" ? "cancelled_by_customer" : "cancelled_by_business",
          cancellation_reason: action.reason,
          cancelled_at: action.at,
          updated_at: action.at,
        })),
        payments: replace(state.payments, (p) => p.appointment_id === appt.id, (p) => ({
          ...p,
          status: "refunded",
          refunded_cents: p.amount_cents,
        })),
        notifications: notifyUser
          ? [
              {
                id: action.notification_id,
                user_id: notifyUser,
                kind: "booking",
                title:
                  action.by === "customer"
                    ? "A booking was cancelled"
                    : `${business?.name ?? "The business"} cancelled your appointment`,
                body:
                  action.by === "customer"
                    ? `${formatShort(appt.start_time)} · ${service?.name ?? "Appointment"}`
                    : "You've been refunded in full. Here are other nearby openings.",
                href: action.by === "customer" ? "/dashboard/bookings" : "/search",
                read_at: null,
                created_at: action.at,
              },
              ...state.notifications,
            ]
          : state.notifications,
      };
    }

    case "appointment/status": {
      const appt = byId(state.appointments, action.appointment_id);
      if (!appt) return state;
      return {
        ...state,
        appointments: replace(state.appointments, (a) => a.id === appt.id, (a) => ({
          ...a,
          status: action.status,
          updated_at: action.at,
        })),
      };
    }

    case "appointment/note":
      return {
        ...state,
        appointments: replace(
          state.appointments,
          (a) => a.id === action.appointment_id,
          (a) => ({ ...a, business_note: action.business_note }),
        ),
      };

    /* ---- Reviews -------------------------------------------------------- */

    case "review/create": {
      const appt = byId(state.appointments, action.appointment_id);
      if (!appt || appt.status !== "completed") return state;
      if (state.reviews.some((r) => r.appointment_id === appt.id)) return state;

      const business = byId(state.businesses, appt.business_id);
      if (!business) return state;

      const nextCount = business.review_count + 1;
      const nextRating =
        Math.round(((business.rating * business.review_count + action.rating) / nextCount) * 10) / 10;

      return {
        ...state,
        reviews: [
          {
            id: action.review_id,
            appointment_id: appt.id,
            business_id: appt.business_id,
            customer_id: appt.customer_id,
            staff_id: appt.staff_id,
            rating: action.rating,
            body: action.body,
            photo_seeds: action.photo_seeds,
            business_reply: null,
            business_replied_at: null,
            is_reported: false,
            report_reason: null,
            is_hidden: false,
            created_at: action.created_at,
          },
          ...state.reviews,
        ],
        businesses: replace(state.businesses, (b) => b.id === business.id, (b) => ({
          ...b,
          rating: nextRating,
          review_count: nextCount,
        })),
      };
    }

    case "review/reply":
      return {
        ...state,
        reviews: replace(state.reviews, (r) => r.id === action.review_id, (r) => ({
          ...r,
          business_reply: action.body,
          business_replied_at: action.at,
        })),
      };

    case "review/report":
      return {
        ...state,
        reviews: replace(state.reviews, (r) => r.id === action.review_id, (r) => ({
          ...r,
          is_reported: true,
          report_reason: action.reason,
        })),
      };

    case "review/hide":
      return {
        ...state,
        reviews: replace(state.reviews, (r) => r.id === action.review_id, (r) => ({
          ...r,
          is_hidden: action.hidden,
          is_reported: action.hidden ? r.is_reported : false,
        })),
      };

    /* ---- Favourites ----------------------------------------------------- */

    case "favorite/toggle": {
      const existing = state.favorites.find(
        (f) => f.customer_id === action.customer_id && f.business_id === action.business_id,
      );
      if (existing) {
        return { ...state, favorites: state.favorites.filter((f) => f.id !== existing.id) };
      }
      return {
        ...state,
        favorites: [
          {
            id: action.favorite_id,
            customer_id: action.customer_id,
            business_id: action.business_id,
            alert_on_opening: true,
            created_at: action.at,
          },
          ...state.favorites,
        ],
      };
    }

    case "favorite/alerts":
      return {
        ...state,
        favorites: replace(
          state.favorites,
          (f) => f.customer_id === action.customer_id && f.business_id === action.business_id,
          (f) => ({ ...f, alert_on_opening: action.enabled }),
        ),
      };

    /* ---- Messaging ------------------------------------------------------ */

    case "message/send": {
      const seed = action.thread_seed;
      const { threads, messages } = ensureThread(state, {
        thread_id: action.thread_id,
        business_id: seed?.business_id ?? byId(state.threads, action.thread_id)?.business_id ?? "",
        customer_id: seed?.customer_id ?? byId(state.threads, action.thread_id)?.customer_id ?? "",
        appointment_id: seed?.appointment_id ?? null,
        message_id: action.message_id,
        body: action.body,
        at: action.at,
        role: action.sender_role,
        sender_id: action.sender_id,
      });
      return { ...state, threads, messages };
    }

    case "message/read":
      return {
        ...state,
        threads: replace(state.threads, (t) => t.id === action.thread_id, (t) => ({
          ...t,
          unread_for_customer: action.role === "customer" ? 0 : t.unread_for_customer,
          unread_for_business: action.role === "business" ? 0 : t.unread_for_business,
        })),
      };

    /* ---- Notifications -------------------------------------------------- */

    case "notification/read":
      return {
        ...state,
        notifications: replace(
          state.notifications,
          (n) => n.id === action.notification_id && n.read_at == null,
          (n) => ({ ...n, read_at: action.at }),
        ),
      };

    case "notification/read-all":
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          n.user_id === action.user_id && n.read_at == null ? { ...n, read_at: action.at } : n,
        ),
      };

    case "notification/create":
      return { ...state, notifications: [action.notification, ...state.notifications] };

    /* ---- Business management -------------------------------------------- */

    case "service/upsert": {
      const exists = byId(state.services, action.service.id);
      return {
        ...state,
        services: exists
          ? replace(state.services, (s) => s.id === action.service.id, () => action.service)
          : [...state.services, action.service],
      };
    }

    case "service/delete":
      return {
        ...state,
        services: replace(state.services, (s) => s.id === action.service_id, (s) => ({
          ...s,
          is_active: false,
          online_booking_enabled: false,
        })),
        slots: state.slots.filter(
          (s) => s.service_id !== action.service_id || s.status === "booked",
        ),
      };

    case "staff/upsert": {
      const exists = byId(state.staff, action.staff.id);
      const others = state.staffServices.filter((ss) => ss.staff_id !== action.staff.id);
      return {
        ...state,
        staff: exists
          ? replace(state.staff, (s) => s.id === action.staff.id, () => action.staff)
          : [...state.staff, action.staff],
        staffServices: [
          ...others,
          ...action.service_ids.map((service_id) => ({ staff_id: action.staff.id, service_id })),
        ],
      };
    }

    case "staff/delete":
      return {
        ...state,
        staff: replace(state.staff, (s) => s.id === action.staff_id, (s) => ({
          ...s,
          is_active: false,
          accepts_online_booking: false,
        })),
        slots: state.slots.filter((s) => s.staff_id !== action.staff_id || s.status === "booked"),
      };

    case "business/update":
      return {
        ...state,
        businesses: replace(state.businesses, (b) => b.id === action.business_id, (b) => ({
          ...b,
          ...action.patch,
          updated_at: new Date(state.now).toISOString(),
        })),
      };

    case "business/hours":
      return {
        ...state,
        businessHours: replace(
          state.businessHours,
          (h) => h.business_id === action.business_id && h.day_of_week === action.day_of_week,
          (h) => ({
            ...h,
            opens_at: action.opens_at,
            closes_at: action.closes_at,
            is_closed: action.is_closed,
          }),
        ),
      };

    /* ---- Accounts ------------------------------------------------------- */

    case "profile/update":
      return {
        ...state,
        customerProfiles: replace(
          state.customerProfiles,
          (p) => p.user_id === action.user_id,
          (p) => ({ ...p, ...action.patch, updated_at: new Date(state.now).toISOString() }),
        ),
      };

    case "user/update":
      return {
        ...state,
        users: replace(state.users, (u) => u.id === action.user_id, (u) => ({
          ...u,
          ...action.patch,
          updated_at: new Date(state.now).toISOString(),
        })),
      };

    /* ---- Safety & admin -------------------------------------------------- */

    case "dispute/create":
      return {
        ...state,
        disputes: [
          {
            id: action.dispute_id,
            kind: action.kind,
            appointment_id: action.appointment_id,
            business_id: action.business_id,
            customer_id: action.customer_id,
            review_id: action.review_id,
            opened_by_role: action.opened_by_role,
            reason: action.reason,
            detail: action.detail,
            status: "open",
            resolution_note: null,
            amount_in_question_cents: action.appointment_id
              ? (byId(state.appointments, action.appointment_id)?.total_cents ?? null)
              : null,
            created_at: action.at,
            resolved_at: null,
          },
          ...state.disputes,
        ],
        appointments: action.appointment_id
          ? replace(
              state.appointments,
              (a) => a.id === action.appointment_id && a.status === "completed",
              (a) => ({ ...a, status: "disputed" }),
            )
          : state.appointments,
      };

    case "dispute/resolve":
      return {
        ...state,
        disputes: replace(state.disputes, (d) => d.id === action.dispute_id, (d) => ({
          ...d,
          status: action.status,
          resolution_note: action.note,
          resolved_at: action.status === "resolved" || action.status === "rejected" ? action.at : null,
        })),
      };

    case "admin/settings":
      return { ...state, settings: { ...state.settings, ...action.patch, updated_at: action.at } };

    case "admin/business-status":
      return {
        ...state,
        businesses: replace(state.businesses, (b) => b.id === action.business_id, (b) => ({
          ...b,
          status: action.status,
        })),
      };

    case "admin/verification":
      return {
        ...state,
        businesses: replace(state.businesses, (b) => b.id === action.business_id, (b) => ({
          ...b,
          verification_status: action.status,
        })),
        verifications: replace(
          state.verifications,
          (v) => v.business_id === action.business_id,
          (v) => ({
            ...v,
            status: action.status,
            notes: action.note,
            reviewed_at: action.at,
          }),
        ),
      };

    case "admin/category-toggle":
      return {
        ...state,
        categories: replace(state.categories, (c) => c.id === action.category_id, (c) => ({
          ...c,
          is_active: action.is_active,
        })),
      };

    default:
      return state;
  }
}

/* -------------------------------------------------------------------------- */

interface ThreadInput {
  thread_id: string;
  business_id: string;
  customer_id: string;
  appointment_id: string | null;
  message_id: string;
  body: string;
  at: string;
  role: "customer" | "business" | "system";
  sender_id?: string | null;
}

/** Appends a message, creating the booking-scoped thread if needed. */
function ensureThread(state: MarketplaceState, input: ThreadInput) {
  const existing =
    byId(state.threads, input.thread_id) ??
    state.threads.find(
      (t) => t.business_id === input.business_id && t.customer_id === input.customer_id,
    );

  const thread: MessageThread = existing
    ? {
        ...existing,
        appointment_id: existing.appointment_id ?? input.appointment_id,
        last_message_at: input.at,
        unread_for_business:
          input.role === "customer" ? existing.unread_for_business + 1 : existing.unread_for_business,
        unread_for_customer:
          input.role === "business" ? existing.unread_for_customer + 1 : existing.unread_for_customer,
      }
    : {
        id: input.thread_id,
        business_id: input.business_id,
        customer_id: input.customer_id,
        appointment_id: input.appointment_id,
        last_message_at: input.at,
        unread_for_customer: input.role === "business" ? 1 : 0,
        unread_for_business: input.role === "customer" ? 1 : 0,
        created_at: input.at,
      };

  const threads = existing
    ? replace(state.threads, (t) => t.id === existing.id, () => thread)
    : [thread, ...state.threads];

  const messages = [
    ...state.messages,
    {
      id: input.message_id,
      thread_id: thread.id,
      sender_role: input.role,
      sender_id: input.sender_id ?? null,
      body: input.body,
      created_at: input.at,
    },
  ];

  return { threads, messages };
}

function ownerUserId(state: MarketplaceState, businessId: string): string | null {
  const member = state.businessMembers.find(
    (m) => m.business_id === businessId && m.role === "owner",
  );
  return member?.user_id ?? null;
}

function customerName(state: MarketplaceState, customerId: string): string {
  const user = byId(state.users, customerId);
  if (!user) return "A customer";
  const [first, last] = user.full_name.split(" ");
  return last ? `${first} ${last[0]}.` : first;
}

function serviceForAppointment(state: MarketplaceState, appointmentId: string) {
  const line = state.appointmentServices.find((l) => l.appointment_id === appointmentId);
  return line ? byId(state.services, line.service_id) : undefined;
}

function formatShort(time: string): string {
  const mins = timeToMinutes(time);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${`${m}`.padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

/** Namespaced id helper used by callers building actions. */
export { stableId };
