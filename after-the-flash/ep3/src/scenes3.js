// ============================================================================
// ep3/src/scenes3.js — Episode 3 "WAKE THE MAN" (22 scenes). Almost total
// darkness: one red emergency light above the tunnel, grey ash daylight at the
// top of the stairs, and YOU's phone flashlight (a white cone that reveals).
// ============================================================================
const RED_T0 = -5;
const SCENE_WHIPS = [12, 13];
const MAN_CLEAN = Object.assign({}, MAN, { dust: false, cut: false, torn: false });
const MAN_SHIRT = Object.assign({}, MAN, { top: '#e9e9e6', topDark: '#c9c9c4', cuff: '#c9c9c4', suit: true });

// ---------------------------------------------------------------- flashlight lighting
// world(bg) draws the full-light scene; cone = [apexX, apexY, targetX, targetY, halfWidthAtTarget] in screen px
function flashlit(g, t, world, cone, o = {}) {
  const b = buf('fl', W, H), bg = b.getContext('2d');
  bg.setTransform(1, 0, 0, 1, 0, 0); bg.globalAlpha = 1; bg.globalCompositeOperation = 'source-over'; bg.fillStyle = '#000'; bg.fillRect(0, 0, W, H);
  bg.save(); world(bg); bg.restore(); bg.setTransform(1, 0, 0, 1, 0, 0);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  g.drawImage(b, 0, 0);
  g.globalCompositeOperation = 'multiply'; g.fillStyle = o.ambient || '#8a6470'; g.fillRect(0, 0, W, H); g.fillStyle = '#6a7290'; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'source-over';
  if (o.keep) { const [x, y, w, h, a] = o.keep; g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.globalAlpha = a; g.drawImage(b, 0, 0); g.restore(); }
  if (cone) {
    const [ax, ay, bx, by, wd] = cone, ang = Math.atan2(by - ay, bx - ax), len = Math.hypot(bx - ax, by - ay) * 1.7;
    const px = -Math.sin(ang), py = Math.cos(ang), ex = ax + Math.cos(ang) * len, ey = ay + Math.sin(ang) * len, hw = wd * 1.7;
    [[1.0, 0.92], [1.45, 0.4], [1.9, 0.15]].forEach(([k, a]) => { g.save(); g.beginPath(); g.moveTo(ax, ay); g.lineTo(ex + px * hw * k, ey + py * hw * k); g.lineTo(ex - px * hw * k, ey - py * hw * k); g.closePath(); g.clip(); g.globalAlpha = a; g.drawImage(b, 0, 0); g.restore(); });
    g.globalCompositeOperation = 'lighter';
    g.beginPath(); g.moveTo(ax, ay); g.lineTo(ex + px * hw, ey + py * hw); g.lineTo(ex - px * hw, ey - py * hw); g.closePath();
    g.fillStyle = lingrad(g, ax, ay, ex, ey, [[0, 'rgba(255,250,235,0.32)'], [0.45, 'rgba(255,250,235,0.08)'], [1, 'rgba(255,250,235,0)']]); g.fill();
    g.fillStyle = radgrad(g, bx, by, 0, wd * 1.3, [[0, 'rgba(255,250,235,0.28)'], [1, 'rgba(255,250,235,0)']]); g.fillRect(bx - wd * 1.4, by - wd * 1.4, wd * 2.8, wd * 2.8);
    g.save(); g.beginPath(); g.moveTo(ax, ay); g.lineTo(ex + px * hw, ey + py * hw); g.lineTo(ex - px * hw, ey - py * hw); g.closePath(); g.clip(); g.globalCompositeOperation = 'source-over'; drawMotes(g, t, Math.min(ax, bx) - wd, Math.min(ay, by) - wd, Math.abs(bx - ax) + wd * 2, Math.abs(by - ay) + wd * 2, 90, '255,250,235', 0.7); g.restore();
    glow(g, ax, ay, 70, '#ffffff', 0.9);
  }
  if (o.red) { const p = redP(t) * (o.redAmt == null ? 1 : o.redAmt); g.globalCompositeOperation = 'lighter'; o.red.forEach(([x, y, r]) => { g.fillStyle = radgrad(g, x, y, 0, r, [[0, `rgba(255,59,48,${0.5 * p})`], [1, 'rgba(255,59,48,0)']]); g.fillRect(x - r, y - r, r * 2, r * 2); }); }
  g.restore();
}
const TOPKEEP = [UPV.top.x - 40, 0, UPV.top.w + 80, UPV.top.y + UPV.top.h, 0.75];
function lastLight(t) { const f = EV.flicker; if (t >= f && t < f + 0.75) { const ph = (t - f) / 0.25; return ph % 1 < 0.45 ? 0.15 : 1; } return redP(t); }
function gateDark(t, o = {}) { return g2 => layer(g2, 1, g3 => gateView(g3, t, Object.assign({ down: 1, sky: 'ash' }, o))); }
function asleepMan(t, awake) { return g => manSitting(g, t, 650, 1500, 6.0, { asleep: !awake }); }

