// ============================================================================
// ui.js — on-screen system: tracker, countdown chip, survival rule card,
// supplies bar, captions, code chip, phone alert screen, speech bubbles,
// choice card, course card. Plus post FX (grade, grain, vignette).
// ============================================================================
const F_UI = 'Poppins, "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const F_MONO = '"Roboto Mono", "DejaVu Sans Mono", Menlo, Consolas, monospace';
function glassPanel(g, x, y, w, h, r, a = 0.62) {
  g.save();
  g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 30; g.shadowOffsetY = 8;
  g.fillStyle = `rgba(12,16,26,${a})`; rrect(g, x, y, w, h, r); g.fill();
  g.shadowColor = 'transparent';
  g.strokeStyle = 'rgba(255,255,255,0.16)'; g.lineWidth = 2; rrect(g, x + 1, y + 1, w - 2, h - 2, r); g.stroke();
  g.fillStyle = lingrad(g, 0, y, 0, y + h * 0.5, [[0, 'rgba(255,255,255,0.10)'], [1, 'rgba(255,255,255,0)']]); rrect(g, x + 2, y + 2, w - 4, h * 0.5, r); g.fill();
  g.restore();
}
// ---------------------------------------------------------------- CLOCK / COUNTDOWN LOGIC
const CLOCK_STEPS = () => [[0, '8:14 AM'], [SC(8).start, '8:15 AM'], [SC(17).start, '8:17 AM'], [SC(21).start, '8:26 AM'], [EV.white, '8:29 AM']];
function clockText(t) { if (t >= SC(28).start) return ['HOUR 3', '11:30 AM']; let c = '8:14 AM'; CLOCK_STEPS().forEach(([s, v]) => { if (t >= s) c = v; }); return ['DAY 1', c]; }
function countdownSecs(t) {
  const steps = [[EV.alert, 900], [SC(8).start, 840], [SC(17).start, 720], [SC(21).start, 180], [EV.white, 0]];
  let v = null, st = 0;
  steps.forEach(([s, val]) => { if (t >= s) { v = val; st = s; } });
  if (v == null) return null;
  return Math.max(0, v - Math.floor(t - st));
}
// ---------------------------------------------------------------- TRACKER
function drawTracker(g, t, alpha) {
  if (alpha <= 0) return;
  const [d, c] = clockText(t);
  const hourSwap = seg(t, SC(28).start, SC(28).start + 0.4);
  g.save(); g.globalAlpha = alpha;
  const w = 520, h = 120, x = (W - w) / 2, y = 56;
  glassPanel(g, x, y, w, h, 28);
  g.fillStyle = '#ffffff'; g.font = `800 40px ${F_UI}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  const txt = `${d} · ${c}`;
  g.save(); if (hourSwap > 0 && hourSwap < 1) { g.globalAlpha *= hourSwap; g.translate(0, (1 - hourSwap) * 14); } g.fillText(txt, W / 2, y + 40); g.restore();
  // radiation meter: 4 segments
  const level = t < EV.white + 0.2 ? 0 : 2;
  const cols = ['#30d158', '#ffd60a', '#ff9f0a', '#ff3b30'];
  const jump = seg(t, SC(26).start + 0.4, SC(26).start + 1.0);
  g.fillStyle = 'rgba(255,255,255,0.75)'; g.font = `700 20px ${F_UI}`; g.textAlign = 'left'; g.fillText('RAD', x + 34, y + 88);
  for (let k = 0; k < 4; k++) {
    const sx = x + 96 + k * 98, on = t < SC(26).start ? (k === 0) : (k <= 2 && (k < 2 || jump > 0.5 || Math.floor(t * 4) % 2 === 0));
    g.fillStyle = on ? cols[k] : 'rgba(255,255,255,0.12)'; rrect(g, sx, y + 78, 88, 20, 10); g.fill();
    if (on && k === (t < SC(26).start ? 0 : 2)) { g.save(); g.shadowColor = cols[k]; g.shadowBlur = 18; rrect(g, sx, y + 78, 88, 20, 10); g.fill(); g.restore(); }
  }
  g.restore();
  g.textBaseline = 'alphabetic';
}
// ---------------------------------------------------------------- COUNTDOWN CHIP
function drawCountdown(g, t) {
  const v = countdownSecs(t); if (v == null) return;
  const a = seg(t, EV.alert, EV.alert + 0.3) * (1 - seg(t, EV.white + 1.5, EV.white + 2.2));
  if (a <= 0) return;
  const pop = easeOutBack(seg(t, EV.alert, EV.alert + 0.45));
  const jumps = [SC(17).start, SC(21).start, EV.white].map(s => Math.max(0, 1 - Math.abs(t - s - 0.12) * 6)).reduce((p, c) => Math.max(p, c), 0);
  const big = SC(13).start <= t && t < SC(14).start ? 1 + 0.08 * pulse(t, 0.5) : 1;
  const mm = Math.floor(v / 60), ss = v % 60, txt = `${mm}:${String(ss).padStart(2, '0')}`;
  const x = 860, y = 250;
  g.save(); g.globalAlpha = a; g.translate(x, y); g.scale(pop * big * (1 + jumps * 0.25), pop * big * (1 + jumps * 0.25));
  const red = SC(13).start <= t && t < SC(14).start ? 0.6 + 0.4 * pulse(t, 0.5) : 0.75;
  g.shadowColor = 'rgba(255,40,40,0.8)'; g.shadowBlur = 30 * red;
  g.fillStyle = `rgba(200,16,24,${0.85 + 0.15 * red})`; rrect(g, -135, -46, 270, 92, 46); g.fill(); g.shadowBlur = 0;
  g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 2; rrect(g, -134, -45, 268, 90, 45); g.stroke();
  // stopwatch icon
  g.strokeStyle = '#fff'; g.lineWidth = 5; circle(g, -82, 4, 22); g.stroke(); g.fillStyle = '#fff'; g.fillRect(-88, -30, 12, 8);
  g.lineWidth = 4; line(g, -82, 4, -82 + Math.sin(t * 6) * 14, 4 - Math.cos(t * 6) * 14);
  g.fillStyle = '#fff'; g.font = `800 52px ${F_MONO}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 30, 4);
  g.restore(); g.textBaseline = 'alphabetic';
}
// ---------------------------------------------------------------- SURVIVAL RULE CARD
function drawRuleCard(g, t) {
  const t0 = SC(12).start + 0.05, t1 = SC(13).start - 0.15;
  if (t < t0 || t > t1 + 0.4) return;
  const u = easeOutBack(seg(t, t0, t0 + 0.55)), out = seg(t, t1, t1 + 0.35);
  const lines = ['GET INSIDE.', 'GET DOWN.', 'STAY INSIDE.'];
  const w = 860, h = 470, x = (W - w) / 2, y = 560 + (1 - u) * 500 + out * 60;
  g.save(); g.globalAlpha = clamp(u * 1.4) * (1 - out);
  g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 50; g.shadowOffsetY = 18;
  g.fillStyle = '#0f1e3d'; rrect(g, x, y, w, h, 34); g.fill(); g.shadowColor = 'transparent';
  g.save(); rrect(g, x, y, w, h, 34); g.clip(); g.fillStyle = lingrad(g, x, 0, x + w, 0, [[0, '#d4a72c'], [0.5, '#ffe08a'], [1, '#d4a72c']]); g.fillRect(x, y, w, 22);
  g.fillStyle = lingrad(g, 0, y, 0, y + h, [[0, 'rgba(255,255,255,0.06)'], [1, 'rgba(255,255,255,0)']]); g.fillRect(x, y, w, h); g.restore();
  g.strokeStyle = 'rgba(255,224,138,0.35)'; g.lineWidth = 3; rrect(g, x + 2, y + 2, w - 4, h - 4, 32); g.stroke();
  g.fillStyle = '#ffd36b'; g.font = `800 40px ${F_UI}`; g.textAlign = 'center'; g.fillText('SURVIVAL RULE #1', W / 2, y + 100);
  g.fillStyle = 'rgba(255,211,107,0.4)'; g.fillRect(W / 2 - 160, y + 124, 320, 4);
  // the three lines appear with the words "Get inside / Get down / Stay inside"
  const lt = [SC(12).start + 0.9, SC(12).start + 1.9, SC(12).start + 2.9];
  lines.forEach((l, k) => {
    const a = k === 0 ? 1 : seg(t, lt[k] - 0.1, lt[k] + 0.2);
    g.globalAlpha = clamp(u * 1.4) * (1 - out) * (0.25 + 0.75 * a);
    g.fillStyle = '#ffffff'; g.font = `800 76px ${F_UI}`; g.fillText(l, W / 2, y + 220 + k * 92);
  });
  g.restore();
}
// ---------------------------------------------------------------- SUPPLIES BAR
function drawSupplies(g, t) {
  const t0 = SC(26).start + 1.2; if (t < t0) return;
  const u = easeOutBack(seg(t, t0, t0 + 0.6));
  const items = [['water', 'WATER', '1'], ['food', 'FOOD', '0'], ['light', 'LIGHT', '100%'], ['phone', 'PHONE', '41%']];
  const w = 960, h = 92, x = (W - w) / 2, y = 196 + (1 - u) * -40;
  g.save(); g.globalAlpha = clamp(u);
  glassPanel(g, x, y, w, h, 24, 0.58);
  items.forEach(([ic, lab, val], k) => {
    const cx = x + 40 + k * 232;
    drawSupplyIcon(g, ic, cx + 22, y + h / 2);
    g.fillStyle = 'rgba(255,255,255,0.7)'; g.font = `700 20px ${F_UI}`; g.textAlign = 'left'; g.fillText(lab, cx + 56, y + 38);
    g.fillStyle = val === '0' ? '#ff6b5e' : '#ffffff'; g.font = `800 32px ${F_UI}`; g.fillText(val, cx + 56, y + 72);
  });
  g.restore();
}
function drawSupplyIcon(g, ic, x, y) {
  g.save(); g.translate(x, y);
  if (ic === 'water') { g.fillStyle = '#5ac8fa'; g.beginPath(); g.moveTo(0, -24); g.bezierCurveTo(16, -4, 18, 8, 0, 20); g.bezierCurveTo(-18, 8, -16, -4, 0, -24); g.fill(); }
  if (ic === 'food') { g.fillStyle = '#c9ced6'; rrect(g, -14, -18, 28, 36, 6); g.fill(); g.fillStyle = '#ff9f0a'; g.fillRect(-14, -8, 28, 14); }
  if (ic === 'light') { g.fillStyle = '#ffd60a'; poly(g, [-8, 22, 8, 22, 10, -6, 16, -20, -16, -20, -10, -6]); g.fill(); g.fillStyle = '#fff7c2'; g.fillRect(-14, -24, 28, 5); }
  if (ic === 'phone') { g.strokeStyle = '#fff'; g.lineWidth = 3; rrect(g, -12, -22, 24, 44, 5); g.stroke(); g.fillStyle = '#ffd60a'; g.fillRect(-8, 2, 16, 16); }
  g.restore();
}
// ---------------------------------------------------------------- CAPTIONS
let CAP_Y = 1300;
function parseMarkup(s) {
  const out = []; let col = 'w'; const re = /\[(\/?)([grb])\]/g; let last = 0, m;
  while ((m = re.exec(s))) { if (m.index > last) out.push([s.slice(last, m.index), col]); col = m[1] ? 'w' : m[2]; last = re.lastIndex; }
  if (last < s.length) out.push([s.slice(last), col]);
  const words = []; out.forEach(([txt, c]) => txt.split(/(\s+)/).forEach(w => { if (w.trim()) words.push([w, c]); })); return words;
}
const CAP_COL = { w: '#ffffff', g: '#ffc93c', r: '#ff4d4d', b: '#9fd8ff' };
function drawCaptions(g, t) {
  const L = LINES.find(l => t >= l.s - 0.04 && t < l.e + 0.12);
  if (!L) return;
  const a = seg(t, L.s - 0.04, L.s + 0.08) * (1 - seg(t, L.e + 0.02, L.e + 0.12));
  const words = parseMarkup(L.text);
  g.save(); g.font = `800 54px ${F_UI}`;
  const maxW = 900, space = g.measureText(' ').width;
  const rows = [[]]; let rw = 0;
  words.forEach(wd => { const ww = g.measureText(wd[0]).width; if (rw + ww > maxW && rows[rows.length - 1].length) { rows.push([]); rw = 0; } rows[rows.length - 1].push([wd[0], wd[1], ww]); rw += ww + space; });
  if (rows.length > 2) { const all = rows.flat(); rows.length = 0; const half = Math.ceil(all.length / 2); rows.push(all.slice(0, half), all.slice(half)); }
  const lh = 68, padX = 34, padY = 22;
  const widths = rows.map(r => r.reduce((s, w) => s + w[2], 0) + space * (r.length - 1));
  const bw = Math.max(...widths) + padX * 2, bh = rows.length * lh + padY * 2;
  const pop = 0.92 + 0.08 * easeOutBack(seg(t, L.s - 0.04, L.s + 0.18));
  g.globalAlpha = a; g.translate(W / 2, CAP_Y); g.scale(pop, pop);
  g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 24; g.fillStyle = 'rgba(10,12,20,0.72)'; rrect(g, -bw / 2, -bh / 2, bw, bh, 24); g.fill(); g.shadowColor = 'transparent';
  g.textBaseline = 'middle'; g.textAlign = 'left';
  rows.forEach((r, k) => {
    let x = -widths[k] / 2; const y = -bh / 2 + padY + lh * (k + 0.5);
    r.forEach(([w, c, ww]) => {
      g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillText(w, x + 2, y + 3);
      g.fillStyle = CAP_COL[c]; g.fillText(w, x, y); x += ww + space;
    });
  });
  g.restore(); g.textBaseline = 'alphabetic';
}
// ---------------------------------------------------------------- CODE CHIP
function drawCodeChip(g, t, px, py, t0) {
  if (t < t0) return;
  const u = easeOutBack(seg(t, t0, t0 + 0.5));
  const cx = 300, cy = 1010;
  g.save(); g.globalAlpha = clamp(u);
  g.strokeStyle = '#ffd36b'; g.lineWidth = 4; g.setLineDash([3, 12]); g.lineCap = 'round';
  g.lineDashOffset = -t * 40;
  const ex = lerp(cx + 150, px, clamp(u)), ey = lerp(cy, py, clamp(u));
  line(g, cx + 150, cy, ex, ey); g.setLineDash([]);
  circle(g, px, py, 40 + 6 * Math.sin(t * 6)); g.stroke();
  g.translate(cx, cy); g.scale(u, u);
  g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 20;
  g.fillStyle = 'rgba(14,18,30,0.85)'; rrect(g, -170, -40, 340, 80, 40); g.fill(); g.shadowColor = 'transparent';
  g.strokeStyle = '#ffd36b'; g.lineWidth = 3; rrect(g, -168, -38, 336, 76, 38); g.stroke();
  g.fillStyle = lingrad(g, -150, -20, -110, 20, [[0, '#ffe08a'], [1, '#b8861a']]); circle(g, -128, 0, 24); g.fill();
  g.fillStyle = '#1a1a1a'; g.font = `800 28px ${F_UI}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('S', -128, 2);
  g.fillStyle = '#ffd36b'; g.font = `800 30px ${F_UI}`; g.fillText('CODE PIECE 1/7', 28, 2);
  g.restore(); g.textBaseline = 'alphabetic';
}
// ---------------------------------------------------------------- PHONE ALERT SCREEN (close-up)
function drawPhoneScreen(g, t, x, y, s, words, typed) {
  const vib = Math.sin(t * 80) * 6 * s * (Math.floor(t * 1.4) % 2 === 0 ? 1 : 0.3);
  g.save(); g.translate(x + vib, y); g.rotate(-0.04 + Math.sin(t * 60) * 0.004); g.scale(s, s);
  // hand behind phone
  g.fillStyle = YOU.skin; ellipse(g, -250, 380, 120, 200, 0.4); g.fill(); ellipse(g, 260, 300, 60, 150, -0.3); g.fill();
  g.fillStyle = shade(YOU.skin, -0.1); for (let k = 0; k < 3; k++) { rrect(g, 230, -40 + k * 110, 90, 70, 34); g.fill(); }
  g.fillStyle = '#4a5430'; g.fillRect(-420, 520, 340, 300);                       // jacket cuff
  g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 60;
  g.fillStyle = '#0d0d10'; rrect(g, -300, -560, 600, 1180, 80); g.fill(); g.shadowColor = 'transparent';
  g.fillStyle = '#25262b'; rrect(g, -292, -552, 584, 1164, 74); g.fill();
  g.fillStyle = '#120507'; rrect(g, -270, -530, 540, 1120, 58); g.fill();
  g.save(); rrect(g, -270, -530, 540, 1120, 58); g.clip();
  g.fillStyle = lingrad(g, 0, -530, 0, 590, [[0, '#2a0508'], [1, '#0b0204']]); g.fillRect(-270, -530, 540, 1120);
  // status bar
  g.fillStyle = '#fff'; g.font = `700 30px ${F_UI}`; g.textAlign = 'left'; g.fillText('8:14', -220, -470);
  g.fillRect(150, -492, 50, 22); g.fillRect(202, -486, 5, 10); g.fillStyle = '#111'; g.fillRect(180, -489, 17, 16);
  g.fillStyle = '#000'; rrect(g, -70, -508, 140, 40, 20); g.fill();
  // alert card
  const pulseA = 0.75 + 0.25 * Math.sin(t * 9);
  g.fillStyle = `rgba(220,20,30,${pulseA})`; rrect(g, -240, -420, 480, 150, 26); g.fill();
  // warning triangle icon
  g.fillStyle = '#fff'; poly(g, [-180, -310, -130, -400, -80, -310]); g.fill();
  g.fillStyle = '#d0141e'; g.fillRect(-134, -376, 8, 38); g.fillRect(-134, -332, 8, 9);
  g.fillStyle = '#fff'; g.font = `800 40px ${F_UI}`; g.fillText('EMERGENCY', -60, -360); g.fillText('ALERT', -60, -312);
  g.fillStyle = 'rgba(255,255,255,0.15)'; rrect(g, -240, -250, 480, 640, 26); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.7)'; g.font = `700 26px ${F_MONO}`; g.fillText('Emergency Alerts · now', -210, -205);
  g.fillText('8:14 AM', 90, 360);
  // typed body
  g.fillStyle = '#fff'; g.font = `700 44px ${F_MONO}`;
  let lx = -210, ly = -130; const maxX = 215;
  for (let i = 0; i < typed; i++) {
    const w = words[i]; const ww = g.measureText(w + ' ').width;
    if (lx + g.measureText(w).width > maxX) { lx = -210; ly += 62; }
    g.fillStyle = /MISSILE|NOT|DRILL/.test(w) ? '#ffb4b4' : '#fff';
    g.fillText(w, lx, ly); lx += ww;
  }
  if (Math.floor(t * 3) % 2 === 0 && typed < words.length) { g.fillStyle = '#fff'; g.fillRect(lx, ly - 36, 22, 44); }
  g.restore();
  g.restore();
  glow(g, x, y, 900 * s, '#ff2020', 0.35 + 0.15 * Math.sin(t * 9));
}
// ---------------------------------------------------------------- SPEECH BUBBLE
function drawBubble(g, t, t0, x, y, txt, tailX, tailY, size = 64) {
  if (t < t0) return;
  const u = easeOutBack(seg(t, t0, t0 + 0.3));
  g.save(); g.font = `800 ${size}px ${F_UI}`;
  const w = g.measureText(txt).width + 70, h = size + 50;
  g.translate(x, y); g.scale(u, u); g.rotate(Math.sin(t * 20) * 0.01);
  g.shadowColor = 'rgba(0,0,0,0.4)'; g.shadowBlur = 20;
  g.fillStyle = '#ffffff'; rrect(g, -w / 2, -h / 2, w, h, h / 2); g.fill();
  g.beginPath(); g.moveTo(-30, h / 2 - 6); g.lineTo((tailX - x) / u, (tailY - y) / u); g.lineTo(30, h / 2 - 6); g.fill(); g.shadowColor = 'transparent';
  g.strokeStyle = '#111'; g.lineWidth = 5; rrect(g, -w / 2, -h / 2, w, h, h / 2); g.stroke();
  g.fillStyle = '#111'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 0, 4);
  g.restore(); g.textBaseline = 'alphabetic';
}
// ---------------------------------------------------------------- CHOICE / END CARDS
function drawChoiceCard(g, t) {
  const t0 = SC(33).start; if (t < t0) return;
  const u = easeOutBack(seg(t, t0, t0 + 0.6));
  const out = seg(t, EV.ep2 - 0.3, EV.ep2);
  const w = 900, h = 820, x = (W - w) / 2, y = 420 + (1 - u) * 300;
  g.save(); g.globalAlpha = clamp(u) * (1 - out);
  glassPanel(g, x, y, w, h, 44, 0.7);
  g.fillStyle = '#ffffff'; g.font = `800 62px ${F_UI}`; g.textAlign = 'center';
  g.fillText('SO… WHAT WOULD', W / 2, y + 130); g.fillText('YOU DO?', W / 2, y + 208);
  const btn = (tt, yy, c1, c2, label, key) => {
    if (t < tt) return; const b = easeOutBack(seg(t, tt, tt + 0.4));
    g.save(); g.translate(W / 2, yy); g.scale(b, b);
    g.shadowColor = c1; g.shadowBlur = 30 * (0.6 + 0.4 * Math.sin(t * 5));
    g.fillStyle = lingrad(g, -360, 0, 360, 0, [[0, c1], [1, c2]]); rrect(g, -360, -64, 720, 128, 64); g.fill(); g.shadowColor = 'transparent';
    g.fillStyle = 'rgba(255,255,255,0.22)'; rrect(g, -350, -58, 700, 54, 54); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.25)'; circle(g, -290, 0, 42); g.fill();
    g.fillStyle = '#fff'; g.font = `800 50px ${F_UI}`; g.textBaseline = 'middle'; g.fillText(key, -290, 3);
    g.font = `800 50px ${F_UI}`; g.fillText(label, 30, 3);
    g.restore();
  };
  btn(EV.choiceA, y + 330, '#1e6bff', '#38a1ff', 'OPEN THE GATE', 'A');
  btn(EV.choiceB, y + 490, '#e0182d', '#ff4d5a', 'KEEP IT SHUT', 'B');
  // comment + ring countdown
  if (t >= EV.ring) {
    const r = seg(t, EV.ring, EV.ring + 5), ru = easeOut(seg(t, EV.ring, EV.ring + 0.4));
    g.globalAlpha = clamp(u) * (1 - out) * ru;
    g.fillStyle = '#ffd36b'; g.font = `800 46px ${F_UI}`; g.textBaseline = 'middle'; g.fillText('COMMENT YOUR CHOICE', W / 2 - 50, y + 680);
    const rx = W / 2 + 330, ry = y + 680;
    g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 10; circle(g, rx, ry, 44); g.stroke();
    g.strokeStyle = '#ffd36b'; g.lineCap = 'round'; g.beginPath(); g.arc(rx, ry, 44, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - r)); g.stroke();
    g.fillStyle = '#fff'; g.font = `800 40px ${F_UI}`; g.fillText(String(Math.max(0, Math.ceil(5 - (t - EV.ring)))), rx, ry + 2);
  }
  g.restore(); g.textBaseline = 'alphabetic';
  // EPISODE 2 COMING SOON
  if (t >= EV.ep2) {
    const e = easeOutBack(seg(t, EV.ep2, EV.ep2 + 0.6)), eo = seg(t, EV.course + 2.4, EV.course + 3.0);
    g.save(); g.globalAlpha = clamp(e) * (1 - eo * 0.0);
    g.translate(W / 2, 760); g.scale(e, e);
    g.fillStyle = '#ffd36b'; g.font = `800 44px ${F_UI}`; g.textAlign = 'center'; g.fillText('AFTER THE FLASH', 0, -90);
    g.fillStyle = '#fff'; g.font = `800 96px ${F_UI}`; g.fillText('EPISODE 2', 0, 20);
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.font = `800 56px ${F_UI}`; g.fillText('COMING SOON', 0, 100);
    g.fillStyle = '#ff3b30'; g.fillRect(-140, 140, 280, 6);
    g.restore();
  }
}
function drawCourseCard(g, t) {
  if (t < EV.course) return;
  const u = easeOutBack(seg(t, EV.course, EV.course + 0.5));
  const w = 940, h = 220, x = (W - w) / 2, y = 1330 + (1 - u) * 200;
  g.save(); g.globalAlpha = clamp(u);
  g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 40;
  g.fillStyle = lingrad(g, x, y, x + w, y + h, [[0, '#1b1f3a'], [1, '#3a1f4a']]); rrect(g, x, y, w, h, 36); g.fill(); g.shadowColor = 'transparent';
  g.strokeStyle = 'rgba(255,211,107,0.6)'; g.lineWidth = 3; rrect(g, x + 2, y + 2, w - 4, h - 4, 34); g.stroke();
  g.fillStyle = '#ffd36b'; g.font = `800 30px ${F_UI}`; g.textAlign = 'center'; g.fillText('COURSE', W / 2, y + 62);
  g.fillStyle = '#fff'; g.font = `800 50px ${F_UI}`; g.fillText('Make your own AI series', W / 2, y + 128);
  g.fillStyle = 'rgba(255,255,255,0.8)'; g.font = `700 34px ${F_UI}`; g.fillText('link in bio ↑', W / 2, y + 180);
  g.restore();
}
// ---------------------------------------------------------------- POST FX
const GRAIN = [];
function buildGrain() {
  for (let k = 0; k < 4; k++) {
    const c = mkCanvas(W / 2, H / 2), g = c.getContext('2d'), id = g.createImageData(c.width, c.height);
    for (let i = 0; i < id.data.length; i += 4) { const v = RNG() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
    g.putImageData(id, 0, 0); GRAIN.push(c);
  }
  const v = VIGN.c = mkCanvas(W, H), vg = v.getContext('2d');
  vg.fillStyle = radgrad(vg, W / 2, H * 0.48, H * 0.32, H * 0.78, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.55)']]); vg.fillRect(0, 0, W, H);
}
const VIGN = { c: null };
function postFX(g, t, o = {}) {
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  if (o.desat) { g.globalCompositeOperation = 'saturation'; g.fillStyle = `rgba(128,128,128,${o.desat})`; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over'; }
  if (o.redPulse) { g.globalCompositeOperation = 'soft-light'; g.fillStyle = `rgba(255,0,0,${o.redPulse})`; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over'; }
  if (o.tint) { g.globalCompositeOperation = 'multiply'; g.fillStyle = o.tint; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over'; }
  g.globalAlpha = o.vignette == null ? 1 : o.vignette; g.drawImage(VIGN.c, 0, 0);
  g.globalAlpha = 0.05; g.globalCompositeOperation = 'overlay'; g.drawImage(GRAIN[Math.floor(t * 24) % 4], 0, 0, W, H);
  g.restore();
}
