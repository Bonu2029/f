// ============================================================================
// ep4/src/scenes4.js — Episode 4 "LET HIM IN" (22 scenes). Dark station: one
// red light above the tunnel + YOU's phone flashlight (flashlit, scene_kit3).
// ============================================================================
const RED_T0 = -5;
const SCENE_WHIPS = [21];
// ---------------------------------------------------------------- pieces for this episode
function floorLock(g, t, turn, o = {}) {            // the floor lock at the bottom of the gate, key + Rosa's hand
  const railY = o.railY || 820;
  for (let k = 0; k < 6; k++) { limb(g, 60 + k * 190, -100, 60 + k * 190, railY, 28, '#7f8792'); limb(g, 66 + k * 190, -100, 66 + k * 190, railY, 6, '#d9dee5'); }
  for (let y = railY; y > -200; y -= 230) for (let k = 0; k < 6; k++) { g.strokeStyle = '#6b727c'; g.lineWidth = 16; line(g, 60 + k * 190, y, 250 + k * 190, y - 230); line(g, 250 + k * 190, y, 60 + k * 190, y - 230); }
  g.fillStyle = lingrad(g, 0, railY - 50, 0, railY + 60, [[0, '#dfe3e8'], [0.5, '#8a929c'], [1, '#3e444c']]); g.fillRect(-40, railY - 50, W + 80, 110);
  g.fillStyle = '#2b2f35'; rrect(g, 380, railY + 40, 320, 200, 24); g.fill();
  g.fillStyle = lingrad(g, 400, 0, 680, 0, [[0, '#b8962e'], [0.5, '#f2d36b'], [1, '#9c7412']]); rrect(g, 420, railY + 70, 240, 140, 18); g.fill();
  g.fillStyle = '#1a1a1a'; circle(g, 540, railY + 130, 22); g.fill();
  g.save(); g.translate(540, railY + 130); g.rotate(turn * 1.5);
  g.fillStyle = '#c0c6ce'; g.fillRect(-10, -150, 20, 150); g.fillStyle = '#d4af37'; circle(g, 0, -190, 56); g.fill(); g.fillStyle = '#2b2f35'; circle(g, 0, -200, 16); g.fill(); g.restore();
  g.save(); g.translate(540, railY - 60); g.rotate(turn * 0.6);
  g.fillStyle = ROSA.top; rrect(g, 40, -330, 220, 260, 60); g.fill(); g.fillStyle = '#ff7a00'; g.fillRect(40, -330, 220, 60);
  g.fillStyle = ROSA.skin; ellipse(g, 20, -90, 110, 90); g.fill(); g.fillStyle = shade(ROSA.skin, -0.1); for (let k = 0; k < 3; k++) { rrect(g, -110, -150 + k * 50, 120, 44, 22); g.fill(); } g.restore();
}
function railsSet(g, t, hum) {                        // floor level on the tracks, rails converging into the tunnel
  const vx = 520, vy = 760;
  g.fillStyle = '#16120f'; g.fillRect(-200, -200, W + 400, H + 400);
  g.fillStyle = radgrad(g, vx, vy, 0, 260, [[0, '#000'], [1, 'rgba(0,0,0,0)']]); g.fillRect(vx - 300, vy - 300, 600, 600);
  for (let k = 0; k < 26; k++) { const u = Math.pow(k / 26, 2.2), y = lerp(vy + 10, H + 200, u), w2 = lerp(30, 1500, u); g.fillStyle = '#3b2c20'; g.fillRect(vx - w2 / 2, y, w2, lerp(2, 60, u)); }
  [-1, 1].forEach(sd => { const jit = hum * Math.sin(t * 90 + sd) * 2;
    g.fillStyle = '#4a4f57'; poly(g, [vx + sd * 12, vy, vx + sd * 18, vy, vx + sd * 430 + jit, H + 200, vx + sd * 330 + jit, H + 200]); g.fill();
    g.fillStyle = '#c9ced6'; poly(g, [vx + sd * 13, vy, vx + sd * 15, vy, vx + sd * 395 + jit, H + 200, vx + sd * 355 + jit, H + 200]); g.fill(); });
  // dust dancing on the rail tops
  if (hum > 0) for (let k = 0; k < 60; k++) { const sd = k % 2 ? 1 : -1, u = 0.3 + hash(k) * 0.7, y = lerp(vy, H, u), x = vx + sd * lerp(14, 375, u), j = Math.abs(Math.sin(t * 40 + k)) * 18 * u * hum;
    g.fillStyle = `rgba(220,210,195,${0.7 * hum})`; circle(g, x, y - j, 2 + u * 3); g.fill(); }
}
function supplyShelf(g, t) {                          // behind the counter: case of water + crackers
  g.fillStyle = '#1a222c'; g.fillRect(-200, -200, W + 400, H + 400);
  g.fillStyle = '#6b4a2f'; g.fillRect(-100, 1160, W + 200, 60); g.fillRect(-100, 760, W + 200, 40);
  for (let r = 0; r < 2; r++) for (let k = 0; k < 6; k++) { const x = 160 + k * 74 + r * 30, y = 1160 - r * 10;    // shrink-wrapped water case
    g.fillStyle = 'rgba(140,200,255,0.75)'; rrect(g, x - 26, y - 230, 52, 230, 16); g.fill(); g.fillStyle = '#2b6cb0'; g.fillRect(x - 15, y - 262, 30, 34); g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(x - 18, y - 200, 8, 160); g.fillStyle = '#1f6fd1'; g.fillRect(x - 26, y - 150, 52, 50); }
  g.fillStyle = 'rgba(255,255,255,0.15)'; rrect(g, 120, 880, 520, 290, 30); g.fill();
  [[740, 1160], [860, 1160], [800, 1000]].forEach(([x, y], k) => { g.fillStyle = ['#c0392b', '#e9b44c', '#c0392b'][k]; g.fillRect(x - 60, y - 160, 120, 160); g.fillStyle = '#fff3d6'; g.font = `800 28px ${F_UI}`; g.textAlign = 'center'; g.fillText('CRACKERS', x, y - 90); g.fillStyle = '#e9c46a'; for (let j = 0; j < 3; j++) { circle(g, x - 30 + j * 30, y - 40, 12); g.fill(); } });
  g.fillStyle = '#6b4a2f'; g.fillRect(-100, 1220, W + 200, 800);
}
const darkCone = [540, 1960, 560, 1250, 260];

