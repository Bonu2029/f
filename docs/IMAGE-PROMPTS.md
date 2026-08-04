# Image brief — Massiel Beauty Salon

Thirty image slots. Each prompt below is complete and copy-paste ready — the shared house style is already appended, which is what keeps thirty images looking like one campaign instead of thirty stock photos.

## How to use this

```
1. Generate (or shoot) each image using the prompt for its slot id
2. Save it as   public/images/art/<slot-id>.jpg    (.webp and .avif also work)
3. Run          node scripts/adopt-images.mjs
```

That last step rewrites `src/lib/images.ts` for every slot it finds a real file for, and leaves the rest on their placeholder art. Partial delivery is fine — swap in five images or all thirty.

## Ground rules

- **Aspect ratios matter.** Each slot is laid out to its ratio. An image at the wrong ratio will be centre-cropped and you will lose the edges.
- **One light source, one mood.** Soft diffused daylight from a window, warm cream and champagne tones, sage and brushed-copper accents. No hard flash, no cool blue shadows, no neon, no black backgrounds.
- **No text or logos in the image.** Type is handled by the site.
- **The six transformation images must be the salon's own real client work**, photographed with written consent. Each before/after pair has to match exactly — same camera position, same distance, same lighting, same background. A pair that does not match will look wrong the moment the slider moves.
- **Faces are optional.** Much of this brief is written three-quarters from behind or as close detail, which is deliberate — it ages well and avoids consent problems.

## The house style

This sentence is already appended to every prompt below. If you are writing new prompts, append it to those too.

> editorial beauty campaign photography, soft diffused natural window light, warm cream and champagne palette with dusty rose and sage accents, brushed copper details, matte ivory walls, 35mm film grain, shallow depth of field, calm luxurious mood, no text, no logos, no harsh contrast, no neon

---

## Hero

### 01. `hero-primary` ✅ delivered

> Already filled with a real photograph. The prompt below is kept for reference — only regenerate if you want to replace it.

**Where it appears** — Homepage hero — the large arched image. First thing anyone sees.

**Aspect ratio** `2:3`  ·  **Minimum size** 1200 × 1800px  ·  **Save as** `public/images/art/hero-primary.jpg`

**Alt text already written for it** — "A stylist blow-drying a client's long balayage waves in the studio's arched styling room"

**Prompt**

```text
Wide editorial interior of a luxury hair studio, a stylist mid-motion finishing a long glossy balayage blowout, client seen three-quarters from behind, tall arched window, linen curtains, sage plants, brushed copper fixtures. editorial beauty campaign photography, soft diffused natural window light, warm cream and champagne palette with dusty rose and sage accents, brushed copper details, matte ivory walls, 35mm film grain, shallow depth of field, calm luxurious mood, no text, no logos, no harsh contrast, no neon
```

### 02. `hero-secondary` ✅ delivered

> Already filled with a real photograph. The prompt below is kept for reference — only regenerate if you want to replace it.

**Where it appears** — Homepage hero — petal-shaped image overlapping the bottom-left of the arch.

**Aspect ratio** `3:4`  ·  **Minimum size** 1200 × 1600px  ·  **Save as** `public/images/art/hero-secondary.jpg`

**Alt text already written for it** — "Long dimensional balayage finished in soft waves, seen from behind"

**Prompt**

```text
Extreme close-up of freshly finished balayage hair, ribbons of warm caramel and champagne through soft brunette, light catching the mid-lengths, hands lifting a section. editorial beauty campaign photography, soft diffused natural window light, warm cream and champagne palette with dusty rose and sage accents, brushed copper details, matte ivory walls, 35mm film grain, shallow depth of field, calm luxurious mood, no text, no logos, no harsh contrast, no neon
```

### 03. `hero-detail` ✅ delivered

> Already filled with a real photograph. The prompt below is kept for reference — only regenerate if you want to replace it.

**Where it appears** — Homepage hero — small circular image top-right; reused in the reviews block.

**Aspect ratio** `1:1`  ·  **Minimum size** 1400 × 1400px  ·  **Save as** `public/images/art/hero-detail.jpg`

