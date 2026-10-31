// ============================================================================
// scenes_street.js — Scenes 1–17 (street level). Each scene draws a full frame
// as a pure function of t. lt = time since scene start.
// ============================================================================
const SC = n => SCENES_T[n - 1];
const WIDE = { gy: GROUND_FAR, roadTop: 1268, roadBot: 1650, lanes: [1352, 1448, 1548, 1650], ls: [0.8, 0.86, 0.93, 1.0] };
const wrapv = (x, a, b) => a + ((((x - a) % (b - a)) + (b - a)) % (b - a));

// ---------------------------------------------------------------- shared wide-street layers
function wideBack(g, t, o = {}) {
  layer(g, 0.02, g => drawSky(g, t, { hz: 1000 }));
  layer(g, 0.12, g => drawFar(g, t, -980, 60, 1.0));
  layer(g, 0.4, g => drawTowers(g, t, WIDE.gy - 40, { alert: o.alert }));
  layer(g, 0.9, g => {
    drawStrip(g, t, 0, WIDE.gy, 1, { alert: o.alert, panic: o.panic, revFast: o.revFast });
    drawSidewalk(g, -900, 5600, WIDE.gy, WIDE.roadTop - 14, { slab: 120, rows: 1 });
    drawCurb(g, -900, 5600, WIDE.roadTop - 14, 16);
    // far sidewalk props
    drawTree(g, 520, WIDE.gy + 30, 0.7, t); drawTree(g, 2250, WIDE.gy + 30, 0.7, t); drawTree(g, 3600, WIDE.gy + 30, 0.7, t);
    drawLampPost(g, 900, WIDE.gy + 60, 0.62); drawLampPost(g, 2850, WIDE.gy + 60, 0.62);
    drawNewsBox(g, 1290, WIDE.gy + 50, 0.9); drawTrashCan(g, 1700, WIDE.gy + 55, 0.85);
    drawBikeRack(g, 3150, WIDE.gy + 58, 0.9); drawMeter(g, 2560, WIDE.gy + 62, 0.85);
    drawSubwayEntrance(g, 330, WIDE.gy + 66, 0.62, t, { signOn: o.signOn || 0.25 });
    if (o.farExtra) o.farExtra(g);
  });
}
function wideRoad(g, t, o = {}) {
  layer(g, 1, g => {
    drawRoad(g, -900, 5600, WIDE.roadTop, WIDE.roadBot, t, { cross: [2050, 240], manhole: [1500, 1500] });
    drawVent(g, 1500, 1500);
    if (o.lanesFar) o.lanesFar(g);
    if (o.mid) o.mid(g);
    if (o.lanesNear) o.lanesNear(g);
  });
}
function wideNear(g, t, o = {}) {
  layer(g, 1.08, g => {
    drawCurb(g, -900, 5600, WIDE.roadBot, 20);
    drawSidewalk(g, -900, 5600, WIDE.roadBot + 20, 2100, { slab: 170, rows: 2 });
    drawHydrant(g, 760, 1760, 1.3); drawTrafficLight(g, 1820, 1740, 1.25, o.light || 'g', o.ped || 'dont', t);
    drawTrashCan(g, 2600, 1770, 1.2); drawMeter(g, 3000, 1760, 1.2); drawSign(g, 330, 1760, 1.2, 'HARBOR ST');
    drawFoodCart(g, 1240, 1780, 1.15, t, { tf: o.tf });
    if (o.near) o.near(g);
  });
}
function lanesFor(set) {
  // four lanes of traffic, 22+ vehicles, deterministic
  const types = ['taxi', 'sedan', 'suv', 'taxi', 'van', 'sedan', 'taxi', 'moto', 'sedan', 'suv', 'taxi', 'sedan'];
  return WIDE.lanes.map((y, li) => {
    const dir = li < 2 ? -1 : 1, s = WIDE.ls[li], cars = [];
    for (let k = 0; k < 7; k++) cars.push({ v: mkVehicle(types[(k * 3 + li * 5) % types.length], li * 10 + k + set * 100), x0: -1200 + k * 760 + li * 190 });
    return { y, dir, s, speed: 230 + li * 25, cars, wrap: [-1400, 4200] };
  });
}
const LANES_A = lanesFor(0);
// far-sidewalk and near-sidewalk walkers
function walkerX(i, t, range, sp = 1) {
  const dir = hash(i * 1.7) > 0.5 ? 1 : -1, v = (75 + hash(i * 2.3) * 45) * sp * dir;
  return { x: wrapv(range[0] + hash(i * 3.1) * (range[1] - range[0]) + v * t, range[0], range[1]), dir };
}
// behaviour-aware crowd member on a sidewalk band
function crowdMember(g, i, t, y, s, range, phase) {
  const C = CROWD[i];
  const tb = EV.buzz;
  const stopT = phase === 'normal' ? 1e9 : tb + hash(i) * 0.4;
  let { x, dir } = walkerX(i, Math.min(t, stopT), range);
  const alert = t >= tb ? 1 : 0;
  if (phase === 'normal' || t < stopT) { drawCrowdSide(g, C, x, y, s, dir, (hash(i * 5) < 0.18) ? 'phone' : 'walk', t, { alert: 0 }); return; }
  if (phase === 'alert' || phase === 'frozen') {
    const P = blendPose(poseWalk((stopT + (C.seed || 0)) % 1), posePhone(t, C.seed), seg(t, stopT, stopT + 0.5));
    drawPersonSide(g, C, x, y, s, dir, P, { t, alert, phone: true, red: 0.5 * alert });
  }
}

// ================================================================== SCENE 1 — ESTABLISHING
function scene1(g, t, lt) {
  const u = easeInOut(clamp(lt / 3.4));
  setCam(t, { x: 120 + u * 60, y: lerp(-2300, 0, u), z: lerp(0.86, 1, u), fz: 0.4 });
  layer(g, 0.02, g => drawSky(g, t, { hz: 1000, sunX: 860, sunY: 600 }));
  layer(g, 0.12, g => drawFar(g, t, -980, 60, 1.0));
  layer(g, 0.4, g => drawTowers(g, t, WIDE.gy - 40));
  // street level (revealed at the end of the crane move)
  layer(g, 0.9, g => { drawStrip(g, t, 0, WIDE.gy, 1); drawSidewalk(g, -900, 5600, WIDE.gy, WIDE.roadTop - 14, { slab: 120, rows: 1 }); drawCurb(g, -900, 5600, WIDE.roadTop - 14, 16);
    for (let i = 0; i < 14; i++) { const { x, dir } = walkerX(i, t, [-400, 3400]); drawCrowdSide(g, CROWD[i], x, WIDE.gy + 66, 1.7, dir, 'walk', t); } });
  wideRoad(g, t, { lanesFar: g => { drawLane(g, LANES_A[0], t); drawLane(g, LANES_A[1], t); }, lanesNear: g => { drawLane(g, LANES_A[2], t); drawLane(g, LANES_A[3], t); } });
  wideNear(g, t, { near: g => { for (let i = 18; i < 26; i++) { const { x, dir } = walkerX(i, t, [-400, 3400]); drawCrowdSide(g, CROWD[i], x, 1840, 2.5, dir, 'walk', t); } } });
  // two huge glass towers framing the crane descent (foreground, slide up past camera)
  layer(g, 0.7, g => {
    [[-260, 520, 1], [900, 520, -1]].forEach(([x, w, side]) => {
      const top = -4200, bot = 900;
      g.fillStyle = lingrad(g, x, 0, x + w, 0, side > 0 ? [[0, '#2d4a70'], [0.7, '#5f88b8'], [1, '#ffcf9a']] : [[0, '#ffcf9a'], [0.25, '#6f98c8'], [1, '#2d4a70']]);
      g.fillRect(x, top, w, bot - top);
      g.strokeStyle = 'rgba(20,35,55,0.6)'; g.lineWidth = 3; for (let yy = top; yy < bot; yy += 44) line(g, x, yy, x + w, yy);
      g.lineWidth = 2; for (let xx = x; xx < x + w; xx += 36) line(g, xx, top, xx, bot);
      // reflections of the opposite tower + sky
      g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(x + w * 0.1, top, w * 0.2, bot - top);
      // sun flare streak on the glass (moves with the crane)
      g.save(); g.globalCompositeOperation = 'lighter';
      const fy = lerp(-1800, 400, u);
      g.fillStyle = radgrad(g, x + (side > 0 ? w * 0.85 : w * 0.15), fy, 0, 380, [[0, 'rgba(255,230,180,0.75)'], [1, 'rgba(255,200,140,0)']]); g.fillRect(x - 200, fy - 400, w + 400, 800);
      g.restore();
    });
  });
  // lens flare
  const fx = 860 - CAM.x * 0.02, fy = 600 - CAM.y * 0.02;
  if (fy > -200) { g.save(); g.globalCompositeOperation = 'lighter'; [[0.3, 60, '255,200,140'], [0.55, 30, '160,220,255'], [0.8, 90, '255,170,120'], [1.15, 40, '255,240,200']].forEach(([k, r, c]) => { const px = fx + (W / 2 - fx) * k * 2, py = fy + (H / 2 - fy) * k * 2; g.fillStyle = radgrad(g, px, py, 0, r, [[0, `rgba(${c},0.25)`], [1, `rgba(${c},0)`]]); g.fillRect(px - r, py - r, r * 2, r * 2); }); g.restore(); }
  return { capY: 1330 };
}

