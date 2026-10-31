// ============================================================================
// vehicles.js — side-view vehicles (taxi, sedan, SUV, van, city bus, moto,
// cyclist) with rotating wheels, headlights, brake lights, turn signals,
// hazards, exhaust puffs, windshield reflections and visible occupants.
// Plus a deterministic traffic model (free flow, chain braking).
// ============================================================================
const CAR_COLORS = ['#c0392b', '#2c3e50', '#ecf0f1', '#7f8c8d', '#1f4e79', '#16a085', '#8e44ad', '#d35400', '#34495e', '#bdc3c7', '#0b3d2e', '#6b2737'];
const VEH = {
  sedan: { L: 330, H: 100, roof: 0.42 }, taxi: { L: 330, H: 100, roof: 0.42 }, suv: { L: 350, H: 138, roof: 0.62 },
  van: { L: 390, H: 175, roof: 1 }, bus: { L: 780, H: 260, roof: 1 }, moto: { L: 170, H: 70, roof: 0 },
};
function mkVehicle(type, seed) {
  return {
    type, seed,
    color: type === 'taxi' ? '#f5c518' : type === 'bus' ? '#ffffff' : type === 'van' ? '#f2f2f2' : CAR_COLORS[Math.floor(hash(seed * 3.3) * CAR_COLORS.length)],
    occ: [SKINS[Math.floor(hash(seed) * 10)], SKINS[Math.floor(hash(seed + 1) * 10)]],
    hair: ['#1d140f', '#3b2a1e', '#6b4a2f', '#b8a07a', '#2a2a2a'][Math.floor(hash(seed + 2) * 5)],
    pass: hash(seed + 5) > 0.5,
  };
}
// st: {wheel, brake, dip, lights, hazard, signal, alert, doorOpen, driverOut, interior, honk}
function drawVehicle(g, v, x, y, s, dir, t, st = {}) {
  const D = VEH[v.type], L = D.L, Hh = D.H;
  aoShadow(g, x, y + 2 * s, L * 0.55 * s, 14 * s, 0.45);
  castShadow(g, x, y, L * s, 140 * s, 0.16);
  g.save(); g.translate(x, y); g.scale(s * dir, s);
  if (st.dip) g.rotate(st.dip * 0.035);
  const wheelR = v.type === 'bus' ? 44 : v.type === 'moto' ? 30 : v.type === 'van' ? 36 : 34;
  if (v.type === 'moto') { drawMoto(g, v, t, st, wheelR); g.restore(); return; }
  const by = -wheelR * 0.75;       // body bottom
  const bodyTop = by - Hh;
  const col = v.color;
  // ---- body silhouette
  g.beginPath();
  if (v.type === 'bus') {
    rrect(g, -L / 2, bodyTop, L, Hh, 26);
  } else if (v.type === 'van') {
    g.moveTo(-L / 2, by); g.lineTo(-L / 2, bodyTop + 10); g.quadraticCurveTo(-L / 2, bodyTop, -L / 2 + 10, bodyTop);
    g.lineTo(L * 0.22, bodyTop); g.quadraticCurveTo(L * 0.34, bodyTop + 4, L * 0.42, bodyTop + Hh * 0.45); g.lineTo(L / 2, bodyTop + Hh * 0.55); g.lineTo(L / 2, by); g.closePath();
  } else {
    const hb = bodyTop + Hh * D.roof;   // beltline
    g.moveTo(-L / 2, by); g.lineTo(-L / 2, hb + 8); g.quadraticCurveTo(-L / 2 + 4, hb - 4, -L * 0.36, hb - 6);
    g.lineTo(-L * 0.26, bodyTop + 6); g.quadraticCurveTo(-L * 0.2, bodyTop, -L * 0.1, bodyTop);
    g.lineTo(L * 0.1, bodyTop); g.quadraticCurveTo(L * 0.16, bodyTop + 2, L * 0.24, hb - 8);
    g.lineTo(L * 0.44, hb + 2); g.quadraticCurveTo(L / 2, hb + 6, L / 2, hb + 22); g.lineTo(L / 2, by); g.closePath();
  }
  g.fillStyle = lingrad(g, 0, bodyTop, 0, by, [[0, shade(col, 0.25)], [0.5, col], [1, shade(col, -0.3)]]); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 2; g.stroke();
  // rim light from the sun (right side in world)
  g.save(); g.clip(); g.fillStyle = dir > 0 ? 'rgba(255,220,170,0.25)' : 'rgba(255,220,170,0.1)'; g.fillRect(L * 0.2, bodyTop, L * 0.3, Hh); g.restore();
  // ---- windows & occupants
  const winY0 = v.type === 'bus' ? bodyTop + 40 : v.type === 'van' ? bodyTop + 14 : bodyTop + 10;
  const winY1 = v.type === 'bus' ? bodyTop + 150 : v.type === 'van' ? bodyTop + Hh * 0.42 : bodyTop + Hh * D.roof - 6;
  const wins = [];
  if (v.type === 'bus') { for (let k = 0; k < 6; k++) wins.push([-L / 2 + 40 + k * 112, winY0, 96, winY1 - winY0]); wins.push([L / 2 - 90, winY0 - 10, 70, winY1 - winY0 + 30]); }
  else if (v.type === 'van') wins.push([L * 0.24, winY0, L * 0.15, winY1 - winY0]);
  else { wins.push([-L * 0.24, winY0, L * 0.21, winY1 - winY0]); wins.push([-L * 0.01, winY0, L * 0.2, winY1 - winY0]); }
  wins.forEach(([wx, wy, ww, wh], k) => {
    g.fillStyle = st.interior ? '#f3e6b8' : '#24303f'; rrect(g, wx, wy, ww, wh, 8); g.fill();
    // occupant heads
    const isDriver = (v.type === 'bus' ? k === wins.length - 1 : k === wins.length - 1);
    const occupied = v.type === 'bus' ? (k % 2 === 0 || isDriver) : (isDriver || v.pass);
    if (occupied && !(isDriver && st.driverOut)) {
      const hx = wx + ww * 0.5, hy = wy + wh * 0.55, hr = Math.min(ww, wh) * 0.24;
      g.save(); rrect(g, wx, wy, ww, wh, 8); g.clip();
      g.fillStyle = shade(v.occ[k % 2], -0.15); circle(g, hx, hy, hr); g.fill();
      g.fillStyle = v.hair; g.beginPath(); g.arc(hx, hy - hr * 0.1, hr * 1.02, Math.PI, 0); g.fill();
      g.fillStyle = '#333'; g.fillRect(hx - hr * 1.2, hy + hr * 0.9, hr * 2.4, hr * 2);
      if (st.alert) { g.fillStyle = 'rgba(255,40,40,0.55)'; circle(g, hx + hr * 0.6, hy + hr * 0.2, hr * 0.9); g.fill(); g.fillStyle = '#ff6060'; g.fillRect(hx + hr * 0.7, hy + hr * 0.5, hr * 0.5, hr * 0.8); }
      g.restore();
    }
    if (st.passengerIn && v.type === 'bus' && k === 2) { // the one passenger still inside looking around
      const hx = wx + ww * 0.5 + Math.sin(t * 2.5) * 10, hy = wy + wh * 0.5, hr = ww * 0.2;
      g.fillStyle = SKINS[3]; circle(g, hx, hy, hr); g.fill(); g.fillStyle = '#5a3a22'; g.beginPath(); g.arc(hx, hy - 3, hr, Math.PI, 0); g.fill();
      g.fillStyle = '#7b2d26'; g.fillRect(hx - hr * 1.2, hy + hr, hr * 2.4, hr * 1.6);
      g.fillStyle = '#222'; circle(g, hx + Math.sin(t * 2.5) * 4, hy, 2.5); g.fill();
    }
    // glass reflection streaks (sky + sun)
    g.save(); rrect(g, wx, wy, ww, wh, 8); g.clip();
    g.fillStyle = 'rgba(190,220,250,0.25)'; g.fillRect(wx, wy, ww, wh);
    g.fillStyle = 'rgba(255,255,255,0.35)'; poly(g, [wx + ww * 0.55, wy, wx + ww * 0.75, wy, wx + ww * 0.35, wy + wh, wx + ww * 0.15, wy + wh]); g.fill();
    g.restore();
    g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 3; rrect(g, wx, wy, ww, wh, 8); g.stroke();
  });
  // ---- type details
  if (v.type === 'taxi') {
    g.fillStyle = '#111'; for (let k = 0; k < 14; k++) g.fillRect(-L * 0.42 + k * 20, bodyTop + Hh * 0.62, 10, 8);
    g.fillStyle = '#fff8dc'; rrect(g, -40, bodyTop - 26, 80, 26, 6); g.fill(); g.strokeStyle = '#222'; g.lineWidth = 2; g.stroke();
    flipText(g, 'TAXI', 0, bodyTop - 7, '800 18px Poppins, Arial', '#111', dir);
    flipText(g, 'NH CAB', -L * 0.12, bodyTop + Hh * 0.82, '800 16px Poppins, Arial', '#111', dir);
  }
  if (v.type === 'bus') {
    g.fillStyle = '#1f5fbf'; g.fillRect(-L / 2, bodyTop + 160, L, 60); g.fillStyle = '#7fb3ff'; g.fillRect(-L / 2, bodyTop + 158, L, 6);
    // route sign at the front
    g.fillStyle = '#111'; rrect(g, L / 2 - 240, bodyTop + 6, 220, 30, 6); g.fill();
    flipText(g, '4 DOWNTOWN', L / 2 - 130, bodyTop + 29, '800 22px "Roboto Mono", monospace', '#ffb000', dir);
    flipText(g, 'NEW HARBOR TRANSIT', -60, bodyTop + 200, '800 26px Poppins, Arial', '#ffffff', dir);
    // folding front door
    const dx = L / 2 - 170, dop = st.doorOpen || 0;
    g.fillStyle = st.interior ? '#f3e6b8' : '#24303f'; g.fillRect(dx, bodyTop + 36, 70, Hh - 40);
    g.fillStyle = 'rgba(180,210,240,0.5)'; g.fillRect(dx + dop * 30, bodyTop + 36, 35 * (1 - dop) + 4, Hh - 40); g.fillRect(dx + 35 + dop * 2, bodyTop + 36, 35 * (1 - dop) + 4, Hh - 40);
    g.strokeStyle = '#222'; g.lineWidth = 3; g.strokeRect(dx, bodyTop + 36, 70, Hh - 40);
    if (st.interior) { g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,240,200,0.18)'; g.fillRect(-L / 2, bodyTop + 30, L, 140); g.restore(); }
  }
  if (v.type === 'van') {
    flipText(g, 'QUICKBOX', -L * 0.12, bodyTop + Hh * 0.45, '800 34px Poppins, Arial', '#e85d04', dir);
    flipText(g, 'deliveries', -L * 0.12, bodyTop + Hh * 0.62, '700 18px Poppins, Arial', '#555', dir);
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 2; line(g, L * 0.2, bodyTop + 4, L * 0.2, by);
  }
  // door seams / handles
  if (v.type === 'sedan' || v.type === 'taxi' || v.type === 'suv') {
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 2; line(g, -L * 0.02, bodyTop + 8, -L * 0.02, by - 4); line(g, -L * 0.26, bodyTop + Hh * 0.3, -L * 0.26, by - 4); line(g, L * 0.22, bodyTop + Hh * 0.4, L * 0.22, by - 4);
    g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(-L * 0.08, bodyTop + Hh * 0.5, 22, 5); g.fillRect(L * 0.15, bodyTop + Hh * 0.5, 22, 5);
    if (st.doorOpen) { // open door swung toward camera
      const o = st.doorOpen, dx = -L * 0.02;
      g.fillStyle = '#101418'; g.fillRect(dx, bodyTop + 10, L * 0.24, by - bodyTop - 14);
      g.save(); g.translate(dx + L * 0.24, 0); g.transform(1 - o * 0.55, o * 0.18, 0, 1, 0, 0);
      g.fillStyle = shade(col, -0.05); g.fillRect(-L * 0.24, bodyTop + 6, L * 0.24, by - bodyTop - 8);
      g.fillStyle = 'rgba(190,220,250,0.4)'; g.fillRect(-L * 0.22, bodyTop + 12, L * 0.2, Hh * 0.3);
      g.strokeStyle = 'rgba(0,0,0,0.5)'; g.strokeRect(-L * 0.24, bodyTop + 6, L * 0.24, by - bodyTop - 8);
      g.restore();
    }
  }
  // bumpers
  g.fillStyle = '#2a2d33'; rrect(g, L / 2 - 14, by - 26, 20, 26, 6); g.fill(); rrect(g, -L / 2 - 6, by - 26, 20, 26, 6); g.fill();
  // headlight
  g.fillStyle = '#fff8e0'; rrect(g, L / 2 - 16, by - (v.type === 'bus' ? 70 : 52), 14, 16, 4); g.fill();
  // tail / brake light
  const brake = st.brake || 0;
  g.fillStyle = mix('#7a1010', '#ff2a2a', clamp(0.3 + brake)); rrect(g, -L / 2 - 2, by - (v.type === 'bus' ? 90 : 56), 12, 20, 3); g.fill();
  // signal / hazard (amber)
  const blink = (st.hazard || st.signal) && Math.floor(t * 2.6 + v.seed) % 2 === 0;
  g.fillStyle = blink ? '#ffb000' : '#7a5a10'; g.fillRect(L / 2 - 14, by - 30, 10, 8); g.fillRect(-L / 2 + 2, by - 32, 10, 8);
  // ---- wheels
  const wa = st.wheel || 0;
  const wxs = v.type === 'bus' ? [-L * 0.32, L * 0.3] : [-L * 0.3, L * 0.3];
  wxs.forEach(wx => drawWheel(g, wx, -wheelR, wheelR, wa));
  g.restore();
  // ---- glows in world space
  const fx = x + dir * (L / 2) * s, ry = y + (by - 50) * s;
  if (st.lights) glow(g, fx + dir * 20 * s, y + (by - 44) * s, 90 * s, '#fff2c8', 0.55);
  if (brake > 0.05) glow(g, x - dir * (L / 2) * s, ry, 120 * s, '#ff2020', brake * 0.9);
  if (blink) { glow(g, fx, y + (by - 26) * s, 50 * s, '#ffb000', 0.8); glow(g, x - dir * L / 2 * s, y + (by - 28) * s, 50 * s, '#ffb000', 0.8); }
  if (st.alert) glow(g, x + dir * L * 0.1 * s, y + (bodyTop + 30) * s, 70 * s, '#ff2020', 0.6 + 0.3 * Math.sin(t * 8));
  // exhaust puffs
  if (st.exhaust !== false) for (let k = 0; k < 4; k++) {
    const ph = (t * (st.idle ? 1.2 : 0.8) + k / 4 + v.seed) % 1;
    const ex = x - dir * (L / 2 + 10 + ph * 90) * s, ey = y - 18 * s - ph * 40 * s, r = (8 + ph * 26) * s;
    g.fillStyle = `rgba(200,200,205,${(1 - ph) * 0.35})`; circle(g, ex, ey, r); g.fill();
  }
  // honk sound lines
  if (st.honk) { g.save(); g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 5 * s; g.lineCap = 'round';
    for (let k = 0; k < 3; k++) { const a = (k - 1) * 0.45, r0 = (40 + (t * 120 % 30)) * s; g.beginPath(); g.moveTo(fx + dir * Math.cos(a) * r0, y + (bodyTop * 0.6) * s + Math.sin(a) * r0); g.lineTo(fx + dir * Math.cos(a) * (r0 + 30 * s), y + (bodyTop * 0.6) * s + Math.sin(a) * (r0 + 30 * s)); g.stroke(); }
    g.restore(); }
}
function flipText(g, txt, x, y, font, col, dir) {
  g.save(); g.translate(x, y); g.scale(dir, 1); g.font = font; g.fillStyle = col; g.textAlign = 'center'; g.fillText(txt, 0, 0); g.restore();
}
function drawWheel(g, x, y, r, a) {
  g.fillStyle = '#16181b'; circle(g, x, y, r); g.fill();
  g.fillStyle = lingrad(g, x - r, y - r, x + r, y + r, [[0, '#cfd4da'], [1, '#6b7078']]); circle(g, x, y, r * 0.58); g.fill();
  g.strokeStyle = '#4a4f57'; g.lineWidth = r * 0.12;
  for (let k = 0; k < 5; k++) { const an = a + k * TAU / 5; line(g, x, y, x + Math.cos(an) * r * 0.55, y + Math.sin(an) * r * 0.55); }
  g.fillStyle = '#2a2d33'; circle(g, x, y, r * 0.16); g.fill();
}
function drawMoto(g, v, t, st, r) {
  drawWheel(g, -60, -r, r, st.wheel || 0); drawWheel(g, 60, -r, r, st.wheel || 0);
  g.fillStyle = v.color; poly(g, [-50, -r - 10, 40, -r - 10, 60, -r - 40, 10, -r - 56, -40, -r - 46]); g.fill();
  g.fillStyle = '#222'; rrect(g, -50, -r - 62, 60, 14, 6); g.fill();
  g.strokeStyle = '#888'; g.lineWidth = 5; line(g, 50, -r - 40, 60, -r); line(g, 44, -r - 50, 60, -r - 70);
  // rider
  g.fillStyle = '#222'; rrect(g, -30, -r - 130, 40, 76, 14); g.fill();
  g.strokeStyle = '#222'; g.lineWidth = 12; g.lineCap = 'round'; line(g, -10, -r - 116, 50, -r - 70); line(g, -16, -r - 56, 20, -r - 30);
  g.fillStyle = v.color; circle(g, -4, -r - 150, 22); g.fill(); g.fillStyle = 'rgba(30,40,60,0.9)'; g.fillRect(2, -r - 158, 22, 14);
}
// cyclist (side view), close to camera in foreground passes
function drawCyclist(g, x, y, s, dir, t, seed) {
  g.save(); g.translate(x, y); g.scale(s * dir, s);
  const a = t * 9, r = 34;
  drawWheel(g, -48, -r, r, a); drawWheel(g, 48, -r, r, a);
  g.strokeStyle = '#e63946'; g.lineWidth = 6; poly(g, [-48, -r, -8, -r, 22, -r - 44, -20, -r - 44]); g.stroke(); line(g, 22, -r - 44, 48, -r);
  const p = pal(seed);
  const pedal = [Math.cos(a) * 16, Math.sin(a) * 16];
  g.lineCap = 'round'; g.strokeStyle = p.bottom; g.lineWidth = 14;
  g.beginPath(); g.moveTo(-18, -r - 60); g.lineTo(-2 + pedal[0] * 0.5, -r - 26); g.lineTo(-8 + pedal[0], -r + pedal[1]); g.stroke();
  g.strokeStyle = p.top; g.lineWidth = 26; line(g, -18, -r - 62, 4, -r - 120);
  g.lineWidth = 11; line(g, 4, -r - 112, 22, -r - 60);
  g.fillStyle = SKINS[seed % 10]; circle(g, 12, -r - 142, 17); g.fill();
  g.fillStyle = '#ffb000'; g.beginPath(); g.arc(10, -r - 146, 19, Math.PI, 0); g.fill(); // helmet
  g.restore();
}

