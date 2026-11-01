// ============================================================================
// ep3/src/audio3.js — Episode 3 mix (overrides renderMix from src/audio.js).
// Narration + underground bed + SFX + dark pad, ducked -8 dB under the voice.
// ============================================================================
async function renderMix(narrArrayBuffer, sampleRate = 48000) {
  const dur = TOTAL + 0.5;
  const ctx = new OfflineAudioContext(2, Math.ceil(dur * sampleRate), sampleRate);
  const ar = mulberry32(4244);
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

  // ---- bed: drone, drips, the one light's buzz, its 1.2 s pulse
  tone(0, TOTAL, { type: 'sawtooth', f: 41.2, filters: [['lowpass', 120]], g: 0.12, a: 1, r: 1, dest: music });
  for (let t = 0.6; t < TOTAL - 1; t += rnd(0.9, 2.2)) { const f = rnd(1400, 2400); tone(t, 0.08, { f, fEnd: f * 0.55, g: 0.05, r: 0.06, pan: rnd(-0.7, 0.7), verb: true }); }
  tone(0, TOTAL, { type: 'square', f: 100, filters: [['lowpass', 300]], g: 0.01, a: 0.5 });
  for (let t = 0.2; t < TOTAL - 1; t += 1.2) tone(t, 0.6, { f: 82.4, g: 0.04, a: 0.2, r: 0.35, dest: music });
  // ---- recap: rewind + memory hits (laugh, lights out), vote chime
  noise(0, 1.9, { filters: [['bandpass', 600, 1, 4000]], g: 0.08, a: 0.1, r: 0.3 });
  [0.75, 0.92, 1.08].forEach(t => tone(t, 0.12, { type: 'triangle', f: 600, fEnd: 560, filters: [['bandpass', 1400, 1.5]], g: 0.03, verb: true }));
  noise(1.45, 0.12, { brown: true, filters: [['lowpass', 250]], g: 0.35 });
  tone(1.9, 0.8, { f: 880, g: 0.06, a: 0.01, r: 0.6 }); tone(1.9, 0.8, { f: 1318, g: 0.04, a: 0.01, r: 0.6 });
  // ---- flashlight click + battery blip
  const click = SC(2).start + 0.75; noise(click, 0.03, { filters: [['highpass', 3000]], g: 0.3 }); tone(click, 0.04, { type: 'square', f: 2200, g: 0.04 });
  tone(EV.battery, 0.12, { f: 1320, g: 0.07 }); tone(EV.battery + 0.15, 0.18, { f: 880, g: 0.07 });
  // ---- footsteps up the stairs + dog claws
  for (let t = SC(3).start + 0.1; t < SC(4).start; t += 0.42) { noise(t, 0.06, { filters: [['lowpass', 600]], g: 0.18, verb: true }); noise(t + 0.2, 0.02, { filters: [['highpass', 3000]], g: 0.04 }); }
  // ---- shaking the bars, ash falling
  for (let t = SC(5).start; t < SC(5).start + 1.6; t += rnd(0.05, 0.11)) noise(t, 0.04, { filters: [['bandpass', rnd(1800, 3800), 6]], g: 0.12 });
  noise(SC(5).start + 0.1, 1.6, { filters: [['bandpass', 400, 2]], g: 0.08 }); noise(SC(5).start + 0.3, 2.0, { filters: [['highpass', 4000]], g: 0.04, a: 0.3, r: 1 });
  // ---- eyes open: sharp intake of breath + sting
  noise(EV.eyesOpen - 0.05, 0.35, { filters: [['bandpass', 1800, 1.2, 900]], g: 0.12, a: 0.03, r: 0.2 });
  tone(EV.eyesOpen, 1.4, { type: 'sawtooth', f: 220, filters: [['lowpass', 900]], g: 0.05, a: 0.02, r: 1.2, dest: music }); tone(EV.eyesOpen, 1.4, { type: 'sawtooth', f: 233, filters: [['lowpass', 900]], g: 0.04, a: 0.02, r: 1.2, dest: music });
  // ---- "where is she" bars rattle
  for (let t = SC(8).start; t < SC(9).start; t += 0.1) noise(t, 0.05, { filters: [['bandpass', rnd(1800, 3500), 6]], g: 0.09 });
  // ---- Rosa's keys
  for (let k = 0; k < 8; k++) tone(SC(9).start + 0.3 + k * 0.06, 0.15, { f: rnd(3500, 6500), g: 0.03, r: 0.12 });
  // ---- he goes pale: heartbeat + rising drone
  for (let t = SC(10).start + 0.1; t < SC(12).start; t += 0.8) { tone(t, 0.12, { f: 55, fEnd: 40, g: 0.45, r: 0.08 }); tone(t + 0.22, 0.12, { f: 50, fEnd: 38, g: 0.34, r: 0.08 }); }
  tone(SC(10).start, SC(12).start - SC(10).start, { type: 'sawtooth', f: 110, fEnd: 165, filters: [['lowpass', 700]], g: 0.04, a: 1, r: 0.2, dest: music });
  // ---- flashback: muffled memory of the panicked street (alert tones, screams, horns), tape warble
  const fb0 = SC(12).start, fb1 = SC(13).start;
  noise(fb0 - 0.05, 0.35, { filters: [['bandpass', 800, 1, 3000]], g: 0.1, a: 0.2, r: 0.1 });
  noise(fb0, fb1 - fb0, { filters: [['bandpass', 700, 0.6]], g: 0.12, a: 0.2, r: 0.3 });
  for (let t = fb0; t < fb1 - 0.2; t += 0.5) { tone(t, 0.24, { type: 'square', f: 853, filters: [['lowpass', 1200]], g: 0.015, vib: [5, 8] }); tone(t + 0.25, 0.24, { type: 'square', f: 960, filters: [['lowpass', 1200]], g: 0.015, vib: [5, 8] }); }
  for (let t = fb0 + 0.3; t < fb1; t += rnd(0.5, 1.0)) noise(t, rnd(0.4, 0.8), { filters: [['bandpass', rnd(900, 1400), 6], ['lowpass', 1500]], g: 0.04, a: 0.05, r: 0.3, pan: rnd(-0.8, 0.8) });
  noise(fb1 - 0.05, 0.35, { filters: [['bandpass', 800, 1, 3000]], g: 0.1, a: 0.2, r: 0.1 });
  // ---- the gate would open: lock rattle, keys
  noise(SC(13).start + 1.0, 0.08, { filters: [['bandpass', 3000, 5]], g: 0.08 }); for (let k = 0; k < 6; k++) tone(SC(13).start + 1.8 + k * 0.06, 0.15, { f: rnd(3500, 6500), g: 0.03, r: 0.12 });
  // ---- rule card whoosh
  noise(EV.rule - 0.05, 0.4, { filters: [['bandpass', 800, 1, 3000]], g: 0.08, a: 0.25, r: 0.15 });
  // ---- trash bag rustle, jacket drop + ash puff
  for (let t = SC(16).start + 0.1; t < SC(16).start + 1.8; t += rnd(0.04, 0.1)) noise(t, 0.06, { filters: [['highpass', 2500]], g: 0.07 });
  noise(EV.jacket + 0.6, 0.25, { brown: true, filters: [['lowpass', 500]], g: 0.35, r: 0.2 }); noise(EV.jacket + 0.65, 0.9, { filters: [['highpass', 3500]], g: 0.05, a: 0.05, r: 0.7 });
  // ---- paper flutter, landing, unfolding; crayon circle
  for (let t = EV.falls + 0.3; t < EV.falls + 1.2; t += 0.07) noise(t, 0.05, { filters: [['bandpass', 2500, 2]], g: 0.05 });
  noise(EV.falls + 1.2, 0.06, { filters: [['bandpass', 1500, 2]], g: 0.08 });
  for (let k = 0; k < 6; k++) noise(EV.drawing + k * 0.08, 0.07, { filters: [['highpass', 2000]], g: 0.06 });
  for (let t = EV.circled; t < EV.circled + 1.0; t += 0.05) noise(t, 0.045, { filters: [['bandpass', 1800, 3]], g: 0.05 });
  // ---- growl
  const gr0 = EV.growl - 0.1, gr1 = SC(19).start + 0.2;
  { const os = ctx.createOscillator(); os.type = 'sawtooth'; os.frequency.setValueAtTime(72, gr0); os.frequency.linearRampToValueAtTime(80, gr1); const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380; lp.Q.value = 5;
    const am = ctx.createOscillator(); am.frequency.value = 23; const amG = ctx.createGain(); amG.gain.value = 0.1; const grG = ctx.createGain(); grG.gain.value = 0;
    os.connect(lp); lp.connect(grG); grG.connect(sfx); am.connect(amG); amG.connect(grG.gain);
    grG.gain.setValueAtTime(0, gr0); grG.gain.linearRampToValueAtTime(0.32, gr0 + 0.4); grG.gain.setValueAtTime(0.32, gr1 - 0.3); grG.gain.linearRampToValueAtTime(0, gr1);
    os.start(gr0); os.stop(gr1 + 0.1); am.start(gr0); am.stop(gr1 + 0.1); }
  noise(gr0, gr1 - gr0, { brown: true, filters: [['bandpass', 220, 3]], g: 0.5, a: 0.4, r: 0.3 });
  // ---- the last light flickers three times
  for (let k = 0; k < 3; k++) { const t = EV.flicker + k * 0.25; tone(t, 0.11, { type: 'square', f: 140, filters: [['lowpass', 1500]], g: 0.06 }); noise(t, 0.05, { filters: [['bandpass', 3000, 3]], g: 0.05 }); }
  // ---- the voice: tunnel air, Biscuit's whine, one tail thump, then silence
  noise(SC(20).start, EV.voice - SC(20).start + 1, { brown: true, filters: [['lowpass', 90]], g: 0.25, a: 1, r: 0.5 });
  noise(SC(20).start + 0.5, 2.4, { filters: [['bandpass', 500, 3]], g: 0.025, a: 1, r: 1, verb: true });
  tone(EV.voice + 1.4, 0.9, { f: 700, fEnd: 480, vib: [8, 20], filters: [['bandpass', 760, 2]], g: 0.07, a: 0.05, r: 0.3 });
  noise(EV.voice + 0.45, 0.08, { brown: true, filters: [['lowpass', 300]], g: 0.25 });
  // ---- tag jingle
  for (let k = 0; k < 5; k++) tone(SC(21).start + 0.2 + k * 0.32, 0.25, { f: 5200 + k * 120, g: 0.03, r: 0.2 });
  // ---- dark pad (drops during flashback), choice ticks, final hit
  [[0.4, SC(12).start, [82.4, 98, 123.5]], [SC(13).start, SC(18).start, [77.8, 98, 116.5]], [SC(18).start, SC(22).start, [73.4, 87.3, 110]], [SC(22).start, TOTAL, [82.4, 98, 123.5, 146.8]]].forEach(([a, b, ch]) =>
    ch.forEach(f => { tone(a, b - a + 0.4, { type: 'sawtooth', f: f * 2, filters: [['lowpass', 600]], g: 0.03, a: 1.2, r: 0.6, dest: music, pan: rnd(-0.5, 0.5) }); tone(a, b - a + 0.4, { f, g: 0.04, a: 1.2, r: 0.6, dest: music }); }));
  for (let k = 0; k < 5; k++) tone(EV.ring + k, 0.06, { f: 1800, g: 0.08, r: 0.05 });
  tone(EV.ep2, 2.5, { f: 55, fEnd: 41, g: 0.5, a: 0.01, r: 2.2 }); noise(EV.ep2, 1.5, { brown: true, filters: [['lowpass', 200]], g: 0.5, r: 1.3 });
  [SC(22).start, EV.ep2, EV.course].forEach(t => noise(t - 0.05, 0.4, { filters: [['bandpass', 800, 1, 3000]], g: 0.08, a: 0.25, r: 0.15 }));
  mGain.gain.setValueAtTime(0.95, TOTAL - 1.2); mGain.gain.linearRampToValueAtTime(0, TOTAL);
  return await ctx.startRendering();
}
