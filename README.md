# Massiel Beauty Salon

An editorial, motion-led website for Massiel Beauty Salon — a luxury hair and
beauty studio in Allentown, Pennsylvania.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

---

## ⚠️ Before this goes live

The site deliberately refuses to publish anything it cannot verify. These are
the open items, each with the exact place to fix it.

| Item | Current behaviour | Where |
|---|---|---|
| **Phone & email** | Hidden entirely. A placeholder number is never rendered. | `NEXT_PUBLIC_PHONE`, `NEXT_PUBLIC_EMAIL` |
| **Opening hours** | Placeholder schedule shown with a visible "confirm before launch" note. | `NEXT_PUBLIC_HOURS_JSON`, `NEXT_PUBLIC_HOURS_VERIFIED` |
| **Prices** | Shown as "Pricing shared at consultation" instead of a number. | `src/lib/services.ts` + `NEXT_PUBLIC_PRICES_VERIFIED` |
| **Google reviews** | Section renders an honest empty state — there are no hard-coded testimonials anywhere in this codebase. | `GOOGLE_PLACES_API_KEY`, `GOOGLE_PLACE_ID` |
| **Before/after photos** | Abstract placeholder art. Never an invented photograph of a person or of client work. | `public/images/art` + `src/lib/content.ts` |
| **Team names** | Generic roles ("Senior Stylist"). | `src/lib/content.ts` → `specialists` |
| **Booking delivery** | Form validates and reports honestly that it is not connected. | `RESEND_API_KEY` / `BOOKING_WEBHOOK_URL` |
| **Address** | Published. Sourced from the Pennsylvania business registry listing for Massiel Beauty Salon LLC — worth confirming the unit number. | `src/lib/site.ts` |

Legal pages (`/privacy`, `/terms`) are honest starting templates and say so on
the page. Have them reviewed.

---

## Environment variables

Copy `.env.example` to `.env.local`. Everything is optional — the site runs
without any of it, it just shows less.

```bash
NEXT_PUBLIC_SITE_URL=https://massielbeautysalon.com

# Contact — omit and the site hides the field rather than showing a fake one
NEXT_PUBLIC_PHONE="(610) 555-0100"
NEXT_PUBLIC_EMAIL=hello@massielbeautysalon.com

# Google reviews (Places API New). Server-side only — never NEXT_PUBLIC.
GOOGLE_PLACES_API_KEY=...
GOOGLE_PLACE_ID=ChIJ...
NEXT_PUBLIC_GOOGLE_PROFILE_URL=https://g.page/...
NEXT_PUBLIC_GOOGLE_REVIEW_URL=https://g.page/r/.../review

# Booking delivery — first configured option wins
RESEND_API_KEY=re_...
BOOKING_TO_EMAIL=bookings@massielbeautysalon.com
BOOKING_FROM_EMAIL=bookings@massielbeautysalon.com
# ...or
BOOKING_WEBHOOK_URL=https://hooks.example.com/...

# Flip once the real values are in the code
NEXT_PUBLIC_PRICES_VERIFIED=true
NEXT_PUBLIC_HOURS_VERIFIED=true
NEXT_PUBLIC_HOURS_JSON='[{"day":"Monday","short":"Mon","open":null,"close":null}, ...]'

# Existing online booking system, used as the fallback CTA
NEXT_PUBLIC_BOOKING_URL=https://...
```

---

## Deploying to Netlify

Two ways, depending on how much you want working.

### Option A — Git or CLI (recommended, keeps everything)

`netlify.toml` is already configured. Connect the repo in Netlify, or:

```bash
npm i -g netlify-cli
netlify deploy --build --prod
```

You keep the `/api/booking` endpoint and Google reviews refetched hourly on
the server. Set the environment variables in **Site settings → Environment
variables** — the same names as `.env.example`.

### Option B — drag and drop (no build on Netlify)

```bash
npm run build:static     # writes out/
```

Drag the `out/` folder onto <https://app.netlify.com/drop>, or upload a zip of
**its contents** (`index.html` must be at the top level of the zip, not inside
a folder).

Two things behave differently on this target, by design:

- **No booking endpoint.** The form still validates and still shows its
  summary, but it tells the visitor plainly that nothing was sent and points
  them at the salon's own booking link. It never shows a fake confirmation.
  Set `NEXT_PUBLIC_BOOKING_URL` before building so that link is there.
- **Reviews are fetched once, at build time**, instead of hourly. Rebuild to
  refresh them.

Environment variables must be set **before** running `build:static` — a static
export bakes them in.

---

## Imagery

Every image slot on the site is declared once in **`src/lib/images.ts`**,
together with the exact prompt that should produce it. That is what keeps
thirty images looking like one campaign rather than thirty stock photos.

The site currently ships with generated on-palette placeholder art — abstract
by design, so nothing invented is ever presented as a photograph.

### Generating the real imagery

**[`docs/IMAGE-PROMPTS.md`](docs/IMAGE-PROMPTS.md) is the brief** — all thirty
slots with complete, copy-paste-ready prompts, aspect ratios, minimum sizes
and where each one appears on the page. Regenerate it any time with
`npm run images:prompts`.

The shared `HOUSE_STYLE` suffix in `images.ts` carries the art direction (soft
natural window light, cream and champagne, sage and copper accents, 35mm
grain, shallow depth of field) and is already appended to every prompt.

```
1. Generate or shoot each slot using its prompt
2. Save as public/images/art/<slot-id>.jpg   (or .webp / .avif)
3. npm run images:adopt                      # rewrites the manifest
```

Partial delivery is fine — swap in five images or all thirty; anything without
a real file stays on its placeholder.

`scripts/generate-placeholders.mjs` regenerates the placeholder art if slots
are added. Both scripts are safe to re-run.

---

## Architecture

```
src/
  app/
    layout.tsx           fonts, metadata, JSON-LD (HairSalon schema)
    page.tsx             composes the sections, fetches reviews once
    api/booking/route.ts validates + delivers booking requests
    privacy/ terms/      legal templates
  components/
    motion/              SmoothScroll (Lenis↔ScrollTrigger), Reveal,
                         SplitLines, Parallax, Cursor
    decor/               HairStrands, Blobs, Particles, Divider
    ui/                  Art, Button, Lightbox, BeforeAfter, OpenStatus…
    sections/            Preloader, Hero, Services, Transformations,
                         Studio, Gallery, Reviews, Booking, Visit
    layout/              Nav, Footer, MobileBookBar, LegalPage
  lib/
    site.ts              every business fact, in one place
    images.ts            art-direction manifest
    services.ts content.ts reviews.ts gsap.ts
```

### Motion

Lenis drives scrolling and feeds `ScrollTrigger.update` through GSAP's own
ticker, so pinned and scrubbed elements never drift a frame behind the page.
`Reveal` exposes eight entrance variants and each section uses a different one
— the brief asked that no two sections arrive the same way.

Everything is gated on `prefers-reduced-motion`: the entrance is skipped, the
reveals resolve instantly, and the page stays fully usable and good-looking
without a single moving pixel.

### Accessibility notes

- Single `h1`, no heading-level jumps, skip link is the first tab stop.
- The before/after comparison is a real `input[type=range]`, so it works on a
  keyboard and announces its position.
- The custom cursor only replaces the pointer on fine-pointer devices.
- "Today" in the hours table resolves in the browser, not at build time.
- Focus rings are never removed; touch targets are ≥44px on mobile.
