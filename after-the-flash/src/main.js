// ============================================================================
// main.js — scene dispatch, frame composition, UI overlays, playback, and
// hooks for the render pipeline (window.__T, renderAt, renderAudioWav).
// ============================================================================
const SCENE_FN = [scene1, scene2, scene3, scene4, scene5, scene6, scene7, scene8, scene9, scene10, scene11, scene12, scene13, scene14, scene15, scene16, scene17,
  scene18, scene19, scene20, scene21, scene22, scene23, scene24, scene25, scene26, scene27, scene28, scene29, scene30, scene31, scene32, scene33];
let CANVAS, CTX, READY = false;
function sceneAt(t) { for (let i = SCENES_T.length - 1; i >= 0; i--) if (t >= SCENES_T[i].start) return i; return 0; }
function renderFrame(t) {
  t = clamp(t, 0, TOTAL - 1e-3);
  const g = CTX; performanceT = t;
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none';
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  const i = sceneAt(t), S = SCENES_T[i];
  g.save();
  const info = SCENE_FN[i](g, t, t - S.start, S) || {};
  g.restore();
  g.setTransform(1, 0, 0, 1, 0, 0);
  // whip-pan smear on selected cuts
  const whipCuts = [14, 16, 17, 19];
  if (whipCuts.includes(i + 1)) whipBlur(g, 1 - seg(t, S.start, S.start + 0.18), 1);
  // act colour script
  const act2 = info.act2 ? 1 : 0;
  postFX(g, t, {
    desat: act2 ? 0.2 * seg(t, EV.buzz, EV.buzz + 1.2) : 0,
    redPulse: act2 ? (0.05 + 0.06 * pulse(t, 1.1)) * seg(t, EV.buzz, EV.buzz + 1.2) : 0,
    vignette: info.white ? 1 - info.white : 1,
  });
  // UI
  CAP_Y = info.capY || 1300;
  drawTracker(g, t, seg(t, 1.4, 2.4));
  drawCountdown(g, t);
  drawRuleCard(g, t);
  drawSupplies(g, t);
  drawChoiceCard(g, t);
  drawCourseCard(g, t);
  drawCaptions(g, t);
  // fade from black at the very start, to black at the very end
  const fb = 1 - seg(t, 0, 0.35), fe = seg(t, TOTAL - 0.6, TOTAL);
  if (fb + fe > 0) { g.fillStyle = `rgba(0,0,0,${Math.max(fb, fe)})`; g.fillRect(0, 0, W, H); }
}
function b64ToArrayBuffer(b64) { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; }
function abToB64(ab) { const u = new Uint8Array(ab); let s = ''; const CH = 0x8000; for (let i = 0; i < u.length; i += CH) s += String.fromCharCode.apply(null, u.subarray(i, i + CH)); return btoa(s); }
function init() {
  CANVAS = document.getElementById('c'); CTX = CANVAS.getContext('2d', { alpha: false });
  CANVAS.width = W; CANVAS.height = H;
  buildFar(); buildTowers(); buildCrowd(); buildStrip(); buildUpView(); buildDownView(); buildStation(); buildGrain();
  READY = true; window.__ready = true;
  renderFrame(typeof window.__T === 'number' ? window.__T : 0.8);
}
// --- render-pipeline hooks
window.renderAt = t => { renderFrame(t); return true; };
window.frameJPEG = (t, q = 0.92) => { renderFrame(t); return CANVAS.toDataURL('image/jpeg', q); };
window.renderAudioWav = async () => { const buf = await renderMix(b64ToArrayBuffer(NARRATION_B64)); return abToB64(audioBufferToWav(buf)); };
window.EPISODE = { TOTAL, FPS, SCENES: SCENES_T, LINES };
// --- preview playback
let AC = null, SRC = null, T0 = 0, PLAYING = false, MIX = null;
async function play() {
  const btn = document.getElementById('play'), st = document.getElementById('status');
  btn.disabled = true; st.textContent = 'Preparing sound…';
  if (!MIX) MIX = await renderMix(b64ToArrayBuffer(NARRATION_B64));
  AC = AC || new AudioContext();
  await AC.resume();
  SRC = AC.createBufferSource(); SRC.buffer = MIX; SRC.connect(AC.destination);
  T0 = AC.currentTime + 0.05; SRC.start(T0); PLAYING = true;
  document.getElementById('overlay').style.display = 'none';
  SRC.onended = () => { PLAYING = false; document.getElementById('overlay').style.display = 'flex'; btn.disabled = false; btn.textContent = '▶ Play again'; st.textContent = ''; };
  requestAnimationFrame(loop);
}
let perf = [];
function loop() {
  if (typeof window.__T === 'number') { renderFrame(window.__T); return; }
  if (!PLAYING) return;
  const t = AC.currentTime - T0;
  const a = performance.now(); renderFrame(Math.max(0, t)); perf.push(performance.now() - a); if (perf.length > 120) perf.shift();
  const fps = document.getElementById('perf'); if (fps && perf.length % 30 === 0) fps.textContent = (perf.reduce((s, v) => s + v, 0) / perf.length).toFixed(1) + ' ms/frame';
  requestAnimationFrame(loop);
}
window.addEventListener('load', () => {
  const go = () => { init(); document.getElementById('play').onclick = play; };
  if (document.fonts && document.fonts.load) Promise.all(['800 40px Poppins', '700 40px Poppins', '700 40px "Roboto Mono"'].map(f => document.fonts.load(f))).then(go, go); else go();
});