// ================================================================== SCENE 2 — YOU AND BISCUIT (tracking shot + inserts)
const S2 = { gy: 1790, s: 5.0, speed: 150 };
function youWalkX(t) { return 200 + (t - SC(2).start) * S2.speed; }
function scene2Track(g, t, lt) {
  const yx = youWalkX(t);
  setCam(t, { x: yx - 380, y: 0, z: 1, shake: 0.12 });
  layer(g, 0.05, g => drawSky(g, t, { hz: 700, birds: false }));
  layer(g, 0.25, g => { g.save(); g.translate(0, -620); g.scale(1.1, 1.1); drawTowers(g, t, 800); g.restore(); });
  // storefronts (close, slightly soft)
  blurDraw(g, 2, bg => layer(bg, 0.7, g2 => {
    drawStrip(g2, t, 300, 1640, 2.5);
    drawSidewalk(g2, -2000, 9000, 1640, 1700, { slab: 300, rows: 1 });
  }));
  // passers-by between you and the shops
  layer(g, 0.85, g => { for (let i = 26; i < 32; i++) { const x = wrapv(400 + i * 520 - (t * (hash(i) > 0.5 ? 90 : -90)), -600, 4200); drawCrowdSide(g, CROWD[i], x, 1700, 3.9, hash(i) > 0.5 ? -1 : 1, 'walk', t); } });
  // sidewalk
  layer(g, 1, g => {
    drawSidewalk(g, -2000, 9000, 1690, 2000, { slab: 300, rows: 2 });
    drawHydrant(g, 1460, S2.gy + 10, 2.6);
    drawTrashCan(g, 2300, S2.gy + 20, 2.4);
    drawPigeonFlock(g, 2000, S2.gy + 40, t, null, 4, 2.2, 3);
    // Biscuit trots ahead, sniffs the hydrant
    const dx = yx + 300, hyd = 1460 - 220;
    let bx = dx, mode = 'trot', ph = (t * 2.2) % 1;
    const sniffT0 = SC(2).start + 2.45, sniffT1 = sniffT0 + 0.9;
    if (t > sniffT0 - 0.2 && t < sniffT1) { bx = Math.min(dx, hyd); if (dx >= hyd) mode = 'sniff'; }
    const bark = false;
    const dog = drawDog(g, bx, S2.gy + 8, 4.0, 1, { mode, ph, tail: 'wag', pant: mode !== 'sniff' }, t);
    // YOU walking with coffee + leash
    const P = poseWalk((t * 1.25) % 1, 0.9);
    P.sh[0] = 0.55; P.el[0] = 1.75;           // coffee arm (near, right hand) raised
    const sip = seg(lt, 1.0, 1.3) * (1 - seg(lt, 1.5, 1.8));
    P.sh[0] = lerp(0.55, 0.3, sip); P.el[0] = lerp(1.75, 2.5, sip); P.head = -0.08 * sip;
    P.sh[1] = 0.35; P.el[1] = 0.35;           // leash arm (far, left hand) forward
    const me = drawPersonSide(g, YOU, yx, S2.gy, S2.s, 1, P, { t, coffee: true, expr: 'smile' });
    drawLeash(g, me.fhand, dog.collar, 30, 1.6);
  });
  // foreground: lamp post + cyclist whip by close to camera, blurred
  blurDraw(g, 5, bg => layer(bg, 1.5, g2 => {
    drawLampPost(g2, 1700, 2350, 3.2);
    const cx = wrapv(-400 + (t - SC(2).start) * 1500, -800, 9000);
    if (t < SC(2).start + 1.8) drawCyclist(g2, CAM.x * 1.5 + 1400 - (t - SC(2).start) * 1800, 2240, 4.5, -1, t, 7);
    // car roofs passing in the foreground (street side)
    const rx = CAM.x * 1.5 + 2200 - ((t * 900) % 3200);
    g2.fillStyle = '#f5c518'; rrect(g2, rx, 1990, 900, 200, 60); g2.fill(); g2.fillStyle = '#24303f'; rrect(g2, rx + 150, 1960, 500, 60, 30); g2.fill();
  }), 0.95);
  return { capY: 1290 };
}
function scene2Cup(g, t, lt) {
  setCam(t, { x: 0, y: 0, z: 1 + lt * 0.05, shake: 0.1 });
  // warm bokeh street background
  g.fillStyle = lingrad(g, 0, 0, 0, H, [[0, '#9ec9f0'], [0.5, '#f2c9a0'], [1, '#6b5a4a']]); g.fillRect(0, 0, W, H);
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 26; k++) { const x = hash(k) * W + Math.sin(t + k) * 20 - lt * 120, y = 300 + hash(k + 3) * 1300, r = 60 + hash(k + 5) * 110; g.fillStyle = radgrad(g, x, y, 0, r, [[0, `rgba(255,${190 + (k % 3) * 20},140,0.35)`], [1, 'rgba(255,200,140,0)']]); g.fillRect(x - r, y - r, r * 2, r * 2); }
  g.restore();
  layer(g, 1, g => {
    // hand + cuff holding the cup
    const cx = 560, cy = 1080 + Math.sin(t * 4) * 6;
    g.fillStyle = YOU.cuff; rrect(g, 120, cy + 120, 460, 260, 60); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 4; for (let k = 140; k < 560; k += 18) line(g, k, cy + 130, k, cy + 370);
    drawCoffeeCup(g, cx, cy + 120, 22, t, 1, 0);
    g.fillStyle = YOU.skin; ellipse(g, cx - 40, cy + 170, 150, 110); g.fill();
    g.fillStyle = shade(YOU.skin, -0.08); for (let k = 0; k < 4; k++) { rrect(g, cx - 10, cy + 30 + k * 60, 170, 58, 29); g.fill(); }
    g.fillStyle = 'rgba(255,220,170,0.35)'; for (let k = 0; k < 4; k++) { rrect(g, cx + 90, cy + 38 + k * 60, 60, 20, 10); g.fill(); }
    // steam curling up
    g.save(); g.lineCap = 'round';
    for (let k = 0; k < 4; k++) { g.beginPath(); for (let i = 0; i <= 30; i++) { const u = i / 30, px = cx - 60 + k * 40 + Math.sin(u * 7 + t * 2.5 + k) * 40 * u, py = cy - 300 - u * 700; i ? g.lineTo(px, py) : g.moveTo(px, py); }
      g.strokeStyle = `rgba(255,255,255,${0.35 - k * 0.05})`; g.lineWidth = 26 - k * 4; g.stroke(); }
    g.restore();
  });
  return { capY: 1520 };
}
function scene2Leash(g, t, lt) {
  setCam(t, { x: 0, y: 0, z: 1.02 + lt * 0.04, shake: 0.14 });
  g.fillStyle = lingrad(g, 0, 0, 0, H, [[0, '#bcd6ee'], [0.6, '#d8c3a6'], [1, '#8f8478']]); g.fillRect(0, 0, W, H);
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 18; k++) { const x = hash(k + 40) * W - lt * 200, y = 200 + hash(k + 43) * 1500, r = 80 + hash(k + 45) * 120; g.fillStyle = radgrad(g, x, y, 0, r, [[0, 'rgba(255,230,190,0.3)'], [1, 'rgba(255,230,190,0)']]); g.fillRect(x - r, y - r, r * 2, r * 2); }
  g.restore();
  layer(g, 1, g => {
    const bob = Math.sin(t * 8) * 10;
    // red leash from hand down to the collar
    g.strokeStyle = '#c1121f'; g.lineWidth = 34; g.lineCap = 'round'; g.beginPath(); g.moveTo(520, 700 + bob); g.quadraticCurveTo(640, 1200, 760 + Math.sin(t * 7) * 20, 1700); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 8; g.stroke();
    // loop around the hand
    g.strokeStyle = '#a50e1a'; g.lineWidth = 30; g.beginPath(); g.ellipse(470, 640 + bob, 120, 60, -0.3, 0, TAU); g.stroke();
    // hand gripping
    g.fillStyle = YOU.cuff; rrect(g, -60, 420 + bob, 420, 300, 70); g.fill();
    g.fillStyle = YOU.skin; ellipse(g, 430, 600 + bob, 170, 130, -0.3); g.fill();
    g.fillStyle = shade(YOU.skin, -0.1); for (let k = 0; k < 4; k++) { rrect(g, 420 + k * 10, 520 + k * 62 + bob, 190, 60, 30); g.fill(); }
    g.fillStyle = shade(YOU.skin, 0.12); ellipse(g, 360, 540 + bob, 70, 40, -0.6); g.fill();
    // Biscuit's collar + jingling tag at the bottom
    const cx = 760 + Math.sin(t * 7) * 20, cy = 1720;
    g.fillStyle = DOG.coat; ellipse(g, cx, cy + 260, 420, 300); g.fill();
    g.fillStyle = DOG.light; for (let k = 0; k < 20; k++) { ellipse(g, cx - 380 + k * 40, cy + 0 + Math.sin(k) * 10, 30, 22, 0.4); g.fill(); }
    g.fillStyle = DOG.collar; rrect(g, cx - 330, cy - 40, 660, 80, 40); g.fill();
    g.fillStyle = '#c0c6ce'; g.fillRect(cx - 18, cy - 40, 36, 80);
    const sw = Math.sin(t * 16) * 0.6;
    g.save(); g.translate(cx, cy + 40); g.rotate(sw);
    g.fillStyle = lingrad(g, -70, 0, 70, 0, [[0, '#8f979f'], [0.5, '#ffffff'], [1, '#9aa2aa']]); circle(g, 0, 110, 70); g.fill(); g.strokeStyle = '#6b7178'; g.lineWidth = 5; g.stroke();
    g.fillStyle = '#5a6068'; g.font = `800 34px ${F_UI}`; g.textAlign = 'center'; g.fillText('BISCUIT', 0, 122); g.restore();
    // jingle lines
    g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 7; g.lineCap = 'round';
    for (let k = 0; k < 3; k++) { const a = -0.6 + k * 0.6 + sw; line(g, cx + Math.cos(a) * 200, cy + 150 + Math.sin(a) * 120, cx + Math.cos(a) * 250, cy + 150 + Math.sin(a) * 150); }
  });
  return { capY: 1280 };
}
function scene2(g, t, lt) {
  if (t >= EV.coffee && t < EV.coffee + 0.8) return scene2Cup(g, t, t - EV.coffee);
  if (t >= EV.leash && t < EV.leash + 1.0) return scene2Leash(g, t, t - EV.leash);
  return scene2Track(g, t, lt);
}

