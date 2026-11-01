// ============================================================================
// ui_series.js — on-screen system for Episode 2 onward, driven by a per-episode
// config object EPCFG (defined in epN/src/cfgN.js). Later declarations replace
// the Episode 1 versions from src/ui.js.
//
// EPCFG = {
//   clock:   [[t, 'HOUR 3', '11:30 AM'], ...]            tracker steps (first t ignored)
//   rule:    {num, t0, t1, h, lines: [[text, t, colour, size, y], ...]}
//   supplies:{t0, water, food, light, phone: [[t, '41%'], ...], phoneRedAt, waterHL: [a, b]}
//   code:    {letter, n, word}                            code-piece chip
//   vote:    {ep, a, b, won: 'a'|'b'}                     previous episode's vote result
//   choice:  {t0, a, b, next}                             this episode's choice card
// }
// ============================================================================
function clockText(t) { let c = EPCFG.clock[0]; EPCFG.clock.forEach(s => { if (t >= s[0]) c = s; }); return [c[1], c[2]]; }
function drawTracker(g, t, alpha) {
  if (alpha <= 0) return;
  const [d, c] = clockText(t);
  const swaps = EPCFG.clock.slice(1).map(s => seg(t, s[0], s[0] + 0.45)).find(v => v > 0 && v < 1);
  g.save(); g.globalAlpha = alpha;
  const w = 520, h = 120, x = (W - w) / 2, y = 56;
  glassPanel(g, x, y, w, h, 28);
  g.fillStyle = '#ffffff'; g.font = `800 40px ${F_UI}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.save(); if (swaps) { g.globalAlpha *= swaps; g.translate(0, (1 - swaps) * 14); } g.fillText(`${d} · ${c}`, W / 2, y + 40); g.restore();
  const cols = ['#30d158', '#ffd60a', '#ff9f0a', '#ff3b30'];
  g.fillStyle = 'rgba(255,255,255,0.75)'; g.font = `700 20px ${F_UI}`; g.textAlign = 'left'; g.fillText('RAD', x + 34, y + 88);
  for (let k = 0; k < 4; k++) {
    const sx = x + 96 + k * 98, on = k <= 2;
    g.fillStyle = on ? cols[k] : 'rgba(255,255,255,0.12)'; rrect(g, sx, y + 78, 88, 20, 10); g.fill();
    if (k === 2) { g.save(); g.shadowColor = cols[k]; g.shadowBlur = 12 + 8 * Math.sin(t * 3); rrect(g, sx, y + 78, 88, 20, 10); g.fill(); g.restore(); }
  }
  g.restore(); g.textBaseline = 'alphabetic';
}
function drawCountdown() {}
function drawRuleCard(g, t) {
  const R = EPCFG.rule, t0 = R.t0, t1 = R.t1;
  if (t < t0 || t > t1 + 0.4) return;
  const u = easeOutBack(seg(t, t0, t0 + 0.55)), out = seg(t, t1, t1 + 0.35);
  const w = 900, h = R.h, x = (W - w) / 2, y = 520 + (1 - u) * 500 + out * 60;
  g.save(); g.globalAlpha = clamp(u * 1.4) * (1 - out);
  g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 50; g.shadowOffsetY = 18;
  g.fillStyle = '#0f1e3d'; rrect(g, x, y, w, h, 34); g.fill(); g.shadowColor = 'transparent';
  g.save(); rrect(g, x, y, w, h, 34); g.clip(); g.fillStyle = lingrad(g, x, 0, x + w, 0, [[0, '#d4a72c'], [0.5, '#ffe08a'], [1, '#d4a72c']]); g.fillRect(x, y, w, 22); g.restore();
  g.strokeStyle = 'rgba(255,224,138,0.35)'; g.lineWidth = 3; rrect(g, x + 2, y + 2, w - 4, h - 4, 32); g.stroke();
  g.fillStyle = '#ffd36b'; g.font = `800 40px ${F_UI}`; g.textAlign = 'center'; g.fillText(`SURVIVAL RULE #${R.num}`, W / 2, y + 100);
  g.fillStyle = 'rgba(255,211,107,0.4)'; g.fillRect(W / 2 - 160, y + 124, 320, 4);
  R.lines.forEach(([txt, tt, col, size, ly]) => {
    const a = seg(t, tt - 0.1, tt + 0.25);
    g.globalAlpha = clamp(u * 1.4) * (1 - out) * (0.18 + 0.82 * a);
    g.fillStyle = col; g.font = `800 ${size}px ${F_UI}`; g.fillText(txt, W / 2, y + ly);
  });
  g.restore();
}
function drawSupplies(g, t) {
  const S = EPCFG.supplies; if (t < S.t0) return;
  const u = easeOutBack(seg(t, S.t0, S.t0 + 0.6));
  let phone = S.phone[0][1], drop = 0; S.phone.forEach(([pt, v], k) => { if (t >= pt) phone = v; if (k > 0) drop = Math.max(drop, Math.max(0, 1 - Math.abs(t - pt - 0.15) * 3)); });
  const water = S.waterHL && t >= S.waterHL[0] && t < S.waterHL[1] ? pulse(t, 0.6) : 0;
  const items = [['water', 'WATER', S.water, water], ['food', 'FOOD', S.food, 0], ['light', 'LIGHT', S.light, 0], ['phone', 'PHONE', phone, drop]];
  const w = 960, h = 92, x = (W - w) / 2, y = 196 + (1 - u) * -40;
  g.save(); g.globalAlpha = clamp(u);
  glassPanel(g, x, y, w, h, 24, 0.58);
  items.forEach(([ic, lab, val, hl], k) => {
    const cx = x + 40 + k * 232;
    if (hl > 0) { g.save(); g.globalAlpha *= hl; g.fillStyle = 'rgba(255,80,70,0.35)'; rrect(g, cx - 14, y + 8, 216, h - 16, 18); g.fill(); g.restore(); }
    drawSupplyIcon(g, ic, cx + 22, y + h / 2);
    g.fillStyle = 'rgba(255,255,255,0.7)'; g.font = `700 20px ${F_UI}`; g.textAlign = 'left'; g.fillText(lab, cx + 56, y + 38);
    g.fillStyle = val === '0' || (ic === 'phone' && t >= S.phoneRedAt) ? '#ff6b5e' : '#ffffff'; g.font = `800 32px ${F_UI}`; g.fillText(val, cx + 56, y + 72);
  });
  g.restore();
}
function drawCodeChip(g, t, px, py, t0) {
  if (t < t0) return;
  const C = EPCFG.code, u = easeOutBack(seg(t, t0, t0 + 0.5)), cx = 320, cy = 1000;
  g.save(); g.globalAlpha = clamp(u);
  g.strokeStyle = '#ffd36b'; g.lineWidth = 4; g.setLineDash([3, 12]); g.lineCap = 'round'; g.lineDashOffset = -t * 40;
  line(g, cx + 160, cy, lerp(cx + 160, px, clamp(u)), lerp(cy, py, clamp(u))); g.setLineDash([]);
  circle(g, px, py, 46 + 6 * Math.sin(t * 6)); g.stroke();
  g.translate(cx, cy); g.scale(u, u);
  g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 20; g.fillStyle = 'rgba(14,18,30,0.85)'; rrect(g, -180, -40, 360, 80, 40); g.fill(); g.shadowColor = 'transparent';
  g.strokeStyle = '#ffd36b'; g.lineWidth = 3; rrect(g, -178, -38, 356, 76, 38); g.stroke();
  g.fillStyle = lingrad(g, -160, -20, -120, 20, [[0, '#ffe08a'], [1, '#b8861a']]); circle(g, -138, 0, 24); g.fill();
  g.fillStyle = '#1a1a1a'; g.font = `800 28px ${F_UI}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(C.letter, -138, 2);
  g.fillStyle = '#ffd36b'; g.font = `800 30px ${F_UI}`; g.fillText(`CODE PIECE ${C.n}/7`, 22, 2);
  g.font = `700 20px ${F_UI}`; g.fillStyle = 'rgba(255,255,255,0.75)'; g.fillText(C.word, 22, 64);
  g.restore(); g.textBaseline = 'alphabetic';
}
function drawVoteResult(g, t, t0) {
  if (t < t0) return;
  const V = EPCFG.vote, u = easeOutBack(seg(t, t0, t0 + 0.5));
  const w = 860, h = 300, x = (W - w) / 2, y = 1440;
  g.save(); g.globalAlpha = clamp(u); g.translate(W / 2, y + h / 2); g.scale(u, u); g.translate(-W / 2, -(y + h / 2));
  glassPanel(g, x, y, w, h, 36, 0.72);
  g.fillStyle = '#ffd36b'; g.font = `800 30px ${F_UI}`; g.textAlign = 'center'; g.fillText(`EPISODE ${V.ep} · YOUR VOTE`, W / 2, y + 58);
  const opt = (label, yy, hh, won, cols) => {
    if (!won) { g.save(); g.globalAlpha *= 0.45; g.fillStyle = cols[0]; rrect(g, x + 40, yy, w - 80, hh, hh / 2); g.fill(); g.fillStyle = '#fff'; g.font = `800 34px ${F_UI}`; g.textBaseline = 'middle'; g.fillText(label, W / 2, yy + hh / 2 + 1); g.restore(); return; }
    const glowA = 0.6 + 0.4 * Math.sin(t * 6);
    g.shadowColor = cols === A ? '#38a1ff' : '#ff3b30'; g.shadowBlur = 30 * glowA; g.fillStyle = lingrad(g, x, 0, x + w, 0, [[0, cols[0]], [1, cols[1]]]); rrect(g, x + 40, yy, w - 80, hh, hh / 2); g.fill(); g.shadowColor = 'transparent';
    g.fillStyle = '#fff'; g.font = `800 40px ${F_UI}`; g.textBaseline = 'middle'; g.fillText(label + '  ✓', W / 2, yy + hh / 2 + 2);
  };
  const A = ['#1e6bff', '#38a1ff'], B = ['#e0182d', '#ff4d5a'];
  opt(V.a, y + 88, V.won === 'a' ? 84 : 70, V.won === 'a', A);
  opt(V.b, y + 176, V.won === 'b' ? 84 : 70, V.won === 'b', B);
  g.restore(); g.textBaseline = 'alphabetic';
}
function drawChoiceCard(g, t) {
  const C = EPCFG.choice, t0 = C.t0; if (t < t0) return;
  const u = easeOutBack(seg(t, t0, t0 + 0.6)), out = seg(t, EV.ep2 - 0.3, EV.ep2);
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
    g.font = `800 48px ${F_UI}`; g.fillText(label, 30, 3);
    g.restore();
  };
  btn(EV.choiceA, y + 330, '#1e6bff', '#38a1ff', C.a, 'A');
  btn(EV.choiceB, y + 490, '#e0182d', '#ff4d5a', C.b, 'B');
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
  if (t >= EV.ep2) {
    const e = easeOutBack(seg(t, EV.ep2, EV.ep2 + 0.6));
    g.save(); g.globalAlpha = clamp(e); g.translate(W / 2, 760); g.scale(e, e);
    g.fillStyle = '#ffd36b'; g.font = `800 44px ${F_UI}`; g.textAlign = 'center'; g.fillText('AFTER THE FLASH', 0, -90);
    g.fillStyle = '#fff'; g.font = `800 96px ${F_UI}`; g.fillText(`EPISODE ${C.next}`, 0, 20);
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.font = `800 56px ${F_UI}`; g.fillText('COMING SOON', 0, 100);
    g.fillStyle = '#ff3b30'; g.fillRect(-140, 140, 280, 6);
    g.restore();
  }
}
