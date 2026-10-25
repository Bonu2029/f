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


def build(start, end, flashes):
    """Sound bed for [start, end] in narration time. flashes = list of flash times."""
    b = Bed(start, end)
    t = b.t

    # ocean: low swell + wave wash, always present, louder outside
    swell = b.band(b.noise(), 40, 400) * (0.55 + 0.45 * np.sin(2 * np.pi * t / 7.0))
    wash = b.band(b.noise(), 500, 4000) * np.clip(np.sin(2 * np.pi * t / 5.3), 0, 1) ** 3
    b.layer(swell, -15)
    b.layer(wash, -24)

    # muffled deck party music until the first flash, fading under the shock
    music = np.zeros(b.n)
    chords = [(57, 60, 64), (53, 57, 60), (48, 52, 55), (55, 59, 62)]
    beat = 0.48
    k0 = int(np.floor(start / beat))
    for k in range(k0, int(end / beat) + 1):
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
    first = flashes[0] if flashes else end
    b.layer(music * b.env([(start, 1), (first, 1), (first + 1.5, 0.25), (end, 0.25)]), -16)

    # nuclear flashes: riser -> impact, plus long low rumble and ear ringing after the third
    for i, ft in enumerate(flashes):
        b.hit(ft - 1.1, riser(b), -24)
        b.hit(ft, impact(b, 4.0), -9 - i)
    if len(flashes) >= 3:
        b.hit(flashes[2] + 0.4, ring(b, 4.5), -30)
        rumble = b.band(b.noise(), 20, 120)
        b.layer(rumble * b.env([(start, 0), (flashes[0], 0), (flashes[0] + 1, 0.6), (flashes[2] + 1, 1), (end, 0.8)]), -16)
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
