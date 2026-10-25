"""Sound design for "Dead in the Water": every layer is generated, leveled in dB, and mixed under the narration.

Each layer is normalized on its own, then given a gain in dB, so one loud effect can never
push the rest out of hearing range (the bug in the first version).
"""
import subprocess

import numpy as np

SR = 44100


def _db(x):
    return 10 ** (x / 20)


class Bed:
    def __init__(self, start, end, seed=1):
        self.start, self.end = start, end
        self.n = int((end - start) * SR)
        self.t = start + np.arange(self.n) / SR
        self.mix = np.zeros(self.n)
        self.rng = np.random.default_rng(seed)

    # --- helpers ---
    def env(self, points):
        return np.interp(self.t, [p[0] for p in points], [p[1] for p in points])

    def band(self, x, lo, hi):
        spec = np.fft.rfft(x)
        f = np.fft.rfftfreq(len(x), 1 / SR)
        spec[(f < lo) | (f > hi)] = 0
        return np.fft.irfft(spec, len(x))

    def noise(self, n=None):
        return self.rng.standard_normal(self.n if n is None else n)

    def layer(self, sig, gain_db):
        """Add a full-length layer, normalized to peak 1, at gain_db."""
        peak = np.abs(sig).max()
        if peak > 0:
            self.mix += sig / peak * _db(gain_db)

    def hit(self, at, sig, gain_db):
        """Place a one-shot sound (normalized) at absolute time `at`."""
        i0 = int((at - self.start) * SR)
        if i0 >= self.n or i0 + len(sig) <= 0:
            return
        peak = np.abs(sig).max()
        sig = sig / peak * _db(gain_db) if peak > 0 else sig
        a, b = max(0, i0), min(self.n, i0 + len(sig))
        self.mix[a:b] += sig[a - i0:b - i0]

    def seg(self, dur):
        return np.arange(int(dur * SR)) / SR


# --- one-shot sound recipes ---

def impact(b, dur=3.0):
    """Deep cinematic boom: pitch-dropping sub + distorted body + noise burst."""
    s = b.seg(dur)
    f = 70 * np.exp(-s * 1.2) + 28
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-s * 1.1)
    body = np.tanh(3 * np.sin(2 * np.pi * np.cumsum(f * 2) / SR)) * np.exp(-s * 2.5) * 0.5
    crack = b.band(b.noise(len(s)), 80, 2500) * np.exp(-s * 6) * 0.35
    rumble = b.band(b.noise(len(s)), 25, 160) * np.exp(-s * 0.9) * 0.8
    return (sub + body + crack + rumble) * np.minimum(1, s * 200)


def riser(b, dur=1.2):
    """Reverse-cymbal style swell that leads into an impact."""
    s = b.seg(dur)
    return b.band(b.noise(len(s)), 2000, 12000) * (s / dur) ** 3 + b.band(b.noise(len(s)), 200, 1200) * (s / dur) ** 4 * 0.5


def ring(b, dur=3.0, f=4200):
    s = b.seg(dur)
    return np.sin(2 * np.pi * f * s) * np.minimum(1, s * 4) * np.exp(-s * 0.6)


def thump(b, f=60, dur=0.5):
    s = b.seg(dur)
    return np.sin(2 * np.pi * f * s) * np.exp(-s * 9) + b.band(b.noise(len(s)), 100, 2000) * np.exp(-s * 60) * 0.3


def click(b, dur=0.02):
    s = b.seg(dur)
    return b.noise(len(s)) * np.exp(-s * 300)


def beep(b, f=880, dur=0.15):
    s = b.seg(dur)
    return np.sin(2 * np.pi * f * s) * np.minimum(1, np.minimum(s, dur - s) * 80)


def heartbeat(b):
    s = b.seg(0.5)
    one = np.sin(2 * np.pi * 50 * s) * np.exp(-s * 16)
    out = np.zeros(len(s) + int(0.2 * SR))
    out[:len(s)] += one
    out[int(0.18 * SR):int(0.18 * SR) + len(s)] += one * 0.7
    return out


def geiger(b, start, end, rate0, rate1, gain_db):
    """Geiger-counter clicks whose rate ramps from rate0 to rate1 per second."""
    r = np.random.default_rng(9)
    t = start
    while t < end:
        k = (t - start) / max(1e-6, end - start)
        b.hit(t, click(b, 0.008), gain_db + r.uniform(-3, 0))
        t += r.exponential(1 / (rate0 + (rate1 - rate0) * k))


