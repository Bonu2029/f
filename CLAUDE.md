# Project rules

## Every video render → Instagram post copy (always)
Whenever a video is made or re-rendered (any AFTER THE FLASH episode or any other video in this repo), also deliver an
Instagram post file next to the MP4, named `instagram_<episode>.md` (e.g. `after-the-flash/instagram_ep1.md`), containing:

1. **Description / caption**: a hook first line, a short teaser of the episode (no spoilers past the cliffhanger),
   a call to action (comment your choice, follow for the next episode), and the course line ("link in bio").
2. **Poll**: the episode's choice as an Instagram poll (question + two options, matching the on-screen choice card),
   ready for the Story poll sticker, plus a comment-poll version for the post caption (e.g. "Comment A or B").
3. **Hashtags**: 15–25 relevant hashtags (series, genre, animation, AI-made, survival/thriller, storytelling), placed at the end.

Also paste the caption in the chat reply so it can be copied directly.

## AFTER THE FLASH — story canon (audience choices)
- Ep1 poll result: **B · KEEP IT SHUT** (the gate stays locked). Ep2 script: `after-the-flash/ep2/script.md`.
- Ep2 ends on the choice **A · FOLLOW THE LAUGH** (into the tunnel) vs **B · WAKE THE MAN** (at the gate). Ep2 video: `after-the-flash/ep2/`.
- Ep2 poll result: **B · WAKE THE MAN**. Ep3: `after-the-flash/ep3/` (script, video). The man admits the girl is not his daughter; a voice in the tunnel calls Biscuit by name. Ep3 ends on **A · LET THE MAN IN** vs **B · FOLLOW THE VOICE**.
- Code pieces spell SHELTER across 7 episodes: Ep1 = S, Ep2 = H, Ep3 = E (next: L).
- Each new episode: put its files in `after-the-flash/epN/` (timing via `tools/timing.py`, `cfgN.js` = EPCFG for `src/ui_series.js`, `audioN.js`, `scenesN.js`) and add it to `EPISODES` in `tools/timing.py` and `tools/build.py`. Reuse `src/scene_kit.js` / `src/scene_kit2.js`.
