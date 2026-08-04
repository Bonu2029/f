/* ============================================================================
 * SERVICES
 * ----------------------------------------------------------------------------
 * ⚠️  PRICING IS NOT PUBLISHED BY DEFAULT.
 *
 *     The `priceFrom` figures below are indicative placeholders, not the
 *     salon's real menu. Until they are confirmed, the site shows
 *     "Pricing shared at consultation" instead of a number — which is both
 *     truthful and how comparable studios present their menu.
 *
 *     Set NEXT_PUBLIC_PRICES_VERIFIED=true once the real numbers are in here
 *     and every service block will show its price.
 * ========================================================================== */

export const pricesAreVerified =
  process.env.NEXT_PUBLIC_PRICES_VERIFIED === "true";

export type Service = {
  id: string;
  index: string;
  name: string;
  kicker: string;
  blurb: string;
  detail: string[];
  duration: string;
  priceFrom: number;
  image: string;
  /** Drives the organic frame + accent so no two blocks look alike. */
  frame: "petal" | "leaf" | "arch" | "pebble" | "soft";
  accent: "champagne" | "rose" | "sage" | "lavender" | "taupe";
};

export const services: Service[] = [
  {
    id: "hair-color",
    index: "01",
    name: "Hair Colour",
    kicker: "Bespoke tone",
    blurb:
      "Colour built around your skin, your lifestyle and how much upkeep you actually want.",
    detail: [
      "Full colour, root retouch, gloss and toning",
      "Colour correction by consultation",
      "Formulated fresh at the colour bar",
    ],
    duration: "2–3 hrs",
    priceFrom: 95,
    image: "service-color",
    frame: "arch",
    accent: "champagne",
  },
  {
    id: "balayage",
    index: "02",
    name: "Balayage",
    kicker: "Hand painted",
    blurb:
      "Freehand lightening that grows out softly — dimension where the light naturally falls.",
    detail: [
      "Full and partial balayage",
      "Root melt and toner included",
      "Designed to stretch four to six months",
    ],
    duration: "3–4 hrs",
    priceFrom: 185,
    image: "service-balayage",
    frame: "petal",
    accent: "rose",
  },
  {
    id: "extensions",
    index: "03",
    name: "Hair Extensions",
    kicker: "Length & body",
    blurb:
      "Hand-tied wefts matched to your base and cut in, so the join disappears completely.",
    detail: [
      "Hand-tied and tape-in methods",
      "Colour matched before application",
      "Move-up and maintenance appointments",
    ],
    duration: "3–5 hrs",
    priceFrom: 350,
    image: "service-extensions",
    frame: "leaf",
    accent: "taupe",
  },
  {
    id: "haircuts",
    index: "04",
    name: "Haircuts",
    kicker: "Shape first",
    blurb:
      "A cut drawn from how your hair actually moves — not from a photograph of someone else's.",
    detail: [
      "Consultation, cut and finish",
      "Dry cutting for curls and texture",
      "Fringe trims between visits",
    ],
    duration: "45–75 min",
    priceFrom: 55,
    image: "service-haircut",
    frame: "pebble",
    accent: "sage",
  },
  {
    id: "blowouts",
    index: "05",
    name: "Blowouts",
    kicker: "Finished",
    blurb:
      "Body, shine and movement that holds — the finish that makes everything else look considered.",
    detail: [
      "Smooth, wave or full volume",
      "Event and occasion styling",
      "Add a treatment for extra gloss",
    ],
    duration: "45–60 min",
    priceFrom: 45,
    image: "service-blowout",
    frame: "arch",
    accent: "champagne",
  },
  {
    id: "nails",
    index: "06",
    name: "Nail Services",
    kicker: "Quiet luxury",
    blurb:
      "Careful shaping and a finish that stays clean for weeks, in colours that never shout.",
    detail: [
      "Manicure and pedicure",
      "Gel application and removal",
      "Nail art on request",
    ],
    duration: "45–90 min",
    priceFrom: 40,
    image: "service-nails",
    frame: "soft",
    accent: "lavender",
  },
  {
    id: "beauty",
    index: "07",
    name: "Beauty Treatments",
    kicker: "The whole hour",
    blurb:
      "Time set aside for you alone — treatments that leave skin calm and rested, never worked on.",
    detail: [
      "Facial and skin treatments",
      "Waxing and brow shaping",
      "Bridal and event preparation",
    ],
    duration: "30–90 min",
    priceFrom: 35,
    image: "service-beauty",
    frame: "petal",
    accent: "sage",
  },
];

export const ACCENT_HEX: Record<Service["accent"], string> = {
  champagne: "#EFE0CB",
  rose: "#E6C6BD",
  sage: "#B3C3AA",
  lavender: "#D2CCDD",
  taupe: "#D9D0C4",
};

/** Short labels for the hero's floating cards. */
export const heroChips = [
  { label: "Hair", href: "#services" },
  { label: "Nails", href: "#services" },
  { label: "Extensions", href: "#services" },
  { label: "Colour", href: "#services" },
] as const;
