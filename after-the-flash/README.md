# AFTER THE FLASH — Episode 1

Vertical (1080×1920) animated short, drawn entirely in code (Canvas 2D + Web Audio).

| File | What it is |
|---|---|
| `episode1.html` | Self-contained episode: all code, embedded narration (base64), embedded fonts. Open it and press **Play**. |
| `AfterTheFlash_Ep1.mp4` | 1080×1920, 30 fps, H.264 CRF 20 + AAC 192k (48 kHz), rendered from the same HTML. |
| `shots/` | One PNG per scene, taken at the middle of each scene. |
| `narration.mp3` | The voice track (source for sync). |
| `src/` | Source modules that `tools/build.py` bundles into `episode1.html`. |
| `tools/` | Sync, build, stills and render scripts. |

## Preview
Open `episode1.html` in Chrome/Edge/Firefox and press **Play**. The full mix (narration + music + SFX) is generated
with an `OfflineAudioContext` first (a few seconds), then plays in sync with the picture; the clock is the audio clock.
Set `window.__T = 42.5` in the console to freeze on an exact time.

## Re-render
Requirements: Node + Playwright (Chromium), Python 3, FFmpeg.
```bash
cd after-the-flash
python3 tools/timing.py          # silencedetect on narration.mp3 -> src/timing.js (prints the line + scene table)
python3 tools/build.py           # bundle src/ + narration + fonts -> episode1.html
node tools/stills.js             # shots/sceneNN_*.png (middle of each scene); --times 1.5,20 for any times
node tools/render.js --workers 4 # frames (chunked, parallel) + offline audio -> AfterTheFlash_Ep1.mp4
```
`render.js` flags: `--from/--to` frame range, `--keep` keep `.frames/` (re-runs skip existing frames),
`--force` redraw frames, `--audio` re-render the mix only.

## Determinism
Every frame is a pure function of `t`. One seeded generator (`mulberry32(20261031)`) is used once at load to build the
city, crowd and caches; draw code only uses stateless `hash()`/`snoise()` of time. `window.renderAt(t)` /
`window.frameJPEG(t)` draw an exact time, so the MP4 matches the preview frame for frame.

## Sync
`tools/timing.py` runs `silencedetect=noise=-38dB:d=0.25`, which finds 66 speech lines. They map one-to-one onto the
script (the script's 33 spoken lines are split at their natural pauses), and each scene starts on its first line.
Events inside a line (`AT "Leash"`, `"buzzes"`, `"white"`, and the alert typing word by word) use word timestamps from
`tools/words.json` (faster-whisper); `timing.py` falls back to the line start if that file is missing.
Captions show only while their line is spoken.

## Which function draws what
| Module | Contents |
|---|---|
| `core.js` | RNG/noise, colour, canvas helpers, glow + AO shadows, **camera** (`setCam`: pan/push/pull, Perlin handheld shake, Dutch tilt, constant drift; `layer(f)` parallax), `blurDraw` (rack focus / DOF), `blurFrame`, `whipBlur` |
| `city.js` | `drawSky` (sun, clouds, birds), `buildFar/drawFar` (34-tower skyline, suspension bridge, river glitter, blinking antennas), `buildTowers/drawTowers` (15 glass / art-deco / brick / LED-billboard towers), `buildStrip/drawStrip` (storefront row: Harbor Bagels, Lucky Star Deli, Metro Pharmacy, Kim's Flowers, Tony's Pizza, bank, phone repair, Harbor One lobby with revolving doors, neon OPEN, people inside), sidewalk/road/crosswalk, hydrant, lamp post, trash can, news box, meters, bike rack, trees, steam, traffic light + DON'T WALK, food cart, pigeons, `drawSubwayEntrance` |
| `vehicles.js` | `drawVehicle` (taxi, sedan, SUV, van, bus "4 DOWNTOWN", moto; wheels, head/brake/hazard lights, exhaust, occupants, doors), `drawCyclist`, traffic model `carX` / `drawLane` (free flow + chain braking) |
| `people.js` | Puppet rig `drawPersonSide` / `drawPersonFront`, faces `drawHeadFront` / `drawHeadSide`, hair (12 styles), poses (idle, walk, run, panic, phone, point, crouch, help, sit, trip), cast (YOU, ROSA, MAN, GIRL, DRIVER, VENDOR), `genPerson` crowd generator (90 people: 6 bodies, 10 skins, 12 hair styles, 20 palettes, accessories), props (coffee cup, phone, rabbit) |
| `dog.js` | `drawDog` (Biscuit: walk, trot, run, sniff, pull, leap, growl, sit, lie; wag/tuck, bark lines, collar + tag), `drawLeash` |
| `station.js` | `drawGate` (lattice gate + warning plate with the gold **S**), `buildUpView` (stairs seen from inside), `buildDownView` (stairs going down), `buildStation` (one-point perspective platform, tracks, tunnel, columns, booth, turnstiles, benches, map), emergency lights, cracks, dust rain, motes, speaker, swinging fixture, ash |
| `ui.js` | Tracker + radiation meter, countdown chip, Survival Rule card, supplies bar, captions, code chip, phone alert screen, speech bubbles, choice / end / course cards, grain + vignette + grade |
| `audio.js` | `renderMix`: city bed, emergency tones (853/960 Hz), panic SFX, gate, flash silence + 40 Hz boom, underground drone/drips/PA, banging, growl, music, −8 dB ducking under the voice |
| `scenes_street.js` | `scene1` … `scene17` |
| `scenes_under.js` | `scene18` … `scene33` |
| `main.js` | Scene dispatch, overlays, playback, render hooks |
