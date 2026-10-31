// ============================================================================
// city.js — New Harbor: sky, far skyline, mid towers, storefront row, street
// props, road, crosswalk, traffic lights, food cart, pigeons, subway entrance.
// Static layers are cached to offscreen canvases at load time.
// ============================================================================
const SM = 110;                 // storefront cache scale: px per metre (wide shot = 1:1)
const GROUND_FAR = 1180;        // world y of storefront base in the wide street set
const SKY_TOP = '#9ec9f0', SKY_HZ = '#ffe3b8';

// ---------------------------------------------------------------- SKY
function drawSky(g, t, o = {}) {
  const hz = o.hz || 1000;
  g.fillStyle = lingrad(g, 0, -400, 0, hz, [[0, '#7fb2e6'], [0.45, SKY_TOP], [0.85, '#f6d9b4'], [1, SKY_HZ]]);
  g.fillRect(-2000, -3000, W + 4000, hz + 3000 + 1200);
  // sun (from the right)
  const sx = o.sunX == null ? 930 : o.sunX, sy = o.sunY == null ? hz - 230 : o.sunY;
  g.save(); g.globalCompositeOperation = 'lighter';
  g.fillStyle = radgrad(g, sx, sy, 0, 700, [[0, 'rgba(255,240,200,0.9)'], [0.08, 'rgba(255,214,150,0.6)'], [0.35, 'rgba(255,190,120,0.18)'], [1, 'rgba(255,180,120,0)']]);
  g.fillRect(sx - 700, sy - 700, 1400, 1400);
  circle(g, sx, sy, 46); g.fillStyle = 'rgba(255,250,235,1)'; g.fill();
  g.restore();
  // clouds
  for (let i = 0; i < 7; i++) {
    const cx = ((i * 431 + t * (8 + i * 2)) % 2200) - 600, cy = hz - 420 - (i % 4) * 150 - hash(i) * 120;
    drawCloud(g, cx, cy, 0.7 + hash(i + 5) * 0.8);
  }
  if (o.birds !== false) drawBirds(g, t, hz);
}
function drawCloud(g, x, y, s) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = 'rgba(255,240,225,0.55)';
  [[0, 0, 90, 30], [60, -18, 70, 34], [-60, -8, 60, 26], [120, 4, 60, 22], [-120, 6, 50, 18]].forEach(c => { ellipse(g, c[0], c[1], c[2], c[3]); g.fill(); });
  g.fillStyle = 'rgba(255,214,170,0.45)'; ellipse(g, 30, 12, 150, 14); g.fill();
  g.restore();
}
function drawBirds(g, t, hz) {
  g.save(); g.strokeStyle = 'rgba(40,40,60,0.75)'; g.lineWidth = 3; g.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const p = ((t * 0.07 + i * 0.13) % 1.4) - 0.2;
    const x = -100 + p * 1400 + i * 25, y = hz - 600 + Math.sin(p * 6 + i) * 40 - i * 22;
    const fl = Math.sin(t * 9 + i * 1.7) * 9, s = 1 + (i % 3) * 0.3;
    g.beginPath(); g.moveTo(x - 12 * s, y - fl * s * 0.6); g.quadraticCurveTo(x - 5 * s, y - 4 * s, x, y); g.quadraticCurveTo(x + 5 * s, y - 4 * s, x + 12 * s, y - fl * s * 0.6); g.stroke();
  }
  g.restore();
}

// ---------------------------------------------------------------- FAR SKYLINE (cached)
const FAR = { c: null, w: 3000, h: 1000, lights: [] };
function buildFar() {
  const c = FAR.c = mkCanvas(FAR.w, FAR.h), g = c.getContext('2d');
  const base = FAR.h - 120;
  // haze back row
  for (let i = 0; i < 46; i++) {
    const w = rr(40, 110), x = rr(0, FAR.w), h = rr(120, 420);
    g.fillStyle = mix('#a9bcd6', '#d9dde6', rr(0.2, 0.6)); g.fillRect(x, base - h, w, h + 10);
  }
  // main row 34 towers
  let x = 520;
  for (let i = 0; i < 34; i++) {
    const w = rr(55, 130), h = rr(220, 720), col = mix('#6f86a8', '#9fb2cc', rr(0, 0.6));
    g.fillStyle = col;
    const kind = i % 4;
    g.beginPath(); g.moveTo(x, base); g.lineTo(x, base - h);
    if (kind === 0) { g.lineTo(x + w * 0.5, base - h - w * 0.4); }              // pointed
    else if (kind === 1) { g.lineTo(x + w * 0.2, base - h); g.lineTo(x + w * 0.2, base - h - 40); g.lineTo(x + w * 0.8, base - h - 40); g.lineTo(x + w * 0.8, base - h); } // setback
    g.lineTo(x + w, base - h); g.lineTo(x + w, base); g.closePath(); g.fill();
    // sunlit right edge
    g.fillStyle = 'rgba(255,214,170,0.22)'; g.fillRect(x + w * 0.78, base - h, w * 0.22, h);
    // faint window grid
    g.fillStyle = 'rgba(230,236,250,0.10)';
    for (let yy = base - h + 12; yy < base - 10; yy += 14) g.fillRect(x + 6, yy, w - 12, 3);
    if (hash(i * 3.3) > 0.45) { // antenna
      g.strokeStyle = col; g.lineWidth = 3; line(g, x + w / 2, base - h - (kind === 1 ? 40 : 0), x + w / 2, base - h - 90);
      FAR.lights.push([x + w / 2, base - h - 92, hash(i) * 3]);
    }
    x += w + rr(-10, 30);
    if (x > FAR.w - 100) x = rr(500, 900);
  }
  // river band + far bank
  g.fillStyle = '#8ea6c4'; g.fillRect(0, base - 6, FAR.w, 130);
  // suspension bridge on the left
  const bx0 = 40, bx1 = 640, deck = base - 70;
  g.strokeStyle = '#5d7394'; g.fillStyle = '#5d7394';
  [[170, 250], [510, 250]].forEach(([tx, th]) => { g.fillRect(tx - 9, deck - th, 18, th + 60); g.fillRect(tx - 14, deck - th + 30, 28, 8); g.fillRect(tx - 14, deck - th + 120, 28, 8); });
  g.fillRect(bx0, deck, bx1 - bx0, 10);
  g.lineWidth = 3; g.beginPath(); g.moveTo(bx0, deck - 10); g.quadraticCurveTo(100, deck - 120, 170, deck - 250);
  g.quadraticCurveTo(340, deck - 20, 510, deck - 250); g.quadraticCurveTo(580, deck - 120, bx1, deck - 10); g.stroke();
  g.lineWidth = 1;
  for (let xx = bx0 + 10; xx < bx1; xx += 14) {
    let yy;
    if (xx < 170) yy = deck - 10 - (xx - bx0) / 130 * 240 * ((xx - bx0) / 130);
    else if (xx < 510) { const u = (xx - 340) / 170; yy = deck - 20 - 230 * u * u; }
    else { const u = (bx1 - xx) / 130; yy = deck - 10 - 240 * u * u; }
    line(g, xx, Math.max(deck - 250, yy), xx, deck);
  }
  // atmospheric haze at base
  g.fillStyle = lingrad(g, 0, base - 300, 0, base + 120, [[0, 'rgba(255,227,184,0)'], [1, 'rgba(255,227,184,0.6)']]);
  g.fillRect(0, base - 300, FAR.w, 420);
}
function drawFar(g, t, x, y, s = 1) {
  g.drawImage(FAR.c, x, y, FAR.w * s, FAR.h * s);
  // river glitter
  const base = y + (FAR.h - 120) * s;
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 70; i++) {
    const gx = x + hash(i) * FAR.w * 0.35 * s, gy = base + (6 + hash(i + 9) * 100) * s;
    const a = Math.max(0, Math.sin(t * 3 + i * 1.7)) * 0.7;
    g.fillStyle = `rgba(255,236,200,${a})`; g.fillRect(gx, gy, 10 * s, 2 * s);
  }
  // antenna lights blink
  FAR.lights.forEach(([lx, ly, ph]) => {
    const on = ((t + ph) % 1.6) < 0.5;
    if (on) { glow(g, x + lx * s, y + ly * s, 14 * s, '#ff4a3a', 0.9); g.fillStyle = '#ff6a5a'; g.fillRect(x + lx * s - 2, y + ly * s - 2, 4, 4); }
  });
  g.restore();
}

