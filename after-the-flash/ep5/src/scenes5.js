// ============================================================================
// ep5/src/scenes5.js — Episode 5 "HIDE" (24 scenes). Six hide in the ticket
// booth; figures in white suits and gas masks arrive on a rail cart.
// Lighting: red emergency light, the cart's swinging lantern, their flashlights.
// ============================================================================
const RED_T0 = -5;
const SCENE_WHIPS = [9];
const HAZ = { name: 'haz', skin: '#e6e9ec', hair: { style: 'bald', color: '#e6e9ec' }, eye: '#111', top: '#e9ecef', topDark: '#c3c8ce', cuff: '#2a2a2e',
  bottom: '#dde1e5', shoes: '#1a1a1a', sole: '#111', wf: 1.18, hf: 1.03 };
const lanternGlow = (g, x, y, r, a = 1) => { glow(g, x, y, r, '#ffc87a', 0.8 * a); g.fillStyle = '#fff1c8'; circle(g, x, y, r * 0.06); g.fill(); };

// ---------------------------------------------------------------- gas masks + figures
function maskSide(g, x, y, r, dir) {          // gas mask on a side-view head (facing dir)
  g.save(); g.translate(x, y); g.scale(dir, 1);
  g.fillStyle = '#1b1c20'; g.beginPath(); g.moveTo(r * 0.1, -r * 0.55); g.quadraticCurveTo(r * 1.15, -r * 0.5, r * 1.1, r * 0.25); g.quadraticCurveTo(r * 1.0, r * 0.95, r * 0.15, r * 0.9); g.closePath(); g.fill();
  g.fillStyle = '#2c3a44'; circle(g, r * 0.68, -r * 0.12, r * 0.24); g.fill(); g.fillStyle = 'rgba(255,255,255,0.45)'; circle(g, r * 0.62, -r * 0.2, r * 0.07); g.fill();
  g.fillStyle = '#3a3c42'; rrect(g, r * 0.85, r * 0.3, r * 0.6, r * 0.42, r * 0.12); g.fill(); g.fillStyle = '#55585f'; g.fillRect(r * 1.3, r * 0.3, r * 0.08, r * 0.42);
  g.strokeStyle = '#111'; g.lineWidth = r * 0.12; line(g, r * 0.1, -r * 0.4, -r * 0.7, -r * 0.3);
  g.restore();
}
function maskFront(g, x, y, r, o = {}) {      // gas mask, front view
  g.save(); g.translate(x, y);
  g.fillStyle = '#1b1c20'; ellipse(g, 0, r * 0.1, r * 0.92, r * 0.95); g.fill();
  [-1, 1].forEach(sd => { g.fillStyle = '#25313a'; circle(g, sd * r * 0.38, -r * 0.08, r * 0.27); g.fill(); g.strokeStyle = '#4a4e56'; g.lineWidth = r * 0.06; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.5)'; ellipse(g, sd * r * 0.38 - r * 0.08, -r * 0.18, r * 0.07, r * 0.04, -0.6); g.fill();
    if (o.reflect) { g.save(); circle(g, sd * r * 0.38, -r * 0.08, r * 0.25); g.clip(); g.fillStyle = 'rgba(255,220,180,0.55)'; g.fillRect(sd * r * 0.38 - r * 0.1, -r * 0.14, r * 0.2, r * 0.12); g.restore(); } });
  g.fillStyle = '#3a3c42'; rrect(g, -r * 0.26, r * 0.42, r * 0.52, r * 0.5, r * 0.12); g.fill();
  g.fillStyle = '#55585f'; for (let k = 0; k < 4; k++) g.fillRect(-r * 0.2, r * 0.5 + k * r * 0.1, r * 0.4, r * 0.04);
  g.restore();
}
function hazSide(g, x, y, s, dir, P, t, o = {}) {
  const out = drawPersonSide(g, HAZ, x, y, s, dir, P, Object.assign({ t, noBlink: true }, o));
  maskSide(g, out.head[0], out.head[1], out.headR, dir);
  if (o.torch) { g.fillStyle = '#1a1a1a'; circle(g, out.hand[0], out.hand[1], 3.4 * s); g.fill(); }
  if (o.coat) { g.save(); g.translate(out.fhand[0] - dir * 6 * s, out.fhand[1] - 12 * s); g.fillStyle = '#ffd31a'; rrect(g, -9 * s, -6 * s, 18 * s, 14 * s, 3 * s); g.fill(); g.fillStyle = '#e0b000'; g.fillRect(-9 * s, 0, 18 * s, 1.5 * s); g.restore(); }
  return out;
}
function hazFront(g, x, y, s, P, t, o = {}) {
  const out = drawPersonFront(g, HAZ, x, y, s, P, Object.assign({ t, noBlink: true }, o));
  if (!o.back) maskFront(g, out.head[0], out.head[1] + out.headR * 0.05, out.headR, o);
  else { g.fillStyle = '#1b1c20'; g.fillRect(out.head[0] - out.headR * 0.9, out.head[1] - out.headR * 0.1, out.headR * 1.8, out.headR * 0.18);   // mask strap
    // big black stenciled T on the back of the suit
    const tw = 18 * s, ty = out.head[1] + out.headR * 1.6;
    g.fillStyle = '#111'; g.fillRect(x - tw / 2, ty, tw, 4 * s); g.fillRect(x - 2 * s, ty, 4 * s, 18 * s);
    g.fillStyle = 'rgba(17,17,17,0.6)'; for (let k = 0; k < 4; k++) g.fillRect(x - tw / 2 + k * tw / 4 + 1 * s, ty + 4 * s, 0.6 * s, 1 * s); }
  return out;
}
const PUSH = t => { const P = poseWalk((t * 0.8) % 1, 0.7); P.lean = 0.35; P.sh = [1.3, 1.25]; P.el = [0.2, 0.25]; return P; };

