"""Bobo demo cartoon: draws every frame in code and renders a vertical MP4.

Run:  python3 make_cartoon.py
Output: bobo_demo.mp4 (720x1280, 30 fps, ~20 s, with music and sound effects)
"""
import math
import os
import subprocess
import wave

import numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H, S, FPS, DUR = 720, 1280, 2, 30, 20  # S = supersampling for smooth edges
GROUND = 1010
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "bobo_demo.mp4")
WAV = os.path.join(HERE, "bobo_audio.wav")

OUTLINE = (40, 30, 40)
ORANGE = (255, 150, 50)
BELLY = (255, 205, 130)


def font(size):
    path = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    return ImageFont.truetype(path, size * S)


def clamp(v, a=0.0, b=1.0):
    return max(a, min(b, v))


def ease(v):
    v = clamp(v)
    return v * v * (3 - 2 * v)


def p(*vals):
    """Scale output-space coordinates to supersampled canvas coordinates."""
    return [v * S for v in vals]


def ellipse(d, cx, cy, rx, ry, fill, outline=OUTLINE, width=6):
    d.ellipse(p(cx - rx, cy - ry, cx + rx, cy + ry), fill=fill,
              outline=outline, width=width * S if outline else 0)


def limb(d, x1, y1, x2, y2, color=OUTLINE, width=10):
    d.line(p(x1, y1, x2, y2), fill=color, width=width * S)
    r = width / 2
    ellipse(d, x1, y1, r, r, color, None)
    ellipse(d, x2, y2, r, r, color, None)


# ---------- background ----------

def make_background():
    img = Image.new("RGB", (W * S, H * S))
    top, bottom = np.array([110, 190, 255]), np.array([200, 235, 255])
    grad = np.linspace(0, 1, H * S)[:, None]
    sky = (top * (1 - grad) + bottom * grad).astype(np.uint8)
    img.paste(Image.fromarray(np.repeat(sky[:, None, :], W * S, axis=1).reshape(H * S, W * S, 3)))
    d = ImageDraw.Draw(img)
    ellipse(d, 120, 1000, 380, 220, (120, 200, 110), None)
    ellipse(d, 620, 990, 360, 200, (100, 185, 95), None)
    d.rectangle(p(0, GROUND - 20, W, H), fill=(90, 175, 80))
    d.rectangle(p(0, GROUND + 60, W, H), fill=(80, 160, 72))
    for i, fx in enumerate(range(30, W, 70)):  # little flowers
        fy = GROUND + 100 + (i % 3) * 40
        for a in range(5):
            ang = a * 2 * math.pi / 5
            ellipse(d, fx + 9 * math.cos(ang), fy + 9 * math.sin(ang), 7, 7,
                    [(255, 255, 255), (255, 210, 230)][i % 2], None)
        ellipse(d, fx, fy, 6, 6, (255, 210, 60), None)
    return img


def draw_sun(d, t):
    cx, cy = 590, 190
    for i in range(12):
        a = t * 0.6 + i * math.pi / 6
        limb(d, cx + 80 * math.cos(a), cy + 80 * math.sin(a),
             cx + 110 * math.cos(a), cy + 110 * math.sin(a), (255, 200, 40), 12)
    ellipse(d, cx, cy, 65, 65, (255, 220, 60), (240, 170, 30), 5)
    ellipse(d, cx - 22, cy - 8, 6, 8, OUTLINE, None)
    ellipse(d, cx + 22, cy - 8, 6, 8, OUTLINE, None)
    d.arc(p(cx - 25, cy - 10, cx + 25, cy + 30), 20, 160, fill=OUTLINE, width=5 * S)


def draw_cloud(d, cx, cy, s):
    for dx, dy, r in [(-50, 10, 40), (0, -10, 55), (55, 10, 42), (0, 20, 45)]:
        ellipse(d, cx + dx * s, cy + dy * s, r * s, r * s, (255, 255, 255), None)


# ---------- characters ----------

