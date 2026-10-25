"""Composite rendered 3D frames with on-screen panels, captions and the mixed sound bed into an MP4.

Usage: python3 compose.py <frames_dir> <from_seconds> <to_seconds> <out.mp4>
"""
import os
import subprocess
import sys
import wave

import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "dead_in_water"))
import make_video as story  # noqa: E402  (captions, fonts and the 2D info panels)
import sfx  # noqa: E402

FPS = 30
K = story.K          # design px -> output px
S = story.S          # design px -> 2D canvas px

# (start, end, 2D scene function, panel box in design coords)
PANELS = [
    (10.0, 13.0, story.sc_time, (70, 170, 650, 420)),
    (24.95, 28.45, story.sc_systems, (50, 170, 670, 800)),
    (42.3, 46.05, story.sc_dead, (120, 200, 600, 330)),
    (53.2, 58.45, story.sc_power, (60, 170, 660, 300)),
    (56.85, 58.45, story.sc_power, (60, 330, 660, 450)),
    (74.8, 77.1, story.sc_wind, (40, 160, 680, 800)),
    (77.1, 80.5, story.sc_fallout, (40, 160, 680, 800)),
    (85.95, 91.8, story.sc_section, (40, 150, 680, 800)),
    (91.8, 97.6, story.sc_capacity, (40, 150, 680, 820)),
]

# (start, end, title, subtitle, accent)
TAGS = [
    (13.3, 16.5, "DANIEL & LILY", "TOP DECK · 9:42 PM", (255, 190, 60)),
    (62.2, 65.0, "SAT-COM MESSAGE", "FROM: COAST GUARD", (80, 255, 150)),
    (80.6, 83.2, "CAPTAIN · ALL DECKS", "EMERGENCY ANNOUNCEMENT", (255, 64, 64)),
    (97.8, 100.5, "STAIRWELL C", "HEADING TO DECK 4", (255, 190, 60)),
    (104.9, 107.4, "WATERTIGHT DOOR 3", "CLOSING · LOWER DECKS", (255, 64, 64)),
]

_masks = {}


def rounded_mask(w, h, r, alpha):
    key = (w, h, r, alpha)
    if key not in _masks:
        m = Image.new("L", (w, h), 0)
        ImageDraw.Draw(m).rounded_rectangle((0, 0, w - 1, h - 1), radius=r, fill=int(255 * alpha))
        _masks[key] = m
    return _masks[key]


def paste_panel(frame, fn, t, box, fade):
    img = fn(t, 0)
    x0, y0, x1, y1 = box
    region = img.crop((int(x0 * S), int(y0 * S), int(x1 * S), int(y1 * S)))
    w, h = int((x1 - x0) * K), int((y1 - y0) * K)
    region = region.resize((w, h), Image.LANCZOS)
    frame.paste(region, (int(x0 * K), int(y0 * K)), rounded_mask(w, h, int(18 * K), round(0.94 * fade, 2)))


def tag(d, t, a, b, title, sub, accent):
    al = min(1, (t - a) / 0.25, (b - t) / 0.25)
    x, y = 60, 230
    f1, f2 = story.font(story.F_BLACK, 34), story.font(story.F_BOLD, 20)
    w = max(f1.getlength(title), f2.getlength(sub)) + 60
    d.rounded_rectangle((x, y, x + w, y + 96), radius=12, fill=(8, 10, 18, int(200 * al)))
    d.rectangle((x, y + 12, x + 7, y + 84), fill=accent + (int(255 * al),))
    d.text((x + 28, y + 14), title, font=f1, fill=(255, 255, 255, int(255 * al)))
    d.text((x + 28, y + 58), sub, font=f2, fill=(200, 205, 215, int(255 * al)))


def emp_labels(d, t):
    """Labels over the 3D globe."""
    f = story.font(story.F_BLACK, 34)
    fm = story.font(story.F_MONO, 30)
    if t >= 35.1:
        a = min(1, (t - 35.1) / 0.3)
        d.rounded_rectangle((250, 300, 830, 370), radius=14, fill=(8, 10, 18, int(200 * a)))
        d.text((540, 335), "NUCLEAR BLAST · 400 KM UP", font=f, fill=(255, 255, 255, int(255 * a)), anchor="mm")
    for i, (name, toff) in enumerate((("SHIP", 38.3), ("PHONES", 38.9), ("GPS", 39.5))):
        if t < 37.8:
            continue
        x, y = 200 + i * 340, 1520
        dead = t >= toff
        col = (255, 64, 64) if dead else (80, 255, 150)
        d.rounded_rectangle((x - 130, y - 45, x + 130, y + 45), radius=14, fill=(8, 12, 22, 220), outline=col + (230,), width=4)
        d.text((x, y), name, font=f, fill=col + (255,), anchor="mm")
        if dead:
            d.line((x - 140, y - 55, x + 140, y + 55), fill=col + (255,), width=7)
    if t >= 39.5:
        a = min(1, (t - 39.5) / 0.3)
        d.text((540, 1650), "RANGE: HUNDREDS OF MILES", font=fm, fill=(255, 190, 60, int(255 * a)), anchor="mm",
               stroke_width=4, stroke_fill=(0, 0, 0, int(255 * a)))


def overlay(frame, t):
    for a, b, fn, box in PANELS:
        if a <= t < b:
            paste_panel(frame, fn, t, box, min(1, (t - a) / 0.2, (b - t) / 0.15))
    d = ImageDraw.Draw(frame, "RGBA")
    for a, b, title, sub, accent in TAGS:
        if a <= t < b:
            tag(d, t, a, b, title, sub, accent)
    if 33.0 <= t < 41.8:
        emp_labels(d, t)
    story.draw_captions(frame, t)
    return frame


def main():
    frames_dir, t0, t1, out = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), sys.argv[4]
    wav = out + ".wav"
    audio = sfx.mix_with_voice(sfx.build(t0, t1), story.VOICE, t0)
    with wave.open(wav, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sfx.SR)
        w.writeframes((audio * 32767).astype(np.int16).tobytes())
    ff = subprocess.Popen(
        ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", "1080x1920", "-r", str(FPS),
         "-i", "-", "-i", wav, "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
         "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-shortest",
         "-movflags", "+faststart", out], stdin=subprocess.PIPE)
    for f in range(round(t0 * FPS), round(t1 * FPS)):
        frame = Image.open(os.path.join(frames_dir, f"{f:05d}.jpg")).convert("RGB")
        ff.stdin.write(overlay(frame, f / FPS).tobytes())
    ff.stdin.close()
    ff.wait()
    os.remove(wav)
    print("wrote", out)


if __name__ == "__main__":
    main()
