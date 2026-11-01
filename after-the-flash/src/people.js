// ============================================================================
// people.js — articulated puppet rig (head, neck, torso, upper/fore arms,
// hands, thighs, shins, feet), faces (moving pupils, blinks, brows, mouth
// shapes, cheeks), pose cycles, main cast and the seeded crowd generator.
// Units: a standing adult is 100 units tall; s = pixels per unit.
// ============================================================================
const SKINS = ['#f3d2b8', '#e8b896', '#d9a07a', '#c68a5c', '#b07548', '#8d5a3a', '#6e4429', '#f0c8a0', '#a8724e', '#4f3020'];
const HAIRC = ['#1d140f', '#2b1d14', '#3b2618', '#5a3a22', '#7a5532', '#b8925a', '#d9b77a', '#8a8a8f', '#c94f2a', '#111111'];
const PALETTES = [
  { top: '#3a5a8c', bottom: '#2b2b33', shoes: '#1a1a1a', acc: '#e9c46a' }, { top: '#c0392b', bottom: '#34495e', shoes: '#f4f4f4', acc: '#222' },
  { top: '#e9c46a', bottom: '#264653', shoes: '#5a3a22', acc: '#2a9d8f' }, { top: '#2a9d8f', bottom: '#3d405b', shoes: '#111', acc: '#f4a261' },
  { top: '#8e44ad', bottom: '#2c3e50', shoes: '#ddd', acc: '#f1c40f' }, { top: '#f4a261', bottom: '#5c4033', shoes: '#222', acc: '#264653' },
  { top: '#ecf0f1', bottom: '#1f3a5f', shoes: '#8b5e3c', acc: '#c0392b' }, { top: '#6d6875', bottom: '#b5838d', shoes: '#333', acc: '#ffcdb2' },
  { top: '#1d3557', bottom: '#a8dadc', shoes: '#f1faee', acc: '#e63946' }, { top: '#606c38', bottom: '#283618', shoes: '#dda15e', acc: '#fefae0' },
  { top: '#bc4749', bottom: '#386641', shoes: '#f2e8cf', acc: '#6a994e' }, { top: '#22223b', bottom: '#4a4e69', shoes: '#9a8c98', acc: '#f2e9e4' },
  { top: '#ff006e', bottom: '#3a0ca3', shoes: '#fff', acc: '#ffbe0b' }, { top: '#fb8500', bottom: '#023047', shoes: '#8ecae6', acc: '#219ebc' },
  { top: '#588157', bottom: '#344e41', shoes: '#a3b18a', acc: '#dad7cd' }, { top: '#9d0208', bottom: '#370617', shoes: '#ffba08', acc: '#faa307' },
  { top: '#457b9d', bottom: '#e5e5e5', shoes: '#1d3557', acc: '#e63946' }, { top: '#b08968', bottom: '#7f5539', shoes: '#ede0d4', acc: '#9c6644' },
  { top: '#f2cc8f', bottom: '#3d405b', shoes: '#81b29a', acc: '#e07a5f' }, { top: '#5e548e', bottom: '#231942', shoes: '#be95c4', acc: '#e0b1cb' },
];
const BODIES = [{ wf: 0.85, hf: 1.0 }, { wf: 1.0, hf: 1.0 }, { wf: 1.2, hf: 1.03 }, { wf: 1.38, hf: 0.97 }, { wf: 0.95, hf: 1.1 }, { wf: 1.0, hf: 0.9 }];
const HAIRSTYLES = ['short', 'sidepart', 'buzz', 'bun', 'ponytail', 'long', 'afro', 'bob', 'braids', 'bald', 'beanie', 'curly'];
const ACCS = ['briefcase', 'tote', 'headphones', 'stroller', 'umbrella', 'skateboard', 'delivery', 'helmet', null, null, null];
const pal = seed => PALETTES[seed % PALETTES.length];

// ---------------------------------------------------------------- MAIN CAST
const YOU = {
  name: 'you', skin: '#d9a07a', hair: { style: 'sidepart', color: '#3b2618' }, stubble: true, eye: '#5a3a1e',
  top: '#5f6b3a', topDark: '#4a5430', cuff: '#434b2b', hood: '#9aa0a6', bottom: '#2a3f66', shoes: '#f4f4f4', sole: '#9a9a9a',
  wf: 1.05, hf: 1.0, backpack: true, zipper: true, male: true,
};
const ROSA = {
  name: 'rosa', skin: '#c68a5c', hair: { style: 'bun', color: '#b9b9bd' }, eye: '#3b2a1e', glasses: true,
  top: '#1f2a44', topDark: '#161e33', cuff: '#161e33', bottom: '#1f2a44', shoes: '#151515', sole: '#333',
  wf: 1.12, hf: 0.95, vest: true, keys: true, age: 55,
};
const MAN = {
  name: 'man', skin: '#e0b394', hair: { style: 'short', color: '#4a4440' }, eye: '#3a3a3a', stubble: true,
  top: '#6e7178', topDark: '#55585e', cuff: '#55585e', bottom: '#5d6066', shoes: '#2a1d14', sole: '#111',
  wf: 1.08, hf: 1.02, suit: true, tie: '#7a1f2a', dust: true, cut: true, torn: true, male: true,
};
const GIRL = {
  name: 'girl', skin: '#a8724e', hair: { style: 'braids', color: '#1d140f' }, eye: '#1a120c',
  top: '#ffd31a', topDark: '#e0b000', cuff: '#e0b000', bottom: '#3d4a6b', shoes: '#c0392b', sole: '#7a1f1f',
  wf: 0.9, hf: 0.66, headS: 1.35, raincoat: true, rabbit: true, child: true,
};
const DRIVER = { name: 'driver', skin: '#8d5a3a', hair: { style: 'short', color: '#111' }, eye: '#222', top: '#3d5a80', topDark: '#2c4460', cuff: '#2c4460', bottom: '#2b2d42', shoes: '#111', sole: '#222', wf: 1.15, hf: 1.0, male: true, cap: '#2c4460' };
const VENDOR = { name: 'vendor', skin: '#b07548', hair: { style: 'short', color: '#1d140f' }, eye: '#222', top: '#ffffff', topDark: '#dddddd', cuff: '#ddd', bottom: '#333a44', shoes: '#222', sole: '#111', wf: 1.25, hf: 0.98, apron: true, male: true, cap: '#c0392b', stubble: true };

// ---------------------------------------------------------------- CROWD GENERATOR
function genPerson(i) {
  const b = BODIES[ri(0, 5)];
  const p = pal(ri(0, 19));
  const female = RNG() < 0.5;
  const hs = female ? pick(['bun', 'ponytail', 'long', 'afro', 'bob', 'braids', 'curly', 'beanie']) : pick(['short', 'sidepart', 'buzz', 'afro', 'bald', 'beanie', 'curly', 'short']);
  return {
    name: 'crowd' + i, id: i, skin: SKINS[ri(0, 9)], hair: { style: hs, color: HAIRC[ri(0, 9)] }, eye: '#2a1d14',
    top: p.top, topDark: shade(p.top, -0.25), cuff: shade(p.top, -0.3), bottom: p.bottom, shoes: p.shoes, sole: shade(p.shoes, -0.3),
    wf: b.wf, hf: b.hf * rr(0.95, 1.04), acc: pick(ACCS), accCol: p.acc, coat: RNG() < 0.35, skirt: female && RNG() < 0.3,
    stubble: !female && RNG() < 0.3, glasses: RNG() < 0.15, male: !female, seed: i * 7.13,
  };
}
const CROWD = [];
function buildCrowd() { for (let i = 0; i < 90; i++) CROWD.push(genPerson(i)); }