// ================================================================== 1 — RECAP + VOTE RESULT
function e4scene1(g, t, lt) {
  setCam(t, { x: 0, y: 0, z: 1.02 + lt * 0.03, shake: 0.1 });
  if (lt < 0.7) { g.fillStyle = '#0a0a0e'; g.fillRect(0, 0, W, H); layer(g, 1, g2 => drawHeadFront(g2, MAN, 540, 960, 600, { t, expr: 'wide', look: [0, 0], noRim: true })); }
  else if (lt < 1.4) { g.fillStyle = '#0c0c10'; g.fillRect(0, 0, W, H); layer(g, 1, g2 => drawingPaper(g2, t, 1, 0, 0)); }
  else { g.fillStyle = '#08070a'; g.fillRect(0, 0, W, H); layer(g, 1, g2 => { g2.fillStyle = DOG.collar; rrect(g2, 70, 710, 940, 100, 50); g2.fill(); g2.fillStyle = lingrad(g2, 430, 0, 650, 0, [[0, '#8f979f'], [0.5, '#fff'], [1, '#9aa2aa']]); circle(g2, 540, 980, 110); g2.fill(); g2.fillStyle = '#4a5058'; g2.font = `800 52px ${F_UI}`; g2.textAlign = 'center'; g2.fillText('BISCUIT', 540, 998); }); }
  rewindFX(g, t, 1 - seg(lt, 1.6, 1.95), '◀◀  EPISODE 3');
  if (lt > 1.6) { g.save(); g.fillStyle = `rgba(6,8,14,${0.45 * seg(lt, 1.6, 2.0)})`; g.fillRect(0, 0, W, H); g.restore(); }
  drawVoteResult(g, t, 0.9);
  return { capY: 1300 };
}
// ================================================================== 2 — THE KEY, THE LOCK CLICKS
function e4scene2(g, t, lt) {
  const click = EV.clicks;
  setCam(t, { x: 0, y: 0, z: 1.06, shake: t > click && t < click + 0.25 ? 0.5 : 0.08 });
  flashlit(g, t, bg => { tileWall(bg, 0, 0, W, 900, 90); bg.fillStyle = '#6f6a62'; bg.fillRect(0, 900, W, H); layer(bg, 1, g2 => floorLock(g2, t, smooth(seg(t, SC(2).start + 0.4, click)))); },
    [540, 1960, 540, 980, 360], { red: [[120, 300, 500]] });
  if (t > click) for (let k = 0; k < 16; k++) { const u = (t - click) * (1 + hash(k)); if (u > 0.6) continue; g.fillStyle = `rgba(230,220,200,${1 - u / 0.6})`; circle(g, 540 + (hash(k + 1) - 0.5) * 300 * u, 950 - 200 * u * hash(k + 2), 3); g.fill(); }
  return { capY: 1500 };
}
// ================================================================== 3 — THE GATE LIFTS. JUST A LITTLE.
function e4scene3(g, t, lt) {
  const lift = smooth(seg(t, EV.lifts, EV.lifts + 1.4)) * 0.17;
  setCam(t, { x: 0, y: 60, z: 1.08, shake: 0.08 });
  flashlit(g, t, bg => gateDark(t, { down: 1 - lift, behind: asleepMan(t, true) })(bg), darkCone, { keep: TOPKEEP, red: [[90, 760, 420]] });
  // grey daylight spills in under the gap
  if (lift > 0) { const A = UPV.arch, gy = A.y + A.h; g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = lingrad(g, 0, gy - lift * A.h, 0, gy + 380, [[0, `rgba(200,198,194,${0.45 * lift / 0.17})`], [1, 'rgba(200,198,194,0)']]);
    poly(g, [A.x, gy - lift * A.h, A.x + A.w, gy - lift * A.h, A.x + A.w + 260, gy + 380, A.x - 260, gy + 380]); g.fill(); g.restore(); }
  return { capY: 1300 };
}
// ================================================================== 4 — HE CRAWLS UNDER, ASH FALLS OFF HIS BACK
function e4scene4(g, t, lt) {
  const sm = lt, floorY = 1450, gx = 560, gap = 170;
  setCam(t, { x: 0, y: 0, z: 1.04, shake: 0.06 });
  flashlit(g, t, bg => {
    tileWall(bg, 0, 0, W, floorY, 46); bg.fillStyle = MOSAIC; bg.fillRect(0, 380, W, 70); bg.fillStyle = '#f2e9d0'; bg.font = `800 44px ${F_UI}`; bg.textAlign = 'center'; bg.fillText('HARBOR ST', 800, 430);
    bg.fillStyle = '#8f8a80'; bg.fillRect(0, floorY, W, H - floorY);
    for (let k = 0; k < 12; k++) { const x = 380 - k * 60, y = floorY - k * 70; bg.fillStyle = k % 2 ? '#86837c' : '#7d7a74'; bg.fillRect(x - 60, y - 70, 460, 70); bg.fillStyle = '#e8b81e'; bg.fillRect(x - 60, y - 70, 64, 8); }
    layer(bg, 1, g2 => {
      const gb = floorY - gap; g2.fillStyle = '#2c3036'; g2.fillRect(gx - 50, 160, 140, 60);
      for (let k = 0; k < 4; k++) limb(g2, gx + 40 + k * 18, 220, gx + 40 + k * 18, gb, 10, k % 2 ? '#7f8792' : '#9aa2ac');
      for (let y = gb; y > 220; y -= 70) { g2.strokeStyle = '#6b727c'; g2.lineWidth = 6; line(g2, gx + 40, y, gx + 94, y - 60); }
      g2.fillStyle = lingrad(g2, 0, gb - 20, 0, gb + 20, [[0, '#c9ced6'], [1, '#4b525b']]); g2.fillRect(gx - 20, gb - 18, 110, 34);
      // Daniel crawling on his belly, left → right under the gate
      const cu = clamp(sm / 3.6), dx = lerp(-60, 980, easeInOut(cu)), ph = (t * 1.6) % 1;
      const P = { lean: 0, bob: 0, head: -0.25, hip: [0.4 + Math.sin(ph * TAU) * 0.4, 0.4 - Math.sin(ph * TAU) * 0.4], kn: [1.2, 1.2], sh: [-2.6 + Math.sin(ph * TAU) * 0.5, -2.6 - Math.sin(ph * TAU) * 0.5], el: [0.4, 0.4], ft: [0, 0], rot: 1.5, expr: 'worried' };
      drawPersonSide(g2, DANIEL, dx - 420, floorY - 30, 4.6, 1, P, { t, shadow: false });
      // ash falling off his back
      for (let k = 0; k < 30; k++) { const u = ((t * 0.7 + hash(k)) % 1); const x = dx - 420 + 100 + hash(k + 3) * 300 - u * 60, y = floorY - 90 + u * 80; g2.fillStyle = `rgba(205,200,194,${(1 - u) * 0.9})`; circle(g2, x, y, 3 + hash(k) * 3); g2.fill(); }
      const Pr = poseIdle(t, 5); Pr.sh[0] = -1.0; Pr.el[0] = 0.5; Pr.lean = 0.2; drawPersonSide(g2, ROSA, 900, floorY, 5.0, -1, Pr, { t, expr: 'determined', keySwing: 0.6 });
    });
  }, [1000, 1950, 560, 1360, 300], { red: [[60, 400, 420]] });
  return { capY: 1720 };
}
// ================================================================== 5 — THE GATE SLAMS DOWN AGAIN
function e4scene5(g, t, lt) {
  const hit = EV.slam + 0.25, down = t < hit ? lerp(0.83, 1, easeIn(clamp((t - EV.slam) / 0.25))) : 1, b = t > hit ? Math.exp(-(t - hit) * 6) : 0;
  setCam(t, { x: 0, y: 60, z: 1.08, shake: 0.08 + b * 0.8 });
  flashlit(g, t, bg => gateDark(t, { down, gateShake: b, behind: g3 => drawAsh(g3, t, [UPV.arch.x, UPV.arch.y, UPV.arch.w, 700], 40, 1), front: g3 => {
    if (b > 0.05) for (let k = 0; k < 18; k++) { const x = UPV.arch.x + hash(k) * UPV.arch.w, y = UPV.arch.y - 20 + (1 - b) * 140 * hash(k + 1); g3.fillStyle = `rgba(200,190,180,${b * 0.7})`; circle(g3, x, y, 10 + (1 - b) * 30); g3.fill(); }
    youHugBiscuit(g3, t, 220, 1980, 5.4); } })(bg), darkCone, { keep: TOPKEEP, red: [[90, 760, 420]] });
  return { capY: 1300 };
}
// ================================================================== 6 — BISCUIT SNIFFS DANIEL'S HAND
function e4scene6(g, t, lt) {
  const walk = clamp(lt / 1.2), sniff = t > LINES[9].s;
  setCam(t, { x: 0, y: 0, z: 1.04 + lt * 0.02, shake: 0.05 });
  flashlit(g, t, bg => { tileWall(bg, 0, 0, W, 1400, 60); bg.fillStyle = MOSAIC; bg.fillRect(0, 520, W, 80); bg.fillStyle = '#7d786f'; bg.fillRect(0, 1400, W, H);
    layer(bg, 1, g2 => {
      const P = poseHelp(t); P.sh = [1.3, 0.6]; P.el = [0.2, 0.3]; P.expr = 'worried'; P.head = -0.2;
      drawPersonSide(g2, DANIEL, 800, 1820, 6.4, -1, P, { t });
      const wag = sniff && t > LINES[9].s + 0.6 && t < LINES[9].s + 1.4;
      drawDog(g2, lerp(80, 330, smooth(walk)), 1830, 5.6, 1, { mode: sniff ? 'sniff' : 'walk', ph: (t * 1.3) % 1, tail: wag ? 'wag' : 'low' }, t);
    }); }, [80, 1950, 540, 1500, 320], { red: [[1000, 500, 420]] });
  return { capY: 1250 };
}
// ================================================================== 7 — NO GROWL. NOT AT HIM.
function e4scene7(g, t, lt) {
  setCam(t, { x: 0, y: 0, z: 1.02 + lt * 0.03, shake: 0.04 });
  const glance = smooth(seg(t, LINES[10].s + 1.4, LINES[10].s + 1.9));
  flashlit(g, t, bg => { bg.fillStyle = '#1a1614'; bg.fillRect(0, 0, W, H); layer(bg, 1, g2 => drawDog(g2, 230, 2380, 17, 1, { mode: 'stand', tail: 'low', tilt: -0.1 * glance, look: glance }, t)); },
    [540, 1960, 640, 1100, 420], { red: [[60, 700, 500]] });
  return { capY: 1720 };
}
// ================================================================== 8 — "DANIEL. MY NAME IS DANIEL."
function e4scene8(g, t, lt) {
  const talk = (t >= LINES[11].s && t < LINES[11].s + 0.6) || (t >= LINES[11].s + 2.1 && t < LINES[11].e);
  setCam(t, { x: 0, y: 0, z: 1.0 + lt * 0.03, shake: 0.04 });
  flashlit(g, t, bg => { bg.fillStyle = '#16181e'; bg.fillRect(0, 0, W, H); layer(bg, 1, g2 => danielFace(g2, t, 540, 820, 300, { expr: talk ? 'talk' : 'worried', look: [-0.2, 0] })); },
    [540, 1980, 540, 820, 420], { red: [[1000, 400, 500]] });
  return { capY: 1300 };
}
// ================================================================== 9 — ROSA HANDS HIM THE BOTTLE. ONE SIP.
function e4scene9(g, t, lt) {
  const sip = t >= LINES[13].s;
  setCam(t, { x: 0, y: 0, z: 1.04, shake: 0.05 });
  flashlit(g, t, bg => { tileWall(bg, 0, 0, W, 1450, 60); bg.fillStyle = MOSAIC; bg.fillRect(0, 520, W, 80); bg.fillStyle = '#7d786f'; bg.fillRect(0, 1450, W, H);
    layer(bg, 1, g2 => {
      const PR = poseIdle(t, 5); PR.sh[0] = sip ? 0.4 : 1.3; PR.el[0] = 0.2;
      const r = drawPersonSide(g2, ROSA, 250, 1900, 6.4, 1, PR, { t, expr: 'worried', keySwing: 0.3 });
      const PD = poseIdle(t, 9); PD.sh[0] = sip ? -0.4 : 1.2; PD.el[0] = sip ? 2.6 : 0.3; PD.head = sip ? -0.3 : 0.05;
      const d = drawPersonSide(g2, DANIEL, 820, 1900, 6.6, -1, PD, { t, expr: 'worried' });
      const bx = sip ? d.hand[0] : lerp(r.hand[0], d.hand[0], 0.5), by = sip ? d.hand[1] : r.hand[1];
      g2.save(); g2.translate(bx, by); g2.rotate(sip ? -2.2 : -0.1); g2.fillStyle = 'rgba(160,210,255,0.8)'; rrect(g2, -18, -110, 36, 110, 10); g2.fill(); g2.fillStyle = '#2b6cb0'; g2.fillRect(-12, -126, 24, 18); g2.fillStyle = 'rgba(120,190,255,0.85)'; g2.fillRect(-16, -50, 32, 46); g2.restore();
    }); }, [540, 1980, 540, 1300, 380], { red: [[60, 500, 420]] });
  return { capY: 1250 };
}
// ================================================================== 10 — "SHE TOLD ME ONE MORE THING."
function e4scene10(g, t, lt) {
  const talk = t >= LINES[15].s && t < LINES[15].e;
  setCam(t, { x: 0, y: 0, z: 1.04 + lt * 0.02, shake: 0.04 });
  flashlit(g, t, bg => { tileWall(bg, 0, 0, W, 1450, 60); bg.fillStyle = '#7d786f'; bg.fillRect(0, 1450, W, H);
    layer(bg, 1, g2 => {
      const PY = poseIdle(t, 1); PY.sh[0] = 0.9; PY.el[0] = 1.6; PY.head = 0.05; drawPersonSide(g2, YOU, 250, 1980, 7.0, 1, PY, { t, expr: 'worried', phone: true });
      const PD = poseIdle(t, 9); PD.head = 0.1; drawPersonSide(g2, DANIEL, 820, 1980, 7.2, -1, PD, { t, expr: talk ? 'talk' : 'worried' });
    }); }, [400, 1450, 800, 1260, 320], { red: [[60, 500, 420]] });
  return { capY: 1290 };
}
// ================================================================== 11 — "SEVEN LETTERS. THEN THE DOOR OPENS."
function e4scene11(g, t, lt) {
  const talk = (t >= LINES[16].s && t < LINES[16].e) || (t >= LINES[17].s && t < LINES[17].e);
  setCam(t, { x: 0, y: 0, z: 1.0 + lt * 0.07, shake: 0.03 });
  flashlit(g, t, bg => { bg.fillStyle = '#16181e'; bg.fillRect(0, 0, W, H); layer(bg, 1, g2 => danielFace(g2, t, 540, 980, 330, { expr: talk ? 'talk' : 'wide', look: [0, 0] })); },
    [540, 1980, 540, 980, 440], {});
  drawSlots(g, t, EV.slots + 0.1, ['S', 'H', 'E'], -1);
  return { capY: 1720 };
}
// ================================================================== 12 — SEVEN LETTERS. THE DRAWING. THE LETTER E.
function e4scene12(g, t, lt) {
  const ins = t >= LINES[19].s;
  setCam(t, { x: 0, y: 0, z: 1.02 + lt * 0.02, shake: 0.03 });
  if (!ins) { g.fillStyle = '#0c0d12'; g.fillRect(0, 0, W, H); drawSlots(g, t, SC(12).start - 0.4, ['S', 'H', 'E'], -1);
    g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = radgrad(g, 540, 450, 0, 600, [[0, 'rgba(255,211,107,0.18)'], [1, 'rgba(255,211,107,0)']]); g.fillRect(0, 0, W, H); g.restore(); return { capY: 1300 }; }
  g.fillStyle = '#0c0c10'; g.fillRect(0, 0, W, H);
  layer(g, 1, g2 => drawingPaper(g2, t, 1, 0, 0));
  g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = radgrad(g, 700, 1300, 150, 1100, [[0, '#ffffff'], [1, '#18181e']]); g.fillRect(0, 0, W, H); g.restore();
  if (t >= LINES[20].s) { g.save(); g.strokeStyle = '#ffd36b'; g.lineWidth = 8; g.globalAlpha = 0.6 + 0.4 * Math.sin(t * 8); circle(g, 700, 1310, 175); g.stroke(); g.restore(); }
  return { capY: 1700 };
}
// ================================================================== 13 — SURVIVAL RULE #4
function e4scene13(g, t, lt) {
  setCam(t, { x: 0, y: 0, z: 1.05, shake: 0.04 });
  flashlit(g, t, bg => stationRed(bg, t, { near: g3 => youHugBiscuit(g3, t, 300, 1880, 6.4) }), null, {});
  blurFrame(g, 6);
  g.save(); g.fillStyle = 'rgba(10,14,30,0.4)'; g.fillRect(0, 0, W, H); g.restore();
  return { capY: 1300 };
}
// ================================================================== 14 — ROSA UNLOCKS THE TICKET BOOTH
function e4scene14(g, t, lt) {
  const open = smooth(seg(lt, 0.9, 1.8)), sweep = Math.sin(lt * 1.6) * 160;
  setCam(t, { x: 0, y: 0, z: 1.03, shake: 0.05 });
  flashlit(g, t, bg => { layer(bg, 1, g2 => { smallBooth(g2, t, open); const P = poseIdle(t, 5); P.sh[0] = -0.6; P.el[0] = 1.0; drawPersonSide(g2, ROSA, 560, 1700, 6.2, 1, P, { t, expr: 'determined', keySwing: 1.4 }); }); },
    [300, 1960, 760 + sweep, 1060, 300], { red: [[60, 300, 420]] });
  return { capY: 1250 };
}
// ================================================================== 15 — WATER. CRACKERS. SEALED.
function e4scene15(g, t, lt) {
  setCam(t, { x: 0, y: 0, z: 1.08 - lt * 0.01, shake: 0.04 });
  flashlit(g, t, bg => layer(bg, 1, g2 => supplyShelf(g2, t)), [540, 1980, lerp(380, 800, smooth(seg(t, EV.crackers - 0.3, EV.crackers + 0.3))), 1000, 340], { red: [[1000, 300, 420]] });
  return { capY: 1500 };
}
// ================================================================== 16 — FOR THE FIRST TIME TODAY… PEOPLE SMILE.
function e4scene16(g, t, lt) {
  setCam(t, { x: lerp(-20, 30, lt / 3.7), y: 0, z: 1.06, shake: 0.04 });
  flashlit(g, t, bg => stationRed(bg, t, { expr: 'smile', near: g3 => {
    youHugBiscuit(g3, t, 300, 1880, 6.4);
    g3.fillStyle = '#e9b44c'; circle(g3, 560, 1760, 16); g3.fill();                                      // a cracker for Biscuit
    const P = poseIdle(t, 5); P.sh[0] = 0.9; P.el[0] = 1.4; drawPersonSide(g3, ROSA, 880, 1800, 5.8, -1, P, { t, expr: 'smile', keySwing: 0.3 });
  } }), [540, 1980, 560, 1250, 460], { ambient: '#c09aa4' });
  return { capY: 1290 };
}
// ================================================================== 17 — THE LOST AND FOUND BOX
function e4scene17(g, t, lt) {
  setCam(t, { x: 0, y: 0, z: 1.02 + lt * 0.03, shake: 0.04 });
  flashlit(g, t, bg => layer(bg, 1, g2 => lostFoundBox(g2, t, smooth(seg(lt, 0.8, 2.2)))), [540, 1980, 540, 1150, 360], { red: [[60, 300, 420]] });
  return { capY: 1720 };
}
// ================================================================== 18 — A LITTLE YELLOW RAINCOAT. DRY. CLEAN.
function e4scene18(g, t, lt) {
  setCam(t, { x: 0, y: 0, z: 1.0 + lt * 0.025, shake: 0.03 });
  flashlit(g, t, bg => layer(bg, 1, g2 => { g2.fillStyle = '#6f5436'; g2.fillRect(-200, -200, W + 400, H + 400);
    for (let k = 0; k < 400; k++) { g2.fillStyle = `rgba(190,180,165,${0.3 + hash(k) * 0.4})`; circle(g2, hash(k * 1.7) * W, hash(k * 2.3) * H, 2 + hash(k) * 3); g2.fill(); }      // dust everywhere…
    raincoat(g2, t, 540, 980, 1.05, false); }), [540, 1980, 540, 960, 420], {});                      // …but not on the coat
  return { capY: 1720 };
}
// ================================================================== 19 — PINNED TO THE HOOD, A GOLD LETTER. L.
function e4scene19(g, t, lt) {
  setCam(t, { x: 0, y: lerp(0, -260, smooth(clamp(lt / 1.6))), z: lerp(1.05, 1.9, smooth(clamp(lt / 1.6))), shake: 0.03 });
  flashlit(g, t, bg => layer(bg, 1, g2 => { g2.fillStyle = '#6f5436'; g2.fillRect(-200, -200, W + 400, H + 400); raincoat(g2, t, 540, 980, 1.05, true); }), [540, 1980, 540, 610, 300], {});
  drawCodeChip(g, t, 540, 560, EV.letterL - 0.05);
  return { capY: 1720 };
}
// ================================================================== 20 — THE RAILS START TO HUM
function e4scene20(g, t, lt) {
  const hum = smooth(clamp(lt / 0.8));
  setCam(t, { x: 0, y: 0, z: 1.02, shake: 0.06 + hum * 0.12 });
  flashlit(g, t, bg => layer(bg, 1, g2 => railsSet(g2, t, hum)), [540, 1980, 520, 1100, 260], { red: [[520, 640, 220]], redAmt: 0.6 + 0.4 * Math.sin(t * 30) * hum });
  return { capY: 1300 };
}
// ================================================================== 21 — SOMETHING IS COMING DOWN THE TUNNEL
function e4scene21(g, t, lt) {
  const tc = tunnelView(g, t, lerp(1.8, 2.6, clamp(lt / 2.6)), k => k === ST.emerg.length - 1 ? redP(t) : 0);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = 'rgba(2,2,4,0.55)'; g.fillRect(0, 0, W, H); g.restore();
  const grow = clamp(lt / 2.6);
  layer(g, 1, g2 => { glow(g2, tc[0], tc[1] + 40, 40 + grow * 160, '#fff1c8', 0.35 + grow * 0.5); g2.fillStyle = `rgba(255,248,220,${0.4 + grow * 0.5})`; circle(g2, tc[0], tc[1] + 40, 4 + grow * 10); g2.fill(); });
  // Biscuit barking in the foreground (silhouette)
  setCam(t, { x: 0, y: 0, z: 1, shake: 0.06 });
  layer(g, 1, g2 => { g2.save(); g2.globalAlpha = 0.95; drawDog(g2, 760, 2060, 8, -1, { mode: 'stand', tail: 'low', bark: true, earsUp: true }, t); g2.restore(); });
  g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = lingrad(g, 0, 1300, 0, H, [[0, '#ffffff'], [1, '#3a2228']]); g.fillRect(0, 0, W, H); g.restore();
  return { capY: 1250 };
}
// ================================================================== 22 — CHOICE
function e4scene22(g, t, lt) {
  blurDraw(g, 6, bg => { const tc = tunnelView(bg, t, 1.7, k => k === ST.emerg.length - 1 ? redP(t) : 0); bg.save(); bg.setTransform(1 / 6, 0, 0, 1 / 6, 0, 0); bg.fillStyle = 'rgba(2,2,4,0.6)'; bg.fillRect(0, 0, W, H); bg.restore();
    layer(bg, 1, b => glow(b, tc[0], tc[1] + 40, 220, '#fff1c8', 0.8)); });
  const dark = seg(t, EV.ep2 - 0.4, EV.ep2 + 0.4);
  g.save(); g.fillStyle = `rgba(6,8,14,${0.3 + 0.45 * dark})`; g.fillRect(0, 0, W, H); g.restore();
  return { capY: 1700, choice: true };
}
const SCENE_LIST = [e4scene1, e4scene2, e4scene3, e4scene4, e4scene5, e4scene6, e4scene7, e4scene8, e4scene9, e4scene10, e4scene11,
  e4scene12, e4scene13, e4scene14, e4scene15, e4scene16, e4scene17, e4scene18, e4scene19, e4scene20, e4scene21, e4scene22];
