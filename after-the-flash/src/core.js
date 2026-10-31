// ============================================================================
// core.js — constants, seeded RNG, noise, math, colour helpers, buffers, camera
// Every frame is a pure function of t. RNG is used only while BUILDING static
// data at load time (seeded once). Per-frame randomness uses hash(n).
// ============================================================================
const W = 1080, H = 1920, FPS = 30;
const TAU = Math.PI * 2;

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const RNG = mulberry32(20261031);           // seeded ONCE
const rr = (a, b) => a + (b - a) * RNG();    // build-time random range
const ri = (a, b) => Math.floor(rr(a, b + 1));
const pick = arr => arr[Math.floor(RNG() * arr.length)];

// stateless hash noise (safe inside draw)
function hash(n) { n = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return n - Math.floor(n); }
function hash2(a, b) { return hash(a * 57.31 + b * 113.17); }
function noise1(x) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return hash(i) * (1 - u) + hash(i + 1) * u; }
// Perlin-like smooth signed noise in [-1,1]
function snoise(x) { return (noise1(x) * 0.6 + noise1(x * 2.13 + 17.7) * 0.3 + noise1(x * 4.71 + 3.1) * 0.1) * 2 - 1; }

const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const smooth = t => t * t * (3 - 2 * t);
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeIn = t => t * t * t;
const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOutBack = t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const pulse = (t, period) => 0.5 - 0.5 * Math.cos(t / period * TAU);

// ---------- colour ----------
const _cc = new Map();
function hex2rgb(h) {
  let c = _cc.get(h); if (c) return c;
  let s = h.replace('#', ''); if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
  c = [parseInt(s.substr(0, 2), 16), parseInt(s.substr(2, 2), 16), parseInt(s.substr(4, 2), 16)];
  _cc.set(h, c); return c;
}
function mix(a, b, t) {
  const A = hex2rgb(a), B = hex2rgb(b);
  return `rgb(${A[0] + (B[0] - A[0]) * t | 0},${A[1] + (B[1] - A[1]) * t | 0},${A[2] + (B[2] - A[2]) * t | 0})`;
}
function shade(h, amt) { return amt >= 0 ? mix(h, '#ffffff', amt) : mix(h, '#000000', -amt); }
function rgba(h, a) { const c = hex2rgb(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }
function toHex(r, g, b) { return '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join(''); }

// ---------- canvas helpers ----------
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); return c; }
const BUFS = {};
function buf(name, w, h) {
  let b = BUFS[name];
  if (!b || b.width !== Math.ceil(w) || b.height !== Math.ceil(h)) { b = BUFS[name] = mkCanvas(w, h); }
  return b;
}
function rrect(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function circle(g, x, y, r) { g.beginPath(); g.arc(x, y, Math.max(0.1, r), 0, TAU); }
function ellipse(g, x, y, rx, ry, rot = 0) { g.beginPath(); g.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), rot, 0, TAU); }
function line(g, x1, y1, x2, y2) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
function poly(g, pts) { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); }
function lingrad(g, x1, y1, x2, y2, stops) { const gr = g.createLinearGradient(x1, y1, x2, y2); stops.forEach(s => gr.addColorStop(s[0], s[1])); return gr; }
function radgrad(g, x, y, r0, r1, stops) { const gr = g.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(s => gr.addColorStop(s[0], s[1])); return gr; }
// soft radial glow (light source)
function glow(g, x, y, r, color, a = 1) {
  const c = hex2rgb(color);
  g.save(); g.globalAlpha *= a; g.globalCompositeOperation = 'lighter';
  g.fillStyle = radgrad(g, x, y, 0, r, [[0, `rgba(${c},0.85)`], [0.25, `rgba(${c},0.35)`], [1, `rgba(${c},0)`]]);
  g.fillRect(x - r, y - r, r * 2, r * 2); g.restore();
}
// ambient-occlusion contact shadow
function aoShadow(g, x, y, w, h = 10, a = 0.35) {
  g.save(); g.fillStyle = radgrad(g, 0, 0, 0, 1, [[0, `rgba(10,12,20,${a})`], [1, 'rgba(10,12,20,0)']]);
  g.translate(x, y); g.scale(w, h); g.beginPath(); g.arc(0, 0, 1, 0, TAU); g.fill(); g.restore();
}
// long cast shadow (sun from the right => shadow goes left)
function castShadow(g, x, y, w, len, a = 0.22, skew = -1) {
  g.save(); g.fillStyle = `rgba(30,25,45,${a})`; g.beginPath();
  g.moveTo(x - w / 2, y); g.lineTo(x + w / 2, y); g.lineTo(x + w / 2 + skew * len, y + len * 0.12); g.lineTo(x - w / 2 + skew * len, y + len * 0.12);
  g.closePath(); g.fill(); g.restore();
}