FLASHES = [16.96, 18.96, 21.06]
OUTDOOR = [(0, 33.0), (41.8, 46.05), (58.45, 61.95), (74.8, 80.5), (85.95, 97.6), (107.45, 113.95)]
END = 113.95


def build(start, end):
    """Sound bed for [start, end] of the narration timeline."""
    b = Bed(start, end)
    t = b.t
    outdoor = np.zeros(b.n)
    for a, z in OUTDOOR:
        outdoor = np.maximum(outdoor, b.env([(start, 0), (a - 0.05, 0), (a, 1), (z, 1), (z + 0.05, 0), (end, 0)]))
    alive = b.env([(start, 1), (END, 1), (END + 0.02, 0), (end, 0)])

    # ocean: low swell + wave wash, loud outside, faint through the hull inside
    swell = b.band(b.noise(), 40, 400) * (0.55 + 0.45 * np.sin(2 * np.pi * t / 7.0))
    wash = b.band(b.noise(), 500, 4000) * np.clip(np.sin(2 * np.pi * t / 5.3), 0, 1) ** 3
    b.layer(swell * (0.25 + 0.75 * outdoor) * alive, -15)
    b.layer(wash * outdoor * alive, -24)

    # muffled deck party music: plays until the lights die (hook) and, in the flashback, until "the music stopped"
    music = np.zeros(b.n)
    chords = [(57, 60, 64), (53, 57, 60), (48, 52, 55), (55, 59, 62)]
    beat = 0.48
    for k in range(int(np.floor(start / beat)), int(end / beat) + 1):
        s = b.seg(beat)
        ch = chords[(k // 4) % 4]
        tone = sum(np.sin(2 * np.pi * 440 * 2 ** ((m - 69) / 12) * s) for m in ch)
        bass = np.sin(2 * np.pi * 440 * 2 ** ((ch[0] - 12 - 69) / 12) * s)
        kick = np.sin(2 * np.pi * (45 + 90 * np.exp(-s * 35)) * s) * np.exp(-s * 12)
        hat = b.band(b.noise(len(s)), 6000, 12000) * np.exp(-((s - beat / 2) % beat) * 60) * 0.15
        piece = tone * np.exp(-s * 2.5) * 0.25 + bass * 0.35 + kick * 0.9 + hat
        i0 = int((k * beat - start) * SR)
        a, z = max(0, i0), min(b.n, i0 + len(s))
        if z > a:
            music[a:z] += piece[a - i0:z - i0]
    music = b.band(music, 35, 1800)
    b.layer(music * b.env([(0, 1), (5.0, 1), (5.5, 0.3), (7.35, 0.3), (7.45, 0), (9.9, 0), (10.0, 1), (16.96, 1),
                           (18.5, 0.3), (25.6, 0.3), (25.66, 0), (200, 0)]), -16)

    # engine rumble, winding down when the engines stop
    f_eng = b.env([(0, 38), (27.2, 38), (29.5, 10), (200, 10)])
    eng = np.sin(2 * np.pi * np.cumsum(f_eng) / SR) + 0.5 * np.sin(4 * np.pi * np.cumsum(f_eng) / SR) + 0.3 * b.band(b.noise(), 25, 120)
    b.layer(eng * b.env([(0, 1), (7.4, 1), (9.6, 0), (9.9, 0), (10.0, 1), (27.2, 1), (29.5, 0), (200, 0)]), -21)

    # hook flash and the lights dying: breaker thumps + power-down whine
    b.hit(3.9, riser(b), -22)
    b.hit(5.0, impact(b, 4.0), -9)
    for x in (7.5, 7.95, 8.5, 9.0, 9.6):
        b.hit(x, thump(b, 70, 0.5), -18)
    s = b.seg(2.4)
    b.hit(7.4, np.sin(2 * np.pi * np.cumsum(420 * np.exp(-s * 1.5) + 30) / SR) * np.exp(-s * 0.8), -26)
    # rewind whoosh into the flashback
    s = b.seg(0.5)
    b.hit(9.85, b.band(b.noise(len(s)), 400, 6000) * np.sin(np.pi * s / 0.5) ** 2, -22)

    # the three flashes
    for i, ft in enumerate(FLASHES):
        b.hit(ft - 1.1, riser(b), -24)
        b.hit(ft, impact(b, 4.0), -9 - i)
    b.hit(FLASHES[2] + 0.4, ring(b, 4.5), -28)
    b.layer(b.band(b.noise(), 20, 120) * b.env([(0, 0), (16.96, 0), (18, 0.6), (22, 1), (28, 0.5), (33, 0), (200, 0)]), -16)

    # music stops: tape-stop blip; engines wind down (above); phone glitch and power-off
    s = b.seg(0.35)
    b.hit(25.62, np.sin(2 * np.pi * np.cumsum(300 * np.exp(-s * 8) + 20) / SR) * np.exp(-s * 4), -20)
    gate = (np.sin(2 * np.pi * 11 * t) > 0.1).astype(float)
    b.layer(np.sign(np.sin(2 * np.pi * 900 * t)) * gate * b.env([(0, 0), (29.85, 0), (29.9, 1), (30.66, 1), (30.68, 0), (200, 0)]), -26)
    s = b.seg(0.25)
    b.hit(30.68, np.sin(2 * np.pi * np.cumsum(900 * np.exp(-s * 10) + 100) / SR) * np.exp(-s * 8), -22)

    # EMP: deep boom, electric crackle, pops as each system dies
    b.hit(34.98, impact(b, 3.5), -11)
    b.layer(b.band(b.noise(), 2000, 9000) * (b.rng.random(b.n) < 0.06) * b.env([(0, 0), (37.6, 0), (37.7, 1), (38.8, 0.5), (40.6, 0), (200, 0)]), -16)
    s = b.seg(1.5)
    b.hit(37.6, b.band(b.noise(len(s)), 100, 3000) * np.sin(np.pi * s / 1.5) ** 2, -20)
    for x in (38.3, 38.9, 39.5):
        b.hit(x, thump(b, 180, 0.25), -18)

    # dead ship: metal creaks
    creak = b.band(b.noise(), 150, 700) * np.clip(np.sin(2 * np.pi * t / 2.3), 0, 1) ** 6
    b.layer(creak * b.env([(0, 0), (41.8, 0), (42.2, 1), (46.0, 1), (46.05, 0), (200, 0)]), -22)

    # panic in the dark atrium: crowd roar + running feet
    crowdn = b.band(b.noise(), 300, 2500) * (0.6 + 0.4 * np.sin(2 * np.pi * 3.1 * t) * np.sin(2 * np.pi * 0.7 * t))
    b.layer(crowdn * b.env([(0, 0), (46.0, 0), (46.2, 1), (50.3, 1), (50.45, 0), (97.6, 0), (97.7, 0.8), (103.5, 0.8),
                            (103.6, 1), (107.4, 1), (107.45, 0), (200, 0)]), -16)
    rf = np.random.default_rng(4)
    for x in np.arange(46.1, 50.4, 0.11):
        b.hit(x + rf.uniform(0, 0.05), thump(b, 90, 0.15), -26)
    # generator hum, flicker clicks, spin-up
    hum = np.sin(2 * np.pi * 60 * t) + 0.5 * np.sin(2 * np.pi * 120 * t) + 0.3 * np.sin(2 * np.pi * 180 * t)
    b.layer(hum * b.env([(0, 0), (51.4, 0), (52.5, 1), (56, 0.5), (58.4, 0), (200, 0)]), -20)
    for k in range(18):
        b.hit(52.84 + k * 0.17 + (k * 7 % 5) * 0.02, thump(b, 300, 0.12), -22)
    s = b.seg(2.5)
    b.hit(52.6, np.sin(2 * np.pi * np.cumsum(90 + 260 * (s / 2.5)) / SR) * np.minimum(1, s * 3), -26)
    # radio static + typing
    static = b.band(b.noise(), 800, 6000)
    b.layer(static * b.env([(0, 0), (56.85, 0), (56.9, 1), (58.4, 1), (58.45, 0), (62.0, 0), (62.1, 0.6), (67.6, 0.6), (67.8, 0), (200, 0)]), -26)
    for a, z, chars in ((62.45, 63.3, 17), (64.3, 65.35, 21), (66.05, 67.4, 26)):
        for i in range(chars):
            b.hit(a + (z - a) * i / chars, click(b), -20)
    for x in (69.3, 69.55, 69.8):
        b.hit(x, beep(b, 520, 0.18), -20)

    # corridor: alarm pulse + crew running past (getting louder)
    pulse = np.sin(2 * np.pi * 440 * t) * (np.sin(2 * np.pi * 1.1 * t) > 0.6)
    b.layer(pulse * b.env([(0, 0), (71.45, 0), (71.5, 1), (74.75, 1), (74.8, 0), (200, 0)]), -30)
    for i, x in enumerate(np.arange(71.9, 73.9, 0.17)):
        b.hit(x, thump(b, 85, 0.3), -24 + 10 * np.exp(-((x - 73.0) ** 2) * 3))

    # wind from the east, then the Geiger counter for the fallout
    gust = b.band(b.noise(), 200, 2200) * (0.5 + 0.5 * np.sin(2 * np.pi * t / 1.7) ** 2)
    b.layer(gust * b.env([(0, 0), (74.8, 0), (75.0, 1), (80.4, 0.8), (80.5, 0), (107.45, 0), (108, 0.5), (113.95, 0.5), (114, 0), (200, 0)]), -21)
    geiger(b, max(start, 77.2), min(end, 80.5), 3, 40, -18)
    for x in range(5):
        b.hit(78.86 + x, beep(b, 2000, 0.03), -24)

    # captain: general emergency alarm, seven short and one long
    for k in range(8):
        ln = 0.35 if k < 7 else 1.6
        s = b.seg(ln)
        horn = np.sign(np.sin(2 * np.pi * 220 * s)) * 0.5 + np.sin(2 * np.pi * 330 * s) * 0.5
        b.hit(80.5 + k * 0.6, b.band(horn, 100, 1500) * np.minimum(1, np.minimum(s, ln - s) * 30), -21)

    # cross-section and capacity: interface blips, alarm buzz when the numbers don't fit
    for x in (87.6, 89.24, 90.6, 93.5):
        b.hit(x, beep(b, 1200, 0.1), -24)
    s = b.seg(0.6)
    b.hit(95.9, np.sign(np.sin(2 * np.pi * 140 * s)) * np.minimum(1, (0.6 - s) * 20), -24)

    # stairs: heartbeat and footsteps
    for k in range(int((107.4 - 97.6) / 0.72)):
        b.hit(97.6 + k * 0.72, heartbeat(b), -14)
    for x in np.arange(97.7, 103.5, 0.21):
        b.hit(x, thump(b, 80, 0.2), -26)

    # watertight door: grinding motor, warning bell, final clang
    grind = b.band(b.noise(), 80, 700) * (0.6 + 0.4 * np.sin(2 * np.pi * 13 * t))
    b.layer(grind * b.env([(0, 0), (104.9, 0), (105.1, 1), (107.4, 1), (107.45, 0), (200, 0)]), -18)
    for k in range(6):
        b.hit(104.95 + k * 0.42, ring(b, 0.3, 1250), -22)

    # ash: eerie high drone, slow heartbeat
    shimmer = np.sin(2 * np.pi * 880 * t) * 0.5 + np.sin(2 * np.pi * 1320.5 * t) * 0.3
    b.layer(shimmer * b.env([(0, 0), (107.45, 0), (109, 1), (113.9, 1), (113.95, 0), (200, 0)]), -34)
    for k in range(5):
        b.hit(108.6 + k * 1.1, heartbeat(b), -16)

    # tension drone under everything after the engines die
    drone = (np.sin(2 * np.pi * 55 * t) + 0.7 * np.sin(2 * np.pi * 55.4 * t) + 0.5 * np.sin(2 * np.pi * 82.4 * t) + 0.25 * np.sin(2 * np.pi * 110.3 * t))
    b.layer(drone * b.env([(0, 0), (24.9, 0), (27.5, 0.6), (58.4, 0.4), (61.9, 0.7), (77, 0.9), (107.4, 1), (END, 1), (END + 0.02, 0), (200, 0)]), -22)

    # the cut to black: one last impact, then silence
    b.hit(END, impact(b, 1.8), -8)
    return b


def mix_with_voice(b, voice_path, voice_offset, voice_gain_db=-1.0):
    """Mix the bed with the narration (slice starting at voice_offset seconds), ducking under speech."""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(voice_offset), "-t", str(b.end - b.start), "-i", voice_path,
                          "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    voice = np.frombuffer(raw, np.float32).astype(np.float64)
    voice = np.pad(voice, (0, max(0, b.n - len(voice))))[:b.n]
    voice = voice / np.abs(voice).max() * _db(voice_gain_db)
    win = int(0.1 * SR)
    cs = np.cumsum(np.abs(voice))
    lvl = np.pad((cs[win:] - cs[:-win]) / win, (win // 2, 0), mode="edge")
    lvl = np.pad(lvl, (0, max(0, b.n - len(lvl))), mode="edge")[:b.n]
    duck = 1 - 0.4 * np.clip(lvl / 0.1, 0, 1)   # bed dips ~4 dB under the voice
    out = voice + b.mix * duck
    return out / max(1.0, np.abs(out).max() / 0.97)