// ---------------------------------------------------------------- HELPERS
function limb(g, x1, y1, x2, y2, w, col) { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
function blinkAmt(t, seed) {
  const per = 2 + hash(seed * 1.3) * 3, ph = (t + hash(seed) * 5) % per;
  return ph < 0.13 ? Math.sin(ph / 0.13 * Math.PI) : 0;
}
// ---------------------------------------------------------------- POSES (side view)
// P: {lean,bob,sx,head,turn,sh:[n,f],el:[n,f],hip:[n,f],kn:[n,f],ft:[n,f],rot,expr,look,armsUp}
function poseIdle(t, seed = 0) {
  const b = Math.sin(t * 2.2 + seed);
  return { lean: 0.02, bob: b * 0.35, chest: b, head: Math.sin(t * 0.7 + seed) * 0.04, sh: [0.06 + b * 0.02, -0.04], el: [0.15, 0.12], hip: [0.02, -0.02], kn: [0.04, 0.04], ft: [0, 0] };
}
function poseWalk(ph, amp = 1) {
  const a = Math.sin(ph * TAU), c = Math.cos(ph * TAU), c2 = Math.cos((ph + 0.5) * TAU);
  return {
    lean: 0.05, bob: -1.4 * Math.cos(ph * 2 * TAU) * amp, head: 0.02,
    hip: [0.42 * a * amp, -0.42 * a * amp], kn: [0.08 + 0.85 * Math.pow(Math.max(0, c), 2) * amp, 0.08 + 0.85 * Math.pow(Math.max(0, c2), 2) * amp],
    sh: [-0.38 * a * amp, 0.38 * a * amp], el: [0.25 + 0.2 * Math.max(0, -a), 0.25 + 0.2 * Math.max(0, a)], ft: [0.2 * c, 0.2 * c2],
  };
}
function poseRun(ph, amp = 1) {
  const a = Math.sin(ph * TAU), c = Math.cos(ph * TAU), c2 = -c;
  return {
    lean: 0.21, bob: -3.2 * Math.abs(Math.cos(ph * TAU)) + 1.5, head: -0.12,
    hip: [0.8 * a * amp, -0.8 * a * amp], kn: [0.25 + 1.5 * Math.max(0, c) * amp, 0.25 + 1.5 * Math.max(0, c2) * amp],
    sh: [-0.9 * a, 0.9 * a], el: [1.55, 1.55], ft: [0.3 * c, 0.3 * c2],
  };
}
function posePanic(ph, t, seed = 0) {
  const P = poseRun(ph, 1.05);
  P.turn = Math.sin(t * 1.3 + seed) > -0.2 ? 1 : 0;   // head looking back
  P.sh = [-2.2 + Math.sin(t * 11 + seed) * 0.7, -1.4 + Math.sin(t * 9 + seed) * 0.8];
  P.el = [0.6 + Math.sin(t * 13) * 0.5, 0.9];
  P.expr = 'scream';
  return P;
}
function posePhone(t, seed = 0) {
  const P = poseIdle(t, seed); P.sh = [0.55, 0.45]; P.el = [1.95, 1.9]; P.head = 0.38; P.look = [0.3, 0.8]; P.phone = true; return P;
}
function posePoint(t, seed = 0) { const P = poseIdle(t, seed); P.sh = [-2.55, 0.1]; P.el = [0.05, 0.2]; P.head = -0.45; P.look = [0.5, -1]; P.expr = 'fear'; return P; }
function poseCrouch(t) { return { lean: 0.75, bob: 22, head: -0.5, hip: [1.35, 1.2], kn: [2.3, 2.1], sh: [-2.6, -2.4], el: [2.0, 2.0], ft: [0, 0], expr: 'fear' }; }
function poseHelp(t) { return { lean: 0.85, bob: 14, head: -0.6, hip: [1.0, 0.4], kn: [1.6, 0.6], sh: [1.2, 0.9], el: [0.2, 0.3], ft: [0, 0], expr: 'fear' }; }
function poseSit(t, seed = 0) { // sitting on the floor hugging knees
  const b = Math.sin(t * 2 + seed) * 0.5;
  return { lean: 0.32, bob: 37 + b, head: 0.18, hip: [2.0, 1.9], kn: [2.75, 2.7], sh: [0.9, 0.85], el: [0.9, 0.95], ft: [0.2, 0.2], expr: 'fear', sit: true };
}
function poseTrip(u) { // u: 0..1 fall then get up
  const f = u < 0.4 ? easeOut(u / 0.4) : u < 0.7 ? 1 : 1 - easeInOut((u - 0.7) / 0.3);
  return { lean: 0.2 + f * 1.1, bob: f * 34, head: -0.3 * f, hip: [0.5 - f * 0.2, -0.4 + f * 1.4], kn: [0.5 + f * 1.2, 0.3 + f * 1.5], sh: [-1.2 * f + 0.3, -0.9 * f], el: [0.2, 0.3], ft: [0, 0], expr: 'fear' };
}
function blendPose(A, B, u) {
  const o = {};
  for (const k in A) {
    const a = A[k], b = B[k];
    if (Array.isArray(a) && Array.isArray(b)) o[k] = a.map((v, i) => lerp(v, b[i], u));
    else if (typeof a === 'number' && typeof b === 'number') o[k] = lerp(a, b, u);
    else o[k] = u < 0.5 ? a : (b == null ? a : b);
  }
  for (const k in B) if (!(k in o)) o[k] = B[k];
  return o;
}

// ---------------------------------------------------------------- HAIR
function hairBack(g, C, x, y, r, view, dir) {
  const hs = C.hair.style, col = C.hair.color;
  g.fillStyle = shade(col, -0.15);
  if (hs === 'long') { if (view === 'front') { rrect(g, x - r * 1.0, y - r * 0.6, r * 2.0, r * 2.3, r * 0.8); g.fill(); } else { poly(g, [x - r * 0.95, y - r * 0.4, x + r * 0.1, y - r * 0.6, x + r * 0.1, y + r * 1.9, x - r * 0.9, y + r * 1.8]); g.fill(); } }
  if (hs === 'afro') { circle(g, x - (view === 'side' ? r * 0.15 : 0), y - r * 0.25, r * 1.45); g.fill(); }
  if (hs === 'ponytail' && view === 'side') { const sw = Math.sin(performanceT * 6 + r) * 0.2; g.save(); g.translate(x - r * 0.9, y - r * 0.4); g.rotate(0.5 + sw); ellipse(g, 0, r * 0.7, r * 0.32, r * 0.85); g.fill(); g.restore(); }
  if (hs === 'braids') {
    const sw = Math.sin(performanceT * 2) * 0.05;
    const sides = view === 'front' ? [-1, 1] : [-0.6];
    sides.forEach(sd => { g.save(); g.translate(x + sd * r * 0.85, y + r * 0.2); g.rotate(sw * sd);
      for (let k = 0; k < 6; k++) { g.fillStyle = k % 2 ? col : shade(col, 0.15); ellipse(g, 0, k * r * 0.3, r * 0.17, r * 0.19); g.fill(); }
      g.fillStyle = '#e63946'; circle(g, 0, r * 1.85, r * 0.09); g.fill(); g.restore(); });
  }
  if (hs === 'bob' && view === 'front') { rrect(g, x - r * 1.02, y - r * 0.7, r * 2.04, r * 1.65, r * 0.6); g.fill(); }
}
function hairFront(g, C, x, y, r, view, big) {
  const hs = C.hair.style, col = C.hair.color;
  g.fillStyle = col;
  if (view === 'front') {
    if (hs === 'bald') { g.fillStyle = 'rgba(255,255,255,0.18)'; ellipse(g, x - r * 0.25, y - r * 0.7, r * 0.3, r * 0.15); g.fill(); return; }
    if (hs === 'beanie') { g.fillStyle = C.accCol || '#c0392b'; g.beginPath(); g.arc(x, y - r * 0.3, r * 0.98, Math.PI, 0); g.fill(); g.fillRect(x - r, y - r * 0.4, r * 2, r * 0.3); g.fillStyle = shade(C.accCol || '#c0392b', -0.2); g.fillRect(x - r, y - r * 0.38, r * 2, r * 0.12); return; }
    if (hs === 'buzz') { g.fillStyle = rgba(col, 0.75); g.beginPath(); g.arc(x, y - r * 0.15, r * 0.9, Math.PI * 1.05, -0.05 * Math.PI); g.fill(); return; }
    if (hs === 'afro') { circle(g, x, y - r * 0.55, r * 1.05); g.fill(); return; }
    if (hs === 'curly') { for (let k = 0; k < 7; k++) { circle(g, x - r * 0.8 + k * r * 0.27, y - r * 0.75 - Math.sin(k) * r * 0.1, r * 0.3); g.fill(); } return; }
    // cap of hair
    g.beginPath(); g.moveTo(x - r * 0.9, y - r * 0.05); g.bezierCurveTo(x - r * 1.0, y - r * 0.9, x - r * 0.5, y - r * 1.22, x, y - r * 1.2);
    g.bezierCurveTo(x + r * 0.55, y - r * 1.2, x + r * 1.0, y - r * 0.9, x + r * 0.9, y - r * 0.05); g.lineTo(x + r * 0.8, y - r * 0.2);
    g.quadraticCurveTo(x + r * 0.7, y - r * 0.62, x + r * 0.3, y - r * 0.66); g.quadraticCurveTo(x - r * 0.2, y - r * 0.7, x - r * 0.62, y - r * 0.55);
    g.quadraticCurveTo(x - r * 0.8, y - r * 0.45, x - r * 0.82, y - r * 0.2); g.closePath(); g.fill();
    if (hs === 'sidepart') { // swoop with side part
      g.beginPath(); g.moveTo(x - r * 0.9, y - r * 0.3); g.quadraticCurveTo(x - r * 0.5, y - r * 1.15, x + r * 0.35, y - r * 1.0); g.quadraticCurveTo(x + r * 0.9, y - r * 0.85, x + r * 0.92, y - r * 0.25);
      g.quadraticCurveTo(x + r * 0.5, y - r * 0.62, x - r * 0.2, y - r * 0.62); g.quadraticCurveTo(x - r * 0.6, y - r * 0.6, x - r * 0.9, y - r * 0.3); g.fill();
      g.strokeStyle = shade(col, -0.35); g.lineWidth = Math.max(1, r * 0.04); line(g, x - r * 0.35, y - r * 1.02, x - r * 0.42, y - r * 0.7);
      if (big) { g.strokeStyle = shade(col, 0.25); g.lineWidth = r * 0.02; for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(x - r * 0.3 + k * r * 0.18, y - r * 0.98); g.quadraticCurveTo(x + k * r * 0.12, y - r * 0.85, x + r * 0.2 + k * r * 0.12, y - r * 0.68); g.stroke(); } }
    }
    if (hs === 'bun') { circle(g, x, y - r * 1.12, r * 0.38); g.fill(); g.fillStyle = shade(col, -0.2); g.fillRect(x - r * 0.32, y - r * 0.86, r * 0.64, r * 0.08); }
    if (hs === 'ponytail') { g.fillRect(x - r * 0.15, y - r * 1.05, r * 0.3, r * 0.15); }
    if (hs === 'braids') { g.strokeStyle = shade(col, 0.2); g.lineWidth = Math.max(1, r * 0.04); line(g, x, y - r * 1.05, x, y - r * 0.65); }
  } else { // side, facing +x
    if (hs === 'bald') return;
    if (hs === 'beanie') { g.fillStyle = C.accCol || '#c0392b'; g.beginPath(); g.arc(x - r * 0.05, y - r * 0.25, r * 1.0, Math.PI * 0.95, Math.PI * 2.05); g.fill(); return; }
    if (hs === 'afro') return;
    const a0 = hs === 'buzz' ? 0.85 : 0.7;
    g.fillStyle = hs === 'buzz' ? rgba(col, 0.75) : col;
    g.beginPath(); g.moveTo(x + r * 0.75, y - r * 0.45);
    g.quadraticCurveTo(x + r * 0.55, y - r * 1.15, x - r * 0.2, y - r * 1.05);
    g.quadraticCurveTo(x - r * 1.1, y - r * 0.9, x - r * 1.0, y + r * (hs === 'bob' || hs === 'long' ? 0.75 : 0.35));
    g.lineTo(x - r * 0.55, y + r * (hs === 'bob' ? 0.8 : 0.3)); g.quadraticCurveTo(x - r * 0.3, y - r * 0.3, x + r * 0.2, y - r * 0.55); g.closePath(); g.fill();
    if (hs === 'sidepart') { g.beginPath(); g.moveTo(x + r * 0.85, y - r * 0.5); g.quadraticCurveTo(x + r * 0.7, y - r * 1.2, x - r * 0.1, y - r * 1.12); g.lineTo(x + r * 0.2, y - r * 0.7); g.closePath(); g.fill(); }
    if (hs === 'bun') { circle(g, x - r * 0.75, y - r * 0.75, r * 0.4); g.fill(); }
    if (hs === 'curly') for (let k = 0; k < 5; k++) { circle(g, x - r * 0.7 + k * r * 0.35, y - r * 0.9 + Math.abs(k - 2) * r * 0.08, r * 0.3); g.fill(); }
  }
}
let performanceT = 0;   // current scene time for secondary motion (set each frame)

