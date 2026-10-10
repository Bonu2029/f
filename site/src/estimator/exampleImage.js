import { apply, homography } from "../lib/geometry.js";

/**
 * Builds a synthetic "photo" of a window taken at an angle, with a sheet of
 * letter paper taped to the glass. Because the geometry is known, the demo
 * corner marks are exact and the calibrated method recovers 36 × 60 in.
 * Clearly labeled as a demonstration in the UI.
 */
export const EXAMPLE = { width: 1200, height: 900, realW: 36, realH: 60, paper: [14, 22, 8.5, 11] };

const H = homography(
  [[0, 0], [36, 0], [36, 60], [0, 60]],
  [[455, 150], [790, 118], [800, 812], [448, 762]],
);
const m = (x, y) => apply(H, [x, y]).map((v) => +v.toFixed(1));
const poly = (pts) => pts.map((p) => m(...p).join(",")).join(" ");

const [px, py, pw, ph] = EXAMPLE.paper;
export const EXAMPLE_POINTS = {
  opening: [m(0, 0), m(36, 0), m(36, 60), m(0, 60)],
  reference: [m(px, py), m(px + pw, py), m(px + pw, py + ph), m(px, py + ph)],
};

export function exampleImageUrl() {
  const frame = poly([[-4, -4], [40, -4], [40, 64], [-4, 64]]);
  const glassTop = poly([[1.5, 1.5], [34.5, 1.5], [34.5, 29], [1.5, 29]]);
  const glassBot = poly([[1.5, 31], [34.5, 31], [34.5, 58.5], [1.5, 58.5]]);
  const sill = poly([[-7, 64], [43, 64], [43, 67], [-7, 67]]);
  const paper = poly([[px, py], [px + pw, py], [px + pw, py + ph], [px, py + ph]]);
  const mullV = [[18, 1.5], [18, 58.5]].map((p) => m(...p));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
<defs>
<linearGradient id="w" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e8e1d5"/><stop offset="1" stop-color="#c9bfb0"/></linearGradient>
<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6f3ec"/><stop offset=".6" stop-color="#dfe0da"/><stop offset="1" stop-color="#c8c6bd"/></linearGradient>
</defs>
<rect width="1200" height="900" fill="url(#w)"/>
<polygon points="${frame}" fill="#f4f0e8" stroke="#a69c8e" stroke-width="2"/>
<polygon points="${glassTop}" fill="url(#g)" stroke="#8a8175" stroke-width="2"/>
<polygon points="${glassBot}" fill="url(#g)" stroke="#8a8175" stroke-width="2"/>
<line x1="${mullV[0][0]}" y1="${mullV[0][1]}" x2="${mullV[1][0]}" y2="${mullV[1][1]}" stroke="#efe9df" stroke-width="5"/>
<polygon points="${sill}" fill="#ece6db" stroke="#a69c8e" stroke-width="2"/>
<polygon points="${paper}" fill="#ffffff" stroke="#b9b1a4" stroke-width="1.5"/>
<text x="40" y="860" font-family="Arial, sans-serif" font-size="22" fill="#6b635a">DEMONSTRATION — synthetic example photo</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
