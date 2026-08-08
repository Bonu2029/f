#!/usr/bin/env node
/**
 * Check that every before/after pair in public/images was shot from the same
 * camera position.
 *
 *   node scripts/check-pairs.mjs [--seams]
 *
 * The comparison slider reveals one frame over the other in place, so the two
 * frames have to line up. If the camera moved between them, the image visibly
 * jumps as the handle is dragged and the effect falls apart.
 *
 * Pairs are discovered by filename: `<slot>-before.jpg` alongside `<slot>.jpg`.
 *
 * Reported numbers are mean absolute greyscale difference, 0–255:
 *
 *   dimensions   must match exactly, or the frames cannot register at all
 *   upper region mostly static background (walls, windows, cabinets). This is
 *                the number that matters. Cleaning changes the lower half —
 *                counters, floors, furniture — but the top of the frame should
 *                barely move.
 *
 * A high upper-region score is not automatically a failure: a genuine change in
 * wall brightness (dingy to clean) scores high without the camera moving at all.
 * Use --seams to write a 50/50 composite of each pair to scratch/ and look at
 * whether edges run straight across the join. That is the real test.
 */

import { existsSync, readdirSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'public', 'images');
const writeSeams = process.argv.includes('--seams');
const seamDir = path.join(root, 'scratch');

const SAMPLE_W = 400;
const SAMPLE_H = 250;
const UPPER_FRACTION = 0.45;

if (!existsSync(dir)) {
  console.error('No public/images directory yet.');
  process.exit(1);
}

const pairs = readdirSync(dir)
  .filter((file) => file.endsWith('-before.jpg'))
  .map((file) => ({
    slot: file.replace('-before.jpg', ''),
    before: path.join(dir, file),
    after: path.join(dir, file.replace('-before.jpg', '.jpg')),
  }));

if (pairs.length === 0) {
  console.log('No before/after pairs found in public/images.');
  process.exit(0);
}

if (writeSeams) mkdirSync(seamDir, { recursive: true });

let incomplete = 0;
let mismatched = 0;

for (const pair of pairs) {
  if (!existsSync(pair.after)) {
    console.log(`${pair.slot}: INCOMPLETE — before frame only, after frame missing`);
    incomplete += 1;
    continue;
  }

  const [metaBefore, metaAfter] = await Promise.all([
    sharp(pair.before).metadata(),
    sharp(pair.after).metadata(),
  ]);

  const sameSize =
    metaBefore.width === metaAfter.width && metaBefore.height === metaAfter.height;

  const [rawBefore, rawAfter] = await Promise.all([
    sharp(pair.before).resize(SAMPLE_W, SAMPLE_H, { fit: 'fill' }).greyscale().raw().toBuffer(),
    sharp(pair.after).resize(SAMPLE_W, SAMPLE_H, { fit: 'fill' }).greyscale().raw().toBuffer(),
  ]);

  let total = 0;
  let upper = 0;
  let upperCount = 0;
  for (let i = 0; i < rawBefore.length; i += 1) {
    const diff = Math.abs(rawBefore[i] - rawAfter[i]);
    total += diff;
    if (Math.floor(i / SAMPLE_W) < SAMPLE_H * UPPER_FRACTION) {
      upper += diff;
      upperCount += 1;
    }
  }

  const overallScore = total / rawBefore.length;
  const upperScore = upper / upperCount;

  if (!sameSize) mismatched += 1;

  console.log(
    `${pair.slot.padEnd(16)} ${metaBefore.width}x${metaBefore.height}` +
      `${sameSize ? '' : ` != ${metaAfter.width}x${metaAfter.height}  DIMENSION MISMATCH`}` +
      `  overall ${overallScore.toFixed(1)}  upper ${upperScore.toFixed(1)}`,
  );

  if (writeSeams) {
    const width = metaBefore.width ?? 0;
    const height = metaBefore.height ?? 0;
    const half = Math.round(width / 2);
    const [left, right] = await Promise.all([
      sharp(pair.before).extract({ left: 0, top: 0, width: half, height }).toBuffer(),
      sharp(pair.after)
        .resize(width, height, { fit: 'fill' })
        .extract({ left: half, top: 0, width: width - half, height })
        .toBuffer(),
    ]);
    const out = path.join(seamDir, `seam-${pair.slot}.jpg`);
    await sharp({ create: { width, height, channels: 3, background: '#ffffff' } })
      .composite([
        { input: left, left: 0, top: 0 },
        { input: right, left: half, top: 0 },
        {
          input: Buffer.from(
            `<svg width="${width}" height="${height}"><rect x="${half - 1}" y="0" width="2" height="${height}" fill="#e11d48"/></svg>`,
          ),
          left: 0,
          top: 0,
        },
      ])
      .jpeg({ quality: 88 })
      .toFile(out);
    console.log(`  seam → ${path.relative(root, out)}`);
  }
}

if (incomplete > 0) {
  console.log(
    `\n${incomplete} pair(s) waiting on a second frame. Those slots render placeholders until both exist.`,
  );
}
if (mismatched > 0) {
  console.error(`\n${mismatched} pair(s) have mismatched dimensions and cannot register.`);
  process.exit(1);
}
