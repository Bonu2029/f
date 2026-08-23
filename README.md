# ServiceTag

Never lose an installed customer again.

A service business places a small NFC tag on the equipment it installs. When
the homeowner needs service later, they tap the tag with their phone and land
on a page branded for that business — where they can request service, book an
appointment, call, text, and check their warranty. No app, no account.

## Stack

- **Next.js** (App Router) + **TypeScript**
- **Tailwind CSS** for styling
- **Supabase** for Postgres, auth and storage
- **Stripe** for subscriptions

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in as you connect services
npm run dev
```

The app runs without any keys. With Supabase unconfigured it starts in **demo
mode**: the dashboard and a sample tag page (`/t/AB72KD`) render clearly
labelled sample content so the product can be reviewed before anything is
wired up.

### Connecting Supabase

1. Create a project at supabase.com.
2. Run the migrations in `supabase/migrations/` in order (SQL editor, or
   `supabase db push`).
3. Put the project URL, anon key and service role key in `.env.local`.

Auth, real data and storage switch on automatically.

### Connecting Stripe

1. Create three recurring monthly prices matching `src/config/pricing.ts`
   ($39 / $49 / $79).
2. Put the price IDs and your secret key in `.env.local`.
3. Point a webhook at `/api/webhooks/stripe` for `checkout.session.completed`
   and `customer.subscription.*`, and set `STRIPE_WEBHOOK_SECRET`.

## Changing the brand

Everything user-facing reads from one file: `src/config/brand.ts`. Change
`name` there and the marketing site, dashboard, emails and customer tag pages
all follow. Pricing lives in `src/config/pricing.ts` — no price or plan detail
is hard-coded anywhere else.

## How a tag works

An NFC chip stores **only a URL**: `https://<domain>/t/AB72KD`. No customer
data ever lives on the chip. The database maps that code to the business,
customer, installation, product, warranty and service options, so a business
can update any of it later without replacing or rewriting the physical tag.

Every tag also has a matching QR code at `/t/<code>/qr` encoding the exact same
URL — a backup for phones that can't read NFC. NFC is the primary experience.

## Data separation

Each business can only reach its own rows. That's enforced in Postgres with row
level security, not just in the UI (`supabase/migrations/0001_initial_schema.sql`).

Public tag pages never query those tables. Anonymous visitors get exactly three
SECURITY DEFINER functions:

| Function | Purpose |
| --- | --- |
| `public_tag_view(code)` | Public fields only — business branding, contact, installed item, warranty |
| `record_tag_event(code, …)` | Logs a tap or scan |
| `submit_service_request(code, …)` | Files a request against the right business |

A customer's name, phone, email, address and the business's internal notes are
never returned to a public page.

## Project layout

```
src/
  app/
    (marketing)/      Homepage and public marketing pages
    (auth)/           Sign up, log in, password reset
    dashboard/        Business app — overview, tags, customers, requests, settings, billing
    t/[code]/         Customer tag page, request flow, QR image
    api/              Stripe checkout, portal and webhook
  components/         Reusable UI, marketing, dashboard and tag components
  config/             Brand, pricing, business types — change these, not the pages
  lib/                Supabase clients, data access, validation, formatting, QR
supabase/migrations/  Schema, RLS policies, storage buckets
scripts/qr-check.ts   Decodes generated QR codes to verify them
```

## Scripts

```bash
npm run dev         # local development
npm run build       # production build
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm run preview     # build a shareable static snapshot of every screen
npx tsx scripts/qr-check.ts   # verify the QR generator
```

`npm run preview` needs the app running (`npm run start`). It captures every
page, inlines the CSS and fonts, and writes `servicetag-preview.html` — one
self-contained file that opens with no server, useful for sharing the design
before anything is deployed. Forms and menus are inert in the snapshot.

## Images

Image slots throughout the site are intentionally empty, styled placeholders.
Real photography drops into `ImagePlaceholder` locations later.
