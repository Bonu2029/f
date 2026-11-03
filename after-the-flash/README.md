# AFTER THE FLASH

Episodes: **Episode 1** (this folder: `episode1.html`, `AfterTheFlash_Ep1.mp4`, `shots/`) · **Episode 2 "Keep It Shut"** (`ep2/`) · **Episode 3 "Wake the Man"** (`ep3/`) · **Episode 4 "Let Him In"** (`ep4/`) · **Episode 5 "Hide"** (`ep5/`). Each episode folder holds `episodeN.html`, `AfterTheFlash_EpN.mp4`, `shots/`, `instagram_epN.md`, `script.md`.
Every episode shares one engine (`src/`); an episode adds its own timing, UI overrides, sound mix and scene file.

## Episode 1

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
python3 tools/timing.py ep1          # silencedetect on narration.mp3 -> src/timing.js (prints the line + scene table)
python3 tools/build.py ep1           # bundle src/ + narration + fonts -> episode1.html
node tools/stills.js                 # shots/sceneNN_*.png (middle of each scene); --times 1.5,20 for any times
node tools/render.js --workers 4     # frames (chunked, parallel) + offline audio -> AfterTheFlash_Ep1.mp4
# Episodes 2+: same steps with  epN  /  --ep epN   (outputs in epN/)
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

## Episode 2 files
| Module | Contents |
|---|---|
| `src/scene_kit.js` | Shared scene helpers: `gateView`, `gateRed`, `redLight`, `stationRed`, `people`, `manAndGirl`, `youHugBiscuit` (red pulse phase = `RED_T0`) |
| `ep2/src/timing.js` | Generated by `tools/timing.py ep2` (45 caption lines from 49 detected; tiny fragments merged) |
| `ep2/src/ui2.js` | Tracker HOUR 3→4→5, Survival Rule #2, supplies (water highlight, phone 41%→38%), vote-result chip, code piece 2/7 (H), Ep3 choice card |
| `ep2/src/audio2.js` | Ep2 mix: underground bed, keys, gate, coughs, whine, phone blips, heartbeat, child's laugh with tunnel reverb, lights-out clunks, pad |
| `ep2/src/scenes2.js` | `e2scene1` … `e2scene20`: recap, key hand, man sits, "please", station, Biscuit, the girl, hour four, Rosa, rule, phone, hour five, asleep, gone, rabbit, key, sniff, tunnel laugh, lights out, choice |

## Episode 3 + shared series files
| Module | Contents |
|---|---|
| `src/ui_series.js` | On-screen system for Ep2+, driven by each episode's `EPCFG` (tracker steps, rule card, supplies, code chip, vote result, choice card) |
| `src/scene_kit2.js` | Ep2+ helpers: `girlFace`, `keyHand`, `manSitting`, `girlStanding`, `rewindFX`, `floorSet`, `rabbitOnFloor`, `rabbitTag`, `tunnelView`, `redP` |
| `ep3/src/cfg3.js` | Ep3 EPCFG (HOUR 5→6, Rule #3, phone 38%→35%, code piece 3/7 = E, Ep2 vote result, Ep4 choice) |
| `ep3/src/scenes3.js` | `flashlit` (phone-flashlight cone that reveals the dark scene), `e3scene1` … `e3scene22` incl. the Ep1-street flashback (uses `src/scenes_street.js`) and the crayon drawing |
| `ep3/src/audio3.js` | Ep3 mix |

## Episode 4
| Module | Contents |
|---|---|
| `src/scene_kit3.js` | Shared from Ep3 on: `flashlit` (phone-flashlight cone), `gateDark`, `asleepMan`, `TOPKEEP`, `MAN_CLEAN` / `MAN_SHIRT`, `crayon`, `drawingPaper` |
| `ep4/src/cfg4.js` | Ep4 EPCFG (HOUR 6→7, Rule #4, water 1→12 / food 0→6 roll-up, phone 35%→33%, code piece 4/7 = L, Ep3 vote result, Ep5 choice) |
| `ep4/src/scenes4.js` | `e4scene1` … `e4scene22`: floor lock, gate lift + daylight under it, Daniel crawling under, slam, Biscuit sniffing, seven code slots, booth, supply shelf, lost-and-found box, raincoat with gold L, humming rails, glow in the tunnel |
| `ep4/src/audio4.js` | Ep4 mix |

## Episode 5
| Module | Contents |
|---|---|
| `src/scene_kit3.js` (added) | `DANIEL`, `danielFace`, `drawSlots`, `smallBooth`, `lostFoundBox`, `raincoat` (moved from Ep4) |
| `ep5/src/cfg5.js` | Ep5 EPCFG (HOUR 7→8, Rule #5, code piece 5/7 = T, Ep4 vote result, Ep6 choice) |
| `ep5/src/scenes5.js` | `HAZ` figures with gas masks (`hazSide`, `hazFront` incl. the stenciled T on the back), the rail handcart (`cartSide`, `cartFront`) with swinging lantern + radio, `boothLook` (view from inside the ticket booth), `e5scene1` … `e5scene24` |
| `ep5/src/audio5.js` | Ep5 mix |
