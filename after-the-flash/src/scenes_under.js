// ============================================================================
// scenes_under.js — Scenes 18–33 (the gate, the flash, underground, choice).
// ============================================================================
const RED_T0 = SCENES_T[25].start;    // Ep1: emergency lights come on in scene 26
// ================================================================== SCENE 18 — THE GATE
function scene18(g, t, lt) {
  const D = SC(19).start - SC(18).start, u = lt / D;
  setCam(t, { x: 0, y: 0, z: 1.0 + u * 0.06, shake: 0.12 });
  const down = lerp(0.18, 0.7, easeInOut(u));
  let plate;
  layer(g, 1, g => {
    plate = gateView(g, t, { down, behind: g => {
      // YOU + Biscuit appear at the top of the stairs and race down
      const ru = clamp((lt - 2.4) / 1.8);
      if (ru > 0) { const y = lerp(UPV.top.y + UPV.top.h + 30, 1180, ru * ru), s = lerp(0.9, 3.2, ru * ru), x = 520 + ru * 30;
        drawDog(g, x + 70 * s / 3, y + 4, s * 0.75, -1, { mode: 'run', ph: (t * 2.4) % 1, tail: 'tuck' }, t);
        drawPersonFront(g, YOU, x, y, s, poseFrontWalk((t * 2.2) % 1), { t, expr: 'shout' }); }
    }, front: g => {
      // Rosa pulling the gate down (hook pole while it is high, then the rail)
      const railY = UPV.arch.y + UPV.arch.h * down;
      const P = poseIdle(t, 5); P.sh[0] = -2.75; P.el[0] = 0.15; P.sh[1] = -2.6; P.el[1] = 0.3; P.lean = -0.05; P.head = -0.25;
      const tug = Math.sin(t * 5) * 0.06; P.sh[0] += tug; P.bob = Math.abs(Math.sin(t * 5)) * 1.2;
      const r = drawPersonSide(g, ROSA, 830, 1660, 5.8, -1, P, { t, expr: 'determined', keySwing: 1.6 });
      g.strokeStyle = '#2b2f35'; g.lineWidth = 9; line(g, r.hand[0], r.hand[1], r.hand[0] - 20, Math.min(r.hand[1], railY + 10));
      g.strokeStyle = '#c9a85a'; g.lineWidth = 6; g.beginPath(); g.arc(r.hand[0] - 20, railY + 22, 12, Math.PI, 0, true); g.stroke();
    } });
  });
  if (plate) drawCodeChip(g, t, plate[0] + 90, plate[1] + 55, SC(18).start + 1.1);
  return { capY: 1420, act2: 1 };
}
// ================================================================== SCENE 19 — WAIT!
function scene19(g, t, lt) {
  const z = lerp(1.0, 1.28, easeOut(clamp(lt / 0.35)));
  setCam(t, { x: 0, y: 120, z, shake: 0.35 });
  layer(g, 1, g => {
    gateView(g, t, { down: 0.72, behind: g => {
      const P = poseFrontWalk((t * 2) % 1); P.armR = -1.2; P.elR = 0.2; P.legL *= 0.3; P.legR *= 0.3;
      const me = drawPersonFront(g, YOU, 520, 1520, 6.0, P, { t, expr: 'shout', look: [0, 0] });
      drawDog(g, 760, 1540, 3.6, -1, { mode: 'run', ph: (t * 2.5) % 1, tail: 'tuck', bark: true }, t);
    } });
  });
  drawBubble(g, t, SC(19).start + 0.05, 600, 440, 'WAIT!', 560, 640, 90);
  return { capY: 1640, act2: 1 };
}
// ================================================================== SCENE 20 — SLIDE UNDER (slow-motion side shot)
function scene20(g, t, lt) {
  const sm = lt * 0.42;
  setCam(t, { x: 0, y: 0, z: 1.04, shake: 0.1 });
  const floorY = 1450, gx = 560;
  const gap = lerp(190, 70, clamp(lt / 3));
  // background: tiled station wall + stair profile on the left
  tileWall(g, 0, 0, W, floorY, 46);
  g.fillStyle = MOSAIC; g.fillRect(0, 380, W, 70); g.fillStyle = '#f2e9d0'; g.font = `800 44px ${F_UI}`; g.textAlign = 'center'; g.fillText('HARBOR ST', 800, 430);
  g.fillStyle = '#8f8a80'; g.fillRect(0, floorY, W, H - floorY);
  g.strokeStyle = 'rgba(0,0,0,0.2)'; for (let x = -200; x < W + 200; x += 120) line(g, x, floorY, x - 300, H);
  // stairs coming down from upper left
  g.fillStyle = '#7d7a74';
  for (let k = 0; k < 12; k++) { const x = 380 - k * 60, y = floorY - k * 70; g.fillStyle = k % 2 ? '#86837c' : '#7d7a74'; g.fillRect(x - 60, y - 70, 60 + k * 0 + 400, 70); g.fillStyle = '#e8b81e'; g.fillRect(x - 60, y - 70, 64, 8); }
  g.fillStyle = 'rgba(0,0,0,0.35)'; poly(g, [0, 0, 380, floorY - 70 * 11, 380, floorY, 0, floorY]); g.globalAlpha = 0.2; g.fill(); g.globalAlpha = 1;
  // overhead light beam
  g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,240,210,0.12)'; poly(g, [600, 0, 760, 0, 1000, floorY, 300, floorY]); g.fill(); g.restore();
  layer(g, 1, g => {
    // gate edge-on with a hint of its lattice
    const gb = floorY - gap;
    g.fillStyle = '#2c3036'; g.fillRect(gx - 50, 160, 140, 60);
    g.save();
    for (let k = 0; k < 4; k++) { limb(g, gx + 40 + k * 18, 220, gx + 40 + k * 18 + 0, gb, 10, k % 2 ? '#7f8792' : '#9aa2ac'); }
    for (let y = gb; y > 220; y -= 70) { g.strokeStyle = '#6b727c'; g.lineWidth = 6; line(g, gx + 40, y, gx + 94, y - 60); }
    g.restore();
    g.fillStyle = lingrad(g, 0, gb - 20, 0, gb + 20, [[0, '#c9ced6'], [1, '#4b525b']]); g.fillRect(gx - 20, gb - 18, 110, 34);
    // Rosa on the far side pulling it down
    const P = poseIdle(t, 5); P.sh[0] = -1.0; P.el[0] = 0.5; P.sh[1] = -0.9; P.el[1] = 0.6; P.lean = 0.25;
    drawPersonSide(g, ROSA, 860, floorY, 5.4, -1, P, { t: sm + t * 0.1, expr: 'determined', keySwing: 0.6 });
    // YOU sliding on his back under the gate
    const su = clamp(sm / 0.75), yx = lerp(120, 1060, easeOut(su));
    const SP = { lean: 0, bob: 0, head: -0.3, hip: [1.3, 1.1], kn: [0.6, 0.9], sh: [-2.8, -2.4], el: [0.3, 0.5], ft: [0, 0], rot: -1.5, expr: 'shout' };
    drawPersonSide(g, YOU, yx, floorY - 14, 4.8, 1, SP, { t: sm, shadow: false });
    // backpack scraping sparks
    for (let k = 0; k < 10; k++) { const a = Math.PI + (hash(k) - 0.5) * 0.8, l = 20 + hash(k + 1) * 60, ph = (sm * 4 + hash(k)) % 1; const x0 = yx - 300 - ph * 80, y0 = floorY - 10;
      g.strokeStyle = `rgba(255,${180 + hash(k) * 60},90,${1 - ph})`; g.lineWidth = 3; line(g, x0, y0, x0 + Math.cos(a) * l, y0 + Math.sin(a) * l * 0.6); }
    // Biscuit leaps through the last gap
    const bu = clamp((sm - 0.55) / 0.55);
    if (bu > 0) { const bx = lerp(-100, 1000, bu), by = floorY - Math.sin(bu * Math.PI) * 80; drawDog(g, bx, by, 4.2, 1, { mode: 'leap', ph: 0.25, tail: 'tuck', earsBack: true }, sm); }
  });
  return { capY: 1700, act2: 1 };
}
// ================================================================== SCENE 21 — SLAM
function scene21(g, t, lt) {
  const hit = SC(21).start + 0.05, key = SC(21).start + 0.7;
  const fall = clamp((t - SC(21).start + 0.2) / 0.25);
  setCam(t, { x: 0, y: 0, z: 1.08, shake: t > hit && t < hit + 0.5 ? 0.9 : 0.12 });
  g.fillStyle = lingrad(g, 0, 0, 0, H, [[0, '#cfc8b6'], [0.55, '#e9e4d6'], [0.56, '#8f8a80'], [1, '#6f6a62']]); g.fillRect(0, 0, W, H);
  tileWall(g, 0, 0, W, 1060, 90);
  layer(g, 1, g => {
    const floorY = 1080, railY = lerp(500, floorY - 60, easeIn(fall));
    // lattice bars above the rail
    for (let k = 0; k < 6; k++) { limb(g, 60 + k * 190, -100, 60 + k * 190, railY, 28, '#7f8792'); limb(g, 66 + k * 190, -100, 66 + k * 190, railY, 6, '#d9dee5'); }
    for (let y = railY; y > -200; y -= 230) for (let k = 0; k < 6; k++) { g.strokeStyle = '#6b727c'; g.lineWidth = 16; line(g, 60 + k * 190, y, 250 + k * 190, y - 230); line(g, 250 + k * 190, y, 60 + k * 190, y - 230); }
    g.fillStyle = lingrad(g, 0, railY - 50, 0, railY + 60, [[0, '#dfe3e8'], [0.5, '#8a929c'], [1, '#3e444c']]); g.fillRect(-40, railY - 50, W + 80, 110);
    // floor lock + key
    g.fillStyle = '#2b2f35'; rrect(g, 380, railY + 40, 320, 200, 24); g.fill();
    g.fillStyle = lingrad(g, 400, 0, 680, 0, [[0, '#b8962e'], [0.5, '#f2d36b'], [1, '#9c7412']]); rrect(g, 420, railY + 70, 240, 140, 18); g.fill();
    g.fillStyle = '#1a1a1a'; circle(g, 540, railY + 130, 22); g.fill(); g.fillRect(534, railY + 130, 12, 40);
    if (t > key - 0.3) { const turn = seg(t, key, key + 0.35) * 1.5;
      g.save(); g.translate(540, railY + 130); g.rotate(turn);
      g.fillStyle = '#c0c6ce'; g.fillRect(-10, -150, 20, 150); g.fillStyle = '#d4af37'; circle(g, 0, -190, 56); g.fill(); g.fillStyle = '#2b2f35'; circle(g, 0, -200, 16); g.fill(); g.restore();
      // Rosa's hand turning the key
      g.save(); g.translate(540, railY - 60); g.rotate(turn * 0.6);
      g.fillStyle = ROSA.top; rrect(g, 40, -330, 220, 260, 60); g.fill(); g.fillStyle = '#ff7a00'; g.fillRect(40, -330, 220, 60);
      g.fillStyle = ROSA.skin; ellipse(g, 20, -90, 110, 90); g.fill(); g.fillStyle = shade(ROSA.skin, -0.1); for (let k = 0; k < 3; k++) { rrect(g, -110, -150 + k * 50, 120, 44, 22); g.fill(); } g.restore(); }
    // metal dust sparks at the impact
    if (t > hit) for (let k = 0; k < 40; k++) { const u = (t - hit) * (0.8 + hash(k)), a = -Math.PI * hash(k + 2), sp = 300 + hash(k + 3) * 900; const x = 100 + hash(k + 5) * 880 + Math.cos(a) * sp * u, y = floorY - 10 + Math.sin(a) * sp * u + 900 * u * u;
      if (u > 0.8) continue; g.fillStyle = `rgba(255,${200 + hash(k) * 50},120,${1 - u / 0.8})`; circle(g, x, y, 3 + hash(k) * 3); g.fill(); }
    if (t > hit && t < hit + 0.08) { g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(-100, -100, W + 200, H + 200); }
  });
  return { capY: 1500, act2: 1 };
}
// ================================================================== SCENE 22 — THE FLASH (POV up the stairwell)
function scene22(g, t, lt) {
  const w = EV.white, f = clamp((t - w) / 0.1);             // sky to white in 3 frames
  const flood = clamp((t - w - 0.05) / 0.4), full = clamp((t - w - 0.35) / 0.25);
  setCam(t, { x: 0, y: -40, z: 1.08 + lt * 0.03, shake: 0.1 + flood * 0.2 });
  layer(g, 1, g => {
    gateView(g, t, { down: 1, flash: f });
    if (flood > 0) {
      const A = UPV.arch, T = UPV.top;
      // light floods down the stairs
      g.save(); g.globalCompositeOperation = 'lighter';
      const fy = lerp(T.y, A.y + A.h + 600, flood);
      g.fillStyle = lingrad(g, 0, T.y, 0, fy, [[0, 'rgba(255,255,255,1)'], [0.8, 'rgba(255,250,240,0.9)'], [1, 'rgba(255,250,240,0)']]);
      poly(g, [T.x, T.y, T.x + T.w, T.y, A.x + A.w + 200 * flood, fy, A.x - 200 * flood, fy]); g.fill();
      g.restore();
      // shadows of the gate bars stretch long across the floor toward camera (and over YOU)
      g.save(); g.fillStyle = `rgba(10,10,20,${0.55 * flood})`;
      const n = Math.round(A.w / 64);
      for (let k = 0; k <= n; k++) { const x = A.x + k * A.w / n, ex = W / 2 + (x - W / 2) * (1.6 + flood * 2.2); poly(g, [x - 5, A.y + A.h, x + 5, A.y + A.h, ex + 26, H + 200, ex - 26, H + 200]); g.fill(); }
      g.restore();
    }
    // YOU's shoulder + head silhouette at the bottom (POV)
    g.fillStyle = mix('#3a3f2a', '#111111', flood); ellipse(g, 220, 1900, 380, 260); g.fill();
    g.fillStyle = mix(YOU.hair.color, '#0a0a0a', flood); ellipse(g, 300, 1750, 160, 150); g.fill();
  });
  if (full > 0) { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = `rgba(255,255,255,${full})`; g.fillRect(0, 0, W, H); g.restore(); }
  return { capY: 1300, act2: t < w ? 1 : 0, white: full };
}
// ================================================================== SCENE 23 — SILENT LIGHT
function scene23(g, t, lt) {
  const D = SC(24).start - SC(23).start, u = lt / D;
  setCam(t, { x: 0, y: 0, z: 1.02 + u * 0.03, shake: 0.06 });
  layer(g, 1, g => { g.drawImage(ST.c, 0, 0); people(g, t, 'stand'); });
  // over-exposed shapes slowly emerge from white
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'screen'; g.fillStyle = `rgba(255,255,255,${lerp(1, 0.72, smooth(u))})`; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'source-over'; g.fillStyle = `rgba(255,255,255,${lerp(0.96, 0.25, smooth(u))})`; g.fillRect(0, 0, W, H);
  g.restore();
  return { capY: 1300, white: 0 };
}
// people inside the station (perspective-placed)
// ================================================================== SCENE 24 — SHOCKWAVE
function scene24(g, t, lt) {
  const jump = SC(24).start, die = EV.lightsDie;
  const sh = t < jump + 0.8 ? 1.0 : 0.35 * Math.exp(-(t - jump - 0.8) * 0.5) + 0.12;
  setCam(t, { x: 0, y: 0, z: 1.04, rot: Math.sin(t * 3) * 0.01, shake: sh });
  const flick = t > die - 0.9 ? (hash(Math.floor(t * 20)) > 0.45 ? 1 : 0.25) : 1;
  const on = t < die ? flick : 0;
  layer(g, 1, g => {
    g.drawImage(ST.c, 0, 0);
    drawCracks(g, clamp((t - jump - 0.1) / 3.5));
    // people crouch / duck and cover
    people(g, t, t < jump + 0.35 ? 'stand' : 'crouch');
    // YOU + Biscuit + Rosa near camera, crouching
    drawCrowdSide(g, ROSA, 860, 1820, 6.0, -1, 'crouch', t, { keySwing: 2 });
    drawPersonSide(g, YOU, 330, 1900, 6.8, 1, poseCrouch(t), { t, expr: 'fear' });
    drawDog(g, 560, 1910, 5.2, 1, { mode: 'lie', tail: 'tuck', earsBack: true }, t);
    drawStationLights(g, t, 'normal', on);
    // swinging light fixture
    const ang = Math.sin((t - jump) * 3.2) * 0.5 * Math.exp(-(t - jump) * 0.25);
    drawHangingLight(g, 600, -40, 380, ang, on > 0.5);
    drawDustRain(g, t, clamp((t - jump) / 0.6) * (1 - clamp((t - die) / 1.5) * 0.6));
    drawMotes(g, t, 300, 300, 600, 1200, 50, '255,240,220', 0.5 * on);
  });
  if (t >= die) { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = `rgba(4,5,8,${0.94 + 0.04 * hash(Math.floor(t * 30))})`; g.fillRect(0, 0, W, H); g.restore(); }
  else if (on < 1) { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = 'rgba(4,5,8,0.7)'; g.fillRect(0, 0, W, H); g.restore(); }
  return { capY: 1300 };
}
// ================================================================== SCENE 25 — SILENCE
function scene25(g, t, lt) {
  setCam(t, { x: 0, y: 0, z: 1.04, shake: 0.06 });
  g.fillStyle = '#030406'; g.fillRect(0, 0, W, H);
  layer(g, 1, g => {
    // faint station shapes inside one weak beam from the stairs
    g.save(); g.globalAlpha = 0.08; g.drawImage(ST.c, 0, 0); g.restore();
    g.save(); g.globalCompositeOperation = 'lighter';
    g.fillStyle = lingrad(g, 980, 0, 420, 1700, [[0, 'rgba(200,210,230,0.28)'], [1, 'rgba(200,210,230,0)']]);
    poly(g, [880, -50, 1080, -50, 700, 1800, 260, 1800]); g.fill(); g.restore();
    drawMotes(g, t, 300, 0, 700, 1800, 120, '220,228,245', 0.8);
    g.save(); g.beginPath(); g.moveTo(880, -50); g.lineTo(1080, -50); g.lineTo(700, 1800); g.lineTo(260, 1800); g.clip();
    g.globalAlpha = 0.35; drawPersonSide(g, YOU, 520, 1800, 6.8, 1, poseSit(t, 1), { t, expr: 'fear' }); g.restore();
  });
  return { capY: 1300 };
}
// ================================================================== SCENE 26 — RED LIGHTS
function scene26(g, t, lt) {
  setCam(t, { x: 0, y: 0, z: 1.06 - lt * 0.02, shake: 0.08 });
  const on = stationRed(g, t, { near: g => {
    // foreground: YOU hugging Biscuit (red rim light), Rosa holding her keys
    youHugBiscuit(g, t, 300, 1880, 6.4);
    const P = poseIdle(t, 5); P.sh[0] = 0.9; P.el[0] = 1.4;
    drawPersonSide(g, ROSA, 880, 1800, 5.8, -1, P, { t, expr: 'worried', keySwing: 0.3 });
  }, nearGlow: g => { if (emergencyOn(t)) { glow(g, 330, 1500, 300, '#ff3b30', 0.3); glow(g, 860, 1300, 260, '#ff3b30', 0.3); } } });
  if (!on) { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = 'rgba(2,2,4,0.9)'; g.fillRect(0, 0, W, H); g.restore(); }
  return { capY: 1290 };
}
// ================================================================== SCENE 27 — SPEAKER
function scene27(g, t, lt) {
  const cut = LINES[50].s;                   // "The fallout is coming."
  if (t < cut) {
    const u = lt / (cut - SC(27).start);
    setCam(t, { x: 0, y: 0, z: 1.0 + u * 0.25, shake: 0.08 });
    layer(g, 1, g => {
      g.fillStyle = '#6f6b62'; g.fillRect(-200, -200, W + 400, H + 400);
      tileWall(g, -200, 900, W + 400, 1300, 60);
      g.fillStyle = MOSAIC; g.fillRect(-200, 1000, W + 400, 80);
      // ceiling panels
      g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 4; for (let x = -200; x < W + 200; x += 180) line(g, x, -200, x + (x - W / 2) * 0.3, 900);
      drawSpeaker(g, 540, 520, 2.4, t, true);
      // caged emergency light beside it
      g.fillStyle = '#2a2a2a'; rrect(g, 120, 640, 120, 100, 14); g.fill(); g.fillStyle = '#ff3b30'; circle(g, 180, 690, 34); g.fill();
      g.strokeStyle = '#111'; g.lineWidth = 6; for (let k = -1; k <= 1; k++) line(g, 180 + k * 24, 650, 180 + k * 24, 730);
    });
    redLight(g, t);
    layer(g, 1, g => { glow(g, 180, 690, 380, '#ff3b30', 0.5 * (0.6 + 0.4 * pulse(t - SC(26).start, 1.2))); drawMotes(g, t, 0, 300, W, 1300, 70, '255,150,130', 0.5); });
    return { capY: 1400 };
  }
  // through the gate, at the top of the stairs: grey ash drifts down like snow
  setCam(t, { x: 0, y: 0, z: 1.05 + (t - cut) * 0.03, shake: 0.06 });
  layer(g, 1, g => gateView(g, t, { down: 1, sky: 'ash' }));
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'multiply';
  g.fillStyle = lingrad(g, 0, 0, 0, H, [[0, '#c8c2bc'], [0.3, '#a88a8c'], [0.6, '#7a4a52'], [1, '#4a2830']]); g.fillRect(0, 0, W, H); g.restore();
  layer(g, 1, g => { drawAsh(g, t, [UPV.top.x - 40, UPV.top.y - 60, UPV.top.w + 80, 900], 90, 0.9); glow(g, 120, 900, 400, '#ff3b30', 0.35 * pulse(t - SC(26).start, 1.2)); glow(g, 960, 900, 400, '#ff3b30', 0.35 * pulse(t - SC(26).start, 1.2)); });
  return { capY: 1700 };
}
// ================================================================== gate (underground, red) with the man & girl
function bangShake(t) { let s = 0; const t0 = SC(28).start + 1.3; for (let b = t0; b < SC(29).start + 0.5; b += 0.72) if (t >= b) s = Math.max(s, Math.exp(-(t - b) * 7)); return s; }
// ================================================================== SCENE 28 — HOUR THREE
function scene28(g, t, lt) {
  const b = bangShake(t);
  setCam(t, { x: 0, y: 0, z: 1.02, shake: 0.08 + b * 0.25 });
  gateRed(g, t, { shake: b, behind: g => {
    // silhouette of someone on the stairs behind the gate, fist on the bars
    if (lt > 1.0) { g.save(); g.globalAlpha = 0.85; const P = poseFrontIdle(t, 9); P.armR = -1.1; P.elR = 0.4 + b * 0.4; drawPersonFront(g, Object.assign({}, MAN, { top: '#2c2c30', bottom: '#2a2a2e', skin: '#5a4a44' }), 600, 1440, 5.6, P, { t, expr: 'shout' }); g.restore(); }
  }, over: g => {
    // dust puffs from the gate with each bang
    if (b > 0.05) for (let k = 0; k < 14; k++) { const x = UPV.arch.x + hash(k) * UPV.arch.w, y = UPV.arch.y - 20 + (1 - b) * 120 * hash(k + 1); g.fillStyle = `rgba(200,190,180,${b * 0.6})`; circle(g, x, y, 10 + (1 - b) * 26); g.fill(); }
    // everyone turns toward the gate (heads in the foreground)
    const turn = clamp((lt - 1.5) / 0.6);
    [[120, 1900, 0], [330, 1960, 1], [760, 1950, 2], [960, 1880, 3]].forEach(([x, y, k]) => { const C = CROWD[(k * 6 + 1) % 90];
      g.fillStyle = shade(C.top, -0.5); ellipse(g, x, y + 60, 150, 110); g.fill();
      g.save(); g.translate(x, y - 60); g.scale(lerp(1, -0.9, turn) || 0.01, 1); drawHeadSide(g, C, 0, 0, 62, { t, expr: 'fear' }); g.restore(); });
  } });
  return { capY: 1300 };
}
// ================================================================== SCENE 29 — THE MAN AND THE GIRL
function scene29(g, t, lt) {
  const u = lt / (SC(30).start - SC(29).start);
  setCam(t, { x: 0, y: -60 - u * 60, z: lerp(1.25, 1.6, easeInOut(u)), shake: 0.08 });
  gateRed(g, t, { behind: g => manAndGirl(g, t, 560, 1480, 6.2, { cough: true }) });
  return { capY: 1720 };
}
// ================================================================== SCENE 30 — PLEASE
function scene30(g, t, lt) {
  const shake = 0.6 + 0.4 * Math.sin(t * 30);
  setCam(t, { x: 0, y: -120, z: 1.65, shake: 0.3 });
  gateRed(g, t, { shake, behind: g => manAndGirl(g, t, 560, 1460, 6.4, { grip: true, expr: 'shout' }),
    front: g => { // hands gripping the bars
      [[440, 1000], [680, 1000]].forEach(([x, y]) => { g.fillStyle = MAN.skin; rrect(g, x - 34 + shake * 6, y - 40, 68, 84, 26); g.fill(); g.fillStyle = shade(MAN.skin, -0.12); for (let k = 0; k < 4; k++) { rrect(g, x - 30 + shake * 6, y - 40 + k * 20, 60, 16, 8); g.fill(); } });
    } });
  drawBubble(g, t, SC(30).start + 0.05, 560, 360, 'PLEASE! OPEN IT!', 560, 560, 70);
  return { capY: 1700 };
}
// ================================================================== SCENE 31 — THE KEY
function scene31(g, t, lt) {
  const look = LINES[57].s;              // "She looks at you."
  if (t < look - 0.15) {
    setCam(t, { x: 0, y: 0, z: 1.02 + lt * 0.04, shake: 0.08 });
    g.fillStyle = '#2a1418'; g.fillRect(0, 0, W, H);
    blurDraw(g, 6, bg => { bg.drawImage(ST.c, 0, 0); });
    layer(g, 1, g => {
      // Rosa's hand holding the big key ring
      const sw = Math.sin(t * 3) * 0.1;
      g.fillStyle = ROSA.top; rrect(g, -100, 1100, 520, 600, 120); g.fill(); g.fillStyle = '#ff7a00'; g.fillRect(-100, 1180, 520, 140); g.fillStyle = '#e6eef5'; g.fillRect(-100, 1230, 520, 30);
      g.save(); g.translate(560, 760); g.rotate(sw);
      for (let k = 0; k < 9; k++) {           // keys hang from the bottom of the ring
        const a = Math.PI / 2 + (k - 4) * 0.16, kx = Math.cos(a) * 110, ky = Math.sin(a) * 110;
        g.save(); g.translate(kx, ky); g.rotate((k - 4) * 0.12 + Math.sin(t * 4 + k) * 0.06);
        const col = k % 3 === 0 ? '#d4af37' : k % 3 === 1 ? '#b8bec7' : '#9aa3ad';
        g.fillStyle = col; circle(g, 0, 36, 34); g.fill(); g.fillStyle = '#2a1418'; circle(g, 0, 20, 9); g.fill();
        g.fillStyle = col; g.fillRect(-11, 64, 22, 190 + (k % 3) * 30);
        for (let j = 0; j < 5; j++) g.fillRect(11, 150 + (k % 3) * 30 + j * 20, 10 + (j % 2) * 9, 12);
        g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(-7, 70, 5, 170); g.restore();
      }
      g.strokeStyle = '#d8d8d8'; g.lineWidth = 14; circle(g, 0, 0, 110); g.stroke(); g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 110, -2.4, -1.2); g.stroke();
      g.restore();
      // Rosa's hand gripping the top of the ring, sleeve + vest cuff from the upper left
      g.fillStyle = ROSA.top; g.save(); g.translate(300, 420); g.rotate(0.7); rrect(g, -380, -110, 420, 220, 100); g.fill(); g.fillStyle = '#ff7a00'; g.fillRect(-300, -110, 70, 220); g.fillStyle = '#e6eef5'; g.fillRect(-270, -110, 18, 220); g.restore();
      g.fillStyle = ROSA.skin; ellipse(g, 470, 560, 150, 110, 0.5); g.fill();
      g.fillStyle = shade(ROSA.skin, -0.1); for (let k = 0; k < 4; k++) { g.save(); g.translate(500 + k * 40, 600 + k * 10); g.rotate(0.9); rrect(g, -30, -20, 120, 44, 22); g.fill(); g.restore(); }
      g.fillStyle = shade(ROSA.skin, 0.1); ellipse(g, 420, 520, 60, 30, 0.6); g.fill();
    });
    redLight(g, t, 0.8);
    layer(g, 1, g => glow(g, 900, 300, 600, '#ff3b30', 0.3 * pulse(t - SC(26).start, 1.2)));
    return { capY: 1720 };
  }
  // she turns her head and looks straight at you (and the viewer)
  const tu = easeInOut(clamp((t - look + 0.15) / 0.5));
  setCam(t, { x: 0, y: 0, z: 1.0 + (t - look) * 0.05, shake: 0.06 });
  g.fillStyle = '#2a1418'; g.fillRect(0, 0, W, H);
  blurDraw(g, 6, bg => bg.drawImage(ST.c, 0, 0));
  layer(g, 1, g => {
    g.fillStyle = lingrad(g, 0, 1100, 0, H, [[0, ROSA.top], [1, '#0e1422']]); ellipse(g, 540, 1650, 560, 460); g.fill();
    g.fillStyle = '#ff7a00'; poly(g, [100, 1500, 400, 1250, 440, 1920, 60, 1920]); g.fill(); poly(g, [980, 1500, 680, 1250, 640, 1920, 1020, 1920]); g.fill();
    g.fillStyle = '#e6eef5'; poly(g, [90, 1640, 420, 1580, 425, 1640, 80, 1700]); g.fill(); poly(g, [990, 1640, 660, 1580, 655, 1640, 1000, 1700]); g.fill();
    g.save(); g.translate(540, 760); g.scale(lerp(0.82, 1, tu), 1);
    drawHeadFront(g, ROSA, lerp(-60, 0, tu), 0, 260, { t, expr: 'worried', look: [lerp(-0.9, 0, tu), 0], noRim: true, redSide: 0.5 });
    g.restore();
  });
  redLight(g, t, 0.6);
  layer(g, 1, g => glow(g, 980, 600, 500, '#ff3b30', 0.35 * pulse(t - SC(26).start, 1.2)));
  return { capY: 1290 };
}
// ================================================================== SCENE 32 — THE GROWL
function scene32(g, t, lt) {
  const gt = EV.littleGirl;
  if (t < gt) {
    setCam(t, { x: 0, y: 0, z: 1.0 + lt * 0.03, shake: 0.1 });
    blurDraw(g, 5, bg => gateRed(bg, t, { behind: g2 => manAndGirl(g2, t, 560, 1480, 6.2, {}) }));
    layer(g, 1, g => {
      g.fillStyle = 'rgba(30,10,14,0.85)'; g.fillRect(-200, 1560, W + 400, 600);
      drawDog(g, 420, 1960, 10, 1, { mode: 'growl', tail: 'low', hackles: true }, t);
      glow(g, 760, 1300, 400, '#ff3b30', 0.3 * (0.6 + 0.4 * pulse(t - SC(26).start, 1.2)));
    });
    return { capY: 1220 };
  }
  // slow push-in on the girl's face behind the bars: she does not blink, tilts her head
  const u = (t - gt) / (SC(33).start - gt);
  setCam(t, { x: 0, y: 0, z: lerp(1.0, 1.18, easeInOut(u)), shake: 0.04 });
  layer(g, 1, g => {
    g.fillStyle = '#5a5250'; g.fillRect(-200, -200, W + 400, H + 400);
    drawAsh(g, t, [-200, -200, W + 400, H + 400], 120, 0.9);
    g.fillStyle = GIRL.top; ellipse(g, 540, 1650, 460, 420); g.fill();
    g.fillStyle = GIRL.topDark; ellipse(g, 540, 1260, 300, 90); g.fill();
    const tilt = seg(t, gt + 0.3, gt + 0.9) * 0.16;
    g.save(); g.translate(540, 820); g.rotate(tilt);
    drawHeadFront(g, GIRL, 0, 0, 270, { t, expr: 'neutral', look: [0, 0], noBlink: true, noRim: true });
    g.restore();
    drawRabbit(g, 760, 1260, 9, t, Math.sin(t * 1.4) * 0.25);
    // bars in front
    for (let k = 0; k < 6; k++) { const x = 40 + k * 200; limb(g, x, -200, x, H + 200, 34, '#6b6f78'); limb(g, x + 8, -200, x + 8, H + 200, 8, '#b9bec6'); }
    for (let y = -400; y < H; y += 260) for (let k = 0; k < 6; k++) { g.strokeStyle = '#5e626b'; g.lineWidth = 18; line(g, 40 + k * 200, y, 240 + k * 200, y + 260); }
  });
  redLight(g, t, 0.75);
  return { capY: 1290 };
}
// ================================================================== SCENE 33 — CHOICE
function scene33(g, t, lt) {
  setCam(t, { x: 0, y: 0, z: 1.1 + lt * 0.01, shake: 0.06 });
  blurDraw(g, 6, bg => gateRed(bg, t, { behind: g2 => manAndGirl(g2, t, 560, 1480, 6.2, { noBlink: true }) }));
  const dark = seg(t, EV.ep2 - 0.4, EV.ep2 + 0.4);
  g.save(); g.fillStyle = `rgba(6,8,14,${0.35 + 0.45 * dark})`; g.fillRect(0, 0, W, H); g.restore();
  return { capY: 1700, choice: true };
}

// scene list for main.js
const SCENE_LIST = [scene1, scene2, scene3, scene4, scene5, scene6, scene7, scene8, scene9, scene10, scene11, scene12, scene13, scene14, scene15, scene16, scene17,
  scene18, scene19, scene20, scene21, scene22, scene23, scene24, scene25, scene26, scene27, scene28, scene29, scene30, scene31, scene32, scene33];
const SCENE_WHIPS = [14, 16, 17, 19];
