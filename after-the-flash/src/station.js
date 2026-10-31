// ============================================================================
// station.js — Harbor Street Station: stairwell (looking down / looking up),
// steel accordion gate with warning plate + hidden code letter S, the station
// interior in one-point perspective (tiles, mosaic band, columns, platform,
// tactile strip, tracks, tunnel mouth, turnstiles, booth, benches, map board,
// ceiling lights, caged emergency lights), speaker, cracks, swinging fixture.
// ============================================================================
const TILE = '#e9e4d6', TILE_D = '#cfc8b6', MOSAIC = '#2a6f5f';

// ---------------------------------------------------------------- GATE (lattice)
// x,y = top-left of opening, w,h opening size, down = 0..1 how far the gate has been lowered
function drawGate(g, x, y, w, h, down, t, o = {}) {
  const gh = h * down, shakeX = o.shake ? Math.sin(t * 60) * o.shake * 6 : 0;
  g.save(); g.translate(shakeX, 0);
  g.beginPath(); g.rect(x, y, w, gh + 4); g.clip();
  const by = y + gh;
  // lattice: verticals + scissor diagonals
  const n = Math.round(w / 64), dx = w / n;
  const ro = o.red ? '#7a3a3a' : '#7f8792', hi = o.red ? '#d07070' : '#d9dee5';
  g.lineCap = 'butt';
  for (let k = 0; k <= n; k++) { const xx = x + k * dx; limb(g, xx, y, xx, by, 9, ro); limb(g, xx + 2, y, xx + 2, by, 2.5, hi); }
  const step = dx * 1.2;
  g.lineWidth = 6;
  for (let yy = by - step * 40; yy < by; yy += step) {
    for (let k = 0; k < n; k++) {
      const x0 = x + k * dx, x1 = x0 + dx, ya = yy, yb = yy + step;
      if (yb < y - step) continue;
      g.strokeStyle = ro; line(g, x0, ya, x1, yb); line(g, x1, ya, x0, yb);
      g.strokeStyle = hi; g.lineWidth = 1.5; line(g, x0 + 1, ya, x1 + 1, yb); g.lineWidth = 6;
      g.fillStyle = '#5a616b'; circle(g, (x0 + x1) / 2, (ya + yb) / 2, 4); g.fill();
    }
  }
  g.restore();
  // bottom rail + handle
  if (down > 0.01) {
    g.fillStyle = lingrad(g, 0, by - 14, 0, by + 14, [[0, '#c9ced6'], [0.5, '#8a929c'], [1, '#4b525b']]);
    g.fillRect(x - 10 + shakeX, by - 14, w + 20, 28);
    g.fillStyle = '#2b2f35'; g.fillRect(x + w * 0.46 + shakeX, by + 14, 30, 22); g.fillStyle = '#c9a85a'; circle(g, x + w * 0.46 + 15 + shakeX, by + 25, 6); g.fill();
    // warning plate with hidden code letter S
    if (o.plate !== false) {
      const px = x + w * 0.62 + shakeX, py = Math.max(y + 40, by - 190);
      if (py + 120 < by) drawWarningPlate(g, px, py, 1);
      o.plateAt && o.plateAt(px, py);
    }
  }
  // top housing
  g.fillStyle = lingrad(g, 0, y - 40, 0, y, [[0, '#4a5059'], [1, '#2c3036']]); g.fillRect(x - 20, y - 40, w + 40, 44);
  g.fillStyle = '#e0b020'; for (let k = 0; k < w + 40; k += 40) { poly(g, [x - 20 + k, y - 4, x + k, y - 4, x - 10 + k, y - 14]); g.fill(); }
}
function drawWarningPlate(g, x, y, s) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = '#1b1b1b'; rrect(g, -4, -4, 188, 118, 8); g.fill();
  g.fillStyle = '#f5c400'; rrect(g, 0, 0, 180, 110, 6); g.fill();
  g.save(); rrect(g, 0, 0, 180, 22, 6); g.clip(); for (let k = -20; k < 200; k += 22) { g.fillStyle = '#111'; poly(g, [k, 22, k + 11, 22, k + 22, 0, k + 11, 0]); g.fill(); } g.restore();
  g.fillStyle = '#111'; g.font = '800 22px Poppins, Arial'; g.textAlign = 'left'; g.fillText('DANGER', 12, 52); g.font = '700 15px Poppins, Arial'; g.fillText('KEEP CLEAR', 12, 74); g.fillText('OF GATE', 12, 94);
  // gold S badge
  g.fillStyle = '#1a1a1a'; circle(g, 150, 70, 24); g.fill();
  g.fillStyle = lingrad(g, 130, 50, 170, 90, [[0, '#ffe08a'], [0.5, '#d4a72c'], [1, '#9c7412']]); circle(g, 150, 70, 20); g.fill();
  g.fillStyle = '#1a1a1a'; g.font = '800 26px Poppins, Arial'; g.textAlign = 'center'; g.fillText('S', 150, 79);
  g.restore();
}

