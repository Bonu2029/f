import type { Business, Cents, PlatformSettings } from "./types";

/**
 * Every money calculation in NOW funnels through this module. Commission is
 * never inlined at a call site — it is read from platform settings, with an
 * optional per-business override and a reduced Pro rate.
 */

export function formatCents(cents: Cents, opts?: { showCents?: boolean }): string {
  const showCents = opts?.showCents ?? cents % 100 !== 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  }).format(cents / 100);
}

export function formatCompactCents(cents: Cents): string {
  if (cents >= 1_000_00) {
    return `$${(cents / 100_000).toFixed(cents >= 10_000_00 ? 0 : 1)}k`;
  }
  return formatCents(cents, { showCents: false });
}

/** Resolve the commission rate that applies to one business, in basis points. */
export function commissionBpsFor(
  business: Pick<Business, "commission_bps_override" | "subscription_tier">,
  settings: PlatformSettings,
): number {
  if (business.commission_bps_override != null) return business.commission_bps_override;
  if (business.subscription_tier === "pro") return settings.pro_commission_bps;
  return settings.commission_bps;
}

export interface PriceBreakdown {
  subtotal_cents: Cents;
  service_fee_cents: Cents;
  total_cents: Cents;
  commission_bps: number;
  commission_cents: Cents;
  payout_cents: Cents;
}

/**
 * Split a booking into what the customer pays, what NOW keeps, and what the
 * business is paid out.
 *
 * - The customer pays `subtotal + service fee`.
 * - NOW keeps the service fee plus a commission taken from the subtotal.
 * - The business receives the remainder of the subtotal.
 */
export function priceBooking(
  subtotalCents: Cents,
  business: Pick<Business, "commission_bps_override" | "subscription_tier">,
  settings: PlatformSettings,
): PriceBreakdown {
  const serviceFee =
    settings.customer_service_fee_cents +
    Math.round((subtotalCents * settings.customer_service_fee_bps) / 10_000);
  const commissionBps = commissionBpsFor(business, settings);
  const commission = Math.round((subtotalCents * commissionBps) / 10_000);

  return {
    subtotal_cents: subtotalCents,
    service_fee_cents: serviceFee,
    total_cents: subtotalCents + serviceFee,
    commission_bps: commissionBps,
    commission_cents: commission,
    payout_cents: subtotalCents - commission,
  };
}

/** Percent off, rounded to the nearest whole number. 0 when there's no deal. */
export function discountPct(listCents: Cents, offerCents: Cents | null): number {
  if (offerCents == null || offerCents >= listCents || listCents <= 0) return 0;
  return Math.round(((listCents - offerCents) / listCents) * 100);
}

/** Apply a percentage discount, rounded to a clean dollar amount. */
export function applyDiscount(listCents: Cents, pct: number): Cents {
  if (pct <= 0) return listCents;
  // Round *down* to a whole dollar: the customer never sees a smaller
  // percentage than the one the business chose.
  const raw = listCents * (1 - pct / 100);
  return Math.max(100, Math.floor(raw / 100) * 100);
}

export function bpsToPct(bps: number): string {
  const pct = bps / 100;
  return Number.isInteger(pct) ? `${pct}%` : `${pct.toFixed(2)}%`;
}
