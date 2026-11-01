// ============================================================================
// ep2/src/scenes2.js — Episode 2 "KEEP IT SHUT" (20 scenes). Underground the
// whole episode: red emergency light pulsing every 1.2 s, ash at the top of the
// stairs, the man and the girl behind the locked gate.
// ============================================================================
const RED_T0 = -5;                 // emergency lights have been on since Episode 1
const SCENE_WHIPS = [18];
const ALERT_WORDS = ['INCOMING', 'MISSILE.', 'SEEK', 'SHELTER', 'IMMEDIATELY.', 'THIS', 'IS', 'NOT', 'A', 'DRILL.'];
const redP = t => 0.6 + 0.4 * Math.pow(pulse(t - RED_T0, 1.2), 2);

// ---------------------------------------------------------------- shared pieces for this episode
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
function rewindFX(g, t, a) {
  if (a <= 0) return;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  for (let k = 0; k < 6; k++) { const y = (hash(Math.floor(t * 30) + k) * H) | 0, h = 6 + hash(k + Math.floor(t * 30)) * 30; g.globalAlpha = 0.5 * a; g.drawImage(g.canvas, 0, y, W, h, (hash(k * 3 + Math.floor(t * 30)) - 0.5) * 80, y, W, h); }
  g.globalAlpha = 0.12 * a; g.fillStyle = '#fff'; for (let y = 0; y < H; y += 6) g.fillRect(0, y, W, 2);
  g.globalAlpha = a; g.fillStyle = '#fff'; g.font = `800 44px ${F_MONO}`; g.textAlign = 'left'; g.fillText('◀◀  EPISODE 1', 60, 330);
  g.restore();
}

