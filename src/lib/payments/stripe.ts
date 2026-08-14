import type { Business, Cents, PlatformSettings, UUID } from "../types";
import { priceBooking } from "../pricing";

/**
 * Stripe integration seam.
 *
 * No payment is processed in the prototype and no card data is ever collected
 * by the checkout UI. This module defines the shapes the real integration
 * needs, so wiring it up is: install `stripe` + `@stripe/stripe-js`, implement
 * the two functions at the bottom on the server, and flip
 * `FEATURES.stripePayments`.
 *
 * Model: Stripe Connect (destination charges).
 *   * The customer pays the full total to the NOW platform account.
 *   * `application_fee_amount` is the NOW commission plus the customer service
 *     fee — computed here, never inline at a call site.
 *   * `transfer_data.destination` is the business's connected account.
 *   * Refunds reverse the transfer and the application fee together.
 */

export interface CheckoutIntent {
  appointment_id: UUID;
  customer_id: UUID;
  business_id: UUID;
  /** What the customer is charged, in cents. */
  amount_cents: Cents;
  currency: "usd";
  /** NOW's cut: marketplace commission + customer service fee. */
  application_fee_cents: Cents;
  /** Connected account that receives the remainder. */
  transfer_destination: string | null;
  /** Wallets to offer in the payment sheet. */
  payment_method_types: Array<"card" | "apple_pay" | "google_pay" | "link">;
  /** Reconciliation metadata — keep the booking reference on the charge. */
  metadata: Record<string, string>;
  capture_method: "automatic" | "manual";
}

/**
 * Build the Payment Intent parameters for a booking. Pure and testable: the
 * money split is derived from platform settings, not hard-coded.
 */
export function buildCheckoutIntent(input: {
  appointmentId: UUID;
  reference: string;
  customerId: UUID;
  business: Pick<Business, "id" | "name" | "commission_bps_override" | "subscription_tier">;
  connectedAccountId: string | null;
  subtotalCents: Cents;
  settings: PlatformSettings;
}): CheckoutIntent {
  const money = priceBooking(input.subtotalCents, input.business, input.settings);

  return {
    appointment_id: input.appointmentId,
    customer_id: input.customerId,
    business_id: input.business.id,
    amount_cents: money.total_cents,
    currency: "usd",
    application_fee_cents: money.commission_cents + money.service_fee_cents,
    transfer_destination: input.connectedAccountId,
    payment_method_types: ["card", "apple_pay", "google_pay", "link"],
    metadata: {
      booking_reference: input.reference,
      appointment_id: input.appointmentId,
      business_id: input.business.id,
      commission_bps: String(money.commission_bps),
    },
    // Charge immediately: the slot leaves inventory the moment it's booked, so
    // there is nothing to authorise-and-hold for.
    capture_method: "automatic",
  };
}

/** Refund policy for a cancellation, expressed in cents. */
export interface RefundPlan {
  refund_cents: Cents;
  /** Retained by the business under its late-cancellation policy. */
  business_retains_cents: Cents;
  /** NOW's fee is returned whenever the customer is made whole. */
  platform_fee_refunded_cents: Cents;
  reason: "requested_by_customer" | "cancelled_by_business" | "no_show";
}

export function planRefund(input: {
  totalCents: Cents;
  subtotalCents: Cents;
  serviceFeeCents: Cents;
  commissionCents: Cents;
  cancelledBy: "customer" | "business";
  minutesUntilStart: number;
  freeCancellationHours: number;
  lateCancellationFeePct: number;
}): RefundPlan {
  // A business-side cancellation always refunds in full.
  if (input.cancelledBy === "business") {
    return {
      refund_cents: input.totalCents,
      business_retains_cents: 0,
      platform_fee_refunded_cents: input.serviceFeeCents + input.commissionCents,
      reason: "cancelled_by_business",
    };
  }

  const insideFreeWindow = input.minutesUntilStart >= input.freeCancellationHours * 60;
  if (insideFreeWindow) {
    return {
      refund_cents: input.totalCents,
      business_retains_cents: 0,
      platform_fee_refunded_cents: input.serviceFeeCents + input.commissionCents,
      reason: "requested_by_customer",
    };
  }

  const retained = Math.round((input.subtotalCents * input.lateCancellationFeePct) / 100);
  return {
    refund_cents: Math.max(0, input.totalCents - retained),
    business_retains_cents: retained,
    platform_fee_refunded_cents: input.serviceFeeCents,
    reason: "requested_by_customer",
  };
}

/* -------------------------------------------------------------------------- */
/* Server-side surface — unimplemented on purpose                             */
/* -------------------------------------------------------------------------- */

/**
 * Creates the Payment Intent and returns its client secret.
 *
 * Must run on the server: the Stripe secret key never reaches the browser.
 * Implement as a route handler under `src/app/api/checkout/route.ts`.
 */
export async function createPaymentIntent(_intent: CheckoutIntent): Promise<never> {
  throw new Error(
    "Stripe is not connected. The prototype never processes a payment; " +
      "see src/lib/payments/stripe.ts for the intended integration.",
  );
}

/**
 * Webhook handler contract. Stripe is the source of truth for payment state:
 * `payment_intent.succeeded` confirms the appointment, `charge.refunded`
 * settles a cancellation, `payout.paid` closes out a payout period.
 */
export const STRIPE_WEBHOOK_EVENTS = [
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "charge.refunded",
  "charge.dispute.created",
  "account.updated",
  "payout.paid",
  "payout.failed",
] as const;