// ---------------------------------------------------------------- MID TOWERS (cached individually)
const TOWERS = [];
function buildTowers() {
  const types = ['glass', 'deco', 'brick', 'modern', 'glass', 'brick', 'deco', 'glass', 'modern', 'brick', 'glass', 'deco', 'glass', 'modern', 'glass'];
  let x = -900;
  types.forEach((type, i) => {
    const w = type === 'brick' ? rr(220, 300) : rr(260, 380);
    const h = type === 'brick' ? rr(650, 900) : rr(1250, 1800);
    const T = { type, x, w, h, c: null, bb: null, seed: i };
    T.c = drawTowerCache(T);
    TOWERS.push(T);
    x += w + rr(20, 90);
  });
}
function drawTowerCache(T) {
  const pad = 80, c = mkCanvas(T.w + pad * 2, T.h + 260), g = c.getContext('2d');
  g.translate(pad, 260);
  const w = T.w, h = T.h;
  if (T.type === 'glass') {
    // curtain wall: sky reflection gradient + orange sun reflections + mullions
    g.fillStyle = lingrad(g, 0, 0, w, 0, [[0, '#4d6f97'], [0.5, '#7fa6cf'], [0.8, '#f2b98a'], [1, '#ffd7a8']]); g.fillRect(0, 0, w, h);
    g.fillStyle = lingrad(g, 0, 0, 0, h, [[0, 'rgba(255,255,255,0.18)'], [0.5, 'rgba(255,255,255,0)'], [1, 'rgba(20,30,60,0.25)']]); g.fillRect(0, 0, w, h);
    // reflected neighbour tower silhouettes
    g.fillStyle = 'rgba(40,60,95,0.25)';
    for (let k = 0; k < 4; k++) { const rx = hash(T.seed * 9 + k) * w, rw = 30 + hash(k + T.seed) * 70; g.fillRect(rx, h * 0.3 + k * 60, rw, h); }
    // diagonal glints
    g.save(); g.globalCompositeOperation = 'lighter';
    g.fillStyle = 'rgba(255,220,170,0.18)'; poly(g, [w * 0.2, 0, w * 0.45, 0, w * 0.05, h * 0.5, -w * 0.2, h * 0.5]); g.fill();
    g.restore();
    g.strokeStyle = 'rgba(30,45,70,0.55)'; g.lineWidth = 2;
    for (let yy = 0; yy < h; yy += 34) line(g, 0, yy, w, yy);
    g.lineWidth = 1.5; for (let xx = 0; xx < w; xx += 26) line(g, xx, 0, xx, h);
    g.fillStyle = '#2e4466'; g.fillRect(-6, -14, w + 12, 16);                                 // crown
    g.fillStyle = '#3a5274'; g.fillRect(w * 0.3, -60, w * 0.4, 48);
    g.strokeStyle = '#3a5274'; g.lineWidth = 4; line(g, w * 0.5, -60, w * 0.5, -180);
  } else if (T.type === 'deco') {
    const stone = '#c9b49a';
    const tiers = [[0, 0, w, h], [w * 0.1, -h * 0.12, w * 0.8, h * 0.12], [w * 0.22, -h * 0.2, w * 0.56, h * 0.08], [w * 0.34, -h * 0.25, w * 0.32, h * 0.05]];
    tiers.forEach(([x, y, ww, hh], k) => {
      g.fillStyle = lingrad(g, x, 0, x + ww, 0, [[0, shade(stone, -0.25)], [0.6, stone], [1, '#f3d6ae']]); g.fillRect(x, y, ww, hh);
      g.fillStyle = 'rgba(80,60,40,0.35)';
      for (let xx = x + 10; xx < x + ww - 8; xx += 18) g.fillRect(xx, y + 6, 6, hh - 10);            // vertical ribs/window strips
    });
    g.fillStyle = shade(stone, -0.1); poly(g, [w * 0.44, -h * 0.25, w * 0.56, -h * 0.25, w * 0.5, -h * 0.25 - 240]); g.fill(); // spire
    g.fillStyle = 'rgba(255,220,170,0.4)'; poly(g, [w * 0.5, -h * 0.25, w * 0.56, -h * 0.25, w * 0.5, -h * 0.25 - 240]); g.fill();
  } else if (T.type === 'brick') {
    const brick = pick(['#9a5a43', '#8b4f3c', '#a8664a', '#7e4a3a']);
    g.fillStyle = lingrad(g, 0, 0, w, 0, [[0, shade(brick, -0.25)], [0.7, brick], [1, shade(brick, 0.2)]]); g.fillRect(0, 0, w, h);
    for (let yy = 30; yy < h - 20; yy += 56) for (let xx = 18; xx < w - 30; xx += 42) {
      g.fillStyle = '#2b3445'; g.fillRect(xx, yy, 24, 34);
      g.fillStyle = 'rgba(255,220,170,0.25)'; g.fillRect(xx + 14, yy, 10, 34);
      g.fillStyle = '#e8dcc8'; g.fillRect(xx - 2, yy + 34, 28, 4);
    }
    // fire escape
    g.strokeStyle = '#2a2a2e'; g.lineWidth = 2;
    for (let yy = 60; yy < h - 60; yy += 56) { g.strokeRect(w * 0.35, yy + 30, w * 0.3, 2); line(g, w * 0.35, yy + 32, w * 0.65, yy + 86); }
    g.fillStyle = shade(brick, -0.3); g.fillRect(-6, -10, w + 12, 14);                                 // cornice
    drawWaterTank(g, w * 0.65, -10, 1.1);
  } else { // modern office with LED billboard
    g.fillStyle = lingrad(g, 0, 0, w, 0, [[0, '#4b5568'], [0.7, '#6f7b91'], [1, '#d5b894']]); g.fillRect(0, 0, w, h);
    for (let yy = 10; yy < h; yy += 30) { g.fillStyle = 'rgba(160,200,235,0.55)'; g.fillRect(6, yy, w - 12, 16); g.fillStyle = 'rgba(255,220,180,0.25)'; g.fillRect(w * 0.7, yy, w * 0.3 - 6, 16); }
    T.bb = { x: w * 0.1, y: h * 0.12, w: w * 0.8, h: Math.min(260, w * 0.6) };
    g.fillStyle = '#111'; g.fillRect(T.bb.x - 8, T.bb.y - 8, T.bb.w + 16, T.bb.h + 16);
  }
  return c;
}
function drawWaterTank(g, x, y, s) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.strokeStyle = '#3a3330'; g.lineWidth = 3; line(g, -22, 0, -18, -30); line(g, 22, 0, 18, -30); line(g, -20, -10, 20, -26); line(g, 20, -10, -20, -26);
  g.fillStyle = lingrad(g, -26, 0, 26, 0, [[0, '#5e4636'], [0.7, '#8a684d'], [1, '#c79a72']]); g.fillRect(-26, -86, 52, 58);
  g.strokeStyle = 'rgba(30,20,15,0.6)'; g.lineWidth = 2; [-76, -58, -40].forEach(yy => line(g, -26, yy, 26, yy));
  g.fillStyle = '#4a3a30'; poly(g, [-30, -86, 30, -86, 0, -116]); g.fill();
  g.restore();
}
function drawTowers(g, t, groundY, opts = {}) {
  TOWERS.forEach((T, i) => {
    if (opts.skip && opts.skip.includes(i)) return;
    g.drawImage(T.c, T.x - 80, groundY - T.h - 260);
    if (T.bb) drawBillboard(g, t, T.x + T.bb.x, groundY - T.h + T.bb.y, T.bb.w, T.bb.h, i, opts.alert);
    if (T.type === 'glass') { // moving sun glint
      const gy = groundY - T.h + ((t * 60 + i * 300) % (T.h + 400)) - 200;
      g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,230,190,0.18)';
      g.fillRect(T.x + T.w * 0.55, gy, T.w * 0.45, 70); g.restore();
    }
  });
}
function drawBillboard(g, t, x, y, w, h, i, alert) {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  if (alert) {
    const on = (t % 0.8) < 0.5;
    g.fillStyle = on ? '#d0121b' : '#5a0508'; g.fillRect(x, y, w, h);
    g.fillStyle = '#fff'; g.font = `800 ${h * 0.22}px Poppins, Arial, sans-serif`; g.textAlign = 'center';
    g.fillText('EMERGENCY', x + w / 2, y + h * 0.42); g.fillText('ALERT', x + w / 2, y + h * 0.72);
  } else {
    const ph = Math.floor((t + i * 2) / 3) % 3;
    const cols = [['#ff7a59', '#ffd166'], ['#3a86ff', '#8ecae6'], ['#06d6a0', '#118ab2']][ph];
    g.fillStyle = lingrad(g, x, y, x + w, y + h, [[0, cols[0]], [1, cols[1]]]); g.fillRect(x, y, w, h);
    g.fillStyle = 'rgba(255,255,255,0.9)'; g.font = `800 ${h * 0.2}px Poppins, Arial, sans-serif`; g.textAlign = 'center';
    g.fillText(['FRESH BREW', 'NH METRO', 'HARBOR FM'][ph], x + w / 2, y + h * 0.45);
    g.font = `700 ${h * 0.1}px Poppins, Arial, sans-serif`; g.fillText(['open 24/7', 'ride the 4 line', '101.4 morning show'][ph], x + w / 2, y + h * 0.66);
    const sweep = ((t * 0.6) % 1.4) - 0.2; g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x + sweep * w, y, w * 0.12, h);
  }
  g.restore();
  g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = alert ? 'rgba(255,40,40,0.12)' : 'rgba(255,200,150,0.06)'; g.fillRect(x - 40, y - 40, w + 80, h + 80); g.restore();
}