**Alt text already written for it** — "A hand with a sheer rose nude manicure resting on cream linen beside a copper vessel"

**Prompt**

```text
Close-up of softly manicured hands with a sheer rose nude nail finish resting on a cream marble console beside a small brushed copper bowl and a single dried stem. editorial beauty campaign photography, soft diffused natural window light, warm cream and champagne palette with dusty rose and sage accents, brushed copper details, matte ivory walls, 35mm film grain, shallow depth of field, calm luxurious mood, no text, no logos, no harsh contrast, no neon
```

---

## Services

### 04. `service-color` ✅ delivered

> Already filled with a real photograph. The prompt below is kept for reference — only regenerate if you want to replace it.

**Where it appears** — Services — block 01, Hair Colour.

**Aspect ratio** `4:5`  ·  **Minimum size** 1280 × 1600px  ·  **Save as** `public/images/art/service-color.jpg`

**Alt text already written for it** — "A colourist working through a client's highlighted lengths at the studio's product-lined styling station"

**Prompt**

```text
Colour bar detail, a colourist blending bespoke tone in a ceramic bowl, tinted brushes, foils fanned on a linen cloth, warm neutral tones. editorial beauty campaign photography, soft diffused natural window light, warm cream and champagne palette with dusty rose and sage accents, brushed copper details, matte ivory walls, 35mm film grain, shallow depth of field, calm luxurious mood, no text, no logos, no harsh contrast, no neon
```

### 05. `service-balayage` ✅ delivered

> Already filled with a real photograph. The prompt below is kept for reference — only regenerate if you want to replace it.

**Where it appears** — Services — block 02, Balayage.

**Aspect ratio** `3:4`  ·  **Minimum size** 1200 × 1600px  ·  **Save as** `public/images/art/service-balayage.jpg`

**Alt text already written for it** — "A stylist lifting a section of finished balayage to check the blend through the mid-lengths"

**Prompt**

```text
Hand-painted balayage being swept freehand through mid-lengths, lightener on the brush, soft focus salon interior behind, sunlit. editorial beauty campaign photography, soft diffused natural window light, warm cream and champagne palette with dusty rose and sage accents, brushed copper details, matte ivory walls, 35mm film grain, shallow depth of field, calm luxurious mood, no text, no logos, no harsh contrast, no neon
```

### 06. `service-extensions` ✅ delivered

> Already filled with a real photograph. The prompt below is kept for reference — only regenerate if you want to replace it.

**Where it appears** — Services — block 03, Hair Extensions.

**Aspect ratio** `4:5`  ·  **Minimum size** 1280 × 1600px  ·  **Save as** `public/images/art/service-extensions.jpg`

**Alt text already written for it** — "Hand-tied extension wefts laid out before an application"

**Prompt**

```text
Hand-tied hair extension wefts laid in a neat row on cream linen, matched to a natural brunette base, soft shadow, still-life composition. editorial beauty campaign photography, soft diffused natural window light, warm cream and champagne palette with dusty rose and sage accents, brushed copper details, matte ivory walls, 35mm film grain, shallow depth of field, calm luxurious mood, no text, no logos, no harsh contrast, no neon
```

### 07. `service-haircut` ✅ delivered

> Already filled with a real photograph. The prompt below is kept for reference — only regenerate if you want to replace it.

**Where it appears** — Services — block 04, Haircuts.

**Aspect ratio** `4:5`  ·  **Minimum size** 1280 × 1600px  ·  **Save as** `public/images/art/service-haircut.jpg`

**Alt text already written for it** — "A precision cut in progress, hair sectioned with clips and shears in hand"

**Prompt**

```text
Precision haircut in progress, hair sectioned with clips, shears in hand, mirror reflection softly out of focus, calm quiet moment. editorial beauty campaign photography, soft diffused natural window light, warm cream and champagne palette with dusty rose and sage accents, brushed copper details, matte ivory walls, 35mm film grain, shallow depth of field, calm luxurious mood, no text, no logos, no harsh contrast, no neon
```

### 08. `service-blowout` ✅ delivered

