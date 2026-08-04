/* ============================================================================
 * EDITORIAL CONTENT — gallery, transformations, studio story, specialists
 * ========================================================================== */

/* --- Gallery -------------------------------------------------------------- */

export type GalleryCategory = "all" | "colour" | "cuts" | "nails" | "studio";

export type GalleryItem = {
  image: string;
  caption: string;
  categories: Exclude<GalleryCategory, "all">[];
  /** Masonry weight — a few images carry the composition. */
  feature?: boolean;
};

export const galleryFilters: { id: GalleryCategory; label: string }[] = [
  { id: "all", label: "Everything" },
  { id: "colour", label: "Colour" },
  { id: "cuts", label: "Cuts & Styling" },
  { id: "nails", label: "Nails & Beauty" },
  { id: "studio", label: "The Studio" },
];

export const gallery: GalleryItem[] = [
  { image: "gallery-01", caption: "Champagne balayage, loose waves", categories: ["colour"], feature: true },
  { image: "gallery-02", caption: "Sheer rose nude", categories: ["nails"] },
  { image: "gallery-03", caption: "Sculpted blowout", categories: ["cuts"] },
  { image: "gallery-04", caption: "Copper tone, late light", categories: ["colour"] },
  { image: "gallery-05", caption: "The colour bar", categories: ["studio", "colour"] },
  { image: "gallery-06", caption: "Precision blunt cut", categories: ["cuts"], feature: true },
  { image: "gallery-07", caption: "Treatment room detail", categories: ["nails", "studio"] },
  { image: "gallery-08", caption: "Hand-tied extensions", categories: ["colour", "cuts"] },
  { image: "gallery-09", caption: "Soft updo, copper pin", categories: ["cuts"] },
  { image: "gallery-10", caption: "Window seat", categories: ["studio"], feature: true },
];

/* --- Transformations ------------------------------------------------------ */

/**
 * ⚠️  REPLACE WITH THE SALON'S OWN CLIENT PHOTOGRAPHY BEFORE LAUNCH.
 *     A before/after gallery is a claim about real work, so it has to show
 *     real work — photographed with the client's written consent. The slots
 *     below currently resolve to abstract placeholder art, never to an
 *     invented photograph of a person.
 */
export type Transformation = {
  id: string;
  title: string;
  service: string;
  note: string;
  before: string;
  after: string;
  feature?: boolean;
};

export const transformations: Transformation[] = [
  {
    id: "colour-correction",
    title: "Banded to seamless",
    service: "Colour correction & balayage",
    note: "Grown-out box colour lifted and rebuilt into a soft root melt.",
    before: "transform-1-before",
    after: "transform-1-after",
    feature: true,
  },
  {
    id: "extensions",
    title: "Fine to full",
    service: "Hand-tied extensions",
    note: "Length and body added, blended so the join reads as her own hair.",
    before: "transform-2-before",
    after: "transform-2-after",
  },
  {
    id: "shape",
    title: "Weight to movement",
    service: "Shape cut & gloss",
    note: "Heavy blunt length reshaped, finished with a clear gloss.",
    before: "transform-3-before",
    after: "transform-3-after",
  },
];

/* --- Studio story --------------------------------------------------------- */

export const studio = {
  eyebrow: "The Studio",
  headline: "Unhurried, and entirely yours.",
  lede: "Massiel Beauty Salon is a small studio in Allentown built around one idea — that the hour you spend in the chair should feel like the calmest part of your week.",
  paragraphs: [
    "Appointments are booked with room to breathe. Colour is mixed for your hair, not from a chart. Nothing is rushed to fit another chair in.",
    "You leave with something you can actually recreate at home — and a plan for keeping it that way.",
  ],
  values: [
    {
      title: "Consultation first",
      body: "Every appointment opens with a proper conversation about your hair, your routine and your upkeep.",
    },
    {
      title: "One guest at a time",
      body: "No double-booking. The chair, the room and the attention are yours for the whole appointment.",
    },
    {
      title: "Built to grow out",
      body: "Colour and cuts designed so month three still looks intentional, not neglected.",
    },
  ],
} as const;

/* --- Booking specialists -------------------------------------------------- */

/**
 * ⚠️  Team names are placeholders. Replace with the real team — or leave a
 *     single "First available" option, which is what ships by default.
 */
export const specialists = [
  {
    id: "any",
    name: "First available",
    role: "Whoever opens up soonest",
    focus: "All services",
  },
  {
    id: "senior-stylist",
    name: "Senior Stylist",
    role: "Colour & balayage",
    focus: "Colour, balayage, correction",
  },
  {
    id: "stylist",
    name: "Stylist",
    role: "Cutting & styling",
    focus: "Cuts, blowouts, extensions",
  },
  {
    id: "beauty-tech",
    name: "Beauty Specialist",
    role: "Nails & treatments",
    focus: "Nails, facials, waxing",
  },
] as const;

/* --- Marquee -------------------------------------------------------------- */

export const marqueeWords = [
  "Balayage",
  "Colour",
  "Extensions",
  "Cuts",
  "Blowouts",
  "Nails",
  "Beauty",
] as const;
