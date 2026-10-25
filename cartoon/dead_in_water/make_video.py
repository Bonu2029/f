"""Dead in the Water: a nuclear-war-at-sea story, drawn entirely in code.

Every scene is drawn with Pillow, synced to the narration's word timings
(words.json), with word-by-word captions and a synthesized sound bed mixed
under the voice.

Run:     python3 make_video.py            (full render)
Preview: python3 make_video.py --sheet    (contact sheet of key frames)
Output:  dead_in_water.mp4 (1080x1920, 30 fps)
"""
import json
import math
import os
import random
import subprocess
import sys
import wave
from functools import lru_cache
from multiprocessing import Pool

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
VOICE = os.path.join(HERE, "narration.mp3")
WORDS = os.path.join(HERE, "words.json")
OUT = os.path.join(HERE, "dead_in_water.mp4")
WAV = os.path.join(HERE, "_mix.wav")

W, H, S = 720, 1280, 2          # design space and supersampling factor
CW, CH = W * S, H * S           # drawing canvas
OW, OH = 1080, 1920             # output frame
K = OW / W                      # design -> output scale (captions)
FPS = 30
END = 113.95                    # hard cut to black
DUR = END + 1.8

F_BLACK = "/usr/share/fonts/opentype/inter/Inter-Black.otf"
F_BOLD = "/usr/share/fonts/opentype/inter/Inter-Bold.otf"
F_MONO = "/usr/share/fonts/truetype/jetbrains-mono/JetBrainsMono-ExtraBold.ttf"

CYAN = (90, 220, 255)
GREEN = (80, 255, 150)
AMBER = (255, 190, 60)
RED = (255, 64, 64)
YELLOW = (255, 214, 50)
GREY = (150, 156, 170)
SIL = (6, 7, 12)
WL = 760                        # ship waterline / horizon in exterior shots


@lru_cache(None)
def font(path, size):
    return ImageFont.truetype(path, int(size))


def clamp(v, a=0.0, b=1.0):
    return max(a, min(b, v))


def ease(v):
    v = clamp(v)
    return v * v * (3 - 2 * v)


def ramp(t, a, b):
    return ease((t - a) / (b - a))


def lerp(a, b, k):
    return a + (b - a) * k


def P(*vals):
    return [v * S for v in vals]


def PP(points):
    return [v * S for pt in points for v in pt]


def rgba(c, a):
    return tuple(c[:3]) + (int(clamp(a, 0, 1) * 255),)


def text(d, x, y, s, size, color, path=F_BOLD, anchor="la", alpha=1.0):
    d.text((x * S, y * S), s, font=font(path, size * S), fill=rgba(color, alpha), anchor=anchor)


# ---------- reusable drawing pieces ----------

@lru_cache(None)
def gradient(stops, size=(CW, CH)):
    """Vertical gradient from [(y_design, (r,g,b)), ...]."""
    ys = np.arange(size[1]) / S
    cols = np.zeros((size[1], 3))
    pos = [s[0] for s in stops]
    for ch in range(3):
        cols[:, ch] = np.interp(ys, pos, [s[1][ch] for s in stops])
    arr = np.repeat(cols[:, None, :], size[0], axis=1).astype(np.uint8)
    return Image.fromarray(arr, "RGB")


@lru_cache(None)
def glow_sprite(r, color):
    y, x = np.ogrid[-r:r + 1, -r:r + 1]
    a = np.clip(1 - np.sqrt(x * x + y * y) / r, 0, 1) ** 2.2
    return Image.fromarray((a[..., None] * np.array(color)).astype(np.uint8), "RGB")


def glow(img, x, y, r, color, k=1.0):
    """Additive soft light at design coords."""
    k = round(clamp(k, 0, 3) * 20) / 20
    if k <= 0:
        return
    r = max(2, int(r * S))
    spr = glow_sprite(r, tuple(min(255, int(c * k)) for c in color))
    x0, y0 = int(x * S) - r, int(y * S) - r
    box = (x0, y0, x0 + 2 * r + 1, y0 + 2 * r + 1)
    img.paste(ImageChops.add(img.crop(box), spr), (x0, y0))


@lru_cache(None)
def solid(color):
    return Image.new("RGB", (CW, CH), color)


def wash(img, color, a):
    return Image.blend(img, solid(color), clamp(a)) if a > 0.003 else img


def panel(d, x0, y0, x1, y1, title, accent=CYAN, status=None, status_color=None, alpha=0.9):
    d.rounded_rectangle(P(x0, y0, x1, y1), radius=18 * S, fill=(9, 13, 24, int(alpha * 255)),
                        outline=rgba(accent, 0.55), width=2 * S)
    d.ellipse(P(x0 + 18, y0 + 20, x0 + 28, y0 + 30), fill=rgba(accent, 1))
    text(d, x0 + 38, y0 + 16, title, 15, accent)
    if status:
        text(d, x1 - 20, y0 + 16, status, 14, status_color or accent, anchor="ra")


def tag(d, x, y, title, sub, accent=AMBER, alpha=1.0):
    w = max(font(F_BLACK, 22 * S).getlength(title), font(F_BOLD, 13 * S).getlength(sub)) / S + 44
    d.rounded_rectangle(P(x, y, x + w, y + 64), radius=8 * S, fill=(8, 10, 18, int(220 * alpha)))
    d.rectangle(P(x, y + 8, x + 5, y + 56), fill=rgba(accent, alpha))
    text(d, x + 20, y + 9, title, 22, (255, 255, 255), F_BLACK, alpha=alpha)
    text(d, x + 20, y + 39, sub, 13, GREY, alpha=alpha)


def person(d, x, feet, h, color=SIL, walk=None, arm=None, arm2=None, shirt=None):
    """Silhouette. walk = phase (radians) or None; arm/arm2 = angle in degrees from straight down."""
    hr = h * 0.078
    sw = h * 0.125
    sh = feet - h * 0.80
    hip = feet - h * 0.47
    lw = h * 0.05
    for s in (-1, 1):
        sx = x + s * sw * 0.42
        swing = math.sin(walk) * h * 0.13 * s if walk is not None else 0
        d.line(P(sx, hip, sx + swing, feet - lw / 2), fill=color, width=int(lw * 2 * S))
        d.ellipse(P(sx + swing - lw * 1.4, feet - lw * 1.2, sx + swing + lw * 1.4, feet + lw * 0.2), fill=color)
    d.rounded_rectangle(P(x - sw, sh, x + sw, hip + h * 0.04), radius=sw * 0.7 * S, fill=shirt or color)
    for s, a in ((-1, arm2), (1, arm)):
        if a is None:
            a = math.degrees(math.sin(walk) * 0.6 * -s) if walk is not None else 8
        ang = math.radians(a)
        ax, ay = x + s * sw * 0.85, sh + h * 0.05
        hx, hy = ax + s * math.sin(ang) * h * 0.36, ay + math.cos(ang) * h * 0.36
        d.line(P(ax, ay, hx, hy), fill=color, width=int(lw * 1.7 * S))
        d.ellipse(P(hx - lw, hy - lw, hx + lw, hy + lw), fill=color)
    d.rectangle(P(x - hr * 0.45, sh - hr * 0.9, x + hr * 0.45, sh + 2), fill=color)
    d.ellipse(P(x - hr, sh - hr * 2.6, x + hr, sh - hr * 0.6), fill=color)


# ---------- exterior ship ----------

@lru_cache(None)
def stars():
    rnd = random.Random(7)
    return [(rnd.uniform(0, W), rnd.uniform(0, WL - 60), rnd.uniform(0.6, 1.6), rnd.uniform(0.3, 1)) for _ in range(160)]


@lru_cache(None)
def ship_layer():
    layer = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    L, R = 30, 690
    top = WL - 70
    d.polygon(PP([(L, top), (R - 30, top), (R + 14, top - 14), (R - 26, WL + 14), (L + 30, WL + 14), (L, WL - 12)]),
              fill=(16, 20, 32, 255))
    d.line(P(L + 4, top + 7, R - 22, top + 7), fill=(44, 52, 72, 255), width=2 * S)
    rnd = random.Random(3)
    windows, decks = [], []
    for k in range(6):
        x0, x1 = L + 40 + k * 14, R - 72 - k * 30
        y1 = top - k * 17
        y0 = y1 - 17
        d.rectangle(P(x0, y0, x1, y1), fill=(24 + k * 3, 28 + k * 3, 44 + k * 3, 255))
        d.line(P(x0, y1, x1, y1), fill=(10, 12, 20, 255), width=S)
        decks.append((x0, y0, x1, y1))
        x = x0 + 6
        while x < x1 - 8:
            if rnd.random() < 0.9:
                col = rnd.choice([(255, 214, 140), (255, 230, 180), (255, 200, 120), (190, 215, 255)])
                windows.append((x, y0 + 5, x + 5, y0 + 11, rnd.random(), col))
            x += 8.5
    for row, y in enumerate((top + 20, top + 38)):
        x = L + 34 + row * 6
        while x < R - 70 + row * -12:
            windows.append((x, y, x + 4, y + 4, rnd.random(), (255, 210, 130)))
            x += 13
    fx = L + 150
    ftop = top - 6 * 17
    d.polygon(PP([(fx, ftop), (fx + 56, ftop), (fx + 48, ftop - 58), (fx + 12, ftop - 58)]), fill=(30, 34, 52, 255))
    d.polygon(PP([(fx + 11, ftop - 50), (fx + 49, ftop - 50), (fx + 48, ftop - 58), (fx + 12, ftop - 58)]), fill=(150, 30, 40, 255))
    mx = R - 80
    d.line(P(mx, top - 6 * 17, mx, top - 6 * 17 - 50), fill=(30, 34, 52, 255), width=3 * S)
    bulbs = []
    path = [(L + 44, ftop + 2), (fx + 30, ftop - 58), (mx, ftop - 50), (R - 10, top - 12)]
    cols = [(255, 80, 80), (255, 220, 80), (80, 255, 140), (100, 160, 255)]
    n = 0
    for (ax, ay), (bx, by) in zip(path, path[1:]):
        seg = math.hypot(bx - ax, by - ay)
        for i in range(int(seg / 11)):
            k = i * 11 / seg
            sag = math.sin(k * math.pi) * 10
            bulbs.append((lerp(ax, bx, k), lerp(ay, by, k) + sag, cols[n % 4]))
            n += 1
    return layer, windows, bulbs