> Already filled with a real photograph. The prompt below is kept for reference — only regenerate if you want to replace it.

**Where it appears** — Services — block 05, Blowouts.

**Aspect ratio** `4:5`  ·  **Minimum size** 1280 × 1600px  ·  **Save as** `public/images/art/service-blowout.jpg`

**Alt text already written for it** — "A blowout being lifted and shaped with a round brush, backlit by the studio window"

**Prompt**

```text
Voluminous blowout being finished with a round brush, hair lifting in motion, backlit by a window, glossy healthy movement. editorial beauty campaign photography, soft diffused natural window light, warm cream and champagne palette with dusty rose and sage accents, brushed copper details, matte ivory walls, 35mm film grain, shallow depth of field, calm luxurious mood, no text, no logos, no harsh contrast, no neon
```

### 09. `service-nails` ✅ delivered

> Already filled with a real photograph. The prompt below is kept for reference — only regenerate if you want to replace it.

**Where it appears** — Services — block 06, Nail Services.

**Aspect ratio** `4:5`  ·  **Minimum size** 1280 × 1600px  ·  **Save as** `public/images/art/service-nails.jpg`

**Alt text already written for it** — "A nail treatment at the studio's manicure table"

**Prompt**

```text
Manicure table still life, hands mid nail treatment, sheer rose and soft taupe polish bottles, folded ivory towel, copper lamp, warm light. editorial beauty campaign photography, soft diffused natural window light, warm cream and champagne palette with dusty rose and sage accents, brushed copper details, matte ivory walls, 35mm film grain, shallow depth of field, calm luxurious mood, no text, no logos, no harsh contrast, no neon
```

### 10. `service-beauty` ✅ delivered

> Already filled with a real photograph. The prompt below is kept for reference — only regenerate if you want to replace it.

**Where it appears** — Services — block 07, Beauty Treatments.

**Aspect ratio** `4:5`  ·  **Minimum size** 1280 × 1600px  ·  **Save as** `public/images/art/service-beauty.jpg`

**Alt text already written for it** — "A calm beauty treatment room with soft towels and warm light"

**Prompt**

```text
Beauty treatment room, rolled ivory towels, ceramic bowls, dried florals, a treatment bed with linen throw, deeply calm spa atmosphere. editorial beauty campaign photography, soft diffused natural window light, warm cream and champagne palette with dusty rose and sage accents, brushed copper details, matte ivory walls, 35mm film grain, shallow depth of field, calm luxurious mood, no text, no logos, no harsh contrast, no neon
```

---

## The Studio

### 11. `studio-portrait` ✅ delivered

> Already filled with a real photograph. The prompt below is kept for reference — only regenerate if you want to replace it.

**Where it appears** — The Studio — large portrait in an organic petal mask.

**Aspect ratio** `4:5`  ·  **Minimum size** 1280 × 1600px  ·  **Save as** `public/images/art/studio-portrait.jpg`

**Alt text already written for it** — "A stylist standing in her studio in a linen apron, brushes in the pocket"

**Prompt**

```text
Editorial portrait of a professional hair stylist standing in her studio, relaxed confident posture, neutral linen apron, soft window light on the face, warm cream background. editorial beauty campaign photography, soft diffused natural window light, warm cream and champagne palette with dusty rose and sage accents, brushed copper details, matte ivory walls, 35mm film grain, shallow depth of field, calm luxurious mood, no text, no logos, no harsh contrast, no neon
```

### 12. `studio-interior` ✅ delivered

> Already filled with a real photograph. The prompt below is kept for reference — only regenerate if you want to replace it.

**Where it appears** — The Studio — wide interior banner, cropped to 21:9 on the page.

**Aspect ratio** `3:2`  ·  **Minimum size** 1800 × 1200px  ·  **Save as** `public/images/art/studio-interior.jpg`

**Alt text already written for it** — "The studio's front room, arched mirrors and linen seating"

**Prompt**

