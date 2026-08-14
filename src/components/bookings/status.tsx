import type { AppointmentStatus } from "@/lib/types";

type Tone = "neutral" | "brand" | "live" | "urgent" | "caution" | "outline" | "dark";

/**
 * One source of truth for how each booking status is worded and coloured, so
 * the customer app, the business calendar and the admin console never disagree
 * about what "no-show" looks like.
 */
export const STATUS_META: Record<AppointmentStatus, { label: string; tone: Tone; short: string }> = {
  pending: { label: "Pending", tone: "caution", short: "Pending" },
  confirmed: { label: "Confirmed", tone: "live", short: "Confirmed" },
  completed: { label: "Completed", tone: "neutral", short: "Done" },
  cancelled_by_customer: { label: "Cancelled by customer", tone: "urgent", short: "Cancelled" },
  cancelled_by_business: { label: "Cancelled by business", tone: "urgent", short: "Cancelled" },
  no_show: { label: "No-show", tone: "caution", short: "No-show" },
  refunded: { label: "Refunded", tone: "neutral", short: "Refunded" },
  disputed: { label: "Disputed", tone: "urgent", short: "Disputed" },
};

export const ACTIVE_STATUSES: AppointmentStatus[] = ["pending", "confirmed"];
