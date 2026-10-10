/**
 * Planar perspective correction.
 *
 * Four tapped image points alone cannot give real dimensions. This module
 * only produces measurements when the user also marks a reference object of
 * KNOWN physical size lying in the same plane as the window/door (e.g. a
 * sheet of letter paper taped flat to the glass). We compute the homography
 * that maps the reference's image corners to its real-world rectangle, then
 * project the opening's corners through it into real units.
 */

// Solve A x = b with Gaussian elimination + partial pivoting.
function solve(A, b) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-12) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}

/** Homography H (3x3, row-major array of 9) mapping src[i] -> dst[i]. */
export function homography(src, dst) {
  const A = [];
  const b = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i];
    const [u, v] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
  }
  const h = solve(A, b);
  return h ? [...h, 1] : null;
}

export function apply(H, [x, y]) {
  const w = H[6] * x + H[7] * y + H[8];
  return [(H[0] * x + H[1] * y + H[2]) / w, (H[3] * x + H[4] * y + H[5]) / w];
}

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** True when 4 points (TL, TR, BR, BL) form a convex, consistently wound quad. */
export function isConvexQuad(pts) {
  if (pts.length !== 4) return false;
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const a = pts[i], b = pts[(i + 1) % 4], c = pts[(i + 2) % 4];
    const cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (Math.abs(cross) < 1e-9) return false;
    const s = Math.sign(cross);
    if (sign && s !== sign) return false;
    sign = s;
  }
  return true;
}

/**
 * @param refPts   image points of the reference (TL, TR, BR, BL)
 * @param refW     real width of the reference (any unit)
 * @param refH     real height of the reference (same unit)
 * @param targetPts image points of the opening (TL, TR, BR, BL)
 * @returns {width, height, skew} in the reference's unit, or null if invalid.
 *   `skew` = relative mismatch of opposite edges; high values mean the marks
 *   or the coplanar assumption are likely off.
 */
export function measureWithReference(refPts, refW, refH, targetPts) {
  if (!isConvexQuad(refPts) || !isConvexQuad(targetPts) || !(refW > 0) || !(refH > 0)) return null;
  const H = homography(refPts, [[0, 0], [refW, 0], [refW, refH], [0, refH]]);
  if (!H) return null;
  const p = targetPts.map((q) => apply(H, q));
  const top = dist(p[0], p[1]), bottom = dist(p[3], p[2]);
  const left = dist(p[0], p[3]), right = dist(p[1], p[2]);
  const width = (top + bottom) / 2;
  const height = (left + right) / 2;
  const skew = Math.max(Math.abs(top - bottom) / width, Math.abs(left - right) / height);
  if (!isFinite(width) || !isFinite(height)) return null;
  return { width, height, skew };
}