```text
Salon front room interior, arched mirrors, cream boucle seating, brushed copper rail, dried pampas in a tall vessel, sunlight falling across a limewash wall. editorial beauty campaign photography, soft diffused natural window light, warm cream and champagne palette with dusty rose and sage accents, brushed copper details, matte ivory walls, 35mm film grain, shallow depth of field, calm luxurious mood, no text, no logos, no harsh contrast, no neon
```

### 13. `studio-detail` ✅ delivered

> Already filled with a real photograph. The prompt below is kept for reference — only regenerate if you want to replace it.

**Where it appears** — The Studio — small pebble-shaped still life overlapping the portrait.

**Aspect ratio** `1:1`  ·  **Minimum size** 1400 × 1400px  ·  **Save as** `public/images/art/studio-detail.jpg`

**Alt text already written for it** — "Copper shears and a folded linen towel on a marble counter"

**Prompt**

```text
Still life, brushed copper shears and a folded linen towel on cream marble, single sprig of eucalyptus, quiet shadow play. editorial beauty campaign photography, soft diffused natural window light, warm cream and champagne palette with dusty rose and sage accents, brushed copper details, matte ivory walls, 35mm film grain, shallow depth of field, calm luxurious mood, no text, no logos, no harsh contrast, no neon
```

---

## Transformations

### 14. `transform-1-before` ✅ delivered

> Already filled with a real photograph. The prompt below is kept for reference — only regenerate if you want to replace it.

**Where it appears** — Transformations — featured slider, BEFORE half.

**Aspect ratio** `3:4`  ·  **Minimum size** 1200 × 1600px  ·  **Save as** `public/images/art/transform-1-before.jpg`

**Alt text already written for it** — "Illustrative example, before: grown-out colour with uneven banding"

**Prompt**

```text
Hair before a colour correction, grown-out roots and uneven banding, honest documentary lighting, neutral cream backdrop, three-quarter back view. editorial beauty campaign photography, soft diffused natural window light, warm cream and champagne palette with dusty rose and sage accents, brushed copper details, matte ivory walls, 35mm film grain, shallow depth of field, calm luxurious mood, no text, no logos, no harsh contrast, no neon
```

### 15. `transform-1-after` ✅ delivered

> Already filled with a real photograph. The prompt below is kept for reference — only regenerate if you want to replace it.

**Where it appears** — Transformations — featured slider, AFTER half.

**Aspect ratio** `3:4`  ·  **Minimum size** 1200 × 1600px  ·  **Save as** `public/images/art/transform-1-after.jpg`

**Alt text already written for it** — "Illustrative example, after: seamless dimensional balayage"

**Prompt**

```text
Same hair after a seamless dimensional balayage, soft root melt into warm champagne ends, glossy finish, identical framing and neutral cream backdrop, three-quarter back view. editorial beauty campaign photography, soft diffused natural window light, warm cream and champagne palette with dusty rose and sage accents, brushed copper details, matte ivory walls, 35mm film grain, shallow depth of field, calm luxurious mood, no text, no logos, no harsh contrast, no neon
```

### 16. `transform-2-before` ✅ delivered

> Already filled with a real photograph. The prompt below is kept for reference — only regenerate if you want to replace it.

**Where it appears** — Transformations — second slider, BEFORE half.

**Aspect ratio** `3:4`  ·  **Minimum size** 1200 × 1600px  ·  **Save as** `public/images/art/transform-2-before.jpg`

**Alt text already written for it** — "Illustrative example, before: fine hair at shoulder length"

**Prompt**

```text
Fine shoulder-length hair before an extension application, neutral cream backdrop, three-quarter back view, documentary lighting. editorial beauty campaign photography, soft diffused natural window light, warm cream and champagne palette with dusty rose and sage accents, brushed copper details, matte ivory walls, 35mm film grain, shallow depth of field, calm luxurious mood, no text, no logos, no harsh contrast, no neon
```

### 17. `transform-2-after` ✅ delivered

> Already filled with a real photograph. The prompt below is kept for reference — only regenerate if you want to replace it.

**Where it appears** — Transformations — second slider, AFTER half.

**Aspect ratio** `3:4`  ·  **Minimum size** 1200 × 1600px  ·  **Save as** `public/images/art/transform-2-after.jpg`