// ---------------------------------------------------------------- STAIRS LOOKING UP (from inside the station, through the gate)
// returns key geometry. opening: archway rect in the frame.
const UPV = { c: null, arch: { x: 190, y: 470, w: 700, h: 1080 }, top: { x: 395, y: 170, w: 290, h: 170 } };
function buildUpView() {
  const c = UPV.c = mkCanvas(W, H), g = c.getContext('2d');
  const A = UPV.arch, T = UPV.top;
  // station wall around the arch (tiles)
  tileWall(g, 0, 0, W, H, 44);
  // mosaic band
  g.fillStyle = MOSAIC; g.fillRect(0, 300, W, 90); g.fillStyle = '#f2e9d0'; g.fillRect(0, 306, W, 6); g.fillRect(0, 378, W, 6);
  g.fillStyle = '#f2e9d0'; g.font = '800 54px Poppins, Arial'; g.textAlign = 'center'; g.fillText('HARBOR ST', 120, 364); g.fillText('HARBOR ST', 960, 364);
  // stairwell interior (behind the arch): walls converge to top opening
  g.save(); g.beginPath(); g.rect(A.x, A.y, A.w, A.h); g.clip();
  g.fillStyle = '#2b2f36'; g.fillRect(A.x, A.y, A.w, A.h);
  // side walls in perspective
  g.fillStyle = lingrad(g, A.x, 0, T.x, 0, [[0, '#bdb5a2'], [1, '#d8d0bc']]); poly(g, [A.x, A.y + A.h, A.x, A.y - 200, T.x, T.y, T.x, T.y + T.h + 40]); g.fill();
  g.fillStyle = lingrad(g, A.x + A.w, 0, T.x + T.w, 0, [[0, '#a8a090'], [1, '#cfc7b3']]); poly(g, [A.x + A.w, A.y + A.h, A.x + A.w, A.y - 200, T.x + T.w, T.y, T.x + T.w, T.y + T.h + 40]); g.fill();
  // tile lines on side walls
  g.strokeStyle = 'rgba(90,80,70,0.25)'; g.lineWidth = 1.5;
  for (let k = 0; k < 18; k++) { const u = k / 18; line(g, lerp(A.x, T.x, u), lerp(A.y - 200, T.y, u), lerp(A.x, T.x, u), lerp(A.y + A.h, T.y + T.h + 40, u)); line(g, lerp(A.x + A.w, T.x + T.w, u), lerp(A.y - 200, T.y, u), lerp(A.x + A.w, T.x + T.w, u), lerp(A.y + A.h, T.y + T.h + 40, u)); }
  // steps: from bottom (near) to top (far)
  const N = 22;
  for (let k = 0; k < N; k++) {
    const u0 = Math.pow(k / N, 0.8), u1 = Math.pow((k + 1) / N, 0.8);
    const y0 = lerp(A.y + A.h, T.y + T.h + 40, u0), y1 = lerp(A.y + A.h, T.y + T.h + 40, u1);
    const xl0 = lerp(A.x, T.x, u0), xr0 = lerp(A.x + A.w, T.x + T.w, u0), xl1 = lerp(A.x, T.x, u1), xr1 = lerp(A.x + A.w, T.x + T.w, u1);
    const ym = lerp(y0, y1, 0.72);
    g.fillStyle = k % 2 ? '#8d8a84' : '#96938c'; poly(g, [xl0, y0, xr0, y0, lerp(xr0, xr1, 0.72), ym, lerp(xl0, xl1, 0.72), ym]); g.fill();  // riser
    g.fillStyle = '#6a6863'; poly(g, [lerp(xl0, xl1, 0.72), ym, lerp(xr0, xr1, 0.72), ym, xr1, y1, xl1, y1]); g.fill();                 // tread (seen from below)
    g.fillStyle = '#e8b81e'; poly(g, [lerp(xl0, xl1, 0.72), ym, lerp(xr0, xr1, 0.72), ym, lerp(xr0, xr1, 0.78), lerp(y0, y1, 0.78), lerp(xl0, xl1, 0.78), lerp(y0, y1, 0.78)]); g.fill(); // yellow edge strip
  }
  // handrails
  g.strokeStyle = '#9aa2ac'; g.lineWidth = 8; line(g, A.x + 40, A.y + A.h - 300, T.x + 14, T.y + T.h - 40); line(g, A.x + A.w - 40, A.y + A.h - 300, T.x + T.w - 14, T.y + T.h - 40);
  g.restore();
  // arch frame
  g.strokeStyle = '#3b4048'; g.lineWidth = 26; g.strokeRect(A.x - 13, A.y - 13, A.w + 26, A.h + 26);
  g.strokeStyle = '#6b727c'; g.lineWidth = 4; g.strokeRect(A.x - 26, A.y - 26, A.w + 52, A.h + 52);
  // floor of station in front
  g.fillStyle = lingrad(g, 0, A.y + A.h, 0, H, [[0, '#8f8a80'], [1, '#5f5b54']]); g.fillRect(0, A.y + A.h + 13, W, H);
  g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 2;
  for (let k = -12; k <= 12; k++) line(g, W / 2 + k * 30, A.y + A.h + 13, W / 2 + k * 160, H);
  for (let k = 1; k < 8; k++) { const yy = A.y + A.h + 13 + Math.pow(k / 8, 1.6) * (H - A.y - A.h); line(g, 0, yy, W, yy); }
  // turnstile silhouettes left & right + ticket booth hint
  [[70, 1700], [1010, 1700]].forEach(([tx, ty]) => { g.fillStyle = '#5c636d'; g.fillRect(tx - 40, ty - 170, 80, 170); g.fillStyle = '#9aa2ac'; g.fillRect(tx - 40, ty - 176, 80, 10); g.strokeStyle = '#c9ced6'; g.lineWidth = 8; line(g, tx, ty - 120, tx + (tx < 500 ? 80 : -80), ty - 110); });
}
function tileWall(g, x, y, w, h, ts) {
  g.fillStyle = TILE; g.fillRect(x, y, w, h);
  g.strokeStyle = TILE_D; g.lineWidth = 2;
  for (let yy = y; yy < y + h; yy += ts * 0.5) line(g, x, yy, x + w, yy);
  for (let yy = y, r = 0; yy < y + h; yy += ts * 0.5, r++) for (let xx = x + (r % 2) * ts / 2; xx < x + w; xx += ts) line(g, xx, yy, xx, yy + ts * 0.5);
  g.fillStyle = 'rgba(255,255,255,0.12)'; for (let k = 0; k < 60; k++) g.fillRect(x + hash(k * 2.1) * w, y + hash(k * 3.7) * h, ts * 0.9, 3);
}
// top opening content: sky + street silhouettes; mode: 'day' | 'white' | 'ash'
function drawTopOpening(g, t, mode, flashU = 0) {
  const T = UPV.top;
  g.save(); g.beginPath(); g.rect(T.x - 30, T.y - 200, T.w + 60, T.h + 240); g.clip();
  if (mode === 'ash') {
    g.fillStyle = lingrad(g, 0, T.y - 200, 0, T.y + T.h, [[0, '#6f6a66'], [1, '#a19a92']]); g.fillRect(T.x - 30, T.y - 200, T.w + 60, T.h + 240);
  } else {
    g.fillStyle = lingrad(g, 0, T.y - 200, 0, T.y + T.h, [[0, '#6aa8e8'], [1, '#bfe0ff']]); g.fillRect(T.x - 30, T.y - 200, T.w + 60, T.h + 240);
    // building corner + lamp silhouettes at street level
    g.fillStyle = '#8a6a5a'; g.fillRect(T.x - 30, T.y - 200, 80, T.h + 120);
    g.fillStyle = '#c9b49a'; g.fillRect(T.x + T.w - 40, T.y - 200, 70, T.h + 100);
  }
  // green railings of the entrance at the top
  g.strokeStyle = mode === 'ash' ? '#3a4a40' : '#1e6b3a'; g.lineWidth = 6; line(g, T.x - 20, T.y + T.h - 20, T.x + T.w + 20, T.y + T.h - 20);
  g.lineWidth = 3; for (let k = 0; k < 12; k++) line(g, T.x + k * T.w / 11, T.y + T.h - 20, T.x + k * T.w / 11, T.y + T.h + 20);
  if (mode === 'white' || flashU > 0) { g.fillStyle = `rgba(255,255,255,${mode === 'white' ? 1 : flashU})`; g.fillRect(T.x - 30, T.y - 200, T.w + 60, T.h + 240); }
  g.restore();
}
// ash drifting down the stairwell (fallout hint)
function drawAsh(g, t, region, n = 120, strength = 1) {
  const [x0, y0, w, h] = region;
  g.save();
  for (let i = 0; i < n; i++) {
    const sp = 40 + hash(i) * 50, ph = (hash(i + 3) * h + t * sp) % h;
    const px = x0 + hash(i + 7) * w + Math.sin(t * 0.8 + i) * 18, py = y0 + ph;
    const r = 1.5 + hash(i + 11) * 3.5;
    g.fillStyle = `rgba(200,196,190,${(0.4 + hash(i + 2) * 0.5) * strength})`;
    g.beginPath(); g.ellipse(px, py, r * 1.3, r, t + i, 0, TAU); g.fill();
  }
  g.restore();
}

