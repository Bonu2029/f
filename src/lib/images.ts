/* ============================================================================
 * ART DIRECTION MANIFEST
 * ----------------------------------------------------------------------------
 * Every image slot on the site is declared here once, together with the exact
 * Higgsfield prompt that produced (or should produce) it. Components never
 * hard-code an image path — they ask for a slot id.
 *
 * WHY THIS EXISTS
 *   The imagery brief is a single consistent editorial look: soft natural
 *   window light, cream and champagne interiors, brushed copper, sage plants,
 *   35mm film grain, shallow depth of field. Keeping the prompts next to the
 *   slots is what keeps thirty images looking like one campaign instead of
 *   thirty stock photos.
 *
 * CURRENT STATE
 *   Slots default to generated on-palette placeholder art in /public/images/art
 *   (see scripts/generate-placeholders.mjs) — abstract by design, so the site
 *   never shows an invented photograph of a person or of client work.
 *
 *   Slots that have received real photography are redirected by the ADOPTED
 *   IMAGERY block at the bottom of this file. Each slot's `aspect` is set to
 *   the ratio its photograph was actually delivered at, so nothing is cropped.
 *
 * TO SWAP IN REAL IMAGERY
 *   1. Generate with the prompts below, or use the client's own photos.
 *      docs/IMAGE-PROMPTS.md is the full brief.
 *   2. Drop the files into public/images/art as <slot-id>.<jpg|webp|avif>.
 *   3. Run `npm run images:adopt`.
 * ========================================================================== */

export type Aspect = "3:4" | "4:5" | "2:3" | "1:1" | "4:3" | "16:9" | "3:2";

export type ImageSlot = {
  id: string;
  /** Meaningful alt text. Decorative slots use "". */
  alt: string;
  aspect: Aspect;
  /** Higgsfield text-to-image prompt. Model: soul_2 (editorial/portrait). */
  prompt: string;
  src: string;
};

/** Shared prefix — keeps every generation inside the same campaign. */
export const HOUSE_STYLE =
  "editorial beauty campaign photography, soft diffused natural window light, " +
  "warm cream and champagne palette with dusty rose and sage accents, brushed " +
  "copper details, matte ivory walls, 35mm film grain, shallow depth of field, " +
  "calm luxurious mood, no text, no logos, no harsh contrast, no neon";

const art = (id: string) => `/images/art/${id}.svg`;

function slot(
  id: string,
  alt: string,
  aspect: Aspect,
  subject: string,
): ImageSlot {
  return { id, alt, aspect, prompt: `${subject}. ${HOUSE_STYLE}`, src: art(id) };
}

