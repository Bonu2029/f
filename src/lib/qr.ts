/**
 * Minimal QR code generator (byte mode, error correction level M).
 *
 * NFC is the primary way a customer opens a tag; the QR code is a backup that
 * encodes the exact same URL. Written by hand rather than pulled in as a
 * dependency because that is all we need — one URL, rendered as an SVG.
 */

type Version = { version: number; capacity: number; ecCodewords: number };

// Byte-mode capacity at EC level M, for the versions we need. A tag URL is
// well under 100 characters, so versions 1-6 cover every case.
const VERSIONS: Version[] = [
  { version: 1, capacity: 14, ecCodewords: 10 },
  { version: 2, capacity: 26, ecCodewords: 16 },
  { version: 3, capacity: 42, ecCodewords: 26 },
  { version: 4, capacity: 62, ecCodewords: 18 },
  { version: 5, capacity: 84, ecCodewords: 24 },
  { version: 6, capacity: 106, ecCodewords: 16 },
];

// Data codewords and EC blocks per version at level M.
const BLOCK_LAYOUT: Record<
  number,
  { totalData: number; blocks: number[]; ecPerBlock: number }
> = {
  1: { totalData: 16, blocks: [16], ecPerBlock: 10 },
  2: { totalData: 28, blocks: [28], ecPerBlock: 16 },
  3: { totalData: 44, blocks: [44], ecPerBlock: 26 },
  4: { totalData: 64, blocks: [32, 32], ecPerBlock: 18 },
  5: { totalData: 86, blocks: [43, 43], ecPerBlock: 24 },
  6: { totalData: 108, blocks: [27, 27, 27, 27], ecPerBlock: 16 },
};

const ALIGNMENT_CENTERS: Record<number, number[]> = {
  1: [],
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
};

// --- Galois field arithmetic (GF(256), primitive polynomial 0x11d) ----------

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);

(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

function generatorPoly(degree: number): number[] {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array<number>(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], EXP[i]);
    }
    poly = next;
  }
  return poly;
}

function errorCorrection(data: number[], ecLength: number): number[] {
  const generator = generatorPoly(ecLength);
  const remainder = new Array<number>(ecLength).fill(0);

  for (const byte of data) {
    const factor = byte ^ remainder[0];
    remainder.shift();
    remainder.push(0);
    for (let i = 0; i < ecLength; i++) {
      remainder[i] ^= gfMul(generator[i + 1], factor);
    }
  }

  return remainder;
}

// --- Encoding ---------------------------------------------------------------

function pickVersion(byteLength: number): Version {
  const version = VERSIONS.find((candidate) => byteLength <= candidate.capacity);
  if (!version) {
    throw new Error("Content is too long for the supported QR versions.");
  }
  return version;
}

function encodeData(text: string, version: Version): number[] {
  const bytes = new TextEncoder().encode(text);
  const layout = BLOCK_LAYOUT[version.version];
  const bits: number[] = [];

  const push = (value: number, length: number) => {
    for (let i = length - 1; i >= 0; i--) bits.push((value >> i) & 1);
  };

  push(0b0100, 4); // byte mode
  push(bytes.length, 8); // versions 1-9 use an 8-bit length
  for (const byte of bytes) push(byte, 8);

  const capacityBits = layout.totalData * 8;
  push(0, Math.min(4, capacityBits - bits.length)); // terminator
  while (bits.length % 8 !== 0) bits.push(0);

  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    codewords.push(parseInt(bits.slice(i, i + 8).join(""), 2));
  }

  const padBytes = [0xec, 0x11];
  let padIndex = 0;
  while (codewords.length < layout.totalData) {
    codewords.push(padBytes[padIndex++ % 2]);
  }

  // Split into blocks, compute EC, then interleave.
  const dataBlocks: number[][] = [];
  const ecBlocks: number[][] = [];
  let offset = 0;

  for (const blockSize of layout.blocks) {
    const block = codewords.slice(offset, offset + blockSize);
    offset += blockSize;
    dataBlocks.push(block);
    ecBlocks.push(errorCorrection(block, layout.ecPerBlock));
  }

  const result: number[] = [];
  const maxData = Math.max(...layout.blocks);

  for (let i = 0; i < maxData; i++) {
    for (const block of dataBlocks) {
      if (i < block.length) result.push(block[i]);
    }
  }
  for (let i = 0; i < layout.ecPerBlock; i++) {
    for (const block of ecBlocks) result.push(block[i]);
  }

  return result;
}

// --- Matrix construction ----------------------------------------------------

type Matrix = { size: number; modules: Uint8Array; reserved: Uint8Array };

function createMatrix(version: number): Matrix {
  const size = version * 4 + 17;
  return {
    size,
    modules: new Uint8Array(size * size),
    reserved: new Uint8Array(size * size),
  };
}

function set(matrix: Matrix, x: number, y: number, dark: boolean, reserve = true) {
  const index = y * matrix.size + x;
  matrix.modules[index] = dark ? 1 : 0;
  if (reserve) matrix.reserved[index] = 1;
}