// ---------------------------------------------------------------- the rail handcart
function cartSide(g, x, y, s, t, o = {}) {
  aoShadow(g, x, y, 170 * s, 12 * s);
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = '#3d4148'; g.fillRect(-170, -70, 340, 34); g.fillStyle = '#5a5f68'; g.fillRect(-170, -76, 340, 8);
  g.fillStyle = '#2b2e33'; g.fillRect(-150, -36, 300, 14);
  [-110, 110].forEach(wx => { drawWheel(g, wx, -22, 22, (o.wheel || 0)); });
  g.fillStyle = '#2f3a2c'; rrect(g, 30, -150, 110, 76, 8); g.fill(); g.fillStyle = '#1a1d1a'; g.fillRect(40, -140, 50, 56);       // radio box
  g.fillStyle = `rgba(80,255,140,${0.5 + 0.5 * (o.radio || 0)})`; g.fillRect(96, -138, 36, 18); g.strokeStyle = '#999'; g.lineWidth = 3; line(g, 130, -150, 150, -260);
  g.fillStyle = '#6b6f78'; g.fillRect(-150, -240, 8, 170);                                                                 // lantern pole
  const sw = Math.sin(t * 2.2) * 0.35;
  g.save(); g.translate(-146, -240); g.rotate(sw); g.strokeStyle = '#333'; g.lineWidth = 3; line(g, 0, 0, 0, 30); g.fillStyle = '#2b2b2b'; g.fillRect(-14, 30, 28, 8); g.fillStyle = '#ffe2a8'; g.fillRect(-11, 38, 22, 30); g.fillStyle = '#2b2b2b'; g.fillRect(-14, 68, 28, 6); g.restore();
  g.restore();
  const lx = x + (-146 + Math.sin(sw) * -50) * s, ly = y + (-190) * s;
  lanternGlow(g, lx, ly, 260 * s, o.lantern == null ? 1 : o.lantern);
  return [lx, ly];
}
function cartFront(g, x, y, s, t, o = {}) {      // seen from the tunnel mouth: front view with 3 figures behind
  g.save(); g.translate(x, y); g.scale(s, s);
  [-90, 0, 90].forEach((fx, k) => { const P = poseFrontIdle(t, k); P.armL = 0.6; P.armR = 0.6; P.elL = 1.0; P.elR = 1.0; P.bob = Math.sin(t * 5 + k) * 0.8; hazFront(g, fx, -40, 1.25, P, t); });
  g.fillStyle = '#3d4148'; g.fillRect(-170, -70, 340, 40); g.fillStyle = '#5a5f68'; g.fillRect(-170, -76, 340, 8);
  [-120, 120].forEach(wx => { g.fillStyle = '#1a1c20'; g.fillRect(wx - 10, -30, 20, 30); });
  g.fillStyle = '#6b6f78'; g.fillRect(-150, -240, 8, 170);
  const sw = Math.sin(t * 2.2) * 0.35; g.save(); g.translate(-146, -240); g.rotate(sw); g.fillStyle = '#2b2b2b'; g.fillRect(-14, 30, 28, 8); g.fillStyle = '#ffe2a8'; g.fillRect(-11, 38, 22, 30); g.restore();
  g.restore();
  lanternGlow(g, x + (-146 + Math.sin(sw) * -50) * s, y - 190 * s, 300 * s);
}
// ---------------------------------------------------------------- the view from inside the ticket booth
const WIN = { x: 70, y: 300, w: 940, h: 900 };
function boothLook(g, t, outside, inside, o = {}) {
  g.save(); g.beginPath(); g.rect(WIN.x, WIN.y, WIN.w, WIN.h); g.clip(); outside(g); g.restore();
  // window glass, frame, counter, wall
  g.save();
  g.fillStyle = 'rgba(170,205,230,0.06)'; g.fillRect(WIN.x, WIN.y, WIN.w, WIN.h);
  g.fillStyle = 'rgba(255,255,255,0.05)'; poly(g, [WIN.x + 200, WIN.y, WIN.x + 420, WIN.y, WIN.x + 120, WIN.y + WIN.h, WIN.x - 100, WIN.y + WIN.h]); g.fill();
  g.fillStyle = '#121820'; g.fillRect(0, 0, W, WIN.y); g.fillRect(0, 0, WIN.x, H); g.fillRect(WIN.x + WIN.w, 0, W - WIN.x - WIN.w, H);
  g.fillStyle = '#1a222c'; g.fillRect(WIN.x + WIN.w / 2 - 10, WIN.y, 20, WIN.h);
  g.strokeStyle = '#0b0f14'; g.lineWidth = 24; g.strokeRect(WIN.x, WIN.y, WIN.w, WIN.h);
  g.fillStyle = '#e6dcc4'; g.font = `800 40px ${F_UI}`; g.textAlign = 'center'; g.fillText('SNEKOT', W / 2, WIN.y - 30);      // "TOKENS" seen from behind
  g.fillStyle = lingrad(g, 0, WIN.y + WIN.h, 0, H, [[0, '#3a2a1c'], [1, '#1c140e']]); g.fillRect(0, WIN.y + WIN.h, W, H);
  g.fillStyle = '#5a4430'; g.fillRect(0, WIN.y + WIN.h, W, 24);
  g.restore();
  if (inside) layer(g, 1, inside);
}
function hideHeads(g, t, light) {                // the six hiding below the window: silhouettes at the counter edge
  const heads = [[180, YOU], [420, ROSA], [650, DANIEL], [880, CROWD[11]]];
  heads.forEach(([x, C], k) => { const y = WIN.y + WIN.h + 40 + (k % 2) * 30;
    g.fillStyle = shade(C.top, -0.5); ellipse(g, x, y + 170, 170, 130); g.fill();
    g.save(); g.translate(x, y); drawHeadSide(g, C, 0, 0, 74, { t, expr: 'fear', look: [0.4, -0.5] }); g.restore(); });
  drawDog(g, 330, 1900, 4.6, 1, { mode: 'lie', tail: 'tuck', earsBack: true }, t);
  if (light) { glow(g, 230, 1600, 380, '#e8f0ff', 0.55 * light); g.fillStyle = `rgba(230,240,255,${light})`; rrect(g, 205, 1585, 40, 60, 8); g.fill(); }
}
function stationOut(g, t, o = {}) {              // the platform outside the booth, dark, red-lit; o.figs draws extra things in the world
  stationRed(g, t, { near: o.near, expr: o.expr });
  if (o.dark) { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = `rgba(2,2,4,${o.dark})`; g.fillRect(0, 0, W, H); g.restore(); }
}
function placeFig(X, Z) { const p = P3(X, 170, Z); return [p[0], p[1], 1.75 * ST.f / Z]; }

