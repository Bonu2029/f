/* ============================================================================
 * PLACEHOLDER ART GENERATOR
 * ----------------------------------------------------------------------------
 * Writes one on-palette SVG per image slot in src/lib/images.ts.
 *
 * These are deliberately abstract: soft mesh gradients, drifting light and a
 * few hair-like strands in the brand palette. They hold the layout and read as
 * intentional art direction, and — importantly — they never depict a person or
 * a piece of client work that does not exist.
 *
 * Deterministic: the same slot id always produces the same artwork, so the
 * design does not shuffle between builds.
 *
 *   node scripts/generate-placeholders.mjs
 * ========================================================================== */

import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const outDir = resolve(root, "public/images/art");

/* --- Palette (mirrors globals.css) ---------------------------------------- */
const PALETTE = {
  cream: "#FAF8F5",
  ivory: "#FFFCF7",
  shell: "#EDE5DA",
  champagne: "#E7D2B5",
  champagneDeep: "#D6B88F",
  rose: "#DCB0A4",
  roseDeep: "#BE8577",
  lavender: "#C1B9D2",
  lavenderDeep: "#9A8FB4",
  sage: "#A2B597",
  sageDeep: "#7E9473",
  taupe: "#CBBFB0",
  taupeDeep: "#A5947F",
  copperGlow: "#CE9163",
  copperDeep: "#A9663A",
};

/* Each set pairs a light, a mid and a deep tone so the art has real tonal
   range — the first pass was all mid-tones and read as beige haze. */
const BLEND_SETS = [
  [PALETTE.champagne, PALETTE.roseDeep, PALETTE.taupeDeep],
  [PALETTE.rose, PALETTE.champagneDeep, PALETTE.lavenderDeep],
  [PALETTE.sage, PALETTE.champagneDeep, PALETTE.sageDeep],
  [PALETTE.lavender, PALETTE.roseDeep, PALETTE.champagneDeep],
  [PALETTE.champagneDeep, PALETTE.copperGlow, PALETTE.copperDeep],
  [PALETTE.taupe, PALETTE.sageDeep, PALETTE.champagneDeep],
];

const ASPECT = {
  "3:4": [900, 1200],
  "4:5": [960, 1200],
  "2:3": [800, 1200],
  "1:1": [1100, 1100],
  "4:3": [1200, 900],
  "16:9": [1440, 810],
  "3:2": [1200, 800],
};

/* --- Deterministic RNG ---------------------------------------------------- */
function makeRandom(seedText) {
  let h = 2166136261;
  for (let i = 0; i < seedText.length; i++) {
    h ^= seedText.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return function next() {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 100000) / 100000;
  };
}

const round = (n) => Math.round(n * 10) / 10;

/* --- Artwork -------------------------------------------------------------- */
function buildSvg(id, aspect) {
  const [w, h] = ASPECT[aspect] ?? ASPECT["3:4"];
  const rand = makeRandom(id);
  const colors = BLEND_SETS[Math.floor(rand() * BLEND_SETS.length)];

  // Three overlapping light pools form the mesh gradient.
  const pools = colors.map((color, i) => {
    const cx = round(w * (0.16 + rand() * 0.7));
    const cy = round(h * (0.14 + rand() * 0.72));
    const r = round(Math.max(w, h) * (0.4 + rand() * 0.34));
    return { id: `pool${i}`, color, cx, cy, r, opacity: 0.95 - i * 0.14 };
  });

  // Hair-like strands: long, slow beziers drifting across the frame.
  const strands = Array.from({ length: 7 }, (_, i) => {
    const startY = round(h * (-0.1 + rand() * 1.2));
    const drift = round(h * (0.18 + rand() * 0.42)) * (rand() > 0.5 ? 1 : -1);
    const bow = round(h * (0.1 + rand() * 0.3));
    const d =
      `M ${round(-w * 0.08)} ${startY} ` +
      `C ${round(w * 0.3)} ${round(startY - bow)}, ` +
      `${round(w * 0.68)} ${round(startY + drift + bow)}, ` +
      `${round(w * 1.08)} ${round(startY + drift)}`;
    return {
      d,
      width: round(0.8 + rand() * 2.6),
      opacity: round(0.22 + rand() * 0.34),
      color: i % 3 === 0 ? PALETTE.copperDeep : colors[i % colors.length],
    };
  });

  // A single organic mask shape keeps the composition from reading as a box.
  const blobCx = round(w * (0.35 + rand() * 0.3));
  const blobCy = round(h * (0.34 + rand() * 0.32));
  const blobR = round(Math.min(w, h) * (0.26 + rand() * 0.16));

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-hidden="true">
  <defs>
    ${pools
      .map(
        (p) => `<radialGradient id="${id}-${p.id}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${p.color}" stop-opacity="${p.opacity}"/>
      <stop offset="100%" stop-color="${p.color}" stop-opacity="0"/>
    </radialGradient>`,
      )
      .join("\n    ")}
    <linearGradient id="${id}-veil" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0%" stop-color="${PALETTE.ivory}" stop-opacity="0.34"/>
      <stop offset="48%" stop-color="${PALETTE.cream}" stop-opacity="0"/>
      <stop offset="100%" stop-color="${PALETTE.taupeDeep}" stop-opacity="0.34"/>
    </linearGradient>
    <radialGradient id="${id}-vignette" cx="50%" cy="46%" r="72%">
      <stop offset="55%" stop-color="${PALETTE.taupeDeep}" stop-opacity="0"/>
      <stop offset="100%" stop-color="${PALETTE.taupeDeep}" stop-opacity="0.42"/>
    </radialGradient>
    <filter id="${id}-grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
    </filter>
    <filter id="${id}-soft" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="${round(Math.min(w, h) * 0.05)}"/>
    </filter>
  </defs>

  <rect width="${w}" height="${h}" fill="${PALETTE.shell}"/>
  ${pools
    .map(
      (p) =>
        `<circle cx="${p.cx}" cy="${p.cy}" r="${p.r}" fill="url(#${id}-${p.id})"/>`,
    )
    .join("\n  ")}

  <ellipse cx="${blobCx}" cy="${blobCy}" rx="${blobR}" ry="${round(blobR * 1.22)}"
           fill="${PALETTE.ivory}" opacity="0.5" filter="url(#${id}-soft)"/>

  <g fill="none" stroke-linecap="round">
    ${strands
      .map(
        (s) =>
          `<path d="${s.d}" stroke="${s.color}" stroke-width="${s.width}" opacity="${s.opacity}"/>`,
      )
      .join("\n    ")}
  </g>

  <rect width="${w}" height="${h}" fill="url(#${id}-veil)"/>
  <rect width="${w}" height="${h}" fill="url(#${id}-vignette)"/>
  <rect width="${w}" height="${h}" filter="url(#${id}-grain)" opacity="0.16" style="mix-blend-mode:multiply"/>
</svg>
`;
}

/* --- Read the slot list straight out of the manifest ---------------------- */
const manifest = readFileSync(resolve(root, "src/lib/images.ts"), "utf8");
const slots = [...manifest.matchAll(/slot\(\s*"([a-z0-9-]+)",[\s\S]*?"(3:4|4:5|2:3|1:1|4:3|16:9|3:2)"/g)].map(
  (m) => ({ id: m[1], aspect: m[2] }),
);

if (slots.length === 0) {
  console.error("No image slots found in src/lib/images.ts — aborting.");
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
for (const { id, aspect } of slots) {
  writeFileSync(resolve(outDir, `${id}.svg`), buildSvg(id, aspect), "utf8");
}

console.log(`Generated ${slots.length} placeholder artworks in public/images/art`);