export const IMAGES: Record<string, ImageSlot> = {
  /* --- Hero -------------------------------------------------------------- */
  "hero-primary": slot(
    "hero-primary",
    "A stylist blow-drying a client's long balayage waves in the studio's arched styling room",
    "2:3",
    "Wide editorial interior of a luxury hair studio, a stylist mid-motion finishing a long glossy balayage blowout, client seen three-quarters from behind, tall arched window, linen curtains, sage plants, brushed copper fixtures",
  ),
  "hero-secondary": slot(
    "hero-secondary",
    "Close detail of freshly finished balayage, warm ribbons of colour catching the light",
    "4:5",
    "Extreme close-up of freshly finished balayage hair, ribbons of warm caramel and champagne through soft brunette, light catching the mid-lengths, hands lifting a section",
  ),
  "hero-detail": slot(
    "hero-detail",
    "Manicured hands resting on a marble console beside a copper bowl",
    "1:1",
    "Close-up of softly manicured hands with a sheer rose nude nail finish resting on a cream marble console beside a small brushed copper bowl and a single dried stem",
  ),

  /* --- Services ---------------------------------------------------------- */
  "service-color": slot(
    "service-color",
    "A colourist working through a client's highlighted lengths at the studio's product-lined styling station",
    "4:5",
    "Colour bar detail, a colourist blending bespoke tone in a ceramic bowl, tinted brushes, foils fanned on a linen cloth, warm neutral tones",
  ),
  "service-balayage": slot(
    "service-balayage",
    "A stylist lifting a section of finished balayage to check the blend through the mid-lengths",
    "3:4",
    "Hand-painted balayage being swept freehand through mid-lengths, lightener on the brush, soft focus salon interior behind, sunlit",
  ),
  "service-extensions": slot(
    "service-extensions",
    "Hand-tied extension wefts laid out before an application",
    "4:5",
    "Hand-tied hair extension wefts laid in a neat row on cream linen, matched to a natural brunette base, soft shadow, still-life composition",
  ),
  "service-haircut": slot(
    "service-haircut",
    "A stylist combing a client's hair into section at the styling chair",
    "4:5",
    "Precision haircut in progress, hair sectioned with clips, shears in hand, mirror reflection softly out of focus, calm quiet moment",
  ),
  "service-blowout": slot(
    "service-blowout",
    "A blowout being shaped with a round brush and dryer beside the studio's arched window",
    "4:5",
    "Voluminous blowout being finished with a round brush, hair lifting in motion, backlit by a window, glossy healthy movement",
  ),
  "service-nails": slot(
    "service-nails",
    "A nail treatment at the studio's manicure table",
    "4:5",
    "Manicure table still life, hands mid nail treatment, sheer rose and soft taupe polish bottles, folded ivory towel, copper lamp, warm light",
  ),
  "service-beauty": slot(
    "service-beauty",
    "A calm beauty treatment room with soft towels and warm light",
    "4:5",
    "Beauty treatment room, rolled ivory towels, ceramic bowls, dried florals, a treatment bed with linen throw, deeply calm spa atmosphere",
  ),

  /* --- Studio / About ---------------------------------------------------- */
  "studio-portrait": slot(
    "studio-portrait",
    "Portrait of a stylist in the studio",
    "4:5",
    "Editorial portrait of a professional hair stylist standing in her studio, relaxed confident posture, neutral linen apron, soft window light on the face, warm cream background",
  ),
  "studio-interior": slot(
    "studio-interior",
    "The studio's front room, arched mirrors and linen seating",
    "3:2",
    "Salon front room interior, arched mirrors, cream boucle seating, brushed copper rail, dried pampas in a tall vessel, sunlight falling across a limewash wall",
  ),
  "studio-detail": slot(
    "studio-detail",
    "Copper shears and a folded linen towel on a marble counter",
    "1:1",
    "Still life, brushed copper shears and a folded linen towel on cream marble, single sprig of eucalyptus, quiet shadow play",
  ),

  /* --- Transformations (replace with the salon's own real client work) ---- */
  "transform-1-before": slot(
    "transform-1-before",
    "Before: grown-out colour with uneven banding",
    "3:4",
    "Hair before a colour correction, grown-out roots and uneven banding, honest documentary lighting, neutral cream backdrop, three-quarter back view",
  ),
  "transform-1-after": slot(
    "transform-1-after",
    "After: seamless dimensional balayage",
    "3:4",
    "Same hair after a seamless dimensional balayage, soft root melt into warm champagne ends, glossy finish, identical framing and neutral cream backdrop, three-quarter back view",
  ),
  "transform-2-before": slot(
    "transform-2-before",
    "Before: fine, shoulder-length hair",
    "3:4",
    "Fine shoulder-length hair before an extension application, neutral cream backdrop, three-quarter back view, documentary lighting",
  ),
  "transform-2-after": slot(
    "transform-2-after",
    "After: hand-tied extensions adding length and body",
    "3:4",
    "Same hair after hand-tied extensions, added length and body, blended invisibly, soft waves, identical framing and neutral cream backdrop, three-quarter back view",
  ),
  "transform-3-before": slot(
    "transform-3-before",
    "Before: heavy blunt length",
    "3:4",
    "Heavy blunt long hair before a cut and gloss, neutral cream backdrop, three-quarter view, documentary lighting",
  ),
  "transform-3-after": slot(
    "transform-3-after",
    "After: a shaped cut with a clear gloss finish",
    "3:4",
    "Same hair after a shaped layered cut with a clear gloss finish, light movement and shine, identical framing and neutral cream backdrop, three-quarter view",
  ),

  /* --- Gallery ----------------------------------------------------------- */
  "gallery-01": slot(
    "gallery-01",
    "Soft champagne balayage with loose waves",
    "3:4",
    "Soft champagne balayage styled in loose waves, seen from behind against a limewash wall",
  ),
  "gallery-02": slot(
    "gallery-02",
    "A sheer rose nude manicure",
    "1:1",
    "Sheer rose nude manicure, hand resting on cream linen, close macro, delicate",
  ),
  "gallery-03": slot(
    "gallery-03",
    "A sculpted blowout with deep body",
    "4:5",
    "Sculpted blowout with deep body and bend, hair in motion, backlit",
  ),
  "gallery-04": slot(
    "gallery-04",
    "Copper-toned colour catching afternoon light",
    "3:4",
    "Copper-toned hair colour catching low afternoon light, close three-quarter view, warm glow",
  ),
  "gallery-05": slot(
    "gallery-05",
    "The colour bar, bowls and brushes at rest",
    "4:3",
    "Colour bar at rest, ceramic bowls and tint brushes arranged neatly, foils, soft shadow",
  ),
  "gallery-06": slot(
    "gallery-06",
    "A precision blunt cut with a clean line",
    "4:5",
    "Precision blunt cut with a clean line, glossy dark hair, minimal styling, plain cream backdrop",
  ),
  "gallery-07": slot(
    "gallery-07",
    "A beauty treatment detail, warm towels and ceramics",
    "1:1",
    "Beauty treatment detail, warm rolled towel and ceramic bowl, dried flower, calm still life",
  ),
  "gallery-08": slot(
    "gallery-08",
    "Extension wefts blended into natural lengths",
    "3:4",
    "Hand-tied extensions blended into natural lengths, sectioned to show the invisible join, soft light",
  ),
  "gallery-09": slot(
    "gallery-09",
    "A soft updo finished with a copper pin",
    "4:5",
    "Soft romantic updo finished with a single brushed copper pin, loose face-framing pieces, neutral backdrop",
  ),
  "gallery-10": slot(
    "gallery-10",
    "The studio window seat with dried florals",
    "3:2",
    "Studio window seat, linen cushion, dried florals in a ceramic vessel, dappled sunlight, quiet corner",
  ),

  /* --- Booking ----------------------------------------------------------- */
  "booking-ambient": slot(
    "booking-ambient",
    "",
    "4:5",
    "Soft abstract salon ambience, out-of-focus cream interior with a warm copper highlight and sage shadow, dreamy bokeh, almost abstract",
  ),
};
/* --- ADOPTED IMAGERY — generated by scripts/adopt-images.mjs --- */
// Edit by re-running the script, not by hand — this block is regenerated.
IMAGES["hero-primary"].src = "/images/art/hero-primary.webp";
IMAGES["service-balayage"].src = "/images/art/service-balayage.webp";
IMAGES["service-blowout"].src = "/images/art/service-blowout.webp";
IMAGES["service-color"].src = "/images/art/service-color.webp";
IMAGES["service-haircut"].src = "/images/art/service-haircut.webp";
/* --- END ADOPTED IMAGERY --- */

export function image(id: keyof typeof IMAGES | string): ImageSlot {
  const found = IMAGES[id];
  if (!found) throw new Error(`Unknown image slot: "${id}"`);
  return found;
}

export const ASPECT_RATIO: Record<Aspect, string> = {
  "3:4": "3 / 4",
  "4:5": "4 / 5",
  "2:3": "2 / 3",
  "1:1": "1 / 1",
  "4:3": "4 / 3",
  "16:9": "16 / 9",
  "3:2": "3 / 2",
};
