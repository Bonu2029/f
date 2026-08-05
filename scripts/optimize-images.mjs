/* ============================================================================
 * RESPONSIVE IMAGE DERIVATIVES
 * ----------------------------------------------------------------------------
 * Writes <id>-480.webp, <id>-768.webp and <id>-1200.webp beside every
 * photograph in public/images/art, so the site can hand a phone a 480px file
 * instead of the 1500px original.
 *
 * This matters more than it looks: the static export target has no image
 * optimiser behind it, so without these every visitor downloads full-size
 * artwork regardless of screen. Measured on a 390px viewport, that was 3.4MB
 * of imagery where ~600KB would do.
 *
 * Idempotent and incremental — a derivative is only rebuilt when its source is
 * newer, so this is cheap to run on every build.
 *
 *   npm run images:optimize
 * ========================================================================== */

import { readdirSync, statSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const artDir = resolve(root, "public/images/art");

export const WIDTHS = [480, 768, 1200];

if (!existsSync(artDir)) {
  mkdirSync(artDir, { recursive: true });
  console.log("No art directory yet — nothing to optimise.");
  process.exit(0);
}

const SOURCE = /^([a-z0-9-]+)\.(webp|jpg|jpeg|png|avif)$/i;
// Must match only the widths this script emits. A looser `-\d+` pattern also
// matches real slot ids like `gallery-01` and `transform-1-before`, which
// silently excluded a third of the library from optimisation.
const DERIVED = new RegExp(`-(${WIDTHS.join("|")})\\.webp$`, "i");

const sources = readdirSync(artDir).filter(
  (f) => SOURCE.test(f) && !DERIVED.test(f),
);

let written = 0;
let skipped = 0;

for (const file of sources) {
  const id = file.replace(SOURCE, "$1");
  const srcPath = resolve(artDir, file);
  const srcStat = statSync(srcPath);
  const meta = await sharp(srcPath).metadata();

  for (const width of WIDTHS) {
    // Every width in WIDTHS must exist on disk, because the srcset advertises
    // all of them unconditionally. Skipping the ones wider than the source
    // left 25 of 31 `-1200.webp` files missing, so browsers picked a candidate
    // that 404'd and the image simply did not appear. `withoutEnlargement`
    // still prevents actual upscaling — the file is just written at the
    // source's own width.
    const outPath = resolve(artDir, `${id}-${width}.webp`);
    if (existsSync(outPath) && statSync(outPath).mtimeMs >= srcStat.mtimeMs) {
      skipped += 1;
      continue;
    }

    await sharp(srcPath)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 80, effort: 5 })
      .toFile(outPath);
    written += 1;
  }
}

console.log(
  `Responsive derivatives: ${written} written, ${skipped} already current ` +
    `(${sources.length} source images).`,
);