// ---------------------------------------------------------------- STOREFRONT ROW (cached: interior + facade)
const SHOP_W = 7 * SM, SHOP_LEVEL = 4.2 * SM;
const SHOPS = [
  { name: 'FIXIT PHONE REPAIR', kind: 'phone', awn: ['#2b6cb0', '#ffffff'], sign: '#1d3557', floors: 2, brick: '#8d5a45' },
  { name: "KIM'S FLOWERS", kind: 'flowers', awn: ['#e76f9a', '#fff0f5'], sign: '#5b2a3c', floors: 1, brick: '#a4694d' },
  { name: 'HARBOR BAGELS', kind: 'bagels', awn: ['#1f8a8a', '#f4f1de'], sign: '#123c3c', floors: 3, brick: '#7d4b3b' },
  { name: 'LUCKY STAR DELI', kind: 'deli', awn: ['#c0392b', '#f9e79f'], sign: '#2c1a12', floors: 1, brick: '#9b5d47' },
  { name: "TONY'S PIZZA", kind: 'pizza', awn: ['#2d8a3e', '#ffffff', '#c0392b'], sign: '#1a1a1a', floors: 2, brick: '#b07050' },
  { name: 'METRO PHARMACY', kind: 'pharmacy', awn: ['#ffffff', '#2fa84f'], sign: '#ffffff', floors: 1, brick: '#c9b8a0' },
  { name: 'HARBOR SAVINGS BANK', kind: 'bank', awn: null, sign: '#d9cdb5', floors: 2, brick: '#d4c7ae' },
  { name: 'HARBOR ONE', kind: 'tower', awn: null, sign: '#1b2a3a', floors: 0, brick: '#2e4466' },
];
const STRIP = { x0: -700, inner: null, facade: null, w: SHOPS.length * SHOP_W, h: 15 * SM, windows: [], doors: [], neon: [], revolving: [] };
function buildStrip() {
  const Wd = STRIP.w, Hd = STRIP.h;
  const ci = STRIP.inner = mkCanvas(Wd, Hd), gi = ci.getContext('2d');
  const cf = STRIP.facade = mkCanvas(Wd, Hd), gf = cf.getContext('2d');
  const gy = Hd; // ground at bottom
  SHOPS.forEach((S, i) => {
    const x = i * SHOP_W;
    const upH = S.floors * 3.1 * SM;
    // ---------- interior (seen through glass)
    gi.fillStyle = lingrad(gi, 0, gy - SHOP_LEVEL, 0, gy, [[0, '#f6e2c0'], [1, '#c9a67d']]);
    if (S.kind === 'tower') gi.fillStyle = lingrad(gi, 0, gy - SHOP_LEVEL * 1.6, 0, gy, [[0, '#e9eef4'], [1, '#aab6c4']]);
    gi.fillRect(x, gy - SHOP_LEVEL * 1.7, SHOP_W, SHOP_LEVEL * 1.7);
    for (let k = 0; k < 4; k++) { glowRect(gi, x + 80 + k * 170, gy - SHOP_LEVEL + 40); }  // ceiling lights
    drawShopInterior(gi, S, x, gy);
    // ---------- facade
    if (S.kind === 'tower') { drawTowerLobby(gf, S, x, gy); return; }
    // upper floors
    gf.fillStyle = lingrad(gf, x, 0, x + SHOP_W, 0, [[0, shade(S.brick, -0.22)], [0.75, S.brick], [1, shade(S.brick, 0.18)]]);
    gf.fillRect(x, gy - SHOP_LEVEL - upH, SHOP_W, upH + 4);
    // brick texture
    gf.fillStyle = 'rgba(0,0,0,0.06)';
    for (let yy = gy - SHOP_LEVEL - upH; yy < gy - SHOP_LEVEL; yy += 9) for (let xx = x + ((yy / 9) % 2) * 12; xx < x + SHOP_W; xx += 24) gf.fillRect(xx, yy, 22, 1.5);
    for (let f = 0; f < S.floors; f++) {
      const fy = gy - SHOP_LEVEL - (f + 1) * 3.1 * SM + 50;
      for (let k = 0; k < 4; k++) {
        const wx = x + 70 + k * 165;
        gf.fillStyle = '#e9dcc5'; gf.fillRect(wx - 8, fy - 14, 106, 14); gf.fillRect(wx - 6, fy + 196, 102, 12);    // lintel / sill
        gf.fillStyle = lingrad(gf, wx, fy, wx + 90, fy + 196, [[0, '#2c3b55'], [0.6, '#46618a'], [1, '#f0c79a']]); gf.fillRect(wx, fy, 90, 196);
        gf.fillStyle = 'rgba(255,255,255,0.14)'; poly(gf, [wx + 50, fy, wx + 80, fy, wx + 20, fy + 196, wx - 10 + 10, fy + 196]); gf.fill();
        gf.strokeStyle = '#efe6d6'; gf.lineWidth = 5; gf.strokeRect(wx, fy, 90, 196); line(gf, wx, fy + 98, wx + 90, fy + 98);
        if (hash(i * 31 + f * 7 + k) > 0.7) { gf.fillStyle = 'rgba(240,230,200,0.85)'; gf.fillRect(wx + 4, fy + 4, 82, 60); } // blind
        if (hash(i * 13 + f * 3 + k) > 0.8) { gf.fillStyle = '#3d7a3a'; ellipse(gf, wx + 45, fy + 196, 40, 12); gf.fill(); }  // planter
      }
      if (S.floors >= 4 && f < S.floors - 1 && (i % 2 === 0)) drawFireEscape(gf, x + SHOP_W - 300, fy - 30, 260);
    }
    // cornice + water tank
    gf.fillStyle = shade(S.brick, -0.35); gf.fillRect(x - 6, gy - SHOP_LEVEL - upH - 22, SHOP_W + 12, 26);
    gf.fillStyle = shade(S.brick, 0.25); gf.fillRect(x - 6, gy - SHOP_LEVEL - upH - 26, SHOP_W + 12, 6);
    if (i % 3 !== 2) drawWaterTank(gf, x + 180 + (i % 2) * 300, gy - SHOP_LEVEL - upH - 22, 2.4);
    // storefront level frame
    drawStorefront(gf, S, x, gy, i);
  });
}
function glowRect(g, x, y) { g.fillStyle = radgrad(g, x, y, 0, 120, [[0, 'rgba(255,248,225,0.9)'], [1, 'rgba(255,248,225,0)']]); g.fillRect(x - 120, y - 120, 240, 240); g.fillStyle = '#fffbe8'; g.fillRect(x - 40, y - 4, 80, 8); }
function drawFireEscape(g, x, y, w) {
  g.strokeStyle = '#26262b'; g.lineWidth = 4; g.strokeRect(x, y + 330, w, 4);
  g.lineWidth = 2; for (let k = 0; k < w; k += 14) line(g, x + k, y + 300, x + k, y + 334);
  line(g, x, y + 300, x + w, y + 300);
  g.lineWidth = 4; line(g, x + 30, y + 334, x + w - 60, y + 334 - 330 + 330 + 0); // stair diagonal
  g.lineWidth = 3; for (let k = 0; k < 9; k++) line(g, x + 30 + k * 18, y + 330 - k * 34, x + 60 + k * 18, y + 330 - k * 34);
  line(g, x + 30, y + 334, x + 190, y + 30);
}
function drawShopInterior(g, S, x, gy) {
  const fl = gy - SHOP_LEVEL;
  g.save();
  if (S.kind === 'bagels' || S.kind === 'deli' || S.kind === 'pizza') {
    g.fillStyle = '#7a4a2a'; g.fillRect(x + 60, gy - 150, SHOP_W - 120, 150);                        // counter
    g.fillStyle = '#a8c8d8'; g.fillRect(x + 60, gy - 200, SHOP_W - 120, 50);                          // display glass
    g.fillStyle = '#3a2a1e'; g.fillRect(x + 80, fl + 60, SHOP_W - 160, 70);                           // menu board
    g.fillStyle = '#fff'; for (let k = 0; k < 10; k++) g.fillRect(x + 100 + (k % 5) * 110, fl + 75 + Math.floor(k / 5) * 28, 80, 6);
  } else if (S.kind === 'pharmacy' || S.kind === 'phone') {
    for (let r = 0; r < 4; r++) { g.fillStyle = '#ddd'; g.fillRect(x + 50, fl + 70 + r * 75, SHOP_W - 100, 8);
      for (let k = 0; k < 18; k++) { g.fillStyle = ['#e63946', '#457b9d', '#f1faee', '#2a9d8f', '#e9c46a'][(k + r) % 5]; g.fillRect(x + 60 + k * 36, fl + 40 + r * 75, 26, 30); } }
  } else if (S.kind === 'flowers') {
    for (let k = 0; k < 30; k++) { g.fillStyle = ['#ff6b8a', '#ffd23f', '#ee4266', '#f7f7ff', '#9b5de5'][k % 5]; circle(g, x + 60 + (k * 53) % (SHOP_W - 100), fl + 120 + Math.floor(k / 12) * 70, 18); g.fill(); }
  } else if (S.kind === 'bank') {
    g.fillStyle = '#8a7a60'; g.fillRect(x + 60, gy - 160, SHOP_W - 120, 160);
    g.fillStyle = '#c9a85a'; for (let k = 0; k < 4; k++) g.fillRect(x + 100 + k * 150, gy - 230, 90, 70);
  }
  g.restore();
}
function drawStorefront(g, S, x, gy, i) {
  const fl = gy - SHOP_LEVEL, pierW = 40;
  if (S.kind === 'bank') {
    g.fillStyle = lingrad(g, x, 0, x + SHOP_W, 0, [[0, '#b8ab92'], [0.7, '#ddd0b6'], [1, '#f6e4c4']]); g.fillRect(x, fl - 30, SHOP_W, SHOP_LEVEL + 30);
    for (let k = 0; k < 4; k++) { const cx = x + 70 + k * 190; g.fillStyle = lingrad(g, cx, 0, cx + 60, 0, [[0, '#a99c84'], [0.5, '#f2e6cc'], [1, '#bfb299']]); g.fillRect(cx, fl + 60, 60, SHOP_LEVEL - 60); g.fillRect(cx - 10, fl + 50, 80, 16); }
    g.fillStyle = '#2a2a30'; g.font = `700 40px Poppins, Arial`; g.textAlign = 'center'; g.fillText('HARBOR SAVINGS BANK', x + SHOP_W / 2, fl + 34);
    [[x + 150, 'win'], [x + 340, 'door'], [x + 530, 'win']].forEach(([wx, k]) => { const ww = 120, top = fl + 90; g.clearRect(wx, top, ww, gy - top - (k === 'win' ? 60 : 0)); STRIP.windows.push([x + wx - x, top, ww, gy - top]); glass(g, wx, top, ww, gy - top - (k === 'win' ? 60 : 0)); });
    g.fillStyle = '#222'; g.fillRect(x + 650, gy - 240, 50, 80); g.fillStyle = '#4cc9f0'; g.fillRect(x + 657, gy - 230, 36, 24); // ATM
    return;
  }
  // piers + sign band
  g.fillStyle = shade(S.brick, -0.15); g.fillRect(x, fl - 100, SHOP_W, SHOP_LEVEL + 100);
  g.fillStyle = S.sign; g.fillRect(x + 20, fl - 90, SHOP_W - 40, 92);
  g.fillStyle = S.kind === 'pharmacy' ? '#2fa84f' : '#fff6e0'; g.font = `800 50px Poppins, Arial`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(S.name, x + SHOP_W / 2 + (S.kind === 'pharmacy' ? 30 : 0), fl - 42);
  if (S.kind === 'pharmacy') { g.fillStyle = '#2fa84f'; g.fillRect(x + 60, fl - 70, 16, 52); g.fillRect(x + 42, fl - 52, 52, 16); }
  if (S.kind === 'deli') { drawStar(g, x + 70, fl - 44, 26, '#f9e79f'); drawStar(g, x + SHOP_W - 70, fl - 44, 26, '#f9e79f'); }
  g.textBaseline = 'alphabetic';
  // windows (cut out, then tinted glass)
  const winTop = fl + 20, door = { x: x + SHOP_W - 210, w: 150 };
  g.clearRect(x + pierW, winTop, door.x - x - pierW - 30, gy - winTop - 70);
  glass(g, x + pierW, winTop, door.x - x - pierW - 30, gy - winTop - 70);
  STRIP.windows.push([x + pierW, winTop, door.x - x - pierW - 30, gy - winTop - 70]);
  g.fillStyle = shade(S.brick, -0.3); g.fillRect(x + pierW, gy - 70, door.x - x - pierW - 30, 70);   // bulkhead
  g.clearRect(door.x, winTop, door.w, gy - winTop); glass(g, door.x, winTop, door.w, gy - winTop);
  g.strokeStyle = '#2a2a2a'; g.lineWidth = 8; g.strokeRect(door.x, winTop, door.w, gy - winTop);
  g.fillStyle = '#c9a85a'; g.fillRect(door.x + 20, gy - 230, 8, 60);
  STRIP.doors.push([door.x, winTop, door.w, gy - winTop]);
  // window display items
  drawDisplay(g, S, x + pierW + 10, gy - 70, door.x - x - pierW - 50);
  // neon OPEN
  if (i % 2 === 0 || S.kind === 'pizza') STRIP.neon.push([x + pierW + 50, winTop + 40, S.kind === 'pizza' ? '#ff3b6b' : '#ff5f3b']);
  // awning
  if (S.awn) drawAwning(g, x + 10, fl + 10, SHOP_W - 20, S.awn);
}
function glass(g, x, y, w, h) {
  g.fillStyle = 'rgba(170,205,230,0.18)'; g.fillRect(x, y, w, h);
  g.fillStyle = lingrad(g, x, y, x + w, y + h, [[0, 'rgba(255,255,255,0.2)'], [0.3, 'rgba(255,255,255,0.0)'], [0.55, 'rgba(255,225,190,0.16)'], [0.62, 'rgba(255,255,255,0)']]); g.fillRect(x, y, w, h);
  g.strokeStyle = '#26262a'; g.lineWidth = 6; g.strokeRect(x, y, w, h);
}
function drawStar(g, x, y, r, c) { g.fillStyle = c; g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr2 = k % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); } g.closePath(); g.fill(); }
function drawAwning(g, x, y, w, cols) {
  const d = 70, n = 14, sw = w / n;
  for (let k = 0; k < n; k++) {
    g.fillStyle = cols[k % cols.length];
    poly(g, [x + k * sw, y, x + (k + 1) * sw, y, x + (k + 1) * sw + 6, y + d, x + k * sw + 6, y + d]); g.fill();
    g.beginPath(); g.moveTo(x + k * sw + 6, y + d); g.quadraticCurveTo(x + k * sw + sw / 2 + 6, y + d + 26, x + (k + 1) * sw + 6, y + d); g.fill();
  }
  g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x, y + d - 14, w + 6, 14);
  g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x, y, w, 10);
}
function drawDisplay(g, S, x, y, w) {
  g.save();
  if (S.kind === 'bagels') for (let k = 0; k < 12; k++) { g.fillStyle = '#c98b3c'; ellipse(g, x + 30 + k * (w - 40) / 12, y - 22 - (k % 2) * 30, 22, 13); g.fill(); g.fillStyle = '#7a4a1a'; ellipse(g, x + 30 + k * (w - 40) / 12, y - 22 - (k % 2) * 30, 6, 4); g.fill(); }
  if (S.kind === 'deli') for (let k = 0; k < 6; k++) { g.fillStyle = ['#e9c46a', '#c1121f', '#f4a261'][k % 3]; rrect(g, x + 20 + k * (w - 30) / 6, y - 60, 60, 50, 8); g.fill(); }
  if (S.kind === 'pizza') for (let k = 0; k < 4; k++) { const cx = x + 60 + k * (w - 80) / 4; g.fillStyle = '#e9b44c'; circle(g, cx, y - 40, 38); g.fill(); g.fillStyle = '#d62828'; circle(g, cx, y - 40, 32); g.fill(); g.fillStyle = '#ffe8a3'; for (let p = 0; p < 6; p++) { circle(g, cx + Math.cos(p) * 18, y - 40 + Math.sin(p) * 18, 6); g.fill(); } }
  if (S.kind === 'phone') for (let k = 0; k < 8; k++) { g.fillStyle = '#111'; rrect(g, x + 20 + k * (w - 30) / 8, y - 110, 40, 80, 8); g.fill(); g.fillStyle = ['#4cc9f0', '#f72585', '#7209b7', '#3a0ca3'][k % 4]; g.fillRect(x + 24 + k * (w - 30) / 8, y - 104, 32, 64); }
  if (S.kind === 'pharmacy') { g.fillStyle = '#2fa84f'; g.font = '700 36px Poppins, Arial'; g.fillText('FLU SHOTS · OPEN 24H', x + 20, y - 40); }
  if (S.kind === 'flowers') for (let k = 0; k < 7; k++) drawFlowerBucket(g, x + 40 + k * (w - 60) / 7, y, k);
  g.restore();
}
function drawFlowerBucket(g, x, y, k) {
  g.fillStyle = '#6c7a89'; poly(g, [x - 26, y - 70, x + 26, y - 70, x + 20, y, x - 20, y]); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x - 22, y - 66, 8, 62);
  g.strokeStyle = '#3f7d3a'; g.lineWidth = 3;
  for (let s = 0; s < 7; s++) line(g, x, y - 66, x - 24 + s * 8, y - 120 - (s % 3) * 12);
  const cols = [['#ff6b8a', '#ffb3c1'], ['#ffd23f', '#fff1a8'], ['#ee4266', '#ff8fa3'], ['#f7f7ff', '#dcdcf0'], ['#9b5de5', '#cdb4f2']][k % 5];
  for (let s = 0; s < 7; s++) { const fx = x - 24 + s * 8, fy = y - 124 - (s % 3) * 12; g.fillStyle = cols[0]; circle(g, fx, fy, 11); g.fill(); g.fillStyle = cols[1]; circle(g, fx - 2, fy - 2, 5); g.fill(); }
}
function drawTowerLobby(g, S, x, gy) {
  const h = 14.6 * SM;
  g.fillStyle = lingrad(g, x, 0, x + SHOP_W, 0, [[0, '#3e5d84'], [0.6, '#86acd2'], [1, '#ffd2a0']]); g.fillRect(x, gy - h, SHOP_W, h - SHOP_LEVEL * 1.5);
  g.strokeStyle = 'rgba(20,35,55,0.6)'; g.lineWidth = 3;
  for (let yy = gy - h; yy < gy - SHOP_LEVEL * 1.5; yy += 36) line(g, x, yy, x + SHOP_W, yy);
  for (let xx = x; xx < x + SHOP_W; xx += 40) line(g, xx, gy - h, xx, gy - SHOP_LEVEL * 1.5);
  // tall glass lobby with revolving doors
  const top = gy - SHOP_LEVEL * 1.5;
  g.fillStyle = '#1b2a3a'; g.fillRect(x, top - 40, SHOP_W, 40);
  g.fillStyle = '#f3e6c8'; g.font = '800 46px Poppins, Arial'; g.textAlign = 'center'; g.fillText('HARBOR ONE', x + SHOP_W / 2, top - 6);
  g.clearRect(x + 10, top, SHOP_W - 20, gy - top); glass(g, x + 10, top, SHOP_W - 20, gy - top);
  g.strokeStyle = '#1b2a3a'; g.lineWidth = 6; for (let xx = x + 10; xx < x + SHOP_W; xx += 125) line(g, xx, top, xx, gy);
  STRIP.windows.push([x + 10, top, SHOP_W - 20, gy - top]);
  STRIP.revolving.push([x + 220, gy], [x + 520, gy]);
}
// draw the strip: interior -> live interior people -> facade -> live neon / doors
function drawStrip(g, t, sx, gy, s = 1, opts = {}) {
  const x = STRIP.x0 * s + sx, y = gy - STRIP.h * s;
  g.drawImage(STRIP.inner, x, y, STRIP.w * s, STRIP.h * s);
  // people inside the shops (silhouettes moving behind glass)
  g.save();
  for (let k = 0; k < 22; k++) {
    const wi = STRIP.windows[k % STRIP.windows.length];
    const px = x + (wi[0] + (hash(k * 7) * 0.8 + 0.1) * wi[2] + Math.sin(t * 0.4 + k) * 30 * (opts.panic ? 4 : 1)) * s;
    const py = y + (STRIP.h - 30) * s;
    drawInteriorPerson(g, px, py, s * 1.05, k, t, opts.alert);
  }
  g.restore();
  g.drawImage(STRIP.facade, x, y, STRIP.w * s, STRIP.h * s);
  // neon OPEN signs
  STRIP.neon.forEach(([nx, ny, col], k) => {
    const fl = (hash(Math.floor(t * 12) + k * 9) > 0.08) ? 1 : 0.3;
    const X = x + nx * s, Y = y + ny * s;
    g.save(); g.globalAlpha = fl;
    glow(g, X + 60 * s, Y + 20 * s, 110 * s, col, 0.7);
    g.strokeStyle = shade(col, 0.5); g.lineWidth = 4 * s; rrect(g, X, Y - 10 * s, 120 * s, 56 * s, 14 * s); g.stroke();
    g.fillStyle = '#fff1ee'; g.font = `800 ${34 * s}px Poppins, Arial`; g.textAlign = 'center'; g.fillText('OPEN', X + 60 * s, Y + 30 * s);
    g.restore();
  });
  // revolving doors
  STRIP.revolving.forEach(([rx, ry], k) => drawRevolvingDoor(g, x + rx * s, y + ry * s, s, t * (opts.revFast ? 4 : 0.6) + k));
}
function drawInteriorPerson(g, x, y, s, k, t, alert) {
  const skin = SKINS[k % SKINS.length], top = PALETTES[k % PALETTES.length].top;
  g.fillStyle = shade(top, -0.25); rrect(g, x - 22 * s, y - 150 * s, 44 * s, 110 * s, 16 * s); g.fill();
  g.fillStyle = shade(skin, -0.1); circle(g, x, y - 168 * s, 18 * s); g.fill();
  g.fillStyle = '#2a2018'; ellipse(g, x, y - 180 * s, 18 * s, 9 * s); g.fill();
  if (alert) { glow(g, x + 10 * s, y - 120 * s, 40 * s, '#ff2d2d', 0.8); g.fillStyle = '#ff5050'; g.fillRect(x + 6 * s, y - 128 * s, 8 * s, 14 * s); }
}
function drawRevolvingDoor(g, x, y, s, a) {
  const r = 110 * s, h = 300 * s;
  g.save();
  g.fillStyle = 'rgba(30,45,65,0.35)'; g.fillRect(x - r, y - h, r * 2, h);
  g.fillStyle = '#1b2a3a'; g.fillRect(x - r - 6 * s, y - h - 20 * s, r * 2 + 12 * s, 24 * s);
  for (let k = 0; k < 4; k++) {
    const ang = a * 1.5 + k * Math.PI / 2, px = Math.cos(ang) * r;
    const depth = Math.sin(ang);
    g.fillStyle = depth > 0 ? 'rgba(200,225,245,0.45)' : 'rgba(120,150,180,0.3)';
    g.fillRect(Math.min(x, x + px), y - h, Math.abs(px), h);
    g.strokeStyle = '#c9d6e3'; g.lineWidth = 4 * s; line(g, x + px, y - h, x + px, y);
  }
  g.strokeStyle = '#d9e2ec'; g.lineWidth = 6 * s; line(g, x, y - h, x, y);
  g.restore();
}