// ---------- camera ----------
// Every layer is drawn with a parallax factor f (0 = infinitely far, 1 = subject plane, >1 = foreground).
const CAM = { x: 0, y: 0, z: 1, rot: 0, shake: 0, ox: 0, oy: 0, t: 0, fz: 1 };
function setCam(t, o) {
  CAM.t = t;
  CAM.x = o.x || 0; CAM.y = o.y || 0; CAM.z = o.z || 1; CAM.rot = o.rot || 0;
  CAM.shake = Math.max(0.06, o.shake || 0);                 // never perfectly still
  CAM.fz = o.fz == null ? 1 : o.fz;                          // how much zoom depends on depth
  // gentle drift + Perlin handheld shake
  const s = CAM.shake, ts = t * (1.2 + s * 5);
  CAM.ox = Math.sin(t * 0.31) * 5 + snoise(ts + 11) * 38 * s * s + snoise(ts * 2.3 + 4) * 10 * s;
  CAM.oy = Math.sin(t * 0.23 + 1) * 4 + snoise(ts + 77) * 30 * s * s + snoise(ts * 2.1 + 9) * 8 * s;
  CAM.rot += snoise(ts * 0.7 + 33) * 0.025 * s;
  CAM.z *= 1 + 0.006 * Math.sin(t * 0.21);
}
function camLayer(g, f) {
  const z = 1 + (CAM.z - 1) * (CAM.fz === 1 ? 1 : lerp(1, f, CAM.fz));
  const zf = Math.max(0.05, z);
  g.translate(W / 2 + CAM.ox * (0.6 + 0.4 * f), H / 2 + CAM.oy * (0.6 + 0.4 * f));
  g.rotate(CAM.rot);
  g.scale(zf, zf);
  g.translate(-W / 2 - CAM.x * f, -H / 2 - CAM.y * f);
}
function layer(g, f, fn) { g.save(); camLayer(g, f); fn(g); g.restore(); }

// Low-res buffer blur: draws fn into a 1/k buffer then upsamples (cheap depth-of-field)
function blurDraw(g, k, fn, alpha = 1) {
  const b = buf('blur' + k, W / k, H / k), bg = b.getContext('2d');
  bg.setTransform(1, 0, 0, 1, 0, 0); bg.clearRect(0, 0, b.width, b.height);
  bg.setTransform(1 / k, 0, 0, 1 / k, 0, 0); fn(bg);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = alpha; g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  if (k >= 6) { // two-stage upsample for smoother result
    const m = buf('blurmid' + k, W / 2, H / 2), mg = m.getContext('2d');
    mg.setTransform(1, 0, 0, 1, 0, 0); mg.clearRect(0, 0, m.width, m.height); mg.imageSmoothingQuality = 'high';
    mg.drawImage(b, 0, 0, m.width, m.height); g.drawImage(m, 0, 0, W, H);
  } else g.drawImage(b, 0, 0, W, H);
  g.restore();
}
// blur the whole current frame (rack focus / transitions)
function blurFrame(g, k, alpha = 1) {
  const src = g.canvas;
  const b = buf('fb' + k, W / k, H / k), bg = b.getContext('2d');
  bg.setTransform(1, 0, 0, 1, 0, 0); bg.imageSmoothingQuality = 'high'; bg.drawImage(src, 0, 0, b.width, b.height);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = alpha; g.imageSmoothingQuality = 'high'; g.drawImage(b, 0, 0, W, H); g.restore();
}
// whip-pan motion blur (horizontal smear of current frame)
function whipBlur(g, amount, dir = 1) {
  if (amount <= 0.01) return;
  const b = buf('whip', W / 4, H / 4), bg = b.getContext('2d');
  bg.setTransform(1, 0, 0, 1, 0, 0); bg.drawImage(g.canvas, 0, 0, b.width, b.height);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  const n = 7;
  for (let i = 0; i < n; i++) { g.globalAlpha = 0.22 * amount; g.drawImage(b, dir * (i - n / 2) * 40 * amount, 0, W, H); }
  g.restore();
}
