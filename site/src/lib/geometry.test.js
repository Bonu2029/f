import test from "node:test";
import assert from "node:assert/strict";
import { homography, apply, measureWithReference, isConvexQuad } from "./geometry.js";

// Simulate a camera: project a real plane (inches) into an image with a known homography.
const Hcam = [1.8, 0.25, 120, -0.1, 1.6, 80, 0.0009, 0.0004, 1];
const cam = (p) => apply(Hcam, p);

test("homography maps its own points", () => {
  const src = [[0, 0], [10, 0], [10, 5], [0, 5]];
  const dst = [[3, 4], [40, 2], [44, 30], [1, 28]];
  const H = homography(src, dst);
  src.forEach((p, i) => {
    const q = apply(H, p);
    assert.ok(Math.abs(q[0] - dst[i][0]) < 1e-6 && Math.abs(q[1] - dst[i][1]) < 1e-6);
  });
});

test("recovers opening size through perspective from letter-paper reference", () => {
  // Window opening 36 x 60 in; letter paper 8.5 x 11 taped at (14, 20)
  const win = [[0, 0], [36, 0], [36, 60], [0, 60]].map(cam);
  const ref = [[14, 20], [22.5, 20], [22.5, 31], [14, 31]].map(cam);
  const m = measureWithReference(ref, 8.5, 11, win);
  assert.ok(Math.abs(m.width - 36) < 1e-6, `width ${m.width}`);
  assert.ok(Math.abs(m.height - 60) < 1e-6, `height ${m.height}`);
  assert.ok(m.skew < 1e-6);
});

test("rejects crossed / out-of-order corners", () => {
  assert.equal(isConvexQuad([[0, 0], [10, 10], [10, 0], [0, 10]]), false);
  assert.equal(measureWithReference([[0, 0], [1, 1], [1, 0], [0, 1]], 8.5, 11, [[0, 0], [1, 0], [1, 1], [0, 1]]), null);
});
