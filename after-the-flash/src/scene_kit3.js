// ============================================================================
// scene_kit3.js — helpers shared from Episode 3 onward: phone-flashlight lighting
// (flashlit), dark gate view, Daniel variants, the child's crayon drawing.
// flashlit(g, t, world, cone, o): world(bg) draws the fully-lit scene;
// cone = [apexX, apexY, targetX, targetY, halfWidthAtTarget] in screen px.
// ============================================================================
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
function gateDark(t, o = {}) { return g2 => layer(g2, 1, g3 => gateView(g3, t, Object.assign({ down: 1, sky: 'ash' }, o))); }
function asleepMan(t, awake) { return g => manSitting(g, t, 650, 1500, 6.0, { asleep: !awake }); }

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