def draw_bobo(d, x, y, t, walking=False, waving=False, talking=False,
              surprised=False, look=(0, 0)):
    """Bobo the orange blob. (x, y) is the point between his feet."""
    R = 95
    phase = t * 2.5 * 2 * math.pi
    swing = math.sin(phase) * 22 if walking else 0
    bob = abs(math.sin(phase)) * 10 if walking else 0
    cx, cy = x, y - 55 - R + 15 - bob

    ellipse(d, x, GROUND + 5, 75, 14, (70, 140, 60), None)  # shadow (stays on ground)
    limb(d, cx - 30, cy + R - 10, x - 30 + swing, y)
    limb(d, cx + 30, cy + R - 10, x + 30 - swing, y)
    ellipse(d, x - 30 + swing, y, 22, 10, OUTLINE, None)
    ellipse(d, x + 30 - swing, y, 22, 10, OUTLINE, None)

    # arms
    lx, ly = cx - R + 8, cy + 15
    la = math.radians(110 + (math.sin(phase) * 15 if walking else 0))
    limb(d, lx, ly, lx + 75 * math.cos(la) - 40, ly + 75 * math.sin(la))
    rx, ry = cx + R - 8, cy + 15
    if waving:
        ra = math.radians(-55 + math.sin(t * 12) * 25)
    elif surprised:
        ra = math.radians(-80)
    else:
        ra = math.radians(70 - (math.sin(phase) * 15 if walking else 0))
    hx, hy = rx + 80 * math.cos(ra), ry + 80 * math.sin(ra)
    limb(d, rx, ry, hx, hy)
    ellipse(d, hx, hy, 14, 14, ORANGE, OUTLINE, 5)
    if surprised:
        ellipse(d, lx - 50, ly - 70, 14, 14, ORANGE, OUTLINE, 5)
        limb(d, lx, ly, lx - 50, ly - 70)

    # antenna
    d.line(p(cx, cy - R, cx + 10, cy - R - 45), fill=OUTLINE, width=6 * S)
    ellipse(d, cx + 10, cy - R - 50, 13, 13, (255, 90, 120), OUTLINE, 5)

    # body
    ellipse(d, cx, cy, R, R, ORANGE)
    ellipse(d, cx, cy + 35, 55, 45, BELLY, None)

    # eyes
    blink = (t % 3.2) < 0.13 and not surprised
    ex, ey, er = 34, cy - 22, (30 if surprised else 24)
    for side in (-1, 1):
        if blink:
            d.line(p(cx + side * ex - 18, ey, cx + side * ex + 18, ey), fill=OUTLINE, width=6 * S)
        else:
            ellipse(d, cx + side * ex, ey, er * 0.85, er, (255, 255, 255), OUTLINE, 4)
            ellipse(d, cx + side * ex + look[0], ey + look[1] + 3, 10, 11, OUTLINE, None)
            ellipse(d, cx + side * ex + look[0] + 4, ey + look[1] - 2, 3.5, 3.5, (255, 255, 255), None)
    ellipse(d, cx - 62, cy + 10, 14, 9, (255, 120, 120), None)
    ellipse(d, cx + 62, cy + 10, 14, 9, (255, 120, 120), None)

    # mouth
    my = cy + 20
    if surprised:
        ellipse(d, cx, my + 8, 12, 15, (120, 30, 40), OUTLINE, 5)
    elif talking:
        h = 6 + abs(math.sin(t * 18)) * 16
        ellipse(d, cx, my + 6, 20, h, (150, 40, 50), OUTLINE, 5)
    else:
        d.arc(p(cx - 25, my - 18, cx + 25, my + 18), 15, 165, fill=OUTLINE, width=6 * S)


