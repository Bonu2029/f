#!/usr/bin/env node
/**
 * Prepare a source photograph for `public/images/`.
 *
 *   node scripts/optimize-image.mjs <source> <slot-id> [--width 1600] [--quality 82]
 *
 * Resizes, strips metadata and encodes to mozjpeg. `next/image` serves AVIF and
 * WebP derivatives from the result, so the file on disk only needs to be a good
 * quality master — not a multi-megabyte original.
 *
 * Width guidance:
 *   1600  heroes and editorial images (they never render wider than ~50vw)
 *   1920  full-bleed bands that span the viewport
 *   1200  portrait images, which are narrower than they are tall
 *
 * Busy subjects — dense foliage, textured rugs — encode large. Drop to
 * --quality 76 there; the difference is invisible and the saving is real.
 *
 * After running this, set `src: '/images/<slot-id>.jpg'` on the matching entry
 * in lib/content/images.ts, and check the slot's aspect ratio still suits the
 * photograph you were given.
 */

import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);

function flag(name, fallback) {
  const index = args.indexOf(`--${name}`);
  if (index === -1) return fallback;
  const value = Number(args[index + 1]);
  return Number.isFinite(value) ? value : fallback;
}

const [source, slotId] = args.filter((arg, index) => {
  if (arg.startsWith('--')) return false;
  return !args[index - 1]?.startsWith('--');
});

if (!source || !slotId) {
  console.error('Usage: node scripts/optimize-image.mjs <source> <slot-id> [--width N] [--quality N]');
  process.exit(1);
}

if (!existsSync(source)) {
  console.error(`Source not found: ${source}`);
  process.exit(1);
}

const width = flag('width', 1600);
const quality = flag('quality', 82);
const target = path.join(root, 'public', 'images', `${slotId}.jpg`);

const info = await sharp(source)
  .resize({ width, withoutEnlargement: true })
  .jpeg({ quality, mozjpeg: true, chromaSubsampling: '4:4:4' })
  .toFile(target);

const ratio = (info.width / info.height).toFixed(3);
console.log(
  `${slotId}: ${info.width}x${info.height} (ratio ${ratio}) · ${Math.round(info.size / 1024)} KB → public/images/${slotId}.jpg`,
);
console.log(`Next: set src: '/images/${slotId}.jpg' in lib/content/images.ts`);
