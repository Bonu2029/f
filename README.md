# LumaNest Cleaning

A multi-page marketing and booking site for a premium home-cleaning service.
Next.js App Router, TypeScript, Tailwind CSS and Framer Motion.

Tagline: *Your home, beautifully reset.*

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run typecheck  # tsc --noEmit
```

## Routes

Every section is a real route with its own metadata, canonical URL and layout.

| Route | Purpose |
| --- | --- |
| `/` | Hero with interactive needs selector, room explorer, plan preview, modes, trust, before/after, membership, reviews |
| `/services` | Service discovery, starting with an occasion questionnaire |
| `/services/standard-cleaning` | Service detail |
| `/services/deep-cleaning` | Service detail |
| `/services/move-in-move-out` | Service detail |
| `/services/recurring-cleaning` | Service detail |
| `/services/airbnb-cleaning` | Service detail |
| `/build-your-clean` | Eight-step plan builder with a live estimate |
| `/instant-estimate` | Itemized estimate calculator |
| `/clean-match` | Twelve-question service-matching quiz |
| `/how-it-works` | Scroll-linked journey timeline |
| `/before-after` | Filterable gallery of draggable comparisons |
| `/home-profile` | Home profile editor, zones, pet profile, Home Reset Score |
| `/trust-safety` | Screening, access, privacy, damage and satisfaction procedures |
| `/membership` | LumaCare tiers, terms and seasonal planner |
| `/locations` | ZIP checker, zone explanation, area waitlist |
| `/about` | Story, philosophy, values |
| `/faq` | Categorized FAQ with FAQ structured data |
| `/contact` | Contact form, photo quote request, emergency request |
| `/booking` | Nine-step booking flow ending in a confirmation |
| `/customer-dashboard` | Dashboard mockup with the completed cleaning report |
| `/privacy`, `/terms` | Draft legal pages, flagged for counsel review |

`app/sitemap.ts` and `app/robots.ts` generate `/sitemap.xml` and `/robots.txt`.

## Structure

```
app/                 routes, layout, template (page transitions), error/loading/404
components/
  layout/            header, mega menu, mobile nav, footer, logo, newsletter
  ui/                buttons, forms, accordion, states, toasts, comparison slider,
                     testimonial carousel, icons, editorial image
  home/              hero, room explorer, plan preview, animated steps
  services/          service finder, add-on grid, shared service-detail page
  tools/             plan builder, estimate calculator, CleanMatch, booking, calendar
  profile/           home profile editor
  dashboard/         customer dashboard
  motion/            reveal-on-scroll helpers
lib/
  content/           services, rooms, gallery, locations, membership, copy, image slots
  pricing.ts         rate card and estimate engine (single source of truth)
  plan.ts            plan model and service recommendation
  storage.ts         local persistence — the seam where the backend plugs in
  seo.ts             metadata helper and structured data
  integrations/      adapter plan for database, auth, payments, email, SMS, storage
```

## Placeholders that need real business information

The site is deliberately explicit about what has not been supplied. Search for
these before launch:

- **Pricing** — `lib/pricing.ts` (`rateCard`) is a placeholder rate card. Membership
  prices in `lib/content/membership.ts` are intentionally blank.
- **Service areas** — `lib/content/locations.ts` contains invented cities used to
  build and test the ZIP checker. Do not claim coverage that is not confirmed.
- **Contact details** — phone, email, hours and address in `lib/site.ts`.
- **Reviews** — `testimonials` in `lib/content/general.ts` are labelled samples.
- **Gallery** — everything in `lib/content/gallery.ts` is labelled as a demonstration.
- **Company facts** — no founding year, team size, awards or years of experience
  are asserted anywhere. Add them only when they are true.
- **Legal** — `/privacy` and `/terms` are drafts and need review by counsel.

## Images

Every visual slot is registered in `lib/content/images.ts` with its alt text,
tone and the art-direction prompt used to commission it. A slot with a `src`
renders the photograph; a slot without one renders a labelled placeholder. To
ship a photo, drop it in `public/images/` and set `src` on that slot — nothing
else changes.

Twenty-three of the twenty-four slots are complete: all eight page heroes, all
five service detail heroes, the homepage entryway editorial, the full-width
modes band, the homepage membership preview, and all seven before/after pairs.

One slot is outstanding: `dashboard-report`, the deliberately non-identifying
stand-in for a customer-approved completion photo in the cleaning report.

Before/after slots hold two files: `src` is the cleaned result and `beforeSrc`
the starting state. Both frames must be shot from a locked-off tripod with
identical framing and lighting; if the camera moves between them the comparison
slider visibly jumps as it is dragged.

**A pair renders only when both frames exist.** A slot holding just one of the
two keeps showing placeholders on both sides, because pairing a real photograph
with a placeholder would present one state as if it were the other. Delivering
the missing frame and adding its path is all that is needed to switch a slot on.

`scripts/check-pairs.mjs` compares the two frames of every complete pair and
reports how far apart they are, which catches a moved camera before it reaches
the page.

`sizes` on `<EditorialImage>` must describe how wide the image actually renders.
It defaults to a half-column hero; the full-bleed band passes `sizes="100vw"` so
the browser does not download a source that is too small for it.

Use `scripts/optimize-image.mjs` to prepare a source file — it resizes, strips
metadata and encodes to mozjpeg, then prints the resulting ratio so you can
check the slot's aspect still suits the photograph:

```bash
node scripts/optimize-image.mjs ~/photos/kitchen.jpg svc-airbnb-hero
node scripts/optimize-image.mjs ~/photos/band.jpg home-modes --width 1920
node scripts/optimize-image.mjs ~/photos/street.jpg locations-hero --quality 76

# before/after frames use the -before suffix on the same slot name
node scripts/optimize-image.mjs ~/photos/bedroom-messy.jpg ba-bedroom-before
node scripts/optimize-image.mjs ~/photos/bedroom-clean.jpg ba-bedroom

node scripts/check-pairs.mjs --seams   # then look at scratch/seam-*.jpg
```

`next/image` serves AVIF/WebP derivatives from the result, so the file on disk
only needs to be a good master — never drop in a multi-megabyte original.

## Accessibility and motion

Keyboard-navigable throughout, with a skip link, visible focus rings, labelled
form controls, descriptive validation messages, one `h1` per page and correct
heading order. Status changes are announced through live regions. Every
animation checks `prefers-reduced-motion`, and a global CSS fallback disables
the rest.

## Integrations

None are connected. Plans and profiles persist to `localStorage`; the booking
and contact flows simulate their round trips and say so in the UI. See
`lib/integrations/README.md` for the adapter plan and data model, and
`.env.example` for the variables involved. No secret is ever exposed to the
browser.