// ================================================================== SCENE 3 — NORMAL MORNING (wide from the corner)
const LANES_S3 = WIDE.lanes.map((y, li) => {
  const dir = li < 2 ? -1 : 1, s = WIDE.ls[li], types = ['taxi', 'sedan', 'bus', 'taxi', 'suv', 'van', 'taxi', 'sedan', 'moto', 'taxi', 'suv', 'sedan'];
  const cars = []; for (let k = 0; k < 8; k++) cars.push({ v: mkVehicle(li === 1 && k === 2 ? 'bus' : types[(k * 5 + li * 3) % types.length], 300 + li * 10 + k), x0: -2600 + k * 820 + li * 230 });
  return { y, dir, s, speed: 260 + li * 20, cars, wrap: [-2800, 4400] };
});
function scene3(g, t, lt) {
  const walk = t > SC(3).start + 3.1;
  setCam(t, { x: 1000 + lt * 40, y: 30, z: 1.02, shake: 0.07 });
  wideBack(g, t);
  // far sidewalk walkers
  layer(g, 0.9, g => { for (let i = 0; i < 18; i++) { const { x, dir } = walkerX(i, t, [-400, 3600]); drawCrowdSide(g, CROWD[i], x, WIDE.gy + 66, 1.75, dir, hash(i * 5) < 0.15 ? 'phone' : 'walk', t); } });
  const honkT = SC(3).start + 0.15;
  wideRoad(g, t, {
    lanesFar: g => { drawLane(g, LANES_S3[0], t); drawLane(g, LANES_S3[1], t); },
    mid: g => {
      // businessman jaywalking across the far lanes
      const ju = seg(t, SC(3).start + 1.0, SC(3).start + 4.6);
      if (ju > 0 && ju < 1) { const y = lerp(WIDE.roadTop + 60, WIDE.roadBot - 40, ju), s = lerp(1.8, 2.3, ju); drawPersonFront(g, Object.assign({}, CROWD[40], { acc: 'briefcase' }), 2900 - ju * 80, y, s, poseFrontWalk((t * 1.6) % 1), { t }); }
      // crosswalk crowd crossing when the walk signal is on
      if (walk) for (let k = 0; k < 9; k++) {
        const i = 32 + k, u = clamp((t - (SC(3).start + 3.2) - k * 0.12) / 3.4), up = k % 2 === 0;
        if (u <= 0) continue; const uu = up ? u : 1 - u;
        const y = lerp(WIDE.roadBot + 80, WIDE.roadTop + 30, uu), s = lerp(2.5, 1.8, uu), x = 1980 + (k - 4) * 26 + (up ? -40 : 40);
        drawPersonFront(g, CROWD[i], x, y, s, poseFrontWalk((t * 1.7 + k * 0.3) % 1), { t, back: up });
      }
    },
    lanesNear: g => {
      const st = LANES_S3.map(L => ({ perCar: (c, i) => ({ honk: L === LANES_S3[2] && i === 3 && t > honkT && t < honkT + 0.6 }) }));
      drawLane(g, LANES_S3[2], t, st[2]); drawLane(g, LANES_S3[3], t);
    },
  });
  wideNear(g, t, {
    light: walk ? 'r' : (t > SC(3).start + 2.4 ? 'y' : 'g'), ped: walk ? 'walk' : 'dont',
    near: g => {
      // vendor waving a spatula + a woman buying a pretzel
      const wave = Math.sin(t * 7) * 0.7;
      const vp = poseIdle(t); vp.sh[0] = -2.2 + wave * 0.5; vp.el[0] = 0.6 + wave * 0.4;
      const v = drawPersonSide(g, VENDOR, 1380, 1790, 2.6, -1, vp, { t, expr: 'talk' });
      g.save(); g.translate(v.hand[0], v.hand[1]); g.rotate(-0.6 + wave); g.fillStyle = '#c0c6ce'; g.fillRect(-6, -60, 12, 40); g.fillRect(-16, -80, 32, 22); g.fillStyle = '#5a3a22'; g.fillRect(-4, -20, 8, 30); g.restore();
      const bp = poseIdle(t, 3); bp.sh[0] = 1.2; bp.el[0] = 0.4;
      const wb = drawPersonSide(g, CROWD[44], 1050, 1800, 2.6, 1, bp, { t, expr: 'smile' });
      g.fillStyle = '#b5651d'; g.save(); g.translate(wb.hand[0] + 8, wb.hand[1] - 6); g.strokeStyle = '#b5651d'; g.lineWidth = 9; g.beginPath(); g.arc(0, 0, 18, 0, TAU); g.stroke(); g.restore();
      drawPigeonFlock(g, 2300, 1720, t, null, 7, 1.6, 1);
      drawSteam(g, 1500, 1500 - 0, t, 1.2, 10, 1);
      for (let i = 18; i < 26; i++) { const { x, dir } = walkerX(i, t, [-400, 3600]); if (Math.abs(x - 1240) < 140) continue; drawCrowdSide(g, CROWD[i], x, 1850, 2.55, dir, 'walk', t); }
    },
  });
  return { capY: 1280 };
}