// ---------------------------------------------------------------- STAIRS LOOKING DOWN (sprint down, camera behind)
const DOWNV = { c: null };
function buildDownView() {
  const c = DOWNV.c = mkCanvas(W, H * 1.6), g = c.getContext('2d');
  const Hh = c.height;
  tileWall(g, 0, 0, W, Hh, 50);
  const top = { xl: -80, xr: W + 80, y: 0 }, bot = { xl: 330, xr: 750, y: Hh - 520 };
  // walls shading
  g.fillStyle = 'rgba(40,40,50,0.18)'; poly(g, [0, 0, top.xl + 80, 0, bot.xl, bot.y, 0, bot.y + 300]); g.fill();
  g.fillStyle = 'rgba(40,40,50,0.28)'; poly(g, [W, 0, W, bot.y + 300, bot.xr, bot.y]); g.fill();
  const N = 30;
  for (let k = 0; k < N; k++) {
    const u0 = 1 - Math.pow(1 - k / N, 1.25), u1 = 1 - Math.pow(1 - (k + 1) / N, 1.25);
    const y0 = lerp(top.y, bot.y, u0), y1 = lerp(top.y, bot.y, u1);
    const xl0 = lerp(top.xl, bot.xl, u0), xr0 = lerp(top.xr, bot.xr, u0), xl1 = lerp(top.xl, bot.xl, u1), xr1 = lerp(top.xr, bot.xr, u1);
    const ym = lerp(y0, y1, 0.7);
    g.fillStyle = k % 2 ? '#a8a49c' : '#b2aea5'; poly(g, [xl0, y0, xr0, y0, lerp(xr0, xr1, .7), ym, lerp(xl0, xl1, .7), ym]); g.fill();  // tread (seen from above)
    g.fillStyle = '#6f6c66'; poly(g, [lerp(xl0, xl1, .7), ym, lerp(xr0, xr1, .7), ym, xr1, y1, xl1, y1]); g.fill();
    g.fillStyle = '#f0c020'; poly(g, [xl0, y0, xr0, y0, lerp(xr0, xr1, .1), lerp(y0, y1, .1), lerp(xl0, xl1, .1), lerp(y0, y1, .1)]); g.fill();
  }
  // bottom: station glow + gate housing
  g.fillStyle = '#f8edd0'; g.fillRect(bot.xl, bot.y, bot.xr - bot.xl, 520);
  g.fillStyle = radgrad(g, W / 2, bot.y + 200, 10, 400, [[0, 'rgba(255,245,220,0.9)'], [1, 'rgba(255,245,220,0)']]); g.fillRect(0, bot.y - 300, W, 900);
  g.fillStyle = '#3b4048'; g.fillRect(bot.xl - 20, bot.y - 30, bot.xr - bot.xl + 40, 34);
  g.strokeStyle = '#9aa2ac'; g.lineWidth = 12; line(g, 60, 0, bot.xl + 30, bot.y - 40); line(g, W - 60, 0, bot.xr - 30, bot.y - 40);
  DOWNV.bot = bot;
}

