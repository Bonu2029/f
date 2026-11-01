// ============================================================================
// ep2/src/audio2.js — Episode 2 mix (overrides renderMix from src/audio.js).
// Narration + underground bed + SFX + dark pad, ducked -8 dB under the voice.
// ============================================================================
async function renderMix(narrArrayBuffer, sampleRate = 48000) {
  const dur = TOTAL + 0.5;
  const ctx = new OfflineAudioContext(2, Math.ceil(dur * sampleRate), sampleRate);
  const ar = mulberry32(4243);
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

  // ---- underground bed: drone, drips, light buzz, pulse with the red light (stops when the lights go out)
  const out = EV.lightsOut;
  tone(0, TOTAL, { type: 'sawtooth', f: 41.2, filters: [['lowpass', 120]], g: 0.12, a: 1, r: 1, dest: music });
  for (let t = 0.6; t < TOTAL - 1; t += rnd(0.9, 2.2)) { const f = rnd(1400, 2400); tone(t, 0.08, { f, fEnd: f * 0.55, g: 0.05, r: 0.06, pan: rnd(-0.7, 0.7), verb: true }); }
  tone(0, out + 1.5, { type: 'square', f: 100, filters: [['lowpass', 260]], g: 0.012, a: 0.3 });
  for (let t = 0.2; t < out + 1.2; t += 1.2) tone(t, 0.6, { f: 82.4, g: 0.05, a: 0.2, r: 0.35, dest: music });
  // ---- recap: rewind whoosh + memory hits from Ep1 (alert tones, gate slam, growl)
  noise(0, 1.9, { filters: [['bandpass', 600, 1, 4000]], g: 0.08, a: 0.1, r: 0.3 });
  for (let t = 0.02; t < 0.5; t += 0.25) tone(t, 0.22, { type: 'square', f: (t * 4) % 2 < 1 ? 853 : 960, filters: [['lowpass', 3000]], g: 0.03 });
  noise(0.56, 0.4, { brown: true, filters: [['lowpass', 300]], g: 0.6, r: 0.35 }); [210, 347, 512].forEach((f, k) => tone(0.56, 0.9, { type: 'triangle', f, g: 0.05 / (k + 1), r: 0.8 }));
  tone(1.12, 0.8, { type: 'sawtooth', f: 76, filters: [['lowpass', 380, 5]], g: 0.12, a: 0.1, r: 0.3 });
  tone(1.9, 0.8, { f: 880, g: 0.06, a: 0.01, r: 0.6 }); tone(1.9, 0.8, { f: 1318, g: 0.04, a: 0.01, r: 0.6 });   // vote result chime
  // ---- keys, the gate stays locked
  for (let k = 0; k < 10; k++) tone(SC(2).start + 0.6 + k * 0.06 + rnd(0, 0.03), 0.15, { f: rnd(3500, 6500), g: 0.03, r: 0.12 });
  const lockT = L(2) + 0.2;
  for (let k = 0; k < 8; k++) noise(lockT + k * 0.05, 0.04, { filters: [['bandpass', rnd(2000, 4000), 6]], g: 0.09 });
  noise(lockT, 0.3, { brown: true, filters: [['lowpass', 400]], g: 0.4, r: 0.25 });
  // ---- the man stops banging (three bangs, weaker), slides down
  [0.05, 0.6, 1.15].forEach((o, k) => { const t = SC(3).start + o, g = 1 - k * 0.3; noise(t, 0.25, { brown: true, filters: [['lowpass', 400]], g: 0.6 * g, a: 0.002, r: 0.2 }); [260, 410, 655].forEach((f, j) => tone(t, 0.6, { type: 'triangle', f, g: 0.05 * g / (j + 1) * 2, r: 0.5 })); });
  noise(L(4) - 0.5, 0.8, { filters: [['bandpass', 900, 1]], g: 0.06, a: 0.2, r: 0.3 });
  // ---- coughs (stop at "The coughing stops")
  for (let t = SC(3).start + 2.5; t < L(28) - 0.6; t += rnd(3.0, 5.5)) [0, 0.28].forEach(o => noise(t + o, 0.2, { filters: [['bandpass', 600, 2]], g: 0.08, a: 0.01, r: 0.15, pan: -0.2, verb: true }));
  // ---- water bottle, Biscuit's whine, ash hiss
  noise(L(8) + 0.1, 0.25, { filters: [['bandpass', 1200, 3]], g: 0.06 });
  [[L(11) - 0.1, 0.9], [SC(7).start + 1.8, 0.7]].forEach(([t, d]) => tone(t, d, { f: 720, fEnd: 520, vib: [7, 18], filters: [['bandpass', 800, 2]], g: 0.07, a: 0.08, r: 0.3 }));
  noise(EV.hour4, 4.5, { filters: [['highpass', 4000]], g: 0.04, a: 1, r: 1.5 });
  // ---- rule card whoosh, phone blips
  [EV.rule, SC(11).start].forEach(t => noise(t - 0.05, 0.4, { filters: [['bandpass', 800, 1, 3000]], g: 0.08, a: 0.25, r: 0.15 }));
  tone(EV.battery, 0.12, { f: 1320, g: 0.08 }); tone(EV.battery + 0.15, 0.18, { f: 880, g: 0.08 });
  tone(L(26), 0.25, { type: 'square', f: 300, filters: [['lowpass', 1200]], g: 0.05 }); tone(L(26) + 0.3, 0.3, { type: 'square', f: 220, filters: [['lowpass', 1200]], g: 0.05 });
  // ---- the girl is gone: music drops out, heartbeat
  for (let t = EV.gone + 0.1; t < SC(16).start; t += 0.9) { tone(t, 0.12, { f: 55, fEnd: 40, g: 0.5, r: 0.08 }); tone(t + 0.22, 0.12, { f: 50, fEnd: 38, g: 0.38, r: 0.08 }); }
  tone(EV.gone, 0.9, { f: 2400, fEnd: 2300, g: 0.02, a: 0.4, r: 0.4 });
  // ---- rabbit, keys again, sniffing, backing away
  for (let k = 0; k < 8; k++) tone(L(35) + 0.3 + k * 0.06, 0.15, { f: rnd(3500, 6500), g: 0.03, r: 0.12 });
  for (let k = 0; k < 6; k++) noise(SC(17).start + 1.0 + k * 0.22, 0.08, { filters: [['bandpass', 3000, 2]], g: 0.07 });
  tone(L(37), 1.0, { f: 650, fEnd: 420, vib: [8, 22], filters: [['bandpass', 700, 2]], g: 0.08, a: 0.05, r: 0.4 });
  for (let k = 0; k < 5; k++) noise(L(37) + k * 0.18, 0.04, { filters: [['highpass', 2500]], g: 0.05 });     // claws on tiles
  // ---- whip toward the tunnel, then a child's laugh with tunnel reverb
  noise(SC(18).start - 0.05, 0.4, { filters: [['bandpass', 800, 1, 3000]], g: 0.1, a: 0.2, r: 0.15 });
  noise(SC(18).start, SC(19).start - SC(18).start, { brown: true, filters: [['lowpass', 90]], g: 0.25, a: 1, r: 0.5 });
  [0, 0.17, 0.33, 0.5, 0.7].forEach((o, k) => { const t = EV.laugh + o, f = 620 - k * 22 + (k % 2) * 40;
    tone(t, 0.13, { type: 'triangle', f, fEnd: f * 0.92, filters: [['bandpass', 1400, 1.5]], g: 0.05 - k * 0.006, a: 0.01, r: 0.08, verb: true, pan: -0.3 });
    noise(t, 0.1, { filters: [['bandpass', 2600, 5]], g: 0.015, verb: true, pan: -0.3 }); });
  // ---- lights go out one by one (clunk + buzz cut), one stays on
  const n = ST.emerg.length;
  for (let k = n - 2; k >= 0; k--) { const t = EV.lightsOut + 0.25 + (n - 2 - k) * 0.28; noise(t, 0.12, { brown: true, filters: [['lowpass', 250]], g: 0.35 }); tone(t, 0.1, { type: 'square', f: 120, filters: [['lowpass', 900]], g: 0.04 }); }
  tone(EV.lightsOut + 2.5, TOTAL - EV.lightsOut - 2.5, { type: 'square', f: 100, filters: [['lowpass', 300]], g: 0.01, a: 0.5 });
  for (let t = EV.exceptOne; t < EV.exceptOne + 0.5; t += 0.06) if (ar() < 0.6) tone(t, 0.04, { type: 'square', f: 140, filters: [['lowpass', 1500]], g: 0.04 });
  // ---- dark pad (drops out when the girl is gone, returns for the ending)
  [[0.4, EV.gone, [82.4, 98, 123.5]], [SC(16).start, SC(18).start, [77.8, 98, 116.5]], [SC(19).start, SC(20).start, [73.4, 87.3, 110]], [SC(20).start, TOTAL, [82.4, 98, 123.5, 146.8]]].forEach(([a, b, ch]) =>
    ch.forEach(f => { tone(a, b - a + 0.4, { type: 'sawtooth', f: f * 2, filters: [['lowpass', 600]], g: 0.03, a: 1.2, r: 0.6, dest: music, pan: rnd(-0.5, 0.5) }); tone(a, b - a + 0.4, { f, g: 0.04, a: 1.2, r: 0.6, dest: music }); }));
  // ---- choice: ring ticks + final hit
  for (let k = 0; k < 5; k++) tone(EV.ring + k, 0.06, { f: 1800, g: 0.08, r: 0.05 });
  tone(EV.ep2, 2.5, { f: 55, fEnd: 41, g: 0.5, a: 0.01, r: 2.2 }); noise(EV.ep2, 1.5, { brown: true, filters: [['lowpass', 200]], g: 0.5, r: 1.3 });
  [SC(20).start, EV.ep2, EV.course].forEach(t => noise(t - 0.05, 0.4, { filters: [['bandpass', 800, 1, 3000]], g: 0.08, a: 0.25, r: 0.15 }));
  mGain.gain.setValueAtTime(0.95, TOTAL - 1.2); mGain.gain.linearRampToValueAtTime(0, TOTAL);
  return await ctx.startRendering();
}