// ================================================================== SCENE 4 — THE BUZZ (push-in on crosswalk crowd)
const S4 = { y: 1260, s: 3.0 };
function scene4(g, t, lt) {
  const u = easeInOut(clamp(lt / (SC(5).start - SC(4).start)));
  setCam(t, { x: 1420 - W / 2 + 540 - 540, y: lerp(0, -160, u), z: lerp(1.0, 1.32, u), shake: 0.06 });
  const alert = t >= EV.buzz ? 1 : 0;
  layer(g, 0.02, g => drawSky(g, t, { hz: 900 }));
  layer(g, 0.3, g => drawTowers(g, t, 1000, { alert: t > EV.buzz + 0.3 }));
  blurDraw(g, 2, bg => layer(bg, 0.75, g2 => { drawStrip(g2, t, -400, 1230, 1.45, { alert: alert }); drawSidewalk(g2, -2000, 6000, 1225, 1300, { slab: 160, rows: 1 }); }));
  layer(g, 1, g => {
    drawSidewalk(g, -2000, 6000, 1290, 1420, { slab: 180, rows: 1 });
    drawTrafficLight(g, 1900, 1330, 1.5, 'g', 'dont', t);
    // waiting group (front view) — phones light up on the SAME frame
    const order = [0, 6, 2, 9, 4, 11, 1, 8, 3, 10, 5, 7];
    const pos = [[880, 0], [1010, 30], [1140, -10], [1270, 25], [1680, 30], [1810, -5], [940, 70], [1090, 85], [1580, 80], [1730, 75], [1220, 95], [1860, 90]];
    pos.forEach(([x, dy], k) => {
      const C = CROWD[42 + k], hasPhone = k % 3 === 0;
      const delay = order.indexOf(k) * 0.09;
      const look = seg(t, EV.buzz + delay, EV.buzz + delay + 0.35);
      const P = hasPhone ? poseFrontPhone(t, k) : poseFrontIdle(t, k);
      if (!hasPhone && t >= EV.buzz) { const raise = seg(t, EV.buzz + 0.2 + delay, EV.buzz + 0.7 + delay); P.elR = lerp(0.1, 2.3, raise); P.armR = lerp(0.12, -0.15, raise); P.phone = raise > 0.6; }
      P.head = lerp(P.head || 0, 0.3, look); if (alert) P.look = [0.1, lerp(0, 0.9, look)];
      const s = S4.s * (dy > 60 ? 1.06 : 1);
      const out = drawPersonFront(g, C, x, S4.y + dy, s, P, { t, alert, redSide: alert * look });
      if (alert && !P.phone) { glow(g, x + 8 * s, S4.y + dy - 50 * s, 40 * s, '#ff2020', 0.8); g.fillStyle = '#ff4040'; g.fillRect(x + 6 * s, S4.y + dy - 54 * s, 6 * s, 8 * s); }   // phone in pocket glows
    });
    // YOU + Biscuit in the group
    const P = poseFrontIdle(t, 2); P.elR = 1.6; P.armR = 0.05; P.elL = 0.6;
    if (alert) { const r = seg(t, EV.buzz + 0.15, EV.buzz + 0.6); P.head = 0.3 * r; P.look = [0.2, 0.9 * r]; }
    const me = drawPersonFront(g, YOU, 1440, S4.y + 60, S4.s * 1.04, P, { t, redSide: alert * seg(t, EV.buzz + 0.15, EV.buzz + 0.6) });
    drawCoffeeCup(g, me.handR[0], me.handR[1] - 6, 3.2, t);
    if (alert) { glow(g, 1440 - 20, S4.y + 60 - 150, 120, '#ff2020', 0.6 + 0.2 * Math.sin(t * 8)); }
    const dg = drawDog(g, 1500, S4.y + 120, 3.0, -1, { mode: 'stand', tail: alert ? 'low' : 'wag', earsUp: alert, tilt: alert ? -0.15 : 0 }, t);
    drawLeash(g, me.handL, dg.collar, 40, 1.4);
  });
  // foreground traffic passing (blurred car roofs)
  blurDraw(g, 5, bg => layer(bg, 1.35, g2 => { const x = wrapv(t * 700, -1200, 3600) + 400; drawVehicle(g2, mkVehicle('taxi', 5), x, 2200, 2.4, 1, t, { wheel: t * 10 }); const x2 = wrapv(-t * 600, -1200, 3600) + 400; drawVehicle(g2, mkVehicle('suv', 8), x2, 2380, 2.6, -1, t, { wheel: -t * 9 }); }), 0.9);
  return { capY: 1700, act2: alert };
}

// ================================================================== SCENE 5 — HUNDREDS (pull-out up a building to high angle)
function scene5(g, t, lt) {
  const D = SC(6).start - SC(5).start, u = clamp(lt / D);
  if (u < 0.32) { // rushing up a brick facade
    const v = easeIn(u / 0.32);
    setCam(t, { x: 0, y: 0, z: 1, shake: 0.2 });
    g.fillStyle = '#8b4f3c'; g.fillRect(0, 0, W, H);
    const off = (v * 4000) % 260;
    for (let yy = -260; yy < H + 260; yy += 260) for (let xx = 60; xx < W; xx += 250) {
      const y = yy + off; g.fillStyle = '#1d2433'; g.fillRect(xx, y, 150, 190); g.fillStyle = 'rgba(255,40,40,0.35)'; if (hash(xx + Math.floor((yy - v * 4000) / 260)) > 0.6) g.fillRect(xx, y, 150, 190);
      g.fillStyle = '#e9dcc5'; g.fillRect(xx - 8, y + 190, 166, 12);
    }
    whipBlur(g, 0.9, 1);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 0.6; g.drawImage(g.canvas, 0, -60, W, H + 120); g.restore();
    return { capY: 1300, act2: 1 };
  }
  // aerial view of the avenue: hundreds of red phone glows like stars
  const v = easeOut((u - 0.32) / 0.68);
  setCam(t, { x: 0, y: 0, z: lerp(1.7, 0.95, v), rot: -0.12, shake: 0.08 });
  layer(g, 1, g => {
    g.fillStyle = '#5b5148'; g.fillRect(-1500, -1500, W + 3000, H + 3000);
    // roofs both sides
    for (let k = -8; k < 14; k++) [[-900, 760], [700, 760]].forEach(([x0, w], side) => {
      const y = k * 260; g.fillStyle = ['#7a6a5c', '#8a7d70', '#6c625a', '#9a8a7a'][(k + side * 3 + 8) % 4]; g.fillRect(x0, y, w, 250);
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x0, y + 240, w, 10);
      g.fillStyle = '#a8a39b'; g.fillRect(x0 + 60 + (k % 3) * 90, y + 50, 90, 60);       // AC units
      if ((k + side) % 3 === 0) { g.fillStyle = '#6b4a35'; circle(g, x0 + w - 150, y + 120, 50); g.fill(); g.fillStyle = '#4a3428'; circle(g, x0 + w - 150, y + 120, 30); g.fill(); }  // water tank top
    });
    // sidewalks + avenue
    g.fillStyle = '#c9c0b2'; g.fillRect(140, -2200, 120, 6000); g.fillRect(820 - 120 + 0, -2200, 120, 6000);
    g.fillStyle = '#41454c'; g.fillRect(260, -2200, 440, 6000);
    g.fillStyle = '#e8c547'; g.fillRect(476, -2200, 4, 6000); g.fillRect(484, -2200, 4, 6000);
    g.fillStyle = '#e8e2d0'; for (let y = -2200; y < 3800; y += 90) { g.fillRect(366, y, 4, 45); g.fillRect(590, y, 4, 45); }
    // crosswalks
    g.fillStyle = 'rgba(240,236,225,0.9)'; [400, 1500].forEach(cy => { for (let x = 270; x < 700; x += 36) g.fillRect(x, cy, 20, 90); });
    // cars from above (all stopped / stopping)
    for (let k = 0; k < 44; k++) {
      const lane = k % 4, x = [300, 405, 520, 625][lane], y = -1800 + Math.floor(k / 4) * 360 + hash(k) * 120;
      const v2 = mkVehicle(['taxi', 'sedan', 'suv', 'taxi', 'van'][k % 5], k + 500);
      g.save(); g.translate(x + 20, y); g.fillStyle = 'rgba(0,0,0,0.35)'; rrect(g, -32, -66, 72, 140, 16); g.fill();
      g.fillStyle = v2.color; rrect(g, -36, -70, 72, 140, 16); g.fill(); g.fillStyle = '#24303f'; rrect(g, -28, -40, 56, 70, 10); g.fill(); g.fillStyle = shade(v2.color, 0.15); rrect(g, -26, -26, 52, 40, 8); g.fill();
      g.fillStyle = '#ff2a2a'; g.fillRect(-30, 66, 14, 5); g.fillRect(16, 66, 14, 5);
      g.restore();
      glow(g, x + 20, y - 6, 34, '#ff2020', 0.9);                                                                 // phones inside cars
    }
    // people on sidewalks from above: heads + red phone dots
    for (let k = 0; k < 260; k++) {
      const side = k % 2, x = side ? 150 + hash(k) * 100 : 710 + hash(k) * 100, y = -2000 + hash(k + 7) * 5600;
      g.fillStyle = PALETTES[k % 20].top; circle(g, x, y + 6, 11); g.fill(); g.fillStyle = HAIRC[k % 10]; circle(g, x, y, 7); g.fill();
      const tw = 0.7 + 0.3 * Math.sin(t * 6 + k);
      glow(g, x + 6, y - 6, 26, '#ff2020', tw);
      g.fillStyle = '#ff6060'; circle(g, x + 6, y - 6, 2.5); g.fill();
    }
  });
  return { capY: 1300, act2: 1 };
}

