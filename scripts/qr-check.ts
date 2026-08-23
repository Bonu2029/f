/**
 * Verifies the built-in QR generator by decoding what it produces.
 * Run with: npx tsx scripts/qr-check.ts
 */
import jsQR from "jsqr";
import { qrMatrix } from "../src/lib/qr";

const samples = [
  "https://servicetag.com/t/AB72KD",
  "https://servicetag.com/t/QM19XR?s=qr",
  "https://a-much-longer-branded-domain-example.com/t/ZZZ999",
  // Longer URLs exercise the multi-block interleaving path (versions 4-6).
  "https://staging.servicetag-preview-environment.example.com/t/AB72KD",
  "https://staging.servicetag-preview-environment.example.com/t/AB72KD?s=qr&x=1",
  "https://a.very.long.subdomain.chain.for.testing.servicetag.example.com/t/QM19XR?s=qr",
];

let failures = 0;

for (const text of samples) {
  const grid = qrMatrix(text);
  const quiet = 4;
  const size = grid.length + quiet * 2;
  const scale = 4;
  const px = size * scale;
  const data = new Uint8ClampedArray(px * px * 4).fill(255);

  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid.length; x++) {
      if (!grid[y][x]) continue;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const i = (((y + quiet) * scale + dy) * px + (x + quiet) * scale + dx) * 4;
          data[i] = data[i + 1] = data[i + 2] = 0;
        }
      }
    }
  }

  const result = jsQR(data, px, px);
  if (result?.data === text) {
    console.log(`PASS  ${text}`);
  } else {
    failures++;
    console.log(
      `FAIL  ${text}  ->  ${result ? JSON.stringify(result.data) : "no code detected"}`,
    );
  }
}

process.exit(failures ? 1 : 0);