// ---------------------------------------------------------------- SIDEWALK / ROAD
function drawSidewalk(g, x0, x1, y0, y1, opts = {}) {
  g.fillStyle = lingrad(g, 0, y0, 0, y1, [[0, '#cfc6b8'], [1, '#b8afa2']]); g.fillRect(x0, y0, x1 - x0, y1 - y0);
  g.strokeStyle = 'rgba(80,70,60,0.35)'; g.lineWidth = 2;
  const sl = opts.slab || 150;
  for (let x = Math.floor(x0 / sl) * sl; x < x1; x += sl) { const sk = (y1 - y0) * 0.35; line(g, x, y0, x - sk, y1); }
  const rows = opts.rows || 2; for (let r = 1; r < rows; r++) line(g, x0, lerp(y0, y1, r / rows), x1, lerp(y0, y1, r / rows));
  // stains & cracks
  g.fillStyle = 'rgba(90,80,70,0.08)'; for (let k = 0; k < 20; k++) { ellipse(g, lerp(x0, x1, hash(k * 3.7 + x0)), lerp(y0, y1, hash(k * 1.3)), 30, 8); g.fill(); }
  // warm sun wash from the right
  g.fillStyle = lingrad(g, x0, 0, x1, 0, [[0, 'rgba(255,200,140,0)'], [1, 'rgba(255,200,140,0.12)']]); g.fillRect(x0, y0, x1 - x0, y1 - y0);
}
function drawCurb(g, x0, x1, y, h = 22) {
  g.fillStyle = '#ddd5c8'; g.fillRect(x0, y, x1 - x0, h * 0.4);
  g.fillStyle = '#9e958a'; g.fillRect(x0, y + h * 0.4, x1 - x0, h * 0.6);
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x0, y + h, x1 - x0, 6);
}
// 4-lane avenue between yTop and yBot (lane 0 nearest the far sidewalk)
function drawRoad(g, x0, x1, yTop, yBot, t, opts = {}) {
  g.fillStyle = lingrad(g, 0, yTop, 0, yBot, [[0, '#4f535b'], [1, '#3b3f46']]); g.fillRect(x0, yTop, x1 - x0, yBot - yTop);
  // asphalt texture
  g.fillStyle = 'rgba(255,255,255,0.03)'; for (let k = 0; k < 120; k++) g.fillRect(lerp(x0, x1, hash(k * 1.91)), lerp(yTop, yBot, hash(k * 7.3)), 6, 2);
  const lh = (yBot - yTop) / 4;
  // lane markings
  g.fillStyle = '#e8e2d0';
  for (let l = 1; l < 4; l++) {
    const y = yTop + l * lh;
    if (l === 2) { g.fillStyle = '#e8c547'; g.fillRect(x0, y - 5, x1 - x0, 4); g.fillRect(x0, y + 2, x1 - x0, 4); g.fillStyle = '#e8e2d0'; }
    else for (let x = Math.floor(x0 / 120) * 120; x < x1; x += 120) g.fillRect(x, y - 2, 60, 5);
  }
  // potholes & manhole
  [[x0 + 700, yTop + lh * 0.6], [x0 + 1900, yTop + lh * 3.4]].forEach(([px, py]) => { g.fillStyle = '#2b2e33'; ellipse(g, px, py, 34, 10); g.fill(); g.fillStyle = 'rgba(255,255,255,0.08)'; ellipse(g, px + 3, py - 3, 26, 5); g.fill(); });
  if (opts.manhole) { const [mx, my] = opts.manhole; g.fillStyle = '#2d2f33'; ellipse(g, mx, my, 50, 14); g.fill(); g.strokeStyle = '#5c5f66'; g.lineWidth = 3; ellipse(g, mx, my, 44, 11); g.stroke(); for (let k = -2; k <= 2; k++) line(g, mx - 40, my + k * 4, mx + 40, my + k * 4); }
  // crosswalk
  if (opts.cross) {
    const [cx, cw] = opts.cross;
    g.fillStyle = 'rgba(240,236,225,0.92)';
    const n = 9;
    for (let k = 0; k < n; k++) {
      const y = yTop + 8 + k * (yBot - yTop - 16) / n, hh = (yBot - yTop - 16) / n * 0.55;
      const sk = (y - yTop) / (yBot - yTop);
      g.fillRect(cx - cw / 2 - sk * 20, y, cw + sk * 40, hh);
    }
    g.fillStyle = '#f2eee2'; g.fillRect(cx - cw / 2 - 90, yTop + 4, 8, yBot - yTop - 8); // stop line
  }
  // sun glare
  g.fillStyle = lingrad(g, x0, 0, x1, 0, [[0, 'rgba(255,190,130,0)'], [1, 'rgba(255,190,130,0.08)']]); g.fillRect(x0, yTop, x1 - x0, yBot - yTop);
}