// ================================================================== 1 — RECAP + VOTE RESULT
function e3scene1(g, t, lt) {
  setCam(t, { x: 0, y: 0, z: 1.02 + lt * 0.03, shake: 0.1 });
  if (lt < 0.7) { floorSet(g, t, 4); layer(g, 1, g2 => rabbitOnFloor(g2, t, 560, 1470, 15)); redLight(g, t, 0.75); }
  else if (lt < 1.4) gateRed(g, t, { behind: asleepMan(t, false) });
  else { tunnelView(g, t, 1.6, k => k === ST.emerg.length - 1 ? redP(t) : 0); g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = 'rgba(2,2,4,0.6)'; g.fillRect(0, 0, W, H); g.restore(); }
  rewindFX(g, t, 1 - seg(lt, 1.6, 1.95), '◀◀  EPISODE 2');
  if (lt > 1.6) { g.save(); g.fillStyle = `rgba(6,8,14,${0.45 * seg(lt, 1.6, 2.0)})`; g.fillRect(0, 0, W, H); g.restore(); }
  drawVoteResult(g, t, 0.9);
  return { capY: 1300 };
}
// ================================================================== 2 — PHONE LIGHT
function e3scene2(g, t, lt) {
  setCam(t, { x: 0, y: 0, z: 1.03, shake: 0.05 });
  const on = t >= SC(2).start + 0.75;
  let hand = [300, 1400];
  flashlit(g, t, bg => { gateDark(t, { behind: asleepMan(t, false) })(bg);
    layer(bg, 1, g3 => { const P = poseIdle(t, 1); P.sh[0] = 1.15; P.el[0] = 0.35; P.head = 0.1; const r = drawPersonSide(g3, YOU, 170, 1990, 7.2, 1, P, { t, expr: 'worried', phone: true }); hand = r.hand;
      drawDog(g3, 330, 1990, 4.4, 1, { mode: 'stand', tail: 'low', earsUp: true }, t); }); },
    on ? [hand[0] + 20, hand[1] - 10, 600, 1260, 230] : null, { keep: TOPKEEP, red: [[90, 760, 420]] });
  if (on && t < SC(2).start + 0.85) { g.save(); g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(0, 0, W, H); g.restore(); }
  return { capY: 1300 };
}
// ================================================================== 3 — UP THE STAIRS TO THE GATE
function e3scene3(g, t, lt) {
  const u = clamp(lt / 2.2);
  setCam(t, { x: 0, y: 0, z: 1.03 + u * 0.06, shake: 0.08 });
  const y = lerp(2000, 1720, u), s = lerp(7.0, 5.4, u), ph = (t * 1.1) % 1;
  flashlit(g, t, bg => { gateDark(t, { behind: asleepMan(t, false) })(bg);
    layer(bg, 1, g3 => { drawDog(g3, 700, y + 10, s * 0.62, -1, { mode: 'walk', ph, tail: 'low' }, t);
      drawPersonFront(g3, YOU, 470, y, s, poseFrontWalk(ph), { t, back: true });
      g3.fillStyle = '#1b1c20'; rrect(g3, 470 - 15 * s, y - 80 * s, 30 * s, 32 * s, 6 * s); g3.fill(); }); },
    [560, y - 55 * s, 640, 1300, 200], { keep: TOPKEEP, red: [[90, 760, 420]] });
  return { capY: 1300 };
}
// ================================================================== 4 — "HEY! HEY! WAKE UP!"
function e3scene4(g, t, lt) {
  setCam(t, { x: 0, y: 0, z: 1.0 + lt * 0.03, shake: 0.2 });
  g.fillStyle = '#07080c'; g.fillRect(0, 0, W, H);
  blurDraw(g, 6, bg => { gateDark(t, { behind: asleepMan(t, false) })(bg); });
  g.save(); g.fillStyle = 'rgba(5,6,10,0.7)'; g.fillRect(0, 0, W, H); g.restore();
  layer(g, 1, g2 => {
    g2.fillStyle = lingrad(g2, 100, 0, 980, 0, [[0, YOU.topDark], [0.7, YOU.top], [1, shade(YOU.top, 0.2)]]); ellipse(g2, 540, 1560, 520, 380); g2.fill();
    g2.fillStyle = YOU.hood; ellipse(g2, 540, 1200, 250, 90); g2.fill();
    drawHeadFront(g2, YOU, 540, 800, 250, { t, expr: 'shout', look: [0.2, -0.3], noRim: true });
    // phone light from below
    g2.save(); g2.globalCompositeOperation = 'lighter'; g2.fillStyle = radgrad(g2, 540, 1250, 0, 650, [[0, 'rgba(255,250,235,0.45)'], [1, 'rgba(255,250,235,0)']]); g2.fillRect(-100, 500, W + 200, 1500); g2.restore();
  });
  g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = lingrad(g, 0, 300, 0, 1300, [[0, '#2a2a34'], [0.6, '#9a96a0'], [1, '#ffffff']]); g.fillRect(0, 0, W, H); g.restore();
  return { capY: 1300 };
}
// ================================================================== 5 — YOU SHAKE THE BARS. HE DOESN'T MOVE.
function e3scene5(g, t, lt) {
  const shaking = lt < 1.6 ? 0.6 + 0.4 * Math.sin(t * 34) : Math.max(0, 1 - (lt - 1.6) * 3);
  setCam(t, { x: 40, y: 260, z: 1.55, shake: 0.12 + shaking * 0.2 });
  flashlit(g, t, bg => {
    gateDark(t, { gateShake: shaking, behind: asleepMan(t, false), front: g3 => {
      [[430, 1200], [690, 1200]].forEach(([x, y]) => { g3.fillStyle = YOU.skin; rrect(g3, x - 34 + shaking * 6, y - 40, 68, 84, 26); g3.fill(); g3.fillStyle = YOU.cuff; rrect(g3, x - 44 + shaking * 6, y + 30, 88, 120, 30); g3.fill(); });
    } })(bg);
    layer(bg, 1, g3 => { if (shaking > 0.05) drawAsh(g3, t * 3, [UPV.arch.x, UPV.arch.y, UPV.arch.w, 600], 70, shaking); });
  }, [540, 1950, 560, 1080, 260], { keep: TOPKEEP });
  return { capY: 1720 };
}
// ================================================================== 6 — THEN HIS EYES OPEN
function e3scene6(g, t, lt) {
  const open = 1 - smooth(seg(t, EV.eyesOpen - 0.05, EV.eyesOpen + 0.12));
  setCam(t, { x: 0, y: 0, z: 1.0 + lt * 0.02, shake: 0.04 + (open < 0.5 ? 0.15 : 0) });
  g.fillStyle = '#0a0a0e'; g.fillRect(0, 0, W, H);
  layer(g, 1, g2 => {
    drawHeadFront(g2, MAN, 540, 960, 600, { t, expr: open < 0.5 ? 'wide' : 'neutral', blink: open, look: [t > EV.eyesOpen + 0.6 ? -0.7 : 0, 0], noRim: true });
    for (let k = 0; k < 4; k++) { const x = 120 + k * 280; limb(g2, x, -200, x, H + 200, 46, '#5f636c'); limb(g2, x + 10, -200, x + 10, H + 200, 10, '#a9aeb6'); }
  });
  // flashlight on the eyes, darkness around
  g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = radgrad(g, 540, 900, 120, 900, [[0, '#ffffff'], [0.5, '#8a8690'], [1, '#101014']]); g.fillRect(0, 0, W, H); g.restore();
  return { capY: 1780 };
}
// ================================================================== 7 — THE EMPTY STEP (two small clean footprints in the ash)
function e3scene7(g, t, lt) {
  setCam(t, { x: 0, y: 0, z: 1.0 + lt * 0.04, shake: 0.04 });
  flashlit(g, t, bg => layer(bg, 1, g2 => {
    g2.fillStyle = '#3a3836'; g2.fillRect(-200, -200, W + 400, H + 400);
    for (let k = 0; k < 4; k++) { const y = 200 + k * 420; g2.fillStyle = '#6f6b66'; g2.fillRect(-200, y, W + 400, 300); g2.fillStyle = '#4b4844'; g2.fillRect(-200, y + 300, W + 400, 120); g2.fillStyle = '#b8901a'; g2.fillRect(-200, y + 290, W + 400, 14); }
    // ash layer on the step
    for (let k = 0; k < 900; k++) { g2.fillStyle = `rgba(205,200,194,${0.5 + hash(k) * 0.4})`; circle(g2, hash(k * 1.3) * W, 1040 + hash(k * 2.7) * 290, 2 + hash(k + 4) * 4); g2.fill(); }
    // two small clean footprints (where she stood)
    [[430, 1150, -0.1], [600, 1190, 0.08]].forEach(([x, y, a]) => { g2.save(); g2.translate(x, y); g2.rotate(a); g2.fillStyle = '#6f6b66'; ellipse(g2, 0, -30, 34, 52); g2.fill(); ellipse(g2, 0, 46, 26, 30); g2.fill(); g2.restore(); });
    // the man's hand on the step at the edge + bars on the left
    g2.fillStyle = MAN.top; rrect(g2, 820, 900, 400, 160, 70); g2.fill(); g2.fillStyle = MAN.skin; ellipse(g2, 800, 1040, 90, 60); g2.fill();
    for (let k = 0; k < 3; k++) { const x = -20 + k * 150; limb(g2, x, -200, x, H + 200, 30, '#5f636c'); }
  }), [540, 1950, 520, 1180, 300], {});
  return { capY: 1700 };
}
// ================================================================== 8 — "WHERE IS SHE?"
function e3scene8(g, t, lt) {
  const shake = 0.5 + 0.5 * Math.sin(t * 28);
  setCam(t, { x: 0, y: -120, z: 1.65, shake: 0.28 });
  flashlit(g, t, bg => gateDark(t, { gateShake: shake, behind: g3 => { const P = poseFrontIdle(t, 9); P.armL = -1.0; P.elL = 0.6; P.armR = -1.0; P.elR = 0.6; drawPersonFront(g3, MAN, 560, 1460, 6.4, P, { t, expr: 'shout', look: [0.3, 0] }); },
    front: g3 => [[440, 1000], [680, 1000]].forEach(([x, y]) => { g3.fillStyle = MAN.skin; rrect(g3, x - 34 + shake * 6, y - 40, 68, 84, 26); g3.fill(); }) })(bg),
    [540, 1950, 540, 760, 320], { keep: TOPKEEP });
  drawBubble(g, t, SC(8).start + 0.05, 560, 380, 'WHERE IS SHE?', 560, 560, 70);
  return { capY: 1720 };
}
// ================================================================== 9 — ROSA HOLDS UP THE RABBIT
function e3scene9(g, t, lt) {
  setCam(t, { x: 0, y: 0, z: 1.04 + lt * 0.01, shake: 0.05 });
  const talk = t >= LINES[11].s && t < LINES[11].s + 1.2;
  let hand = [500, 900];
  flashlit(g, t, bg => {
    blurDraw(bg, 4, b2 => gateDark(t, { behind: asleepMan(t, true) })(b2));
    layer(bg, 1, g3 => { const P = poseIdle(t, 5); P.sh[0] = -2.35; P.el[0] = 0.25; P.head = -0.12;
      const r = drawPersonSide(g3, ROSA, 400, 1960, 7.4, 1, P, { t, expr: talk ? 'talk' : 'worried', keySwing: 0.4 }); hand = r.hand;
      drawRabbit(g3, hand[0] + 6, hand[1] - 4, 6.5, t, Math.sin(t * 1.6) * 0.15); });
  }, [1000, 1950, 440, 1150, 340], { keep: TOPKEEP, red: [[60, 500, 500]] });
  return { capY: 1760 };
}
// ================================================================== 10/11 — THE MAN GOES PALE / "SHE'S NOT MY DAUGHTER"
function paleFace(g, t, cx, cy, r, pale, o = {}) {
  layer(g, 1, g2 => {
    g2.fillStyle = '#1a1a20'; g2.fillRect(-200, -200, W + 400, H + 400);
    g2.fillStyle = lingrad(g2, 0, cy + r * 0.7, 0, H, [[0, MAN.top], [1, shade(MAN.top, -0.5)]]); ellipse(g2, cx, cy + r * 2.4, r * 2.1, r * 1.7); g2.fill();
    g2.fillStyle = '#f2f2f2'; poly(g2, [cx - r * 0.38, cy + r * 1.08, cx + r * 0.38, cy + r * 1.08, cx, cy + r * 2.0]); g2.fill(); g2.fillStyle = MAN.tie; poly(g2, [cx - r * 0.09, cy + r * 1.18, cx + r * 0.09, cy + r * 1.18, cx + r * 0.13, cy + r * 2.2, cx - r * 0.13, cy + r * 2.2]); g2.fill();
    drawHeadFront(g2, MAN, cx, cy, r, { t, expr: o.expr || 'worried', look: o.look || [0, 0.1], noRim: true });
    // colour drains from his face
    g2.save(); ellipse(g2, cx, cy, r * 0.95, r * 1.1); g2.clip();
    g2.globalCompositeOperation = 'saturation'; g2.fillStyle = `rgba(128,128,128,${0.85 * pale})`; g2.fillRect(cx - r, cy - r * 1.2, r * 2, r * 2.4);
    g2.globalCompositeOperation = 'source-over'; g2.fillStyle = `rgba(225,228,232,${0.22 * pale})`; g2.fillRect(cx - r, cy - r * 1.2, r * 2, r * 2.4); g2.restore();
    for (let k = 0; k < 6; k++) { const x = 40 + k * 200; limb(g2, x, -200, x, H + 200, 30, '#55595f'); limb(g2, x + 8, -200, x + 8, H + 200, 7, '#a9aeb6'); }
  });
  g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = radgrad(g, cx, cy, r * 0.4, r * 2.6, [[0, '#ffffff'], [1, '#202028']]); g.fillRect(0, 0, W, H); g.restore();
}
function e3scene10(g, t, lt) { setCam(t, { x: 0, y: 0, z: 1.0 + lt * 0.08, shake: 0.03 }); paleFace(g, t, 540, 820, 290, smooth(clamp(lt / 1.4)), {}); return { capY: 1300 }; }
function e3scene11(g, t, lt) { setCam(t, { x: 0, y: 0, z: 1.02, shake: 0.06 }); paleFace(g, t, 540, 840, 360, 1, { expr: t < LINES[13].e ? 'talk' : 'worried', look: [-0.2, 0] }); return { capY: 1300 }; }
// ================================================================== 12 — FLASHBACK (the street, Episode 1)
function e3scene12(g, t, lt) {
  const ft = 38.2 + lt;                                     // drive the Ep1 street at "chaos" time
  const close = smooth(seg(t, LINES[15].s - 0.1, LINES[15].s + 0.4));
  setCam(t, { x: lerp(0, 160, close), y: lerp(40, 420, close), z: lerp(1.05, 1.9, close), shake: 0.25 });
  wideBack(g, ft, { alert: true, panic: true, signOn: 0.4 + 0.6 * pulse(lt, 0.6) });
  layer(g, 1, g2 => { drawRoad(g2, -900, 5600, WIDE.roadTop, WIDE.roadBot, ft, {}); drawLane(g2, LANES_A[2], SC(8).start, { alert: true, brakeAll: 1 }); });
  layer(g, 1.08, g2 => {
    drawCurb(g2, -900, 5600, WIDE.roadBot, 20); drawSidewalk(g2, -900, 5600, WIDE.roadBot + 20, 2100, { slab: 170, rows: 2 });
    for (let k = 0; k < 7; k++) { const x = wrapv(1400 - lt * 520 + k * 300, -300, 1700); drawCrowdSide(g2, CROWD[(k * 11 + 7) % 90], x, 1880, 2.6, -1, k % 2 ? 'panic' : 'run', ft); }
    const P = poseFrontIdle(ft, 9); P.armL = 0.5; P.elL = 0.2; P.head = 0.2; P.look = [-0.5, 0.6];
    const m = drawPersonFront(g2, MAN_CLEAN, 760, 1880, 2.9, P, { t: ft, expr: 'fear' });
    const GP = poseFrontIdle(ft, 3); GP.armR = -0.9; GP.elR = 0.1; GP.look = [0.4, -0.4];
    if (t > LINES[15].s + 0.6) { GP.armL = -1.3; GP.elL = 0; GP.look = [-0.9, 0]; }       // she points toward the subway
    drawPersonFront(g2, GIRL, 650, 1880, 2.9, GP, { t: ft, noBlink: true });
  });
  // old-film look: desaturated, warm, flicker, scratches
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'saturation'; g.fillStyle = 'rgba(128,128,128,0.65)'; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'multiply'; g.fillStyle = '#f0d2a8'; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'source-over'; g.fillStyle = `rgba(255,240,210,${0.06 * hash(Math.floor(t * 24))})`; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 2; for (let k = 0; k < 3; k++) { const x = hash(Math.floor(t * 24) + k * 7) * W; line(g, x, 0, x + 8, H); }
  g.globalAlpha = 0.8; g.drawImage(VIGN.c, 0, 0); g.drawImage(VIGN.c, 0, 0);
  g.restore();
  return { capY: 1300 };
}
// ================================================================== 13 — "SHE SAID THE GATE WOULD OPEN FOR HER."
function e3scene13(g, t, lt) {
  setCam(t, { x: 0, y: 0, z: 1.05, shake: 0.05 });
  const p1 = [600, 1260], p2 = [560, 1560], p3 = [850, 1530];
  const u1 = smooth(seg(lt, 0.8, 1.3)), u2 = smooth(seg(lt, 1.6, 2.1));
  const tx = lerp(lerp(p1[0], p2[0], u1), p3[0], u2), ty = lerp(lerp(p1[1], p2[1], u1), p3[1], u2);
  flashlit(g, t, bg => gateDark(t, { behind: asleepMan(t, true), front: g3 => { const P = poseIdle(t, 5); P.head = 0.2; drawPersonSide(g3, ROSA, 900, 1900, 6.2, -1, P, { t, expr: 'worried', keySwing: 0.2 }); } })(bg),
    [540, 1960, tx, ty, 170], { keep: TOPKEEP, red: [[90, 760, 420]] });
  return { capY: 1300 };
}
// ================================================================== 14 — NOBODY SAYS A WORD
function e3scene14(g, t, lt) {
  tunnelView(g, t, 1.15 + lt * 0.02, k => k === ST.emerg.length - 1 ? lastLight(t) : 0);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = 'rgba(2,2,4,0.55)'; g.fillRect(0, 0, W, H); g.restore();
  const [X, Y, Z] = ST.emerg[ST.emerg.length - 1]; layer(g, 1, g2 => { const p = P3(X, Y, Z), s = ST.f / Z; glow(g2, p[0], p[1], 420 * s, '#ff3b30', 0.8 * redP(t)); });
  return { capY: 1300 };
}
// ================================================================== 15 — SURVIVAL RULE #3
function e3scene15(g, t, lt) {
  setCam(t, { x: 0, y: 0, z: 1.05, shake: 0.04 });
  flashlit(g, t, b2 => gateDark(t, { behind: asleepMan(t, true) })(b2), null, { keep: TOPKEEP }); blurFrame(g, 6);
  g.save(); g.fillStyle = 'rgba(10,14,30,0.4)'; g.fillRect(0, 0, W, H); g.restore();
  return { capY: 1300 };
}
// ================================================================== 16 — TRASH BAG, THE JACKET
function e3scene16(g, t, lt) {
  setCam(t, { x: 0, y: 40, z: 1.5, shake: 0.06 });
  const off = t >= EV.jacket, drop = clamp((t - EV.jacket) / 0.7), bagIn = smooth(clamp(lt / 1.6));
  flashlit(g, t, bg => gateDark(t, { behind: g3 => {
      const P = poseFrontIdle(t, 9); P.armL = off ? 0.4 : 0.15; P.elL = off ? 1.2 : 0.2;
      drawPersonFront(g3, off ? MAN_SHIRT : MAN, 600, 1470, 6.2, P, { t, expr: 'worried', look: [0, 0.6] });
      // the black trash bag pushed through the lattice
      g3.save(); g3.translate(lerp(820, 620, bagIn), 1330); g3.fillStyle = '#121214'; g3.beginPath(); g3.moveTo(-120, -110); g3.quadraticCurveTo(-150, 60, -90, 130); g3.lineTo(110, 130); g3.quadraticCurveTo(160, 40, 120, -110); g3.quadraticCurveTo(0, -150, -120, -110); g3.fill();
      g3.fillStyle = 'rgba(255,255,255,0.18)'; ellipse(g3, -60, -40, 14, 70, 0.2); g3.fill(); g3.restore();
      if (off && drop < 1) { g3.save(); g3.translate(560, lerp(1150, 1330, drop * drop)); g3.rotate(drop * 0.8); g3.fillStyle = MAN.top; rrect(g3, -110, -70, 220, 150, 30); g3.fill(); g3.restore(); }
      if (off) for (let k = 0; k < 30; k++) { const u = (t - EV.jacket) * (0.6 + hash(k)); if (u > 1.4) continue; g3.fillStyle = `rgba(210,205,198,${(1 - u / 1.4) * 0.8})`; circle(g3, 560 + (hash(k + 1) - 0.5) * 300 * u, 1200 - u * 140 * hash(k + 2), 4 + u * 10); g3.fill(); }
    }, front: g3 => { g3.fillStyle = ROSA.top; g3.save(); g3.translate(lerp(1200, 900, bagIn), 1420); g3.rotate(-0.25); rrect(g3, -60, -60, 420, 120, 60); g3.fill(); g3.fillStyle = '#ff7a00'; g3.fillRect(40, -60, 60, 120); g3.restore(); } })(bg),
    [540, 1960, 600, 1230, 320], { keep: TOPKEEP });
  return { capY: 1720 };
}
// ================================================================== 17 — THE DRAWING (code piece 3/7: E)
function crayon(g, pts, col, w, seed, closed) { // jittery crayon stroke
  for (let p = 0; p < 3; p++) { g.strokeStyle = col; g.globalAlpha = 0.55; g.lineWidth = w * (1 - p * 0.2); g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath();
    pts.forEach(([x, y], i) => { const jx = (hash(seed + i * 3.1 + p) - 0.5) * w * 0.9, jy = (hash(seed + i * 5.7 + p) - 0.5) * w * 0.9; i ? g.lineTo(x + jx, y + jy) : g.moveTo(x + jx, y + jy); });
    if (closed) g.closePath(); g.stroke(); }
  g.globalAlpha = 1;
}
function drawingPaper(g, t, circleU, hiStation, hiTunnel) {
  g.save(); g.translate(540, 900); g.rotate(-0.04);
  g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 40; g.fillStyle = '#f1ead8'; g.fillRect(-470, -640, 940, 1280); g.shadowColor = 'transparent';
  g.strokeStyle = 'rgba(120,100,80,0.25)'; g.lineWidth = 3; line(g, -470, 0, 470, 10); line(g, 0, -640, -6, 640);       // fold lines
  // stairs going down (left)
  crayon(g, [[-420, -460], [-340, -460], [-340, -380], [-260, -380], [-260, -300], [-180, -300], [-180, -220], [-100, -220], [-100, -140]], '#6b6b6b', 14, 1);
  // the gate (crosshatch)
  for (let k = 0; k < 6; k++) crayon(g, [[-120 + k * 30, -200], [-120 + k * 30, 60]], '#8a8a8a', 6, 20 + k);
  crayon(g, [[-130, -200], [50, 60]], '#8a8a8a', 6, 40); crayon(g, [[50, -200], [-130, 60]], '#8a8a8a', 6, 41);
  // platform line + tunnel arch (right), scribbled black inside
  crayon(g, [[-440, 120], [440, 120]], '#5a4a3a', 10, 50);
  crayon(g, [[150, 120], [150, -120], [190, -220], [290, -260], [390, -220], [430, -120], [430, 120]], '#222', 14, 60);
  for (let k = 0; k < 14; k++) crayon(g, [[170 + k * 18, 110], [180 + k * 17, -150 + (k % 3) * 20]], '#111', 10, 70 + k);
  // stick figures: a tall man, a girl in yellow, a dog
  crayon(g, [[-330, 300], [-330, 420], [-360, 520], [-330, 420], [-300, 520]], '#333', 8, 90); crayon(g, [[-380, 340], [-280, 340]], '#333', 8, 91);
  g.strokeStyle = '#333'; g.lineWidth = 7; circle(g, -330, 270, 30); g.stroke();
  crayon(g, [[-200, 360], [-240, 470], [-160, 470]], '#f2c200', 16, 95, true); g.fillStyle = 'rgba(242,194,0,0.6)'; poly(g, [-200, 360, -240, 470, -160, 470]); g.fill();
  g.strokeStyle = '#4a3020'; g.lineWidth = 7; circle(g, -200, 335, 24); g.stroke(); crayon(g, [[-215, 470], [-215, 520]], '#333', 7, 96); crayon(g, [[-185, 470], [-185, 520]], '#333', 7, 97);
  crayon(g, [[-40, 470], [60, 470], [80, 440], [100, 450], [80, 470], [60, 470], [60, 520], [60, 470], [-40, 470], [-40, 520], [-40, 470], [-60, 440]], '#c98a2a', 9, 98);
  g.fillStyle = '#c98a2a'; g.font = `700 30px "Comic Sans MS", ${F_UI}`; g.fillText('B', 30, 430);
  // the girl's footprints leading into the tunnel
  for (let k = 0; k < 5; k++) { g.fillStyle = 'rgba(242,194,0,0.8)'; ellipse(g, -100 + k * 60, 300 - k * 40, 8, 13, 0.6); g.fill(); }
  // big letter E + red circle (drawn as the narrator says "circled in red")
  crayon(g, [[200, 300], [130, 300], [130, 520], [200, 520]], '#111', 16, 120); crayon(g, [[130, 410], [190, 410]], '#111', 16, 121);
  if (circleU > 0) { const n = Math.floor(circleU * 40), pts = []; for (let i = 0; i <= n; i++) { const a = -2.2 + i / 40 * TAU * 1.08; pts.push([165 + Math.cos(a) * 120, 410 + Math.sin(a) * 140]); } crayon(g, pts, '#d6211a', 14, 130); }
  // highlights following the narration
  const hl = (x, y, w, h, a) => { if (a <= 0) return; g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = `rgba(255,214,107,${0.5 * a})`; rrect(g, x, y, w, h, 30); g.fill(); g.restore(); };
  hl(-450, -490, 540, 580, hiStation); hl(130, -290, 330, 430, hiTunnel);
  g.restore();
}
function e3scene17(g, t, lt) {
  if (t < EV.drawing) { // something falls out of the pocket onto the step
    setCam(t, { x: 0, y: 0, z: 1.0 + lt * 0.03, shake: 0.04 });
    const u = clamp((t - EV.falls - 0.3) / 0.9);
    flashlit(g, t, bg => layer(bg, 1, g2 => {
      g2.fillStyle = '#3a3836'; g2.fillRect(-200, -200, W + 400, H + 400);
      for (let k = 0; k < 4; k++) { const y = 200 + k * 420; g2.fillStyle = '#6f6b66'; g2.fillRect(-200, y, W + 400, 300); g2.fillStyle = '#4b4844'; g2.fillRect(-200, y + 300, W + 400, 120); }
      for (let k = 0; k < 500; k++) { g2.fillStyle = `rgba(205,200,194,${0.5 + hash(k) * 0.4})`; circle(g2, hash(k * 1.3) * W, 1040 + hash(k * 2.7) * 290, 2 + hash(k + 4) * 4); g2.fill(); }
      const py = lerp(100, 1180, u * u), rot = u * 2.6 + Math.sin(t * 6) * 0.2 * (1 - u);
      g2.save(); g2.translate(560 + Math.sin(u * 5) * 60, py); g2.rotate(rot); g2.scale(1, u < 1 ? Math.abs(Math.cos(t * 7)) * 0.7 + 0.3 : 0.55); g2.fillStyle = '#f1ead8'; g2.fillRect(-90, -120, 180, 240); g2.strokeStyle = 'rgba(214,33,26,0.7)'; g2.lineWidth = 4; circle(g2, 30, 40, 26); g2.stroke(); g2.restore();
    }), [540, 1950, 560, 1180, 280], {});
    return { capY: 1700 };
  }
  setCam(t, { x: 0, y: 0, z: 1.0 + (t - EV.drawing) * 0.012, shake: 0.03 });
  g.fillStyle = '#0c0c10'; g.fillRect(0, 0, W, H);
  layer(g, 1, g2 => drawingPaper(g2, t, clamp((t - EV.circled) / 1.0), seg(t, EV.station, EV.station + 0.3) * (1 - seg(t, EV.tunnel, EV.tunnel + 0.3)), seg(t, EV.tunnel, EV.tunnel + 0.3) * (1 - seg(t, EV.circled, EV.circled + 0.3))));
  g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = radgrad(g, 560, 900, 300, 1000, [[0, '#ffffff'], [1, '#18181e']]); g.fillRect(0, 0, W, H); g.restore();
  drawCodeChip(g, t, 700, 1310, EV.circled + 0.5);
  return { capY: 1700 };
}
// ================================================================== 18 — BISCUIT TURNS TOWARD THE TUNNEL AND GROWLS
function e3scene18(g, t, lt) {
  setCam(t, { x: 0, y: 0, z: 1.0 + lt * 0.03, shake: 0.06 });
  g.fillStyle = '#060608'; g.fillRect(0, 0, W, H);
  blurDraw(g, 5, bg => { tunnelView(bg, t, 1.3, k => k === ST.emerg.length - 1 ? redP(t) : 0); });
  g.save(); g.fillStyle = 'rgba(2,2,4,0.55)'; g.fillRect(0, 0, W, H); g.restore();
  const turn = smooth(seg(lt, 0.4, 0.75)), growl = t >= EV.growl;
  layer(g, 1, g2 => {
    g2.fillStyle = 'rgba(20,10,12,0.9)'; g2.fillRect(-200, 1620, W + 400, 600);
    g2.save(); g2.translate(540, 0); g2.scale(lerp(1, -1, turn) || 0.02, 1); g2.translate(-540, 0);
    drawDog(g2, 470, 1910, 9, 1, { mode: growl ? 'growl' : 'stand', tail: growl ? 'low' : 'low', hackles: growl, earsUp: !growl }, t);
    g2.restore();
    glow(g2, 300, 1400, 360, '#ff3b30', 0.3 * redP(t));
  });
  return { capY: 1250 };
}
// ================================================================== 19 — THE LAST RED LIGHT FLICKERS
function e3scene19(g, t, lt) {
  tunnelView(g, t, 2.0 + lt * 0.05, k => k === ST.emerg.length - 1 ? lastLight(t) : 0);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = `rgba(2,2,4,${0.8 - 0.35 * lastLight(t)})`; g.fillRect(0, 0, W, H); g.restore();
  const [X, Y, Z] = ST.emerg[ST.emerg.length - 1]; layer(g, 1, g2 => { const p = P3(X, Y, Z), s = ST.f / Z; glow(g2, p[0], p[1], 420 * s, '#ff3b30', 0.9 * lastLight(t)); });
  return { capY: 1300 };
}
// ================================================================== 20 — A SMALL VOICE FROM THE DARK
function e3scene20(g, t, lt) {
  if (t < EV.voice) {
    tunnelView(g, t, lerp(2.1, 3.0, clamp(lt / 3.2)), k => k === ST.emerg.length - 1 ? redP(t) * 0.7 : 0);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = 'rgba(2,2,4,0.5)'; g.fillRect(0, 0, W, H); g.restore();
    return { capY: 1300 };
  }
  const v = t - EV.voice;
  setCam(t, { x: 0, y: 0, z: 1.05 + v * 0.03, shake: 0.04 });
  g.fillStyle = '#060608'; g.fillRect(0, 0, W, H);
  layer(g, 1, g2 => {
    g2.fillStyle = 'rgba(20,10,12,0.9)'; g2.fillRect(-200, 1620, W + 400, 600);
    drawDog(g2, 640, 1960, 10, -1, { mode: 'stand', tail: v > 0.3 && v < 0.9 ? 'wag' : 'tuck', earsUp: v < 1.4, earsBack: v >= 1.4, tilt: v < 1.4 ? -0.2 : 0 }, t);
    glow(g2, 200, 1350, 420, '#ff3b30', 0.3 * redP(t));
  });
  return { capY: 1250 };
}
// ================================================================== 21 — SHE KNOWS HIS NAME (the collar tag)
function e3scene21(g, t, lt) {
  setCam(t, { x: 0, y: 0, z: 1.02 + lt * 0.05, shake: 0.04 });
  g.fillStyle = '#08070a'; g.fillRect(0, 0, W, H);
  layer(g, 1, g2 => {
    const cx = 540, cy = 760;
    g2.fillStyle = DOG.coat; ellipse(g2, cx, cy + 520, 620, 560); g2.fill();
    g2.fillStyle = DOG.light; for (let k = 0; k < 22; k++) { ellipse(g2, cx - 500 + k * 48, cy + 40 + Math.sin(k) * 14, 34, 24, 0.4); g2.fill(); }
    g2.fillStyle = DOG.collar; rrect(g2, cx - 470, cy - 50, 940, 100, 50); g2.fill(); g2.fillStyle = '#c0c6ce'; g2.fillRect(cx - 22, cy - 50, 44, 100);
    const sw = Math.sin(t * 2.2) * 0.25;
    g2.save(); g2.translate(cx, cy + 50); g2.rotate(sw);
    g2.fillStyle = lingrad(g2, -110, 0, 110, 0, [[0, '#8f979f'], [0.5, '#ffffff'], [1, '#9aa2aa']]); circle(g2, 0, 170, 110); g2.fill(); g2.strokeStyle = '#6b7178'; g2.lineWidth = 7; g2.stroke();
    g2.fillStyle = '#4a5058'; g2.font = `800 52px ${F_UI}`; g2.textAlign = 'center'; g2.fillText('BISCUIT', 0, 188); g2.restore();
  });
  g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = radgrad(g, 540, 900, 150, 900, [[0, '#ffffff'], [1, '#141016']]); g.fillRect(0, 0, W, H); g.restore();
  layer(g, 1, g2 => glow(g2, 900, 500, 600, '#ff3b30', 0.35 * redP(t)));
  return { capY: 1500 };
}
// ================================================================== 22 — CHOICE
function e3scene22(g, t, lt) {
  blurDraw(g, 6, bg => { tunnelView(bg, t, 1.6, k => k === ST.emerg.length - 1 ? redP(t) : 0); bg.save(); bg.setTransform(1 / 6, 0, 0, 1 / 6, 0, 0); bg.fillStyle = 'rgba(2,2,4,0.7)'; bg.fillRect(0, 0, W, H); bg.restore(); });
  const dark = seg(t, EV.ep2 - 0.4, EV.ep2 + 0.4);
  g.save(); g.fillStyle = `rgba(6,8,14,${0.3 + 0.45 * dark})`; g.fillRect(0, 0, W, H); g.restore();
  return { capY: 1700, choice: true };
}
const SCENE_LIST = [e3scene1, e3scene2, e3scene3, e3scene4, e3scene5, e3scene6, e3scene7, e3scene8, e3scene9, e3scene10, e3scene11,
  e3scene12, e3scene13, e3scene14, e3scene15, e3scene16, e3scene17, e3scene18, e3scene19, e3scene20, e3scene21, e3scene22];