// ================================================================== 1 — RECAP + VOTE RESULT
function e5scene1(g, t, lt) {
  setCam(t, { x: 0, y: 0, z: 1.02 + lt * 0.03, shake: 0.1 });
  if (lt < 0.6) flashlit(g, t, bg => layer(bg, 1, g2 => { g2.fillStyle = '#6f5436'; g2.fillRect(-200, -200, W + 400, H + 400); raincoat(g2, t, 540, 980, 1.05, true); }), [540, 1980, 540, 900, 380], {});
  else if (lt < 1.2) { const tc = tunnelView(g, t, 2.2, k => k === ST.emerg.length - 1 ? redP(t) : 0); layer(g, 1, g2 => glow(g2, tc[0], tc[1] + 40, 200, '#fff1c8', 0.8)); }
  else flashlit(g, t, bg => layer(bg, 1, g2 => smallBooth(g2, t, 1)), [540, 1980, 600, 900, 380], {});
  rewindFX(g, t, 1 - seg(lt, 1.4, 1.75), '◀◀  EPISODE 4');
  if (lt > 1.4) { g.save(); g.fillStyle = `rgba(6,8,14,${0.45 * seg(lt, 1.4, 1.8)})`; g.fillRect(0, 0, W, H); g.restore(); }
  drawVoteResult(g, t, 0.7);
  return { capY: 1300 };
}
// ================================================================== 2 — SIX IN THE BOOTH
function e5scene2(g, t, lt) {
  setCam(t, { x: 0, y: 0, z: 1.02 + lt * 0.01, shake: 0.04 });
  boothLook(g, t, g2 => stationOut(g2, t, { dark: 0.2 }), g2 => hideHeads(g2, t, 1));
  return { capY: 1790 };
}
// ================================================================== 3 — THE OTHERS LIE FLAT BEHIND THE BENCHES
function e5scene3(g, t, lt) {
  setCam(t, { x: lerp(-20, 30, lt / 2.9), y: 0, z: 1.08, shake: 0.04 });
  flashlit(g, t, bg => { layer(bg, 1, g2 => { g2.drawImage(ST.c, 0, 0); drawCracks(g2, 1); people(g2, t, 'crouch'); }); }, [1080, 1900, 760, 1200, 300], { red: [[120, 300, 420]] });
  return { capY: 1300 };
}
// ================================================================== 4 — ROSA TURNS OFF YOUR PHONE LIGHT
function e5scene4(g, t, lt) {
  const cover = smooth(seg(t, EV.lightOff - 1.1, EV.lightOff)), on = t < EV.lightOff ? 1 : 0;
  setCam(t, { x: 0, y: 0, z: 1.04, shake: 0.05 });
  g.fillStyle = '#06070a'; g.fillRect(0, 0, W, H);
  layer(g, 1, g2 => {
    g2.fillStyle = YOU.cuff; rrect(g2, -120, 1220, 520, 300, 80); g2.fill();
    g2.fillStyle = YOU.skin; ellipse(g2, 420, 1180, 190, 150); g2.fill();
    g2.fillStyle = '#0d0d10'; rrect(g2, 400, 760, 300, 560, 46); g2.fill(); g2.fillStyle = '#25262b'; rrect(g2, 412, 772, 276, 536, 40); g2.fill();       // phone (back)
    g2.fillStyle = '#111'; rrect(g2, 430, 790, 120, 120, 30); g2.fill(); g2.fillStyle = on ? '#ffffff' : '#333'; circle(g2, 520, 860, 18); g2.fill();
    if (on) glow(g2, 520, 860, 640, '#f0f4ff', 0.95);
    g2.fillStyle = shade(YOU.skin, -0.1); for (let k = 0; k < 3; k++) { rrect(g2, 640, 960 + k * 100, 120, 70, 34); g2.fill(); }
    // Rosa's hand slides in and covers it
    const hx = lerp(1500, 600, cover);
    g2.fillStyle = ROSA.top; rrect(g2, hx + 120, 640, 700, 260, 120); g2.fill(); g2.fillStyle = '#ff7a00'; g2.fillRect(hx + 160, 640, 70, 260);
    g2.fillStyle = ROSA.skin; ellipse(g2, hx, 800, 210, 170); g2.fill();
    g2.fillStyle = shade(ROSA.skin, -0.08); for (let k = 0; k < 4; k++) { rrect(g2, hx - 260, 700 + k * 56, 240, 50, 25); g2.fill(); }
  });
  if (!on) { g.save(); g.fillStyle = 'rgba(0,0,0,0.75)'; g.fillRect(0, 0, W, H); g.restore(); }
  return { capY: 1640 };
}
// ================================================================== 5 — TOTAL DARK
function e5scene5(g, t, lt) {
  setCam(t, { x: 0, y: 0, z: 1, shake: 0.03 });
  g.fillStyle = '#020203'; g.fillRect(0, 0, W, H);
  glow(g, 120, 260, 360, '#ff3b30', 0.12 * redP(t));
  const bl = blinkAmt(t, 7); [[470, 1140], [560, 1140]].forEach(([x, y]) => { g.fillStyle = `rgba(255,200,120,${0.55 * (1 - bl)})`; ellipse(g, x, y, 9, 6 * (1 - bl) + 0.5); g.fill(); });   // Biscuit's eyes
  return { capY: 1300 };
}
// ================================================================== 6 — THE HUM BECOMES A RUMBLE
function e5scene6(g, t, lt) {
  g.save(); g.translate(snoise(t * 9) * 18, snoise(t * 9 + 40) * 14);
  tunnelView(g, t, 1.45, k => k === ST.emerg.length - 1 ? redP(t) * (0.7 + 0.3 * Math.sin(t * 40)) : 0);
  g.restore();
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = 'rgba(2,2,4,0.5)'; g.fillRect(0, 0, W, H); g.restore();
  drawDustRain(g, t, 0.6, [[200, 0], [560, 0], [900, 0]]);
  return { capY: 1300 };
}
// ================================================================== 7 — WIND OUT OF THE TUNNEL, DUST IN YOUR EYES
function e5scene7(g, t, lt) {
  const tc = tunnelView(g, t, 1.25, k => k === ST.emerg.length - 1 ? redP(t) : 0);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = 'rgba(2,2,4,0.45)'; g.fillRect(0, 0, W, H);
  for (let k = 0; k < 140; k++) { const u = ((t * (0.5 + hash(k) * 0.6) + hash(k + 3)) % 1), a = hash(k + 7) * TAU, d = u * u * 1400;
    const x = W / 2 - 160 + Math.cos(a) * d, y = 820 + Math.sin(a) * d * 0.8, r = 1 + u * 6;
    g.fillStyle = k % 9 === 0 ? `rgba(240,236,225,${u * 0.8})` : `rgba(200,190,175,${u * 0.7})`;
    if (k % 9 === 0) { g.save(); g.translate(x, y); g.rotate(t * 5 + k); g.fillRect(-r * 3, -r * 2, r * 6, r * 4); g.restore(); }
    else { g.beginPath(); g.ellipse(x, y, r * 2.5, r, a, 0, TAU); g.fill(); } }
  if (t > LINES[7].s) { g.fillStyle = `rgba(150,140,125,${0.25 * seg(t, LINES[7].s, LINES[7].s + 0.4)})`; g.fillRect(0, 0, W, H); }
  g.restore();
  return { capY: 1300 };
}
// ================================================================== 8 — THEN A LIGHT. SLOW. SWINGING.
function e5scene8(g, t, lt) {
  const tc = tunnelView(g, t, 2.3 + lt * 0.05, k => k === ST.emerg.length - 1 ? redP(t) : 0);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = 'rgba(2,2,4,0.6)'; g.fillRect(0, 0, W, H); g.restore();
  const grow = clamp(lt / 4.2);
  layer(g, 1, g2 => { const sx = tc[0] + Math.sin(t * 2.2) * 14 * (0.4 + grow); lanternGlow(g2, sx, tc[1] + 20, 60 + grow * 120, 0.5 + grow * 0.5); });
  return { capY: 1300 };
}
// ================================================================== 9 — IT'S NOT A TRAIN
function e5scene9(g, t, lt) {
  const tc = tunnelView(g, t, 1.8, k => k === ST.emerg.length - 1 ? redP(t) : 0);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = 'rgba(2,2,4,0.45)'; g.fillRect(0, 0, W, H); g.restore();
  layer(g, 1, g2 => cartFront(g2, tc[0] - 10, tc[1] + 60 + lt * 30, 0.22 + lt * 0.12, t));
  return { capY: 1300 };
}
// ================================================================== 10/11 — WHITE SUITS PUSH THE CART / THEY STOP
function trackSide(g, t, cartX, wheel, o = {}) {
  flashlit(g, t, bg => layer(bg, 1, g2 => {
    tileWall(g2, -200, -200, W + 400, 1300, 60); g2.fillStyle = MOSAIC; g2.fillRect(-200, 500, W + 400, 80);
    g2.fillStyle = '#4a4740'; g2.fillRect(-200, 1100, W + 400, 200);                                                       // platform edge (far side)
    g2.fillStyle = '#f0c020'; g2.fillRect(-200, 1100, W + 400, 14);
    g2.fillStyle = '#2a2723'; g2.fillRect(-200, 1300, W + 400, 900);
    for (let x = -200; x < W + 200; x += 70) { g2.fillStyle = '#4b3b2b'; g2.fillRect(x, 1580, 40, 30); }
    g2.fillStyle = '#b9bfc6'; g2.fillRect(-200, 1570, W + 400, 10);
    const lan = cartSide(g2, cartX, 1580, 1.5, t, { wheel, radio: o.radio || 0 });
    [[-330, 0], [-480, 1], [-620, 2]].forEach(([dx, k]) => { const P = o.stopped ? (() => { const Q = poseIdle(t, k); Q.sh = [0.9, 0.8]; Q.el = [1.2, 1.2]; return Q; })() : PUSH(t + k * 0.3);
      hazSide(g2, cartX + dx, 1590 + k * 6, 4.0 - k * 0.2, 1, P, t, { torch: true }); });
    if (o.sparks) for (let k = 0; k < 20; k++) { const u = ((t * 3 + hash(k)) % 1); g2.fillStyle = `rgba(255,${180 + hash(k) * 60},90,${(1 - u) * o.sparks})`; circle(g2, cartX + 110 * 1.5 - u * 120, 1570 - u * 60 * hash(k + 1), 3); g2.fill(); }
  }), o.cone || [cartX - 520, 1300, cartX - 80, 1450, 330], { red: [[120, 260, 420]], ambient: '#b09ca4' });
}
function e5scene10(g, t, lt) {
  setCam(t, { x: 0, y: 0, z: 1.05, shake: 0.05 });
  const x = lerp(380, 860, easeOut(clamp(lt / 5.4)));
  trackSide(g, t, x, x / 22);
  return { capY: 1800 };
}
function e5scene11(g, t, lt) {
  setCam(t, { x: 0, y: 0, z: 1.08, shake: 0.12 });
  const x = 860 + 30 * easeOut(clamp(lt / 0.5));
  trackSide(g, t, x, x / 22, { stopped: lt > 0.6, sparks: 1 - clamp(lt / 0.6) });
  return { capY: 1800 };
}
// ================================================================== 12 — ONE OF THEM CLIMBS UP, A FLASHLIGHT IN ONE HAND
function e5scene12(g, t, lt) {
  const up = smooth(clamp(lt / 1.6));
  setCam(t, { x: 0, y: 0, z: 1.02 + lt * 0.02, shake: 0.06 });
  let hand = [700, 1100];
  flashlit(g, t, bg => layer(bg, 1, g2 => {
    g2.fillStyle = '#0c0d10'; g2.fillRect(-200, -200, W + 400, H + 400); tileWall(g2, -200, -200, W + 400, 800, 70);
    lanternGlow(g2, 200, 700, 380, 0.7);
    const P = poseFrontIdle(t, 2); P.armR = 0.9; P.elR = 1.4; P.armL = 0.3; P.legL = up < 1 ? 0.8 * (1 - up) : 0;
    const o = hazFront(g2, 560, lerp(2250, 1880, up), 7.2, P, t); hand = o.handR;
    g2.fillStyle = '#2b2a27'; g2.fillRect(-200, 1820, W + 400, 300); g2.fillStyle = '#f0c020'; g2.fillRect(-200, 1820, W + 400, 22);   // platform edge (camera side)
  }), [hand[0], hand[1], 900, 400, 260], { red: [[60, 200, 400]], ambient: '#c0b4b8' });
  return { capY: 1790 };
}
// ================================================================== 13 — ROSA WHISPERS: "THAT'S NOT OUR UNIFORM"
function e5scene13(g, t, lt) {
  const talk = t >= LINES[15].s && t < LINES[15].s + 1.5, sweep = Math.sin(lt * 1.3);
  setCam(t, { x: 0, y: 0, z: 1.0 + lt * 0.02, shake: 0.03 });
  g.fillStyle = '#07080b'; g.fillRect(0, 0, W, H);
  g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = radgrad(g, 540 + sweep * 500, 300, 0, 520, [[0, 'rgba(230,240,255,0.35)'], [1, 'rgba(230,240,255,0)']]); g.fillRect(0, 0, W, H); g.restore();
  layer(g, 1, g2 => {
    g2.fillStyle = lingrad(g2, 0, 1100, 0, H, [[0, ROSA.top], [1, '#0e1422']]); ellipse(g2, 540, 1650, 560, 460); g2.fill();
    g2.fillStyle = '#ff7a00'; poly(g2, [100, 1500, 400, 1250, 440, 1920, 60, 1920]); g2.fill(); poly(g2, [980, 1500, 680, 1250, 640, 1920, 1020, 1920]); g2.fill();
    drawHeadFront(g2, ROSA, 560, 760, 280, { t, expr: talk ? 'talk' : 'worried', look: [0.7, -0.1], noRim: true });
    if (!talk) { g2.fillStyle = ROSA.skin; rrect(g2, 545, 820, 30, 160, 15); g2.fill(); }                                     // finger to lips
  });
  g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = radgrad(g, 600, 760, 150, 900, [[0, '#d8c8cc'], [1, '#141016']]); g.fillRect(0, 0, W, H); g.restore();
  glow(g, 100, 500, 500, '#ff3b30', 0.2 * redP(t));
  return { capY: 1300 };
}
// ================================================================== 14 — BENCH TO BENCH
function e5scene14(g, t, lt) {
  setCam(t, { x: 0, y: 0, z: 1.02, shake: 0.04 });
  const [fx, fy, fs] = placeFig(160, 760), target = lerp(560, 1000, 0.5 + 0.5 * Math.sin(lt * 1.2));
  boothLook(g, t, g2 => flashlit(g2, t, bg => { layer(bg, 1, g3 => { g3.drawImage(ST.c, 0, 0); drawCracks(g3, 1); people(g3, t, 'crouch'); const P = poseIdle(t, 2); P.sh[0] = 1.0; P.el[0] = 0.4; hazSide(g3, fx, fy, fs, 1, P, t, { torch: true }); }); },
    [fx + 60, fy - 110 * fs / 1.75 * 0.62, target, 1100, 180], { red: [[120, 300, 420]] }), g2 => hideHeads(g2, t, 0));
  return { capY: 1790 };
}
// ================================================================== 15/16 — "FIFTEEN." "THERE SHOULD BE SIXTEEN."
function maskClose(g, t, r, cy, o = {}) {
  g.fillStyle = '#08090c'; g.fillRect(0, 0, W, H);
  layer(g, 1, g2 => {
    g2.fillStyle = lingrad(g2, 0, cy + r, 0, H, [[0, '#d9dde2'], [1, '#6a6e74']]); ellipse(g2, 540, cy + r * 2.3, r * 2.2, r * 1.6); g2.fill();
    g2.fillStyle = '#e6e9ec'; ellipse(g2, 540, cy - r * 0.05, r * 1.12, r * 1.2); g2.fill();                                                      // hood
    g2.fillStyle = '#c8ccd2'; ellipse(g2, 540, cy - r * 0.05, r * 1.02, r * 1.1); g2.fill();
    maskFront(g2, 540, cy + r * 0.1, r, o);
    if (o.talk) { g2.save(); g2.strokeStyle = 'rgba(255,255,255,0.4)'; g2.lineWidth = 6; for (let k = 0; k < 3; k++) { const rr2 = r * 0.6 + k * 40 + (t * 120 % 40); g2.beginPath(); g2.arc(540, cy + r * 0.7, rr2, 0.3, Math.PI - 0.3); g2.stroke(); } g2.restore(); }
  });
  g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = radgrad(g, 540, cy, r * 0.5, r * 2.8, [[0, '#ffffff'], [1, '#141418']]); g.fillRect(0, 0, W, H); g.restore();
  glow(g, 980, 420, 520, '#ffc87a', 0.25);
}
function darkBubble(g, t, t0, x, y, txt, size) {
  if (t < t0) return; const u = easeOutBack(seg(t, t0, t0 + 0.3));
  g.save(); g.font = `800 ${size}px ${F_MONO}`; const w = g.measureText(txt).width + 70, h = size + 50;
  g.translate(x + (hash(Math.floor(t * 20)) - 0.5) * 6, y); g.scale(u, u);
  g.fillStyle = 'rgba(10,12,16,0.92)'; rrect(g, -w / 2, -h / 2, w, h, 18); g.fill(); g.strokeStyle = '#9aa2ac'; g.lineWidth = 4; g.stroke();
  g.fillStyle = '#d9dee5'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 0, 4); g.restore(); g.textBaseline = 'alphabetic';
}
function e5scene15(g, t, lt) {
  setCam(t, { x: 0, y: 0, z: 1.0 + lt * 0.03, shake: 0.03 });
  maskClose(g, t, 300, 820, { talk: t >= EV.fifteen && t < EV.fifteen + 0.8 });
  darkBubble(g, t, EV.fifteen, 540, 360, 'FIFTEEN.', 64);
  return { capY: 1300 };
}
function e5scene16(g, t, lt) {
  const u = smooth(clamp(lt / 2.6));
  setCam(t, { x: lerp(0, -114, u), y: lerp(0, -40, u), z: lerp(1.15, 2.6, u), shake: 0.02 });
  maskClose(g, t, 300, 820, { reflect: true, talk: t >= EV.sixteen && t < EV.sixteen + 0.9 });
  return { capY: 1300 };
}
// ================================================================== 17 — BISCUIT GROWLS. YOU HOLD HIS MOUTH SHUT.
function e5scene17(g, t, lt) {
  const hold = t >= LINES[21].s, close = smooth(seg(t, LINES[21].s, LINES[21].s + 0.5));
  setCam(t, { x: 0, y: 0, z: 1.02 + lt * 0.02, shake: 0.04 });
  g.fillStyle = '#07080b'; g.fillRect(0, 0, W, H);
  layer(g, 1, g2 => {
    g2.fillStyle = 'rgba(20,10,12,0.9)'; g2.fillRect(-200, 1620, W + 400, 600);
    const d = drawDog(g2, 240, 1960, 11, 1, { mode: hold ? 'stand' : 'growl', tail: 'low', hackles: true, earsBack: true }, t);
    // YOU's hand closes gently around his muzzle
    const hx = lerp(1200, d.nose[0] - 120, close), hy = d.nose[1] + 10;
    g2.fillStyle = YOU.cuff; rrect(g2, hx + 140, hy - 70, 600, 170, 70); g2.fill();
    g2.fillStyle = YOU.skin; ellipse(g2, hx + 60, hy, 150, 100); g2.fill();
    g2.fillStyle = shade(YOU.skin, -0.08); for (let k = 0; k < 4; k++) { rrect(g2, hx - 160, hy - 80 + k * 42, 230, 38, 19); g2.fill(); }
  });
  g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = radgrad(g, 600, 1300, 200, 1100, [[0, '#d8ccd0'], [1, '#141016']]); g.fillRect(0, 0, W, H); g.restore();
  glow(g, 900, 700, 520, '#e8f0ff', 0.12 + 0.08 * Math.sin(t * 1.3));                                                        // his beam passes the glass
  return { capY: 1200 };
}
// ================================================================== 18 — SURVIVAL RULE #5
function e5scene18(g, t, lt) {
  setCam(t, { x: 0, y: 0, z: 1.02, shake: 0.03 });
  boothLook(g, t, g2 => stationOut(g2, t, { dark: 0.4 }), g2 => hideHeads(g2, t, 0));
  blurFrame(g, 6); g.save(); g.fillStyle = 'rgba(10,14,30,0.4)'; g.fillRect(0, 0, W, H); g.restore();
  return { capY: 1300 };
}
// ================================================================== 19/20 — HE KNEELS AT THE BOX, TAKES THE RAINCOAT, FOLDS IT
function lfSet(g, t, figure, cone) {
  flashlit(g, t, bg => layer(bg, 1, g2 => {
    tileWall(g2, -200, -200, W + 400, 1400, 60); g2.fillStyle = MOSAIC; g2.fillRect(-200, 520, W + 400, 80);
    g2.fillStyle = '#7d786f'; g2.fillRect(-200, 1400, W + 400, 900);
    g2.fillStyle = '#8a6a44'; poly(g2, [620, 1500, 980, 1500, 1000, 1820, 600, 1820]); g2.fill(); g2.fillStyle = '#6f5436'; g2.fillRect(620, 1500, 360, 34);     // the box
    g2.fillStyle = '#f2e9d0'; rrect(g2, 680, 1630, 240, 70, 8); g2.fill(); g2.fillStyle = '#2a2a2a'; g2.font = `800 30px ${F_UI}`; g2.textAlign = 'center'; g2.fillText('LOST & FOUND', 800, 1676);
    figure(g2);
    lanternGlow(g2, -40, 900, 520, 0.6);
  }), cone, { red: [[120, 260, 420]] });
}
function e5scene19(g, t, lt) {
  setCam(t, { x: 0, y: 0, z: 1.04, shake: 0.03 });
  const lift = smooth(seg(lt, 1.2, 2.4));
  lfSet(g, t, g2 => { const P = poseCrouch(t); P.sh = [1.0 - lift * 0.6, 0.6]; P.el = [0.3, 1.2]; P.head = 0.4; P.expr = 'neutral';
    const o = hazSide(g2, 460, 1820, 6.0, 1, P, t, {});
    if (lift > 0) { g2.save(); g2.translate(o.hand[0], o.hand[1]); g2.fillStyle = '#ffd31a'; poly(g2, [-40, 0, 60, 0, 70, 160 * lift, -50, 150 * lift]); g2.fill(); g2.restore(); } }, [200, 1960, 800, 1560, 260]);
  return { capY: 1250 };
}
function e5scene20(g, t, lt) {
  setCam(t, { x: 0, y: 0, z: 1.04 + lt * 0.02, shake: 0.03 });
  lfSet(g, t, g2 => { const P = poseIdle(t, 3); P.sh = [0.4, 0.1]; P.el = [1.8, 0.4]; P.head = 0.3; hazSide(g2, 460, 1850, 6.2, 1, P, t, { coat: true }); }, [200, 1960, 520, 1300, 300]);
  return { capY: 1250 };
}
// ================================================================== 21 — HE STANDS UP. ON HIS BACK, A BIG BLACK LETTER: T.
function e5scene21(g, t, lt) {
  const u = smooth(clamp(lt / 1.8));
  setCam(t, { x: 0, y: lerp(0, -150, u), z: lerp(1.0, 1.3, u), shake: 0.03 });
  let tpos = [540, 1000];
  flashlit(g, t, bg => layer(bg, 1, g2 => {
    g2.drawImage(ST.c, 0, 0);
    const P = poseFrontIdle(t, 4); P.armR = 0.5; P.elR = 1.3; P.armL = 0.3; P.elL = 1.1;
    const o = hazFront(g2, 540, 1930, 8.5, P, t, { back: true }); tpos = [540, o.head[1] + o.headR * 1.6 + 8 * 8.5];
    g2.fillStyle = '#ffd31a'; rrect(g2, 540 - 175, 1200, 60, 90, 12); g2.fill();                                            // folded raincoat under his arm
  }), [540, 2100, 540, 1000, 420], { red: [[120, 260, 420]] });
  drawCodeChip(g, t, 540, 1080, EV.letterT - 0.05);
  return { capY: 1640 };
}
// ================================================================== 22 — THE RADIO CRACKLES. "DID YOU FIND THEM?"
function e5scene22(g, t, lt) {
  const voice = t >= EV.childVoice && t < EV.childVoice + 1.0, crackle = hash(Math.floor(t * 18)) > 0.5 ? 1 : 0.4;
  setCam(t, { x: 0, y: 0, z: 1.02 + lt * 0.02, shake: 0.03 });
  g.fillStyle = '#08090b'; g.fillRect(0, 0, W, H);
  layer(g, 1, g2 => {
    lanternGlow(g2, 160, 380, 700, 0.8);
    g2.fillStyle = '#3d4148'; g2.fillRect(-200, 1450, W + 400, 160);
    g2.fillStyle = '#2f3a2c'; rrect(g2, 200, 700, 680, 760, 40); g2.fill(); g2.fillStyle = '#26301f'; rrect(g2, 230, 730, 620, 700, 30); g2.fill();
    g2.fillStyle = '#121410'; for (let r = 0; r < 9; r++) for (let k = 0; k < 9; k++) { circle(g2, 300 + k * 32, 860 + r * 32, 9); g2.fill(); }    // speaker grille
    g2.fillStyle = '#0e1a10'; rrect(g2, 620, 820, 200, 120, 14); g2.fill();
    g2.strokeStyle = `rgba(80,255,140,${0.6 + 0.4 * crackle})`; g2.lineWidth = 4; g2.beginPath();
    for (let i = 0; i <= 40; i++) { const x = 630 + i * 4.5, a = voice ? (hash(Math.floor(t * 30) + i) - 0.5) * 80 : (hash(Math.floor(t * 30) + i) - 0.5) * 20 * crackle; i ? g2.lineTo(x, 880 + a) : g2.moveTo(x, 880 + a); } g2.stroke();
    glow(g2, 720, 880, 200, '#50ff8c', 0.35);
    [[680, 1100], [800, 1100]].forEach(([x, y]) => { g2.fillStyle = '#55585f'; circle(g2, x, y, 46); g2.fill(); g2.fillStyle = '#2a2c30'; circle(g2, x, y, 30); g2.fill(); });
    g2.strokeStyle = '#999'; g2.lineWidth = 8; line(g2, 820, 700, 960, 140);
  });
  if (voice) drawBubble(g, t, EV.childVoice, 540, 430, 'Did you find them?', 540, 640, 54);
  return { capY: 1640 };
}
// ================================================================== 23 — THE FIGURE TURNS AND LOOKS STRAIGHT AT THE BOOTH
function e5scene23(g, t, lt) {
  const turn = smooth(seg(lt, 0.3, 1.0)), glare = smooth(seg(lt, 1.6, 3.4));
  setCam(t, { x: 0, y: 0, z: 1.02 + lt * 0.04, shake: 0.03 });
  boothLook(g, t, g2 => { stationOut(g2, t, { dark: 0.3 }); layer(g2, 1, g3 => { const [fx, fy, fs] = placeFig(120, 620);
    if (turn < 0.5) { const P = poseIdle(t, 2); hazSide(g3, fx, fy, fs, -1, P, t, { torch: true, coat: true }); }
    else { const P = poseFrontIdle(t, 2); P.armR = -0.2; P.elR = 1.6; hazFront(g3, fx, fy, fs * 0.98, P, t, { reflect: true }); glow(g3, fx + 20, fy - 120 * fs / 1.75 * 0.6, 120 + 500 * glare, '#f4f8ff', 0.6 + glare * 0.4); } }); },
    g2 => hideHeads(g2, t, 0));
  if (glare > 0) { g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = radgrad(g, 420, 760, 0, 900, [[0, `rgba(240,246,255,${0.9 * glare})`], [1, 'rgba(240,246,255,0)']]); g.fillRect(0, 0, W, H); g.restore(); }
  return { capY: 1790 };
}
// ================================================================== 24 — CHOICE
function e5scene24(g, t, lt) {
  boothLook(g, t, g2 => { stationOut(g2, t, { dark: 0.3 }); layer(g2, 1, g3 => { const [fx, fy, fs] = placeFig(120, 620); const P = poseFrontIdle(t, 2); P.armR = -0.2; P.elR = 1.6; hazFront(g3, fx, fy, fs * 0.98, P, t, { reflect: true }); glow(g3, fx + 20, fy - 60, 600, '#f4f8ff', 0.9); }); }, g2 => hideHeads(g2, t, 0));
  blurFrame(g, 6);
  const dark = seg(t, EV.ep2 - 0.4, EV.ep2 + 0.4);
  g.save(); g.fillStyle = `rgba(6,8,14,${0.35 + 0.45 * dark})`; g.fillRect(0, 0, W, H); g.restore();
  return { capY: 1700, choice: true };
}
const SCENE_LIST = [e5scene1, e5scene2, e5scene3, e5scene4, e5scene5, e5scene6, e5scene7, e5scene8, e5scene9, e5scene10, e5scene11, e5scene12,
  e5scene13, e5scene14, e5scene15, e5scene16, e5scene17, e5scene18, e5scene19, e5scene20, e5scene21, e5scene22, e5scene23, e5scene24];