@lru_cache(None)
def waves():
    rnd = random.Random(11)
    return [(rnd.uniform(-100, W + 100), rnd.uniform(WL + 22, H), rnd.uniform(20, 90)) for _ in range(90)]


def exterior(t, lights=1.0, party=0.0, glows=(), flash=0.0, rock=1.0):
    img = gradient(((0, (3, 5, 14)), (WL - 1, (30, 27, 54)), (WL, (12, 18, 34)), (H, (2, 3, 8)))).copy()
    d = ImageDraw.Draw(img, "RGBA")
    for x, y, r, a in stars():
        tw = 0.6 + 0.4 * math.sin(t * 2 + x)
        d.ellipse(P(x - r / 2, y - r / 2, x + r / 2, y + r / 2), fill=(220, 230, 255, int(150 * a * tw)))
    for gx, gk, gr in glows:
        glow(img, gx, WL, gr, (255, 120, 50), gk)
        glow(img, gx, WL, gr * 0.35, (255, 220, 160), gk)
    for x, y, ln in waves():
        depth = (y - WL) / (H - WL)
        xx = (x + t * (8 + depth * 30)) % (W + 200) - 100
        d.line(P(xx, y, xx + ln * (0.4 + depth), y), fill=(120, 150, 200, int(25 + 45 * depth)), width=max(1, int(S * (0.5 + depth * 1.5))))
    layer, windows, bulbs = ship_layer()
    dy = int(math.sin(t * 0.9) * 3 * rock * S)
    if lights > 0:
        glow(img, 360, WL - 70, 330, (60, 44, 20), lights)
        for (x0, y0, x1, y1, rank, col) in windows[::7]:
            if rank < lights:
                d.line(P(x0 + 2, WL + 18 + dy / S, x0 + 2, WL + 18 + dy / S + 40 + (x0 * 7) % 50),
                       fill=col + (40,), width=2 * S)
    img.paste(layer, (0, dy), layer)
    d = ImageDraw.Draw(img, "RGBA")
    for (x0, y0, x1, y1, rank, col) in windows:
        if rank < lights:
            d.rectangle(P(x0, y0 + dy / S, x1, y1 + dy / S), fill=col)
    if party > 0:
        for i, (bx, by, col) in enumerate(bulbs):
            on = 0.6 + 0.4 * math.sin(t * 5 + i)
            d.ellipse(P(bx - 1.6, by - 1.6 + dy / S, bx + 1.6, by + 1.6 + dy / S), fill=rgba(col, party * on))
        glow(img, 380, WL - 160, 200, (40, 30, 50), party)
    return wash(img, (255, 255, 255), flash)


# ---------- other locations ----------