def draw_ball(d, x, y_bottom, t):
    r = 42
    cy = y_bottom - r
    ellipse(d, x, GROUND + 5, r * clamp(1 - (GROUND - y_bottom) / 900, 0.2, 1), 10,
            (70, 140, 60), None)
    d.pieslice(p(x - r, cy - r, x + r, cy + r), 0, 360, fill=(255, 255, 255))
    rot = t * 200
    for i, col in enumerate([(240, 60, 60), (60, 130, 240), (255, 210, 50)]):
        start = rot + i * 120
        d.pieslice(p(x - r, cy - r, x + r, cy + r), start, start + 60, fill=col)
    ellipse(d, x, cy, r, r, None, OUTLINE, 5)
    ellipse(d, x, cy, 8, 8, (255, 255, 255), OUTLINE, 3)


def ball_height(tt):
    """Bouncing ball height above ground (0 = touching ground)."""
    return 1100 * math.exp(-1.3 * tt) * abs(math.cos(math.pi * tt * 1.2))


# ---------- text ----------

def speech_bubble(d, x, y, text, t_since, w=440):
    if t_since < 0:
        return
    pop = 1.0 + 0.15 * math.sin(clamp(t_since / 0.25) * math.pi)
    shown = text[: int(t_since * 22)]
    f = font(34)
    lines = text.split("\n")
    h = 50 + 46 * len(lines)
    bw, bh = w * pop, h * pop
    box = p(x - bw / 2, y - bh / 2, x + bw / 2, y + bh / 2)
    d.polygon(p(x - 30, y + bh / 2 - 6, x + 5, y + bh / 2 - 6, x - 50, y + bh / 2 + 50),
              fill=(255, 255, 255), outline=OUTLINE)
    d.rounded_rectangle(box, radius=30 * S, fill=(255, 255, 255), outline=OUTLINE, width=6 * S)
    d.polygon(p(x - 27, y + bh / 2 - 9, x + 2, y + bh / 2 - 9, x - 45, y + bh / 2 + 40),
              fill=(255, 255, 255))
    d.line(p(x - 30, y + bh / 2 - 3, x - 50, y + bh / 2 + 50, x + 5, y + bh / 2 - 3),
           fill=OUTLINE, width=6 * S)
    # draw revealed characters line by line, keeping full-line centering
    remaining = len(shown)
    for i, line in enumerate(lines):
        part = line[: max(0, remaining)]
        remaining -= len(line) + 1
        full_w = d.textlength(line, font=f)
        d.text((x * S - full_w / 2, (y - 23 * len(lines) + 46 * i) * S), part,
               font=f, fill=OUTLINE)


def big_title(d, text, y, size, scale=1.0, color=(255, 255, 255)):
    f = font(int(size * scale))
    d.text((W * S / 2, y * S), text, font=f, fill=color, anchor="mm",
           stroke_width=int(7 * S * scale), stroke_fill=OUTLINE)


# ---------- timeline ----------

BALL_START = 8.0
BALL_X = 530


def render_frame(bg, t):
    img = bg.copy()
    d = ImageDraw.Draw(img)
    draw_sun(d, t)
    draw_cloud(d, (80 + t * 18) % (W + 300) - 150, 330, 1.0)
    draw_cloud(d, (420 + t * 12) % (W + 300) - 150, 480, 0.7)

    # Bobo position and mood
    x, y = 300, GROUND
    kw = {}
    if t < 4:
        x = -150 + 450 * ease((t - 0.3) / 3.5)
        kw = dict(walking=0.3 < t < 3.8)
    elif t < 8:
        kw = dict(waving=t < 6, talking=4.3 < t < 7.3)
    elif t < 11:
        surprised = BALL_START + 0.3 < t < 10.5
        look_y = -8 if t < BALL_START + 1.5 else 4
        kw = dict(surprised=surprised, look=(8, look_y))
    elif t < 15:
        jump = max(0.0, math.sin((t - 11) * math.pi * 2)) * 110
        y = GROUND - jump
        kw = dict(waving=True, talking=12.2 < t < 15)
    else:
        kw = dict(waving=True, talking=15.5 < t < 17)

    if t >= BALL_START:
        draw_ball(d, BALL_X, GROUND - ball_height(t - BALL_START), t - BALL_START
                  if t - BALL_START < 3 else 3)
    draw_bobo(d, x, y, t, **kw)

    if t < 4.2:
        slide = ease(t / 0.8) * (1 - ease((t - 3.4) / 0.8))
        big_title(d, "Meet Bobo!", -60 + 400 * slide, 90)
    speech_bubble(d, 330, 560, "Hi! I'm Bobo!", t - 4.3 if 4.3 < t < 7.8 else -1)
    speech_bubble(d, 300, 560, "Whoa!!", t - (BALL_START + 0.5)
                  if BALL_START + 0.5 < t < 10.6 else -1, w=260)
    speech_bubble(d, 330, 530, "Let's make\ncartoons together!", t - 12.2
                  if 12.2 < t < 15 else -1, w=480)
    if t >= 15:
        k = t - 15
        pulse = (0.6 + 0.4 * ease(k / 0.5)) * (1 + 0.04 * math.sin(k * 6))
        big_title(d, "Send me", 380, 90, pulse, (255, 230, 80))
        big_title(d, "your idea!", 490, 90, pulse, (255, 230, 80))

    return img.resize((W, H), Image.LANCZOS)


