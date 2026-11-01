// ============================================================================
// scene_kit2.js — underground helpers shared from Episode 2 onward (girl close-up,
// Rosa's key hand, man sitting, rewind recap FX, floor-level set, rabbit, tunnel view).
// ============================================================================
const redP = t => 0.6 + 0.4 * Math.pow(pulse(t - RED_T0, 1.2), 2);
function girlFace(g, t, o = {}) {
  layer(g, 1, g => {
    g.fillStyle = '#5a5250'; g.fillRect(-200, -200, W + 400, H + 400);
    drawAsh(g, t, [-200, -200, W + 400, H + 400], 120, 0.9);
    g.fillStyle = GIRL.top; ellipse(g, 540, 1650, 460, 420); g.fill();
    g.fillStyle = GIRL.topDark; ellipse(g, 540, 1260, 300, 90); g.fill();
    // ash settling on her raincoat — it does not melt
    g.fillStyle = 'rgba(215,210,204,0.9)'; for (let k = 0; k < (o.ash || 0); k++) { circle(g, 200 + hash(k) * 680, 1290 + hash(k + 3) * 260, 4 + hash(k + 5) * 5); g.fill(); }
    g.save(); g.translate(540, 820); g.rotate(o.tilt || 0);
    drawHeadFront(g, GIRL, 0, 0, 270, { t, expr: 'neutral', look: [0, 0], noBlink: true, noRim: true });
    g.restore();
    drawRabbit(g, 760, 1260, 9, t, Math.sin(t * 1.4) * 0.25);
    for (let k = 0; k < 6; k++) { const x = 40 + k * 200; limb(g, x, -200, x, H + 200, 34, '#6b6f78'); limb(g, x + 8, -200, x + 8, H + 200, 8, '#b9bec6'); }
    for (let y = -400; y < H; y += 260) for (let k = 0; k < 6; k++) { g.strokeStyle = '#5e626b'; g.lineWidth = 18; line(g, 40 + k * 200, y, 240 + k * 200, y + 260); }
  });
  redLight(g, t, 0.75);
}
// Rosa's hand with the key ring; close = 0 open palm … 1 fist
function keyHand(g, t, close) {
  g.fillStyle = '#2a1418'; g.fillRect(0, 0, W, H);
  blurDraw(g, 6, bg => bg.drawImage(ST.c, 0, 0));
  layer(g, 1, g => {
    // palm under the ring + sleeve with the orange vest cuff
    g.fillStyle = ROSA.top; g.save(); g.translate(250, 520); g.rotate(0.55); rrect(g, -470, -120, 520, 240, 110); g.fill(); g.fillStyle = '#ff7a00'; g.fillRect(-110, -120, 70, 240); g.fillStyle = '#e6eef5'; g.fillRect(-80, -120, 18, 240); g.restore();
    // palm/fist gripping the top of the ring (keys hang out underneath)
    const hy = 690 - close * 20;
    g.fillStyle = ROSA.skin; ellipse(g, 520, hy, 210, 140, -0.15); g.fill();
    g.fillStyle = shade(ROSA.skin, 0.08); ellipse(g, 360, hy + 40, 70, 120, -0.9); g.fill();               // thumb
    const sw = Math.sin(t * 3) * 0.08 * (1 - close);
    g.save(); g.translate(560, 800); g.rotate(sw);
    for (let k = 0; k < 9; k++) {
      const a = Math.PI / 2 + (k - 4) * 0.16, kx = Math.cos(a) * 110, ky = Math.sin(a) * 110;
      g.save(); g.translate(kx, ky); g.rotate((k - 4) * 0.12 + Math.sin(t * 4 + k) * 0.05 * (1 - close));
      const col = k % 3 === 0 ? '#d4af37' : k % 3 === 1 ? '#b8bec7' : '#9aa3ad';
      g.fillStyle = col; circle(g, 0, 36, 34); g.fill(); g.fillStyle = '#2a1418'; circle(g, 0, 20, 9); g.fill();
      g.fillStyle = col; g.fillRect(-11, 64, 22, 190 + (k % 3) * 30);
      for (let j = 0; j < 5; j++) g.fillRect(11, 150 + (k % 3) * 30 + j * 20, 10 + (j % 2) * 9, 12);
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(-7, 70, 5, 170); g.restore();
    }
    g.strokeStyle = '#d8d8d8'; g.lineWidth = 14; circle(g, 0, 0, 110); g.stroke();
    g.restore();
    for (let k = 0; k < 4; k++) {                                                                      // fingers curl over the ring
      g.save(); g.translate(600 + k * 22, hy - 70 + k * 48); g.rotate(-0.1 - close * 1.9);
      g.fillStyle = shade(ROSA.skin, -0.05 - k * 0.025); rrect(g, -28, -34, 200 - close * 90, 62, 31); g.fill();
      g.fillStyle = 'rgba(255,225,205,0.4)'; ellipse(g, 150 - close * 90, -3, 16, 20); g.fill();
      g.restore();
    }
  });
  redLight(g, t, 0.8);
  layer(g, 1, g => glow(g, 900, 300, 600, '#ff3b30', 0.3 * redP(t)));
}
// man sitting on the stairs behind the bars (side view), asleep or awake
function manSitting(g, t, x, y, s, o = {}) {
  const P = poseSit(t, 9); P.lean = o.asleep ? 0.55 : 0.35; P.head = o.asleep ? 0.6 + Math.sin(t * 1.1) * 0.03 : 0.25;
  P.bob += o.asleep ? Math.sin(t * 1.4) * 0.8 : 0;                                         // chest rising: he is asleep
  drawPersonSide(g, MAN, x, y, s, -1, P, { t, expr: o.asleep ? 'neutral' : 'worried', blink: o.asleep ? 1 : undefined });
  g.fillStyle = 'rgba(205,200,194,0.85)'; for (let k = 0; k < 12; k++) { circle(g, x + (hash(k) - 0.6) * 18 * s, y - 52 * s + hash(k + 1) * 4 * s, 1.1 * s); g.fill(); }
}
function girlStanding(g, t, x, y, s) {
  const GP = poseFrontIdle(t, 3); GP.bob = 0; GP.head = 0; GP.look = [0, 0]; GP.armL = 0.2; GP.elL = 0.3;
  drawPersonFront(g, GIRL, x, y, s, GP, { t, noBlink: true, rabbitSwing: 0 });
}
function rewindFX(g, t, a, label = '◀◀  EPISODE 1') {
  if (a <= 0) return;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  for (let k = 0; k < 6; k++) { const y = (hash(Math.floor(t * 30) + k) * H) | 0, h = 6 + hash(k + Math.floor(t * 30)) * 30; g.globalAlpha = 0.5 * a; g.drawImage(g.canvas, 0, y, W, h, (hash(k * 3 + Math.floor(t * 30)) - 0.5) * 80, y, W, h); }
  g.globalAlpha = 0.12 * a; g.fillStyle = '#fff'; for (let y = 0; y < H; y += 6) g.fillRect(0, y, W, 2);
  g.globalAlpha = a; g.fillStyle = '#fff'; g.font = `800 44px ${F_MONO}`; g.textAlign = 'left'; g.fillText(label, 60, 330);
  g.restore();
}