// ---------------------------------------------------------------- STREET PROPS
function drawHydrant(g, x, y, s = 1) {
  aoShadow(g, x, y, 34 * s, 7 * s); castShadow(g, x, y, 30 * s, 160 * s);
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = lingrad(g, -20, 0, 20, 0, [[0, '#8f1d1d'], [0.6, '#d33a2c'], [1, '#ff8a6a']]);
  g.fillRect(-16, -78, 32, 70); g.fillRect(-22, -10, 44, 10); ellipse(g, 0, -80, 18, 18); g.fill();
  g.fillRect(-30, -58, 60, 16); g.fillStyle = '#e8b04a'; g.fillRect(-4, -104, 8, 10);
  circle(g, -30, -50, 8); g.fill(); circle(g, 30, -50, 8); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(6, -76, 5, 60);
  g.restore();
}
function drawLampPost(g, x, y, s = 1, lit = 0) {
  castShadow(g, x, y, 14 * s, 900 * s, 0.14);
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = '#2b3440'; g.fillRect(-14, -40, 28, 40); g.fillRect(-7, -620, 14, 590);
  g.fillStyle = 'rgba(255,220,170,0.4)'; g.fillRect(3, -600, 3, 560);
  g.strokeStyle = '#2b3440'; g.lineWidth = 10; g.beginPath(); g.moveTo(0, -610); g.quadraticCurveTo(0, -660, 70, -660); g.stroke();
  g.fillStyle = '#2b3440'; poly(g, [50, -668, 120, -668, 110, -640, 60, -640]); g.fill();
  g.fillStyle = lit ? '#fff4d0' : '#e6dcc0'; g.fillRect(64, -642, 42, 6);
  // banner
  g.fillStyle = '#1f6f8b'; g.fillRect(8, -520, 60, 120); g.fillStyle = '#f4f1de'; g.font = '800 18px Poppins, Arial'; g.fillText('NEW', 14, -480); g.fillText('HARBOR', 10, -455);
  g.restore();
  if (lit) glow(g, x + 85 * s, y - 630 * s, 220 * s, '#ffe7b0', lit);
}
function drawTrashCan(g, x, y, s = 1) {
  aoShadow(g, x, y, 38 * s, 7 * s); castShadow(g, x, y, 50 * s, 220 * s);
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = lingrad(g, -30, 0, 30, 0, [[0, '#1e4a2e'], [0.6, '#2f6e44'], [1, '#5fa070']]);
  poly(g, [-30, -110, 30, -110, 25, 0, -25, 0]); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 2; for (let k = -20; k <= 20; k += 10) line(g, k, -105, k * 0.85, -4);
  g.fillStyle = '#183b25'; g.fillRect(-34, -118, 68, 10);
  g.fillStyle = '#e9e2cf'; poly(g, [-14, -118, 4, -132, 18, -118]); g.fill(); // paper sticking out
  g.restore();
}
function drawNewsBox(g, x, y, s = 1) {
  aoShadow(g, x, y, 40 * s, 7 * s);
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = '#1d4fa0'; g.fillRect(-32, -120, 64, 100); g.fillStyle = '#163d7c'; g.fillRect(-32, -20, 8, 20); g.fillRect(24, -20, 8, 20);
  g.fillStyle = '#dfe8f3'; g.fillRect(-24, -105, 48, 40); g.fillStyle = '#222'; g.fillRect(-20, -100, 40, 6); g.fillRect(-20, -90, 30, 3); g.fillRect(-20, -84, 34, 3);
  g.fillStyle = '#fff'; g.font = '800 11px Poppins, Arial'; g.textAlign = 'center'; g.fillText('HARBOR POST', 0, -50);
  g.restore();
}
function drawMeter(g, x, y, s = 1) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = '#5b5f66'; g.fillRect(-4, -120, 8, 120);
  g.fillStyle = '#3a3e45'; rrect(g, -16, -170, 32, 52, 10); g.fill(); g.fillStyle = '#a8d8ea'; g.fillRect(-10, -162, 20, 14);
  g.fillStyle = '#e63946'; g.fillRect(-4, -142, 8, 8);
  g.restore();
}
function drawBike(g, x, y, s, col) {
  g.save(); g.translate(x, y); g.scale(s, s); g.strokeStyle = '#222'; g.lineWidth = 4;
  circle(g, -36, -28, 28); g.stroke(); circle(g, 36, -28, 28); g.stroke();
  g.strokeStyle = col; g.lineWidth = 6; poly(g, [-36, -28, -6, -28, 18, -62, -16, -62]); g.stroke(); line(g, 18, -62, 36, -28); line(g, -6, -28, -16, -70);
  g.strokeStyle = '#222'; g.lineWidth = 5; line(g, -24, -72, -8, -72); line(g, 18, -62, 20, -80); line(g, 12, -80, 28, -80);
  g.restore();
}
function drawBikeRack(g, x, y, s = 1) {
  aoShadow(g, x, y, 130 * s, 8 * s);
  g.save(); g.strokeStyle = '#7d8590'; g.lineWidth = 6 * s;
  for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(x - 90 * s + k * 60 * s, y); g.lineTo(x - 90 * s + k * 60 * s, y - 50 * s); g.arc(x - 70 * s + k * 60 * s, y - 50 * s, 20 * s, Math.PI, 0); g.lineTo(x - 50 * s + k * 60 * s, y); g.stroke(); }
  g.restore();
  ['#e63946', '#2a9d8f', '#f4a261'].forEach((c, k) => drawBike(g, x - 60 * s + k * 60 * s, y, s * 0.95, c));
}
function drawTree(g, x, y, s, t) {
  // square pit
  g.fillStyle = '#5a4634'; poly(g, [x - 70 * s, y, x + 70 * s, y, x + 60 * s, y + 18 * s, x - 80 * s, y + 18 * s]); g.fill();
  g.strokeStyle = '#3a3a3a'; g.lineWidth = 3; g.strokeRect(x - 70 * s, y, 140 * s, 18 * s);
  castShadow(g, x, y, 200 * s, 500 * s, 0.16);
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = '#5b4030'; poly(g, [-10, 0, 10, 0, 8, -260, -8, -260]); g.fill();
  g.strokeStyle = '#5b4030'; g.lineWidth = 8; line(g, 0, -200, -60, -300); line(g, 0, -230, 70, -320);
  const sway = Math.sin(t * 1.3 + x) * 6;
  [[-80, -330, 90], [60, -360, 100], [0, -420, 110], [-30, -300, 80], [90, -300, 70]].forEach(([cx, cy, r], k) => {
    g.fillStyle = k % 2 ? '#4f8a3a' : '#3f7a33'; circle(g, cx + sway, cy, r); g.fill();
    g.fillStyle = 'rgba(255,214,140,0.35)'; circle(g, cx + sway + r * 0.35, cy - r * 0.2, r * 0.55); g.fill();
  });
  g.restore();
}
// steam puffs rising (manhole / vent / food cart). freeze-able via t.
function drawSteam(g, x, y, t, s = 1, n = 9, strength = 1) {
  g.save();
  for (let i = 0; i < n; i++) {
    const ph = ((t * 0.35 + i / n) % 1);
    const px = x + Math.sin(ph * 5 + i) * 30 * s + ph * 40 * s, py = y - ph * 300 * s;
    const r = (20 + ph * 70) * s, a = (1 - ph) * 0.35 * strength * Math.min(1, ph * 6);
    g.fillStyle = radgrad(g, px, py, 0, r, [[0, `rgba(250,248,245,${a})`], [1, 'rgba(250,248,245,0)']]);
    g.fillRect(px - r, py - r, r * 2, r * 2);
  }
  g.restore();
}
function drawVent(g, x, y, s = 1) { g.fillStyle = '#3c3f44'; g.fillRect(x - 60 * s, y - 6 * s, 120 * s, 14 * s); g.strokeStyle = '#6a6e75'; g.lineWidth = 2; for (let k = -50; k <= 50; k += 10) line(g, x + k * s, y - 5 * s, x + k * s, y + 7 * s); }

