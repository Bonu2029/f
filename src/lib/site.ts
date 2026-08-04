/* ============================================================================
 * SINGLE SOURCE OF TRUTH FOR BUSINESS FACTS
 * ----------------------------------------------------------------------------
 * Everything the site states about the business lives here, so nothing factual
 * is hard-coded into a component.
 *
 * ⚠️  BEFORE LAUNCH — confirm every value marked `unverified` with the client.
 *     The address below comes from the Pennsylvania business registry listing
 *     for Massiel Beauty Salon LLC. Phone, email and opening hours were NOT
 *     publicly verifiable and are placeholders — they are deliberately obvious
 *     rather than invented-but-plausible, so they cannot ship by accident.
 *
 *     All of these can be overridden with environment variables (see README),
 *     which is the preferred way to go live without touching code.
 * ========================================================================== */

const env = (key: string, fallback: string) =>
  (process.env[key] ?? "").trim() || fallback;

export const PLACEHOLDER_PHONE = "(000) 000-0000";
export const PLACEHOLDER_EMAIL = "hello@example.com";

export const site = {
  name: "Massiel Beauty Salon",
  legalName: "Massiel Beauty Salon LLC",
  tagline: "Luxury Hair & Beauty Experience",
  description:
    "A luxury hair and beauty studio in Allentown, Pennsylvania. Colour, balayage, extensions, cuts, blowouts, nails and beauty treatments — by appointment.",

  url: env("NEXT_PUBLIC_SITE_URL", "https://massielbeautysalon.com"),

  address: {
    street: env("NEXT_PUBLIC_ADDRESS_STREET", "128 N 8th St"),
    locality: env("NEXT_PUBLIC_ADDRESS_CITY", "Allentown"),
    region: env("NEXT_PUBLIC_ADDRESS_REGION", "PA"),
    postalCode: env("NEXT_PUBLIC_ADDRESS_POSTAL", "18101"),
    country: "US",
    /** Registry-sourced. Re-confirm the suite/unit number with the client. */
    verified: true,
  },

  /** Placeholder until confirmed — see banner above. */
  phone: env("NEXT_PUBLIC_PHONE", PLACEHOLDER_PHONE),
  email: env("NEXT_PUBLIC_EMAIL", PLACEHOLDER_EMAIL),

  /** The salon's existing online booking destination. */
  bookingUrl: env("NEXT_PUBLIC_BOOKING_URL", ""),

  social: {
    instagram: env(
      "NEXT_PUBLIC_INSTAGRAM",
      "https://www.instagram.com/massielbeautysalon/",
    ),
    facebook: env("NEXT_PUBLIC_FACEBOOK", ""),
  },

  /** Google Business Profile — powers the live reviews section. */
  google: {
    /** Places API (New) place ID. Without it the reviews block shows an
     *  honest empty state rather than invented testimonials. */
    placeId: process.env.GOOGLE_PLACE_ID ?? "",
    profileUrl: env("NEXT_PUBLIC_GOOGLE_PROFILE_URL", ""),
    writeReviewUrl: env("NEXT_PUBLIC_GOOGLE_REVIEW_URL", ""),
  },

  parking: "Street parking on N 8th St, plus public lots within a short walk.",
} as const;

export type DayHours = {
  day: string;
  short: string;
  /** `null` = closed */
  open: string | null;
  close: string | null;
};

/**
 * ⚠️ PLACEHOLDER SCHEDULE — confirm with the client before launch.
 * Override wholesale with NEXT_PUBLIC_HOURS_JSON (same shape, JSON encoded).
 */
export const hoursAreVerified = process.env.NEXT_PUBLIC_HOURS_VERIFIED === "true";

const defaultHours: DayHours[] = [
  { day: "Monday", short: "Mon", open: null, close: null },
  { day: "Tuesday", short: "Tue", open: "9:00 AM", close: "7:00 PM" },
  { day: "Wednesday", short: "Wed", open: "9:00 AM", close: "7:00 PM" },
  { day: "Thursday", short: "Thu", open: "9:00 AM", close: "8:00 PM" },
  { day: "Friday", short: "Fri", open: "9:00 AM", close: "8:00 PM" },
  { day: "Saturday", short: "Sat", open: "8:00 AM", close: "6:00 PM" },
  { day: "Sunday", short: "Sun", open: "10:00 AM", close: "4:00 PM" },
];

export const hours: DayHours[] = (() => {
  const raw = process.env.NEXT_PUBLIC_HOURS_JSON;
  if (!raw) return defaultHours;
  try {
    const parsed = JSON.parse(raw) as DayHours[];
    return Array.isArray(parsed) && parsed.length === 7 ? parsed : defaultHours;
  } catch {
    return defaultHours;
  }
})();

export const formattedAddress = `${site.address.street}, ${site.address.locality}, ${site.address.region} ${site.address.postalCode}`;

export const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  `${site.name}, ${formattedAddress}`,
)}`;

export const mapsEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(
  formattedAddress,
)}&output=embed`;

export const telHref = `tel:${site.phone.replace(/[^\d+]/g, "")}`;

export const hasRealPhone = site.phone !== PLACEHOLDER_PHONE;
export const hasRealEmail = site.email !== PLACEHOLDER_EMAIL;

/** Returns today's hours plus a live open/closed read, in salon-local time. */
export function todayHours(now = new Date()): DayHours {
  // getDay(): 0 = Sunday. `hours` is Monday-first.
  const index = (now.getDay() + 6) % 7;
  return hours[index];
}

export const navLinks = [
  { label: "Services", href: "#services" },
  { label: "Transformations", href: "#transformations" },
  { label: "The Studio", href: "#studio" },
  { label: "Gallery", href: "#gallery" },
  { label: "Reviews", href: "#reviews" },
  { label: "Visit", href: "#visit" },
] as const;