# ---------- audio ----------

def make_audio():
    sr = 44100
    n = int(sr * DUR)
    out = np.zeros(n)

    def note(freq, start, length, vol, harm=0.3):
        i0, i1 = int(start * sr), min(n, int((start + length) * sr))
        if i0 >= n:
            return
        tt = np.arange(i1 - i0) / sr
        env = np.exp(-tt * 5) * np.minimum(1, tt * 200)
        out[i0:i1] += vol * env * (np.sin(2 * np.pi * freq * tt) + harm * np.sin(6 * np.pi * freq * tt))

    def midi(m):
        return 440 * 2 ** ((m - 69) / 12)

    melody = [72, 76, 79, 76, 74, 77, 81, 77, 72, 76, 79, 84, 83, 79, 74, 71]
    roots = [48, 53, 55, 48]
    beat = 0.25
    for k in range(int(DUR / beat)):
        note(midi(melody[k % 16]), k * beat, 0.3, 0.12)
    for k in range(int(DUR / 0.5)):
        r = roots[(k // 4) % 4]
        note(midi(r), k * 0.5, 0.45, 0.18, 0.1)
        note(midi(r + 12 + (4 if k % 2 else 7)), k * 0.5 + 0.25, 0.2, 0.05)

    def boing(start, vol):
        i0 = int(start * sr)
        tt = np.arange(int(0.35 * sr)) / sr
        f = 250 + 500 * tt / 0.35 + 40 * np.sin(2 * np.pi * 25 * tt)
        sig = vol * np.sin(2 * np.pi * np.cumsum(f) / sr) * np.exp(-tt * 8)
        out[i0:i0 + len(sig)] += sig[: n - i0]

    def blip(start):
        note(1200, start, 0.08, 0.15, 0)
        note(1600, start + 0.06, 0.08, 0.12, 0)

    for k, vol in enumerate([0.5, 0.35, 0.22, 0.12]):
        boing(BALL_START + (k + 0.5) / 1.2, vol)
    for s in (4.3, BALL_START + 0.5, 12.2, 15.0):
        blip(s)

    fade = np.ones(n)
    fade[-int(1.5 * sr):] = np.linspace(1, 0, int(1.5 * sr))
    out = out * fade
    out = np.int16(out / max(1e-9, np.abs(out).max()) * 0.8 * 32767)
    with wave.open(WAV, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(out.tobytes())


def main():
    make_audio()
    bg = make_background()
    ff = subprocess.Popen(
        ["ffmpeg", "-y", "-loglevel", "error",
         "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
         "-i", WAV, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20",
         "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", OUT],
        stdin=subprocess.PIPE)
    for i in range(FPS * DUR):
        ff.stdin.write(render_frame(bg, i / FPS).tobytes())
    ff.stdin.close()
    ff.wait()
    os.remove(WAV)
    print("wrote", OUT)


if __name__ == "__main__":
    main()