// ================================================================== SCENE 6 — THE ALERT
const ALERT_WORDS = ['INCOMING', 'MISSILE.', 'SEEK', 'SHELTER', 'IMMEDIATELY.', 'THIS', 'IS', 'NOT', 'A', 'DRILL.'];
function scene6(g, t, lt) {
  const cut = SC(6).start + 1.2;
  if (t < cut) { // over-the-shoulder
    setCam(t, { x: 0, y: 0, z: 1 + lt * 0.06, shake: 0.18 });
    blurDraw(g, 8, bg => { layer(bg, 0.5, g2 => { drawSky(g2, t, { hz: 900 }); drawTowers(g2, t, 1100, { alert: true }); drawStrip(g2, t, -900, 1500, 1.7, { alert: true }); });
      for (let k = 0; k < 14; k++) glow(bg, 100 + k * 77, 1200 + hash(k) * 400, 80, '#ff2020', 0.8); });
    layer(g, 1, g => {
      // shoulder + back of head (foreground left)
      g.fillStyle = YOU.top; ellipse(g, 260, 1900, 460, 420); g.fill();
      g.fillStyle = YOU.hood; ellipse(g, 330, 1500, 210, 90, -0.2); g.fill();
      g.fillStyle = shade(YOU.skin, -0.15); rrect(g, 280, 1180, 170, 330, 60); g.fill();
      g.fillStyle = YOU.skin; ellipse(g, 400, 1000, 210, 250); g.fill();
      g.fillStyle = `rgba(255,40,40,${0.35 + 0.2 * Math.sin(t * 9)})`; ellipse(g, 520, 1020, 110, 220); g.fill();                    // red light on cheek
      g.fillStyle = YOU.hair.color; g.beginPath(); g.ellipse(360, 930, 220, 230, -0.2, Math.PI * 0.75, Math.PI * 2.05); g.fill();
      g.fillStyle = shade(YOU.skin, -0.1); ellipse(g, 230, 1030, 36, 60); g.fill();
      g.fillStyle = 'rgba(58,42,32,0.25)'; ellipse(g, 540, 1150, 70, 60); g.fill();                    // stubble jaw edge
      // phone in hand
      drawPhoneScreen(g, t, 760, 900, 0.42, ALERT_WORDS, 0);
    });
    return { capY: 1400, act2: 1 };
  }
  // full-screen phone close-up: text types in word by word with the narration
  setCam(t, { x: 0, y: 0, z: 1.0 + (t - cut) * 0.025, shake: 0.12 });
  g.fillStyle = '#1a0507'; g.fillRect(0, 0, W, H);
  blurDraw(g, 8, bg => { for (let k = 0; k < 20; k++) glow(bg, hash(k) * W, hash(k + 1) * H, 160, k % 3 ? '#ff2020' : '#ffb070', 0.5); });
  const ws = EV.alertWords.filter(w => w[0] >= EV.alert + 1.0);
  let typed = 0; ws.forEach((w, i) => { if (t >= w[0] - 0.02) typed = i + 1; });
  typed = Math.min(typed, ALERT_WORDS.length);
  layer(g, 1, g => drawPhoneScreen(g, t, 540, 880, 0.98, ALERT_WORDS, typed));
  return { capY: 1640, act2: 1 };
}

// ================================================================== SCENE 7 — FROZEN
function frozenStreet(g, t, tf, o = {}) {
  wideBack(g, tf, { alert: true });
  layer(g, 0.9, g => { for (let i = 0; i < 18; i++) crowdMember(g, i, tf, WIDE.gy + 66, 1.75, [-400, 3600], 'alert'); });
  wideRoad(g, tf, {
    lanesFar: g => { drawLane(g, LANES_A[0], tf, { alert: true }); drawLane(g, LANES_A[1], tf, { alert: true }); },
    mid: g => { // one pigeon frozen mid-air
      drawPigeon(g, 1700, 1180, 2.0, 0.37, 'fly', 3, 1); },
    lanesNear: g => { drawLane(g, LANES_A[2], tf, { alert: true }); drawLane(g, LANES_A[3], tf, { alert: true }); },
  });
  wideNear(g, tf, { tf, near: g => { for (let i = 18; i < 26; i++) crowdMember(g, i, tf, 1850, 2.55, [-400, 3600], 'alert'); drawSteam(g, 1500, 1500, tf, 1.2, 10, 1); } });
}
function scene7(g, t, lt) {
  const tf = SC(7).start - 0.6;            // everything holds on one moment
  setCam(t, { x: 1100 + lt * 10, y: 20, z: 1.0 + lt * 0.045, shake: 0.03 });
  frozenStreet(g, t, tf);
  return { capY: 1280, act2: 1 };
}

// ================================================================== SCENE 8 — CARS STOP (low angle at the street surface)
const S8 = (() => {
  const t0 = SC(8).start, L = [];
  const mk = (y, dir, s, sp, list) => ({ y, dir, s, speed: sp, cars: list.map(([type, x0, tb, seed]) => ({ v: mkVehicle(type, seed), x0, tb, k: 3.2 })) });
  // near lane: the lead taxi slams on its brakes, the cars behind stop one after another
  L.push(mk(1550, 1, 1.32, 320, [['taxi', 540 - 320 * (t0 + 0.55), t0 + 0.55, 801], ['sedan', 540 - 320 * (t0 + 0.55) - 520, SC(8).start + 2.9, 802], ['suv', -320 * t0 - 560 - 70, SC(8).start + 3.9, 803], ['taxi', -320 * t0 - 1200, SC(8).start + 4.15, 804], ['van', -320 * t0 - 1850, SC(8).start + 4.4, 805]]));
  // next lane (other direction), farther: driver honks then sees his phone and freezes
  L.unshift(mk(1340, -1, 1.12, 280, [['sedan', 900 + 280 * (t0 + 1.6), t0 + 2.4, 811], ['taxi', 900 + 280 * (t0 + 1.6) + 520, t0 + 3.95, 812], ['bus', 900 + 280 * (t0 + 1.6) + 1100, t0 + 4.1, 813], ['suv', 900 + 280 * (t0 + 1.6) + 2000, t0 + 4.3, 814]]));
  return L;
})();
function scene8(g, t, lt) {
  setCam(t, { x: 300 + lt * 25, y: 220, z: 1.25, shake: 0.12 + (lt > 0.5 && lt < 0.9 ? 0.4 : 0), fz: 0.6 });
  wideBack(g, t, { alert: true });
  layer(g, 0.9, g => { for (let i = 0; i < 18; i++) crowdMember(g, i, t, WIDE.gy + 66, 1.75, [-400, 3600], 'alert'); });
  layer(g, 1, g => {
    drawRoad(g, -900, 5600, WIDE.roadTop, 2400, t, {});
    drawLane(g, S8[0], t, { alert: true, perCar: (c, i) => ({ honk: i === 0 && t > SC(8).start + 1.8 && t < SC(8).start + 2.35 }) });
    drawLane(g, S8[1], t, { alert: true });
    // tire screech smoke + skid marks under the lead taxi
    const c = S8[1].cars[0], x = carX(c, S8[1], t), since = t - c.tb;
    if (since > 0) { g.fillStyle = 'rgba(20,20,22,0.55)'; g.fillRect(x - 330, S8[1].y - 4, Math.min(330, since * 600), 10);
      for (let k = 0; k < 6; k++) { const ph = clamp(since / 1.2 - k * 0.05); if (ph <= 0 || ph >= 1) continue; const r = 30 + ph * 120; g.fillStyle = `rgba(220,220,225,${(1 - ph) * 0.5})`; circle(g, x - 140 - k * 40 - ph * 100, S8[1].y - 30 - ph * 90, r); g.fill(); } }
  });
  // street-surface foreground (very close, blurred): lane paint + asphalt
  blurDraw(g, 6, bg => layer(bg, 1.6, g2 => { g2.fillStyle = '#34373d'; g2.fillRect(-2000, 1900, 8000, 800); g2.fillStyle = '#e8e2d0'; for (let x = -2000; x < 6000; x += 400) g2.fillRect(x, 1950, 220, 30); }));
  return { capY: 1250, act2: 1 };
}

