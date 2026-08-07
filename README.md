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

Ten photographs are in place: the homepage, services, how-it-works, about,
trust & safety, locations, membership and contact heroes, plus the homepage
entryway editorial and the full-width modes band. Fourteen slots are still
placeholders — the membership preview on the homepage, the five service detail
heroes, the seven before/after pairs and the dashboard report stand-in — and
their prompts are ready to hand to a photographer or image model.

`sizes` on `<EditorialImage>` must describe how wide the image actually renders.
It defaults to a half-column hero; the full-bleed band passes `sizes="100vw"` so
the browser does not download a source that is too small for it.

Source images were resized to 1600px wide and encoded as quality-82 mozjpeg
(~120–210 KB each). `next/image` serves AVIF/WebP from there, so keep new assets
at similar dimensions rather than dropping in multi-megabyte originals.

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
