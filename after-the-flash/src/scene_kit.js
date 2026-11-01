// ============================================================================
// scene_kit.js — scene helpers shared by every episode (gate view, underground
// red emergency lighting, people sheltering in the station, the man & the girl).
// RED_T0 = time the red emergency lights came on (phase of the 1.2 s pulse).
// ============================================================================
function gateView(g, t, o = {}) {
  // station side of the stairwell: tiles + arch + stairs (cached) + live elements
  const A = UPV.arch;
  g.drawImage(UPV.c, 0, 0);
  drawTopOpening(g, t, o.sky || 'day', o.flash || 0);
  if (o.sky === 'ash') drawAsh(g, t, [UPV.top.x - 40, UPV.top.y - 60, UPV.top.w + 80, A.y + A.h - UPV.top.y], 160, 1);
  if (o.behind) o.behind(g);
  let plate = null;
  drawGate(g, A.x, A.y, A.w, A.h, o.down == null ? 1 : o.down, t, { shake: o.gateShake || 0, plateAt: (x, y) => { plate = [x, y]; } });
  if (o.front) o.front(g);
  return plate;
}

function redLight(g, t, base = 1) {
  // underground grade: darken to blue-grey, pulse red emergency light every 1.2 s
  const p = 0.65 + 0.35 * Math.pow(pulse(t - RED_T0, 1.2), 2);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'multiply'; g.fillStyle = mix('#7d879e', '#b8676a', clamp(0.55 * p * base)); g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(255,59,48,${0.10 * p * base})`; g.fillRect(0, 0, W, H);
  g.restore();
  return p;
}


const ST_PEOPLE = [
  [300, 520, 0], [380, 760, 1], [200, 980, 2], [360, 1200, 3], [120, 1450, 4], [330, 1700, 5], [250, 2000, 6], [380, 2350, 7],
  [60, 640, 8], [-40, 1100, 9], [370, 600, 10], [150, 1800, 11], [340, 2700, 12], [-60, 2200, 13], [260, 3100, 14],
];

function people(g, t, mode, opts = {}) {
  ST_PEOPLE.slice().sort((a, b) => b[1] - a[1]).forEach(([X, Z, k]) => {
    const p = P3(X, 170, Z), s = 1.75 * ST.f / Z, C = CROWD[(k * 6 + 1) % 90], dir = X > 200 ? -1 : 1;
    if (mode === 'stand') drawCrowdSide(g, C, p[0], p[1], s, dir, 'idle', t);
    else if (mode === 'crouch') drawCrowdSide(g, C, p[0], p[1], s, dir, 'crouch', t);
    else if (mode === 'sit') { const P = poseSit(t, k); if (opts.turn) { P.head = -0.1; P.turn = 0; } drawPersonSide(g, C, p[0], p[1], s, opts.turn ? 1 : dir, P, { t }); }
  });
}

function emergencyOn(t) {
  const t0 = RED_T0;
  if (t < t0) return 0;
  const lt = t - t0; const fl = [[0, 0.12], [0.35, 0.45], [0.65, 0.75]];
  if (lt < 0.95) return fl.some(([a, b]) => lt >= a && lt < b) ? 1 : 0;
  return 1;
}

function stationRed(g, t, o = {}) {
  const on = emergencyOn(t);
  layer(g, 1, g => {
    g.drawImage(ST.c, 0, 0);
    drawCracks(g, 1);
    people(g, t, 'sit', o);
    if (o.extra) o.extra(g);
    if (o.near) o.near(g);
  });
  // darkness + red emergency light
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'multiply'; g.fillStyle = on ? '#9a5a62' : '#0a0b10'; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'multiply'; g.fillStyle = on ? '#b7c0d6' : '#0a0b10'; g.fillRect(0, 0, W, H);
  g.restore();
  const p = 0.6 + 0.4 * Math.pow(pulse(t - RED_T0, 1.2), 2);
  layer(g, 1, g => {
    if (on) drawStationLights(g, t, 'red', p);
    if (on) drawMotes(g, t, 200, 300, 800, 1300, 70, '255,140,120', 0.5);
  });
  if (o.nearGlow) layer(g, 1, o.nearGlow);
  return on;
}

function youHugBiscuit(g, t, x, y, s) {
  const P = poseSit(t, 2); P.sh[0] = 1.3; P.el[0] = 0.9; P.sh[1] = 1.2; P.el[1] = 1.0; P.head = 0.35; P.lean = 0.45;
  drawDog(g, x + 40 * s / 6, y + 4, s * 0.78, 1, { mode: 'lie', tail: 'tuck', earsBack: true }, t);
  drawPersonSide(g, YOU, x, y, s, 1, P, { t, expr: 'fear' });
}

function manAndGirl(g, t, x, y, s, o = {}) {
  // the man in a torn suit, coughing, holding the little girl on his left arm
  const cough = o.cough ? Math.max(0, Math.sin(t * 9)) * (Math.sin(t * 1.3) > 0.2 ? 1 : 0) : 0;
  const P = poseFrontIdle(t, 9); P.bob += cough * 1.5; P.head = cough * 0.3; P.elL = 2.2; P.armL = 0.15;
  if (o.grip) { P.armL = -1.0; P.elL = 0.6; P.armR = -1.0; P.elR = 0.6; }
  const m = drawPersonFront(g, MAN, x, y, s, P, { t, expr: o.expr || (cough > 0.3 ? 'scream' : 'worried'), look: o.look });
  // girl on his arm (or standing beside him when he grips the bars)
  const gs = o.grip ? s : s * 0.78, gx = o.grip ? x - 30 * s : x - 26 * s, gy = o.grip ? y : y - 30 * s;
  const GP = poseFrontIdle(t, 3); GP.armL = 0.25; GP.elL = 0.4; GP.armR = 0.2; GP.head = o.tilt || 0; GP.tilt = o.tilt || 0; GP.look = o.girlLook || [0, 0];
  drawPersonFront(g, GIRL, gx, gy, gs, GP, { t, noBlink: o.noBlink, rabbitSwing: o.rabbitSwing || 0 });
  if (!o.grip) { g.fillStyle = MAN.top; rrect(g, gx - 6 * s, gy - 22 * s, 30 * s, 8 * s, 4 * s); g.fill(); g.fillStyle = MAN.skin; circle(g, gx - 6 * s, gy - 18 * s, 3.4 * s); g.fill(); }
  // ash settled on shoulders
  g.fillStyle = 'rgba(200,196,190,0.75)'; for (let k = 0; k < 16; k++) { circle(g, x + (hash(k) - 0.5) * 22 * s, y - 78 * s + hash(k + 1) * 3 * s, 1.2 * s); g.fill(); }
  return m;
}

function gateRed(g, t, o = {}) {
  layer(g, 1, g => gateView(g, t, { down: 1, sky: 'ash', gateShake: o.shake || 0, behind: o.behind, front: o.front }));
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'multiply';
  g.fillStyle = lingrad(g, 0, 0, 0, H, [[0, '#c8c2bc'], [0.35, '#a88a8c'], [0.7, '#7a4a52'], [1, '#4a2830']]); g.fillRect(0, 0, W, H); g.restore();
  const p = pulse(t - RED_T0, 1.2);
  layer(g, 1, g => { glow(g, 100, 1000, 420, '#ff3b30', 0.3 + 0.2 * p); glow(g, 980, 1000, 420, '#ff3b30', 0.3 + 0.2 * p); drawAsh(g, t, [UPV.top.x - 60, UPV.top.y - 60, UPV.top.w + 120, 1100], 70, 0.8); if (o.over) o.over(g); });
}