// ---------------------------------------------------------------- FACE (front)
function drawHeadFront(g, C, x, y, r, o = {}) {
  const big = r > 40, expr = o.expr || 'neutral', look = o.look || [0, 0];
  const blink = o.noBlink ? 0 : (o.blink != null ? o.blink : blinkAmt(o.t || 0, (C.seed || 0) + C.name.length));
  hairBack(g, C, x, y, r, 'front');
  // neck
  g.fillStyle = shade(C.skin, -0.18); g.fillRect(x - r * 0.32, y + r * 0.6, r * 0.64, r * 0.7);
  // ears
  g.fillStyle = shade(C.skin, -0.05); ellipse(g, x - r * 0.88, y + r * 0.05, r * 0.16, r * 0.24); g.fill(); ellipse(g, x + r * 0.88, y + r * 0.05, r * 0.16, r * 0.24); g.fill();
  // face
  g.fillStyle = big ? lingrad(g, x - r, 0, x + r, 0, [[0, shade(C.skin, -0.12)], [0.55, C.skin], [1, shade(C.skin, 0.12)]]) : C.skin;
  g.beginPath(); g.moveTo(x - r * 0.86, y - r * 0.2); g.bezierCurveTo(x - r * 0.9, y + r * 0.6, x - r * 0.45, y + r * 1.0, x, y + r * 1.02);
  g.bezierCurveTo(x + r * 0.45, y + r * 1.0, x + r * 0.9, y + r * 0.6, x + r * 0.86, y - r * 0.2); g.bezierCurveTo(x + r * 0.86, y - r * 1.05, x - r * 0.86, y - r * 1.05, x - r * 0.86, y - r * 0.2); g.fill();
  if (o.red) { g.fillStyle = `rgba(255,40,40,${0.35 * o.red})`; g.fill(); }
  if (o.redSide) { g.save(); g.clip(); g.fillStyle = radgrad(g, x + r * 0.3, y + r * 1.4, 0, r * 2, [[0, `rgba(255,30,30,${0.55 * o.redSide})`], [1, 'rgba(255,30,30,0)']]); g.fillRect(x - r * 2, y - r * 2, r * 4, r * 4); g.restore(); }
  // rim light (sun from right)
  if (big && !o.noRim) { g.save(); g.clip(); g.fillStyle = 'rgba(255,215,160,0.35)'; ellipse(g, x + r * 0.95, y, r * 0.25, r * 1.1); g.fill(); g.restore(); }
  // stubble
  if (C.stubble) { g.fillStyle = rgba('#3a2a20', big ? 0.18 : 0.14); g.beginPath(); g.moveTo(x - r * 0.8, y + r * 0.2); g.bezierCurveTo(x - r * 0.75, y + r * 0.85, x - r * 0.3, y + r * 1.02, x, y + r * 1.02); g.bezierCurveTo(x + r * 0.3, y + r * 1.02, x + r * 0.75, y + r * 0.85, x + r * 0.8, y + r * 0.2); g.quadraticCurveTo(x, y + r * 0.45, x - r * 0.8, y + r * 0.2); g.fill();
    if (big) { g.fillStyle = 'rgba(40,28,20,0.16)'; for (let k = 0; k < 90; k++) { const a = hash(k) * Math.PI, rad = 0.55 + hash(k + 3) * 0.42; circle(g, x + Math.cos(a) * r * rad * 0.85, y + r * 0.35 + Math.sin(a) * r * rad * 0.62, r * 0.012); g.fill(); } } }
  // cheeks
  g.fillStyle = 'rgba(230,110,100,0.22)'; ellipse(g, x - r * 0.5, y + r * 0.35, r * 0.18, r * 0.11); g.fill(); ellipse(g, x + r * 0.5, y + r * 0.35, r * 0.18, r * 0.11); g.fill();
  // cut on forehead
  if (C.cut) { g.strokeStyle = '#5a2a22'; g.lineWidth = Math.max(1, r * 0.04); line(g, x + r * 0.2, y - r * 0.55, x + r * 0.42, y - r * 0.45); }
  if (C.dust) { g.fillStyle = 'rgba(160,155,150,0.35)'; for (let k = 0; k < 10; k++) { circle(g, x + (hash(k) - 0.5) * r * 1.4, y + (hash(k + 2) - 0.6) * r * 1.4, r * 0.05); g.fill(); } }
  // eyes
  const ey = y - r * 0.02, ex = r * 0.34, ew = r * (C.child ? 0.2 : 0.17), eh = r * (C.child ? 0.16 : 0.12) * (expr === 'fear' || expr === 'scream' || expr === 'wide' ? 1.35 : 1);
  [-1, 1].forEach(sd => {
    const cx = x + sd * ex;
    g.fillStyle = '#fbfbf8'; ellipse(g, cx, ey, ew, eh); g.fill();
    g.save(); ellipse(g, cx, ey, ew, eh); g.clip();
    const ix = cx + look[0] * ew * 0.45, iy = ey + look[1] * eh * 0.45;
    g.fillStyle = C.eye || '#3a2a1a'; circle(g, ix, iy, eh * 0.85); g.fill();
    g.fillStyle = '#0b0b0b'; circle(g, ix, iy, eh * (expr === 'fear' ? 0.32 : 0.45)); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.95)'; circle(g, ix + eh * 0.3, iy - eh * 0.3, eh * 0.22); g.fill();
    if (o.redEyes) { g.fillStyle = `rgba(255,60,60,${0.5 * o.redEyes})`; circle(g, ix - eh * 0.25, iy + eh * 0.2, eh * 0.18); g.fill(); }
    // eyelids (blink)
    if (blink > 0.02) { g.fillStyle = shade(C.skin, -0.08); g.fillRect(cx - ew, ey - eh, ew * 2, eh * 2 * blink); }
    g.restore();
    g.strokeStyle = 'rgba(40,25,20,0.8)'; g.lineWidth = Math.max(1, r * 0.03); g.beginPath(); g.ellipse(cx, ey, ew, eh, 0, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    if (big) { g.lineWidth = r * 0.012; for (let k = 0; k < 5; k++) line(g, cx - ew * 0.6 + k * ew * 0.3, ey - eh * 0.95, cx - ew * 0.65 + k * ew * 0.32, ey - eh * 1.25); }
  });
  // brows
  const bAng = { neutral: 0, smile: -0.05, talk: 0, scream: 0.35, fear: 0.4, shout: -0.3, determined: -0.25, worried: 0.3, wide: 0.15 }[expr] || 0;
  g.strokeStyle = shade(C.hair.style === 'bald' ? '#3a2a20' : C.hair.color, -0.1); g.lineWidth = Math.max(1.5, r * (C.child ? 0.06 : 0.075)); g.lineCap = 'round';
  [-1, 1].forEach(sd => {
    const bx = x + sd * ex, by = ey - r * (expr === 'fear' || expr === 'wide' || expr === 'scream' ? 0.33 : 0.26);
    g.beginPath(); g.moveTo(bx - sd * r * 0.16, by + Math.sin(bAng) * r * 0.1 * 1); g.lineTo(bx + sd * r * 0.16, by - Math.sin(bAng) * r * 0.08); g.stroke();
  });
  // glasses
  if (C.glasses && !o.glassesOff) { g.strokeStyle = '#3a3a3a'; g.lineWidth = Math.max(1, r * 0.035); [-1, 1].forEach(sd => { rrect(g, x + sd * ex - ew * 1.25, ey - eh * 1.4, ew * 2.5, eh * 2.6, r * 0.06); g.stroke(); }); line(g, x - ex + ew * 1.25, ey, x + ex - ew * 1.25, ey); }
  // nose
  g.strokeStyle = shade(C.skin, -0.3); g.lineWidth = Math.max(1, r * 0.035);
  g.beginPath(); g.moveTo(x + r * 0.02, y + r * 0.05); g.quadraticCurveTo(x + r * 0.1, y + r * 0.25, x - r * 0.05, y + r * 0.3); g.stroke();
  if (big) { g.fillStyle = shade(C.skin, -0.25); ellipse(g, x - r * 0.08, y + r * 0.31, r * 0.035, r * 0.02); g.fill(); ellipse(g, x + r * 0.08, y + r * 0.31, r * 0.035, r * 0.02); g.fill(); }
  // mouth
  const my = y + r * 0.52;
  const talk = expr === 'talk' || expr === 'shout' ? 0.4 + 0.6 * Math.abs(Math.sin((o.t || 0) * 14)) : 0;
  g.fillStyle = '#4a1c1c'; g.strokeStyle = shade(C.skin, -0.45); g.lineWidth = Math.max(1, r * 0.04);
  if (expr === 'smile') { g.beginPath(); g.moveTo(x - r * 0.22, my - r * 0.03); g.quadraticCurveTo(x, my + r * 0.18, x + r * 0.22, my - r * 0.03); g.stroke(); }
  else if (expr === 'scream') { ellipse(g, x, my + r * 0.08, r * 0.17, r * 0.24); g.fill(); g.fillStyle = '#f1e9e0'; g.fillRect(x - r * 0.12, my - r * 0.14, r * 0.24, r * 0.06); }
  else if (expr === 'fear' || expr === 'wide') { ellipse(g, x, my + r * 0.03, r * 0.1, r * 0.08 + (o.breath || 0) * r * 0.04); g.fill(); }
  else if (expr === 'shout') { g.beginPath(); g.moveTo(x - r * 0.22, my - r * 0.06); g.lineTo(x + r * 0.22, my - r * 0.06); g.lineTo(x + r * 0.15, my + r * 0.16 + talk * r * 0.12); g.lineTo(x - r * 0.15, my + r * 0.16 + talk * r * 0.12); g.closePath(); g.fill(); g.fillStyle = '#f1e9e0'; g.fillRect(x - r * 0.18, my - r * 0.06, r * 0.36, r * 0.05); g.fillStyle = '#c45a5a'; ellipse(g, x, my + r * 0.12, r * 0.09, r * 0.04); g.fill(); }
  else if (expr === 'talk') { ellipse(g, x, my + r * 0.02, r * 0.14, r * 0.04 + talk * r * 0.08); g.fill(); }
  else if (expr === 'determined' || expr === 'worried') { g.beginPath(); g.moveTo(x - r * 0.18, my + (expr === 'worried' ? r * 0.04 : 0)); g.quadraticCurveTo(x, my - r * 0.04, x + r * 0.18, my + (expr === 'worried' ? r * 0.04 : 0)); g.stroke(); }
  else { g.beginPath(); g.moveTo(x - r * 0.16, my); g.quadraticCurveTo(x, my + r * 0.04, x + r * 0.16, my); g.stroke(); }
  if (big && expr !== 'scream' && expr !== 'shout') { g.fillStyle = 'rgba(190,100,95,0.35)'; ellipse(g, x, my + r * 0.07, r * 0.12, r * 0.035); g.fill(); }
  hairFront(g, C, x, y, r, 'front', big);
  if (C.cap) { g.fillStyle = C.cap; g.beginPath(); g.arc(x, y - r * 0.35, r * 0.95, Math.PI, 0); g.fill(); g.fillRect(x - r * 1.0, y - r * 0.42, r * 2.0, r * 0.14); }
}
// ---------------------------------------------------------------- FACE (side profile, facing +x)
function drawHeadSide(g, C, x, y, r, o = {}) {
  const expr = o.expr || 'neutral', look = o.look || [0, 0];
  const blink = o.noBlink ? 0 : (o.blink != null ? o.blink : blinkAmt(o.t || 0, (C.seed || 0) + C.name.length));
  hairBack(g, C, x, y, r, 'side');
  g.fillStyle = C.skin;
  g.beginPath(); g.moveTo(x - r * 0.2, y + r * 0.95);
  g.bezierCurveTo(x - r * 1.05, y + r * 0.7, x - r * 1.1, y - r * 1.0, x - r * 0.1, y - r * 1.02);
  g.bezierCurveTo(x + r * 0.55, y - r * 1.0, x + r * 0.85, y - r * 0.55, x + r * 0.88, y - r * 0.2);
  g.lineTo(x + r * 1.16, y + r * 0.14); g.lineTo(x + r * 0.92, y + r * 0.26);
  g.lineTo(x + r * 0.98, y + r * 0.46); g.lineTo(x + r * 0.9, y + r * 0.56);
  g.quadraticCurveTo(x + r * 0.92, y + r * 0.82, x + r * 0.6, y + r * 0.88); g.closePath(); g.fill();
  if (o.red) { g.fillStyle = `rgba(255,40,40,${0.45 * o.red})`; g.fill(); }
  if (C.stubble) { g.fillStyle = 'rgba(58,42,32,0.18)'; g.beginPath(); g.moveTo(x - r * 0.1, y + r * 0.2); g.lineTo(x + r * 0.9, y + r * 0.5); g.quadraticCurveTo(x + r * 0.9, y + r * 0.85, x + r * 0.55, y + r * 0.88); g.lineTo(x - r * 0.2, y + r * 0.9); g.closePath(); g.fill(); }
  g.fillStyle = shade(C.skin, -0.12); ellipse(g, x - r * 0.12, y + r * 0.08, r * 0.17, r * 0.24); g.fill();
  g.fillStyle = 'rgba(230,110,100,0.22)'; ellipse(g, x + r * 0.45, y + r * 0.35, r * 0.17, r * 0.1); g.fill();
  // eye
  const ex = x + r * 0.58, ey = y - r * 0.08, eh = r * (expr === 'fear' || expr === 'scream' ? 0.16 : 0.12);
  g.fillStyle = '#fbfbf8'; ellipse(g, ex, ey, r * 0.13, eh); g.fill();
  g.fillStyle = '#111'; circle(g, ex + r * 0.05 + look[0] * r * 0.03, ey + look[1] * eh * 0.4, eh * 0.6); g.fill();
  if (blink > 0.05) { g.fillStyle = shade(C.skin, -0.08); g.fillRect(ex - r * 0.15, ey - eh, r * 0.3, eh * 2 * blink); }
  // brow
  const bA = { scream: 0.3, fear: 0.35, shout: -0.3, determined: -0.25 }[expr] || 0;
  g.strokeStyle = shade(C.hair.color, -0.1); g.lineWidth = Math.max(1, r * 0.08); g.lineCap = 'round';
  line(g, ex - r * 0.16, ey - r * 0.24 + bA * r * 0.1, ex + r * 0.16, ey - r * 0.26 - bA * r * 0.1);
  if (C.glasses) { g.strokeStyle = '#333'; g.lineWidth = Math.max(1, r * 0.04); rrect(g, ex - r * 0.18, ey - r * 0.16, r * 0.34, r * 0.3, r * 0.05); g.stroke(); line(g, ex - r * 0.18, ey - r * 0.02, x - r * 0.1, y - r * 0.05); }
  // mouth
  g.fillStyle = '#4a1c1c';
  if (expr === 'scream' || expr === 'shout') { ellipse(g, x + r * 0.82, y + r * 0.5, r * 0.12, r * 0.16); g.fill(); }
  else if (expr === 'fear') { ellipse(g, x + r * 0.86, y + r * 0.5, r * 0.06, r * 0.07); g.fill(); }
  else if (expr === 'talk') { ellipse(g, x + r * 0.86, y + r * 0.5, r * 0.07, r * 0.03 + Math.abs(Math.sin((o.t || 0) * 13)) * r * 0.06); g.fill(); }
  else { g.strokeStyle = shade(C.skin, -0.45); g.lineWidth = Math.max(1, r * 0.04); line(g, x + r * 0.72, y + r * 0.5, x + r * 0.92, y + r * (expr === 'smile' ? 0.46 : 0.5)); }
  if (C.cut) { g.strokeStyle = '#5a2a22'; g.lineWidth = Math.max(1, r * 0.05); line(g, x + r * 0.45, y - r * 0.6, x + r * 0.7, y - r * 0.5); }
  hairFront(g, C, x, y, r, 'side');
  if (C.cap) { g.fillStyle = C.cap; g.beginPath(); g.arc(x - r * 0.05, y - r * 0.3, r * 1.0, Math.PI, 0); g.fill(); g.fillRect(x + r * 0.5, y - r * 0.42, r * 0.85, r * 0.14); }
  if (C.hood && !o.noHood) { g.fillStyle = C.hood; ellipse(g, x - r * 0.75, y + r * 1.2, r * 0.6, r * 0.32, -0.3); g.fill(); }
}

