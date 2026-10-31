// ============================================================================
// audio.js — full mix generated in code (Web Audio), rendered offline so the
// browser preview and the MP4 use the identical mix: narration + music + SFX,
// with sidechain-style ducking (-8 dB) of music/SFX while the voice speaks.
// ============================================================================
async function renderMix(narrArrayBuffer, sampleRate = 48000) {
  const dur = TOTAL + 0.5;
  const ctx = new OfflineAudioContext(2, Math.ceil(dur * sampleRate), sampleRate);
  const ar = mulberry32(4242);                                   // audio has its own seeded generator
  const narr = await ctx.decodeAudioData(narrArrayBuffer.slice(0));
  // ---- noise buffers (deterministic)
  const mkNoise = (secs, brown) => { const b = ctx.createBuffer(1, secs * sampleRate, sampleRate), d = b.getChannelData(0); let last = 0; for (let i = 0; i < d.length; i++) { const w = ar() * 2 - 1; if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; } return b; };
  const WHITE = mkNoise(4, false), BROWN = mkNoise(4, true);
  // ---- buses
  const master = ctx.createDynamicsCompressor(); master.threshold.value = -10; master.ratio.value = 3; master.attack.value = 0.01; master.release.value = 0.2;
  const mGain = ctx.createGain(); mGain.gain.value = 0.95; master.connect(mGain); mGain.connect(ctx.destination);
  const duck = ctx.createGain(); duck.connect(master);
  const cut = ctx.createGain(); cut.connect(duck);               // hard cut for the flash silence
  const music = ctx.createGain(); music.gain.value = 0.55; music.connect(cut);
  const sfx = ctx.createGain(); sfx.gain.value = 0.9; sfx.connect(cut);
  const voice = ctx.createGain(); voice.gain.value = 1.0; voice.connect(master);
  const vs = ctx.createBufferSource(); vs.buffer = narr; vs.connect(voice); vs.start(0);
  // ducking under every spoken line
  duck.gain.setValueAtTime(1, 0);
  LINES.forEach((l, i) => {
    const nxt = LINES[i + 1];
    duck.gain.setTargetAtTime(0.4, Math.max(0, l.s - 0.06), 0.03);
    if (!nxt || nxt.s - l.e > 0.45) duck.gain.setTargetAtTime(1, l.e + 0.05, 0.12);
  });
  // flash: everything but the voice cuts at "white", returns at "the ground jumps"
  cut.gain.setValueAtTime(1, 0); cut.gain.setValueAtTime(1, EV.white - 0.01); cut.gain.linearRampToValueAtTime(0, EV.white + 0.02);
  cut.gain.setValueAtTime(0, SC(24).start - 0.02); cut.gain.linearRampToValueAtTime(1, SC(24).start);
  // ---- helpers
  const panner = (p, dest) => { const s = ctx.createStereoPanner(); s.pan.value = clamp(p, -1, 1); s.connect(dest); return s; };
  function noise(t0, d, o = {}) {
    const src = ctx.createBufferSource(); src.buffer = o.brown ? BROWN : WHITE; src.loop = true;
    let node = src;
    (o.filters || []).forEach(([type, f, q, fEnd]) => { const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t0); if (fEnd) fl.frequency.exponentialRampToValueAtTime(fEnd, t0 + d); if (q) fl.Q.value = q; node.connect(fl); node = fl; });
    const gn = ctx.createGain(); node.connect(gn); gn.connect(panner(o.pan || 0, o.dest || sfx));
    envelope(gn.gain, t0, d, o.g == null ? 0.3 : o.g, o.a == null ? 0.01 : o.a, o.r == null ? 0.05 : o.r);
    src.start(t0, ar() * 3); src.stop(t0 + d + 0.1);
    return gn;
  }
  function tone(t0, d, o = {}) {
    const os = ctx.createOscillator(); os.type = o.type || 'sine'; os.frequency.setValueAtTime(o.f || 440, t0);
    if (o.fEnd) os.frequency.exponentialRampToValueAtTime(o.fEnd, t0 + d);
    let node = os;
    (o.filters || []).forEach(([type, f, q]) => { const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; if (q) fl.Q.value = q; node.connect(fl); node = fl; });
    const gn = ctx.createGain(); node.connect(gn); gn.connect(panner(o.pan || 0, o.dest || sfx));
    envelope(gn.gain, t0, d, o.g == null ? 0.2 : o.g, o.a == null ? 0.005 : o.a, o.r == null ? 0.05 : o.r);
    os.start(t0); os.stop(t0 + d + 0.1);
    return os;
  }
  function envelope(p, t0, d, peak, a, r) { p.setValueAtTime(0, t0); p.linearRampToValueAtTime(peak, t0 + Math.min(a, d * 0.5)); p.setValueAtTime(peak, Math.max(t0 + a, t0 + d - r)); p.linearRampToValueAtTime(0, t0 + d); }
  const rnd = (a, b) => a + (b - a) * ar();
  const PANIC = SC(8).start, CHAOS = SC(9).start, FROZEN = SC(7).start;

  // ============ CITY BED (0 → frozen) ============
  noise(0, FROZEN, { brown: true, filters: [['lowpass', 220]], g: 0.5, a: 1.5, r: 0.05 });                      // traffic rumble
  const mur = noise(0, FROZEN, { filters: [['bandpass', 520, 0.6]], g: 0.05, a: 1.0, r: 0.05 });                 // crowd murmur
  for (let t = 0.3; t < SC(4).start + 2; t += rnd(0.25, 0.9)) {                                                   // birds
    const f = rnd(2400, 4200); tone(t, rnd(0.06, 0.14), { f, fEnd: f * rnd(1.2, 1.6), g: 0.035, pan: rnd(-0.8, 0.8) });
    if (ar() < 0.5) tone(t + 0.12, 0.08, { f: f * 1.1, fEnd: f * 0.9, g: 0.03, pan: rnd(-0.8, 0.8) });
  }
  [3.1, 9.0, 9.35, 12.6, 15.4, 19.3, 24.8].forEach((t, k) => {                                                    // horns (taxi honk at "Taxis honking")
    const near = k === 1 || k === 2; [0, 1].forEach(j => tone(t, near ? 0.28 : 0.4, { type: 'square', f: [349, 440][j] * (near ? 1 : 0.9), filters: [['bandpass', 900, 1.2]], g: near ? 0.07 : 0.025, pan: near ? 0.3 : rnd(-0.9, 0.9) }));
  });
  noise(SC(3).start, SC(4).start - SC(3).start + 3, { filters: [['highpass', 3500]], g: 0.035, a: 0.6, r: 1.5, pan: -0.4 });           // food cart sizzle
  for (let t = SC(3).start; t < SC(4).start + 2; t += rnd(0.03, 0.12)) noise(t, 0.012, { filters: [['highpass', 5000]], g: 0.05, pan: -0.4 }); // crackle
  [10.45, 11.4].forEach(t => { [0, 0.18, 0.36].forEach((o, k) => tone(t + o, 0.16, { type: 'sawtooth', f: 180 + k * 30, filters: [['bandpass', 1100, 3]], g: 0.04, pan: -0.5 })); }); // vendor calling
  for (let t = SC(2).start; t < SC(3).start; t += 0.42) {                                                         // footsteps + dog-tag jingle
    noise(t, 0.05, { filters: [['lowpass', 700]], g: 0.12, pan: 0.1 });
    tone(t + 0.1, 0.12, { f: 5200 + rnd(-300, 300), g: 0.02, r: 0.1, pan: 0.2 }); tone(t + 0.13, 0.1, { f: 6400 + rnd(-300, 300), g: 0.015, r: 0.08, pan: 0.2 });
  }
  noise(SC(1).start, 4, { filters: [['bandpass', 1200, 0.4]], g: 0.02, a: 2, r: 1 });                             // wind high above skyline

  // ============ PHONE ALERT (buzz → frozen) ============
  for (let p = 0; p < 9; p++) {
    const off = rnd(0, 0.16), pan = -0.9 + p * 0.225, gg = 0.022 + rnd(0, 0.012);
    for (let t = EV.buzz + off; t < FROZEN - 0.05; t += 0.5) {
      tone(t, 0.24, { type: 'square', f: 853, filters: [['lowpass', 3000]], g: gg, pan, a: 0.004, r: 0.01 });
      tone(t + 0.25, 0.24, { type: 'square', f: 960, filters: [['lowpass', 3000]], g: gg, pan, a: 0.004, r: 0.01 });
    }
    for (let t = EV.buzz + off; t < FROZEN; t += 1.0) tone(t, 0.45, { type: 'square', f: 150, filters: [['lowpass', 300]], g: 0.03, pan });  // vibration
  }
  // ============ MUSIC: pulsing synth alert → slam, cut at flash ============
  const mStart = EV.alert, mEnd = EV.white;
  const bassF = ctx.createBiquadFilter(); bassF.type = 'lowpass'; bassF.Q.value = 6; bassF.frequency.setValueAtTime(180, mStart); bassF.frequency.linearRampToValueAtTime(1600, SC(21).start); bassF.connect(music);
  const notes = [55, 55, 65.4, 55, 49, 55, 58.3, 55];
  for (let t = mStart, i = 0; t < mEnd; t += 0.25, i++) {
    if (t >= FROZEN && t < PANIC) continue;                                      // frozen: heartbeat only
    const gg = 0.16 + 0.12 * seg(t, mStart, SC(21).start);
    tone(t, 0.22, { type: 'sawtooth', f: notes[i % 8], g: gg, dest: bassF, a: 0.005, r: 0.12 });
    tone(t, 0.22, { type: 'sine', f: notes[i % 8] / 2, g: gg * 0.9, dest: music, r: 0.12 });
    if (i % 4 === 0 && t > PANIC) noise(t, 0.08, { filters: [['lowpass', 180]], g: 0.35, dest: music });          // kick
    if (i % 2 === 1 && t > CHAOS) noise(t, 0.04, { filters: [['highpass', 7000]], g: 0.06, dest: music });        // hats
  }
  [[PANIC, SC(14).start, [110, 131, 165]], [SC(14).start, SC(18).start, [98, 117, 147]], [SC(18).start, mEnd, [104, 123, 156]]].forEach(([a, b, ch]) =>
    ch.forEach(f => tone(a, b - a, { type: 'sawtooth', f: f * 2, filters: [['lowpass', 900]], g: 0.035, a: 1.5, r: 0.3, dest: music, pan: rnd(-0.4, 0.4) })));
  tone(SC(21).start - 3, 3, { type: 'sawtooth', f: 220, fEnd: 880, filters: [['lowpass', 2500]], g: 0.05, a: 2.8, r: 0.05, dest: music });  // riser into the slam
  // heartbeat during the frozen second
  for (let t = FROZEN + 0.15; t < PANIC; t += 0.86) { tone(t, 0.12, { f: 55, fEnd: 40, g: 0.6, r: 0.08 }); tone(t + 0.22, 0.12, { f: 50, fEnd: 38, g: 0.45, r: 0.08 }); }

  // ============ PANIC SFX ============
  const screech = (t, pan, g = 0.12) => { noise(t, 0.9, { filters: [['bandpass', 2600, 12, 1700]], g, a: 0.02, r: 0.3, pan }); tone(t, 0.9, { type: 'sawtooth', f: 1900, fEnd: 1300, filters: [['bandpass', 1800, 8]], g: g * 0.25, pan, r: 0.3 }); };
  screech(PANIC + 0.6, 0.2, 0.16); screech(SC(8).start + 2.95, -0.3); screech(SC(8).start + 3.95, 0.5); screech(SC(8).start + 4.3, -0.6, 0.08);
  [[SC(8).start + 1.8, 0.4], [SC(8).start + 2.1, 0.4]].forEach(([t, p]) => [0, 1].forEach(j => tone(t, 0.25, { type: 'square', f: [392, 494][j], filters: [['bandpass', 1000, 1]], g: 0.06, pan: p })));  // driver honks then freezes
  noise(PANIC, TOTAL - PANIC, { brown: true, filters: [['lowpass', 160]], g: 0.3, a: 2, r: 0.1 });                 // idling engines
  const door = (t, pan) => { noise(t, 0.12, { filters: [['lowpass', 500]], g: 0.45, pan, r: 0.08 }); tone(t, 0.08, { type: 'square', f: 1400, filters: [['bandpass', 1400, 4]], g: 0.05, pan }); };
  for (let k = 0; k < 9; k++) door(CHAOS + 0.05 + k * 0.28 + rnd(0, 0.1), rnd(-0.9, 0.9));
  const scream = (t, pan, g = 0.07) => { const d = rnd(0.5, 1.1), f = rnd(900, 1500); noise(t, d, { filters: [['bandpass', f, 6, f * rnd(0.8, 1.3)], ['peaking', f * 2, 4]], g, a: 0.05, r: 0.3, pan }); tone(t, d, { type: 'sawtooth', f: rnd(500, 800), fEnd: rnd(400, 900), filters: [['bandpass', f, 5]], g: g * 0.5, pan, a: 0.05, r: 0.3 }); };
  for (let t = CHAOS + 0.2; t < SC(18).start; t += rnd(0.35, 1.1)) scream(t, rnd(-0.9, 0.9), t < SC(12).start ? 0.07 : 0.035);
  noise(CHAOS, SC(18).start - CHAOS, { filters: [['bandpass', 700, 0.5]], g: 0.12, a: 0.5, r: 1.5 });              // panicked crowd bed
  for (let t = CHAOS; t < SC(18).start; t += rnd(0.08, 0.16)) noise(t, 0.03, { filters: [['lowpass', 900]], g: 0.07, pan: rnd(-0.8, 0.8) }); // running feet
  for (let k = 0; k < 40; k++) noise(CHAOS + 0.3 + k * 0.025, 0.04, { filters: [['bandpass', 1500, 1]], g: 0.08, pan: rnd(-0.6, 0.6) });  // pigeons flapping
  // bus: idle engine + door hiss
  noise(SC(10).start + 0.1, 0.5, { filters: [['highpass', 2500]], g: 0.12, a: 0.01, r: 0.3, pan: 0.2 });
  const bus = tone(SC(10).start, SC(11).start - SC(10).start + 0.5, { type: 'sawtooth', f: 38, filters: [['lowpass', 220]], g: 0.18, a: 0.3, r: 0.4 });
  // coffee drop: impact + splash + droplets
  const cImp = SC(11).start + 0.75;
  noise(cImp, 0.08, { filters: [['lowpass', 1200]], g: 0.4 }); noise(cImp + 0.02, 0.5, { filters: [['bandpass', 2500, 1, 900]], g: 0.18, r: 0.35 });
  for (let k = 0; k < 10; k++) noise(cImp + 0.08 + rnd(0, 0.5), 0.02, { filters: [['bandpass', rnd(3000, 6000), 6]], g: 0.07, pan: rnd(-0.5, 0.5) });
  // whooshes for cards / whip pans
  [SC(12).start, SC(14).start, SC(16).start, SC(17).start, SC(19).start, SC(33).start, EV.ep2, EV.course].forEach(t => noise(t - 0.05, 0.4, { filters: [['bandpass', 800, 1, 3000]], g: 0.08, a: 0.25, r: 0.15 }));
  // revolving doors / crowd going right
  // ============ GATE ============
  for (let t = SC(18).start + 0.2; t < SC(21).start; t += rnd(0.07, 0.2)) {                                  // rattle + chain
    noise(t, 0.03, { filters: [['bandpass', rnd(2000, 4500), 8]], g: 0.05, pan: rnd(-0.3, 0.3) });
    if (ar() < 0.25) tone(t, 0.18, { type: 'triangle', f: rnd(1800, 2600), g: 0.012, r: 0.15 });
  }
  noise(SC(18).start + 0.3, SC(21).start - SC(18).start - 0.3, { filters: [['bandpass', 400, 2]], g: 0.05, a: 0.3, r: 0.1 });   // gate rolling
  noise(SC(20).start + 0.1, 0.9, { filters: [['bandpass', 1800, 2]], g: 0.08, a: 0.05, r: 0.4 });                    // backpack scraping
  const slam = SC(21).start + 0.05;
  noise(slam, 0.6, { brown: true, filters: [['lowpass', 300]], g: 1.0, a: 0.002, r: 0.5 });
  [210, 347, 512, 803, 1190].forEach((f, k) => tone(slam, 1.6 - k * 0.2, { type: 'triangle', f, g: 0.07 / (k + 1) * 2, a: 0.001, r: 1.2 - k * 0.15 }));
  tone(slam, 0.4, { f: 60, fEnd: 35, g: 0.6, r: 0.35 });
  noise(SC(21).start + 0.75, 0.05, { filters: [['bandpass', 3500, 5]], g: 0.18 }); noise(SC(21).start + 1.1, 0.12, { filters: [['bandpass', 2200, 4]], g: 0.12 });  // lock click + key turn
  // ============ FLASH: silence. Then the shockwave ============
  const jump = SC(24).start;
  tone(jump, 3.5, { f: 40, fEnd: 26, g: 1.0, a: 0.02, r: 2.5, dest: sfx });
  noise(jump, 4.5, { brown: true, filters: [['lowpass', 140]], g: 1.1, a: 0.05, r: 3 });
  noise(jump + 0.1, 3.5, { filters: [['lowpass', 900, 0.5, 200]], g: 0.25, a: 0.1, r: 2 });
  for (let k = 0; k < 18; k++) noise(jump + 0.2 + rnd(0, 2.5), 0.06, { filters: [['bandpass', rnd(800, 2500), 3]], g: 0.08, pan: rnd(-0.8, 0.8) }); // tiles cracking / debris
  noise(SC(24).start + 2.1, 3.5, { filters: [['highpass', 2500]], g: 0.05, a: 0.3, r: 1.5 });                          // dust trickle
  for (let t = jump + 0.5; t < EV.lightsDie; t += 0.11) if (ar() < 0.5) tone(t, 0.06, { type: 'square', f: 120, filters: [['lowpass', 1200]], g: 0.03 });   // lights struggling
  noise(EV.lightsDie, 0.15, { brown: true, filters: [['lowpass', 200]], g: 0.4 }); tone(EV.lightsDie, 0.3, { type: 'sawtooth', f: 90, fEnd: 30, filters: [['lowpass', 400]], g: 0.08 });   // power dies
  // ============ UNDERGROUND ============
  const ug = SC(25).start;
  tone(ug, TOTAL - ug, { type: 'sawtooth', f: 41.2, filters: [['lowpass', 120]], g: 0.12, a: 3, r: 1, dest: music });           // low drone
  for (let t = ug + 0.5; t < TOTAL - 1; t += rnd(0.8, 2.2)) { const f = rnd(1400, 2400); tone(t, 0.08, { f, fEnd: f * 0.55, g: 0.05, r: 0.06, pan: rnd(-0.7, 0.7) }); }   // dripping
  const red = SC(26).start;
  [0, 0.35, 0.65].forEach(o => { noise(red + o, 0.1, { filters: [['bandpass', 120, 2]], g: 0.15 }); tone(red + o, 0.1, { type: 'square', f: 100, filters: [['lowpass', 800]], g: 0.05 }); });
  tone(red + 0.9, TOTAL - red - 1, { type: 'square', f: 100, filters: [['lowpass', 260]], g: 0.012, a: 0.3, dest: sfx });         // light buzz
  for (let t = red + 1; t < TOTAL - 1; t += 1.2) tone(t, 0.6, { f: 82.4, g: 0.05, a: 0.2, r: 0.35, dest: music });                   // pulse with the red light
  // dark pad returns
  [[red, SC(28).start, [82.4, 98, 123.5]], [SC(28).start, SC(32).start, [77.8, 98, 116.5]], [SC(32).start, SC(33).start, [73.4, 87.3, 110]], [SC(33).start, TOTAL, [82.4, 98, 123.5, 146.8]]].forEach(([a, b, ch]) =>
    ch.forEach(f => { tone(a, b - a + 0.6, { type: 'sawtooth', f: f * 2, filters: [['lowpass', 600]], g: 0.03, a: 1.2, r: 0.8, dest: music, pan: rnd(-0.5, 0.5) }); tone(a, b - a + 0.6, { type: 'sine', f, g: 0.04, a: 1.2, r: 0.8, dest: music }); }));
  // distant banging on metal
  [94.2, 95.1, 96.4].forEach(t => [312, 487, 761].forEach(f => tone(t, 0.5, { type: 'triangle', f, filters: [['lowpass', 900]], g: 0.025, r: 0.45, pan: -0.7 })));
  // PA speaker crackle
  for (let t = SC(27).start + 0.2; t < SC(27).start + 1.8; t += rnd(0.03, 0.09)) noise(t, 0.02, { filters: [['bandpass', 2000, 2]], g: 0.08 });
  noise(SC(27).start + 1.8, SC(28).start - SC(27).start - 1.8, { filters: [['bandpass', 1800, 1.5]], g: 0.035, a: 0.1, r: 0.3 });
  // HOUR 3 — banging on the gate
  const bang = (t, g = 1) => { noise(t, 0.25, { brown: true, filters: [['lowpass', 400]], g: 0.7 * g, a: 0.002, r: 0.2 }); [260, 410, 655, 980].forEach((f, k) => tone(t, 0.7 - k * 0.1, { type: 'triangle', f, g: 0.06 * g / (k + 1) * 2, a: 0.001, r: 0.6 })); for (let k = 0; k < 6; k++) noise(t + 0.05 + k * 0.05, 0.03, { filters: [['bandpass', 3000, 6]], g: 0.05 * g }); };
  for (let t = SC(28).start + 1.3; t < SC(29).start + 0.5; t += 0.72) bang(t);
  bang(SC(29).start + 2.4, 0.6);
  for (let t = SC(30).start; t < SC(31).start; t += 0.12) noise(t, 0.05, { filters: [['bandpass', rnd(1800, 3500), 6]], g: 0.09 });   // man shaking the bars
  // coughing (man)
  [SC(29).start + 0.8, SC(29).start + 1.3].forEach(t => noise(t, 0.22, { filters: [['bandpass', 600, 2]], g: 0.12, a: 0.01, r: 0.15 }));
  // keys jingle (Rosa)
  for (let k = 0; k < 8; k++) tone(SC(31).start + 0.2 + k * 0.07, 0.15, { f: rnd(3500, 6500), g: 0.03, r: 0.12 });
  // Biscuit growl
  const gr0 = SC(32).start + 0.6, gr1 = SC(33).start + 0.3;
  const grOsc = tone(gr0, gr1 - gr0, { type: 'sawtooth', f: 78, filters: [['lowpass', 350, 4]], g: 0.0, a: 0.4, r: 0.4 });
  const am = ctx.createOscillator(); am.frequency.value = 23; const amG = ctx.createGain(); amG.gain.value = 0.08;
  const grG = ctx.createGain(); grG.gain.value = 0;
  { const os = ctx.createOscillator(); os.type = 'sawtooth'; os.frequency.value = 74; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380; lp.Q.value = 5; os.connect(lp); lp.connect(grG); grG.connect(sfx); am.connect(amG); amG.connect(grG.gain);
    grG.gain.setValueAtTime(0, gr0); grG.gain.linearRampToValueAtTime(0.32, gr0 + 0.5); grG.gain.setValueAtTime(0.32, gr1 - 0.4); grG.gain.linearRampToValueAtTime(0, gr1);
    os.frequency.setValueAtTime(70, gr0); os.frequency.linearRampToValueAtTime(82, EV.littleGirl); os.frequency.linearRampToValueAtTime(76, gr1);
    os.start(gr0); os.stop(gr1 + 0.1); am.start(gr0); am.stop(gr1 + 0.1); }
  noise(gr0, gr1 - gr0, { brown: true, filters: [['bandpass', 220, 3]], g: 0.5, a: 0.5, r: 0.4 });
  // choice: ring countdown ticks + final hit
  for (let k = 0; k < 5; k++) tone(EV.ring + k, 0.06, { f: 1800, g: 0.08, r: 0.05 });
  tone(EV.ep2, 2.5, { f: 55, fEnd: 41, g: 0.5, a: 0.01, r: 2.2 }); noise(EV.ep2, 1.5, { brown: true, filters: [['lowpass', 200]], g: 0.5, r: 1.3 });
  // fade out
  mGain.gain.setValueAtTime(0.95, TOTAL - 1.2); mGain.gain.linearRampToValueAtTime(0, TOTAL);
  return await ctx.startRendering();
}
function audioBufferToWav(buf) {
  const nch = buf.numberOfChannels, sr = buf.sampleRate, n = buf.length, bps = 2;
  const ab = new ArrayBuffer(44 + n * nch * bps), dv = new DataView(ab);
  const ws = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
  ws(0, 'RIFF'); dv.setUint32(4, 36 + n * nch * bps, true); ws(8, 'WAVE'); ws(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true);
  dv.setUint16(22, nch, true); dv.setUint32(24, sr, true); dv.setUint32(28, sr * nch * bps, true); dv.setUint16(32, nch * bps, true); dv.setUint16(34, 16, true); ws(36, 'data'); dv.setUint32(40, n * nch * bps, true);
  const ch = []; for (let c = 0; c < nch; c++) ch.push(buf.getChannelData(c));
  let o = 44; for (let i = 0; i < n; i++) for (let c = 0; c < nch; c++) { const v = clamp(ch[c][i], -1, 1); dv.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7FFF, true); o += 2; }
  return ab;
}