**Alt text already written for it** — "Illustrative example, after: hand-tied extensions adding length and body"

**Prompt**

```text
Same hair after hand-tied extensions, added length and body, blended invisibly, soft waves, identical framing and neutral cream backdrop, three-quarter back view. editorial beauty campaign photography, soft diffused natural window light, warm cream and champagne palette with dusty rose and sage accents, brushed copper details, matte ivory walls, 35mm film grain, shallow depth of field, calm luxurious mood, no text, no logos, no harsh contrast, no neon
```

### 18. `transform-3-before` ✅ delivered

> Already filled with a real photograph. The prompt below is kept for reference — only regenerate if you want to replace it.

**Where it appears** — Transformations — third slider, BEFORE half.

**Aspect ratio** `3:4`  ·  **Minimum size** 1200 × 1600px  ·  **Save as** `public/images/art/transform-3-before.jpg`

**Alt text already written for it** — "Illustrative example, before: heavy blunt one-length hair"

**Prompt**

```text
Heavy blunt long hair before a cut and gloss, neutral cream backdrop, three-quarter view, documentary lighting. editorial beauty campaign photography, soft diffused natural window light, warm cream and champagne palette with dusty rose and sage accents, brushed copper details, matte ivory walls, 35mm film grain, shallow depth of field, calm luxurious mood, no text, no logos, no harsh contrast, no neon
```

### 19. `transform-3-after` ✅ delivered

> Already filled with a real photograph. The prompt below is kept for reference — only regenerate if you want to replace it.

**Where it appears** — Transformations — third slider, AFTER half.

**Aspect ratio** `3:4`  ·  **Minimum size** 1200 × 1600px  ·  **Save as** `public/images/art/transform-3-after.jpg`

**Alt text already written for it** — "Illustrative example, after: a shaped layered cut with a clear gloss finish"

**Prompt**

```text
Same hair after a shaped layered cut with a clear gloss finish, light movement and shine, identical framing and neutral cream backdrop, three-quarter view. editorial beauty campaign photography, soft diffused natural window light, warm cream and champagne palette with dusty rose and sage accents, brushed copper details, matte ivory walls, 35mm film grain, shallow depth of field, calm luxurious mood, no text, no logos, no harsh contrast, no neon
```

---

## Gallery

### 20. `gallery-01` ✅ delivered

> Already filled with a real photograph. The prompt below is kept for reference — only regenerate if you want to replace it.

**Where it appears** — Gallery — featured tile. Filter: Colour.

**Aspect ratio** `4:5`  ·  **Minimum size** 1280 × 1600px  ·  **Save as** `public/images/art/gallery-01.jpg`

**Alt text already written for it** — "A stylist combing through a client's champagne balayage waves at the chair"

**Prompt**

```text
Soft champagne balayage styled in loose waves, seen from behind against a limewash wall. editorial beauty campaign photography, soft diffused natural window light, warm cream and champagne palette with dusty rose and sage accents, brushed copper details, matte ivory walls, 35mm film grain, shallow depth of field, calm luxurious mood, no text, no logos, no harsh contrast, no neon
```

### 21. `gallery-02`

**Where it appears** — Gallery tile. Filter: Nails & Beauty.

**Aspect ratio** `1:1`  ·  **Minimum size** 1400 × 1400px  ·  **Save as** `public/images/art/gallery-02.jpg`

**Alt text already written for it** — "A sheer rose nude manicure"

**Prompt**

```text
Sheer rose nude manicure, hand resting on cream linen, close macro, delicate. editorial beauty campaign photography, soft diffused natural window light, warm cream and champagne palette with dusty rose and sage accents, brushed copper details, matte ivory walls, 35mm film grain, shallow depth of field, calm luxurious mood, no text, no logos, no harsh contrast, no neon
```

### 22. `gallery-03` ✅ delivered

> Already filled with a real photograph. The prompt below is kept for reference — only regenerate if you want to replace it.

**Where it appears** — Gallery tile. Filter: Cuts & Styling.

**Aspect ratio** `4:5`  ·  **Minimum size** 1280 × 1600px  ·  **Save as** `public/images/art/gallery-03.jpg`

