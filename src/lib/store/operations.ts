"use client";

import { useCallback, useMemo } from "react";
import { useMarketplace } from "./provider";
import type {
  AppointmentStatus,
  Business,
  CustomerProfile,
  Dispute,
  DisputeKind,
  OpenSlot,
  PlatformSettings,
  Service,
  Staff,
} from "../types";
import { applyDiscount } from "../pricing";
import { addMinutes } from "../time";
import { newId } from "../utils";

/**
 * The write API.
 *
 * Components call these; they never dispatch raw actions. Each function does
 * the validation that a server would do (is the slot still free? has the
 * appointment actually been completed?) and returns a small result object so
 * the UI can show a real error instead of failing silently.
 *
 * Swapping in Supabase means changing the bodies here — the signatures are
 * already the shape of an API client.
 */

export interface OpResult {
  ok: boolean;
  reason?: string;
  id?: string;
}

const OK: OpResult = { ok: true };

function reference(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 4; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `NOW-${out}`;
}

export function useActions() {
  const { state, dispatch, session, location } = useMarketplace();

  const nowIso = useCallback(() => new Date(state?.now ?? Date.now()).toISOString(), [state?.now]);

  /* ---- Availability ----------------------------------------------------- */

  const holdSlot = useCallback(
    (slotId: string, customerId: string): OpResult & { heldUntil?: string } => {
      if (!state) return { ok: false, reason: "Still loading." };
      const slot = state.slots.find((s) => s.id === slotId);
      if (!slot) return { ok: false, reason: "That time is no longer listed." };
      if (slot.status === "booked") return { ok: false, reason: "That appointment was just booked." };
      if (slot.status === "held" && slot.held_by !== customerId) {
        return { ok: false, reason: "Someone else is checking out with this time right now." };
      }
      const heldUntil = new Date(
        Date.now() + state.settings.slot_hold_seconds * 1000,
      ).toISOString();
      dispatch({ type: "slot/hold", slot_id: slotId, customer_id: customerId, held_until: heldUntil });
      return { ok: true, heldUntil };
    },
    [state, dispatch],
  );

  const releaseSlot = useCallback(
    (slotId: string) => dispatch({ type: "slot/release", slot_id: slotId }),
    [dispatch],
  );

  const registerSlotView = useCallback(
    (slotId: string) => dispatch({ type: "slot/view", slot_id: slotId }),
    [dispatch],
  );

  /** "Fill this slot" — publish an empty calendar gap to the marketplace. */
  const publishSlot = useCallback(
    (input: {
      businessId: string;
      staffId: string;
      serviceId: string;
      date: string;
      startTime: string;
      discountPct: number;
      visibilityRadiusMiles: number | null;
      isLastMinute?: boolean;
    }): OpResult => {
      if (!state) return { ok: false, reason: "Still loading." };
      const service = state.services.find((s) => s.id === input.serviceId);
      if (!service) return { ok: false, reason: "Pick a service first." };

      const endTime = addMinutes(input.startTime, service.duration_minutes);
      const clash =
        state.appointments.some(
          (a) =>
            a.staff_id === input.staffId &&
            a.date === input.date &&
            a.status !== "cancelled_by_business" &&
            a.status !== "cancelled_by_customer" &&
            a.start_time < endTime &&
            a.end_time > input.startTime,
        ) ||
        state.slots.some(
          (s) =>
            s.staff_id === input.staffId &&
            s.date === input.date &&
            s.status !== "expired" &&
            s.start_time < endTime &&
            s.end_time > input.startTime,
        );
      if (clash) return { ok: false, reason: "That time overlaps something already on the calendar." };

      const id = newId();
      const slot: Omit<OpenSlot, "created_at" | "updated_at"> = {
        id,
        business_id: input.businessId,
        staff_id: input.staffId,
        service_id: input.serviceId,
        date: input.date,
        start_time: input.startTime,
        end_time: endTime,
        status: "available",
        original_price_cents: service.price_cents,
        offer_price_cents:
          input.discountPct > 0 ? applyDiscount(service.price_cents, input.discountPct) : null,
        is_last_minute: input.isLastMinute ?? true,
        visibility_radius_miles: input.visibilityRadiusMiles,
        held_until: null,
        held_by: null,
        view_count: 0,
        nearby_reach: estimateReach(input.visibilityRadiusMiles),
        published_at: nowIso(),
      };
      dispatch({ type: "slot/publish", slot });
      return { ok: true, id };
    },
    [state, dispatch, nowIso],
  );

  /** Blocking time reserves the calendar without listing it publicly. */
  const blockTime = useCallback(
    (input: {
      businessId: string;
      staffId: string;
      serviceId: string;
      date: string;
      startTime: string;
      durationMinutes: number;
    }): OpResult => {
      const id = newId();
      dispatch({
        type: "slot/publish",
        slot: {
          id,
          business_id: input.businessId,
          staff_id: input.staffId,
          service_id: input.serviceId,
          date: input.date,
          start_time: input.startTime,
          end_time: addMinutes(input.startTime, input.durationMinutes),
          status: "blocked",
          original_price_cents: 0,
          offer_price_cents: null,
          is_last_minute: false,
          visibility_radius_miles: null,
          held_until: null,
          held_by: null,
          view_count: 0,
          nearby_reach: 0,
          published_at: null,
        },
      });
      return { ok: true, id };
    },
    [dispatch],
  );

  const unpublishSlot = useCallback(
    (slotId: string) => dispatch({ type: "slot/unpublish", slot_id: slotId }),
    [dispatch],
  );

  /* ---- Bookings --------------------------------------------------------- */

  const bookSlot = useCallback(
    (slotId: string, opts?: { customerId?: string; note?: string | null }): OpResult => {
      if (!state) return { ok: false, reason: "Still loading." };
      const customerId = opts?.customerId ?? session.userId;
      if (!customerId) return { ok: false, reason: "Sign in to finish booking." };

      const slot = state.slots.find((s) => s.id === slotId);
      if (!slot) return { ok: false, reason: "That appointment is no longer available." };
      if (slot.status === "booked") {
        return { ok: false, reason: "That appointment was just booked." };
      }
      if (slot.status === "held" && slot.held_by && slot.held_by !== customerId) {
        return { ok: false, reason: "That time is being checked out by someone else." };
      }

      const appointmentId = newId();
      dispatch({
        type: "appointment/book",
        appointment_id: appointmentId,
        appointment_service_id: newId(),
        payment_id: newId(),
        notification_ids: [newId(), newId()],
        thread_id: newId(),
        message_id: newId(),
        reference: reference(),
        slot_id: slotId,
        customer_id: customerId,
        customer_note: opts?.note ?? null,
        created_at: new Date().toISOString(),
      });
      return { ok: true, id: appointmentId };
    },
    [state, dispatch, session.userId],
  );

  const createAppointment = useCallback(
    (input: {
      businessId: string;
      customerId: string;
      staffId: string;
      serviceId: string;
      date: string;
      startTime: string;
      note?: string | null;
    }): OpResult => {
      const id = newId();
      dispatch({
        type: "appointment/create",
        appointment_id: id,
        appointment_service_id: newId(),
        business_id: input.businessId,
        customer_id: input.customerId,
        staff_id: input.staffId,
        service_id: input.serviceId,
        date: input.date,
        start_time: input.startTime,
        reference: reference(),
        created_at: new Date().toISOString(),
        business_note: input.note ?? null,
      });
      return { ok: true, id };
    },
    [dispatch],
  );

  const cancelAppointment = useCallback(
    (appointmentId: string, by: "customer" | "business", reason: string): OpResult => {
      if (!state) return { ok: false, reason: "Still loading." };
      const appt = state.appointments.find((a) => a.id === appointmentId);
      if (!appt) return { ok: false, reason: "We couldn't find that booking." };
      if (appt.status !== "confirmed" && appt.status !== "pending") {
        return { ok: false, reason: "That booking can no longer be cancelled." };
      }
      dispatch({
        type: "appointment/cancel",
        appointment_id: appointmentId,
        by,
        reason,
        at: new Date().toISOString(),
        notification_id: newId(),
        republish_slot_id: by === "business" ? newId() : null,
      });
      return OK;
    },
    [state, dispatch],
  );

  const setAppointmentStatus = useCallback(
    (appointmentId: string, status: AppointmentStatus) => {
      dispatch({
        type: "appointment/status",
        appointment_id: appointmentId,
        status,
        at: new Date().toISOString(),
      });
    },
    [dispatch],
  );

  const setAppointmentNote = useCallback(
    (appointmentId: string, note: string) =>
      dispatch({ type: "appointment/note", appointment_id: appointmentId, business_note: note }),
    [dispatch],
  );

  /* ---- Reviews ---------------------------------------------------------- */

  const addReview = useCallback(
    (input: {
      appointmentId: string;
      rating: 1 | 2 | 3 | 4 | 5;
      body: string;
      photoSeeds?: string[];
    }): OpResult => {
      if (!state) return { ok: false, reason: "Still loading." };
      const appt = state.appointments.find((a) => a.id === input.appointmentId);
      if (!appt) return { ok: false, reason: "We couldn't find that appointment." };
      // Reviews require a completed booking — that's what makes them verified.
      if (appt.status !== "completed") {
        return { ok: false, reason: "You can review an appointment once it's completed." };
      }
      if (state.reviews.some((r) => r.appointment_id === appt.id)) {
        return { ok: false, reason: "You've already reviewed this appointment." };
      }
      const id = newId();
      dispatch({
        type: "review/create",
        review_id: id,
        appointment_id: input.appointmentId,
        rating: input.rating,
        body: input.body,
        photo_seeds: input.photoSeeds ?? [],
        created_at: new Date().toISOString(),
      });
      return { ok: true, id };
    },
    [state, dispatch],
  );

  const replyToReview = useCallback(
    (reviewId: string, body: string) =>
      dispatch({ type: "review/reply", review_id: reviewId, body, at: new Date().toISOString() }),
    [dispatch],
  );

  const reportReview = useCallback(
    (reviewId: string, reason: string) => {
      dispatch({ type: "review/report", review_id: reviewId, reason });
      const review = state?.reviews.find((r) => r.id === reviewId);
      if (review) {
        dispatch({
          type: "dispute/create",
          dispute_id: newId(),
          kind: "reported_review",
          appointment_id: review.appointment_id,
          business_id: review.business_id,
          customer_id: review.customer_id,
          review_id: reviewId,
          opened_by_role: "business",
          reason: "Reported review",
          detail: reason,
          at: new Date().toISOString(),
        });
      }
    },
    [dispatch, state],
  );

  const setReviewHidden = useCallback(
    (reviewId: string, hidden: boolean) =>
      dispatch({ type: "review/hide", review_id: reviewId, hidden }),
    [dispatch],
  );

  /* ---- Relationships ---------------------------------------------------- */

  const toggleFavorite = useCallback(
    (businessId: string, customerId?: string): OpResult => {
      const cid = customerId ?? session.userId;
      if (!cid) return { ok: false, reason: "Sign in to save favourites." };
      dispatch({
        type: "favorite/toggle",
        favorite_id: newId(),
        customer_id: cid,
        business_id: businessId,
        at: new Date().toISOString(),
      });
      return OK;
    },
    [dispatch, session.userId],
  );

  const setFavoriteAlerts = useCallback(
    (businessId: string, enabled: boolean) => {
      if (!session.userId) return;
      dispatch({
        type: "favorite/alerts",
        business_id: businessId,
        customer_id: session.userId,
        enabled,
      });
    },
    [dispatch, session.userId],
  );

  /* ---- Messaging -------------------------------------------------------- */

  const sendMessage = useCallback(
    (input: {
      threadId?: string;
      businessId?: string;
      customerId?: string;
      appointmentId?: string | null;
      body: string;
      role: "customer" | "business";
    }): OpResult => {
      const body = input.body.trim();
      if (!body) return { ok: false, reason: "Write a message first." };
      const threadId = input.threadId ?? newId();
      dispatch({
        type: "message/send",
        message_id: newId(),
        thread_id: threadId,
        thread_seed:
          input.businessId && input.customerId
            ? {
                business_id: input.businessId,
                customer_id: input.customerId,
                appointment_id: input.appointmentId ?? null,
              }
            : null,
        sender_role: input.role,
        sender_id: session.userId,
        body,
        at: new Date().toISOString(),
      });
      return { ok: true, id: threadId };
    },
    [dispatch, session.userId],
  );

  const markThreadRead = useCallback(
    (threadId: string, role: "customer" | "business") =>
      dispatch({ type: "message/read", thread_id: threadId, role }),
    [dispatch],
  );

  /* ---- Notifications ---------------------------------------------------- */

  const markNotificationRead = useCallback(
    (id: string) =>
      dispatch({ type: "notification/read", notification_id: id, at: new Date().toISOString() }),
    [dispatch],
  );

  const markAllNotificationsRead = useCallback(
    (userId: string) =>
      dispatch({ type: "notification/read-all", user_id: userId, at: new Date().toISOString() }),
    [dispatch],
  );

  /* ---- Business management ---------------------------------------------- */

  const upsertService = useCallback(
    (service: Service) => dispatch({ type: "service/upsert", service }),
    [dispatch],
  );
  const deleteService = useCallback(
    (serviceId: string) => dispatch({ type: "service/delete", service_id: serviceId }),
    [dispatch],
  );
  const upsertStaff = useCallback(
    (staff: Staff, serviceIds: string[]) =>
      dispatch({ type: "staff/upsert", staff, service_ids: serviceIds }),
    [dispatch],
  );
  const deleteStaff = useCallback(
    (staffId: string) => dispatch({ type: "staff/delete", staff_id: staffId }),
    [dispatch],
  );
  const updateBusiness = useCallback(
    (businessId: string, patch: Partial<Business>) =>
      dispatch({ type: "business/update", business_id: businessId, patch }),
    [dispatch],
  );
  const setBusinessHours = useCallback(
    (
      businessId: string,
      day: number,
      opensAt: string | null,
      closesAt: string | null,
      isClosed: boolean,
    ) =>
      dispatch({
        type: "business/hours",
        business_id: businessId,
        day_of_week: day,
        opens_at: opensAt,
        closes_at: closesAt,
        is_closed: isClosed,
      }),
    [dispatch],
  );

  /* ---- Accounts --------------------------------------------------------- */

  const updateProfile = useCallback(
    (userId: string, patch: Partial<CustomerProfile>) =>
      dispatch({ type: "profile/update", user_id: userId, patch }),
    [dispatch],
  );
  const updateUser = useCallback(
    (userId: string, patch: { full_name?: string; email?: string; phone?: string }) =>
      dispatch({ type: "user/update", user_id: userId, patch }),
    [dispatch],
  );

  /* ---- Safety & admin --------------------------------------------------- */

  const createDispute = useCallback(
    (input: {
      kind: DisputeKind;
      appointmentId?: string | null;
      businessId?: string | null;
      customerId?: string | null;
      reviewId?: string | null;
      openedByRole: Dispute["opened_by_role"];
      reason: string;
      detail: string;
    }): OpResult => {
      const id = newId();
      dispatch({
        type: "dispute/create",
        dispute_id: id,
        kind: input.kind,
        appointment_id: input.appointmentId ?? null,
        business_id: input.businessId ?? null,
        customer_id: input.customerId ?? null,
        review_id: input.reviewId ?? null,
        opened_by_role: input.openedByRole,
        reason: input.reason,
        detail: input.detail,
        at: new Date().toISOString(),
      });
      return { ok: true, id };
    },
    [dispatch],
  );

  const resolveDispute = useCallback(
    (disputeId: string, status: Dispute["status"], note: string) =>
      dispatch({
        type: "dispute/resolve",
        dispute_id: disputeId,
        status,
        note,
        at: new Date().toISOString(),
      }),
    [dispatch],
  );

  const updateSettings = useCallback(
    (patch: Partial<PlatformSettings>) =>
      dispatch({ type: "admin/settings", patch, at: new Date().toISOString() }),
    [dispatch],
  );

  const setBusinessStatus = useCallback(
    (businessId: string, status: Business["status"]) =>
      dispatch({ type: "admin/business-status", business_id: businessId, status }),
    [dispatch],
  );

  const setVerification = useCallback(
    (businessId: string, status: Business["verification_status"], note: string | null) =>
      dispatch({
        type: "admin/verification",
        business_id: businessId,
        status,
        note,
        at: new Date().toISOString(),
      }),
    [dispatch],
  );

  const toggleCategory = useCallback(
    (categoryId: string, isActive: boolean) =>
      dispatch({ type: "admin/category-toggle", category_id: categoryId, is_active: isActive }),
    [dispatch],
  );

  return useMemo(
    () => ({
      location,
      holdSlot,
      releaseSlot,
      registerSlotView,
      publishSlot,
      blockTime,
      unpublishSlot,
      bookSlot,
      createAppointment,
      cancelAppointment,
      setAppointmentStatus,
      setAppointmentNote,
      addReview,
      replyToReview,
      reportReview,
      setReviewHidden,
      toggleFavorite,
      setFavoriteAlerts,
      sendMessage,
      markThreadRead,
      markNotificationRead,
      markAllNotificationsRead,
      upsertService,
      deleteService,
      upsertStaff,
      deleteStaff,
      updateBusiness,
      setBusinessHours,
      updateProfile,
      updateUser,
      createDispute,
      resolveDispute,
      updateSettings,
      setBusinessStatus,
      setVerification,
      toggleCategory,
    }),
    [
      location, holdSlot, releaseSlot, registerSlotView, publishSlot, blockTime, unpublishSlot,
      bookSlot, createAppointment, cancelAppointment, setAppointmentStatus, setAppointmentNote,
      addReview, replyToReview, reportReview, setReviewHidden, toggleFavorite, setFavoriteAlerts,
      sendMessage, markThreadRead, markNotificationRead, markAllNotificationsRead, upsertService,
      deleteService, upsertStaff, deleteStaff, updateBusiness, setBusinessHours, updateProfile,
      updateUser, createDispute, resolveDispute, updateSettings, setBusinessStatus, setVerification,
      toggleCategory,
    ],
  );
}

function estimateReach(radiusMiles: number | null): number {
  if (radiusMiles == null) return 420;
  return Math.round(18 * radiusMiles * radiusMiles + 25);
}
