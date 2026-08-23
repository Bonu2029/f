/** Shared display formatting. Dates are rendered without a time zone shift. */

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const monthYearFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const shortFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

/** "August 2, 2026" from a date-only or ISO string. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = toDate(value);
  return date ? dateFormatter.format(date) : "—";
}

/** "August 2026" — used for the installation date on customer tag pages. */
export function formatMonthYear(value: string | null | undefined): string {
  if (!value) return "—";
  const date = toDate(value);
  return date ? monthYearFormatter.format(date) : "—";
}

export function formatShortDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = toDate(value);
  return date ? shortFormatter.format(date) : "—";
}

/** "3 days ago" for activity feeds. */
export function formatRelative(value: string | null | undefined): string {
  if (!value) return "—";
  const date = toDate(value);
  if (!date) return "—";

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;

  const days = Math.round(hours / 24);
  if (days < 30) return `${days} ${days === 1 ? "day" : "days"} ago`;

  return shortFormatter.format(date);
}

/** True while a warranty date is still in the future. */
export function isWarrantyActive(value: string | null | undefined): boolean {
  if (!value) return false;
  const date = toDate(value);
  return date ? date.getTime() > Date.now() : false;
}

/** Digits-only version suitable for tel: and sms: links. */
export function toDialable(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/[^\d+]/g, "");
  return cleaned.length >= 7 ? cleaned : null;
}

function toDate(value: string): Date | null {
  // Date-only strings are treated as UTC so they never shift a day backwards.
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00Z` : value;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}
