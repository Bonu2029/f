# Ashgrove Barber Co.

A premium editorial barbershop website — cinematic hero, a six-step booking
experience, before/after gallery and a full reviews system.

Built with Next.js 15 (App Router), TypeScript, Tailwind CSS 4, GSAP +
ScrollTrigger, Framer Motion and Lenis smooth scrolling.

> Ashgrove Barber Co. is a fictional business created for this build. The phone
> number is from the range Ofcom reserves for fiction, and the address is
> invented. All figures on the site are derived from the seed data in
> `src/lib/data.ts` — there are no invented awards or marketing statistics.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # static export -> out/
npm run typecheck  # tsc --noEmit
```

## Deploying

Every route is prerendered, so `npm run build` emits a plain static site into
`out/` — no Node server required.

**Cloudflare Pages** — connect the repo, then set:

| Setting | Value |
|---|---|
| Build command | `npm run build` |
| Build output directory | `out` |
| Node version | 22 (`NODE_VERSION` environment variable) |

**Netlify** — `netlify.toml` already carries the same settings, so connecting
the repo is enough.

**GitHub Pages / any bucket** — upload the contents of `out/`. The export
includes a `.nojekyll` file so the `_next` directory survives, and `404.html`
is wired to the designed not-found page.

`public/_headers` sets long-lived immutable caching for hashed build assets and
the image set, and basic security headers; Cloudflare Pages and Netlify both
read it from the published directory.

Before going live, replace the `siteUrl` constants in `src/app/layout.tsx`,
`src/lib/schema.ts`, `src/app/sitemap.ts` and `src/app/robots.ts` with the real
domain — they drive canonicals, Open Graph tags, the sitemap and the structured
data.

Deploying to a Node host instead (Vercel, a container)? Remove `output:
"export"` and `images.unoptimized` from `next.config.ts` and Next's image
optimiser takes over; nothing else changes.

## Structure

```
src/
  app/                 routes, metadata, sitemap, robots, icons
    page.tsx           homepage composition
    reviews/           full reviews page (filter, sort, load more, submit)
    privacy/ terms/    legal pages built on a shared LegalPage shell
  components/
    layout/            nav, footer, preloader, cursor, page transition, sticky CTA
    home/              hero, services, barbers, gallery, about, promo, reviews, contact
    booking/           six-step booking widget and calendar
    reviews/           reviews browser and submission form
    ui/                buttons, icons, logo, stars, review card, motion primitives
  lib/
    data.ts            single source of truth for all site copy and seed data
    booking.ts         availability rules, slot generation, formatters
    booking-bus.ts     event bridge for "book this" affordances
    schema.ts          schema.org HairSalon + breadcrumb structured data
    media.ts           generated image manifest (paths, sizes, blur placeholders)
```

## Design system

| Token group | Values |
|---|---|
| Deep navy | `navy-950` → `navy-600` — hero, booking, gallery, footer |
| Muted steel blue | `steel-700` → `steel-200` — secondary text on dark surfaces |
| Warm ivory | `ivory-50` → `ivory-200` — primary page background |
| Soft sand | `sand-200` → `sand-500` — layered slabs and hover washes |
| Brushed copper | `copper-300` → `copper-700` — accents, rules, primary CTA |
| Burgundy | `burgundy-500` → `burgundy-700` — promo strip, featured service, errors |

Typography pairs **Playfair Display** (editorial serif headings) with
**Inter** (navigation, body, prices, booking UI). Both are served through
`next/font`.

## Booking

Availability is generated deterministically from the date, barber and service
(`src/lib/booking.ts`), so the server and client always agree — no hydration
flicker and no reshuffled slots on refresh. Rules encoded:

- Shop hours per weekday, closed Sundays.
- Each barber's working days; Jonah does not take Kids Cut appointments.
- Slots that would overrun closing time for the chosen service are unavailable.
- Same-day slots need at least an hour's notice.
- A booking horizon of 60 days.

Changing an earlier answer invalidates the later ones — picking a barber who
does not work your chosen day clears the date, and so on.

The flow is front-end only: confirming produces a reference and a summary
screen. Wiring it to a real backend means replacing `getSlots` with a fetch and
posting the details from `BookingSection`'s `confirm`.

## Motion

Lenis drives scrolling with GSAP's ScrollTrigger slaved to the same ticker, so
pinned and scrubbed sections stay in sync with the eased scroll position.

`prefers-reduced-motion` is respected throughout. Because the server always
renders as "no preference", anything that affects server-rendered markup uses
`useSafeReducedMotion` (`src/components/ui/motion.tsx`) — it matches the server
through hydration, then flips to the real preference. Decorative layers stay in
the tree and are hidden with the `motion-reduce:` variant rather than
conditionally rendered, for the same reason. Effect-only code uses the plain
hook.

## Images

All photography was generated for this project and is committed as optimised
WebP under `public/images` (1.2 MB total). `src/lib/media.ts` is generated
alongside it and carries intrinsic dimensions plus an inline blur placeholder
for every asset, so nothing shifts as images load — which is also why the
static export needs no image optimiser.

The two before/after pairs were produced as single diptych frames and split
down the middle, which is why each pair is unmistakably the same person.

## Accessibility

- Semantic landmarks, one `h1` per page, skip link.
- Visible copper focus ring on every interactive element.
- Keyboard support in the calendar, gallery lightbox (arrows and Escape), the
  before/after slider (a real range input) and the star rating.
- Forms use real labels, `aria-invalid`, and errors announced with `role="alert"`
  beside the field they belong to.
- The custom cursor only mounts on fine-pointer devices with motion enabled, and
  the native cursor is only hidden once it is actually running.

## SEO

Per-page metadata and canonicals, Open Graph and Twitter cards, a generated
sitemap and robots file, and schema.org `HairSalon` structured data built from
the same `data.ts` that renders the page — opening hours, the service catalogue,
staff and aggregate rating included.

Update the `siteUrl` constants in `src/app/layout.tsx`, `src/lib/schema.ts`,
`src/app/sitemap.ts` and `src/app/robots.ts` when deploying to a real domain.