function placeFinder(matrix: Matrix, x0: number, y0: number) {
  for (let dy = -1; dy <= 7; dy++) {
    for (let dx = -1; dx <= 7; dx++) {
      const x = x0 + dx;
      const y = y0 + dy;
      if (x < 0 || y < 0 || x >= matrix.size || y >= matrix.size) continue;

      const inRing =
        (dx >= 0 && dx <= 6 && (dy === 0 || dy === 6)) ||
        (dy >= 0 && dy <= 6 && (dx === 0 || dx === 6));
      const inCore = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;

      set(matrix, x, y, inRing || inCore);
    }
  }
}

function placeAlignment(matrix: Matrix, version: number) {
  const centers = ALIGNMENT_CENTERS[version];
  for (const cy of centers) {
    for (const cx of centers) {
      // Skip the three finder corners.
      const nearFinder =
        (cx <= 8 && cy <= 8) ||
        (cx <= 8 && cy >= matrix.size - 9) ||
        (cx >= matrix.size - 9 && cy <= 8);
      if (nearFinder) continue;

      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const ring = Math.max(Math.abs(dx), Math.abs(dy));
          set(matrix, cx + dx, cy + dy, ring !== 1);
        }
      }
    }
  }
}

function placeTiming(matrix: Matrix) {
  for (let i = 8; i < matrix.size - 8; i++) {
    const dark = i % 2 === 0;
    set(matrix, i, 6, dark);
    set(matrix, 6, i, dark);
  }
}

function reserveFormat(matrix: Matrix) {
  for (let i = 0; i < 9; i++) {
    if (i !== 6) {
      set(matrix, i, 8, false);
      set(matrix, 8, i, false);
    }
  }
  for (let i = 0; i < 8; i++) {
    set(matrix, matrix.size - 1 - i, 8, false);
    set(matrix, 8, matrix.size - 1 - i, false);
  }
  set(matrix, 8, matrix.size - 8, true); // always-dark module
}

function placeData(matrix: Matrix, codewords: number[]) {
  let bitIndex = 0;
  const totalBits = codewords.length * 8;
  let upward = true;

  for (let right = matrix.size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5; // skip the vertical timing column

    for (let step = 0; step < matrix.size; step++) {
      const y = upward ? matrix.size - 1 - step : step;

      for (const x of [right, right - 1]) {
        const index = y * matrix.size + x;
        if (matrix.reserved[index]) continue;

        let dark = false;
        if (bitIndex < totalBits) {
          const byte = codewords[bitIndex >> 3];
          dark = ((byte >> (7 - (bitIndex & 7))) & 1) === 1;
          bitIndex++;
        }

        // Mask pattern 0: (row + column) % 2 === 0
        if ((y + x) % 2 === 0) dark = !dark;

        matrix.modules[index] = dark ? 1 : 0;
      }
    }
    upward = !upward;
  }
}

function placeFormatBits(matrix: Matrix) {
  // Level M (0b00) with mask 0, BCH-encoded and XOR-masked — a fixed value.
  const bits = 0b101010000010010;

  for (let i = 0; i < 15; i++) {
    const dark = ((bits >> i) & 1) === 1;

    if (i < 6) set(matrix, 8, i, dark);
    else if (i < 8) set(matrix, 8, i + 1, dark);
    else if (i === 8) set(matrix, 7, 8, dark);
    else set(matrix, 14 - i, 8, dark);

    if (i < 8) set(matrix, matrix.size - 1 - i, 8, dark);
    else set(matrix, 8, matrix.size - 15 + i, dark);
  }
}

/** Returns the QR modules as a square grid of booleans. */
export function qrMatrix(text: string): boolean[][] {
  const bytes = new TextEncoder().encode(text).length;
  const version = pickVersion(bytes);
  const codewords = encodeData(text, version);

  const matrix = createMatrix(version.version);
  placeFinder(matrix, 0, 0);
  placeFinder(matrix, matrix.size - 7, 0);
  placeFinder(matrix, 0, matrix.size - 7);
  placeAlignment(matrix, version.version);
  placeTiming(matrix);
  reserveFormat(matrix);
  placeData(matrix, codewords);
  placeFormatBits(matrix);

  const grid: boolean[][] = [];
  for (let y = 0; y < matrix.size; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < matrix.size; x++) {
      row.push(matrix.modules[y * matrix.size + x] === 1);
    }
    grid.push(row);
  }
  return grid;
}

/** Renders the QR code as a standalone SVG string. */
export function qrSvg(text: string, options: { scale?: number; quiet?: number } = {}) {
  const scale = options.scale ?? 8;
  const quiet = options.quiet ?? 4;
  const grid = qrMatrix(text);
  const size = grid.length + quiet * 2;

  let path = "";
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid.length; x++) {
      if (grid[y][x]) path += `M${x + quiet} ${y + quiet}h1v1h-1z`;
    }
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size * scale}" ` +
    `height="${size * scale}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">` +
    `<rect width="${size}" height="${size}" fill="#ffffff"/>` +
    `<path d="${path}" fill="#0a0b0d"/>` +
    `</svg>`
  );
}