// ================================================================== SCENE 9 — CHAOS
function runnerPath(k, t, t0) {
  // each runner: start somewhere, run in its own direction; some cross the road, some into stores
  const kind = k % 5, dir = hash(k * 1.3) > 0.5 ? 1 : -1, sp = 330 + hash(k * 2.9) * 220;
  const x0 = -200 + hash(k * 4.1) * 3200, u = Math.max(0, t - t0 - hash(k) * 0.5);
  if (kind === 0) { const v = clamp(u / 2.2); return { x: x0 + dir * sp * 0.4 * u, y: lerp(1850, WIDE.gy + 66, v), s: lerp(2.55, 1.75, v), dir, layer: v > 0.5 ? 'far' : 'near', cross: true }; }
  if (kind === 1) return { x: wrapv(x0 + dir * sp * u, -500, 3700), y: WIDE.gy + 66, s: 1.75, dir, layer: 'far' };
  return { x: wrapv(x0 + dir * sp * u, -500, 3700), y: 1850 + (k % 3) * 18, s: 2.55, dir, layer: 'near' };
}
function chaosStreet(g, t, o = {}) {
  const t0 = SC(9).start;
  wideBack(g, t, { alert: true, panic: true });
  const runners = []; for (let k = 0; k < 44; k++) runners.push([k, runnerPath(k, t, t0)]);
  layer(g, 0.9, g => {
    runners.filter(r => r[1].layer === 'far').forEach(([k, r]) => drawCrowdSide(g, CROWD[(k + 50) % 90], r.x, r.y, r.s, r.dir, k % 4 === 0 ? 'panic' : 'run', t, { expr: 'scream' }));
    drawPigeonFlock(g, 1500, WIDE.gy + 60, t, t0 + 0.3, 9, 1.4, 2);
  });
  const doorO = clamp((t - t0) / 0.5);
  wideRoad(g, t, {
    lanesFar: g => { drawLane(g, LANES_A[0], SC(8).start + 0.0001, { alert: true, brakeAll: 1, doorOpen: doorO, driverOut: doorO > 0.5 }); drawLane(g, LANES_A[1], SC(8).start, { alert: true, brakeAll: 1, doorOpen: doorO * 0.8, driverOut: doorO > 0.6 }); },
    mid: g => {
      // drivers jumping out between the lanes
      LANES_A[2].cars.forEach((c, i) => { const x = carX(c, LANES_A[2], SC(8).start); const u = t - t0 - i * 0.12; if (u > 0) drawCrowdSide(g, CROWD[(60 + i) % 90], x + (i % 2 ? 1 : -1) * (80 + u * 420), LANES_A[2].y - 70 + 20, 2.2, i % 2 ? 1 : -1, 'panic', t); });
      // oranges rolling into the road from a dropped bag
      const bt = t0 + 0.9; if (t > bt) for (let k = 0; k < 9; k++) { const u = t - bt, x = 2400 + k * 20 + u * (140 + hash(k) * 220) * (k % 2 ? 1 : 0.6), y = 1690 - Math.max(0, 40 - u * 200) * Math.abs(Math.sin(u * 8 + k)) + u * 30 * hash(k + 1) - 60;
        g.fillStyle = '#ff8c1a'; circle(g, x, Math.min(1700, y), 14); g.fill(); g.fillStyle = '#ffb35c'; circle(g, x - 4, Math.min(1700, y) - 4, 5); g.fill(); g.fillStyle = '#3f7d3a'; g.fillRect(x - 2, Math.min(1700, y) - 15, 4, 5); }
    },
    lanesNear: g => {
      drawLane(g, LANES_A[2], SC(8).start, { alert: true, brakeAll: 1, doorOpen: doorO, driverOut: doorO > 0.5 });
      drawLane(g, LANES_A[3], SC(8).start, { alert: true, brakeAll: 1, doorOpen: doorO * 0.9, driverOut: doorO > 0.5 });
      // man climbing over a taxi hood
      const c = LANES_A[3].cars[2], cx = carX(c, LANES_A[3], SC(8).start), u = clamp((t - t0 - 0.4) / 1.6);
      if (u > 0 && u < 1) { const P = poseRun((t * 1.5) % 1); P.lean = 0.5; const y = LANES_A[3].y - 40 - Math.sin(u * Math.PI) * 110; drawPersonSide(g, CROWD[71], cx + 120 - u * 260, y, 2.4, -1, P, { t, expr: 'scream' }); }
    },
  });
  wideNear(g, t, { light: 'g', ped: 'dont', near: g => {
    runners.filter(r => r[1].layer === 'near').forEach(([k, r]) => drawCrowdSide(g, CROWD[(k + 50) % 90], r.x, r.y, r.s, r.dir, k % 3 === 0 ? 'panic' : 'run', t, { expr: 'scream' }));
    // stroller pushed at full speed
    const sx = wrapv(3600 - (t - t0) * 520, -400, 3800); const P = poseRun((t * 1.8) % 1); P.sh = [0.9, 0.85]; P.el = [0.3, 0.3];
    drawPersonSide(g, CROWD[73], sx, 1880, 2.6, -1, P, { t, expr: 'fear' });
    g.save(); g.translate(sx - 90, 1880); g.fillStyle = '#2a3f66'; rrect(g, -70, -150, 120, 90, 30); g.fill(); g.fillStyle = '#4a6fa5'; g.beginPath(); g.arc(-10, -150, 60, Math.PI, Math.PI * 1.6); g.fill(); g.fillStyle = '#222'; circle(g, -50, -22, 22); g.fill(); circle(g, 30, -22, 22); g.fill(); g.strokeStyle = '#999'; g.lineWidth = 5; line(g, 50, -150, 80, -190); g.restore();
    // woman who dropped her shopping bag
    const P2 = posePanic((t * 1.6) % 1, t, 5); drawPersonSide(g, CROWD[74], 2350 + (t - t0) * 200, 1860, 2.55, 1, P2, { t });
    g.save(); g.translate(2380, 1858); g.rotate(0.9); g.fillStyle = '#d9c7a3'; poly(g, [-30, -60, 30, -60, 36, 0, -36, 0]); g.fill(); g.restore();
    // a trip and someone helping
    const tu = clamp((t - t0 - 0.6) / 2.6);
    drawCrowdSide(g, CROWD[75], 600, 1880, 2.6, 1, 'trip', t, { u: tu });
    if (tu > 0.3) drawCrowdSide(g, CROWD[76], 720, 1880, 2.6, -1, 'help', t);
    // someone pointing at the sky
    drawCrowdSide(g, CROWD[77], 3150, 1870, 2.6, -1, 'point', t);
    // papers flying
    for (let k = 0; k < 14; k++) { const u = t - t0 - hash(k) * 0.6; if (u < 0) continue; const x = 1500 + (hash(k + 1) - 0.5) * 1800 + u * 140 * Math.sin(k), y = 1800 - u * (260 + hash(k + 2) * 260) + Math.sin(u * 4 + k) * 40;
      g.save(); g.translate(x, y); g.rotate(u * 4 + k); g.scale(1, Math.abs(Math.cos(u * 5 + k)) + 0.1); g.fillStyle = '#f4f1ea'; g.fillRect(-24, -32, 48, 64); g.fillStyle = 'rgba(0,0,0,0.25)'; for (let l = 0; l < 5; l++) g.fillRect(-18, -24 + l * 10, 36, 3); g.restore(); }
  } });
}
function scene9(g, t, lt) {
  setCam(t, { x: 1050 + lt * 30, y: 30, z: 1.04, rot: -0.07, shake: 0.55 });
  chaosStreet(g, t);
  return { capY: 1280, act2: 1 };
}

// ================================================================== SCENE 10 — THE BUS
function scene10(g, t, lt) {
  setCam(t, { x: 300 + lt * 12, y: 140, z: 1.32, shake: 0.28, fz: 0.5 });
  wideBack(g, t, { alert: true, panic: true });
  layer(g, 0.9, g => { for (let k = 0; k < 10; k++) { const r = runnerPath(k * 3 + 1, t, SC(9).start); drawCrowdSide(g, CROWD[(k * 3 + 51) % 90], wrapv(r.x, 0, 2200), WIDE.gy + 66, 1.75, r.dir, 'run', t); } });
  layer(g, 1, g => {
    drawRoad(g, -900, 5600, WIDE.roadTop, WIDE.roadBot, t, {});
    const bx = 760, by = 1560, door = clamp((lt - 0.25) / 0.4);
    drawVehicle(g, mkVehicle('bus', 77), bx, by, 1.12, 1, t, { lights: true, interior: true, doorOpen: door, driverOut: lt > 0.6, idle: true, hazard: true, passengerIn: true });
    // driver jumps down and runs
    const ju = clamp((lt - 0.55) / 0.45), dx = bx + 300 + (lt > 0.55 ? (lt - 0.55) * 420 : 0);
    if (lt > 0.4) { const P = lt < 1.0 ? blendPose(poseCrouch(t), poseRun((t * 1.7) % 1), ju) : poseRun((t * 1.7) % 1); P.expr = 'scream';
      const jy = by - Math.sin(ju * Math.PI) * 60 * (lt < 1 ? 1 : 0); drawPersonSide(g, DRIVER, dx, jy + 30, 2.5, 1, P, { t }); }
    // running people pass in front
    for (let k = 0; k < 5; k++) { const x = wrapv(1800 - (t - SC(10).start) * (500 + k * 60) + k * 500, -300, 2300); drawCrowdSide(g, CROWD[80 + k], x, 1800 + k * 8, 2.7, -1, k % 2 ? 'panic' : 'run', t); }
  });
  return { capY: 1770, act2: 1 };
}