// ---------------------------------------------------------------- BODY (side view, facing dir)
// o: {t, expr, look, alert(0..1), coffee, leash: [x,y] world target, phone, red, noBlink, item}
function drawPersonSide(g, C, x, y, s, dir, P, o = {}) {
  const hf = C.hf || 1, wf = C.wf || 1, hs = (C.headS || 1);
  const out = {};
  if (o.shadow !== false) { aoShadow(g, x, y + 2, 22 * s * wf, 5 * s); castShadow(g, x, y, 22 * s * wf, 140 * s * hf, 0.14); }
  g.save(); g.translate(x, y); g.scale(dir, 1);
  if (P.rot) g.rotate(P.rot);
  const U = s;                      // px per unit
  const legU = 24 * hf * U, shinU = 23 * hf * U, torsoU = 30 * hf * U * (C.child ? 0.85 : 1), armU = 16 * hf * U, foreU = 15 * hf * U;
  const hipY = -(legU + shinU + 3 * U) + (P.bob || 0) * U, hipX = (P.sx || 0) * U;
  const lean = P.lean || 0;
  const shX = hipX + Math.sin(lean) * torsoU, shY = hipY - Math.cos(lean) * torsoU;
  const legPt = (a, k) => { const kx = hipX + Math.sin(a) * legU, ky = hipY + Math.cos(a) * legU; return [kx, ky, kx + Math.sin(a - k) * shinU, ky + Math.cos(a - k) * shinU]; };
  const armPt = (a, e) => { const sa = a + lean; const ex2 = shX + Math.sin(sa) * armU, ey2 = shY + Math.cos(sa) * armU; return [ex2, ey2, ex2 + Math.sin(sa + e) * foreU, ey2 + Math.cos(sa + e) * foreU]; };
  const L = [legPt(P.hip[0], P.kn[0]), legPt(P.hip[1], P.kn[1])];
  const A = [armPt(P.sh[0], P.el[0]), armPt(P.sh[1], P.el[1])];
  const legW = 10.5 * wf * U, armW = 7.5 * wf * U;
  const drawLeg = (l, far, ft) => {
    const col = far ? shade(C.bottom, -0.28) : C.bottom;
    limb(g, hipX, hipY, l[0], l[1], legW, col); limb(g, l[0], l[1], l[2], l[3], legW * 0.88, col);
    if (C.skirt) { /* legs visible: skin shins */ limb(g, l[0], l[1], l[2], l[3], legW * 0.6, far ? shade(C.skin, -0.2) : C.skin); }
    // shoe
    g.save(); g.translate(l[2], l[3]); g.rotate(ft || 0);
    g.fillStyle = far ? shade(C.shoes, -0.25) : C.shoes; rrect(g, -4 * U, -3 * U, 13 * U, 6 * U, 3 * U); g.fill();
    g.fillStyle = C.sole || '#888'; g.fillRect(-4 * U, 1.8 * U, 13 * U, 1.8 * U);
    if (C === YOU) { g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(2 * U, -2.5 * U, 1 * U, 4 * U); }
    g.restore();
  };
  const drawArm = (a, far, isNear) => {
    const col = far ? shade(C.top, -0.28) : C.top;
    limb(g, shX, shY, a[0], a[1], armW, col); limb(g, a[0], a[1], a[2], a[3], armW * 0.9, col);
    if (C === YOU || C.cuff) { const ux = a[2] - a[0], uy = a[3] - a[1], ln = Math.hypot(ux, uy) || 1; limb(g, a[2] - ux / ln * 2 * U, a[3] - uy / ln * 2 * U, a[2] - ux / ln * 0.4 * U, a[3] - uy / ln * 0.4 * U, armW * 0.95, far ? shade(C.cuff, -0.2) : C.cuff); }
    g.fillStyle = far ? shade(C.skin, -0.2) : C.skin; circle(g, a[2], a[3], 3.6 * U); g.fill();
  };
  // ---- far side
  drawArm(A[1], true);
  drawLeg(L[1], true, P.ft ? P.ft[1] : 0);
  if (C.backpack) { // black backpack on the back
    g.save(); g.translate((hipX + shX) / 2, (hipY + shY) / 2); g.rotate(lean);
    g.fillStyle = '#1b1c20'; rrect(g, -17 * U * wf, -14 * U, 11 * U, 26 * U, 4 * U); g.fill();
    g.fillStyle = '#2a2b31'; rrect(g, -19 * U * wf, -2 * U, 6 * U, 12 * U, 2 * U); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(-14 * U * wf, -12 * U, 2 * U, 22 * U);
    g.restore();
  }
  if (C.acc === 'delivery') { g.save(); g.translate((hipX + shX) / 2, (hipY + shY) / 2); g.rotate(lean); g.fillStyle = '#20bf55'; rrect(g, -26 * U, -18 * U, 18 * U, 22 * U, 2 * U); g.fill(); g.fillStyle = '#fff'; g.font = `800 ${4 * U}px Poppins`; g.fillText('EATS', -24 * U, -6 * U); g.restore(); }
  drawLeg(L[0], false, P.ft ? P.ft[0] : 0);
  // ---- torso
  g.save(); g.translate(hipX, hipY); g.rotate(lean);
  const tw = 15 * wf * U, th = torsoU;
  if (C.raincoat) { // flared yellow raincoat
    g.fillStyle = lingrad(g, -tw, 0, tw, 0, [[0, C.topDark], [0.6, C.top], [1, shade(C.top, 0.25)]]);
    poly(g, [-tw * 0.55, -th - 1 * U, tw * 0.5, -th - 1 * U, tw * 0.85, 9 * U, -tw * 0.85, 9 * U]); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.25)'; for (let k = 0; k < 3; k++) { circle(g, tw * 0.35, -th + 7 * U + k * 8 * U, 1.3 * U); g.fill(); }
  } else {
    const hem = C.coat || C.suit ? 8 * U : 2 * U;
    g.fillStyle = lingrad(g, -tw, 0, tw, 0, [[0, C.topDark], [0.65, C.top], [1, shade(C.top, 0.2)]]);
    g.beginPath(); g.moveTo(-tw * 0.5, hem); g.lineTo(-tw * 0.55, -th + 3 * U); g.quadraticCurveTo(-tw * 0.4, -th - 2 * U, 0, -th - 1.5 * U);
    g.quadraticCurveTo(tw * 0.45, -th - 1 * U, tw * 0.5, -th + 4 * U); g.quadraticCurveTo(tw * 0.62 + (C.wf > 1.2 ? 4 * U : 0), -th * 0.45, tw * 0.48, hem); g.closePath(); g.fill();
    if (C === YOU) { // ribbed hem + zipper + hoodie under
      g.fillStyle = C.cuff; g.fillRect(-tw * 0.5, -1 * U, tw * 0.98, 3.5 * U);
      g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 0.6 * U; for (let k = -tw * 0.5; k < tw * 0.5; k += 1.6 * U) line(g, k, -1 * U, k, 2.5 * U);
      g.strokeStyle = '#c9b77a'; g.lineWidth = 0.8 * U; line(g, tw * 0.47, -th + 4 * U, tw * 0.47, -1 * U);
      g.fillStyle = C.hood; poly(g, [tw * 0.1, -th - 1 * U, tw * 0.5, -th + 3 * U, tw * 0.48, -th + 8 * U, tw * 0.2, -th + 2 * U]); g.fill();
    }
    if (C.vest) { // orange safety vest with silver reflective stripes
      g.fillStyle = '#ff7a00'; poly(g, [-tw * 0.5, -1 * U, -tw * 0.5, -th + 4 * U, tw * 0.48, -th + 4 * U, tw * 0.5, -1 * U]); g.fill();
      g.fillStyle = '#e6eef5'; g.fillRect(-tw * 0.5, -th * 0.42, tw, 2.6 * U); g.fillRect(-tw * 0.5, -th * 0.2, tw, 2.6 * U);
      g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(-tw * 0.5, -th * 0.42, tw, 0.8 * U);
    }
    if (C.suit) { g.fillStyle = '#f2f2f2'; poly(g, [tw * 0.15, -th, tw * 0.5, -th + 2 * U, tw * 0.45, -th + 12 * U]); g.fill(); g.fillStyle = C.tie; poly(g, [tw * 0.42, -th + 3 * U, tw * 0.52, -th + 4 * U, tw * 0.5, -th + 16 * U, tw * 0.4, -th + 15 * U]); g.fill();
      if (C.torn) { g.fillStyle = '#2a2a2e'; poly(g, [-tw * 0.3, -th * 0.5, -tw * 0.1, -th * 0.45, -tw * 0.2, -th * 0.3]); g.fill(); } }
    if (C.dust) { g.fillStyle = 'rgba(190,185,178,0.6)'; for (let k = 0; k < 12; k++) { circle(g, (hash(k) - 0.5) * tw, -th + hash(k + 1) * 6 * U, 1.2 * U); g.fill(); } }
    if (C.apron) { g.fillStyle = '#f4f1ea'; poly(g, [tw * 0.2, -th * 0.6, tw * 0.55, -th * 0.6, tw * 0.6, 10 * U, tw * 0.2, 10 * U]); g.fill(); }
  }
  // belt keys (Rosa) swing with motion
  if (C.keys) {
    const sw = Math.sin((o.t || 0) * 7) * 0.4 * (o.keySwing == null ? 1 : o.keySwing);
    g.save(); g.translate(tw * 0.1, -1 * U); g.rotate(sw);
    g.strokeStyle = '#c9c9c9'; g.lineWidth = 0.8 * U; circle(g, 0, 4 * U, 3.2 * U); g.stroke();
    for (let k = 0; k < 6; k++) { g.save(); g.rotate(-0.8 + k * 0.32); g.fillStyle = k % 2 ? '#d4af37' : '#b8bec7'; g.fillRect(-0.5 * U, 6 * U, 1.2 * U, 5 * U); circle(g, 0, 6 * U, 1.1 * U); g.fill(); g.restore(); }
    g.restore();
  }
  g.restore();
  // ---- head
  const nX = shX + Math.sin(lean) * 3 * U, nY = shY - Math.cos(lean) * 3 * U;
  g.fillStyle = shade(C.skin, -0.15); limb(g, shX, shY, nX, nY, 6 * U, shade(C.skin, -0.15));
  const hr = 7 * U * hs, ha = lean + (P.head || 0);
  const hx = nX + Math.sin(ha) * hr * 0.95, hy = nY - Math.cos(ha) * hr * 0.95;
  g.save(); g.translate(hx, hy); g.rotate(P.head || 0); if (P.turn) g.scale(-1, 1);
  drawHeadSide(g, C, 0, 0, hr, { t: o.t, expr: o.expr || P.expr, look: o.look || P.look, red: o.red, noBlink: o.noBlink, blink: o.blink });
  if (C.acc === 'headphones') { g.strokeStyle = '#222'; g.lineWidth = 1.6 * U; g.beginPath(); g.arc(-hr * 0.1, -hr * 0.1, hr * 1.05, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); g.fillStyle = C.accCol || '#e63946'; ellipse(g, -hr * 0.1, hr * 0.1, hr * 0.3, hr * 0.4); g.fill(); }
  if (C.acc === 'helmet') { g.fillStyle = '#ffc300'; g.beginPath(); g.arc(0, -hr * 0.25, hr * 1.08, Math.PI, 0); g.fill(); g.fillRect(-hr * 1.2, -hr * 0.3, hr * 2.5, hr * 0.18); g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(-hr * 0.2, -hr * 1.2, hr * 0.3, hr * 0.8); }
  g.restore();
  // ---- near arm (+ held items)
  drawArm(A[0], false, true);
  const hand = [A[0][2], A[0][3]], fhand = [A[1][2], A[1][3]];
  if (o.coffee) drawCoffeeCup(g, hand[0], hand[1] - 3 * U, U * 0.9, o.t || 0, dir);
  if (P.phone || o.phone) drawHeldPhone(g, hand[0] + 2 * U, hand[1] - 3 * U, U, o.alert || 0, o.t || 0);
  if (C.acc === 'briefcase' && !P.phone) { g.fillStyle = '#5a3a22'; rrect(g, fhand[0] - 9 * U, fhand[1] + 1 * U, 18 * U, 13 * U, 2 * U); g.fill(); g.strokeStyle = '#3a2614'; g.lineWidth = 1 * U; g.strokeRect(fhand[0] - 9 * U, fhand[1] + 1 * U, 18 * U, 13 * U); }
  if (C.acc === 'tote') { g.fillStyle = C.accCol; poly(g, [shX - 6 * U, shY + 14 * U, shX + 6 * U, shY + 14 * U, shX + 8 * U, shY + 32 * U, shX - 8 * U, shY + 32 * U]); g.fill(); g.strokeStyle = C.accCol; g.lineWidth = 1.2 * U; line(g, shX - 4 * U, shY + 14 * U, shX, shY); }
  if (C.acc === 'umbrella') { g.strokeStyle = '#222'; g.lineWidth = 1.5 * U; line(g, fhand[0], fhand[1], fhand[0] + 4 * U, fhand[1] + 34 * U); g.fillStyle = C.accCol; poly(g, [fhand[0] - 1 * U, fhand[1] + 4 * U, fhand[0] + 4 * U, fhand[1] + 4 * U, fhand[0] + 4 * U, fhand[1] + 28 * U]); g.fill(); }
  if (C.acc === 'skateboard') { g.save(); g.translate(fhand[0], fhand[1]); g.rotate(1.3); g.fillStyle = '#d62828'; rrect(g, -18 * U, -2 * U, 36 * U, 5 * U, 2.5 * U); g.fill(); g.fillStyle = '#222'; circle(g, -12 * U, 4 * U, 2 * U); g.fill(); circle(g, 12 * U, 4 * U, 2 * U); g.fill(); g.restore(); }
  if (C.rabbit) drawRabbit(g, fhand[0], fhand[1], U * 1.1, o.t || 0, o.rabbitSwing || 0);
  g.restore();
  // world-space hand positions (for leash etc.)
  const tr = (px, py) => { let X = px, Y = py; if (P.rot) { const c = Math.cos(P.rot), sn = Math.sin(P.rot); [X, Y] = [X * c - Y * sn, X * sn + Y * c]; } return [x + dir * X, y + Y]; };
  out.hand = tr(hand[0], hand[1]); out.fhand = tr(fhand[0], fhand[1]); out.head = tr(hx, hy); out.headR = hr;
  if ((P.phone || o.phone) && o.alert) { glow(g, out.hand[0] + dir * 2 * U, out.hand[1] - 3 * U, 60 * U, '#ff2020', 0.75 * o.alert); glow(g, out.head[0] + dir * hr * 0.6, out.head[1], hr * 2.2, '#ff3030', 0.35 * o.alert); }
  return out;
}
// ---------------------------------------------------------------- BODY (front / back view)
// P: {bob, sway, legL, legR (lift 0..1), armL, armR (angle out), elL, elR, head, look, expr, phone, walk}
function poseFrontIdle(t, seed = 0) { const b = Math.sin(t * 2.2 + seed); return { bob: b * 0.3, chest: b, armL: 0.12, armR: 0.12, elL: 0.1, elR: 0.1, legL: 0, legR: 0, head: Math.sin(t * 0.6 + seed) * 0.05, look: [Math.sin(t * 0.5 + seed) * 0.5, 0] }; }
function poseFrontWalk(ph) { const a = Math.sin(ph * TAU); return { bob: -1.2 * Math.cos(ph * 2 * TAU), legL: Math.max(0, a), legR: Math.max(0, -a), armL: 0.1, armR: 0.1, swingL: -a, swingR: a, elL: 0.3, elR: 0.3, head: 0, look: [0, 0] }; }
function poseFrontPhone(t, seed = 0) { const P = poseFrontIdle(t, seed); P.phone = true; P.elR = 2.3; P.armR = -0.15; P.head = 0.25; P.look = [0.2, 0.9]; return P; }
function drawPersonFront(g, C, x, y, s, P, o = {}) {
  const U = s, hf = C.hf || 1, wf = C.wf || 1, hs = C.headS || 1, back = !!o.back;
  if (o.shadow !== false) { aoShadow(g, x, y + 2, 26 * s * wf, 6 * s); castShadow(g, x, y, 26 * s * wf, 120 * s * hf, 0.12); }
  const legLen = 47 * hf * U, torso = 30 * hf * U * (C.child ? 0.85 : 1);
  const hipY = y - legLen - 3 * U + (P.bob || 0) * U, shY = hipY - torso;
  const hw = 7 * wf * U, sw = 11 * wf * U;
  const out = {};
  // legs
  [[-1, P.legL || 0], [1, P.legR || 0]].forEach(([sd, lift]) => {
    const hx = x + sd * hw * 0.65, fx = x + sd * hw * 0.8, fy = y - lift * 9 * U;
    const kx = hx + sd * lift * 2 * U, ky = (hipY + fy) / 2 - lift * 4 * U;
    limb(g, hx, hipY, kx, ky, 11 * wf * U, C.bottom); limb(g, kx, ky, fx, fy - 3 * U, 10 * wf * U, C.skirt ? C.skin : C.bottom);
    g.fillStyle = C.shoes; rrect(g, fx - 5.5 * U, fy - 4 * U, 11 * U, 6 * U, 3 * U); g.fill(); g.fillStyle = C.sole || '#888'; g.fillRect(fx - 5.5 * U, fy + 0.5 * U, 11 * U, 1.6 * U);
  });
  if (C.skirt) { g.fillStyle = C.bottom; poly(g, [x - hw, hipY - 2 * U, x + hw, hipY - 2 * U, x + hw * 1.5, hipY + 18 * U, x - hw * 1.5, hipY + 18 * U]); g.fill(); }
  if (C.backpack && !back) { g.fillStyle = '#1b1c20'; g.fillRect(x - sw * 0.85, shY + 2 * U, 3 * U, torso * 0.6); g.fillRect(x + sw * 0.85 - 3 * U, shY + 2 * U, 3 * U, torso * 0.6); }
  // torso
  const tg = lingrad(g, x - sw, 0, x + sw, 0, [[0, C.topDark], [0.6, C.top], [1, shade(C.top, 0.2)]]);
  g.fillStyle = tg;
  if (C.raincoat) { poly(g, [x - sw * 0.8, shY, x + sw * 0.8, shY, x + sw * 1.15, hipY + 9 * U, x - sw * 1.15, hipY + 9 * U]); g.fill(); }
  else { g.beginPath(); g.moveTo(x - hw * 1.05, hipY + (C.coat || C.suit ? 7 : 2) * U); g.lineTo(x - sw, shY + 3 * U); g.quadraticCurveTo(x - sw, shY - 1 * U, x - sw * 0.6, shY - 1 * U); g.lineTo(x + sw * 0.6, shY - 1 * U); g.quadraticCurveTo(x + sw, shY - 1 * U, x + sw, shY + 3 * U); g.lineTo(x + hw * 1.05, hipY + (C.coat || C.suit ? 7 : 2) * U); g.closePath(); g.fill(); }
  if (!back) {
    if (C === YOU) {
      g.fillStyle = C.hood; poly(g, [x - 4 * U, shY - 1 * U, x + 4 * U, shY - 1 * U, x + 2.5 * U, hipY, x - 2.5 * U, hipY]); g.fill();
      g.strokeStyle = '#c9b77a'; g.lineWidth = 0.8 * U; line(g, x - 3.2 * U, shY + 1 * U, x - 3.2 * U, hipY); line(g, x + 3.2 * U, shY + 1 * U, x + 3.2 * U, hipY);
      g.fillStyle = C.cuff; g.fillRect(x - hw * 1.05, hipY - 1 * U, hw * 2.1, 3.5 * U);
      g.fillStyle = C.hood; ellipse(g, x, shY - 1 * U, 7 * U, 2.6 * U); g.fill();             // hood over collar
      g.fillStyle = '#d9d9d9'; g.fillRect(x - 3 * U, shY + 4 * U, 0.6 * U, 6 * U); g.fillRect(x + 2.4 * U, shY + 4 * U, 0.6 * U, 6 * U); // drawstrings
    }
    if (C.vest) { g.fillStyle = '#ff7a00'; poly(g, [x - sw * 0.9, shY + 1 * U, x - 2 * U, shY + 1 * U, x - 2 * U, hipY + 1 * U, x - hw * 1.05, hipY + 1 * U]); g.fill(); poly(g, [x + sw * 0.9, shY + 1 * U, x + 2 * U, shY + 1 * U, x + 2 * U, hipY + 1 * U, x + hw * 1.05, hipY + 1 * U]); g.fill();
      g.fillStyle = '#e6eef5'; [0.5, 0.75].forEach(f => { g.fillRect(x - sw * 0.85, shY + torso * f, sw * 0.85 - 2 * U, 2.4 * U); g.fillRect(x + 2 * U, shY + torso * f, sw * 0.85 - 2 * U, 2.4 * U); });
      if (C.glasses) { g.strokeStyle = '#ddd'; g.lineWidth = 0.4 * U; g.beginPath(); g.moveTo(x - 4 * U, shY); g.quadraticCurveTo(x, shY + 10 * U, x + 4 * U, shY); g.stroke(); } }
    if (C.suit) { g.fillStyle = '#f2f2f2'; poly(g, [x - 4 * U, shY - 1 * U, x + 4 * U, shY - 1 * U, x, shY + 14 * U]); g.fill(); g.fillStyle = C.tie; poly(g, [x - 1.6 * U, shY + 3 * U, x + 1.6 * U, shY + 3 * U, x + 2.2 * U, shY + 17 * U, x, shY + 19 * U, x - 2.2 * U, shY + 17 * U]); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 0.6 * U; line(g, x - 4 * U, shY, x - 1 * U, shY + 16 * U); line(g, x + 4 * U, shY, x + 1 * U, shY + 16 * U);
      if (C.torn) { g.fillStyle = '#2a2a2e'; poly(g, [x + sw * 0.4, shY + 12 * U, x + sw * 0.75, shY + 16 * U, x + sw * 0.5, shY + 22 * U]); g.fill(); g.fillStyle = '#eee'; poly(g, [x + sw * 0.48, shY + 14 * U, x + sw * 0.66, shY + 16.5 * U, x + sw * 0.52, shY + 19.5 * U]); g.fill(); } }
    if (C.raincoat) { g.fillStyle = 'rgba(0,0,0,0.3)'; for (let k = 0; k < 4; k++) { circle(g, x, shY + 5 * U + k * 6 * U, 1.1 * U); g.fill(); } g.fillStyle = C.topDark; ellipse(g, x, shY, 9 * U, 3 * U); g.fill(); }
    if (C.apron) { g.fillStyle = '#f4f1ea'; poly(g, [x - hw, shY + 8 * U, x + hw, shY + 8 * U, x + hw * 1.1, hipY + 12 * U, x - hw * 1.1, hipY + 12 * U]); g.fill(); }
    if (C.dust) { g.fillStyle = 'rgba(190,185,178,0.65)'; for (let k = 0; k < 18; k++) { circle(g, x + (hash(k) - 0.5) * sw * 2, shY + hash(k + 1) * 4 * U, 1.1 * U); g.fill(); } }
  }
  if (C.keys) { const sw2 = Math.sin((o.t || 0) * 7) * 0.4 * (o.keySwing == null ? 0.5 : o.keySwing); g.save(); g.translate(x + hw * 0.8, hipY); g.rotate(sw2); g.strokeStyle = '#ccc'; g.lineWidth = 0.8 * U; circle(g, 0, 4 * U, 3 * U); g.stroke(); for (let k = 0; k < 6; k++) { g.save(); g.rotate(-0.8 + k * 0.32); g.fillStyle = k % 2 ? '#d4af37' : '#b8bec7'; g.fillRect(-0.5 * U, 6 * U, 1.2 * U, 5 * U); g.restore(); } g.restore(); }
  // arms
  const arm = (sd, ang, el, swing) => {
    const sx = x + sd * sw * 0.92, sy = shY + 2 * U;
    const ex = sx + sd * Math.sin(ang) * 16 * hf * U, ey = sy + Math.cos(ang) * 16 * hf * U * (1 - Math.abs(swing || 0) * 0.15);
    const fa = ang - sd * 0 + el;
    const hx = ex + sd * Math.sin(ang) * 6 * U - sd * Math.sin(el) * 10 * U * (sd > 0 ? 1 : 1), hy = ey + Math.cos(el) * 15 * hf * U * (1 - Math.abs(swing || 0) * 0.2);
    const hxx = el > 1.5 ? ex - sd * 9 * U : hx;
    limb(g, sx, sy, ex, ey, 7.5 * wf * U, C.top); limb(g, ex, ey, hxx, hy, 7 * wf * U, C.top);
    if (C.cuff) limb(g, hxx + (ex - hxx) * 0.12, hy + (ey - hy) * 0.12, hxx + (ex - hxx) * 0.02, hy + (ey - hy) * 0.02, 7.2 * wf * U, C.cuff);
    g.fillStyle = C.skin; circle(g, hxx, hy, 3.6 * U); g.fill();
    return [hxx, hy];
  };
  const hl = arm(-1, P.armL || 0.1, P.elL || 0.1, P.swingL), hr2 = arm(1, P.armR || 0.1, P.elR || 0.1, P.swingR);
  out.handL = hl; out.handR = hr2;
  // head
  const hrad = 7 * U * hs, hy0 = shY - 3 * U - hrad * 0.95;
  limb(g, x, shY, x, shY - 4 * U, 6 * U, shade(C.skin, -0.15));
  g.save(); g.translate(x, hy0); g.rotate(P.tilt || 0);
  if (back) { hairBack(g, C, 0, 0, hrad, 'front'); g.fillStyle = C.skin; ellipse(g, 0, 0, hrad * 0.86, hrad); g.fill(); g.fillStyle = C.hair.style === 'bald' ? shade(C.skin, -0.05) : C.hair.color; ellipse(g, 0, -hrad * 0.12, hrad * 0.9, hrad * 0.92); g.fill(); if (C.hair.style === 'bun') { circle(g, 0, -hrad * 0.95, hrad * 0.38); g.fill(); } if (C.hair.style === 'braids') hairBack(g, C, 0, 0, hrad, 'front'); }
  else drawHeadFront(g, C, 0, (P.head || 0) * hrad * 0.3, hrad, { t: o.t, expr: o.expr || P.expr, look: o.look || P.look, red: o.red, redSide: o.redSide, noBlink: o.noBlink });
  if (C.acc === 'helmet') { g.fillStyle = '#ffc300'; g.beginPath(); g.arc(0, -hrad * 0.3, hrad * 1.05, Math.PI, 0); g.fill(); g.fillRect(-hrad * 1.25, -hrad * 0.36, hrad * 2.5, hrad * 0.18); }
  if (C.acc === 'headphones') { g.strokeStyle = '#222'; g.lineWidth = 1.6 * U; g.beginPath(); g.arc(0, -hrad * 0.1, hrad * 1.0, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); g.fillStyle = C.accCol; ellipse(g, -hrad * 0.95, 0, hrad * 0.22, hrad * 0.35); g.fill(); ellipse(g, hrad * 0.95, 0, hrad * 0.22, hrad * 0.35); g.fill(); }
  g.restore();
  out.head = [x, hy0]; out.headR = hrad;
  if (P.phone && !back) { drawHeldPhone(g, hr2[0] - 3 * U, hr2[1] - 4 * U, U, o.alert || 0, o.t || 0, true); if (o.alert) { glow(g, hr2[0] - 3 * U, hr2[1] - 6 * U, 55 * U, '#ff2020', 0.7 * o.alert); } }
  if (C.rabbit) drawRabbit(g, hl[0], hl[1], U * 1.1, o.t || 0, o.rabbitSwing || 0);
  if (C.acc === 'briefcase') { g.fillStyle = '#5a3a22'; rrect(g, hl[0] - 9 * U, hl[1], 18 * U, 13 * U, 2 * U); g.fill(); }
  if (C.acc === 'tote') { g.fillStyle = C.accCol; poly(g, [x - sw - 2 * U, shY + 16 * U, x - sw + 9 * U, shY + 16 * U, x - sw + 10 * U, shY + 32 * U, x - sw - 4 * U, shY + 32 * U]); g.fill(); }
  return out;
}

