/* ============================================================================
 * ADOPT REAL IMAGERY
 * ----------------------------------------------------------------------------
 * Drop real photographs (Higgsfield generations or the client's own shots) into
 * public/images/art named after their slot id — hero-primary.jpg,
 * service-nails.webp, gallery-03.avif — then run:
 *
 *   node scripts/adopt-images.mjs
 *
 * It rewrites the `src` value for every slot it finds a real file for and
 * leaves the rest on their placeholder art. Safe to run repeatedly.
 * ========================================================================== */

import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const artDir = resolve(root, "public/images/art");
const manifestPath = resolve(root, "src/lib/images.ts");

if (!existsSync(artDir)) {
  console.error("public/images/art does not exist — run generate-placeholders first.");
  process.exit(1);
}

const REAL = /\.(jpg|jpeg|png|webp|avif)$/i;
const real = new Map();
for (const file of readdirSync(artDir)) {
  if (!REAL.test(file)) continue;
  real.set(file.replace(REAL, ""), file);
}

if (real.size === 0) {
  console.log("No photographic files found in public/images/art — nothing to adopt.");
  process.exit(0);
}

let manifest = readFileSync(manifestPath, "utf8");
const adopted = [];

// Slots default to `art(id)`; adopted slots get an explicit override object.
for (const [id, file] of real) {
  const marker = new RegExp(`(slot\\(\\s*"${id}"[\\s\\S]*?\\),)(\\s*)`, "m");
  const already = new RegExp(`"${id}":[\\s\\S]{0,400}?src: "/images/art/${file}"`);
  if (already.test(manifest)) continue;

  // Replace any previous override for this slot, then append a fresh one.
  manifest = manifest.replace(
    new RegExp(`(\\n\\s*"${id}": \\{[\\s\\S]*?\\n\\s*\\},)`, "m"),
    "$1",
  );
  if (!marker.test(manifest)) continue;
  adopted.push({ id, file });
}

if (adopted.length === 0) {
  console.log("Every photographic file is already adopted.");
  process.exit(0);
}

// Overrides live in one clearly-marked block at the end of the manifest so the
// generated prompts above stay readable and untouched.
const block =
  `\n/* --- ADOPTED IMAGERY (written by scripts/adopt-images.mjs) -------------- */\n` +
  adopted
    .map(({ id, file }) => `IMAGES["${id}"].src = "/images/art/${file}";`)
    .join("\n") +
  "\n";

const anchor = "\nexport function image(";
manifest = manifest.replace(anchor, `${block}${anchor}`);
writeFileSync(manifestPath, manifest, "utf8");

console.log(`Adopted ${adopted.length} image(s):`);
for (const { id, file } of adopted) console.log(`  ${id} → ${file}`);
