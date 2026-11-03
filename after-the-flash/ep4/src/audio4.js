// ============================================================================
// ep4/src/audio4.js — Episode 4 mix (overrides renderMix from src/audio.js).
// Narration + underground bed + SFX + dark pad, ducked -8 dB under the voice.
// ============================================================================
async function renderMix(narrArrayBuffer, sampleRate = 48000) {
  const dur = TOTAL + 0.5;
  const ctx = new OfflineAudioContext(2, Math.ceil(dur * sampleRate), sampleRate);
  const ar = mulberry32(4245);
  const narr = await ctx.decodeAudioData(narrArrayBuffer.slice(0));
  const mkNoise = (secs, brown) => { const b = ctx.createBuffer(1, secs * sampleRate, sampleRate), d = b.getChannelData(0); let last = 0; for (let i = 0; i < d.length; i++) { const w = ar() * 2 - 1; if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; } return b; };
  const WHITE = mkNoise(4, false), BROWN = mkNoise(4, true);
  const master = ctx.createDynamicsCompressor(); master.threshold.value = -10; master.ratio.value = 3; master.attack.value = 0.01; master.release.value = 0.2;
  const mGain = ctx.createGain(); mGain.gain.value = 0.95; master.connect(mGain); mGain.connect(ctx.destination);
  const duck = ctx.createGain(); duck.connect(master);
  const music = ctx.createGain(); music.gain.value = 0.55; music.connect(duck);
  const sfx = ctx.createGain(); sfx.gain.value = 0.9; sfx.connect(duck);
  const voice = ctx.createGain(); voice.gain.value = 1.0; voice.connect(master);
  // tunnel reverb (deterministic decaying-noise impulse response)
  const ir = ctx.createBuffer(2, Math.floor(3.2 * sampleRate), sampleRate);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (ar() * 2 - 1) * Math.pow(1 - i / d.length, 3); }
  const verb = ctx.createConvolver(); verb.buffer = ir; const verbG = ctx.createGain(); verbG.gain.value = 0.6; verb.connect(verbG); verbG.connect(sfx);
  const vs = ctx.createBufferSource(); vs.buffer = narr; vs.connect(voice); vs.start(0);
  duck.gain.setValueAtTime(1, 0);
  LINES.forEach((l, i) => { const nxt = LINES[i + 1]; duck.gain.setTargetAtTime(0.4, Math.max(0, l.s - 0.06), 0.03); if (!nxt || nxt.s - l.e > 0.45) duck.gain.setTargetAtTime(1, l.e + 0.05, 0.12); });
  const panner = (p, dest) => { const s = ctx.createStereoPanner(); s.pan.value = clamp(p, -1, 1); s.connect(dest); return s; };
  function envelope(p, t0, d, peak, a, r) { p.setValueAtTime(0, t0); p.linearRampToValueAtTime(peak, t0 + Math.min(a, d * 0.5)); p.setValueAtTime(peak, Math.max(t0 + a, t0 + d - r)); p.linearRampToValueAtTime(0, t0 + d); }
  function noise(t0, d, o = {}) {
    const src = ctx.createBufferSource(); src.buffer = o.brown ? BROWN : WHITE; src.loop = true; let node = src;
    (o.filters || []).forEach(([type, f, q, fEnd]) => { const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t0); if (fEnd) fl.frequency.exponentialRampToValueAtTime(fEnd, t0 + d); if (q) fl.Q.value = q; node.connect(fl); node = fl; });
    const gn = ctx.createGain(); node.connect(gn); gn.connect(panner(o.pan || 0, o.dest || sfx)); if (o.verb) gn.connect(verb);
    envelope(gn.gain, t0, d, o.g == null ? 0.3 : o.g, o.a == null ? 0.01 : o.a, o.r == null ? 0.05 : o.r);
    src.start(t0, ar() * 3); src.stop(t0 + d + 0.1); return gn;
  }
  function tone(t0, d, o = {}) {
    const os = ctx.createOscillator(); os.type = o.type || 'sine'; os.frequency.setValueAtTime(o.f || 440, t0);
    if (o.fEnd) os.frequency.exponentialRampToValueAtTime(o.fEnd, t0 + d);
    if (o.vib) { const lfo = ctx.createOscillator(); lfo.frequency.value = o.vib[0]; const lg = ctx.createGain(); lg.gain.value = o.vib[1]; lfo.connect(lg); lg.connect(os.frequency); lfo.start(t0); lfo.stop(t0 + d + 0.1); }
    let node = os;
    (o.filters || []).forEach(([type, f, q]) => { const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; if (q) fl.Q.value = q; node.connect(fl); node = fl; });
    const gn = ctx.createGain(); node.connect(gn); gn.connect(panner(o.pan || 0, o.dest || sfx)); if (o.verb) gn.connect(verb);
    envelope(gn.gain, t0, d, o.g == null ? 0.2 : o.g, o.a == null ? 0.005 : o.a, o.r == null ? 0.05 : o.r);
    os.start(t0); os.stop(t0 + d + 0.1); return os;
  }
  const rnd = (a, b) => a + (b - a) * ar();
  const L = i => LINES[i].s;

  // ---- bed: drone, drips, the one light's buzz + pulse
  tone(0, TOTAL, { type: 'sawtooth', f: 41.2, filters: [['lowpass', 120]], g: 0.12, a: 1, r: 1, dest: music });
  for (let t = 0.6; t < TOTAL - 1; t += rnd(0.9, 2.2)) { const f = rnd(1400, 2400); tone(t, 0.08, { f, fEnd: f * 0.55, g: 0.05, r: 0.06, pan: rnd(-0.7, 0.7), verb: true }); }
  tone(0, TOTAL, { type: 'square', f: 100, filters: [['lowpass', 300]], g: 0.01, a: 0.5 });
  for (let t = 0.2; t < TOTAL - 1; t += 1.2) tone(t, 0.6, { f: 82.4, g: 0.04, a: 0.2, r: 0.35, dest: music });
  // ---- recap
  noise(0, 1.9, { filters: [['bandpass', 600, 1, 4000]], g: 0.08, a: 0.1, r: 0.3 });
  noise(0.05, 0.3, { filters: [['bandpass', 1800, 1.2, 900]], g: 0.08, r: 0.2 }); for (let t = 0.75; t < 1.3; t += 0.05) noise(t, 0.04, { filters: [['bandpass', 1800, 3]], g: 0.03 });
  for (let k = 0; k < 4; k++) tone(1.45 + k * 0.12, 0.2, { f: 5200 + k * 150, g: 0.025, r: 0.15 });
  tone(1.9, 0.8, { f: 880, g: 0.06, a: 0.01, r: 0.6 }); tone(1.9, 0.8, { f: 1318, g: 0.04, a: 0.01, r: 0.6 });
  // ---- key turns, lock clicks
  for (let k = 0; k < 6; k++) tone(SC(2).start + 0.2 + k * 0.06, 0.15, { f: rnd(3500, 6500), g: 0.03, r: 0.12 });
  noise(EV.clicks - 0.4, 0.4, { filters: [['bandpass', 2200, 3]], g: 0.05 });
  noise(EV.clicks, 0.05, { filters: [['bandpass', 3500, 5]], g: 0.3 }); tone(EV.clicks, 0.06, { type: 'square', f: 1800, filters: [['bandpass', 1800, 4]], g: 0.06 });
  // ---- gate lifts (chain rattle + motor-less scrape), daylight hiss
  for (let t = EV.lifts; t < EV.lifts + 1.4; t += rnd(0.04, 0.09)) noise(t, 0.04, { filters: [['bandpass', rnd(2000, 4200), 7]], g: 0.07 });
  noise(EV.lifts, 1.4, { filters: [['bandpass', 380, 2]], g: 0.1, a: 0.2, r: 0.2 }); noise(EV.lifts + 0.8, 2.0, { filters: [['highpass', 4000]], g: 0.03, a: 0.5, r: 1 });
  // ---- crawl: cloth scrape on concrete, breathing, ash patter
  for (let t = SC(4).start + 0.2; t < SC(5).start; t += 0.62) { noise(t, 0.35, { filters: [['bandpass', 900, 1.5]], g: 0.07, a: 0.08, r: 0.2 }); noise(t + 0.3, 0.25, { filters: [['bandpass', 1400, 2]], g: 0.03, a: 0.05, r: 0.15 }); }
  noise(SC(4).start + 1.5, 2.0, { filters: [['highpass', 3500]], g: 0.035, a: 0.3, r: 0.8 });
  // ---- slam
  const slam = EV.slam + 0.25;
  noise(slam, 0.6, { brown: true, filters: [['lowpass', 300]], g: 1.0, a: 0.002, r: 0.5 });
  [210, 347, 512, 803, 1190].forEach((f, k) => tone(slam, 1.5 - k * 0.2, { type: 'triangle', f, g: 0.07 / (k + 1) * 2, a: 0.001, r: 1.1 - k * 0.15, verb: true }));
  tone(slam, 0.4, { f: 60, fEnd: 35, g: 0.6, r: 0.35 }); noise(slam + 0.5, 0.06, { filters: [['bandpass', 3500, 5]], g: 0.2 });
  // ---- Biscuit: claws, sniffs, one tail thump
  for (let t = SC(6).start; t < SC(6).start + 1.2; t += 0.18) noise(t, 0.02, { filters: [['highpass', 3000]], g: 0.05 });
  for (let k = 0; k < 6; k++) noise(LINES[9].s + 0.05 + k * 0.2, 0.08, { filters: [['bandpass', 3000, 2]], g: 0.07 });
  noise(LINES[9].s + 0.8, 0.08, { brown: true, filters: [['lowpass', 300]], g: 0.2 });
  tone(SC(7).start + 0.3, 1.6, { f: 523, g: 0.025, a: 0.4, r: 1, dest: music }); tone(SC(7).start + 0.3, 1.6, { f: 659, g: 0.02, a: 0.4, r: 1, dest: music });
  // ---- bottle: plastic crinkle, cap, swallow
  for (let k = 0; k < 6; k++) noise(SC(9).start + 0.3 + k * 0.05, 0.04, { filters: [['highpass', 3000]], g: 0.06 });
  noise(LINES[13].s + 0.1, 0.12, { filters: [['bandpass', 400, 3]], g: 0.12 }); noise(LINES[13].s + 0.35, 0.18, { filters: [['bandpass', 250, 2]], g: 0.1 });
  // ---- seven letters: seven soft chimes as the slots appear, low swell
  for (let k = 0; k < 7; k++) tone(EV.slots + 0.1 + k * 0.08, 0.6, { f: [523, 587, 659, 0, 0, 0, 0][k] || 392, g: k < 3 ? 0.05 : 0.025, a: 0.005, r: 0.5, verb: true });
  tone(EV.slots, 3.0, { type: 'sawtooth', f: 98, fEnd: 147, filters: [['lowpass', 600]], g: 0.05, a: 1.2, r: 0.8, dest: music });
  tone(LINES[20].s, 1.2, { f: 659, g: 0.06, a: 0.01, r: 1, verb: true });
  // ---- rule card whoosh
  noise(EV.rule - 0.05, 0.4, { filters: [['bandpass', 800, 1, 3000]], g: 0.08, a: 0.25, r: 0.15 });
  // ---- ticket booth: keys, latch, door creak
  for (let k = 0; k < 8; k++) tone(EV.booth + 0.2 + k * 0.06, 0.15, { f: rnd(3500, 6500), g: 0.03, r: 0.12 });
  noise(EV.booth + 0.75, 0.06, { filters: [['bandpass', 3000, 5]], g: 0.2 }); tone(EV.booth + 0.9, 0.9, { type: 'sawtooth', f: 240, fEnd: 340, vib: [11, 25], filters: [['bandpass', 600, 4]], g: 0.04, a: 0.1, r: 0.3 });
  // ---- supplies: plastic shrink-wrap rip, bottles clink, cracker box shake; two-note lift as counts roll
  for (let t = EV.water + 0.2; t < EV.water + 0.9; t += 0.03) noise(t, 0.03, { filters: [['highpass', 2500]], g: 0.05 });
  for (let k = 0; k < 11; k++) tone(EV.water + 0.9 + k * 0.09, 0.08, { f: 900 + k * 60, g: 0.025, r: 0.06 });
  for (let k = 0; k < 6; k++) { noise(EV.crackers + 0.2 + k * 0.09, 0.06, { filters: [['bandpass', 4500, 2]], g: 0.05 }); }
  // ---- smiles: soft warm chord, quiet murmur
  [262, 330, 392].forEach(f => tone(SC(16).start, 3.6, { f, g: 0.03, a: 1, r: 1.2, dest: music }));
  noise(SC(16).start, 3.6, { filters: [['bandpass', 500, 0.8]], g: 0.03, a: 0.8, r: 1 });
  // ---- lost and found: cardboard lid
  noise(SC(17).start + 0.8, 0.9, { filters: [['bandpass', 700, 1.5]], g: 0.08, a: 0.1, r: 0.4 });
  // ---- the raincoat: detuned music-box phrase, then silence
  [[0, 1047], [0.35, 880], [0.7, 784], [1.05, 659], [1.6, 698], [2.1, 659]].forEach(([o, f]) => { tone(SC(18).start + 0.4 + o, 1.0, { type: 'triangle', f: f * 1.01, g: 0.03, a: 0.002, r: 0.9, verb: true }); tone(SC(18).start + 0.4 + o, 1.0, { f: f * 2.02, g: 0.008, a: 0.002, r: 0.8 }); });
  // ---- the gold L: sting
  tone(EV.letterL, 1.6, { f: 1318, g: 0.06, a: 0.005, r: 1.4, verb: true }); tone(EV.letterL, 1.6, { f: 1975, g: 0.03, a: 0.005, r: 1.4, verb: true }); tone(EV.letterL, 1.2, { f: 55, fEnd: 41, g: 0.4, r: 1 });
  // ---- rails hum → something approaching
  tone(EV.hum, TOTAL - EV.hum, { type: 'sawtooth', f: 60, filters: [['lowpass', 260]], g: 0.0001, a: 0.01, r: 0.5 });
  { const os = ctx.createOscillator(); os.type = 'sawtooth'; os.frequency.setValueAtTime(58, EV.hum); os.frequency.linearRampToValueAtTime(74, SC(22).start + 2); const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(200, EV.hum); lp.frequency.linearRampToValueAtTime(900, SC(22).start + 2);
    const gg = ctx.createGain(); os.connect(lp); lp.connect(gg); gg.connect(sfx); gg.gain.setValueAtTime(0, EV.hum); gg.gain.linearRampToValueAtTime(0.12, EV.hum + 1.5); gg.gain.linearRampToValueAtTime(0.22, SC(22).start + 1); gg.gain.linearRampToValueAtTime(0, SC(22).start + 2.5); os.start(EV.hum); os.stop(SC(22).start + 2.6); }
  for (let t = EV.hum + 0.2; t < SC(22).start + 2; t += 0.07) noise(t, 0.03, { filters: [['bandpass', rnd(3000, 5000), 6]], g: 0.02 * (1 + (t - EV.hum) / 4) });
  noise(EV.coming, 3.2, { brown: true, filters: [['lowpass', 120]], g: 0.4, a: 2, r: 0.8 });
  for (let t = EV.coming + 0.4; t < SC(22).start; t += 0.38) { noise(t, 0.1, { filters: [['bandpass', 900, 2]], g: 0.18 }); tone(t, 0.12, { type: 'sawtooth', f: 330, fEnd: 260, filters: [['bandpass', 900, 3]], g: 0.05 }); }   // barking
  // ---- dark pad, choice ticks, final hit
  [[0.4, SC(7).start, [82.4, 98, 123.5]], [SC(8).start, SC(16).start, [77.8, 98, 116.5]], [SC(17).start, SC(20).start, [73.4, 87.3, 110]], [SC(22).start, TOTAL, [82.4, 98, 123.5, 146.8]]].forEach(([a, b, ch]) =>
    ch.forEach(f => { tone(a, b - a + 0.4, { type: 'sawtooth', f: f * 2, filters: [['lowpass', 600]], g: 0.03, a: 1.2, r: 0.6, dest: music, pan: rnd(-0.5, 0.5) }); tone(a, b - a + 0.4, { f, g: 0.04, a: 1.2, r: 0.6, dest: music }); }));
  for (let k = 0; k < 5; k++) tone(EV.ring + k, 0.06, { f: 1800, g: 0.08, r: 0.05 });
  tone(EV.ep2, 2.5, { f: 55, fEnd: 41, g: 0.5, a: 0.01, r: 2.2 }); noise(EV.ep2, 1.5, { brown: true, filters: [['lowpass', 200]], g: 0.5, r: 1.3 });
  [SC(22).start, EV.ep2, EV.course].forEach(t => noise(t - 0.05, 0.4, { filters: [['bandpass', 800, 1, 3000]], g: 0.08, a: 0.25, r: 0.15 }));
  mGain.gain.setValueAtTime(0.95, TOTAL - 1.2); mGain.gain.linearRampToValueAtTime(0, TOTAL);
  return await ctx.startRendering();
}