// ---------------------------------------------------------------- TRAFFIC MODEL
// lane: {y, dir, speed, s, cars:[{v, x0, tb?, k?}], wrap:[xmin,xmax]}
function carX(c, lane, t) {
  const v = lane.speed * lane.dir;
  let x;
  if (c.tb != null && t > c.tb) { const k = c.k || 2.6; x = c.x0 + v * c.tb + v * (1 - Math.exp(-k * (t - c.tb))) / k; }
  else x = c.x0 + v * t;
  if (lane.wrap && c.tb == null) { const [a, b] = lane.wrap, P = b - a; x = a + (((x - a) % P) + P) % P; }
  return x;
}
function carSpeed(c, lane, t) { if (c.tb != null && t > c.tb) return lane.speed * Math.exp(-(c.k || 2.6) * (t - c.tb)); return lane.speed; }
function drawLane(g, lane, t, st = {}) {
  lane.cars.forEach((c, i) => {
    const x = carX(c, lane, t), sp = carSpeed(c, lane, t);
    const braking = c.tb != null && t > c.tb;
    const sinceB = braking ? t - c.tb : 0;
    const dist = (c.tb != null && t > c.tb) ? c.x0 + lane.speed * c.tb + lane.speed * (1 - Math.exp(-(c.k || 2.6) * (t - c.tb))) / (c.k || 2.6) : c.x0 + lane.speed * t;
    const wheel = dist / (34 * lane.s) * lane.dir;
    const s2 = Object.assign({ wheel, brake: braking ? 1 : (st.brakeAll || 0), dip: braking ? Math.sin(clamp(sinceB / 0.5) * Math.PI) * 1.2 : 0, lights: true }, st, c.st || {});
    if (st.perCar) Object.assign(s2, st.perCar(c, i, t) || {});
    if (sp < 1 && st.idleWhenStopped !== false) s2.idle = true;
    drawVehicle(g, c.v, x, lane.y, lane.s, lane.dir, t, s2);
  });
}
