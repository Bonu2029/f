# AI Front Desk

A multi-tenant SaaS that gives local service businesses their own AI receptionist.
A business signs up, teaches the AI about their work in a conversation, picks a
voice, connects a phone number and calendar, and goes live. From then on the
receptionist answers their calls 24/7 — answering questions, capturing leads,
checking the service area, booking appointments, sending texts, requesting
photos and transferring callers to a human when needed.

> **Working brand.** The product name, colours, logo and contact addresses all
> come from [`packages/shared/src/brand.ts`](packages/shared/src/brand.ts) and
> the token block in [`apps/web/src/app/globals.css`](apps/web/src/app/globals.css).
> Rebranding is a two-file edit.

---

## Contents

- [Architecture](#architecture)
- [The billing rule](#the-billing-rule)
- [Local development](#local-development)
- [Supabase setup](#supabase-setup)
- [Running migrations](#running-migrations)
- [Stripe setup](#stripe-setup)
- [Twilio setup](#twilio-setup)
- [OpenAI setup](#openai-setup)
- [SIP call routing](#sip-call-routing)
- [Google Calendar setup](#google-calendar-setup)
- [Running the app](#running-the-app)
- [Testing](#testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## Architecture

```
┌──────────────┐   PSTN    ┌────────────┐   SIP/TLS   ┌──────────────────┐
│   Customer   │──────────▶│   Twilio   │────────────▶│  OpenAI Realtime │
└──────────────┘           │ SIP Trunk  │             └────────┬─────────┘
                           └────────────┘                      │
                                                realtime.call.incoming
                                                               ▼
┌────────────────────────────┐   accept   ┌──────────────────────────────┐
│  apps/web (Next.js)        │───────────▶│  apps/voice-worker (Node)    │
│  • marketing + dashboard   │            │  • long-lived Realtime WS    │
│  • auth, billing, admin    │◀───────────│  • tool calls                │
│  • webhooks                │  internal  │  • transcripts, transfer     │
│  • ALL tenant logic        │    API     │  • call finalisation         │
└─────────────┬──────────────┘            └──────────────────────────────┘
              │
              ▼
   ┌─────────────────────┐   ┌────────┐   ┌────────┐   ┌────────────────┐
   │ Supabase (Postgres, │   │ Stripe │   │ Twilio │   │ Google Calendar│
   │ Auth, Storage, RLS) │   │        │   │  SMS   │   │                │
   └─────────────────────┘   └────────┘   └────────┘   └────────────────┘
```

| Path | What it is |
| --- | --- |
| `apps/web` | Next.js 16 App Router. Marketing site, auth, onboarding, dashboard, admin, all API routes and webhooks. **Every piece of tenant logic lives here.** |
| `apps/voice-worker` | Node service holding the Realtime WebSocket for each live call. Stateless and Docker-ready. Holds no database credentials. |
| `packages/shared` | Brand config, plan catalogue, billing arithmetic, prompt builder, tool definitions, validation schemas, pure domain logic. |
| `supabase/migrations` | Schema, RLS policies, transactional functions, storage buckets. |
| `scripts` | Migration runner, seed data, Stripe/Twilio setup, maintenance. |
| `tests` | Unit (pure logic) and integration (real Postgres) suites, plus Playwright E2E. |

### Why two services

A phone call needs a WebSocket held open for minutes. Serverless request
handlers cannot do that reliably, so the realtime session lives in a separate
persistent process. The worker is deliberately thin: it does not hold database
credentials, and every tenant-scoped action goes through the web app's internal
API, which re-derives the organisation from the call record rather than trusting
what the worker sends.

### How a call is bound to a tenant

The **only** trusted path from a phone call to a business is the dialled number
in the SIP headers, resolved by `resolve_inbound_call()` in Postgres. Nothing a
caller says, and nothing the model produces, can change which organisation a
call belongs to. No realtime tool accepts an organisation id — see the assertion
in `tests/unit/prompt-and-tools.test.ts`.

---

## The billing rule

Stated once, implemented once, tested once:

```
billable_minutes(call) = ceil(billed_seconds / 60)
```

- `billed_seconds` runs from when the AI **answers** to when the call **ends**,
  taken from provider/session timestamps recorded by the voice worker. Ringing
  is not billed, and the browser is never asked how long a call lasted.
- Rounding is **per call**, and a period's total is the sum of those rounded
  minutes. Three 30-second calls bill 3 minutes, not 2.
- Usage above the plan allowance is billed at the plan's per-minute overage rate
  and reported to a Stripe billing meter.
- Recording is idempotent: `usage_ledger` has a unique index on `call_id`, so a
  retried webhook or duplicate worker event cannot double-bill.

Implementation: [`packages/shared/src/billing.ts`](packages/shared/src/billing.ts)
and `record_call_usage()` in
[`supabase/migrations/0003_functions.sql`](supabase/migrations/0003_functions.sql).

---

## Local development

### Requirements

- Node 20.11+ (22 recommended)
- Docker, if you want the Supabase CLI stack or the voice-worker container
- A PostgreSQL instance for the integration tests

### Get running in five minutes

```bash
git clone <this repo> && cd ai-front-desk
npm install

cp .env.example .env.local
# Generate the two secrets the app needs even in demo mode:
node -e "console.log('APP_ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('base64'))"
node -e "console.log('UPLOAD_TOKEN_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('VOICE_WORKER_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

npm run dev          # http://localhost:3000
```

With `DEMO_MODE=true` (the default in `.env.example`) the app runs against mock
adapters for Stripe, Twilio, OpenAI and Google. Everything the mocks produce is
**visibly labelled as demo data** — no fake charge is presented as a real one,
and no simulated SMS is reported as sent. You still need Supabase for the
database and auth.

---

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. **Project Settings → API** — copy into `.env.local`:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (**server only**, never
     prefix it `NEXT_PUBLIC_`)
3. **Project Settings → Database** — copy the connection string into
   `SUPABASE_DB_URL`.
4. **Authentication → URL Configuration**
   - Site URL: `http://localhost:3000` (your domain in production)
   - Redirect URLs: add `http://localhost:3000/auth/callback`
5. **Authentication → Providers → Email** — enable it. Leave "Confirm email" on
   for production; turning it off locally skips the inbox round trip.

### Local Supabase instead

```bash
npx supabase start
npx supabase status          # copy the printed keys into .env.local
```

---

## Running migrations

```bash
npm run db:migrate           # applies supabase/migrations in order
npm run db:seed              # optional demo organisation
```

The runner records applied files in `schema_migrations` with a checksum, so
re-running is safe and an edited-after-the-fact migration is flagged rather than
silently re-applied. Each file runs in a transaction; a failure rolls back.

Migrations create:

| File | Contents |
| --- | --- |
| `0001_schema.sql` | Tables, enums, constraints, indexes, `updated_at` triggers |
| `0002_rls.sql` | Table grants, RLS enabled **and forced** on every tenant table, policies |
| `0003_functions.sql` | Founder-slot reservation, usage recording, webhook idempotency, call routing, knowledge search, metrics |
| `0004_storage.sql` | Private storage buckets and their access policies |

---

## Stripe setup

```bash
STRIPE_SECRET_KEY=sk_test_... npm run stripe:setup
```

This creates (idempotently) the product, the Founding and Standard recurring
prices, the overage billing meter and the metered overage price, then prints the
ids to paste into your environment.

Two things the script cannot do for you:

1. **Webhook endpoint** — Developers → Webhooks → Add endpoint
   - URL: `https://YOUR_DOMAIN/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `checkout.session.expired`,
     `customer.subscription.created`, `customer.subscription.updated`,
     `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`
   - Copy the signing secret to `STRIPE_WEBHOOK_SECRET`.
2. **Customer Portal** — Settings → Billing → Customer portal → activate, and
   allow updating payment methods, viewing invoices and cancelling.

Locally, forward events with the Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

**The webhook is authoritative.** A subscription is never activated from a
browser redirect — only from a signed, verified webhook.

---

## Twilio setup

1. Create an account and buy nothing yet; the app provisions numbers itself.
2. Copy the Account SID and Auth Token into `.env.local`.
3. Create the SIP trunk that routes calls to OpenAI:

```bash
npm run twilio:setup         # prints TWILIO_SIP_TRUNK_SID
```

Numbers bought through the app are attached to that trunk automatically, and the
purchase is **rolled back** (the number released) if attachment fails, so a
customer is never left paying for a number that cannot reach the AI.

---

## OpenAI setup

1. Create a project at [platform.openai.com](https://platform.openai.com).
2. Copy the API key to `OPENAI_API_KEY` and the **project id** to
   `OPENAI_PROJECT_ID` — the project id forms the SIP destination.
3. Settings → Webhooks → add an endpoint:
   - URL: `https://YOUR_DOMAIN/api/webhooks/openai`
   - Event: `realtime.call.incoming`
   - Copy the signing secret to `OPENAI_WEBHOOK_SECRET`.

Models are configuration, not code:

| Variable | Default | Used for |
| --- | --- | --- |
| `OPENAI_REALTIME_MODEL` | `gpt-realtime-2.1` | Live phone conversation |
| `OPENAI_TEXT_MODEL` | `gpt-5.1` | Training extraction, summaries, website import |
| `OPENAI_TTS_MODEL` | `gpt-4o-mini-tts` | Voice previews in the dashboard |

---

## SIP call routing

```
Caller → Twilio number → Elastic SIP Trunk
       → sip:$OPENAI_PROJECT_ID@sip.api.openai.com;transport=tls
       → OpenAI fires realtime.call.incoming
       → /api/webhooks/openai verifies the signature
       → resolve_inbound_call(dialled number) → organisation
       → voice worker accepts the call and opens the session
```

If the business cannot be served — paused receptionist, inactive agent,
cancelled subscription — or if the worker cannot be reached, the webhook responds
with a SIP refer to the business's configured fallback number rather than
dropping the call, records a failed call, and notifies the business.

---

## Google Calendar setup

1. [Google Cloud Console](https://console.cloud.google.com) → new project.
2. Enable the **Google Calendar API**.
3. Configure the OAuth consent screen. Scopes requested:
   - `.../auth/calendar.readonly` — list calendars, read busy times
   - `.../auth/calendar.events` — manage the events this product creates
4. Create an **OAuth client ID** (Web application) with redirect URI
   `http://localhost:3000/api/integrations/google/callback` (and your production
   URL).
5. Copy the client id and secret into `.env.local`.

Refresh tokens are encrypted with AES-256-GCM before storage and are never
readable by any client role — the base table denies `SELECT` even to the
organisation's owner, who instead reads a redacted status through
`get_calendar_status()`.

---

## Running the app

```bash
npm run dev              # web app on :3000
npm run dev:worker       # voice worker on :8787
```

Both together, plus Stripe forwarding, is the usual local setup:

```bash
npm run dev & npm run dev:worker & stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Health checks:

```bash
curl localhost:3000/api/health
curl localhost:8787/health
```

---

## Testing

```bash
npm run test                                   # unit only (integration skips)
TEST_DATABASE_URL=postgresql://localhost/afd_test npm run test   # everything
npm run test:e2e                               # Playwright
npm run verify                                 # typecheck + lint + tests
```

**Integration tests run the real migrations against a real PostgreSQL
database** — a shim supplies the `auth` and `storage` schemas Supabase would
provide. They exercise the actual RLS policies and PL/pgSQL functions, not a
re-implementation:

- **Tenant isolation** — a user from Business A cannot read or write Business B's
  organisations, leads, calls or transcripts, executed as the `authenticated`
  role with a JWT claim exactly as PostgREST would.
- **Founding 50** — slots 1–50 are issued in order, the 51st is refused,
  ten simultaneous reservations for the last slot produce exactly one winner,
  abandoned reservations return to inventory, and an activated slot is never
  reopened after cancellation.
- **Usage** — per-call rounding, idempotent recording, demo calls excluded from
  the plan allowance, period resets.
- **Webhooks** — an event is claimed once; concurrent deliveries produce one
  winner.
- **Double booking** — the same slot cannot be booked twice within an
  organisation, but can be by a different one.

When `TEST_DATABASE_URL` is unset the integration suites **skip with a printed
explanation** rather than silently passing.

---

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for the full runbook, and
[SETUP.md](SETUP.md) for the checklist of dashboard configuration that cannot be
scripted.

Short version: the web app goes on any Next.js host (Vercel, Netlify, a
container); the voice worker goes on a persistent Node/Docker host (Railway,
Render, Fly.io, ECS); Supabase, Stripe, Twilio and OpenAI are managed services.
Nothing is coupled to a specific provider.

---

## Troubleshooting

| Symptom | Likely cause and fix |
| --- | --- |
| `MissingEnvError` naming a variable | That feature's credential is absent. Add it, or set `DEMO_MODE=true` for local work. |
| Calls ring and are never answered | The voice worker is unreachable. Check `VOICE_WORKER_URL`, `/health`, and that `VOICE_WORKER_SECRET` matches on both sides. |
| Inbound call rejected as `unknown_number` | The dialled number has no `active` row in `phone_numbers`, or it is attached to the wrong trunk. |
| Inbound call rejected as `agent_inactive` | The receptionist was never activated. Finish `/onboarding/live`. |
| Stripe webhook returns 400 | Signature mismatch — wrong `STRIPE_WEBHOOK_SECRET`, or a proxy is rewriting the body. The route needs the raw body. |
| Subscription stays `incomplete` after paying | The webhook is not reaching you. Check the endpoint URL and Stripe's delivery log; the redirect alone never activates a subscription. |
| Calendar suddenly disconnected | The refresh token was revoked. The app marks the connection inactive and notifies the business; reconnect from Settings → Calendar. |
| `duplicate key ... appointments_slot_uniq` | Two bookings for the same instant. Working as designed — the second is refused and the AI offers another time. |
| Photo upload rejected | The file failed magic-byte sniffing, exceeded 15 MB, or the token expired or hit its file cap. |
| Uploaded PDF has no searchable text | It is a scan. The extractor says so on the document rather than indexing nothing silently. |
| Integration tests skipped | `TEST_DATABASE_URL` is not set. |

---

## Licence and status

This is a working application, not a finished commercial product. Before taking
payment from real customers, read the **Known limitations** and **Security
checklist** sections in [DEPLOYMENT.md](DEPLOYMENT.md), and have the legal
templates under `/legal` reviewed by a lawyer.
