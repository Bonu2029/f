/* ============================================================================
 * EXPORT THE IMAGE BRIEF
 * ----------------------------------------------------------------------------
 * Reads the art-direction manifest and writes docs/IMAGE-PROMPTS.md — one
 * complete, copy-paste-ready prompt per slot, with the house style already
 * appended so nothing has to be assembled by hand.
 *
 * Generated from src/lib/images.ts so the brief can never drift from the code.
 *
 *   node scripts/export-prompts.mjs
 * ========================================================================== */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

const source = readFileSync(resolve(root, "src/lib/images.ts"), "utf8");

/* --- Pull HOUSE_STYLE out of the manifest --------------------------------- */
const houseMatch = source.match(
  /export const HOUSE_STYLE =\s*([\s\S]*?);\n/,
);
if (!houseMatch) throw new Error("Could not read HOUSE_STYLE from images.ts");

const HOUSE_STYLE = houseMatch[1]
  .split("+")
  .map((part) => part.trim().replace(/^"|"$/g, ""))
  .join("")
  .replace(/"\s*\+\s*"/g, "")
  .replace(/"/g, "")
  .trim();

/* --- Pull every slot() call ----------------------------------------------- */
const slotRe =
  /slot\(\s*"([a-z0-9-]+)",\s*((?:"(?:[^"\\]|\\.)*"|\s)+?),\s*"(3:4|4:5|2:3|1:1|4:3|16:9|3:2)",\s*((?:"(?:[^"\\]|\\.)*"|\s)+?),?\s*\)/g;

const unquote = (raw) =>
  raw
    .trim()
    .split(/"\s*\+\s*"/)
    .join("")
    .replace(/^"/, "")
    .replace(/"$/, "")
    .replace(/\\"/g, '"')
    .trim();

const slots = [];
let m;
while ((m = slotRe.exec(source)) !== null) {
  slots.push({
    id: m[1],
    alt: unquote(m[2]),
    aspect: m[3],
    subject: unquote(m[4]),
  });
}

if (slots.length === 0) throw new Error("No slots parsed from images.ts");

/* --- Where each slot appears, and how big it needs to be ------------------ */
const USAGE = {
  "hero-primary": "Homepage hero — the large arched image. First thing anyone sees.",
  "hero-secondary": "Homepage hero — petal-shaped image overlapping the bottom-left of the arch.",
  "hero-detail": "Homepage hero — small circular image top-right; reused in the reviews block.",
  "service-color": "Services — block 01, Hair Colour.",
  "service-balayage": "Services — block 02, Balayage.",
  "service-extensions": "Services — block 03, Hair Extensions.",
  "service-haircut": "Services — block 04, Haircuts.",
  "service-blowout": "Services — block 05, Blowouts.",
  "service-nails": "Services — block 06, Nail Services.",
  "service-beauty": "Services — block 07, Beauty Treatments.",
  "studio-portrait": "The Studio — large portrait in an organic petal mask.",
  "studio-interior": "The Studio — wide interior banner, cropped to 21:9 on the page.",
  "studio-detail": "The Studio — small pebble-shaped still life overlapping the portrait.",
  "transform-1-before": "Transformations — featured slider, BEFORE half.",
  "transform-1-after": "Transformations — featured slider, AFTER half.",
  "transform-2-before": "Transformations — second slider, BEFORE half.",
  "transform-2-after": "Transformations — second slider, AFTER half.",
  "transform-3-before": "Transformations — third slider, BEFORE half.",
  "transform-3-after": "Transformations — third slider, AFTER half.",
  "gallery-01": "Gallery — featured tile. Filter: Colour.",
  "gallery-02": "Gallery tile. Filter: Nails & Beauty.",
  "gallery-03": "Gallery tile. Filter: Cuts & Styling.",
  "gallery-04": "Gallery tile. Filter: Colour.",
  "gallery-05": "Gallery tile. Filters: The Studio, Colour.",
  "gallery-06": "Gallery — featured tile. Filter: Cuts & Styling.",
  "gallery-07": "Gallery tile. Filters: Nails & Beauty, The Studio.",
  "gallery-08": "Gallery tile. Filters: Colour, Cuts & Styling.",
  "gallery-09": "Gallery tile. Filter: Cuts & Styling.",
  "gallery-10": "Gallery tile. Filter: The Studio.",
  "booking-ambient": "Booking — decorative banner at the top of the live summary card.",
};

const MIN_PX = {
  "3:4": "1200 × 1600",
  "4:5": "1280 × 1600",
  "2:3": "1200 × 1800",
  "1:1": "1400 × 1400",
  "4:3": "1600 × 1200",
  "16:9": "1920 × 1080",
  "3:2": "1800 × 1200",
};

/* Which slots already have a real photograph, so the brief shows what is
   actually still outstanding rather than re-listing everything each time. */
const artDir = resolve(root, "public/images/art");
const delivered = new Set();
if (existsSync(artDir)) {
  for (const file of readdirSync(artDir)) {
    const match = /^([a-z0-9-]+)\.(avif|webp|jpg|jpeg|png)$/i.exec(file);
    if (match) delivered.add(match[1]);
  }
}

const GROUPS = [
  { title: "Hero", match: (id) => id.startsWith("hero-") },
  { title: "Services", match: (id) => id.startsWith("service-") },
  { title: "The Studio", match: (id) => id.startsWith("studio-") },
  { title: "Transformations", match: (id) => id.startsWith("transform-") },
  { title: "Gallery", match: (id) => id.startsWith("gallery-") },
  { title: "Booking", match: (id) => id.startsWith("booking-") },
];

/* --- Write the document --------------------------------------------------- */
const lines = [];

lines.push(`# Image brief — Massiel Beauty Salon`);
lines.push("");
lines.push(
  `Thirty image slots. Each prompt below is complete and copy-paste ready — the shared house style is already appended, which is what keeps thirty images looking like one campaign instead of thirty stock photos.`,
);
lines.push("");
lines.push(`## How to use this`);
lines.push("");
lines.push("```");
lines.push("1. Generate (or shoot) each image using the prompt for its slot id");
lines.push("2. Save it as   public/images/art/<slot-id>.jpg    (.webp and .avif also work)");
lines.push("3. Run          node scripts/adopt-images.mjs");
lines.push("```");
lines.push("");
lines.push(
  `That last step rewrites \`src/lib/images.ts\` for every slot it finds a real file for, and leaves the rest on their placeholder art. Partial delivery is fine — swap in five images or all thirty.`,
);
lines.push("");
lines.push(`## Ground rules`);
lines.push("");
lines.push(
  `- **Aspect ratios matter.** Each slot is laid out to its ratio. An image at the wrong ratio will be centre-cropped and you will lose the edges.`,
);
lines.push(
  `- **One light source, one mood.** Soft diffused daylight from a window, warm cream and champagne tones, sage and brushed-copper accents. No hard flash, no cool blue shadows, no neon, no black backgrounds.`,
);
lines.push(
  `- **No text or logos in the image.** Type is handled by the site.`,
);
lines.push(
  `- **The six transformation images must be the salon's own real client work**, photographed with written consent. Each before/after pair has to match exactly — same camera position, same distance, same lighting, same background. A pair that does not match will look wrong the moment the slider moves.`,
);
lines.push(
  `- **Faces are optional.** Much of this brief is written three-quarters from behind or as close detail, which is deliberate — it ages well and avoids consent problems.`,
);
lines.push("");
lines.push(`## The house style`);
lines.push("");
lines.push(
  `This sentence is already appended to every prompt below. If you are writing new prompts, append it to those too.`,
);
lines.push("");
lines.push("> " + HOUSE_STYLE);
lines.push("");
lines.push(`---`);
lines.push("");

let index = 0;
for (const group of GROUPS) {
  const members = slots.filter((s) => group.match(s.id));
  if (members.length === 0) continue;

  lines.push(`## ${group.title}`);
  lines.push("");

  for (const slot of members) {
    index += 1;
    const done = delivered.has(slot.id);
    lines.push(
      `### ${String(index).padStart(2, "0")}. \`${slot.id}\`${done ? " ✅ delivered" : ""}`,
    );
    lines.push("");
    if (done) {
      lines.push(
        `> Already filled with a real photograph. The prompt below is kept for reference — only regenerate if you want to replace it.`,
      );
      lines.push("");
    }
    lines.push(`**Where it appears** — ${USAGE[slot.id] ?? "—"}`);
    lines.push("");
    lines.push(
      `**Aspect ratio** \`${slot.aspect}\`  ·  **Minimum size** ${MIN_PX[slot.aspect]}px  ·  **Save as** \`public/images/art/${slot.id}.jpg\``,
    );
    lines.push("");
    lines.push(
      `**Alt text already written for it** — ${slot.alt ? `"${slot.alt}"` : "_decorative, no alt text_"}`,
    );
    lines.push("");
    lines.push(`**Prompt**`);
    lines.push("");
    lines.push("```text");
    lines.push(`${slot.subject}. ${HOUSE_STYLE}`);
    lines.push("```");
    lines.push("");
  }

  lines.push(`---`);
  lines.push("");
}

lines.push(`## Checklist`);
lines.push("");
lines.push(
  `${delivered.size} of ${slots.length} slots delivered. Still needed:`,
);
lines.push("");
for (const slot of slots) {
  const done = delivered.has(slot.id);
  lines.push(`- [${done ? "x" : " "}] \`${slot.id}\` — ${slot.aspect}`);
}
lines.push("");

mkdirSync(resolve(root, "docs"), { recursive: true });
writeFileSync(resolve(root, "docs/IMAGE-PROMPTS.md"), lines.join("\n"), "utf8");

console.log(`Wrote docs/IMAGE-PROMPTS.md — ${slots.length} slots`);