**Alt text already written for it** — "A sculpted blowout with deep body"

**Prompt**

```text
Sculpted blowout with deep body and bend, hair in motion, backlit. editorial beauty campaign photography, soft diffused natural window light, warm cream and champagne palette with dusty rose and sage accents, brushed copper details, matte ivory walls, 35mm film grain, shallow depth of field, calm luxurious mood, no text, no logos, no harsh contrast, no neon
```

### 23. `gallery-04` ✅ delivered

> Already filled with a real photograph. The prompt below is kept for reference — only regenerate if you want to replace it.

**Where it appears** — Gallery tile. Filter: Colour.

**Aspect ratio** `3:4`  ·  **Minimum size** 1200 × 1600px  ·  **Save as** `public/images/art/gallery-04.jpg`

**Alt text already written for it** — "Sandy blonde balayage finished in soft waves, seen from behind"

**Prompt**

```text
Copper-toned hair colour catching low afternoon light, close three-quarter view, warm glow. editorial beauty campaign photography, soft diffused natural window light, warm cream and champagne palette with dusty rose and sage accents, brushed copper details, matte ivory walls, 35mm film grain, shallow depth of field, calm luxurious mood, no text, no logos, no harsh contrast, no neon
```

### 24. `gallery-05` ✅ delivered

> Already filled with a real photograph. The prompt below is kept for reference — only regenerate if you want to replace it.

**Where it appears** — Gallery tile. Filters: The Studio, Colour.

**Aspect ratio** `4:3`  ·  **Minimum size** 1600 × 1200px  ·  **Save as** `public/images/art/gallery-05.jpg`

**Alt text already written for it** — "The colour bar, bowls and brushes at rest"

**Prompt**

```text
Colour bar at rest, ceramic bowls and tint brushes arranged neatly, foils, soft shadow. editorial beauty campaign photography, soft diffused natural window light, warm cream and champagne palette with dusty rose and sage accents, brushed copper details, matte ivory walls, 35mm film grain, shallow depth of field, calm luxurious mood, no text, no logos, no harsh contrast, no neon
```

### 25. `gallery-06` ✅ delivered

> Already filled with a real photograph. The prompt below is kept for reference — only regenerate if you want to replace it.

**Where it appears** — Gallery — featured tile. Filter: Cuts & Styling.

**Aspect ratio** `4:5`  ·  **Minimum size** 1280 × 1600px  ·  **Save as** `public/images/art/gallery-06.jpg`

**Alt text already written for it** — "A precision blunt cut with a clean line"

**Prompt**

```text
Precision blunt cut with a clean line, glossy dark hair, minimal styling, plain cream backdrop. editorial beauty campaign photography, soft diffused natural window light, warm cream and champagne palette with dusty rose and sage accents, brushed copper details, matte ivory walls, 35mm film grain, shallow depth of field, calm luxurious mood, no text, no logos, no harsh contrast, no neon
```

### 26. `gallery-07`

**Where it appears** — Gallery tile. Filters: Nails & Beauty, The Studio.

**Aspect ratio** `1:1`  ·  **Minimum size** 1400 × 1400px  ·  **Save as** `public/images/art/gallery-07.jpg`

**Alt text already written for it** — "A beauty treatment detail, warm towels and ceramics"

**Prompt**

```text
Beauty treatment detail, warm rolled towel and ceramic bowl, dried flower, calm still life. editorial beauty campaign photography, soft diffused natural window light, warm cream and champagne palette with dusty rose and sage accents, brushed copper details, matte ivory walls, 35mm film grain, shallow depth of field, calm luxurious mood, no text, no logos, no harsh contrast, no neon
```

### 27. `gallery-08` ✅ delivered

> Already filled with a real photograph. The prompt below is kept for reference — only regenerate if you want to replace it.

**Where it appears** — Gallery tile. Filters: Colour, Cuts & Styling.

**Aspect ratio** `3:4`  ·  **Minimum size** 1200 × 1600px  ·  **Save as** `public/images/art/gallery-08.jpg`