// traffic light pole: phase 'g' 'y' 'r'; ped 'walk' | 'dont'
function drawTrafficLight(g, x, y, s, phase, ped, t) {
  castShadow(g, x, y, 14 * s, 600 * s, 0.14);
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = '#2a2f36'; g.fillRect(-7, -560, 14, 560); g.fillRect(-7, -560, 260, 12);
  // car signal on the arm
  g.fillStyle = '#e0b020'; rrect(g, 180, -548, 56, 150, 10); g.fill(); g.fillStyle = '#1d1f22'; rrect(g, 186, -542, 44, 138, 8); g.fill();
  [['r', '#ff3b30', -518], ['y', '#ffcc00', -473], ['g', '#30d158', -428]].forEach(([p, c, yy]) => {
    const on = p === phase;
    g.fillStyle = on ? c : shade(c, -0.7); circle(g, 208, yy, 16); g.fill();
    if (on) { g.restore(); glow(g, x + 208 * s, y + yy * s, 70 * s, c, 0.9); g.save(); g.translate(x, y); g.scale(s, s); }
  });
  // pedestrian signal on the pole
  g.fillStyle = '#1d1f22'; rrect(g, -42, -330, 64, 64, 8); g.fill();
  if (ped === 'walk') { g.fillStyle = '#f2f2f2'; drawWalker(g, -10, -298, 1); }
  else { const on = ped === 'dont' || (Math.floor(t * 2) % 2 === 0); if (on) { g.fillStyle = '#ff7a1a'; drawHand(g, -10, -298); } }
  g.fillStyle = '#c9c9c9'; g.fillRect(-60, -230, 50, 34); g.fillStyle = '#1a6b3a'; g.fillRect(-58, -228, 46, 30); g.fillStyle = '#fff'; g.font = '700 12px Poppins, Arial'; g.fillText('HARBOR', -56, -214); g.fillText('ST', -56, -201);
  g.restore();
  if (ped) glow(g, x - 10 * s, y - 298 * s, 50 * s, ped === 'walk' ? '#ffffff' : '#ff7a1a', 0.6);
}
function drawWalker(g, x, y, s) { circle(g, x, y - 18 * s, 5 * s); g.fill(); g.fillRect(x - 3 * s, y - 12 * s, 6 * s, 14 * s); g.save(); g.strokeStyle = g.fillStyle; g.lineWidth = 4 * s; line(g, x, y + 2 * s, x - 8 * s, y + 18 * s); line(g, x, y + 2 * s, x + 8 * s, y + 18 * s); line(g, x, y - 10 * s, x - 9 * s, y); line(g, x, y - 10 * s, x + 9 * s, y - 2 * s); g.restore(); }
function drawHand(g, x, y) { rrect(g, x - 12, y - 6, 24, 22, 6); g.fill(); for (let k = 0; k < 4; k++) { rrect(g, x - 12 + k * 6.5, y - 22 + Math.abs(k - 1.5) * 2, 5, 20, 2.5); g.fill(); } rrect(g, x - 20, y - 2, 10, 6, 3); g.fill(); }
function drawSign(g, x, y, s, txt, col = '#1a6b3a') {
  g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = '#6b7078'; g.fillRect(-4, -300, 8, 300);
  g.fillStyle = col; rrect(g, -70, -300, 140, 44, 6); g.fill(); g.fillStyle = '#fff'; g.font = '800 22px Poppins, Arial'; g.textAlign = 'center'; g.fillText(txt, 0, -270);
  g.fillStyle = '#fff'; rrect(g, -30, -250, 60, 70, 6); g.fill(); g.fillStyle = '#c1121f'; g.font = '800 16px Poppins, Arial'; g.fillText('NO', 0, -228); g.fillText('PARK', 0, -210); g.fillText('ING', 0, -192);
  g.restore();
}