// ---------------------------------------------------------------- STATION INTERIOR (one-point perspective)
const ST = { c: null, vp: [430, 830], f: 900, cracks: [], emerg: [], ceil: [], people: [] };
function P3(X, Y, Z) { return [ST.vp[0] + X * ST.f / Z, ST.vp[1] + Y * ST.f / Z]; }
function buildStation() {
  const c = ST.c = mkCanvas(W, H), g = c.getContext('2d');
  const FLOOR = 170, CEIL = -280, RW = 470, EDGE = -170, PIT = 300, LW = -760, ZN = 160, ZF = 5200;
  // ceiling
  let a = P3(LW, CEIL, ZN), b = P3(RW, CEIL, ZN), cc = P3(RW, CEIL, ZF), d = P3(LW, CEIL, ZF);
  g.fillStyle = lingrad(g, 0, 0, 0, ST.vp[1], [[0, '#a9a497'], [1, '#6f6b62']]); poly(g, [-400, -400, W + 400, -400, cc[0], cc[1], d[0], d[1]]); g.fill();
  // right wall (tiles)
  a = P3(RW, CEIL, ZN); b = P3(RW, FLOOR, ZN); cc = P3(RW, FLOOR, ZF); d = P3(RW, CEIL, ZF);
  g.fillStyle = lingrad(g, W, 0, ST.vp[0], 0, [[0, '#e9e4d6'], [1, '#9b968a']]); poly(g, [W + 800, -1400, W + 800, H + 1400, cc[0], cc[1], d[0], d[1]]); g.fill();
  g.strokeStyle = 'rgba(120,110,95,0.35)'; g.lineWidth = 1.5;
  for (let Y = CEIL; Y <= FLOOR; Y += 30) { const p1 = P3(RW, Y, 120), p2 = P3(RW, Y, ZF); line(g, p1[0], p1[1], p2[0], p2[1]); }
  for (let Z = 140; Z < ZF; Z *= 1.06) { const p1 = P3(RW, CEIL, Z), p2 = P3(RW, FLOOR, Z); line(g, p1[0], p1[1], p2[0], p2[1]); }
  // mosaic name band on right wall
  const mb0 = P3(RW, -150, 130), mb1 = P3(RW, -70, 130), mb2 = P3(RW, -70, ZF), mb3 = P3(RW, -150, ZF);
  g.fillStyle = MOSAIC; poly(g, [mb0[0], mb0[1], mb1[0], mb1[1], mb2[0], mb2[1], mb3[0], mb3[1]]); g.fill();
  for (let Z = 300; Z < 4000; Z *= 1.9) { // letters in perspective
    const p = P3(RW, -110, Z), sc = ST.f / Z;
    g.save(); g.translate(p[0], p[1]); g.transform(0.55, -0.32 * 0.9, 0, 1, 0, 0); g.fillStyle = '#f2e9d0'; g.font = `800 ${62 * sc}px Poppins, Arial`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('HARBOR ST', -120 * sc, 0); g.restore();
  }
  // map board on right wall
  const m0 = P3(RW, -20, 600), m1 = P3(RW, 110, 600), m2 = P3(RW, 110, 860), m3 = P3(RW, -20, 860);
  g.fillStyle = '#1b2a3a'; poly(g, [m0[0], m0[1], m1[0], m1[1], m2[0], m2[1], m3[0], m3[1]]); g.fill();
  g.strokeStyle = '#e63946'; g.lineWidth = 4; line(g, lerp(m0[0], m3[0], 0.2), lerp(m0[1], m3[1], 0.2) + 30, lerp(m1[0], m2[0], 0.8), lerp(m1[1], m2[1], 0.8) - 30);
  g.strokeStyle = '#2a9d8f'; line(g, lerp(m0[0], m3[0], 0.1), lerp(m0[1], m3[1], 0.5) + 40, lerp(m1[0], m2[0], 0.9), lerp(m1[1], m2[1], 0.3) - 10);
  g.fillStyle = '#ffd166'; circle(g, lerp(m0[0], m2[0], 0.5), lerp(m0[1], m2[1], 0.5), 6); g.fill();
  // platform floor
  a = P3(EDGE, FLOOR, ZN); b = P3(RW, FLOOR, ZN); cc = P3(RW, FLOOR, ZF); d = P3(EDGE, FLOOR, ZF);
  g.fillStyle = lingrad(g, 0, ST.vp[1], 0, H, [[0, '#6f6a60'], [1, '#a59f92']]); poly(g, [P3(EDGE, FLOOR, 80)[0], H + 400, W + 1400, H + 400, cc[0], cc[1], d[0], d[1]]); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 2;
  for (let X = EDGE; X <= RW; X += 80) { const p1 = P3(X, FLOOR, 90), p2 = P3(X, FLOOR, ZF); line(g, p1[0], p1[1], p2[0], p2[1]); }
  for (let Z = 100; Z < ZF; Z *= 1.12) { const p1 = P3(EDGE, FLOOR, Z), p2 = P3(RW, FLOOR, Z); line(g, p1[0], p1[1], p2[0], p2[1]); }
  // tactile yellow strip at the platform edge
  const y0 = P3(EDGE, FLOOR, 80), y1 = P3(EDGE + 60, FLOOR, 80), y2 = P3(EDGE + 60, FLOOR, ZF), y3 = P3(EDGE, FLOOR, ZF);
  g.fillStyle = '#f0c020'; poly(g, [y0[0], y0[1], y1[0], y1[1], y2[0], y2[1], y3[0], y3[1]]); g.fill();
  g.fillStyle = 'rgba(0,0,0,0.18)'; for (let Z = 100; Z < 3000; Z *= 1.05) for (let X = EDGE + 8; X < EDGE + 60; X += 14) { const p = P3(X, FLOOR, Z); circle(g, p[0], p[1], Math.max(0.6, 4 * ST.f / Z / 4)); g.fill(); }
  // platform edge face + track pit
  const e0 = P3(EDGE, FLOOR, 80), e1 = P3(EDGE, PIT, 80), e2 = P3(EDGE, PIT, ZF), e3 = P3(EDGE, FLOOR, ZF);
  g.fillStyle = '#4a4740'; poly(g, [e0[0], e0[1], e1[0], e1[1], e2[0], e2[1], e3[0], e3[1]]); g.fill();
  const t0 = P3(LW, PIT, 80), t3 = P3(LW, PIT, ZF);
  g.fillStyle = lingrad(g, 0, ST.vp[1], 0, H, [[0, '#2a2723'], [1, '#3e3a33']]); poly(g, [e1[0], e1[1], t0[0], t0[1], t3[0], t3[1], e2[0], e2[1]]); g.fill();
  // sleepers + rails
  for (let Z = 100; Z < ZF; Z += 70) { const p1 = P3(EDGE - 120, PIT, Z), p2 = P3(LW + 140, PIT, Z); g.strokeStyle = '#4b3b2b'; g.lineWidth = Math.max(1, 26 * ST.f / Z / 6); line(g, p1[0], p1[1], p2[0], p2[1]); }
  [EDGE - 200, LW + 220, EDGE - 420].forEach((X, k) => { const p1 = P3(X, PIT - 10, 80), p2 = P3(X, PIT - 10, ZF); g.strokeStyle = k === 2 ? '#a07a3a' : '#b9bfc6'; g.lineWidth = 6; line(g, p1[0], p1[1], p2[0], p2[1]); });
  // left tunnel wall beyond tracks
  const lw0 = P3(LW, CEIL, 80), lw1 = P3(LW, PIT, 80), lw2 = P3(LW, PIT, ZF), lw3 = P3(LW, CEIL, ZF);
  g.fillStyle = lingrad(g, 0, 0, ST.vp[0], 0, [[0, '#5d5a52'], [1, '#3a3833']]); poly(g, [lw0[0] - 600, lw0[1] - 600, lw1[0] - 600, lw1[1] + 600, lw2[0], lw2[1], lw3[0], lw3[1]]); g.fill();
  // tunnel mouth into darkness at the far end
  const tc = P3(-300, 0, ZF), tr = 560 * ST.f / ZF;
  g.fillStyle = '#4a463e'; g.fillRect(lw3[0] - 10, lw3[1], cc[0] - lw3[0] + 20, d[1] - lw3[1] + 200);
  g.fillStyle = radgrad(g, tc[0], tc[1] + tr * 0.4, 0, tr * 1.3, [[0, '#000'], [0.7, '#07080a'], [1, '#1a1a1a']]);
  g.beginPath(); g.moveTo(tc[0] - tr, P3(0, PIT, ZF)[1]); g.lineTo(tc[0] - tr, tc[1]); g.arc(tc[0], tc[1], tr, Math.PI, 0); g.lineTo(tc[0] + tr, P3(0, PIT, ZF)[1]); g.closePath(); g.fill();
  // columns along the platform
  for (let Z = 340; Z < ZF; Z += 520) {
    const X = EDGE + 120, w = 46;
    const p0 = P3(X - w, CEIL, Z), p1 = P3(X + w, FLOOR, Z);
    g.fillStyle = lingrad(g, p0[0], 0, p1[0], 0, [[0, '#5f6670'], [0.5, '#8d96a1'], [1, '#4b525b']]); g.fillRect(p0[0], p0[1], p1[0] - p0[0], p1[1] - p0[1]);
    g.fillStyle = '#2a6f5f'; const band = P3(X - w, -40, Z); g.fillRect(p0[0], band[1], p1[0] - p0[0], 50 * ST.f / Z);
    g.fillStyle = 'rgba(0,0,0,0.25)'; const sh = P3(X + w, FLOOR, Z); ellipse(g, (p0[0] + p1[0]) / 2, sh[1], (p1[0] - p0[0]) * 0.9, 6 * ST.f / Z); g.fill();
    ST.emerg.push([X, -150, Z]);          // caged emergency light on each column
  }
  // ceiling light rows
  for (let Z = 260; Z < ZF; Z += 300) { [-60, 260].forEach(X => { ST.ceil.push([X, CEIL + 4, Z]); const p = P3(X, CEIL + 4, Z), s = ST.f / Z; g.fillStyle = '#d8d6cf'; g.fillRect(p[0] - 60 * s, p[1], 120 * s, 10 * s); }); }
  // benches along the wall
  for (let Z = 520; Z < 3000; Z += 700) { const p0 = P3(RW - 70, FLOOR - 50, Z), p1 = P3(RW - 10, FLOOR, Z + 200); g.fillStyle = '#6b4a2f'; g.fillRect(Math.min(p0[0], p1[0]), p0[1], Math.abs(p1[0] - p0[0]) + 40 * ST.f / Z, 14 * ST.f / Z); }
  // ticket booth (near right) + turnstile row
  const bk0 = P3(RW - 200, CEIL + 120, 230), bk1 = P3(RW - 10, FLOOR, 330);
  g.fillStyle = '#2b4a5f'; g.fillRect(bk0[0], bk0[1], bk1[0] - bk0[0] + 140, bk1[1] - bk0[1]);
  g.fillStyle = 'rgba(190,220,240,0.35)'; g.fillRect(bk0[0] + 20, bk0[1] + 40, bk1[0] - bk0[0] + 90, (bk1[1] - bk0[1]) * 0.45);
  g.fillStyle = '#f2e9d0'; g.font = '800 30px Poppins, Arial'; g.fillText('TOKENS', bk0[0] + 40, bk0[1] + 30);
  for (let k = 0; k < 4; k++) { const p = P3(RW - 300 + k * 0, FLOOR, 420 + k * 120), s = ST.f / (420 + k * 120); g.fillStyle = '#5c636d'; g.fillRect(p[0] - 30 * s, p[1] - 100 * s, 60 * s, 100 * s); g.fillStyle = '#c9ced6'; g.fillRect(p[0] - 30 * s, p[1] - 104 * s, 60 * s, 8 * s); }
  // grime / ambient occlusion along floor-wall seam
  const s0 = P3(RW, FLOOR, 100), s1 = P3(RW, FLOOR, ZF);
  g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 10; line(g, s0[0], s0[1], s1[0], s1[1]);
  // pre-generate crack polylines (grow during shockwave)
  for (let k = 0; k < 7; k++) {
    const sx = [700, 900, 820, 1000, 640, 960, 760][k], sy = [520, 700, 1000, 1180, 380, 300, 1300][k];
    const pts = [[sx, sy]]; let x = sx, y = sy, ang = rr(0, TAU);
    for (let i = 0; i < 14; i++) { ang += rr(-0.7, 0.7); x += Math.cos(ang) * rr(18, 40); y += Math.sin(ang) * rr(18, 40); pts.push([x, y]); }
    ST.cracks.push(pts);
  }
}
// lighting: mode 'normal' | 'dark' | 'red' ; u = flicker/pulse value provided by scene
function drawStationLights(g, t, mode, amt = 1) {
  if (mode === 'normal') {
    ST.ceil.forEach(([X, Y, Z]) => { const p = P3(X, Y, Z), s = ST.f / Z; glow(g, p[0], p[1] + 10 * s, 160 * s, '#fff3d6', 0.5 * amt); });
  }
  if (mode === 'red') {
    ST.emerg.forEach(([X, Y, Z], k) => {
      const p = P3(X, Y, Z), s = ST.f / Z;
      g.fillStyle = '#2a2a2a'; rrect(g, p[0] - 16 * s, p[1] - 14 * s, 32 * s, 28 * s, 4 * s); g.fill();
      g.fillStyle = mix('#5a0a08', '#ff3b30', amt); circle(g, p[0], p[1], 10 * s); g.fill();
      g.strokeStyle = '#111'; g.lineWidth = 2 * s; for (let i = -1; i <= 1; i++) line(g, p[0] + i * 7 * s, p[1] - 12 * s, p[0] + i * 7 * s, p[1] + 12 * s);    // cage
      glow(g, p[0], p[1], 330 * s, '#ff3b30', 0.75 * amt);
    });
  }
}
function drawCracks(g, u) {
  g.save(); g.strokeStyle = 'rgba(40,35,30,0.85)'; g.lineWidth = 2.5; g.lineCap = 'round';
  ST.cracks.forEach((pts, k) => {
    const n = Math.floor(clamp(u * 1.3 - k * 0.05) * (pts.length - 1));
    if (n < 1) return;
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i <= n; i++) g.lineTo(pts[i][0], pts[i][1]); g.stroke();
    if (n > 5) { g.lineWidth = 1.5; g.beginPath(); g.moveTo(pts[5][0], pts[5][1]); g.lineTo(pts[5][0] + 30, pts[5][1] + 26); g.lineTo(pts[5][0] + 44, pts[5][1] + 60); g.stroke(); g.lineWidth = 2.5; }
  });
  g.restore();
}
// dust raining from ceiling seams
function drawDustRain(g, t, strength, seams = [[180, 0], [520, 0], [760, 0], [940, 0]]) {
  if (strength <= 0) return;
  g.save();
  seams.forEach(([sx, sy], k) => {
    g.fillStyle = lingrad(g, 0, sy, 0, sy + 900, [[0, `rgba(210,200,185,${0.55 * strength})`], [1, 'rgba(210,200,185,0)']]);
    poly(g, [sx - 8, sy, sx + 8, sy, sx + 40, sy + 900, sx - 40, sy + 900]); g.fill();
    for (let i = 0; i < 40; i++) { const ph = (hash(i + k * 50) + t * (0.8 + hash(i) * 0.6)) % 1; g.fillStyle = `rgba(220,210,195,${(1 - ph) * strength})`; g.fillRect(sx + (hash(i * 3 + k) - 0.5) * 60 * ph, sy + ph * 1000, 3, 3); }
  });
  g.restore();
}
// dust motes in a light beam
function drawMotes(g, t, x, y, w, h, n = 60, col = '255,240,220', a = 0.6) {
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const px = x + ((hash(i) * w + Math.sin(t * 0.3 + i) * 30) % w), py = y + ((hash(i + 5) * h + t * (8 + hash(i + 2) * 14)) % h);
    const r = 1 + hash(i + 9) * 2.5, tw = 0.5 + 0.5 * Math.sin(t * 2 + i);
    g.fillStyle = `rgba(${col},${a * tw})`; circle(g, px, py, r); g.fill();
  }
  g.restore();
}
function drawSpeaker(g, x, y, s, t, active) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = '#3a3f46'; g.fillRect(-8, -200, 16, 120);
  g.fillStyle = lingrad(g, -90, 0, 90, 0, [[0, '#5b626b'], [0.5, '#9aa2ac'], [1, '#4a5059']]); rrect(g, -100, -90, 200, 130, 24); g.fill();
  g.fillStyle = '#25282d'; circle(g, 0, -25, 50); g.fill();
  g.fillStyle = '#121417'; for (let r = 0; r < 5; r++) for (let k = 0; k < 6 + r * 6; k++) { const a = k / (6 + r * 6) * TAU; circle(g, Math.cos(a) * r * 9, -25 + Math.sin(a) * r * 9, 2.4); g.fill(); }
  const vib = active ? Math.sin(t * 50) * 1.5 : 0; g.strokeStyle = '#8a929c'; g.lineWidth = 3; circle(g, 0, -25, 50 + vib); g.stroke();
  g.fillStyle = '#e0b020'; g.font = '800 16px Poppins, Arial'; g.textAlign = 'center'; g.fillText('PA · LINE 4', 0, 30);
  g.restore();
  if (active) { // crackling sound-wave graphic
    g.save(); g.strokeStyle = 'rgba(255,120,110,0.9)'; g.lineWidth = 5 * s; g.lineCap = 'round';
    [-1, 1].forEach(sd => { for (let k = 0; k < 3; k++) { const r0 = (120 + k * 55 + (t * 90 % 55)) * s; g.globalAlpha = 1 - k * 0.3; g.beginPath(); g.arc(x, y - 25 * s, r0, sd > 0 ? -0.6 : Math.PI - 0.6, sd > 0 ? 0.6 : Math.PI + 0.6); g.stroke(); } });
    g.globalAlpha = 1;
    g.beginPath(); for (let i = 0; i <= 60; i++) { const px = x - 220 * s + i * 7.3 * s, amp = (hash(Math.floor(t * 20) + i) - 0.5) * 70 * s * Math.sin(i / 60 * Math.PI); i ? g.lineTo(px, y + 160 * s + amp) : g.moveTo(px, y + 160 * s + amp); } g.stroke();
    g.restore();
  }
}
function drawHangingLight(g, x, y, len, ang, on) {
  const bx = x + Math.sin(ang) * len, by = y + Math.cos(ang) * len;
  g.strokeStyle = '#222'; g.lineWidth = 3; line(g, x, y, bx, by);
  g.save(); g.translate(bx, by); g.rotate(-ang);
  g.fillStyle = '#3a3f46'; poly(g, [-50, 30, 50, 30, 26, -6, -26, -6]); g.fill();
  g.fillStyle = on ? '#fff7dc' : '#555'; ellipse(g, 0, 30, 46, 8); g.fill();
  g.restore();
  if (on) { g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = radgrad(g, bx, by + 30, 0, 600, [[0, 'rgba(255,240,200,0.35)'], [1, 'rgba(255,240,200,0)']]);
    g.beginPath(); g.moveTo(bx - 40, by + 30); g.lineTo(bx - 40 + Math.sin(-ang) * 800 - 300, by + 900); g.lineTo(bx + 40 + Math.sin(-ang) * 800 + 300, by + 900); g.lineTo(bx + 40, by + 30); g.fill(); g.restore(); }
}