// ================================================================== SCENE 1 — RECAP + VOTE RESULT
function e2scene1(g, t, lt) {
  setCam(t, { x: 0, y: 0, z: 1.02 + lt * 0.03, shake: 0.12 });
  if (lt < 0.55) { g.fillStyle = '#1a0507'; g.fillRect(0, 0, W, H); layer(g, 1, g => drawPhoneScreen(g, t, 540, 880, 0.98, ALERT_WORDS, 10)); }
  else if (lt < 1.1) gateRed(g, t, { behind: g2 => manAndGirl(g2, t, 560, 1480, 6.2, {}) });
  else girlFace(g, t, {});
  rewindFX(g, t, 1 - seg(lt, 1.6, 1.95));
  if (lt > 1.6) { g.save(); g.fillStyle = `rgba(6,8,14,${0.45 * seg(lt, 1.6, 2.0)})`; g.fillRect(0, 0, W, H); g.restore(); }
  drawVoteResult(g, t, 0.9);
  return { capY: 1300 };
}
// ================================================================== SCENE 2 — THE KEY / THE GATE STAYS LOCKED
function e2scene2(g, t, lt) {
  const lockT = LINES[2].s;
  if (t < lockT) { setCam(t, { x: 0, y: 0, z: 1.02 + lt * 0.03, shake: 0.08 }); keyHand(g, t, smooth(seg(t, SC(2).start + 0.7, SC(2).start + 1.6))); return { capY: 1720 }; }
  const shake = Math.exp(-Math.max(0, t - lockT - 0.2) * 6) * (t > lockT + 0.2 ? 1 : 0);
  setCam(t, { x: 0, y: 0, z: 1.15, shake: 0.08 + shake * 0.3 });
  gateRed(g, t, { shake, behind: g2 => manAndGirl(g2, t, 560, 1480, 6.2, { grip: true, expr: 'worried' }),
    front: g2 => [[440, 1000], [680, 1000]].forEach(([x, y]) => { g2.fillStyle = MAN.skin; rrect(g2, x - 34 + shake * 6, y - 40, 68, 84, 26); g2.fill(); }) });
  return { capY: 1720 };
}
// ================================================================== SCENE 3 — THE MAN STOPS BANGING, SITS DOWN
function e2scene3(g, t, lt) {
  const sitT = LINES[4].s, bangs = [SC(3).start + 0.05, SC(3).start + 0.6, SC(3).start + 1.15];
  let b = 0; bangs.forEach(x => { if (t >= x) b = Math.max(b, Math.exp(-(t - x) * 7)); });
  setCam(t, { x: 0, y: -40, z: 1.3, shake: 0.08 + b * 0.25 });
  gateRed(g, t, { shake: b, behind: g2 => {
    if (t < sitT) { const sink = seg(t, sitT - 0.6, sitT) * 70; const P = poseFrontIdle(t, 9); P.armR = -1.1; P.elR = 0.4 + b * 0.5; P.head = 0.2;
      drawPersonFront(g2, MAN, 600, 1470 + sink, 6.2, P, { t, expr: b > 0.3 ? 'shout' : 'worried' }); girlStanding(g2, t, 420, 1480, 4.9); }
    else { manSitting(g2, t, 650, 1500, 6.0, {}); girlStanding(g2, t, 420, 1480, 4.9); }
  } });
  return { capY: 1720 };
}
// ================================================================== SCENE 4 — "PLEASE," HE SAYS. QUIETER THIS TIME.
function e2scene4(g, t, lt) {
  setCam(t, { x: 0, y: 0, z: 1.0 + lt * 0.03, shake: 0.05 });
  const talking = t < LINES[5].e || (t > LINES[5].s && t < LINES[5].s + 0.7);
  layer(g, 1, g => {
    g.fillStyle = '#4a4442'; g.fillRect(-200, -200, W + 400, H + 400);
    drawAsh(g, t, [-200, -200, W + 400, H + 400], 90, 0.8);
    g.fillStyle = lingrad(g, 0, 1150, 0, H, [[0, MAN.top], [1, shade(MAN.top, -0.4)]]); ellipse(g, 540, 1680, 560, 480); g.fill();
    g.fillStyle = '#f2f2f2'; poly(g, [440, 1220, 640, 1220, 540, 1520]); g.fill(); g.fillStyle = MAN.tie; poly(g, [515, 1250, 565, 1250, 580, 1560, 500, 1560]); g.fill();
    g.fillStyle = 'rgba(205,200,194,0.85)'; for (let k = 0; k < 40; k++) { circle(g, 120 + hash(k) * 840, 1260 + hash(k + 1) * 80, 5); g.fill(); }
    drawHeadFront(g, MAN, 540, 800, 250, { t, expr: talking && t < SC(4).start + 0.75 ? 'talk' : 'worried', look: [0.1, 0.15], noRim: true });
    for (let k = 0; k < 6; k++) { const x = 40 + k * 200; limb(g, x, -200, x, H + 200, 30, '#6b6f78'); limb(g, x + 8, -200, x + 8, H + 200, 7, '#b9bec6'); }
    for (let y = -400; y < H; y += 260) for (let k = 0; k < 6; k++) { g.strokeStyle = '#5e626b'; g.lineWidth = 16; line(g, 40 + k * 200, y, 240 + k * 200, y + 260); }
  });
  redLight(g, t, 0.75);
  drawBubble(g, t, SC(4).start + 0.05, 560, 420, 'please…', 600, 560, 46);
  return { capY: 1290 };
}
// ================================================================== SCENE 5 — FIFTEEN PEOPLE. ONE BOTTLE OF WATER.
function e2scene5(g, t, lt) {
  setCam(t, { x: lerp(-30, 40, lt / 6), y: 0, z: 1.05, shake: 0.06 });
  stationRed(g, t, { near: g => {
    youHugBiscuit(g, t, 300, 1880, 6.4);
    const P = poseIdle(t, 5); P.sh[0] = 0.9; P.el[0] = 1.4; P.head = 0.2;
    drawPersonSide(g, ROSA, 880, 1800, 5.8, -1, P, { t, expr: 'worried', keySwing: 0.3 });
    // the one bottle of water
    const wb = t > LINES[8].s ? 1 : 0;
    g.save(); g.translate(560, 1880); g.fillStyle = 'rgba(160,210,255,0.55)'; rrect(g, -26, -150, 52, 150, 14); g.fill(); g.fillStyle = '#2b6cb0'; g.fillRect(-18, -170, 36, 22); g.fillStyle = 'rgba(120,190,255,0.75)'; g.fillRect(-22, -70, 44, 66); g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(-16, -140, 8, 120); g.restore();
    if (wb) glow(g, 560, 1800, 140, '#9fd8ff', 0.35 * pulse(t, 0.6));
  }, nearGlow: g => { glow(g, 330, 1500, 300, '#ff3b30', 0.3); glow(g, 860, 1300, 260, '#ff3b30', 0.3); } });
  return { capY: 1290 };
}
// ================================================================== SCENE 6 — EXCEPT BISCUIT
function e2scene6(g, t, lt) {
  setCam(t, { x: 0, y: 0, z: 1.0 + lt * 0.03, shake: 0.06 });
  blurDraw(g, 5, bg => gateRed(bg, t, { behind: g2 => { manSitting(g2, t, 650, 1500, 6.0, {}); girlStanding(g2, t, 420, 1480, 4.9); } }));
  layer(g, 1, g => {
    g.fillStyle = 'rgba(30,10,14,0.85)'; g.fillRect(-200, 1600, W + 400, 600);
    drawDog(g, 500, 1930, 9, 1, { mode: 'lie', tail: 'low', earsBack: true, noBlink: true }, t);
    glow(g, 770, 1430, 260, '#ff3b30', 0.28 * redP(t));
  });
  return { capY: 1250 };
}
// ================================================================== SCENE 7 — SHE HASN'T MOVED. HASN'T BLINKED.
function e2scene7(g, t, lt) {
  const faceT = LINES[14].s;
  if (t >= faceT) { setCam(t, { x: 0, y: 0, z: 1.05 + (t - faceT) * 0.05, shake: 0.03 }); girlFace(g, t, { ash: 60 }); return { capY: 1290 }; }
  const u = lt / (faceT - SC(7).start);
  setCam(t, { x: -120, y: lerp(120, 260, u), z: lerp(1.35, 1.9, easeInOut(u)), shake: 0.04 });
  gateRed(g, t, { behind: g2 => { manSitting(g2, t, 650, 1500, 6.0, {}); girlStanding(g2, t, 420, 1480, 4.9);
    g2.fillStyle = 'rgba(215,210,204,0.9)'; for (let k = 0; k < Math.floor(lt * 14); k++) { circle(g2, 390 + hash(k) * 60, 1250 + hash(k + 2) * 60, 2.4); g2.fill(); } } });
  return { capY: 1720 };
}
// ================================================================== SCENE 8 — HOUR FOUR, ASH GETS THICKER
function e2scene8(g, t, lt) {
  const u = easeInOut(clamp(lt / 3));
  setCam(t, { x: 0, y: lerp(0, -560, u), z: lerp(1.05, 1.55, u), shake: 0.05 });
  gateRed(g, t, { behind: g2 => manSitting(g2, t, 650, 1500, 6.0, {}), over: g2 => {
    drawAsh(g2, t, [UPV.top.x - 80, UPV.top.y - 120, UPV.top.w + 160, 1200], 300, 1);
    g2.fillStyle = `rgba(70,68,66,${0.35 * u})`; g2.fillRect(UPV.top.x - 40, UPV.top.y - 200, UPV.top.w + 80, UPV.top.h + 240);
  } });
  return { capY: 1290 };
}
// ================================================================== SCENE 9 — ROSA SITS DOWN NEXT TO YOU
function e2scene9(g, t, lt) {
  const closeT = LINES[20].s;
  const talk = (t >= LINES[18].s && t < LINES[18].e) || (t >= LINES[20].s && t < LINES[20].e);
  if (t >= closeT) {
    setCam(t, { x: 0, y: 0, z: 1.0 + (t - closeT) * 0.04, shake: 0.05 });
    g.fillStyle = '#2a1418'; g.fillRect(0, 0, W, H); blurDraw(g, 6, bg => { tileWall(bg, 0, 0, W, H, 80); bg.fillStyle = MOSAIC; bg.fillRect(0, 300, W, 100); });
    layer(g, 1, g => {
      g.fillStyle = lingrad(g, 0, 1100, 0, H, [[0, ROSA.top], [1, '#0e1422']]); ellipse(g, 540, 1650, 560, 460); g.fill();
      g.fillStyle = '#ff7a00'; poly(g, [100, 1500, 400, 1250, 440, 1920, 60, 1920]); g.fill(); poly(g, [980, 1500, 680, 1250, 640, 1920, 1020, 1920]); g.fill();
      g.fillStyle = '#e6eef5'; poly(g, [90, 1640, 420, 1580, 425, 1640, 80, 1700]); g.fill(); poly(g, [990, 1640, 660, 1580, 655, 1640, 1000, 1700]); g.fill();
      drawHeadFront(g, ROSA, 540, 760, 260, { t, expr: talk ? 'talk' : 'worried', look: [-0.35, 0.1], noRim: true, redSide: 0.4 });
    });
    redLight(g, t, 0.6);
    return { capY: 1290 };
  }
  const sit = smooth(seg(t, SC(9).start + 0.2, SC(9).start + 1.3));
  setCam(t, { x: 0, y: 0, z: 1.05 + lt * 0.01, shake: 0.05 });
  layer(g, 1, g => {
    tileWall(g, -200, -200, W + 400, 1500, 60); g.fillStyle = MOSAIC; g.fillRect(-200, 560, W + 400, 90);
    g.fillStyle = '#f2e9d0'; g.font = `800 52px ${F_UI}`; g.textAlign = 'center'; g.fillText('HARBOR ST', 540, 622);
    g.fillStyle = lingrad(g, 0, 1300, 0, H, [[0, '#7d786f'], [1, '#5c5850']]); g.fillRect(-200, 1300, W + 400, 800);
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(-200, 1290, W + 400, 14);
    drawDog(g, 470, 1840, 4.6, 1, { mode: 'lie', tail: 'tuck', earsBack: true }, t);
    const PY = poseSit(t, 1); PY.head = 0.15; PY.look = [1, 0];
    drawPersonSide(g, YOU, 200, 1720, 6.2, 1, PY, { t, expr: 'worried' });
    const PR = blendPose(poseIdle(t, 5), poseSit(t, 5), sit); PR.head = 0.2; PR.sh[0] = lerp(0.1, 1.0, sit); PR.el[0] = lerp(0.1, 1.2, sit);
    drawPersonSide(g, ROSA, 890, 1720, 6.0, -1, PR, { t, expr: talk ? 'talk' : 'worried', keySwing: 1 - sit });
  });
  redLight(g, t, 0.7);
  layer(g, 1, g => glow(g, 540, 800, 520, '#ff3b30', 0.25 * redP(t)));
  return { capY: 1290 };
}
// ================================================================== SCENE 10 — SURVIVAL RULE #2
function e2scene10(g, t, lt) {
  setCam(t, { x: 0, y: 0, z: 1.05 + lt * 0.01, shake: 0.05 });
  blurDraw(g, 6, bg => stationRed(bg, t, { near: g2 => youHugBiscuit(g2, t, 300, 1880, 6.4) }));
  g.save(); g.fillStyle = 'rgba(10,14,30,0.35)'; g.fillRect(0, 0, W, H); g.restore();
  return { capY: 1300 };
}
// ================================================================== SCENE 11 — YOUR PHONE. 38%. NO SIGNAL.
function drawPhoneLock(g, t, x, y, s) {
  g.save(); g.translate(x, y); g.rotate(-0.03); g.scale(s, s);
  g.fillStyle = YOU.skin; ellipse(g, -250, 380, 120, 200, 0.4); g.fill(); ellipse(g, 260, 300, 60, 150, -0.3); g.fill();
  g.fillStyle = shade(YOU.skin, -0.1); for (let k = 0; k < 3; k++) { rrect(g, 230, -40 + k * 110, 90, 70, 34); g.fill(); }
  g.fillStyle = '#4a5430'; g.fillRect(-420, 520, 340, 300);
  g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 60; g.fillStyle = '#0d0d10'; rrect(g, -300, -560, 600, 1180, 80); g.fill(); g.shadowColor = 'transparent';
  g.fillStyle = '#25262b'; rrect(g, -292, -552, 584, 1164, 74); g.fill();
  g.save(); rrect(g, -270, -530, 540, 1120, 58); g.clip();
  g.fillStyle = lingrad(g, 0, -530, 0, 590, [[0, '#1b2a44'], [1, '#0a0f1a']]); g.fillRect(-270, -530, 540, 1120);
  // status bar: no service + battery
  const noSig = t >= LINES[26].s, batt = t >= EV.battery;
  g.fillStyle = noSig ? '#ff6b5e' : '#fff'; g.font = `700 26px ${F_UI}`; g.textAlign = 'left'; g.fillText('No Service', -225, -470);
  g.fillStyle = '#000'; rrect(g, -70, -508, 140, 40, 20); g.fill();
  g.strokeStyle = '#fff'; g.lineWidth = 3; rrect(g, 120, -492, 64, 28, 7); g.stroke(); g.fillStyle = '#fff'; g.fillRect(186, -484, 5, 12);
  g.fillStyle = batt ? '#ff3b30' : '#ffd60a'; g.fillRect(124, -488, 56 * (batt ? 0.38 : 0.41), 20);
  g.fillStyle = '#fff'; g.font = `700 22px ${F_UI}`; g.fillText(batt ? '38%' : '41%', 60, -470);
  // time + date
  g.textAlign = 'center'; g.fillStyle = 'rgba(255,255,255,0.8)'; g.font = `700 30px ${F_UI}`; g.fillText('Tuesday', 0, -360);
  g.fillStyle = '#fff'; g.font = `800 150px ${F_UI}`; g.fillText('12:47', 0, -220);
  // the alert still in notifications
  g.fillStyle = 'rgba(255,255,255,0.14)'; rrect(g, -240, -140, 480, 200, 30); g.fill();
  g.fillStyle = '#d0141e'; rrect(g, -214, -116, 44, 44, 10); g.fill(); g.fillStyle = '#fff'; poly(g, [-192, -108, -178, -82, -206, -82]); g.fill();
  g.textAlign = 'left'; g.fillStyle = '#fff'; g.font = `800 26px ${F_UI}`; g.fillText('EMERGENCY ALERT', -156, -86);
  g.fillStyle = 'rgba(255,255,255,0.6)'; g.font = `700 20px ${F_UI}`; g.fillText('4h ago', 130, -86);
  g.fillStyle = '#ffd0d0'; g.font = `700 26px ${F_MONO}`; g.fillText('INCOMING MISSILE. SEEK', -214, -30); g.fillText('SHELTER IMMEDIATELY…', -214, 8);
  // big battery readout
  if (batt) { const b = easeOutBack(seg(t, EV.battery, EV.battery + 0.4)); g.save(); g.translate(0, 230); g.scale(b, b);
    g.strokeStyle = '#ff3b30'; g.lineWidth = 10; rrect(g, -150, -70, 280, 140, 26); g.stroke(); g.fillStyle = '#ff3b30'; g.fillRect(134, -26, 18, 52); g.fillRect(-138, -58, 256 * 0.38, 116);
    g.fillStyle = '#fff'; g.font = `800 64px ${F_UI}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('38%', -10, 4); g.restore(); g.textBaseline = 'alphabetic'; }
  if (noSig) { const b = easeOutBack(seg(t, LINES[26].s, LINES[26].s + 0.4)); g.save(); g.translate(0, 430); g.scale(b, b);
    for (let k = 0; k < 4; k++) { g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(-120 + k * 34, -10 - k * 22, 24, 30 + k * 22); }
    g.strokeStyle = '#ff3b30'; g.lineWidth = 10; line(g, -136, -90, 0, 30); g.fillStyle = '#ff6b5e'; g.font = `800 40px ${F_UI}`; g.textAlign = 'left'; g.fillText('NO SIGNAL', 20, 6); g.restore(); }
  g.restore();
  g.restore();
  glow(g, x, y, 820 * s, '#9fc4ff', 0.25);
}
function e2scene11(g, t, lt) {
  setCam(t, { x: 0, y: 0, z: 1.0 + lt * 0.02, shake: 0.08 });
  g.fillStyle = '#12080a'; g.fillRect(0, 0, W, H);
  blurDraw(g, 8, bg => { for (let k = 0; k < 10; k++) glow(bg, hash(k) * W, hash(k + 1) * H, 200, '#ff3b30', 0.4 * redP(t)); });
  layer(g, 1, g => drawPhoneLock(g, t, 540, 880, 0.98));
  return { capY: 1640 };
}
// ================================================================== SCENE 12 — HOUR FIVE. THE COUGHING STOPS.
function e2scene12(g, t, lt) {
  setCam(t, { x: 0, y: 0, z: 1.06 + lt * 0.03, shake: 0.04 });
  stationRed(g, t, { near: g => {
    youHugBiscuit(g, t, 300, 1880, 6.4);
    // a drip falling into a puddle on the platform
    const per = 1.1, ph = ((t - SC(12).start) % per) / per, px = 760, py = 1800;
    g.fillStyle = 'rgba(80,90,110,0.5)'; ellipse(g, px, py, 120, 26); g.fill();
    if (ph < 0.6) { const y = lerp(300, py - 10, (ph / 0.6) ** 2); g.fillStyle = 'rgba(200,220,255,0.8)'; ellipse(g, px, y, 7, 11); g.fill(); }
    else { const r = (ph - 0.6) / 0.4; g.strokeStyle = `rgba(200,220,255,${0.7 * (1 - r)})`; g.lineWidth = 3; ellipse(g, px, py, 20 + r * 110, 5 + r * 22); g.stroke(); }
  } });
  return { capY: 1290 };
}
// ================================================================== SCENE 13/14 — THE MAN IS ASLEEP / THE GIRL IS GONE
function e2scene13(g, t, lt) {
  const u = easeInOut(clamp(lt / 1.1));
  setCam(t, { x: 0, y: lerp(260, -60, u), z: lerp(1.15, 1.35, u), shake: 0.04 });
  gateRed(g, t, { behind: g2 => { manSitting(g2, t, 650, 1500, 6.0, { asleep: t > LINES[30].s - 0.2 }); girlStanding(g2, t, 420, 1480, 4.9); } });
  return { capY: 1720 };
}
function e2scene14(g, t, lt) {
  setCam(t, { x: -110 * smooth(clamp(lt / 2)), y: -60, z: 1.35 + lt * 0.12, shake: 0.03 });
  gateRed(g, t, { behind: g2 => { manSitting(g2, t, 650, 1500, 6.0, { asleep: true }); drawAsh(g2, t, [330, 1050, 180, 450], 30, 1); } });
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 0.5; g.drawImage(VIGN.c, 0, 0); g.restore();
  return { capY: 1720 };
}
// ================================================================== SCENE 15 — THE RABBIT, INSIDE THE GATE
function rabbitOnFloor(g, t, x, y, s) {
  aoShadow(g, x, y + 10, 70 * s / 9 * 9, 12, 0.5);
  g.save(); g.translate(x, y); g.rotate(-1.45); drawRabbit(g, 0, -40 * s / 9, s, 0, 0); g.restore();
}
function rabbitTag(g, x, y, s) { // small tag on the rabbit's ear with a gold H
  g.save(); g.translate(x, y); g.scale(s, s);
  g.strokeStyle = '#8a7a6a'; g.lineWidth = 0.6; line(g, 0, 0, 3, 5);
  g.fillStyle = lingrad(g, -4, 2, 8, 12, [[0, '#ffe08a'], [1, '#b8861a']]); circle(g, 4, 9, 4.6); g.fill();
  g.fillStyle = '#1a1a1a'; g.font = `800 6px ${F_UI}`; g.textAlign = 'center'; g.fillText('H', 4, 11.2);
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
function e2scene15(g, t, lt) {
  const inside = LINES[33].s;
  setCam(t, { x: 0, y: 0, z: 1.0 + lt * 0.04, shake: 0.03 });
  floorSet(g, t, t < inside ? 6 : lerp(6, 1, seg(t, inside, inside + 0.5)) | 0 || 1);
  layer(g, 1, g => rabbitOnFloor(g, t, 560, 1470, 15));
  redLight(g, t, 0.75);
  return { capY: 1760 };
}
// ================================================================== SCENE 16 — NOBODY OPENED IT. ROSA STILL HAS THE KEY.
function e2scene16(g, t, lt) {
  const keyT = LINES[35].s;
  if (t >= keyT) { setCam(t, { x: 0, y: 0, z: 1.02 + (t - keyT) * 0.04, shake: 0.05 }); keyHand(g, t, 1 - smooth(seg(t, keyT + 0.2, keyT + 0.9))); return { capY: 1720 }; }
  setCam(t, { x: 0, y: 0, z: 1.08, shake: 0.05 });
  stationRed(g, t, { turn: true, near: g => {
    youHugBiscuit(g, t, 300, 1880, 6.4);
    const P = poseIdle(t, 5); P.sh[0] = 0.9; P.el[0] = 1.4; P.head = -0.1;
    drawPersonSide(g, ROSA, 880, 1800, 5.8, -1, P, { t, expr: 'wide', keySwing: 0.3 });
  } });
  return { capY: 1290 };
}
// ================================================================== SCENE 17 — BISCUIT SNIFFS THE RABBIT, BACKS AWAY
function e2scene17(g, t, lt) {
  const back = LINES[37].s, sniff0 = SC(17).start + 0.9;
  setCam(t, { x: 0, y: 0, z: 1.02, shake: 0.04 });
  floorSet(g, t, 4);
  let dx, mode, ph;
  if (t < sniff0) { dx = lerp(-80, 330, smooth(lt / 0.9)); mode = 'walk'; ph = (t * 1.4) % 1; }
  else if (t < back) { dx = 330 + Math.sin(t * 3) * 6; mode = 'sniff'; ph = 0; }
  else { dx = 330 - (t - back) * 260; mode = 'walk'; ph = 1 - ((t * 1.6) % 1); }
  layer(g, 1, g => {
    rabbitOnFloor(g, t, 760, 1500, 7);
    rabbitTag(g, 600, 1475, 7);
    drawDog(g, dx, 1560, 6.4, 1, { mode, ph, tail: t < back ? 'low' : 'tuck', earsBack: t >= back, soundLines: false }, t);
  });
  redLight(g, t, 0.75);
  drawCodeChip(g, t, 632, 1540, SC(17).start + 0.6);
  return { capY: 1290 };
}
// ================================================================== SCENE 18 — A CHILD LAUGHS IN THE TUNNEL
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
function e2scene18(g, t, lt) {
  const z = lerp(1.6, 2.6, easeInOut(clamp(lt / 5)));
  const tc = tunnelView(g, t, z, () => redP(t));
  const since = t - EV.laugh;
  layer(g, 1, g => {
    if (since > 0 && since < 1.6) for (let k = 0; k < 3; k++) { const r = 30 + (since * 160 + k * 50); g.strokeStyle = `rgba(255,255,255,${Math.max(0, 0.35 - since * 0.22 - k * 0.06)})`; g.lineWidth = 3; ellipse(g, tc[0], tc[1] + 40, r, r * 0.7); g.stroke(); }
    if (since > 0.1 && since < 0.45) { g.fillStyle = 'rgba(255,211,26,0.85)'; circle(g, tc[0] + 8, tc[1] + 58, 3); g.fill(); glow(g, tc[0] + 8, tc[1] + 58, 14, '#ffd31a', 0.5); }   // a yellow glint, deep in the dark
  });
  return { capY: 1290 };
}
// ================================================================== SCENE 19 — EVERY LIGHT GOES OUT. EXCEPT ONE.
function lightState(t, k) {
  const n = ST.emerg.length;
  if (k === n - 1) { const f = t > EV.exceptOne && t < EV.exceptOne + 0.5 ? (hash(Math.floor(t * 24)) > 0.4 ? 1 : 0.3) : 1; return redP(t) * f; }   // the one above the tunnel
  const off = EV.lightsOut + 0.25 + (n - 2 - k) * 0.28;          // go out from the tunnel toward the camera
  if (t < off) return redP(t);
  if (t < off + 0.12) return hash(Math.floor(t * 40) + k) > 0.5 ? 0.6 : 0;
  return 0;
}
function e2scene19(g, t, lt) {
  tunnelView(g, t, lerp(1.25, 1.45, lt / 4), k => lightState(t, k));
  const n = ST.emerg.length, outN = ST.emerg.filter((_, k) => lightState(t, k) === 0).length;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = `rgba(2,2,4,${0.8 * outN / (n - 1)})`; g.fillRect(0, 0, W, H); g.restore();
  // the last light, drawn again on top of the darkness
  layer(g, 1, g => { const [X, Y, Z] = ST.emerg[n - 1], p = P3(X, Y, Z), s = ST.f / Z, on = lightState(t, n - 1); g.fillStyle = mix('#5a0a08', '#ff3b30', on); circle(g, p[0], p[1], 10 * s); g.fill(); glow(g, p[0], p[1], 420 * s, '#ff3b30', 0.9 * on); });
  return { capY: 1290 };
}
// ================================================================== SCENE 20 — CHOICE
function e2scene20(g, t, lt) {
  blurDraw(g, 6, bg => { tunnelView(bg, t, 1.45, k => k === ST.emerg.length - 1 ? redP(t) : 0); bg.save(); bg.setTransform(1 / 6, 0, 0, 1 / 6, 0, 0); bg.fillStyle = 'rgba(2,2,4,0.8)'; bg.fillRect(0, 0, W, H); bg.restore();
    const [X, Y, Z] = ST.emerg[ST.emerg.length - 1], p = P3(X, Y, Z), s = ST.f / Z; layer(bg, 1, b => glow(b, p[0], p[1], 420 * s, '#ff3b30', 0.9 * redP(t))); });
  const dark = seg(t, EV.ep2 - 0.4, EV.ep2 + 0.4);
  g.save(); g.fillStyle = `rgba(6,8,14,${0.3 + 0.45 * dark})`; g.fillRect(0, 0, W, H); g.restore();
  return { capY: 1700, choice: true };
}
const SCENE_LIST = [e2scene1, e2scene2, e2scene3, e2scene4, e2scene5, e2scene6, e2scene7, e2scene8, e2scene9, e2scene10,
  e2scene11, e2scene12, e2scene13, e2scene14, e2scene15, e2scene16, e2scene17, e2scene18, e2scene19, e2scene20];