// ================================================================== SCENE 11 — COFFEE DROPS (slow motion close-up)
function scene11(g, t, lt) {
  const sm = lt * 0.45;                         // slow motion clock
  setCam(t, { x: 0, y: 0, z: 1.05, shake: 0.06 });
  g.fillStyle = lingrad(g, 0, 0, 0, H, [[0, '#a7c5e0'], [0.45, '#d6c1a5'], [1, '#bdb3a5']]); g.fillRect(0, 0, W, H);
  blurDraw(g, 6, bg => layer(bg, 0.6, g2 => { drawStrip(g2, t, -600, 1150, 2.2, { alert: true, panic: true }); }));
  layer(g, 1, g => {
    // concrete ground (camera just above the sidewalk)
    g.fillStyle = lingrad(g, 0, 1100, 0, H, [[0, '#b9b0a3'], [1, '#d7cfc2']]); g.fillRect(-200, 1100, W + 400, H);
    g.strokeStyle = 'rgba(80,70,60,0.35)'; g.lineWidth = 3; line(g, -100, 1300, W + 200, 1240); line(g, 300, 1100, 120, H);
    // running feet pass through frame (slow motion)
    for (let k = 0; k < 5; k++) { const x = wrapv(1400 - (sm + k * 0.6) * 900, -500, 1700), up = Math.abs(Math.sin(sm * 4 + k)) * 80; const C = CROWD[60 + k];
      g.fillStyle = C.bottom; rrect(g, x - 40, 600 - up, 80, 650, 36); g.fill(); g.fillStyle = C.shoes; rrect(g, x - 70, 1230 - up, 150, 70, 30); g.fill(); g.fillStyle = C.sole; g.fillRect(x - 70, 1288 - up, 150, 14); }
    const impact = 0.33;                           // in slow-motion seconds
    const cx = 560, groundY = 1500;
    if (sm < impact) { // falling cup, tumbling
      const u = sm / impact, y = lerp(-100, groundY - 60, u * u);
      g.save(); g.translate(cx, y); g.rotate(u * 1.6); drawCoffeeCup(g, 0, 0, 16, t, 1, 0.6); g.restore();
      for (let k = 0; k < 8; k++) { g.fillStyle = 'rgba(110,62,28,0.9)'; circle(g, cx + Math.sin(k) * 20, y - 120 - k * 30, 8 - k * 0.6); g.fill(); }
    } else {
      const u = sm - impact;
      // puddle spreading
      g.fillStyle = 'rgba(92,52,24,0.92)'; ellipse(g, cx, groundY, 120 + Math.min(1, u * 3) * 320, 40 + Math.min(1, u * 3) * 70); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.18)'; ellipse(g, cx - 60, groundY - 18, 120, 16); g.fill();
      // crushed cup on its side, lid popped off flying
      g.save(); g.translate(cx + 90, groundY - 40); g.rotate(1.45); drawCoffeeCup(g, 0, 0, 15, t, 1, 0); g.restore();
      g.save(); g.translate(cx - 200 - u * 500, groundY - 220 - u * 300 + u * u * 900); g.rotate(-u * 8); g.fillStyle = '#151515'; rrect(g, -100, -20, 200, 40, 16); g.fill(); g.restore();
      // droplets bursting outward
      for (let k = 0; k < 40; k++) { const a = -Math.PI * (0.1 + hash(k) * 0.8), sp = 500 + hash(k + 3) * 900;
        const x = cx + Math.cos(a) * sp * u, y = groundY + Math.sin(a) * sp * u + 1400 * u * u; if (y > groundY + 40) continue;
        g.fillStyle = 'rgba(110,62,28,0.95)'; ellipse(g, x, y, 10 + hash(k) * 10, 8 + hash(k) * 6, a); g.fill(); g.fillStyle = 'rgba(255,230,200,0.5)'; circle(g, x - 3, y - 3, 3); g.fill(); }
      // crown splash
      if (u < 0.5) { g.strokeStyle = 'rgba(110,62,28,0.9)'; g.lineWidth = 10; for (let k = 0; k < 9; k++) { const a = Math.PI + k / 8 * Math.PI; line(g, cx + Math.cos(a) * 80, groundY, cx + Math.cos(a) * (120 + u * 300), groundY - 60 - u * 260 * Math.sin(k / 8 * Math.PI)); } }
      // steam rising
      drawSteam(g, cx, groundY - 30, t, 1.6, 8, 0.9);
    }
  });
  return { capY: 1760, act2: 1 };
}

// ================================================================== SCENE 12 — RULE CARD (rack focus)
function scene12(g, t, lt) {
  const focus = seg(lt, 0, 0.5);
  setCam(t, { x: 1050 + lt * 20, y: 30, z: 1.04 + lt * 0.02, rot: -0.04, shake: 0.35 });
  chaosStreet(g, t);
  blurFrame(g, 6, focus);
  g.save(); g.fillStyle = `rgba(10,14,30,${0.35 * focus})`; g.fillRect(0, 0, W, H); g.restore();
  return { capY: 1250, act2: 1, rule: true };
}

// ================================================================== SCENE 13 — 15 MINUTES (face close-up)
function scene13(g, t, lt) {
  setCam(t, { x: 0, y: 0, z: 1.0 + lt * 0.05, shake: 0.3 });
  blurDraw(g, 8, bg => { layer(bg, 0.5, g2 => { drawSky(g2, t, { hz: 900 }); drawTowers(g2, t, 1150, { alert: true }); drawStrip(g2, t, -500, 1600, 1.6, { alert: true, panic: true }); });
    for (let k = 0; k < 8; k++) { const x = wrapv(k * 300 - t * 600, -200, 1300); bg.fillStyle = 'rgba(30,30,40,0.6)'; rrect(bg, x, 900, 140, 900, 60); bg.fill(); } });
  layer(g, 1, g => {
    const breath = Math.abs(Math.sin(t * 5.5));
    const cx = 540, cy = 760 + breath * 6;
    // shoulders + jacket + hood
    g.fillStyle = lingrad(g, 100, 0, 980, 0, [[0, YOU.topDark], [0.7, YOU.top], [1, shade(YOU.top, 0.2)]]); ellipse(g, cx, 1500 + breath * 10, 520, 380); g.fill();
    g.fillStyle = YOU.hood; ellipse(g, cx, 1150 + breath * 8, 250, 90); g.fill();
    g.fillStyle = '#1b1c20'; g.fillRect(cx - 360, 1220, 60, 400); g.fillRect(cx + 300, 1220, 60, 400);   // backpack straps
    drawHeadFront(g, YOU, cx, cy, 250, { t, expr: 'fear', look: [Math.sin(t * 3) * 0.5, 0], breath, redSide: 0.6 + 0.4 * pulse(t, 0.5) });
    // sweat drop
    g.fillStyle = 'rgba(200,230,255,0.8)'; ellipse(g, cx + 190, cy - 120 + (lt * 60 % 80), 9, 14); g.fill();
  });
  return { capY: 1310, act2: 1 };
}