// ---------------------------------------------------------------- FOOD CART + VENDOR
function drawFoodCart(g, x, y, s, t, o = {}) {
  aoShadow(g, x, y + 4 * s, 160 * s, 12 * s); castShadow(g, x, y, 260 * s, 300 * s, 0.18);
  g.save(); g.translate(x, y); g.scale(s, s);
  // umbrella pole + umbrella
  g.fillStyle = '#888'; g.fillRect(-4, -420, 8, 270);
  const ucols = ['#e63946', '#f1faee'];
  for (let k = 0; k < 8; k++) { g.fillStyle = ucols[k % 2]; poly(g, [0, -440, -170 + k * 42.5, -360, -170 + (k + 1) * 42.5, -360]); g.fill(); }
  g.fillStyle = 'rgba(0,0,0,0.12)'; poly(g, [0, -440, 0, -360, 170, -360]); g.fill();
  for (let k = 0; k < 8; k++) { g.fillStyle = ucols[k % 2]; g.beginPath(); g.arc(-170 + k * 42.5 + 21, -360, 21, 0, Math.PI); g.fill(); }
  // cart body (silver)
  g.fillStyle = lingrad(g, -150, 0, 150, 0, [[0, '#8e969f'], [0.4, '#d9dee3'], [0.7, '#f4f6f8'], [1, '#b0b8c0']]);
  rrect(g, -150, -190, 300, 150, 10); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2; for (let k = -130; k < 150; k += 30) line(g, k, -185, k, -45);
  g.fillStyle = '#c0392b'; g.fillRect(-150, -205, 300, 20); g.fillStyle = '#fff'; g.font = '800 18px Poppins, Arial'; g.textAlign = 'center'; g.fillText('HOT DOGS · PRETZELS', 0, -189);
  // menu board
  g.fillStyle = '#222'; g.fillRect(-140, -175, 120, 90); g.fillStyle = '#ffd166'; g.font = '700 14px Poppins, Arial'; g.textAlign = 'left';
  ['HOT DOG  $3', 'PRETZEL  $4', 'SODA     $2', 'COFFEE   $2'].forEach((m, k) => g.fillText(m, -134, -155 + k * 20));
  // grill top
  g.fillStyle = '#333'; g.fillRect(-20, -215, 150, 14);
  for (let k = 0; k < 5; k++) { g.fillStyle = '#b5651d'; rrect(g, -10 + k * 28, -226, 24, 12, 6); g.fill(); }
  // wheels
  g.fillStyle = '#222'; circle(g, -100, -30, 30); g.fill(); circle(g, 100, -30, 30); g.fill();
  g.fillStyle = '#999'; circle(g, -100, -30, 10); g.fill(); circle(g, 100, -30, 10); g.fill();
  g.restore();
  drawSteam(g, x + 50 * s, y - 230 * s, o.tf == null ? t : o.tf, s * 0.7, 7, 0.9);
}

