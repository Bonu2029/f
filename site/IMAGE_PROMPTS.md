# Image slots & prompts

**Status:** all 21 slots are filled (WebP files in `public/images/`). The gallery, before/after, showroom and measurement images are still labeled as demonstrations until real project photos replace them.

Every image on the site is a named **slot** in `src/config/images.js`. Until a slot has a `src`, the page shows a line-drawing placeholder tagged with the slot's name (for example `Image slot · heroInterior`), so you can see exactly where each photo goes.

## How to add an image

1. Save the file to `public/images/` (for example `public/images/hero-interior.jpg`).
2. In `src/config/images.js`, set `src: "images/hero-interior.jpg"` for that slot.
3. When a slot holds a **real project photo** (not a stock or AI image), set `demo: false` to remove the "Demonstration image" label.

**Export tips:** use JPG or WebP. Make hero and closing images 2400px wide, and other images 1600px wide. Aim for under 400 KB each (under 250 KB for the hero).

> **Honesty note:** use AI-generated or stock images only as mood and placeholder imagery. The Projects gallery, the before/after slider and the showroom sequence should show **your real work, vehicle and samples**. Until they do, keep those slots labeled as demonstrations.

---

## Shared style (add this to every prompt)

> Editorial architectural photography, natural daylight, soft directional shadows, warm white / ivory / light stone / charcoal palette, natural wood tones, calm and luxurious, shallow depth of field where appropriate, shot on a full-frame camera with a 35mm or 50mm lens, true-to-life colour, no people looking at the camera, no text, no logos, no watermarks, no purple, blue, orange or neon tones, no heavy gold.

---

## 1. Hero & closing

| Slot | Ratio / size | Prompt |
|---|---|---|
| `heroInterior` | 16:9 · 2400×1350 | A serene, high-end living room in a restored Philadelphia townhouse. A tall, elegant divided-light window fills the right half of the frame, with morning daylight streaming in and casting long, soft window-pane shadows across a pale oak floor and a linen sofa. Plaster walls in warm white, a charcoal accent, minimal styling. **Keep the left third darker and uncluttered for the headline text.** Cinematic and quiet. |
| `closing` | 16:9 · 2400×1350 | The front entrance of a classic brick or stone home at blue hour. A handsome painted wood entry door with glass sidelights and a transom, warm light glowing from inside, a brass-free dark hardware set, potted boxwoods, and stone steps. The centre of the frame is calm enough for overlaid text. Moody, inviting and refined. |

## 2. Services

| Slot | Ratio | Prompt |
|---|---|---|
| `svcWindowInstall` | 4:5 · 1600×2000 | A bright, modern-traditional room with a newly installed set of tall white double-hung windows with clean sightlines and crisp interior trim. Soft daylight, a pale stone windowsill, sheer linen curtains pulled aside. Vertical composition. |
| `svcDoorInstall` | 4:5 | A rich natural-wood front door with narrow glass sidelights, set in a warm white façade. Matte black lever hardware, a stone threshold, and gentle afternoon side-light that shows the wood grain. Vertical, architectural, symmetrical. |
| `svcRepair` | 4:5 | Close-up of a craftsman's hands adjusting the hardware on a wooden window sash, with a small screwdriver and neat tools on a canvas drop cloth. Natural window light, shallow depth of field, workwear in neutral tones. The face is not visible. |

## 3. Craftsmanship (sticky section)

| Slot | Ratio | Prompt |
|---|---|---|
| `craftAppearance` | 4:5 | An extreme close-up of a window corner: a painted wood trim profile, a sash joint and a glazing bead, with raking light revealing the detail. Ivory paint against a soft stone wall. Minimal, tactile, editorial. |
| `craftFunction` | 4:5 | A hand gently opening a large casement window onto a green garden, the sash mid-swing. A light breeze moves a sheer curtain. Bright, airy, natural light. |
| `craftOptions` | 4:5 | A flat lay on a honed limestone surface: wood and fiberglass frame corner samples, glass samples (clear, frosted and reeded), and matte black and satin nickel hardware, arranged with precise spacing. Overhead soft daylight. |

## 4. Historic restoration

| Slot | Ratio | Prompt |
|---|---|---|
| `restoreWood` | 3:4 · 1600×2130 | A macro detail of a restored antique wooden window sash showing old-growth wood grain, wavy hand-blown glass, fresh glazing putty and an original sash lock. Warm, low raking light and a dark background. Reverent and museum-like. |
| `restoreBefore` | 4:3 · 2000×1500 | **Use a real project photo when you can.** A weathered 19th-century wooden double-hung window on a brick rowhouse: peeling paint, cracked glazing putty, a weathered sill, but the original muntins intact. Flat overcast light, shot straight on. |
| `restoreAfter` | 4:3 · 2000×1500 | **Use a real project photo when you can, and the same window and framing as "before".** The same 19th-century wooden window after careful restoration: repainted in warm off-white, new glazing, a repaired sill, and the original wavy glass retained. Same angle and the same flat overcast light, so the slider lines up. |

> For the before/after slider to work, both images must have **the same framing, lens and angle**. Shoot them on a tripod mark, or align them in an editing app before export.

## 5. Mobile showroom

| Slot | Ratio | Prompt |
|---|---|---|
| `showroomArrive` | 4:3 | **Ideally your real vehicle.** A clean, unbranded charcoal or warm white sprinter-style van parked in front of a classic Philadelphia brick rowhome on a tree-lined street. Soft morning light, a calm and premium feel. Leave room to add your own branding later. |
| `showroomPresent` | 4:3 | Inside a beautifully lit, minimal mobile showroom van interior or living room: a consultant (face turned away or out of frame) presents a wood window corner sample and a door hardware board to a homeowner. Warm, natural light and neutral clothing. |
| `showroomCompare` | 4:3 | A homeowner's hands holding two finish samples (one painted ivory, one natural oak) up against an existing window frame to compare them in daylight. Shallow depth of field, a soft interior background. |

## 6. Measurement demo

| Slot | Ratio | Prompt |
|---|---|---|
| `measureWindow` | 4:3 · 2000×1500 | A straight-on, evenly lit photo of a single double-hung window in a plain warm-white wall, with the full frame and trim visible and empty space around it. Clean and graphic, with no curtains, so the animated corner markers read clearly. |

## 7. Project gallery (replace with real project photos)

| Slot | Category | Prompt (placeholder only) |
|---|---|---|
| `gallery1` | Windows | The street façade of a Philadelphia brick rowhome with new black-framed replacement windows, shot at an elevated eye level in soft overcast light. |
| `gallery2` | Doors | A new painted entry door in deep charcoal with a simple transom, on a New Jersey colonial home, in late-afternoon light. |
| `gallery3` | Restoration | A restored original wood sash leaning in a workshop, with the craftsman's tools softly blurred in the foreground. |
| `gallery4` | Doors | Wide glass patio doors opening from a calm kitchen onto a stone terrace and garden, at golden hour. |
| `gallery5` | Windows | A bay window with a deep window seat and linen cushions, with daylight flooding in. |
| `gallery6` | Restoration | A restored 19th-century double front door with original panels and new finish, in a historic doorway with stone surrounds. |

---

## Placeholder text to replace

Fill these in from `src/config/company.js`: company name, phone, email, address, hours, license/registration numbers, and service-area towns. Then set `FORMS.*Endpoint` so the forms actually deliver submissions.