// ---------------------------------------------------------------- PROPS HELD
function drawCoffeeCup(g, x, y, s, t, dir = 1, steam = 1) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = '#fafafa'; poly(g, [-5, -14, 5, -14, 4, 6, -4, 6]); g.fill();
  g.fillStyle = '#8b5a2b'; poly(g, [-5.2, -8, 5.2, -8, 4.6, 1, -4.6, 1]); g.fill();
  g.fillStyle = '#151515'; rrect(g, -6, -17, 12, 4, 1.5); g.fill(); g.fillRect(-4, -18.5, 8, 2);
  g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(2.5, -13, 1, 18);
  g.restore();
  if (steam > 0) { g.save(); g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 1.5 * s; g.lineCap = 'round';
    for (let k = 0; k < 2; k++) { g.beginPath(); for (let i = 0; i <= 10; i++) { const u = i / 10; const px = x + (k * 4 - 2) * s + Math.sin(u * 6 + t * 3 + k) * 3 * s, py = y - 20 * s - u * 22 * s; i ? g.lineTo(px, py) : g.moveTo(px, py); } g.globalAlpha = 0.6 * steam; g.stroke(); }
    g.restore(); }
}
function drawHeldPhone(g, x, y, s, alert, t, front) {
  const vib = alert ? Math.sin(t * 90) * 0.8 * s : 0;
  g.save(); g.translate(x + vib, y);
  g.fillStyle = '#111'; rrect(g, -3.5 * s, -6 * s, 7 * s, 12 * s, 1.5 * s); g.fill();
  if (alert) { g.fillStyle = (Math.floor(t * 4) % 2) ? '#ff2a2a' : '#ff5b5b'; g.fillRect(-2.8 * s, -5.2 * s, 5.6 * s, 10.4 * s); g.fillStyle = '#fff'; g.fillRect(-2.2 * s, -4 * s, 4.4 * s, 1.2 * s); }
  else { g.fillStyle = '#6fb1ff'; g.fillRect(-2.8 * s, -5.2 * s, 5.6 * s, 10.4 * s); }
  g.restore();
}
function drawRabbit(g, x, y, s, t, swing) {
  // worn stuffed rabbit held by one ear
  const a = Math.sin(t * 1.6) * 0.12 + swing;
  g.save(); g.translate(x, y); g.rotate(a); g.scale(s, s);
  g.fillStyle = '#b9aaa0'; ellipse(g, 0, 5, 2.2, 6); g.fill();                    // held ear
  g.fillStyle = '#c9bcb2'; ellipse(g, 0, 16, 6.5, 6); g.fill();                   // head
  g.fillStyle = '#b9aaa0'; ellipse(g, 4, 7, 2, 6, 0.4); g.fill();                  // other ear
  g.fillStyle = '#d8ccc2'; ellipse(g, 0, 29, 8, 10); g.fill();                    // body
  g.fillStyle = '#bfb2a8'; ellipse(g, -6, 37, 3.5, 2.5); g.fill(); ellipse(g, 6, 37, 3.5, 2.5); g.fill();
  g.fillStyle = '#e8b4b8'; ellipse(g, 0, 29, 4.5, 5.5); g.fill();                  // tummy patch
  g.strokeStyle = '#6b5a50'; g.lineWidth = 0.5; g.setLineDash([1, 1]); circle(g, 0, 29, 5.2); g.stroke(); g.setLineDash([]);
  g.fillStyle = '#222'; circle(g, -2.2, 15, 0.9); g.fill(); g.fillStyle = '#6b5a50'; g.fillRect(1.4, 14.6, 1.8, 0.6);   // one button eye, one stitched
  g.restore();
}
// generic crowd member by behaviour (side view). Returns hand/head positions.
function drawCrowdSide(g, C, x, y, s, dir, beh, t, o = {}) {
  let P; const sd = C.seed || 0;
  if (beh === 'walk') P = poseWalk((t * 1.0 + sd) % 1);
  else if (beh === 'run') P = poseRun((t * 1.7 + sd) % 1);
  else if (beh === 'panic') P = posePanic((t * 1.8 + sd) % 1, t, sd);
  else if (beh === 'phone') P = posePhone(t, sd);
  else if (beh === 'point') P = posePoint(t, sd);
  else if (beh === 'crouch') P = poseCrouch(t);
  else if (beh === 'help') P = poseHelp(t);
  else if (beh === 'sit') P = poseSit(t, sd);
  else if (beh === 'trip') P = poseTrip(o.u || 0);
  else P = poseIdle(t, sd);
  if (o.expr) P.expr = o.expr;
  return drawPersonSide(g, C, x, y, s, dir, P, Object.assign({ t }, o));
}
