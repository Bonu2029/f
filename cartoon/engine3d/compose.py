"""Composite rendered 3D frames with captions and the mixed sound bed into an MP4.

Usage: python3 compose.py <frames_dir> <from_seconds> <to_seconds> <out.mp4>
"""
import os
import subprocess
import sys
import wave

import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
STORY = os.path.join(HERE, "..", "dead_in_water")
sys.path.insert(0, STORY)
import make_video as story  # noqa: E402  (captions + fonts)
import sfx  # noqa: E402

FPS = 30
FLASHES = [16.96, 18.96, 21.06]


def overlay(frame, t):
    """2D overlays on top of the 3D render: info tags, then captions."""
    d = ImageDraw.Draw(frame, "RGBA")
    if 13.3 <= t < 16.5:
        a = min(1, (t - 13.3) / 0.25) * min(1, (16.5 - t) / 0.25)
        x, y, k = 60, 260, story.K
        title, sub = "DANIEL & LILY", "TOP DECK · 9:42 PM"
        f1, f2 = story.font(story.F_BLACK, 34), story.font(story.F_BOLD, 20)
        w = max(f1.getlength(title), f2.getlength(sub)) + 60
        d.rounded_rectangle((x, y, x + w, y + 96), radius=12, fill=(8, 10, 18, int(200 * a)))
        d.rectangle((x, y + 12, x + 7, y + 84), fill=(255, 190, 60, int(255 * a)))
        d.text((x + 28, y + 14), title, font=f1, fill=(255, 255, 255, int(255 * a)))
        d.text((x + 28, y + 58), sub, font=f2, fill=(200, 205, 215, int(255 * a)))
    story.draw_captions(frame, t)
    return frame


def main():
    frames_dir, t0, t1, out = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), sys.argv[4]
    wav = out + ".wav"
    bed = sfx.build(t0, t1, [f for f in FLASHES if t0 <= f < t1])
    audio = sfx.mix_with_voice(bed, story.VOICE, t0)
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
