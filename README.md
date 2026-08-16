# AI Front Desk

A multi-tenant SaaS that gives local service businesses their own AI
receptionist. A business signs up, fills in what it does, picks a voice, gets a
phone number and goes live. From then on the receptionist answers their calls
24/7 — answering questions from their own stored information, capturing leads,
recording the appointment times callers ask for, and transferring callers to a
person when they ask.

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
- [Vapi setup](#vapi-setup)
- [Stripe setup](#stripe-setup)
- [Running the app](#running-the-app)
- [Testing](#testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## Architecture

```
┌──────────────┐   PSTN    ┌───────────────────────────────────┐
│   Customer   │──────────▶│               Vapi                │
└──────────────┘           │  number · voice pipeline ·        │
                           │  transcription · OpenAI model     │
                           └───────┬──────────────────▲────────┘
              end-of-call-report   │                  │  assistant config
              (signed webhook)     ▼                  │  (server API call)
                     ┌──────────────────────────────────────────┐
                     │  apps/web (Next.js)                      │
                     │  • marketing, auth, dashboard, admin     │
                     │  • ALL tenant logic                      │
                     │  • the only holder of VAPI_API_KEY       │
                     └───────────────┬──────────────────────────┘
                                     ▼
                  ┌─────────────────────────┐   ┌────────┐
                  │ Supabase (Postgres,     │   │ Stripe │
                  │ Auth, RLS)              │   │        │
                  └─────────────────────────┘   └────────┘
```

There is one deployable service. Vapi holds the WebSocket for the length of a
call, so this product does not need a persistent process of its own and runs
anywhere Next.js runs, Vercel included.

| Path | What it is |
| --- | --- |
| `apps/web` | Next.js 16 App Router. Marketing site, auth, dashboard, admin, all API routes and webhooks. **Every piece of tenant logic lives here.** |
| `packages/shared` | Brand config, plan catalogue, billing arithmetic, the assistant-payload builder, validation schemas, pure domain logic. |
| `supabase/migrations` | Schema, RLS policies, transactional functions, storage buckets. |
| `scripts` | Migration runner, seed data, Stripe setup, preview generator. |
| `tests` | Unit (pure logic) and integration (real Postgres) suites, plus Playwright E2E. |

### Where the provider key lives

`VAPI_API_KEY` is read only through
[`apps/web/src/lib/env.ts`](apps/web/src/lib/env.ts), which imports
`server-only`. Every call to Vapi goes through
[`apps/web/src/lib/providers/vapi.ts`](apps/web/src/lib/providers/vapi.ts),
which imports `server-only` as well. A client component that reaches for either
is a **build error**, not a silent leak. There is no client-side Vapi SDK in
this app: the browser posts to `/api/vapi/sync` or `/api/vapi/phone-number`, and
the server does the rest.

### How settings reach a live call

```
owner saves a form
  → Server Action writes the row (organization_id from the session, never the form)
  → syncAssistantQuietly() rebuilds the assistant payload from the tenant's rows
  → PATCH https://api.vapi.ai/assistant/:id
  → success:  ai_agents.vapi_assistant_id + system_prompt + vapi_synced_at written
  → failure:  ai_agents.vapi_sync_error stored, and the form says
              "saved here, but not live yet" — never a plain "Saved"
```

The payload itself is built by `buildAssistantConfig()` in
[`packages/shared/src/vapi.ts`](packages/shared/src/vapi.ts) — a pure function
with no I/O, so the thing that decides how a real call goes is unit-testable.
See [`tests/unit/assistant.test.ts`](tests/unit/assistant.test.ts).

### How a call is bound to a tenant

The **only** trusted path from a call to a business is
`ai_agents.vapi_assistant_id`, which only our server ever writes, resolved by
`resolve_call_by_assistant()` in Postgres. Nothing a caller says, and nothing
the model produces, can move a call into another organisation's account. The
webhook verifies the `x-vapi-secret` shared secret in constant time before it
reads the body, and claims each event in `webhook_events` so provider retries
cannot double-write.

---

## The billing rule

Stated once, implemented once, tested once:

```
billable_minutes(call) = ceil(billed_seconds / 60)
```

- `billed_seconds` comes from the timestamps in the provider's end-of-call
  report, not from the browser and not from our own clock.
- Rounding is **per call**, and a period's total is the sum of those rounded
  minutes. Three 30-second calls bill 3 minutes, not 2.
- Usage above the plan allowance is billed at the plan's per-minute overage rate
  and reported to a Stripe billing meter.
- Recording is idempotent: `usage_ledger` has a unique index on `call_id`, and
  `calls` has one on `vapi_call_id`, so a retried webhook cannot double-bill.

Implementation: [`packages/shared/src/billing.ts`](packages/shared/src/billing.ts)
and `record_call_usage()` in
[`supabase/migrations/0003_functions.sql`](supabase/migrations/0003_functions.sql).

---

## Local development

### Requirements

- Node 20.11+ (22 recommended)
- A PostgreSQL instance if you want to run the integration tests

### Get running in five minutes

```bash
git clone <this repo> && cd ai-front-desk
npm install

cp .env.example .env.local
# Generate the secrets the app needs even in demo mode:
node -e "console.log('APP_ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('base64'))"
node -e "console.log('VAPI_WEBHOOK_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

npm run dev          # http://localhost:3000
```

With `DEMO_MODE=true` (the default in `.env.example`) the app runs against mock
adapters for Vapi and Stripe. Mock identifiers are prefixed `demo_`, mock rows
are flagged `is_demo`, and the UI badges them — no simulated charge is presented
as a real one, and a demo phone number says plainly that it cannot receive
calls. You still need Supabase for the database and auth.

---

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. **Project Settings → API** — copy into `.env.local`:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`. Use the bare origin
     (`https://<ref>.supabase.co`), not the REST endpoint. Pasting the REST URL
     works — the API path is stripped — but the bare origin is what you want.
   - The public key → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Newer projects
     issue `sb_publishable_…`; older ones a JWT-shaped `anon` key, which goes in
     `NEXT_PUBLIC_SUPABASE_ANON_KEY` instead. The app reads either.
   - The secret key (`sb_secret_…`, or `service_role` on older projects) →
     `SUPABASE_SERVICE_ROLE_KEY`. **Server only** — never prefix it
     `NEXT_PUBLIC_`.
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

Two routes to the same schema — they produce byte-identical results, and there
is a test that proves it.

**With the database password** (preferred — it tracks what it applied):

```bash
SUPABASE_DB_URL='postgresql://...' npm run db:migrate
npm run db:seed              # optional demo organisation
```

The runner records applied files in `schema_migrations` with a checksum, so
re-running is safe and an edited-after-the-fact migration is flagged rather than
silently re-applied. Each file runs in a transaction; a failure rolls back.

**Without it** — paste one file into the dashboard:

```bash
npm run db:bundle            # writes supabase/migrations/bundle.sql
```

Open Supabase → SQL Editor → New query, paste the whole file, Run. It is a
one-time apply: it refuses to run against a database that has already been
migrated, and it records the migrations so a later `npm run db:migrate` picks up
cleanly from there.

| File | Contents |
| --- | --- |
| `0001_schema.sql` | Tables, enums, constraints, indexes, `updated_at` triggers |
| `0002_rls.sql` | Table grants, RLS enabled **and forced** on every tenant table, policies |
| `0003_functions.sql` | Founder-slot reservation, usage recording, webhook idempotency, metrics |
| `0004_storage.sql` | Private storage buckets and their access policies |
| `0005_vapi.sql` | Vapi identifier columns, assistant-based call routing, and removal of the tables belonging to the retired SIP/Twilio flow |
| `0006_mvp_schema.sql` | Assistant identity moved onto `ai_agents`, `onboarding_completed`, `calls.transcript` / `calls.ended_reason`, and a guard that fails the migration if any tenant table is missing `organization_id` or RLS |

### Where each MVP field lives

| Table | Vapi / MVP columns |
| --- | --- |
| `organizations` | `onboarding_completed` (generated from `onboarding_completed_at`) |
| `ai_agents` | `vapi_assistant_id`, `voice_id`, `name`, `greeting`, `personality`, `system_prompt`, `transfer_phone`, `active`, `vapi_synced_at`, `vapi_sync_error` |
| `phone_numbers` | `vapi_phone_number_id`, `phone_number`, `organization_id` |
| `calls` | `vapi_call_id`, `caller_phone`, `started_at`, `ended_at`, `duration_seconds`, `transcript`, `summary`, `ended_reason` |

`tests/integration/schema-contract.test.ts` asserts all of the above against a
real database, plus that every tenant table carries `organization_id` and has
RLS both enabled and **forced**.

---

## Vapi setup

Vapi supplies the phone number, carries the call, transcribes speech and runs
the OpenAI model. **This app holds no OpenAI key of its own** — OpenAI is
configured as the model provider inside the assistant we create.

1. Create an account at [vapi.ai](https://vapi.ai) and add a payment method
   (numbers and minutes are billed by Vapi, separately from your customers'
   Stripe subscriptions).
2. Copy the **private** API key into `VAPI_API_KEY`. Not the public key — the
   public key is for browser SDKs, which this product does not use.
3. Generate a webhook secret and put it in `VAPI_WEBHOOK_SECRET`:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

   You do **not** configure this in the Vapi dashboard. Every assistant we
   create carries `server.url` and `server.secret`, so the webhook URL and
   secret are set per-assistant, from `NEXT_PUBLIC_APP_URL`, at sync time.
4. Optionally set `VAPI_OPENAI_MODEL` (defaults to `gpt-4o`).

Locally, Vapi cannot reach `localhost`. To exercise a real call, expose the app
and point `NEXT_PUBLIC_APP_URL` at the tunnel **before** you press "Update
receptionist", since the URL is baked into the assistant at sync time:

```bash
ngrok http 3000
# set NEXT_PUBLIC_APP_URL=https://<id>.ngrok.app, restart, then re-sync
```

### What the app creates in your Vapi account

| Action | When | Endpoint |
| --- | --- | --- |
| Create assistant | First save of business or receptionist settings | `POST /assistant` |
| Update assistant | Every subsequent save, and "Update receptionist" | `PATCH /assistant/:id` |
| Buy number | Owner presses "Get my number" | `POST /phone-number` |
| Release number | Account deletion | `DELETE /phone-number/:id` |
| Delete assistant | Account deletion | `DELETE /assistant/:id` |

If saving the number to our database fails, the number is released again rather
than left orphaned on your Vapi bill.

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

## Running the app

```bash
npm run env:check        # what is set, what is missing, and what each one breaks
npm run doctor           # whether those values actually WORK against the providers
npm run dev              # http://localhost:3000
curl localhost:3000/api/health
```

`env:check` reads your `.env.local`. `doctor` goes further and makes real
read-only calls: it proves the Supabase key is accepted, that all 14 tables
exist, that an anonymous read of `organizations` returns nothing (so RLS is
genuinely on), and that the Vapi and Stripe keys are live. It is the fastest way
to tell "wrong credentials" apart from "schema never applied" — two failures
that look identical from the browser.

The health endpoint reports which integrations are *configured* — booleans only,
never a value or a partial key.

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

- **Tenant isolation** — a user from Business A cannot read or write Business
  B's organisations, leads, calls, transcripts or Vapi identifiers, executed as
  the `authenticated` role with a JWT claim exactly as PostgREST would.
- **Call routing** — an assistant id resolves to exactly one organisation; an
  unknown id resolves to none; a paused receptionist, an inactive agent and a
  cancelled subscription are each refused with a distinct reason, while a
  past-due subscription is still served.
- **Founding 50** — slots 1–50 are issued in order, the 51st is refused, ten
  simultaneous reservations for the last slot produce exactly one winner,
  abandoned reservations return to inventory, and an activated slot is never
  reopened after cancellation.
- **Usage** — per-call rounding, idempotent recording, demo calls excluded from
  the plan allowance, period resets.
- **Webhooks** — an event is claimed once; concurrent deliveries produce one
  winner.

The unit suite covers the billing arithmetic, the domain helpers, and the
assistant payload: which prices reach the prompt, what the assistant is told
when nothing is configured, and that the safety rules are appended last so an
owner's instructions cannot override them.

When `TEST_DATABASE_URL` is unset the integration suites **skip with a printed
explanation** rather than silently passing.

---

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for the full runbook, and
[SETUP.md](SETUP.md) for the checklist of dashboard configuration that cannot be
scripted.

Short version: one Next.js app on any host that runs Next.js — Vercel is the
path of least resistance. Supabase, Vapi and Stripe are managed services.
Nothing is coupled to a specific host.

---

## Troubleshooting

| Symptom | Likely cause and fix |
| --- | --- |
| `MissingEnvError` naming a variable | That feature's credential is absent. Add it, or set `DEMO_MODE=true` for local work. |
| Settings save but the receptionist behaves the old way | The sync to Vapi failed. The dashboard shows the reason on the AI Receptionist page; press **Update receptionist** to retry. |
| "Vapi is not configured … the API key was rejected" | `VAPI_API_KEY` is missing, wrong, or is the *public* key rather than the private one. |
| Assistant ids all start with `demo_` | `DEMO_MODE=true`, or `VAPI_API_KEY` is unset. Nothing was created in Vapi. |
| Calls happen but no call rows appear | Vapi cannot reach `NEXT_PUBLIC_APP_URL`, or the assistant was synced while it pointed somewhere else. Re-sync after fixing the URL. |
| Webhook returns 401 | `VAPI_WEBHOOK_SECRET` changed after the assistant was synced. Re-sync so the new secret is set on the assistant. |
| Call report ignored as `unknown_assistant` | The report is for an assistant no organisation owns — usually one created by hand in the Vapi dashboard. |
| Call refused as `agent_inactive` | The receptionist was never activated. Activate it on the AI Receptionist page. |
| Stripe webhook returns 400 | Signature mismatch — wrong `STRIPE_WEBHOOK_SECRET`, or a proxy is rewriting the body. The route needs the raw body. |
| Subscription stays `incomplete` after paying | The webhook is not reaching you. Check the endpoint URL and Stripe's delivery log; the redirect alone never activates a subscription. |
| `duplicate key ... appointments_slot_uniq` | Two appointments for the same instant. Working as designed — the second is refused. |
| Integration tests skipped | `TEST_DATABASE_URL` is not set. |

---

## Not in this MVP

Stated plainly so nothing in the product implies otherwise:

- **Outbound SMS and photo requests.** No text messages are sent. The marketing
  site, the legal pages and the receptionist settings all say so.
- **Calendar booking.** The receptionist records the day and time a caller asks
  for; a person confirms it. There is no Google Calendar connection and no
  availability lookup, so the assistant is instructed never to promise a slot.
- **Browser test calls and voice previews.** Both would need a second audio path
  that is not the one answering real calls, and a preview that is not the real
  voice is worse than no preview.

---

## Licence and status

This is a working application, not a finished commercial product. Before taking
payment from real customers, read the **Known limitations** and **Security
checklist** sections in [DEPLOYMENT.md](DEPLOYMENT.md), and have the legal
templates under `/legal` reviewed by a lawyer.
