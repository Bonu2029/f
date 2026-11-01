// ============================================================================
// ep2/src/scenes2.js — Episode 2 "KEEP IT SHUT" (20 scenes). Underground the
// whole episode: red emergency light pulsing every 1.2 s, ash at the top of the
// stairs, the man and the girl behind the locked gate.
// ============================================================================
const RED_T0 = -5;                 // emergency lights have been on since Episode 1
const SCENE_WHIPS = [18];
const ALERT_WORDS = ['INCOMING', 'MISSILE.', 'SEEK', 'SHELTER', 'IMMEDIATELY.', 'THIS', 'IS', 'NOT', 'A', 'DRILL.'];

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