**Alt text already written for it** — "Copper-toned waves catching late afternoon light"

**Prompt**

```text
Hand-tied extensions blended into natural lengths, sectioned to show the invisible join, soft light. editorial beauty campaign photography, soft diffused natural window light, warm cream and champagne palette with dusty rose and sage accents, brushed copper details, matte ivory walls, 35mm film grain, shallow depth of field, calm luxurious mood, no text, no logos, no harsh contrast, no neon
```

### 28. `gallery-09` ✅ delivered

> Already filled with a real photograph. The prompt below is kept for reference — only regenerate if you want to replace it.

**Where it appears** — Gallery tile. Filter: Cuts & Styling.

**Aspect ratio** `4:5`  ·  **Minimum size** 1280 × 1600px  ·  **Save as** `public/images/art/gallery-09.jpg`

**Alt text already written for it** — "A voluminous layered blowout with deep body and bend"

**Prompt**

```text
Soft romantic updo finished with a single brushed copper pin, loose face-framing pieces, neutral backdrop. editorial beauty campaign photography, soft diffused natural window light, warm cream and champagne palette with dusty rose and sage accents, brushed copper details, matte ivory walls, 35mm film grain, shallow depth of field, calm luxurious mood, no text, no logos, no harsh contrast, no neon
```

### 29. `gallery-10`

**Where it appears** — Gallery tile. Filter: The Studio.

**Aspect ratio** `3:2`  ·  **Minimum size** 1800 × 1200px  ·  **Save as** `public/images/art/gallery-10.jpg`

**Alt text already written for it** — "The studio window seat with dried florals"

**Prompt**

```text
Studio window seat, linen cushion, dried florals in a ceramic vessel, dappled sunlight, quiet corner. editorial beauty campaign photography, soft diffused natural window light, warm cream and champagne palette with dusty rose and sage accents, brushed copper details, matte ivory walls, 35mm film grain, shallow depth of field, calm luxurious mood, no text, no logos, no harsh contrast, no neon
```

---

## Booking

### 30. `booking-ambient`

**Where it appears** — Booking — decorative banner at the top of the live summary card.

**Aspect ratio** `4:5`  ·  **Minimum size** 1280 × 1600px  ·  **Save as** `public/images/art/booking-ambient.jpg`

**Alt text already written for it** — _decorative, no alt text_

**Prompt**

```text
Soft abstract salon ambience, out-of-focus cream interior with a warm copper highlight and sage shadow, dreamy bokeh, almost abstract. editorial beauty campaign photography, soft diffused natural window light, warm cream and champagne palette with dusty rose and sage accents, brushed copper details, matte ivory walls, 35mm film grain, shallow depth of field, calm luxurious mood, no text, no logos, no harsh contrast, no neon
```

---

## Checklist

26 of 30 slots delivered. Still needed:

- [x] `hero-primary` — 2:3
- [x] `hero-secondary` — 3:4
- [x] `hero-detail` — 1:1
- [x] `service-color` — 4:5
- [x] `service-balayage` — 3:4
- [x] `service-extensions` — 4:5
- [x] `service-haircut` — 4:5
- [x] `service-blowout` — 4:5
- [x] `service-nails` — 4:5
- [x] `service-beauty` — 4:5
- [x] `studio-portrait` — 4:5
- [x] `studio-interior` — 3:2
- [x] `studio-detail` — 1:1
- [x] `transform-1-before` — 3:4
- [x] `transform-1-after` — 3:4
- [x] `transform-2-before` — 3:4
- [x] `transform-2-after` — 3:4
- [x] `transform-3-before` — 3:4
- [x] `transform-3-after` — 3:4
- [x] `gallery-01` — 4:5
- [ ] `gallery-02` — 1:1
- [x] `gallery-03` — 4:5
- [x] `gallery-04` — 3:4
- [x] `gallery-05` — 4:3
- [x] `gallery-06` — 4:5
- [ ] `gallery-07` — 1:1
- [x] `gallery-08` — 3:4
- [x] `gallery-09` — 4:5
- [ ] `gallery-10` — 3:2
- [ ] `booking-ambient` — 4:5