// ================================================================== SCENE 14 — EVERYONE GOES RIGHT
function scene14(g, t, lt) {
  const u = easeInOut(clamp(lt / 3.4));
  setCam(t, { x: lerp(2200, 3900, u), y: 40, z: 1.0, shake: 0.3 });
  const t0 = SC(14).start;
  wideBack(g, t, { alert: true, panic: true, revFast: true });
  const flow = (k, band) => { const sp = 380 + hash(k * 2.2) * 200, x = wrapv(1400 + hash(k * 5.5) * 4200 + (t - t0) * sp, 1400, 6200); return x; };
  layer(g, 0.9, g => { for (let k = 0; k < 18; k++) drawCrowdSide(g, CROWD[(k * 5) % 90], flow(k), WIDE.gy + 66, 1.75, 1, k % 4 ? 'run' : 'panic', t); });
  wideRoad(g, t, {
    lanesFar: g => { drawLane(g, LANES_A[0], SC(8).start, { alert: true, brakeAll: 1, doorOpen: 1, driverOut: true }); drawLane(g, LANES_A[1], SC(8).start, { alert: true, brakeAll: 1, doorOpen: 1, driverOut: true }); },
    mid: g => { for (let k = 0; k < 10; k++) { const x = flow(k + 40), v = hash(k * 7); drawCrowdSide(g, CROWD[(k * 7 + 3) % 90], x, lerp(WIDE.roadTop + 150, WIDE.roadBot - 30, v), lerp(1.9, 2.3, v), 1, 'run', t); } },
    lanesNear: g => { drawLane(g, LANES_A[2], SC(8).start, { alert: true, brakeAll: 1, doorOpen: 1, driverOut: true }); drawLane(g, LANES_A[3], SC(8).start, { alert: true, brakeAll: 1, doorOpen: 1, driverOut: true }); },
  });
  wideNear(g, t, { near: g => {
    for (let k = 0; k < 16; k++) drawCrowdSide(g, CROWD[(k * 3 + 20) % 90], flow(k + 20), 1850 + (k % 3) * 16, 2.55, 1, k % 3 ? 'run' : 'panic', t);
    // YOU + Biscuit stand still in the middle of the flow (Biscuit facing left)
    const yx = lerp(2900, 3600, u) + 300;
    const P = poseIdle(t, 1); P.sh[1] = 0.6; P.el[1] = 0.3; P.head = 0.1;
    const me = drawPersonSide(g, YOU, yx, 1880, 2.65, 1, P, { t, expr: 'fear' });
    const dg = drawDog(g, yx - 130, 1885, 2.1, -1, { mode: 'stand', tail: 'low', earsUp: true }, t);
    drawLeash(g, me.fhand, dg.collar, 30, 1.2);
  } });
  // arrow-like motion streaks
  g.save(); g.globalAlpha = 0.5; g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineCap = 'round';
  for (let k = 0; k < 14; k++) { const y = 900 + hash(k) * 900, x = wrapv(hash(k + 1) * W + t * 2200, -300, W + 300); g.lineWidth = 3 + hash(k + 2) * 4; line(g, x - 200, y, x, y); g.beginPath(); g.moveTo(x - 20, y - 14); g.lineTo(x + 6, y); g.lineTo(x - 20, y + 14); g.stroke(); }
  g.restore();
  return { capY: 1280, act2: 1 };
}

// ================================================================== SCENE 15 — BISCUIT PULLS LEFT (dog-height low angle)
function scene15(g, t, lt) {
  setCam(t, { x: 0, y: 0, z: 1.02 + lt * 0.03, shake: 0.32 });
  const on = seg(t, EV.subway, EV.subway + 0.35);
  layer(g, 0.05, g => drawSky(g, t, { hz: 900, birds: false }));
  layer(g, 0.3, g => drawTowers(g, t, 1000, { alert: true }));
  // subway entrance behind them (left), runners going right
  layer(g, 0.75, g => {
    drawStrip(g, t, 200, 1360, 1.5, { alert: true, panic: true });
    drawSidewalk(g, -2000, 6000, 1355, 1500, { slab: 200, rows: 1 });
    drawSubwayEntrance(g, 420, 1490, 1.35, t, { signOn: 0.2 + 0.8 * on });
    for (let k = 0; k < 9; k++) { const x = wrapv(k * 260 + (t - SC(15).start) * 520, -300, 1500); drawCrowdSide(g, CROWD[(k * 9 + 4) % 90], x, 1500, 2.8, 1, 'run', t); }
  });
  if (on > 0 && on < 1) { g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(120,255,170,${0.25 * Math.sin(on * Math.PI)})`; g.fillRect(0, 0, W, H); g.restore(); }
  layer(g, 1, g => {
    drawSidewalk(g, -2000, 6000, 1480, 2100, { slab: 380, rows: 2 });
    const yank = clamp((lt - 0.2) * 3), hard = SC(15).start + (EV.subway - SC(15).start) * 0.5;
    const jolt = Math.max(0, 1 - Math.abs(t - (LINES[28].s)) * 4);
    // YOU (partial, right side) leaning back as his arm is yanked left
    const P = poseIdle(t, 4); P.lean = -0.12 - 0.12 * yank; P.sh[0] = -1.35 - 0.2 * yank - jolt * 0.3; P.el[0] = 0.08; P.hip = [0.25, -0.2]; P.kn = [0.1, 0.25];
    const me = drawPersonSide(g, YOU, 960 + jolt * -30, 2000, 6.0, -1, P, { t, expr: 'fear' });
    // Biscuit planted, pulling hard to the left
    const dg = drawDog(g, 600 - jolt * 20, 1960, 7.4, -1, { mode: 'pull', tail: 'low', earsBack: false, bark: lt > 1.0 && lt < 1.6 }, t);
    drawLeash(g, me.hand, dg.collar, -10 + 10 * (1 - yank), 4);
  });
  return { capY: 1340, act2: 1 };
}

// ================================================================== SCENE 16 — TRUST (run left against the crowd)
function scene16(g, t, lt) {
  const nod = Math.sin(clamp((lt - 0.25) / 0.35) * Math.PI);
  const run = clamp((lt - 0.55) / 0.3);
  const yx = 1900 - Math.max(0, lt - 0.55) * 520;
  setCam(t, { x: yx - 600, y: 60, z: 1.25, shake: 0.4, fz: 0.5 });
  wideBack(g, t, { alert: true, panic: true });
  layer(g, 1, g => {
    drawSidewalk(g, -2000, 6000, WIDE.roadTop - 14, 2200, { slab: 170, rows: 3 });
    // crowd running right
    for (let k = 0; k < 14; k++) { const x = wrapv(800 + k * 240 + (t - SC(16).start) * 560, yx - 900, yx + 1100); drawCrowdSide(g, CROWD[(k * 11 + 2) % 90], x, 1660 + (k % 3) * 70, 2.5 + (k % 3) * 0.12, 1, k % 4 ? 'run' : 'panic', t); }
    // YOU looks down at Biscuit, nods, then runs left; shoulders bump
    const bump = Math.max(0, 1 - Math.abs(((lt - 0.7) % 0.38) - 0.19) * 10) * (lt > 0.7 ? 1 : 0);
    let P = poseIdle(t, 2); P.head = 0.35 + nod * 0.25; P.look = [0.6, 0.8];
    if (run > 0) P = blendPose(P, poseRun((t * 1.8) % 1), run);
    P.lean += bump * -0.2;
    const me = drawPersonSide(g, YOU, yx, 1800, 2.9, -1, P, { t, expr: run > 0 ? 'determined' : 'worried' });
    const dg = drawDog(g, yx - 170, 1806, 2.3, -1, { mode: run > 0 ? 'run' : 'stand', ph: (t * 2.4) % 1, tail: 'low', earsUp: true, tilt: run > 0 ? 0 : 0.2 * Math.sin(t * 3) }, t);
    drawLeash(g, me.fhand, dg.collar, run > 0 ? 6 : 26, 1.3);
    // people running toward camera-right in front
    for (let k = 0; k < 6; k++) { const x = wrapv(400 + k * 380 + (t - SC(16).start) * 620, yx - 900, yx + 1100); drawCrowdSide(g, CROWD[(k * 13 + 5) % 90], x, 1950, 3.1, 1, 'run', t); }
  });
  return { capY: 1250, act2: 1 };
}

// ================================================================== SCENE 17 — 12 MINUTES (sprint down the stairs)
function scene17(g, t, lt) {
  const u = lt / (SC(18).start - SC(17).start);
  setCam(t, { x: 0, y: 0, z: 1.0 + u * 0.15, shake: 0.55 });
  layer(g, 1, g => {
    const off = (lt * 1400) % 220;               // yellow stair edges flashing past
    g.drawImage(DOWNV.c, 0, -off - 300, W, DOWNV.c.height);
    // YOU running down (seen from behind) + Biscuit
    const ph = (t * 2.2) % 1;
    const y = 1500 + u * 260, s = 4.6 - u * 1.2;
    const dg = drawDog(g, 700 + Math.sin(t * 9) * 10, y - 60 + u * 40, 3.4 - u * 0.6, 1, { mode: 'run', ph, tail: 'tuck' }, t);
    const P = poseFrontWalk(ph); P.armL = 0.5 + Math.sin(ph * TAU) * 0.4; P.armR = 0.5 - Math.sin(ph * TAU) * 0.4; P.bob = -3 * Math.abs(Math.sin(ph * TAU));
    drawPersonFront(g, YOU, 470, y, s, P, { t, back: true });
    g.fillStyle = '#1b1c20'; rrect(g, 470 - 15 * s, y - 80 * s, 30 * s, 32 * s, 6 * s); g.fill();            // backpack from behind
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(470 - 12 * s, y - 78 * s, 4 * s, 26 * s);
  });
  whipBlur(g, 0.35, 0);
  return { capY: 1290, act2: 1 };
}