// ---------------------------------------------------------------- PIGEONS
function drawPigeon(g, x, y, s, t, mode, seed, dir = 1) {
  g.save(); g.translate(x, y); g.scale(s * dir, s);
  if (mode === 'fly') {
    const fl = Math.sin(t * 28 + seed * 3);
    g.fillStyle = '#7d8696'; ellipse(g, 0, 0, 16, 8); g.fill();
    g.fillStyle = '#5f6878'; poly(g, [-4, 0, 6, 0, -6, -24 * fl]); g.fill(); poly(g, [-2, 0, 8, 0, 4, -20 * fl]); g.fill();
    g.fillStyle = '#4a5260'; circle(g, 14, -4, 6); g.fill(); g.fillStyle = '#e8b04a'; poly(g, [19, -4, 25, -3, 19, -1]); g.fill();
    g.fillStyle = '#5f6878'; poly(g, [-14, 0, -24, -4, -24, 5]); g.fill();
  } else {
    const peck = mode === 'peck' ? Math.max(0, Math.sin(t * 6 + seed * 2.1)) : 0;
    aoShadow(g, 0, 2, 16, 4, 0.3);
    g.fillStyle = '#8a93a3'; ellipse(g, 0, -12, 16, 11); g.fill();
    g.fillStyle = '#6b7484'; ellipse(g, -4, -12, 12, 7); g.fill();
    g.fillStyle = '#5f6878'; poly(g, [-12, -12, -26, -16, -24, -6]); g.fill();
    const hx = 12 + peck * 6, hy = -22 + peck * 16;
    g.fillStyle = '#4f7a76'; circle(g, hx - 3, hy + 6, 6); g.fill();     // iridescent neck
    g.fillStyle = '#5a6272'; circle(g, hx, hy, 6.5); g.fill();
    g.fillStyle = '#e8b04a'; poly(g, [hx + 5, hy, hx + 11, hy + 2, hx + 5, hy + 3]); g.fill();
    g.fillStyle = '#ff8c42'; circle(g, hx + 2, hy - 1, 1.6); g.fill();
    g.strokeStyle = '#d06a6a'; g.lineWidth = 2; line(g, -2, -2, -4, 2); line(g, 4, -2, 5, 2);
  }
  g.restore();
}
// a flock that pecks until tUp then explodes upward
function drawPigeonFlock(g, cx, cy, t, tUp, n = 8, s = 1, seed = 0) {
  for (let i = 0; i < n; i++) {
    const k = seed * 31 + i, ox = (hash(k) - 0.5) * 300 * s, oy = (hash(k + 4) - 0.5) * 30 * s;
    const dir = hash(k + 9) > 0.5 ? 1 : -1;
    if (tUp == null || t < tUp) drawPigeon(g, cx + ox + Math.sin(t * 0.5 + k) * 10, cy + oy, s, t, 'peck', k, dir);
    else {
      const u = t - tUp, vx = (hash(k + 2) - 0.5) * 700, vy = -600 - hash(k + 3) * 500;
      drawPigeon(g, cx + ox + vx * u * s, cy + oy + (vy * u + 120 * u * u) * s, s * (1 + u * 0.3), t, 'fly', k, vx > 0 ? 1 : -1);
    }
  }
}

// ---------------------------------------------------------------- SUBWAY ENTRANCE (street level)
function drawSubwayEntrance(g, x, y, s, t, o = {}) {
  aoShadow(g, x, y + 6 * s, 260 * s, 14 * s);
  g.save(); g.translate(x, y); g.scale(s, s);
  // stair opening (dark, going down)
  g.fillStyle = '#1a1d22'; poly(g, [-200, 0, 200, 0, 220, 40, -220, 40]); g.fill();
  for (let k = 0; k < 5; k++) { g.fillStyle = k % 2 ? '#3a3e45' : '#2e3238'; g.fillRect(-200 + k * 6, 4 + k * 7, 400 - k * 12, 6); g.fillStyle = '#e0b020'; g.fillRect(-200 + k * 6, 4 + k * 7, 400 - k * 12, 2); }
  // green railings
  g.strokeStyle = '#1e6b3a'; g.lineWidth = 10;
  g.strokeRect(-210, -110, 420, 110);
  g.lineWidth = 5; for (let k = -200; k <= 200; k += 25) line(g, k, -110, k, 0);
  g.lineWidth = 12; line(g, -216, -114, 216, -114);
  g.fillStyle = '#26804a'; g.fillRect(-218, -122, 436, 10);
  // lamp posts with glass globes
  [-210, 210].forEach(px => {
    g.fillStyle = '#1e6b3a'; g.fillRect(px - 8, -340, 16, 340);
    g.fillStyle = '#1e6b3a'; g.fillRect(px - 16, -300, 32, 12);
    const lit = 0.75 + 0.25 * Math.sin(t * 3 + px);
    g.fillStyle = radgrad(g, px, -370, 4, 36, [[0, '#fffbe6'], [0.6, '#bff0c8'], [1, '#5fbf7a']]); circle(g, px, -370, 34); g.fill();
    g.restore(); glow(g, x + px * s, y - 370 * s, 150 * s, '#c8ffd0', 0.55 * lit); g.save(); g.translate(x, y); g.scale(s, s);
  });
  // sign
  const on = o.signOn == null ? 0.25 : o.signOn;
  g.fillStyle = '#16243a'; rrect(g, -230, -290, 460, 90, 10); g.fill();
  g.fillStyle = mix('#3a8a5a', '#5dff9a', on); circle(g, -185, -245, 30); g.fill();
  g.fillStyle = '#ffffff'; g.font = '800 34px Poppins, Arial'; g.textAlign = 'center'; g.fillText('4', -185, -233);
  g.fillStyle = mix('#c9d2dc', '#ffffff', on); g.font = '800 30px Poppins, Arial'; g.textAlign = 'left'; g.fillText('LINE 4 · HARBOR', -140, -253); g.font = '700 22px Poppins, Arial'; g.fillText('STREET STATION', -140, -222);
  g.restore();
  if (on > 0.3) glow(g, x, y - 245 * s, 380 * s, '#7dffb0', on * 0.6);
}
