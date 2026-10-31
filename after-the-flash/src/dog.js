// ============================================================================
// dog.js — Biscuit, golden retriever puppet (side view). 4-leg walk (lateral
// sequence) and gallop, tail wag / tuck, head tilt, sniff, bark, pull, leap,
// growl (lip curl, teeth, ears back, head low, hackles), sit.
// Units: shoulder height ~38 units. s = px per unit.
// ============================================================================
const DOG = { coat: '#d9a441', light: '#f2d28e', dark: '#a8742c', nose: '#2a1a12', eye: '#4a2a14', collar: '#d62828' };
// st: {mode, ph, tail:'wag'|'tuck'|'low', tilt, bark, earsUp, look}
function drawDog(g, x, y, s, dir, st, t) {
  const U = s, mode = st.mode || 'stand', ph = st.ph || 0;
  aoShadow(g, x, y + 2, 34 * U, 5 * U, 0.4); castShadow(g, x, y, 60 * U, 60 * U, 0.14);
  g.save(); g.translate(x, y); g.scale(dir, 1);
  let bodyY = -38, bodyRot = 0, headX = 34, headY = -56, headRot = 0, crouch = 0, stretch = 1;
  const legs = [ // [hipX, hipY, phaseOffset, front?]
    [-19, -36, 0.0, false], [16, -35, 0.25, true], [-19, -36, 0.5, false], [16, -35, 0.75, true],
  ];
  let amp = 0, kneeAmp = 0, bob = 0, sp = 1;
  if (mode === 'walk') { amp = 0.45; kneeAmp = 0.7; bob = Math.sin(ph * 2 * TAU) * 0.8; }
  if (mode === 'trot') { amp = 0.6; kneeAmp = 0.9; bob = Math.sin(ph * 2 * TAU) * 1.4; legs[1][2] = 0.5; legs[3][2] = 0; }
  if (mode === 'run' || mode === 'leap') { amp = 0.95; kneeAmp = 1.1; bob = Math.sin(ph * TAU) * 3; legs[0][2] = 0; legs[2][2] = 0.08; legs[1][2] = 0.5; legs[3][2] = 0.58; bodyRot = Math.sin(ph * TAU) * 0.08; stretch = 1 + Math.sin(ph * TAU) * 0.06; }
  if (mode === 'sniff') { headX = 40; headY = -24 + Math.sin(t * 9) * 1.2; headRot = 0.5; }
  if (mode === 'growl') { crouch = 6; headX = 38; headY = -42; headRot = 0.15; }
  if (mode === 'pull') { bodyRot = 0.1; headX = 38; headY = -50; crouch = 3; }
  if (mode === 'sit') { bodyRot = -0.55; }
  if (mode === 'lie') { crouch = 24; }
  bodyY += crouch + bob;
  g.save(); g.translate(0, bodyY); g.rotate(bodyRot); g.translate(0, -bodyY);
  // ---- legs
  const drawLeg = (L, far) => {
    const [hx, hy0, off, front] = L; const hy = hy0 + crouch + bob;
    const p = (ph + off) % 1, a = Math.sin(p * TAU) * amp, swing = Math.max(0, Math.cos(p * TAU));
    let up = a, kn = (front ? -1 : 1) * (0.15 + kneeAmp * swing * 0.8);
    if (mode === 'pull') { up = front ? 0.55 : 0.75; kn = front ? -0.2 : 0.5; }                  // braced, planted
    if (mode === 'growl') { up = front ? 0.3 : -0.2; kn = front ? -0.5 : 0.9; }
    if (mode === 'leap') { up = front ? 1.2 : -1.1; kn = front ? -0.8 : 0.4; }
    if (mode === 'sit' && !front) { up = 1.4; kn = 2.6; }
    if (mode === 'sit' && front) { up = -0.35; kn = 0; }
    if (mode === 'lie') { up = front ? 1.45 : 1.5; kn = front ? 0.1 : 2.4; }
    const l1 = 13, l2 = 15 - (crouch > 5 ? 2 : 0);
    const kx = hx * stretch + Math.sin(up) * l1, ky = hy + Math.cos(up) * l1;
    const fx = kx + Math.sin(up + kn) * l2, fy = Math.min(-1.5, ky + Math.cos(up + kn) * l2);
    const col = far ? DOG.dark : DOG.coat;
    limb(g, hx * stretch * U, hy * U, kx * U, ky * U, (front ? 7 : 9) * U, col);
    limb(g, kx * U, ky * U, fx * U, fy * U, 5.5 * U, col);
    g.fillStyle = far ? shade(DOG.dark, -0.1) : DOG.light; ellipse(g, (fx + 2) * U, (fy + 0.5) * U, 4 * U, 2.2 * U); g.fill();
    // feathering on back of legs
    g.fillStyle = col; for (let k = 0; k < 3; k++) { ellipse(g, lerp(hx * stretch, kx, k / 3) * U - 3 * U, lerp(hy, ky, k / 3) * U + 2 * U, 2.5 * U, 1.5 * U, 0.6); g.fill(); }
  };
  drawLeg(legs[2], true); drawLeg(legs[3], true);
  // ---- tail
  const tailBase = [-26, -42 + crouch + bob];
  let ta = -0.9 + Math.sin(t * (st.tail === 'wag' ? 16 : 3)) * (st.tail === 'wag' ? 0.5 : 0.08);
  if (st.tail === 'tuck') ta = 0.9; if (st.tail === 'low') ta = 0.35;
  g.save(); g.translate(tailBase[0] * stretch * U, tailBase[1] * U); g.rotate(ta);
  g.fillStyle = DOG.coat; g.beginPath(); g.moveTo(0, -3 * U); g.quadraticCurveTo(-14 * U, -10 * U, -24 * U, -4 * U); g.quadraticCurveTo(-14 * U, 6 * U, 0, 4 * U); g.fill();
  g.fillStyle = DOG.light; for (let k = 0; k < 5; k++) { ellipse(g, -5 * U - k * 4 * U, 4 * U - k * 0.5 * U, 3 * U, 2 * U, 0.4); g.fill(); }
  g.restore();
  // ---- body
  const by = bodyY;
  g.fillStyle = lingrad(g, 0, (by - 14) * U, 0, (by + 12) * U, [[0, shade(DOG.coat, 0.08)], [0.6, DOG.coat], [1, DOG.dark]]);
  g.beginPath(); g.moveTo(-28 * stretch * U, (by - 4) * U);
  g.bezierCurveTo(-28 * stretch * U, (by - 15) * U, 10 * U, (by - 15) * U, 22 * U, (by - 10) * U);
  g.bezierCurveTo(30 * U, (by - 6) * U, 28 * U, (by + 10) * U, 18 * U, (by + 11) * U);
  g.bezierCurveTo(6 * U, (by + 13) * U, -14 * U, (by + 8) * U, -24 * stretch * U, (by + 9) * U);
  g.quadraticCurveTo(-31 * stretch * U, (by + 4) * U, -28 * stretch * U, (by - 4) * U); g.fill();
  // belly feathering + chest fluff
  g.fillStyle = DOG.coat; for (let k = 0; k < 7; k++) { ellipse(g, (-16 + k * 5) * U, (by + 10 + Math.sin(k) * 0.6) * U, 3 * U, 2.4 * U, 0.3); g.fill(); }
  g.fillStyle = DOG.light; ellipse(g, 22 * U, (by + 3) * U, 8 * U, 10 * U, -0.3); g.fill();
  for (let k = 0; k < 4; k++) { ellipse(g, (20 + k) * U, (by + 9 + k * 1.5) * U, 3 * U, 2 * U, 0.4); g.fill(); }
  // sun rim on the back
  g.fillStyle = 'rgba(255,230,170,0.35)'; ellipse(g, -2 * U, (by - 12) * U, 20 * U, 2.5 * U); g.fill();
  // hackles (growl)
  if (mode === 'growl' || st.hackles) { g.fillStyle = DOG.dark; for (let k = 0; k < 9; k++) { const hx = (-10 + k * 3.5) * U, hy = (by - 13) * U; poly(g, [hx - 1.6 * U, hy + 2 * U, hx + 0.3 * U, hy - (2 + (k % 2) * 1.2) * U, hx + 1.6 * U, hy + 2 * U]); g.fill(); } }
  drawLeg(legs[0], false); drawLeg(legs[1], false);
  // ---- neck + head
  const nx = 20, ny = by - 6;
  const hX = headX, hY = headY + crouch * 0.5 + bob;
  g.fillStyle = DOG.coat; g.beginPath(); g.moveTo((nx - 6) * U, (ny - 6) * U); g.quadraticCurveTo((hX - 6) * U, (hY - 6) * U, (hX) * U, (hY - 6) * U);
  g.lineTo((hX + 2) * U, (hY + 6) * U); g.quadraticCurveTo((nx + 10) * U, (ny + 2) * U, (nx + 6) * U, (ny + 10) * U); g.closePath(); g.fill();
  g.fillStyle = DOG.light; ellipse(g, (nx + 8) * U, (ny + 2) * U, 6 * U, 8 * U, -0.6); g.fill();
  // collar + tag
  const cx = lerp(nx, hX, 0.55), cy = lerp(ny, hY, 0.55);
  g.save(); g.translate(cx * U, cy * U); g.rotate(-0.9 + headRot * 0.5);
  g.fillStyle = DOG.collar; rrect(g, -9 * U, -2 * U, 18 * U, 4 * U, 2 * U); g.fill();
  g.fillStyle = '#c0c6ce'; g.fillRect(-1 * U, -2 * U, 2 * U, 4 * U);
  const tagSw = Math.sin(t * 14) * 0.5;
  g.save(); g.translate(5 * U, 2 * U); g.rotate(tagSw); g.fillStyle = lingrad(g, -3 * U, 0, 3 * U, 0, [[0, '#8f979f'], [0.5, '#f4f6f8'], [1, '#aab2ba']]); circle(g, 0, 4 * U, 2.8 * U); g.fill(); g.strokeStyle = '#777'; g.lineWidth = 0.4 * U; g.stroke(); g.restore();
  g.restore();
  const out = { collar: [x + dir * cx * U, y + cy * U] };
  // head
  g.save(); g.translate(hX * U, hY * U); g.rotate(headRot + (st.tilt || 0));
  const bark = st.bark ? Math.max(0, Math.sin(t * 11)) : 0;
  const growl = mode === 'growl';
  // ears (behind = far ear)
  const earBack = growl || st.earsBack;
  const earA = st.earsUp ? -0.5 : earBack ? 0.9 : 0.15 + Math.sin(t * 6) * 0.05 * (mode === 'walk' || mode === 'run' ? 3 : 1);
  g.fillStyle = DOG.dark; g.save(); g.translate(-2 * U, -5 * U); g.rotate(earA + 0.2); ellipse(g, -2 * U, 7 * U, 4.5 * U, 8 * U, 0.2); g.fill(); g.restore();
  // skull
  g.fillStyle = lingrad(g, 0, -9 * U, 0, 8 * U, [[0, shade(DOG.coat, 0.1)], [1, DOG.coat]]); circle(g, 0, 0, 8.5 * U); g.fill();
  // muzzle (jaw drops when barking / growl)
  const jaw = growl ? 0.12 : bark * 0.45 + (st.pant ? 0.15 + 0.05 * Math.sin(t * 12) : 0);
  g.fillStyle = DOG.light; g.save(); g.translate(6 * U, 3 * U); g.rotate(jaw);
  rrect(g, 0, -1 * U, 10 * U, 5 * U, 2.5 * U); g.fill(); g.restore();
  if (st.pant && !growl) { g.fillStyle = '#e8737f'; g.save(); g.translate(8 * U, 6 * U); g.rotate(jaw); ellipse(g, 3 * U, 2 * U, 3 * U, 4.5 * U + Math.sin(t * 12) * 0.5 * U); g.fill(); g.restore(); }
  g.fillStyle = shade(DOG.coat, 0.15); rrect(g, 5 * U, -4.5 * U, 13 * U, 7 * U, 3.5 * U); g.fill();     // snout
  if (growl) { // lip curl + teeth
    g.fillStyle = '#5a1e22'; poly(g, [8 * U, 1.5 * U, 17 * U, 1 * U, 16 * U, 4.5 * U, 8 * U, 4 * U]); g.fill();
    g.fillStyle = '#fffaf0'; for (let k = 0; k < 4; k++) { poly(g, [(9 + k * 2) * U, 1.5 * U, (10 + k * 2) * U, 1.5 * U, (9.5 + k * 2) * U, (3.5 + (k === 0 ? 1 : 0)) * U]); g.fill(); }
    poly(g, [9 * U, 4 * U, 10.5 * U, 4 * U, 9.8 * U, 2.6 * U]); g.fill();
    g.strokeStyle = shade(DOG.coat, -0.35); g.lineWidth = 0.6 * U; for (let k = 0; k < 3; k++) line(g, (8 + k * 2.5) * U, -3.5 * U, (9 + k * 2.5) * U, -1 * U);  // wrinkles
  } else if (bark > 0.1) { g.fillStyle = '#5a1e22'; poly(g, [8 * U, 2 * U, 17 * U, 2 * U, 15 * U, (2 + bark * 5) * U]); g.fill(); }
  g.fillStyle = DOG.nose; ellipse(g, 17.5 * U, -2.5 * U, 2.6 * U, 2 * U); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.4)'; circle(g, 17 * U, -3.3 * U, 0.7 * U); g.fill();
  // eye
  const blink = st.noBlink ? 0 : blinkAmt(t, 99);
  g.fillStyle = '#1a0f08'; ellipse(g, 4.5 * U, -3.5 * U, 1.9 * U, 1.9 * U * (1 - blink)); g.fill();
  g.fillStyle = DOG.eye; circle(g, 4.6 * U, -3.5 * U, 1.3 * U * (1 - blink)); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.85)'; circle(g, 5 * U, -4 * U, 0.5 * U); g.fill();
  g.strokeStyle = shade(DOG.coat, -0.3); g.lineWidth = 0.8 * U; line(g, 2.5 * U, (growl ? -6.5 : -6) * U, 6.5 * U, (growl ? -5 : -6.2) * U); // brow
  // near ear
  g.fillStyle = shade(DOG.coat, -0.08); g.save(); g.translate(-3 * U, -5 * U); g.rotate(earA); ellipse(g, -1 * U, 7 * U, 4.8 * U, 8.5 * U, 0.15); g.fill();
  g.fillStyle = 'rgba(255,230,170,0.25)'; ellipse(g, 0, 4 * U, 2 * U, 5 * U, 0.15); g.fill(); g.restore();
  g.restore();
  g.restore(); // body rotation
  g.restore(); // root transform
  // world-space nose for sound lines
  const hxW = x + dir * (hX + 18) * U, hyW = y + (hY - 2) * U;
  if (bark > 0.2 || st.soundLines) {
    g.save(); g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 2.2 * U; g.lineCap = 'round';
    for (let k = 0; k < 3; k++) { const a = (k - 1) * 0.5; const r0 = 6 * U; line(g, hxW + dir * Math.cos(a) * r0, hyW + Math.sin(a) * r0, hxW + dir * Math.cos(a) * (r0 + 6 * U), hyW + Math.sin(a) * (r0 + 6 * U)); }
    g.restore();
  }
  out.nose = [hxW, hyW];
  return out;
}
// leash: catenary from hand to collar (tight = straight)
function drawLeash(g, a, b, slack, s = 1) {
  g.save(); g.strokeStyle = '#c1121f'; g.lineWidth = 3.2 * s; g.lineCap = 'round';
  const mx = (a[0] + b[0]) / 2, my = Math.max(a[1], b[1]) + slack;
  g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo(mx, my, b[0], b[1]); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = 1 * s; g.stroke();
  g.restore();
}