def deck(t, flashes=()):
    hz = 600
    img = gradient(((0, (4, 6, 16)), (hz - 1, (44, 40, 72)), (hz, (30, 40, 66)), (880, (10, 14, 26)),
                    (880.1, (22, 20, 26)), (H, (8, 8, 12)))).copy()
    total_flash, glows = 0.0, []
    for tf, x in flashes:
        if t >= tf:
            k = t - tf
            total_flash += 0.92 * math.exp(-k * 3.2) * clamp(k / 0.06)
            glows.append((x, 0.45 + 1.6 * math.exp(-k * 1.5), 160 + 140 * clamp(k / 1.5)))
    d = ImageDraw.Draw(img, "RGBA")
    for x, y, r, a in stars():
        if y < hz - 40:
            d.ellipse(P(x - r / 2, y * 0.8 - r / 2, x + r / 2, y * 0.8 + r / 2), fill=(220, 230, 255, int(140 * a)))
    for x, k, r in glows:
        glow(img, x, hz, r, (255, 110, 40), k)
        glow(img, x, hz, r * 0.3, (255, 230, 190), k)
    glow(img, 340, hz + 20, 300, (30, 34, 54))
    for x, y, ln in waves():
        yy = hz + (y - WL) / (H - WL) * 280
        xx = (x + t * 14) % (W + 200) - 100
        d.line(P(xx, yy, xx + ln * 0.6, yy), fill=(120, 150, 200, 45), width=S)
    # string lights overhead
    for row, (y0, sag) in enumerate(((60, 90), (150, 70))):
        pts = [(x, y0 + math.sin(x / W * math.pi) * sag) for x in range(-20, W + 21, 4)]
        d.line(PP(pts), fill=(20, 20, 26, 255), width=2 * S)
        for i, (x, y) in enumerate(pts[::9]):
            col = [(255, 90, 90), (255, 220, 90), (90, 255, 150), (110, 170, 255)][(i + row) % 4]
            d.ellipse(P(x - 4, y, x + 4, y + 9), fill=col)
            glow(img, x, y + 5, 22, tuple(c // 3 for c in col), 1)
    d = ImageDraw.Draw(img, "RGBA")
    person(d, 290, 1070, 470, arm=4, arm2=6)
    person(d, 410, 1070, 270, arm=-20, arm2=6)
    # railing in front of them
    for y in (905, 960):
        d.rectangle(P(0, y, W, y + 9), fill=(14, 15, 20, 255))
    for x in range(20, W, 90):
        d.rectangle(P(x, 905, x + 8, 1080), fill=(14, 15, 20, 255))
    d.rectangle(P(0, 1080, W, H), fill=(10, 10, 14, 255))
    return wash(img, (255, 255, 255), total_flash)


@lru_cache(None)
def console_bg(hue=(20, 30, 50)):
    img = gradient(((0, (4, 6, 12)), (H * 0.6, hue), (H, (3, 4, 8)))).copy()
    d = ImageDraw.Draw(img, "RGBA")
    for x in range(0, W, 40):
        d.line(P(x, 0, x, H), fill=(255, 255, 255, 6), width=S)
    for y in range(0, H, 40):
        d.line(P(0, y, W, y), fill=(255, 255, 255, 6), width=S)
    rnd = random.Random(5)
    for _ in range(26):
        glow(img, rnd.uniform(0, W), rnd.uniform(950, H), rnd.uniform(18, 40), rnd.choice([(60, 40, 10), (10, 40, 50), (50, 10, 10)]))
    return img


@lru_cache(None)
def atrium_bg(lit):
    top = (10, 12, 22) if not lit else (60, 48, 36)
    img = gradient(((0, (6, 8, 18)), (300, top), (H, (4, 4, 8) if not lit else (40, 32, 26)))).copy()
    d = ImageDraw.Draw(img, "RGBA")
    d.pieslice(P(-100, -260, W + 100, 420), 0, 180, fill=(30, 50, 90, 90) if not lit else (90, 80, 70, 80))
    for i in range(-6, 7):
        d.line(P(360, -260, 360 + i * 80, 160), fill=(255, 255, 255, 18), width=S)
    for y in (330, 500, 670):
        d.rectangle(P(0, y, W, y + 16), fill=(16, 16, 24, 255) if not lit else (70, 56, 44, 255))
        for x in range(0, W, 14):
            d.line(P(x, y - 30, x, y), fill=(20, 20, 30, 200) if not lit else (110, 90, 60, 200), width=S)
        d.line(P(0, y - 30, W, y - 30), fill=(24, 24, 34, 255) if not lit else (140, 110, 70, 255), width=2 * S)
        if lit:
            for x in range(40, W, 80):
                glow(img, x, y + 26, 30, (120, 90, 50))
    for x in (90, 630):
        d.rectangle(P(x - 14, 160, x + 14, 1000), fill=(14, 14, 22, 255) if not lit else (70, 58, 46, 255))
    d.rectangle(P(0, 1000, W, H), fill=(8, 8, 14, 255) if not lit else (54, 44, 36, 255))
    if lit:
        glow(img, 360, 230, 170, (140, 110, 60))
        glow(img, 360, 230, 50, (255, 230, 180))
    else:
        glow(img, 360, 120, 300, (20, 30, 55))
        d.rectangle(P(0, 1000, W, H), fill=(16, 20, 32, 255))
        glow(img, 360, 1080, 420, (34, 46, 80))
    return img


@lru_cache(None)
def corridor_bg():
    vx, vy = 360, 560
    img = Image.new("RGB", (CW, CH), (10, 6, 8))
    d = ImageDraw.Draw(img, "RGBA")
    d.polygon(PP([(0, 0), (W, 0), (vx + 40, vy - 40), (vx - 40, vy - 40)]), fill=(24, 12, 14))
    d.polygon(PP([(0, H), (W, H), (vx + 40, vy + 40), (vx - 40, vy + 40)]), fill=(18, 10, 12))
    d.polygon(PP([(0, 0), (vx - 40, vy - 40), (vx - 40, vy + 40), (0, H)]), fill=(30, 14, 16))
    d.polygon(PP([(W, 0), (vx + 40, vy - 40), (vx + 40, vy + 40), (W, H)]), fill=(28, 13, 15))
    d.rectangle(P(vx - 40, vy - 40, vx + 40, vy + 40), fill=(40, 10, 12))
    for k in (0.08, 0.2, 0.36, 0.56, 0.8):
        for side in (-1, 1):
            x0 = vx + side * (40 + (360 - 40) * k)
            x1 = vx + side * (40 + (360 - 40) * (k + 0.07))
            ty0, ty1 = vy - 40 - (vy - 40) * k * 0.7, vy - 40 - (vy - 40) * (k + 0.07) * 0.7
            by0, by1 = vy + 40 + (H - vy - 40) * k * 0.75, vy + 40 + (H - vy - 40) * (k + 0.07) * 0.75
            d.polygon(PP([(x0, ty0), (x1, ty1), (x1, by1), (x0, by0)]), fill=(44, 20, 22))
        glow(img, vx, vy - 40 - (vy - 40) * k, 30 + 90 * k, (120, 20, 20))
    return img


def corridor(t):
    img = corridor_bg().copy()
    pulse = 0.5 + 0.5 * math.sin(t * 6)
    glow(img, 360, 140, 260, (90, 10, 10), pulse)
    return img


@lru_cache(None)
def stairs_bg():
    img = gradient(((0, (16, 4, 6)), (H, (6, 2, 3)))).copy()
    d = ImageDraw.Draw(img, "RGBA")
    for i in range(22):
        y = 260 + i * 46
        x = -120 + i * 40
        d.rectangle(P(x, y, x + 1100, y + 46), fill=(30 + i, 12, 14, 255))
        d.line(P(x, y, x + 1100, y), fill=(70, 26, 26, 255), width=2 * S)
    d.line(P(-80, 160, 900, 1180), fill=(80, 70, 70, 255), width=4 * S)
    glow(img, 140, 120, 220, (130, 20, 20))
    return img


@lru_cache(None)
def door_bg():
    img = gradient(((0, (26, 30, 36)), (H, (10, 12, 16)))).copy()
    d = ImageDraw.Draw(img, "RGBA")
    for y in range(0, H, 160):
        d.line(P(0, y, W, y), fill=(6, 8, 10, 255), width=2 * S)
        for x in range(20, W, 40):
            d.ellipse(P(x - 3, y + 10, x + 3, y + 16), fill=(50, 56, 64, 255))
    x0, y0, x1, y1 = 140, 330, 580, 1040
    stripe = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
    sd = ImageDraw.Draw(stripe)
    for k in range(-40, 60):
        sd.polygon(PP([(k * 30, 0), (k * 30 + 15, 0), (k * 30 + 15 + 800, 800 * 1.0 + 0), (k * 30 + 800, 800)]), fill=(240, 190, 30, 255))
    mask = Image.new("L", (CW, CH), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle(P(x0 - 34, y0 - 34, x1 + 34, y1 + 34), radius=40 * S, fill=255)
    md.rounded_rectangle(P(x0, y0, x1, y1), radius=26 * S, fill=0)
    d.rounded_rectangle(P(x0 - 34, y0 - 34, x1 + 34, y1 + 34), radius=40 * S, fill=(20, 20, 20, 255))
    img.paste(stripe, (0, 0), ImageChops.multiply(mask, stripe.split()[3]))
    d = ImageDraw.Draw(img, "RGBA")
    d.rounded_rectangle(P(x0, y0, x1, y1), radius=26 * S, fill=(60, 44, 30, 255))
    glow(img, 360, 700, 260, (140, 100, 50))
    return img


def snow_flakes(t, start, n, big=False):
    rnd = random.Random(21)
    out = []
    for i in range(n):
        born = start + rnd.uniform(0, 3.0)
        if t < born:
            continue
        x0, sp = rnd.uniform(-20, W + 20), rnd.uniform(28, 60) * (2.2 if big else 1)
        y = -20 + (t - born) * sp + rnd.uniform(0, 200 if not big else 0)
        x = x0 + math.sin((t + i) * 0.9) * 14
        r = rnd.uniform(1.2, 3.2) * (3 if big else 1)
        out.append((x, y % (H + 40), r))
    return out


# ---------- scenes ----------

def sc_hook(t, lt):
    fl = 0.85 * ramp(t, 4.3, 5.6) - 0.6 * ramp(t, 5.7, 6.5)
    return exterior(t, lights=1, party=1, glows=((560, 2.2 * ramp(t, 4.2, 5.5), 300),), flash=max(0, fl))


def sc_lights_out(t, lt):
    lights = 1 - ramp(t, 7.4, 9.7)
    return exterior(t, lights=lights, party=1 - ramp(t, 7.3, 7.6), glows=((560, 1.2 - 0.5 * ramp(t, 6.6, 9.6), 300),), flash=0.12 * (1 - ramp(t, 6.6, 7.4)))


def sc_time(t, lt):
    img = exterior(t, lights=1, party=1)
    if lt < 0.28:  # rewind glitch
        arr = np.array(img)
        rnd = random.Random(int(t * 100))
        for _ in range(14):
            y = rnd.randrange(0, CH - 80)
            hgt = rnd.randrange(10, 80)
            arr[y:y + hgt] = np.roll(arr[y:y + hgt], rnd.randrange(-200, 200), axis=1)
        img = Image.fromarray(arr)
    d = ImageDraw.Draw(img, "RGBA")
    a = ramp(t, 10.0, 10.3)
    panel(d, 70, 170, 650, 420, "ATLANTIC OCEAN · NIGHT", CYAN, "LIVE", RED, alpha=0.85 * a)
    text(d, 360, 290, "9:42 PM", 96 * (0.9 + 0.1 * ramp(t, 10.9, 11.2)), AMBER, F_MONO, "mm", alpha=ramp(t, 10.85, 11.0))
    text(d, 360, 375, "CRUISE SHIP · 4,000 ON BOARD", 18, GREY, anchor="mm", alpha=a)
    return img


FLASHES = ((16.96, 520), (18.96, 170), (21.06, 380))


def sc_deck(t, lt):
    img = deck(t, FLASHES)
    d = ImageDraw.Draw(img, "RGBA")
    a = ramp(t, 13.3, 13.6) * (1 - ramp(t, 16.6, 16.9))
    if a > 0:
        tag(d, 70, 210, "DANIEL & LILY", "TOP DECK · DECK 14 · 9:42 PM", AMBER, a)
    return img


def sc_systems(t, lt):
    img = console_bg().copy()
    d = ImageDraw.Draw(img, "RGBA")
    panel(d, 50, 170, 670, 800, "SHIP SYSTEMS", CYAN, "BRIDGE", GREY)
    rows = [("DECK AUDIO", 25.62), ("ENGINE 1", 27.22), ("ENGINE 2", 27.32), ("NAVIGATION", 27.45)]
    for i, (name, toff) in enumerate(rows):
        y = 240 + i * 66
        off = t >= toff
        col = RED if off else GREEN
        blink = 1 if not off else (0.4 + 0.6 * (int(t * 4) % 2))
        d.rounded_rectangle(P(80, y, 640, y + 52), radius=10 * S, fill=(255, 255, 255, 10))
        text(d, 100, y + 15, name, 20, (230, 235, 245))
        text(d, 620, y + 15, "OFFLINE" if off else "ONLINE", 20, col, F_MONO, "ra", alpha=blink)
        d.ellipse(P(560 - (70 if off else 50), y + 21, 570 - (70 if off else 50), y + 31), fill=rgba(col, blink))
    cx, cy, r = 360, 690, 130
    d.arc(P(cx - r, cy - r, cx + r, cy + r), 180, 360, fill=(255, 255, 255, 50), width=10 * S)
    rpm = 0.86 * (1 - ramp(t, 27.25, 28.4)) + 0.01 * math.sin(t * 20) * (t < 27.25)
    d.arc(P(cx - r, cy - r, cx + r, cy + r), 180, 180 + 180 * rpm, fill=rgba(AMBER if rpm > 0.1 else RED, 1), width=10 * S)
    ang = math.pi + math.pi * rpm
    d.line(P(cx, cy, cx + math.cos(ang) * (r - 24), cy + math.sin(ang) * (r - 24)), fill=(255, 255, 255, 230), width=4 * S)
    text(d, cx, cy + 40, f"{int(rpm * 140):03d}", 40, AMBER if rpm > 0.1 else RED, F_MONO, "mm")
    text(d, cx, cy + 78, "PROPELLER RPM", 13, GREY, anchor="mm")
    return img


def sc_phone(t, lt):
    img = gradient(((0, (4, 4, 10)), (H, (10, 12, 22)))).copy()
    d = ImageDraw.Draw(img, "RGBA")
    x0, y0, x1, y1 = 190, 180, 530, 860
    # hand behind phone
    d.rounded_rectangle(P(150, 560, 570, 1300), radius=120 * S, fill=(12, 10, 14, 255))
    d.rounded_rectangle(P(x0 - 10, y0 - 10, x1 + 10, y1 + 10), radius=50 * S, fill=(30, 32, 40, 255))
    dead = t >= 30.68
    glitch = 29.9 <= t < 30.68
    if not dead:
        scr = gradient(((0, (30, 40, 90)), (H, (90, 40, 110))), (int((x1 - x0) * S), int((y1 - y0) * S))).copy()
        sd = ImageDraw.Draw(scr, "RGBA")
        sw = (x1 - x0) * S
        sd.text((sw / 2, 120 * S), "9:43", font=font(F_BOLD, 80 * S), fill=(255, 255, 255), anchor="mm")
        sd.text((sw / 2, 180 * S), "Saturday, October 24", font=font(F_BOLD, 15 * S), fill=(220, 220, 240), anchor="mm")
        sd.rounded_rectangle((20 * S, 230 * S, sw - 20 * S, 300 * S), radius=16 * S, fill=(255, 255, 255, 50))
        sd.text((40 * S, 245 * S), "SHIP WI-FI", font=font(F_BOLD, 12 * S), fill=(230, 230, 240))
        sd.text((40 * S, 268 * S), "Connected · Sea Pass", font=font(F_BOLD, 15 * S), fill=(255, 255, 255))
        if glitch:
            arr = np.array(scr)
            rnd = random.Random(int(t * 60))
            for _ in range(10):
                y = rnd.randrange(0, arr.shape[0] - 40)
                hh = rnd.randrange(6, 60)
                arr[y:y + hh] = np.roll(arr[y:y + hh], rnd.randrange(-120, 120), axis=1)
                arr[y:y + hh, :, rnd.randrange(3)] = 255
            arr = (arr * (1 - 0.6 * ramp(t, 30.2, 30.68))).astype(np.uint8)
            scr = Image.fromarray(arr)
        mask = Image.new("L", scr.size, 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, scr.size[0], scr.size[1]), radius=42 * S, fill=255)
        img.paste(scr, (x0 * S, y0 * S), mask)
        glow(img, 360, 520, 300, (30, 24, 50))
    else:
        d.rounded_rectangle(P(x0, y0, x1, y1), radius=42 * S, fill=(2, 2, 4, 255))
        d.line(P(x0 + 40, y0 + 60, x0 + 120, y0 + 20), fill=(255, 255, 255, 18), width=8 * S)
    d = ImageDraw.Draw(img, "RGBA")
    for fy in (600, 680, 760):  # fingers wrapping the edge
        d.rounded_rectangle(P(x1 - 6, fy, x1 + 40, fy + 60), radius=26 * S, fill=(12, 10, 14, 255))
    return img


def sc_emp(t, lt):
    img = console_bg().copy()
    d = ImageDraw.Draw(img, "RGBA")
    x0, y0, x1, y1 = 40, 150, 680, 820
    panel(d, x0, y0, x1, y1, "HOW IT HAPPENED · EMP", AMBER)
    sub = Image.new("RGBA", ((x1 - x0) * S, (y1 - y0 - 50) * S), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sub)
    ox, oy = x0, y0 + 50

    def Q(*v):
        return [(v[i] - (ox if i % 2 == 0 else oy)) * S for i in range(len(v))]
    ecx, ecy, er = 360, 1900, 1180  # earth arc
    sd.ellipse(Q(ecx - er, ecy - er, ecx + er, ecy + er), fill=(14, 40, 70, 255), outline=(80, 160, 255, 200), width=3 * S)
    bx, by = 360, 300
    if t >= 34.98:
        k = t - 34.98
        sd.line(Q(bx, by, bx, 720), fill=(255, 255, 255, 40), width=2 * S)
        rmax = 620
        for i in range(4):
            ph = (t - 37.6 - i * 0.45)
            if ph > 0:
                r = min(rmax, ph * 420)
                a = clamp(1 - r / rmax) * 0.8 + 0.1
                sd.ellipse(Q(bx - r, by - r, bx + r, by + r), outline=rgba(AMBER, a), width=4 * S)
        sd.ellipse(Q(bx - 9, by - 9, bx + 9, by + 9), fill=(255, 255, 255, 255))
        sd.text(((bx - ox) * S, (by - 60 - oy) * S), "NUCLEAR BLAST · 400 KM UP", font=font(F_BOLD, 16 * S),
                fill=rgba((255, 255, 255), ramp(k, 0.2, 0.5)), anchor="mm")
    icons = [(170, 735, "SHIP", 38.3), (360, 724, "PHONES", 38.9), (550, 735, "GPS", 39.5)]
    for x, y, name, toff in icons:
        dead = t >= toff
        col = RED if dead else GREEN
        sd.rounded_rectangle(Q(x - 52, y - 24, x + 52, y + 24), radius=10 * S, fill=(8, 12, 22, 240), outline=rgba(col, 0.9), width=2 * S)
        sd.text(((x - ox) * S, (y - oy) * S), name, font=font(F_BOLD, 15 * S), fill=rgba(col, 1), anchor="mm")
        if dead:
            sd.line(Q(x - 60, y - 30, x + 60, y + 30), fill=rgba(RED, 1), width=4 * S)
    if t >= 39.5:
        sd.text(((360 - ox) * S, (560 - oy) * S), "RANGE: HUNDREDS OF MILES", font=font(F_MONO, 22 * S),
                fill=rgba(AMBER, ramp(t, 39.5, 39.8)), anchor="mm")
    img.paste(sub, (ox * S, oy * S), sub)
    glow(img, bx, by, 120, (255, 200, 120), 1.6 * math.exp(-(t - 34.98) * 1.2) if t >= 34.98 else 0)
    return img


def sc_dead(t, lt):
    img = exterior(t, lights=0, glows=((560, 0.9, 260), (150, 0.6, 200), (420, 0.5, 180)), rock=1.6)
    d = ImageDraw.Draw(img, "RGBA")
    a = ramp(t, 42.3, 42.6)
    panel(d, 120, 200, 600, 330, "POWER STATUS", RED, "0%", RED, alpha=0.85 * a)
    text(d, 360, 280, "ENGINES · LIGHTS · COMMS", 20, RED, F_MONO, "mm", alpha=a * (0.5 + 0.5 * (int(t * 3) % 2)))
    return img


def runners(d, t, seed, n, panic=1.0, stop_at=None):
    rnd = random.Random(seed)
    for i in range(n):
        depth = rnd.uniform(0, 1)
        h = 200 + depth * 260
        feet = 1000 + depth * 230
        speed = rnd.uniform(90, 200) * (1 if rnd.random() < 0.5 else -1) * panic
        tt = t if stop_at is None else min(t, stop_at)
        x = (rnd.uniform(0, W + 200) + speed * tt) % (W + 200) - 100
        walk = tt * abs(speed) / 22 if (stop_at is None or t < stop_at) else None
        c = 4 + int(depth * 4)
        person(d, x, feet, h, (c, c, c + 4), walk=walk,
               arm=None if walk is not None else -150 if i % 3 == 0 else None)


def sc_atrium(t, lt):
    img = atrium_bg(False).copy()
    d = ImageDraw.Draw(img, "RGBA")
    runners(d, t, 1, 14)
    return img


def sc_hum(t, lt):
    img = Image.new("RGB", (CW, CH), (2, 2, 4))
    d = ImageDraw.Draw(img, "RGBA")
    k = ramp(t, 51.4, 52.4)
    d.line(P(360, 0, 360, 430), fill=(30, 30, 34, 255), width=2 * S)
    d.ellipse(P(330, 430, 390, 500), outline=(60, 60, 70, 255), width=2 * S)
    flick = 0.7 + 0.3 * math.sin(t * 50)
    glow(img, 360, 470, 160, (255, 160, 60), k * flick)
    glow(img, 360, 470, 30, (255, 230, 180), k * flick)
    return img


def flicker(t):
    if t < 52.84:
        return 0
    if t > 55.9:
        return 1
    rnd = random.Random(int(t * 12))
    return 1 if rnd.random() < 0.25 + 0.7 * (t - 52.84) / 3 else 0.08


def sc_power(t, lt):
    k = flicker(t)
    img = Image.blend(atrium_bg(False), atrium_bg(True), k)
    d = ImageDraw.Draw(img, "RGBA")
    runners(d, t, 1, 14, stop_at=52.9)
    a = ramp(t, 53.2, 53.45)
    panel(d, 60, 170, 660, 300, "AUX GENERATOR", GREEN, "ONLINE", GREEN, alpha=0.9 * a)
    load = ramp(t, 53.3, 56.0)
    d.rounded_rectangle(P(90, 230, 630, 260), radius=8 * S, fill=(255, 255, 255, int(25 * a)))
    d.rounded_rectangle(P(90, 230, 90 + 540 * load, 260), radius=8 * S, fill=rgba(GREEN, a))
    text(d, 630, 268, f"POWER {int(load * 38)}%", 13, GREY, anchor="ra", alpha=a)
    if t >= 56.85:
        b = ramp(t, 56.85, 57.05)
        panel(d, 60, 330, 660, 450, "RADIO · 121.5 MHZ", AMBER, "SIGNAL", AMBER, alpha=0.9 * b)
        rnd = random.Random(int(t * 30))
        for i in range(60):
            x = 90 + i * 9
            hh = rnd.uniform(3, 34) * b
            d.line(P(x, 405 - hh, x, 405 + hh), fill=rgba(AMBER, 0.9 * b), width=3 * S)
    return img


def sc_calm(t, lt):
    return exterior(t, lights=0.5, glows=((560, 0.35, 240), (150, 0.25, 200)), rock=0.6)


def sc_message(t, lt):
    img = console_bg((40, 20, 20)).copy()
    d = ImageDraw.Draw(img, "RGBA")
    panel(d, 40, 220, 680, 720, "SAT-COM · INCOMING", GREEN, "PRIORITY" if int(t * 3) % 2 else "", RED)
    d.rounded_rectangle(P(70, 280, 650, 690), radius=10 * S, fill=(2, 14, 8, 255))
    lines = [("FROM: COAST GUARD", 62.45, 63.3, GREY), ("ALL PORTS ARE", 64.3, 64.95, GREEN),
             ("CLOSED.", 64.95, 65.35, GREEN), ("DO NOT APPROACH", 66.05, 66.8, GREEN), ("THE COAST.", 66.8, 67.4, GREEN)]
    y = 310
    cursor = None
    for s, a, b, col in lines:
        n = int(len(s) * clamp((t - a) / (b - a)))
        if n > 0:
            text(d, 95, y, s[:n], 34 if col == GREEN else 20, col, F_MONO)
            cursor = (95 + font(F_MONO, (34 if col == GREEN else 20) * S).getlength(s[:n]) / S + 6, y)
        y += 70 if col == GREEN else 50
    if cursor and int(t * 3) % 2:
        d.rectangle(P(cursor[0], cursor[1] + 4, cursor[0] + 16, cursor[1] + 38), fill=rgba(GREEN, 1))
    return img


@lru_cache(None)
def chart_bg(title):
    img = console_bg().copy()
    d = ImageDraw.Draw(img, "RGBA")
    panel(d, 40, 160, 680, 800, title, CYAN)
    d.rounded_rectangle(P(60, 210, 660, 780), radius=10 * S, fill=(8, 22, 40, 255))
    for x in range(60, 661, 50):
        d.line(P(x, 210, x, 780), fill=(80, 160, 255, 22), width=S)
    for y in range(210, 781, 50):
        d.line(P(60, y, 660, y), fill=(80, 160, 255, 22), width=S)
    rnd = random.Random(9)
    pts = [(560, 210)]
    y = 210
    while y < 780:
        y += rnd.uniform(20, 45)
        pts.append((rnd.uniform(470, 560), min(y, 780)))
    pts += [(660, 780), (660, 210)]
    d.polygon(PP(pts), fill=(22, 34, 34, 255), outline=(90, 200, 160, 160))
    return img


SHIP_POS = (230, 520)


def ship_icon(d, x, y, col=CYAN, a=1.0):
    d.polygon(PP([(x + 18, y), (x - 12, y - 9), (x - 12, y + 9)]), fill=rgba(col, a))
    d.ellipse(P(x - 26, y - 26, x + 26, y + 26), outline=rgba(col, a * 0.5), width=2 * S)


def sc_port(t, lt):
    img = chart_bg("NAVIGATION · CHART").copy()
    d = ImageDraw.Draw(img, "RGBA")
    ship_icon(d, *SHIP_POS)
    d.line(P(SHIP_POS[0] + 30, SHIP_POS[1], 540, 430), fill=(90, 220, 255, 90), width=2 * S)
    for i, (cx, cy) in enumerate([(520, 300), (500, 650), (540, 560)]):
        a = 1 - ramp(t, 68.6 + i * 0.3, 68.9 + i * 0.3)
        d.ellipse(P(cx - 5, cy - 5, cx + 5, cy + 5), fill=rgba((255, 255, 255), 0.25 + 0.6 * a))
    px, py = 545, 430
    gone = t >= 69.3
    if not gone:
        d.ellipse(P(px - 10, py - 10, px + 10, py + 10), fill=rgba(GREEN, 1))
        text(d, px - 20, py - 40, "HOME PORT", 18, GREEN, anchor="ra")
    else:
        blink = int(t * 4) % 2
        r = 22 + 10 * math.sin(t * 6)
        d.ellipse(P(px - r, py - r, px + r, py + r), outline=rgba(RED, 0.9), width=3 * S)
        d.line(P(px - 12, py - 12, px + 12, py + 12), fill=rgba(RED, 1), width=4 * S)
        d.line(P(px - 12, py + 12, px + 12, py - 12), fill=rgba(RED, 1), width=4 * S)
        text(d, px - 30, py - 44, "HOME PORT", 18, RED, anchor="ra")
        text(d, px - 30, py + 22, "NO SIGNAL", 16, RED, F_MONO, "ra", alpha=0.4 + 0.6 * blink)
    return img


def wind_arrows(d, t, a=1.0):
    rnd = random.Random(4)
    for i in range(34):
        y = rnd.uniform(230, 760)
        sp = rnd.uniform(90, 160)
        x = 660 - ((rnd.uniform(0, 600) + t * sp) % 600)
        d.line(P(x, y, x + 40, y), fill=rgba((200, 230, 255), 0.5 * a), width=2 * S)
        d.polygon(PP([(x - 8, y), (x + 2, y - 5), (x + 2, y + 5)]), fill=rgba((200, 230, 255), 0.7 * a))


def sc_wind(t, lt):
    img = chart_bg("WEATHER · WIND").copy()
    d = ImageDraw.Draw(img, "RGBA")
    wind_arrows(d, t)
    ship_icon(d, *SHIP_POS)
    tag(d, 70, 690, "WIND: FROM THE EAST", "30 KM/H · TOWARD THE SHIP", CYAN)
    return img


@lru_cache(None)
def cloud_sprite():
    img = Image.new("RGB", (520 * S, 420 * S), (0, 0, 0))
    rnd = random.Random(2)
    for _ in range(26):
        x, y, r = rnd.uniform(130, 390), rnd.uniform(110, 310), rnd.uniform(50, 110)
        glow(img, x, y, r, (110, 108, 100), 0.9)
    return img


def sc_fallout(t, lt):
    img = chart_bg("WEATHER · FALLOUT").copy()
    d = ImageDraw.Draw(img, "RGBA")
    wind_arrows(d, t, 0.5)
    cx = 620 - 120 * ramp(t, 77.1, 80.5)
    spr = cloud_sprite()
    x0, y0 = int((cx - 260) * S), int((520 - 210) * S)
    box = (x0, y0, x0 + spr.size[0], y0 + spr.size[1])
    region = ImageChops.add(img.crop(box), spr)
    clip = Image.new("L", spr.size, 0)
    ImageDraw.Draw(clip).rectangle(((60 * S) - x0, (210 * S) - y0, (660 * S) - x0, (780 * S) - y0), fill=255)
    img.paste(region, (x0, y0), clip)
    d = ImageDraw.Draw(img, "RGBA")
    ship_icon(d, *SHIP_POS, col=RED if int(t * 3) % 2 else CYAN)
    a = ramp(t, 77.2, 77.5)
    text(d, cx, 300, "RADIOACTIVE DUST", 20, RED, F_BOLD, "mm", alpha=a)
    left = max(0, 7200 - (t - 77.86) * 1) if t > 77.86 else 7200
    hh, mm, ss = int(left // 3600), int(left % 3600 // 60), int(left % 60)
    panel(d, 190, 655, 530, 765, "FALLOUT ARRIVES IN", RED, alpha=0.95 * ramp(t, 78.8, 79.1))
    text(d, 360, 728, f"{hh:02d}:{mm:02d}:{ss:02d}", 44, RED, F_MONO, "mm", alpha=ramp(t, 78.8, 79.1))
    return img


def sc_captain(t, lt):
    img = corridor(t)
    rot = t * 5
    glow(img, 360 + math.cos(rot) * 120, 200, 300, (160, 10, 10), 0.6 + 0.4 * math.sin(rot))
    d = ImageDraw.Draw(img, "RGBA")
    d.ellipse(P(270, 140, 450, 320), fill=(20, 20, 24, 255), outline=(60, 60, 70, 255), width=4 * S)
    for r in range(20, 90, 14):
        d.ellipse(P(360 - r, 230 - r, 360 + r, 230 + r), outline=(40, 40, 48, 255), width=3 * S)
    a = ramp(t, 80.6, 80.9)
    panel(d, 70, 400, 650, 520, "CAPTAIN · ALL DECKS", RED, "LIVE", RED, alpha=0.9 * a)
    rnd = random.Random(int(t * 30))
    loud = 1.6 if 82.9 < t < 85.2 else 1
    for i in range(60):
        x = 100 + i * 9
        hh = rnd.uniform(3, 22) * a * loud
        d.line(P(x, 478 - hh, x, 478 + hh), fill=rgba(RED, 0.9 * a), width=3 * S)
    return img


def cross_section(t, show_capacity=False):
    img = console_bg().copy()
    d = ImageDraw.Draw(img, "RGBA")
    panel(d, 40, 150, 680, 820 if show_capacity else 800, "SHIP · CROSS-SECTION", CYAN)
    x0, x1 = 120, 600
    top, wl, bot = 230, 470, 610
    decks = 12
    hull = [(x0 - 10, top), (x1 + 10, top), (x1, bot - 40), (x1 - 60, bot), (x0 + 60, bot), (x0, bot - 40)]
    d.polygon(PP(hull), fill=(20, 26, 40, 255), outline=(160, 180, 210, 200))
    upper_red = ramp(t, 90.3, 90.7)
    lower_green = ramp(t, 89.2, 89.6)
    for i in range(decks):
        y = top + (bot - top) * i / decks
        y2 = top + (bot - top) * (i + 1) / decks
        below = y >= wl
        if below and lower_green:
            d.rectangle(P(x0 + 8, y + 2, x1 - 8, y2 - 2), fill=rgba(GREEN, 0.35 * lower_green))
        if not below and upper_red:
            d.rectangle(P(x0 + 8, y + 2, x1 - 8, y2 - 2), fill=rgba(RED, 0.28 * upper_red))
        d.line(P(x0 + 4, y2, x1 - 4, y2), fill=(255, 255, 255, 30), width=S)
        text(d, x0 - 18, (y + y2) / 2 - 7, str(decks - i), 11, GREY, anchor="ra")
    wl_a = 0.5 + 0.5 * math.sin(t * 8) if 87.5 < t < 89.0 else 0.6
    d.rectangle(P(60, wl, 660, 640), fill=(30, 90, 160, 70))
    d.line(P(60, wl, 660, wl), fill=rgba((120, 200, 255), wl_a), width=3 * S)
    text(d, 650, wl - 22, "WATERLINE", 13, (120, 200, 255), anchor="ra")
    if lower_green:
        text(d, 360, (wl + bot) / 2 - 8, "SAFE ZONE", 22, GREEN, F_BLACK, "mm", alpha=lower_green)
    if upper_red:
        text(d, 360, (top + wl) / 2, "EXPOSED", 22, RED, F_BLACK, "mm", alpha=upper_red)
    if t > 89.9:
        rnd = random.Random(8)
        for i in range(40):
            x = rnd.uniform(70, 650)
            y = 160 + ((rnd.uniform(0, 300) + (t - 89.9) * rnd.uniform(60, 120)) % (wl - 170))
            d.ellipse(P(x - 3, y - 3, x + 3, y + 3), fill=rgba((200, 200, 180), 0.7))
    if show_capacity:
        y = 680
        text(d, 80, y, "SAFE ZONE CAPACITY", 15, GREY)
        d.rounded_rectangle(P(80, y + 28, 640, y + 62), radius=8 * S, fill=(255, 255, 255, 18))
        fill = ramp(t, 93.4, 94.3) * 0.375
        over = ramp(t, 95.8, 96.6)
        d.rounded_rectangle(P(80, y + 28, 80 + 560 * fill, y + 62), radius=8 * S, fill=rgba(GREEN, 1))
        if fill > 0.01:
            text(d, 80 + 560 * fill, y + 72, "1,500", 22, GREEN, F_MONO, "ma")
        if over:
            d.rounded_rectangle(P(80 + 560 * fill, y + 28, 80 + 560 * (fill + (1 - fill) * over), y + 62), radius=8 * S,
                                fill=rgba(RED, 0.5 + 0.5 * (int(t * 4) % 2)))
            text(d, 640, y + 72, "4,000 ON BOARD", 22, RED, F_MONO, "ra", alpha=over)
    return img


def sc_section(t, lt):
    return cross_section(t)


def sc_capacity(t, lt):
    return cross_section(t, True)


def sc_stairs(t, lt):
    img = stairs_bg().copy()
    d = ImageDraw.Draw(img, "RGBA")
    rnd = random.Random(12)
    for i in range(16):
        k = (rnd.uniform(0, 1) + lt * 0.06) % 1
        x = -60 + k * 860
        feet = 300 + k * 950
        person(d, x, feet, 260 + rnd.uniform(-20, 20), (5, 2, 3), walk=t * 7 + i)
    # Daniel and Lily in the foreground
    fx = 250 + lt * 25
    person(d, fx, 1240, 720, (3, 1, 2), walk=t * 6, arm=30)
    person(d, fx + 200, 1260, 420, (3, 1, 2), walk=t * 6 + 1, arm2=40)
    glow(img, 140, 120, 160, (100, 10, 10), 0.6 + 0.4 * math.sin(t * 5))
    return img


def sc_door(t, lt):
    img = door_bg().copy()
    d = ImageDraw.Draw(img, "RGBA")
    x0, y0, x1, y1 = 140, 330, 580, 1040
    rnd = random.Random(6)
    for i in range(6):
        person(d, x0 + 50 + i * 70 + rnd.uniform(-20, 20), y1 + 5, 330 + rnd.uniform(-30, 30), (16, 12, 10), walk=t * 4 + i)
    close = 0.72 * ramp(t, 104.95, 107.6)
    dx = x0 + (x1 - x0) * close
    d.rectangle(P(x0, y0, dx, y1), fill=(54, 60, 70, 255))
    for yy in range(int(y0) + 40, int(y1), 90):
        d.line(P(x0, yy, dx, yy), fill=(30, 34, 40, 255), width=3 * S)
    d.rectangle(P(dx - 18, y0, dx, y1), fill=(80, 86, 96, 255))
    rot = t * 6
    d.rectangle(P(330, 250, 390, 290), fill=(40, 30, 10, 255))
    glow(img, 360, 260, 160, (255, 150, 20), 0.5 + 0.5 * max(0, math.cos(rot)))
    d = ImageDraw.Draw(img, "RGBA")
    a = ramp(t, 104.9, 105.2)
    tag(d, 40, 140, "WATERTIGHT DOOR 3", "CLOSING · LOWER DECKS", RED, a)
    return img


def sc_snow(t, lt):
    img = gradient(((0, (26, 26, 32)), (620, (54, 50, 56)), (621, (14, 16, 22)), (H, (4, 5, 8)))).copy()
    glow(img, 150, 620, 200, (120, 60, 30), 0.7)
    glow(img, 560, 620, 160, (120, 60, 30), 0.5)
    glow(img, 420, 820, 260, (40, 40, 46))
    d = ImageDraw.Draw(img, "RGBA")
    for y in (900, 950):
        d.rectangle(P(0, y, W, y + 8), fill=(10, 10, 14, 255))
    for x in range(30, W, 100):
        d.rectangle(P(x, 900, x + 7, 1060), fill=(10, 10, 14, 255))
    d.rectangle(P(0, 1060, W, H), fill=(8, 8, 12, 255))
    walk = None if t >= 108.3 else t * 6
    reach = ramp(t, 109.7, 110.2)
    person(d, 120, 1250, 760, walk=walk, arm=10)
    person(d, 420, 1180, 420, walk=walk, arm=lerp(8, 95, reach))
    for x, y, r in snow_flakes(t, 108.5, 70):
        d.ellipse(P(x - r, y - r, x + r, y + r), fill=(170, 170, 176, 210))
    return img


def sc_hand(t, lt):
    img = gradient(((0, (30, 30, 36)), (H, (10, 10, 14)))).copy()
    glow(img, 360, 300, 400, (60, 40, 30), 0.6)
    d = ImageDraw.Draw(img, "RGBA")
    flakes = snow_flakes(t, 109.0, 50, big=True)
    for x, y, r in flakes[: len(flakes) // 2]:
        d.ellipse(P(x - r * 0.6, y - r * 0.6, x + r * 0.6, y + r * 0.6), fill=(120, 120, 126, 160))
    hc = (26, 23, 27)
    cx, cy = 360, 560
    glow(img, cx, cy - 60, 330, (50, 46, 52))
    d = ImageDraw.Draw(img, "RGBA")
    d.rounded_rectangle(P(250, 600, 470, 1400), radius=90 * S, fill=hc)            # wrist / sleeve
    d.ellipse(P(cx - 150, cy - 110, cx + 150, cy + 110), fill=hc)                     # palm
    for i, (fx, ln) in enumerate(((-115, 150), (-45, 190), (25, 185), (90, 150))):
        d.rounded_rectangle(P(cx + fx - 26, cy - 60 - ln, cx + fx + 26, cy - 30), radius=26 * S, fill=hc)
    d.rounded_rectangle(P(cx + 130, cy - 40, cx + 270, cy + 10), radius=26 * S, fill=hc)
    d.arc(P(cx - 150, cy - 110, cx + 150, cy + 110), 200, 340, fill=(110, 104, 112, 255), width=3 * S)
    landed = ramp(t, 112.2, 112.5)
    if landed > 0:
        fy = lerp(-40, cy - 20, landed)
        d.ellipse(P(cx - 12, fy - 12, cx + 12, fy + 12), fill=(150, 150, 156, 255))
    for x, y, r in flakes[len(flakes) // 2:]:
        d.ellipse(P(x - r, y - r, x + r, y + r), fill=(170, 170, 176, 220))
    return img


def sc_black(t, lt):
    return solid((0, 0, 0)).copy()


def sc_crew(t, lt):
    img = corridor(t)
    d = ImageDraw.Draw(img, "RGBA")
    k = ramp(t, 71.9, 73.7)
    x = lerp(-260, W + 260, k)
    person(d, x, 1230, 760, (12, 8, 10), walk=t * 9, shirt=(120, 112, 114))
    return img



# (start, scene, zoom start, zoom end, shake)
SCENES = [
    (0.0, sc_hook, 1.0, 1.07, 0),
    (6.55, sc_lights_out, 1.07, 1.12, 0),
    (9.9, sc_time, 1.0, 1.03, 0),
    (13.1, sc_deck, 1.0, 1.16, 0),
    (24.95, sc_systems, 1.0, 1.04, 0),
    (28.45, sc_phone, 1.0, 1.1, 0),
    (33.0, sc_emp, 1.0, 1.05, 0),
    (41.8, sc_dead, 1.12, 1.0, 0),
    (46.05, sc_atrium, 1.03, 1.08, 4),
    (50.45, sc_hum, 1.0, 1.15, 0),
    (52.5, sc_power, 1.08, 1.0, 0),
    (58.45, sc_calm, 1.0, 1.05, 0),
    (61.95, sc_message, 1.0, 1.05, 0),
    (68.25, sc_port, 1.0, 1.06, 0),
    (71.45, sc_crew, 1.03, 1.06, 0),
    (74.8, sc_wind, 1.0, 1.04, 0),
    (77.1, sc_fallout, 1.04, 1.1, 0),
    (80.5, sc_captain, 1.03, 1.08, 0),
    (85.95, sc_section, 1.0, 1.03, 0),
    (91.8, sc_capacity, 1.03, 1.05, 0),
    (97.6, sc_stairs, 1.03, 1.08, 5),
    (103.6, sc_door, 1.0, 1.06, 0),
    (107.45, sc_snow, 1.0, 1.06, 0),
    (110.45, sc_hand, 1.0, 1.14, 0),
    (END, sc_black, 1.0, 1.0, 0),
]




def scene_at(t):
    for i in range(len(SCENES) - 1, -1, -1):
        if t >= SCENES[i][0]:
            nxt = SCENES[i + 1][0] if i + 1 < len(SCENES) else DUR
            return SCENES[i], nxt
    return SCENES[0], SCENES[1][0]


# ---------- captions ----------

KEYWORDS = {"white", "light", "out", "flash", "third", "sound", "music", "engines", "died", "second", "nuclear",
            "pulse", "electronics", "dead", "screaming", "dark", "hum", "generator", "lights", "radio", "over",
            "message", "closed", "coast", "home", "anymore", "white", "wind", "east", "radioactive", "dust", "hours",
            "captain's", "lowest", "now", "steel", "seawater", "radiation", "1,500", "4,000", "stairs", "hundreds",
            "doors", "stopped", "hand", "snowing", "atlantic", "9:42", "lily", "daniel", "port", "blast"}


def load_captions():
    raw = json.load(open(WORDS))
    words = []
    for w in raw:
        if words and w["w"][:1] in ",." and words[-1]["w"][-1:].isdigit():
            words[-1]["w"] += w["w"]
            words[-1]["e"] = w["e"]
        else:
            words.append(dict(w))
    for w in words:
        w["w"] = w["w"].replace("9.42", "9:42")
    chunks, cur = [], []
    for w in words:
        if cur and (len(cur) >= 3 or cur[-1]["w"][-1] in ",.!?" or
                    sum(len(x["w"]) + 1 for x in cur) + len(w["w"]) > 19):
            chunks.append(cur)
            cur = []
        cur.append(w)
    chunks.append(cur)
    out = []
    for i, c in enumerate(chunks):
        start = c[0]["s"] - 0.06
        nxt = chunks[i + 1][0]["s"] - 0.06 if i + 1 < len(chunks) else END
        end = min(nxt, c[-1]["e"] + 0.7) if nxt - c[-1]["e"] > 0.9 else nxt
        out.append((start, min(end, END), c))
    return out


CAPTIONS = None


def draw_captions(img, t):
    global CAPTIONS
    if CAPTIONS is None:
        CAPTIONS = load_captions()
    d = ImageDraw.Draw(img, "RGBA")
    f = font(F_BLACK, 66)
    for start, end, words in CAPTIONS:
        if not (start <= t < end):
            continue
        rise = (1 - ease((t - start) / 0.14)) * 16
        items = [(w["w"].upper(), w) for w in words]
        space = f.getlength(" ")
        lines, line, lw = [], [], 0
        for s, w in items:
            ww = f.getlength(s)
            if line and lw + space + ww > OW - 120:
                lines.append((line, lw))
                line, lw = [], 0
            lw += (space if line else 0) + ww
            line.append((s, w, ww))
        lines.append((line, lw))
        y = 880 * K - (len(lines) - 1) * 40 + rise
        for line, lw in lines:
            x = (OW - lw) / 2
            for s, w, ww in line:
                spoken = t >= w["s"] - 0.03
                key = s.strip(",.!?").lower() in KEYWORDS
                col = (YELLOW if key else (255, 255, 255)) + (255,) if spoken else (170, 170, 180, 150)
                d.text((x, y), s, font=f, fill=col, anchor="lm", stroke_width=7, stroke_fill=(0, 0, 0, 255 if spoken else 170))
                x += ww + space
            y += 80


# ---------- frame assembly ----------

@lru_cache(None)
def vignette():
    y, x = np.ogrid[0:OH, 0:OW]
    dist = np.sqrt(((x - OW / 2) / (OW / 2)) ** 2 + ((y - OH / 2) / (OH / 2)) ** 2)
    v = np.clip(1.15 - 0.45 * dist ** 1.6, 0.35, 1)
    return Image.fromarray((np.repeat(v[..., None], 3, axis=2) * 255).astype(np.uint8))


def render(t):
    (start, fn, z0, z1, shake), nxt = scene_at(t)
    lt = t - start
    img = fn(t, lt)
    z = lerp(z0, z1, clamp(lt / max(0.1, nxt - start)))
    sx = sy = 0
    if shake:
        sx = math.sin(t * 37) * shake * S + math.sin(t * 23) * shake * S
        sy = math.cos(t * 31) * shake * S
    if fn is sc_crew and 72.0 < t < 73.8:
        sx += math.sin(t * 60) * 6 * S
    if fn is sc_captain and 84.8 < t < 85.4:
        sy += math.sin(t * 70) * 8 * S
    cw, ch = CW / z, CH / z
    sx = clamp(sx, -(CW - cw) / 2, (CW - cw) / 2)
    sy = clamp(sy, -(CH - ch) / 2, (CH - ch) / 2)
    box = ((CW - cw) / 2 + sx, (CH - ch) / 2 + sy, (CW + cw) / 2 + sx, (CH + ch) / 2 + sy)
    frame = img.resize((OW, OH), Image.BICUBIC, box=box)
    frame = ImageChops.multiply(frame, vignette())
    if t < END:
        draw_captions(frame, t)
    return frame


def render_bytes(i):
    return render(i / FPS).tobytes()


# ---------- audio ----------

def make_audio():
    sr = 44100
    n = int(DUR * sr)
    tt = np.arange(n) / sr
    rng = np.random.default_rng(1)
    bed = np.zeros(n)

    def idx(s):
        return int(clamp(s, 0, DUR) * sr)

    def env(points):
        """Piecewise-linear envelope from [(time, level), ...]."""
        return np.interp(tt, [p[0] for p in points], [p[1] for p in points])

    def band(x, lo, hi):
        spec = np.fft.rfft(x)
        freqs = np.fft.rfftfreq(len(x), 1 / sr)
        spec[(freqs < lo) | (freqs > hi)] = 0
        return np.fft.irfft(spec, len(x))

    def add(start, sig, vol=1.0):
        i0 = idx(start)
        m = min(len(sig), n - i0)
        if m > 0:
            bed[i0:i0 + m] += sig[:m] * vol

    noise = rng.standard_normal(n)
    ocean = band(noise, 60, 700)
    ocean /= np.abs(ocean).max()
    ext = env([(0, 0.5), (24.9, 0.5), (25.0, 0.12), (41.8, 0.12), (41.9, 0.5), (46.0, 0.5), (46.1, 0.1),
               (58.4, 0.1), (58.5, 0.45), (61.9, 0.45), (62.0, 0.08), (107.4, 0.08), (107.5, 0.5), (DUR, 0.3)])
    bed += ocean * ext * (0.7 + 0.3 * np.sin(2 * np.pi * tt / 6.5)) * 0.35

    # muffled party music (cut by the hook and by "the music stopped")
    music = np.zeros(n)
    chords = [(57, 60, 64), (53, 57, 60), (48, 52, 55), (55, 59, 62)]
    beat = 0.5
    for k in range(int(26 / beat)):
        s = k * beat
        seg = np.arange(int(beat * sr)) / sr
        ch = chords[(k // 4) % 4]
        tone = sum(np.sin(2 * np.pi * 440 * 2 ** ((m - 69) / 12) * seg) for m in ch) / 3
        kick = np.sin(2 * np.pi * (50 + 80 * np.exp(-seg * 30)) * seg) * np.exp(-seg * 14)
        i0 = idx(s)
        music[i0:i0 + len(seg)] += tone * np.exp(-seg * 3) * 0.5 + kick * 0.8
    music = band(music, 30, 700)
    music *= env([(0, 0.45), (6.55, 0.45), (6.62, 0), (9.9, 0), (10.0, 0.4), (25.6, 0.4), (25.66, 0), (DUR, 0)])
    bed += music * 0.6

    # engine rumble and wind-down
    f_eng = env([(0, 38), (27.2, 38), (29.5, 12), (DUR, 12)])
    eng = np.sin(2 * np.pi * np.cumsum(f_eng) / sr) + 0.5 * np.sin(4 * np.pi * np.cumsum(f_eng) / sr)
    bed += eng * env([(0, 0.25), (6.55, 0.25), (6.62, 0), (9.9, 0), (10.0, 0.25), (27.2, 0.25), (29.5, 0), (DUR, 0)]) * 0.5

    # hook swell, then silence
    bed += band(noise, 300, 4000) * env([(4.2, 0), (5.8, 0.25), (6.0, 0), (DUR, 0)])

    def thud(start, vol=0.5, f=70):
        s = np.arange(int(0.4 * sr)) / sr
        add(start, np.sin(2 * np.pi * f * s) * np.exp(-s * 12) + rng.standard_normal(len(s)) * np.exp(-s * 60) * 0.3, vol)

    for s in (7.5, 7.95, 8.5, 9.0, 9.6):
        thud(s, 0.35)
    for s, _ in FLASHES:
        seg = np.arange(int(2.0 * sr)) / sr
        add(s, np.sin(2 * np.pi * 40 * seg) * np.exp(-seg * 2) * np.minimum(1, seg * 20), 0.45)
    bed += np.sin(2 * np.pi * 6400 * tt) * env([(21.1, 0), (21.6, 0.03), (24.9, 0), (DUR, 0)])

    # phone glitch buzz
    gate = (np.sin(2 * np.pi * 9 * tt) > 0.2).astype(float)
    bed += np.sign(np.sin(2 * np.pi * 900 * tt)) * gate * env([(29.85, 0), (29.9, 0.06), (30.66, 0.06), (30.68, 0), (DUR, 0)])

    # EMP: deep boom, then electric crackle
    seg = np.arange(int(3.0 * sr)) / sr
    add(34.98, np.sin(2 * np.pi * np.cumsum(60 - 30 * seg / 3) / sr) * np.exp(-seg * 1.3), 0.6)
    crackle = band(noise, 2000, 9000) * (rng.random(n) < 0.08)
    bed += crackle * env([(37.6, 0), (37.7, 1.5), (38.8, 0.5), (40.6, 0), (DUR, 0)])

    # tension drone from the moment the engines die
    drone = (np.sin(2 * np.pi * 55 * tt) + 0.7 * np.sin(2 * np.pi * 55.4 * tt) + 0.5 * np.sin(2 * np.pi * 82.4 * tt)
             + 0.25 * np.sin(2 * np.pi * 110.3 * tt))
    bed += drone * env([(0, 0), (24.9, 0), (27.5, 0.08), (58.4, 0.05), (61.9, 0.09), (77, 0.12), (107.4, 0.15),
                        (END, 0.16), (DUR, 0)])

    # crowd panic
    crowd = band(noise, 300, 2500) * (0.6 + 0.4 * np.sin(2 * np.pi * 3.1 * tt) * np.sin(2 * np.pi * 0.7 * tt))
    bed += crowd * env([(46.0, 0), (46.2, 0.12), (50.3, 0.12), (50.45, 0), (DUR, 0)])

    # generator hum + flicker clicks
    hum = np.sin(2 * np.pi * 60 * tt) + 0.5 * np.sin(2 * np.pi * 120 * tt) + 0.3 * np.sin(2 * np.pi * 180 * tt)
    bed += hum * env([(51.4, 0), (52.5, 0.15), (56, 0.07), (58.4, 0), (DUR, 0)])
    for k in range(18):
        thud(52.84 + k * 0.17 + (k * 7 % 5) * 0.02, 0.12, 300)

    # radio static and typing
    static = band(noise, 800, 6000)
    bed += static * env([(56.85, 0), (56.9, 0.1), (58.4, 0.1), (58.45, 0), (62.0, 0), (62.1, 0.05), (67.6, 0.05),
                         (67.8, 0), (DUR, 0)])
    for a, b, chars in ((62.45, 63.3, 17), (64.3, 65.35, 21), (66.05, 67.4, 26)):
        for i in range(chars):
            c = np.arange(int(0.02 * sr)) / sr
            add(a + (b - a) * i / chars, rng.standard_normal(len(c)) * np.exp(-c * 300), 0.18)

    # alert beeps: home port lost
    for s in (69.3, 69.55):
        c = np.arange(int(0.18 * sr)) / sr
        add(s, np.sin(2 * np.pi * 520 * c) * np.minimum(1, (0.18 - c) * 40), 0.12)

    # footsteps of the running crew member
    for k in range(10):
        thud(71.9 + k * 0.18, 0.3, 90)

    # fallout timer ticks
    for k in range(5):
        c = np.arange(int(0.03 * sr)) / sr
        add(78.86 + k, np.sin(2 * np.pi * 2000 * c) * np.exp(-c * 150), 0.12)

    # general emergency alarm: seven short blasts and one long
    t0 = 80.5
    for k in range(8):
        ln = 0.35 if k < 7 else 1.6
        c = np.arange(int(ln * sr)) / sr
        horn = np.sign(np.sin(2 * np.pi * 220 * c)) * 0.5 + np.sin(2 * np.pi * 330 * c) * 0.5
        add(t0 + k * 0.6, band(horn, 100, 1500) * np.minimum(1, np.minimum(c, ln - c) * 30), 0.08)

    # heartbeat on the stairs
    for k in range(int((107.4 - 97.6) / 0.75)):
        for off, v in ((0, 0.4), (0.18, 0.28)):
            c = np.arange(int(0.2 * sr)) / sr
            add(97.6 + k * 0.75 + off, np.sin(2 * np.pi * 48 * c) * np.exp(-c * 18), v)

    # watertight door: grinding + warning bell
    grind = band(noise, 80, 700) * (0.6 + 0.4 * np.sin(2 * np.pi * 13 * tt))
    bed += grind * env([(104.9, 0), (105.1, 0.25), (107.4, 0.25), (107.45, 0), (DUR, 0)])
    for k in range(6):
        c = np.arange(int(0.25 * sr)) / sr
        add(104.95 + k * 0.42, np.sin(2 * np.pi * 1250 * c) * np.exp(-c * 10), 0.07)

    # final impact at the cut to black
    c = np.arange(int(1.8 * sr)) / sr
    add(END, np.sin(2 * np.pi * 38 * c) * np.exp(-c * 1.6) + band(rng.standard_normal(len(c)), 40, 400) * np.exp(-c * 3), 0.9)

    bed /= np.abs(bed).max()

    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", VOICE, "-f", "f32le", "-ac", "1", "-ar", str(sr), "-"],
                         capture_output=True, check=True).stdout
    voice = np.frombuffer(raw, np.float32).astype(np.float64)
    voice = np.pad(voice, (0, max(0, n - len(voice))))[:n]
    voice /= np.abs(voice).max()
    # duck the bed under the voice
    win = int(0.08 * sr)
    cs = np.cumsum(np.abs(voice))
    lvl = (cs[win:] - cs[:-win]) / win
    lvl = np.pad(lvl, (win // 2, n - len(lvl) - win // 2), mode="edge")
    duck = 1 - 0.55 * np.clip(lvl / 0.12, 0, 1)
    mix = voice * 0.92 + bed * 0.42 * duck
    mix /= max(1.0, np.abs(mix).max() / 0.97)
    with wave.open(WAV, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes((mix * 32767).astype(np.int16).tobytes())


# ---------- main ----------

def contact_sheet(path, times):
    thumbs = [render(t).resize((270, 480)) for t in times]
    cols = 6
    rows = math.ceil(len(thumbs) / cols)
    sheet = Image.new("RGB", (cols * 274, rows * 484), (255, 255, 255))
    for i, th in enumerate(thumbs):
        sheet.paste(th, ((i % cols) * 274, (i // cols) * 484))
    sheet.save(path)


def main():
    if "--sheet" in sys.argv:
        times = [float(x) for x in sys.argv[sys.argv.index("--sheet") + 1].split(",")]
        contact_sheet(sys.argv[sys.argv.index("--sheet") + 2], times)
        return
    make_audio()
    frames = int(DUR * FPS)
    ff = subprocess.Popen(
        ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{OW}x{OH}",
         "-r", str(FPS), "-i", "-", "-i", WAV, "-c:v", "libx264", "-preset", "medium", "-crf", "19",
         "-pix_fmt", "yuv420p", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", OUT],
        stdin=subprocess.PIPE)
    with Pool(os.cpu_count()) as pool:
        for i, buf in enumerate(pool.imap(render_bytes, range(frames), chunksize=6)):
            ff.stdin.write(buf)
            if i % 300 == 0:
                print(f"frame {i}/{frames}", flush=True)
    ff.stdin.close()
    ff.wait()
    os.remove(WAV)
    print("wrote", OUT)


if __name__ == "__main__":
    main()