function rabbitOnFloor(g, t, x, y, s) {
  aoShadow(g, x, y + 10, 70 * s / 9 * 9, 12, 0.5);
  g.save(); g.translate(x, y); g.rotate(-1.45); drawRabbit(g, 0, -40 * s / 9, s, 0, 0); g.restore();
}
function rabbitTag(g, x, y, s, letter = 'H') { // small tag on the rabbit's ear with a gold H
  g.save(); g.translate(x, y); g.scale(s, s);
  g.strokeStyle = '#8a7a6a'; g.lineWidth = 0.6; line(g, 0, 0, 3, 5);
  g.fillStyle = lingrad(g, -4, 2, 8, 12, [[0, '#ffe08a'], [1, '#b8861a']]); circle(g, 4, 9, 4.6); g.fill();
  g.fillStyle = '#1a1a1a'; g.font = `800 6px ${F_UI}`; g.textAlign = 'center'; g.fillText(letter, 4, 11.2);
  g.restore();
}
function floorSet(g, t, blurK) {
  // floor-level view: tiles in front, the locked gate's bottom rail and the first step outside
  g.fillStyle = '#2a1418'; g.fillRect(0, 0, W, H);
  const bg = gx => {
    tileWall(gx, -200, -200, W + 400, 900, 60);
    gx.fillStyle = '#7d7a74'; gx.fillRect(-200, 520, W + 400, 140); gx.fillStyle = '#e8b81e'; gx.fillRect(-200, 520, W + 400, 14);   // first step, outside
    gx.fillStyle = '#86837c'; gx.fillRect(-200, 380, W + 400, 140); gx.fillStyle = '#e8b81e'; gx.fillRect(-200, 380, W + 400, 14);
    for (let k = 0; k < 8; k++) { const x = -60 + k * 160; limb(gx, x, -200, x, 860, 26, '#7f8792'); limb(gx, x + 6, -200, x + 6, 860, 6, '#d9dee5'); }
    for (let yy = 860; yy > -300; yy -= 190) for (let k = 0; k < 8; k++) { gx.strokeStyle = '#6b727c'; gx.lineWidth = 12; line(gx, -60 + k * 160, yy, 100 + k * 160, yy - 190); line(gx, 100 + k * 160, yy, -60 + k * 160, yy - 190); }
    gx.fillStyle = lingrad(gx, 0, 830, 0, 900, [[0, '#dfe3e8'], [1, '#3e444c']]); gx.fillRect(-200, 830, W + 400, 70);
    drawAsh(gx, t, [-200, -200, W + 400, 700], 60, 0.9);
  };
  if (blurK > 1) blurDraw(g, blurK, b => layer(b, 1, bg)); else layer(g, 1, bg);
  layer(g, 1, g => {
    g.fillStyle = lingrad(g, 0, 900, 0, H, [[0, '#77736b'], [1, '#a19c92']]); g.fillRect(-200, 900, W + 400, H);
    g.strokeStyle = 'rgba(0,0,0,0.22)'; g.lineWidth = 3; for (let k = -10; k <= 10; k++) line(g, 540 + k * 70, 900, 540 + k * 260, H + 200);
    for (let k = 1; k < 7; k++) { const y = 900 + Math.pow(k / 7, 1.7) * 1100; line(g, -200, y, W + 200, y); }
  });
}
function tunnelView(g, t, z, lit) {
  const tc = P3(-300, 0, 5200);
  setCam(t, { x: tc[0] - W / 2, y: tc[1] - H / 2 + 60, z, shake: 0.05 });
  layer(g, 1, g => { g.drawImage(ST.c, 0, 0); drawCracks(g, 1); people(g, t, 'sit', {}); });
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'multiply'; g.fillStyle = '#5a2a32'; g.fillRect(0, 0, W, H); g.fillStyle = '#8890a8'; g.fillRect(0, 0, W, H); g.restore();
  layer(g, 1, g => {
    ST.emerg.forEach(([X, Y, Z], k) => {
      const on = lit(k), p = P3(X, Y, Z), s = ST.f / Z;
      g.fillStyle = '#2a2a2a'; rrect(g, p[0] - 16 * s, p[1] - 14 * s, 32 * s, 28 * s, 4 * s); g.fill();
      g.fillStyle = on > 0 ? mix('#5a0a08', '#ff3b30', on) : '#3a0a08'; circle(g, p[0], p[1], 10 * s); g.fill();
      if (on > 0) glow(g, p[0], p[1], 330 * s / Math.max(1, CAM.z * 0.8), '#ff3b30', 0.75 * on / Math.max(1, CAM.z * 0.7));
    });
  });
  return tc;
}
