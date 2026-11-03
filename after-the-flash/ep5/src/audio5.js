// ============================================================================
// ep5/src/audio5.js — Episode 5 mix (overrides renderMix from src/audio.js).
// Narration + underground bed + SFX + dark pad, ducked -8 dB under the voice.
// ============================================================================
async function renderMix(narrArrayBuffer, sampleRate = 48000) {
  const dur = TOTAL + 0.5;
  const ctx = new OfflineAudioContext(2, Math.ceil(dur * sampleRate), sampleRate);
  const ar = mulberry32(4246);
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
  for (let t = 0.6; t < TOTAL - 1; t += rnd(1.2, 2.6)) { const f = rnd(1400, 2400); tone(t, 0.08, { f, fEnd: f * 0.55, g: 0.04, r: 0.06, pan: rnd(-0.7, 0.7), verb: true }); }
  tone(0, TOTAL, { type: 'square', f: 100, filters: [['lowpass', 300]], g: 0.008, a: 0.5 });
  // ---- recap
  noise(0, 1.75, { filters: [['bandpass', 600, 1, 4000]], g: 0.08, a: 0.1, r: 0.3 });
  [0.05, 0.3].forEach(t => tone(t, 0.6, { type: 'triangle', f: 1047, g: 0.02, r: 0.5, verb: true }));
  tone(0.6, 0.6, { type: 'sawtooth', f: 66, filters: [['lowpass', 260]], g: 0.1, r: 0.3 });
  tone(1.75, 0.8, { f: 880, g: 0.06, a: 0.01, r: 0.6 }); tone(1.75, 0.8, { f: 1318, g: 0.04, a: 0.01, r: 0.6 });
  // ---- booth: hushed shuffling, breathing
  for (let t = SC(2).start; t < SC(6).start; t += rnd(0.5, 1.0)) noise(t, 0.3, { filters: [['bandpass', 700, 1.5]], g: 0.025, a: 0.08, r: 0.2, pan: rnd(-0.6, 0.6) });
  for (let t = SC(4).start; t < SC(10).start; t += 1.6) { noise(t, 0.7, { filters: [['bandpass', 1100, 1]], g: 0.02, a: 0.3, r: 0.3 }); noise(t + 0.8, 0.6, { filters: [['bandpass', 900, 1]], g: 0.015, a: 0.2, r: 0.3 }); }
  // ---- light off: click; total dark: heartbeat
  noise(EV.lightOff, 0.03, { filters: [['highpass', 3000]], g: 0.3 }); tone(EV.lightOff, 0.04, { type: 'square', f: 1600, g: 0.04 });
  for (let t = SC(5).start; t < SC(6).start + 1; t += 0.85) { tone(t, 0.12, { f: 55, fEnd: 40, g: 0.4, r: 0.08 }); tone(t + 0.22, 0.12, { f: 50, fEnd: 38, g: 0.3, r: 0.08 }); }
  // ---- rumble + wind
  noise(EV.rumble, 9, { brown: true, filters: [['lowpass', 110]], g: 0.6, a: 1.5, r: 3 });
  tone(EV.rumble, 9, { type: 'sawtooth', f: 38, fEnd: 46, filters: [['lowpass', 180]], g: 0.12, a: 1.5, r: 3 });
  noise(EV.wind, 4.2, { filters: [['bandpass', 500, 0.7, 1400]], g: 0.18, a: 0.6, r: 1.6 });
  for (let t = EV.wind + 0.4; t < EV.wind + 3.6; t += rnd(0.08, 0.2)) noise(t, 0.05, { filters: [['highpass', 3000]], g: 0.04, pan: rnd(-0.8, 0.8) });
  // ---- the lantern: creak, squeal of wheels, radio hiss
  for (let t = EV.lantern + 0.6; t < EV.stop + 0.4; t += 1.4) tone(t, 0.5, { type: 'sawtooth', f: 330, fEnd: 400, vib: [9, 20], filters: [['bandpass', 800, 4]], g: 0.025, a: 0.1, r: 0.2, verb: true });
  for (let t = EV.cart - 1.5; t < EV.stop; t += 0.45) noise(t, 0.08, { filters: [['bandpass', 1500, 3]], g: 0.03 + 0.04 * clamp((t - EV.cart + 1.5) / 6) });
  noise(EV.stop, 0.9, { filters: [['bandpass', 2600, 12, 1900]], g: 0.12, a: 0.02, r: 0.4 }); tone(EV.stop, 0.9, { type: 'sawtooth', f: 2100, fEnd: 1500, filters: [['bandpass', 1900, 8]], g: 0.03, r: 0.4 });
  noise(EV.cart, SC(13).start - EV.cart, { filters: [['bandpass', 2000, 1.5]], g: 0.012, a: 1, r: 0.5, pan: 0.4 });
  // ---- figures: respirator breathing, boots
  const resp = (t0, t1, g = 0.06) => { for (let t = t0; t < t1; t += 2.2) { noise(t, 0.9, { filters: [['bandpass', 1300, 2]], g, a: 0.35, r: 0.4, verb: true }); noise(t + 1.0, 0.8, { filters: [['bandpass', 900, 2]], g: g * 0.8, a: 0.3, r: 0.4, verb: true }); tone(t + 1.0, 0.08, { type: 'square', f: 260, filters: [['bandpass', 700, 5]], g: g * 0.3 }); } };
  resp(SC(10).start, SC(18).start); resp(SC(19).start, SC(24).start);
  for (let t = SC(12).start + 1.2; t < SC(15).start; t += rnd(0.6, 0.9)) noise(t, 0.06, { filters: [['lowpass', 500]], g: 0.18, verb: true });
  noise(SC(12).start + 0.3, 0.3, { filters: [['lowpass', 600]], g: 0.25 }); // climbing onto the platform
  // ---- "fifteen" / "sixteen": low dissonant stings
  [EV.fifteen, EV.sixteen].forEach((t, k) => { tone(t, 1.6, { type: 'sawtooth', f: 110 + k * 7, filters: [['lowpass', 700]], g: 0.05, a: 0.02, r: 1.3, dest: music }); tone(t, 1.6, { type: 'sawtooth', f: 116 + k * 9, filters: [['lowpass', 700]], g: 0.045, a: 0.02, r: 1.3, dest: music }); });
  // ---- Biscuit: a growl that gets stifled
  { const gr0 = SC(17).start + 0.1, gr1 = LINES[21].s + 0.4; const os = ctx.createOscillator(); os.type = 'sawtooth'; os.frequency.value = 74; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 360; lp.Q.value = 5;
    const gg = ctx.createGain(); os.connect(lp); lp.connect(gg); gg.connect(sfx); gg.gain.setValueAtTime(0, gr0); gg.gain.linearRampToValueAtTime(0.22, gr0 + 0.4); gg.gain.setValueAtTime(0.22, gr1 - 0.3); gg.gain.linearRampToValueAtTime(0.0, gr1); os.start(gr0); os.stop(gr1 + 0.1); }
  noise(LINES[21].s + 0.3, 0.6, { filters: [['bandpass', 600, 2]], g: 0.05, a: 0.05, r: 0.4 });           // muffled whimper
  // ---- rule card whoosh
  noise(EV.rule - 0.05, 0.4, { filters: [['bandpass', 800, 1, 3000]], g: 0.06, a: 0.25, r: 0.15 });
  // ---- lost and found: cardboard, fabric
  noise(SC(19).start + 1.1, 0.7, { filters: [['bandpass', 700, 1.5]], g: 0.06, a: 0.1, r: 0.3 });
  for (let k = 0; k < 6; k++) noise(SC(20).start + 0.3 + k * 0.25, 0.18, { filters: [['bandpass', 2400, 1]], g: 0.035 });
  // ---- the letter T: sting
  tone(EV.letterT, 1.6, { f: 1318, g: 0.06, a: 0.005, r: 1.4, verb: true }); tone(EV.letterT, 1.6, { f: 1975, g: 0.03, a: 0.005, r: 1.4, verb: true }); tone(EV.letterT, 1.2, { f: 55, fEnd: 41, g: 0.4, r: 1 });
  // ---- the radio: crackle, then the child's voice line (filtered narration carries it) + chirp
  for (let t = EV.radio; t < SC(23).start; t += rnd(0.03, 0.08)) noise(t, 0.025, { filters: [['bandpass', 2400, 2]], g: 0.07 });
  tone(EV.childVoice - 0.15, 0.1, { type: 'square', f: 1400, g: 0.04 }); tone(EV.childVoice + 0.9, 0.1, { type: 'square', f: 1100, g: 0.04 });
  // ---- he turns: rising drone + glare swell
  tone(EV.turn, SC(24).start - EV.turn + 0.3, { type: 'sawtooth', f: 98, fEnd: 196, filters: [['lowpass', 1200]], g: 0.07, a: 2.4, r: 0.15, dest: music });
  noise(EV.turn + 1.5, 2.0, { filters: [['highpass', 3000, 0.7]], g: 0.05, a: 1.8, r: 0.1 });
  // ---- dark pad, choice ticks, final hit
  [[0.4, SC(5).start, [82.4, 98, 123.5]], [SC(8).start, SC(13).start, [77.8, 98, 116.5]], [SC(13).start, SC(18).start, [73.4, 87.3, 110]], [SC(18).start, SC(23).start, [77.8, 92.5, 116.5]], [SC(24).start, TOTAL, [82.4, 98, 123.5, 146.8]]].forEach(([a, b, ch]) =>
    ch.forEach(f => { tone(a, b - a + 0.4, { type: 'sawtooth', f: f * 2, filters: [['lowpass', 600]], g: 0.028, a: 1.2, r: 0.6, dest: music, pan: rnd(-0.5, 0.5) }); tone(a, b - a + 0.4, { f, g: 0.038, a: 1.2, r: 0.6, dest: music }); }));
  for (let k = 0; k < 5; k++) tone(EV.ring + k, 0.06, { f: 1800, g: 0.08, r: 0.05 });
  tone(EV.ep2, 2.5, { f: 55, fEnd: 41, g: 0.5, a: 0.01, r: 2.2 }); noise(EV.ep2, 1.5, { brown: true, filters: [['lowpass', 200]], g: 0.5, r: 1.3 });
  [SC(24).start, EV.ep2, EV.course].forEach(t => noise(t - 0.05, 0.4, { filters: [['bandpass', 800, 1, 3000]], g: 0.08, a: 0.25, r: 0.15 }));
  mGain.gain.setValueAtTime(0.95, TOTAL - 1.2); mGain.gain.linearRampToValueAtTime(0, TOTAL);
  return await ctx.startRendering();
}
