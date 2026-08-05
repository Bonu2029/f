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
    "Long dimensional balayage finished in soft waves, seen from behind",
    "3:4",
    "Extreme close-up of freshly finished balayage hair, ribbons of warm caramel and champagne through soft brunette, light catching the mid-lengths, hands lifting a section",
  ),
  "hero-detail": slot(
    "hero-detail",
    "A hand with a sheer rose nude manicure resting on cream linen beside a copper vessel",
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
    "A precision cut in progress, hair sectioned with clips and shears in hand",
    "4:5",
    "Precision haircut in progress, hair sectioned with clips, shears in hand, mirror reflection softly out of focus, calm quiet moment",
  ),
  "service-blowout": slot(
    "service-blowout",
    "A blowout being lifted and shaped with a round brush, backlit by the studio window",
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
    "A stylist standing in her studio in a linen apron, brushes in the pocket",
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
    "Illustrative example, before: grown-out colour with uneven banding",
    "3:4",
    "Hair before a colour correction, grown-out roots and uneven banding, honest documentary lighting, neutral cream backdrop, three-quarter back view",
  ),
  "transform-1-after": slot(
    "transform-1-after",
    "Illustrative example, after: seamless dimensional balayage",
    "3:4",
    "Same hair after a seamless dimensional balayage, soft root melt into warm champagne ends, glossy finish, identical framing and neutral cream backdrop, three-quarter back view",
  ),
  "transform-2-before": slot(
    "transform-2-before",
    "Illustrative example, before: fine hair at shoulder length",
    "3:4",
    "Fine shoulder-length hair before an extension application, neutral cream backdrop, three-quarter back view, documentary lighting",
  ),
  "transform-2-after": slot(
    "transform-2-after",
    "Illustrative example, after: hand-tied extensions adding length and body",
    "3:4",
    "Same hair after hand-tied extensions, added length and body, blended invisibly, soft waves, identical framing and neutral cream backdrop, three-quarter back view",
  ),
  "transform-3-before": slot(
    "transform-3-before",
    "Illustrative example, before: heavy blunt one-length hair",
    "3:4",
    "Heavy blunt long hair before a cut and gloss, neutral cream backdrop, three-quarter view, documentary lighting",
  ),
  "transform-3-after": slot(
    "transform-3-after",
    "Illustrative example, after: a shaped layered cut with a clear gloss finish",
    "3:4",
    "Same hair after a shaped layered cut with a clear gloss finish, light movement and shine, identical framing and neutral cream backdrop, three-quarter view",
  ),

  /* --- Gallery ----------------------------------------------------------- */
  "gallery-01": slot(
    "gallery-01",
    "A stylist combing through a client's champagne balayage waves at the chair",
    "4:5",
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
    "Sandy blonde balayage finished in soft waves, seen from behind",
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
    "Copper-toned waves catching late afternoon light",
    "3:4",
    "Hand-tied extensions blended into natural lengths, sectioned to show the invisible join, soft light",
  ),
  "gallery-09": slot(
    "gallery-09",
    "A voluminous layered blowout with deep body and bend",
    "4:5",
    "Soft romantic updo finished with a single brushed copper pin, loose face-framing pieces, neutral backdrop",
  ),
  "gallery-10": slot(
    "gallery-10",
    "The studio window seat with dried florals",
    "3:2",
    "Studio window seat, linen cushion, dried florals in a ceramic vessel, dappled sunlight, quiet corner",
  ),
  // Added when photography arrived that was too good to displace an existing
  // tile for — the gallery grid takes any number of entries.
  "gallery-11": slot(
    "gallery-11",
    "Hand-tied extensions sectioned to show how the join sits against the natural root",
    "3:4",
    "Hand-tied extensions with the top section pinned into a half-up bun to reveal the row of wefts against the natural root, blended lengths falling below, soft light",
  ),
  "gallery-12": slot(
    "gallery-12",
    "A soft romantic updo finished with a hammered copper pin",
    "4:5",
    "Soft romantic updo, loosely twisted and pinned with a single hammered copper disc, face-framing pieces left out, seen from behind",
  ),

  /* --- Booking ----------------------------------------------------------- */
  "booking-ambient": slot(
    "booking-ambient",
    "",
    "4:5",
    "Soft abstract salon ambience, out-of-focus cream interior with a warm copper highlight and sage shadow, dreamy bokeh, almost abstract",
  ),
};
/**
 * Whether a slot is showing a real photograph rather than generated
 * placeholder art. Sections use this to hide entries that have nothing real to
 * show yet, instead of presenting an abstract gradient as if it were work.
 */
export function hasRealPhoto(id: string): boolean {
  const found = IMAGES[id];
  return Boolean(found) && !found.src.endsWith(".svg");
}
/* --- ADOPTED IMAGERY — generated by scripts/adopt-images.mjs --- */
// Edit by re-running the script, not by hand — this block is regenerated.
IMAGES["booking-ambient"].src = "/images/art/booking-ambient.webp";
IMAGES["gallery-01"].src = "/images/art/gallery-01.webp";
IMAGES["gallery-03"].src = "/images/art/gallery-03.webp";
IMAGES["gallery-04"].src = "/images/art/gallery-04.webp";
IMAGES["gallery-05"].src = "/images/art/gallery-05.webp";
IMAGES["gallery-06"].src = "/images/art/gallery-06.webp";
IMAGES["gallery-07"].src = "/images/art/gallery-07.webp";
IMAGES["gallery-08"].src = "/images/art/gallery-08.webp";
IMAGES["gallery-09"].src = "/images/art/gallery-09.webp";
IMAGES["gallery-10"].src = "/images/art/gallery-10.webp";
IMAGES["gallery-11"].src = "/images/art/gallery-11.webp";
IMAGES["gallery-12"].src = "/images/art/gallery-12.webp";
IMAGES["hero-detail"].src = "/images/art/hero-detail.webp";
IMAGES["hero-primary"].src = "/images/art/hero-primary.webp";
IMAGES["hero-secondary"].src = "/images/art/hero-secondary.webp";
IMAGES["service-balayage"].src = "/images/art/service-balayage.webp";
IMAGES["service-beauty"].src = "/images/art/service-beauty.webp";
IMAGES["service-blowout"].src = "/images/art/service-blowout.webp";
IMAGES["service-color"].src = "/images/art/service-color.webp";
IMAGES["service-extensions"].src = "/images/art/service-extensions.webp";
IMAGES["service-haircut"].src = "/images/art/service-haircut.webp";
IMAGES["service-nails"].src = "/images/art/service-nails.webp";
IMAGES["studio-detail"].src = "/images/art/studio-detail.webp";
IMAGES["studio-interior"].src = "/images/art/studio-interior.webp";
IMAGES["studio-portrait"].src = "/images/art/studio-portrait.webp";
IMAGES["transform-1-after"].src = "/images/art/transform-1-after.webp";
IMAGES["transform-1-before"].src = "/images/art/transform-1-before.webp";
IMAGES["transform-2-after"].src = "/images/art/transform-2-after.webp";
IMAGES["transform-2-before"].src = "/images/art/transform-2-before.webp";
IMAGES["transform-3-after"].src = "/images/art/transform-3-after.webp";
IMAGES["transform-3-before"].src = "/images/art/transform-3-before.webp";
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
