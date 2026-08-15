# Deployment

How to get AI Front Desk into production, keep it running, and roll it back when
something goes wrong.

---

## Architecture in production

| Component | Where it runs | Why |
| --- | --- | --- |
| `apps/web` | Any Next.js host — Vercel, Netlify, Cloud Run, a container | Request/response and static pages; scales to zero fine |
| `apps/voice-worker` | Persistent Node/Docker host — Railway, Render, Fly.io, ECS, a VM | Holds a WebSocket open for the length of each call |
| Database, auth, storage | Supabase | Postgres with RLS, auth, private object storage |
| Billing | Stripe | Subscriptions, invoices, customer portal, usage meter |
| Telephony | Twilio | Numbers, SIP trunk, SMS |
| Realtime AI | OpenAI | Voice conversation and text tasks |

Nothing is coupled to a specific host. The web app is a standard Next.js build;
the worker is a plain Node process in a container.

---

## 1. Database first

```bash
SUPABASE_DB_URL="postgresql://...pooler.supabase.com:5432/postgres" npm run db:migrate
```

Run migrations **before** deploying code that depends on them. The runner is
idempotent and records what it applied.

Verify RLS actually landed:

```sql
select count(*) from pg_policies where schemaname = 'public';   -- expect > 50
select relname from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
-- expect zero rows: every tenant table must have RLS enabled
```

---

## 2. Deploy the voice worker

The worker must be reachable by the web app and must **not** be publicly
writable — its only authenticated endpoint is `/calls/accept`, protected by a
shared secret. Put it on private networking where your platform supports it.

### Docker

```bash
docker build -f apps/voice-worker/Dockerfile -t ai-front-desk-worker .
docker run -p 8787:8787 \
  -e OPENAI_API_KEY=sk-... \
  -e VOICE_WORKER_SECRET=... \
  -e WEB_INTERNAL_URL=https://your-app.example.com \
  -e OPENAI_REALTIME_MODEL=gpt-realtime-2.1 \
  ai-front-desk-worker
```

### Environment

| Variable | Required | Notes |
| --- | --- | --- |
| `OPENAI_API_KEY` | yes | Opens realtime sessions |
| `VOICE_WORKER_SECRET` | yes | Must match the web app exactly |
| `WEB_INTERNAL_URL` | yes | Where the worker reaches the internal API |
| `OPENAI_REALTIME_MODEL` | no | Defaults to `gpt-realtime-2.1` |
| `PORT` | no | Defaults to 8787 |
| `MAX_CALL_SECONDS` | no | Hard ceiling per call. Default 1800 |
| `IDLE_TIMEOUT_SECONDS` | no | Ends a silent call. Default 45 |
| `LOG_LEVEL` | no | `debug` \| `info` \| `warn` \| `error` |

### Scaling and shutdown

- Scale **horizontally**; each instance handles many concurrent calls, bounded
  by memory and outbound socket limits.
- Do **not** autoscale to zero. A cold worker cannot answer a ringing phone.
- On `SIGTERM` the worker stops accepting new calls and lets in-flight calls
  finish (up to 30s) so their usage and summaries are still recorded. Set your
  platform's grace period to at least 45 seconds.
- Health check: `GET /health` → `{"status":"ok","active_calls":n}`.

---

## 3. Deploy the web app

```bash
npm run build:web
npm run start --workspace=@afd/web
```

On Vercel: root directory `.`, build command `npm run build:web`, output
detected automatically. Set every server variable in the project settings, not
in `.env`.

### Environment

All of `.env.example`. Specifically for production:

- `NEXT_PUBLIC_APP_URL` — your real origin, **no trailing slash**. Webhook
  callbacks, OAuth redirects and SMS upload links are all derived from it.
- `DEMO_MODE` — must be `false`. Production builds force it off and log a
  warning if it was requested, but set it correctly.
- `SUPABASE_SERVICE_ROLE_KEY` — server-side only. If this ever appears in a
  client bundle, rotate it immediately.
- `VOICE_WORKER_URL` — the deployed worker.

### Function timeouts

Some routes need more than a default 10-second serverless timeout:

| Route | `maxDuration` |
| --- | --- |
| `/api/internal/calls/end` | 60s — usage, summary, meter reporting |
| `/api/internal/calls/tool` | 30s — a tool may call Google Calendar |
| `/api/onboarding/training` | 60s |
| `/api/business/import-website` | 60s |
| `/api/knowledge/upload` | 60s |
| `/api/account/export` | 60s |
| `/api/cron/maintenance` | 60s |

These are declared in the route files. On hosts that ignore them, raise the
platform default.

---

## 4. Webhook URLs

| Provider | URL | Configured in |
| --- | --- | --- |
| Stripe | `<origin>/api/webhooks/stripe` | Stripe dashboard |
| OpenAI | `<origin>/api/webhooks/openai` | OpenAI dashboard |
| Twilio SMS | `<origin>/api/webhooks/twilio/sms` | Set automatically when a number is purchased |
| Twilio status | `<origin>/api/webhooks/twilio/status` | Set automatically |

All four verify signatures before reading the payload, and all four are
idempotent through the `webhook_events` table. Failures return 5xx so the
provider retries; the admin panel shows the failure and its reason.

> The Twilio routes are excluded from middleware so nothing rewrites their body,
> and the Stripe route reads the raw body — do not put a body-transforming proxy
> in front of them.

---

## 5. Scheduled job

`POST <origin>/api/cron/maintenance` with `Authorization: Bearer $CRON_SECRET`,
every 5–15 minutes.

**Vercel** (`vercel.json`):

```json
{ "crons": [{ "path": "/api/cron/maintenance", "schedule": "*/10 * * * *" }] }
```

Vercel cron sends GET, so either add a GET handler or use an external scheduler
(GitHub Actions, Upstash QStash, a cron container) that can send POST with the
header.

It does three things:

1. Expires abandoned Founding Member reservations → the slot returns to
   inventory. **Without this, an abandoned checkout holds a slot forever.**
2. Finalises calls the worker never closed (crash, network partition) so usage
   and summaries are not lost.
3. Purges expired OAuth state rows and marks lapsed upload tokens revoked.

---

## 6. Health checks and monitoring

| Endpoint | Meaning |
| --- | --- |
| `GET /api/health` | 200 when the database is reachable; reports which integrations are configured (booleans only, never values) |
| `GET <worker>/health` | 200 with the active call count |

Alert on:

- either health check failing for more than two consecutive probes;
- rows appearing in `error_events` with scope `call.*` or `billing.*`;
- `webhook_events` with `status = 'failed'` in the last hour;
- Stripe webhook delivery failures in the Stripe dashboard;
- worker `active_calls` at zero during business hours when calls are expected.

Logs are single-line JSON with `severity`, `message`, `request_id`,
`organization_id` and `call_id`. Values that look like credentials, tokens, JWTs
or card numbers are redacted before serialisation, so shipping logs to a
third-party platform does not leak secrets.

---

## 7. Rollback

**Application.** Redeploy the previous build. The web app and worker are
stateless; nothing is lost.

**Database.** Migrations are forward-only and additive by convention. To undo a
schema change, write a new migration that reverses it — do not edit an applied
file (the runner detects a changed checksum and warns).

For a destructive mistake, restore from a Supabase backup:
Dashboard → Database → Backups → Restore. Test this before you need it.

**Order matters.** Deploy migrations first, then code. When rolling back, roll
code back first and leave the schema alone unless it is the problem.

---

## 8. Zero-downtime notes

- Migrations must be backwards compatible with the currently-deployed code:
  add columns as nullable, backfill separately, drop only after the old code is
  gone.
- The worker drains in-flight calls on shutdown, so a rolling restart does not
  drop live conversations if your platform waits for the grace period.
- Phone numbers stay attached to the SIP trunk across deploys; a web app restart
  does not interrupt a call already in progress.

---

## 9. Cost control

| Cost | Driver | Control |
| --- | --- | --- |
| OpenAI Realtime | Per minute of conversation | `MAX_CALL_SECONDS`, `IDLE_TIMEOUT_SECONDS`, an OpenAI spend limit |
| Twilio | Number rental + per-minute + per-SMS | One number per organisation, enforced by plan |
| Supabase | Storage and egress | Document and photo size caps; retention policy |
| Stripe | Percentage of revenue | — |

Your gross margin depends on realtime pricing versus the plan's included
minutes. Model this before launch: at $20/month with 200 included minutes, the
per-minute cost has to be well under $0.10 for a Founding Member to be
profitable at full usage.

---

## 10. Security checklist

Before production:

- [ ] `SUPABASE_SERVICE_ROLE_KEY` set only server-side; never `NEXT_PUBLIC_`
- [ ] Verified: `grep -r "SUPABASE_SERVICE_ROLE" apps/web/src` shows only
      `lib/env.ts` and `lib/supabase/server.ts`
- [ ] RLS enabled **and forced** on every tenant table (query in §1)
- [ ] `APP_ENCRYPTION_KEY` is 32 bytes of real randomness, stored in a secret
      manager, and **backed up** — losing it makes every stored OAuth token
      unrecoverable
- [ ] All four webhook signature secrets set and verified working
- [ ] `CRON_SECRET` set; `/api/cron/maintenance` returns 403 without it
- [ ] `ADMIN_EMAILS` contains only people who should see every customer's account
- [ ] HTTPS enforced; HSTS header present (set in `next.config.ts`)
- [ ] Storage buckets are **private** — confirm in the Supabase dashboard
- [ ] Rate limiting: the in-process limiter is per-instance. For multiple
      instances, implement `RateLimitStore` against Redis and pass it to
      `setRateLimitStore()` — otherwise each instance allows the full quota
- [ ] Database backups enabled, and a restore actually tested
- [ ] Secrets stored in the platform's secret manager, not in a repo or image
- [ ] Dependency audit run (`npm audit`) and criticals addressed

---

## 11. Known limitations

Honest list. None of these are hidden behind a "coming soon" label in the UI.

**Telephony**

- **Number porting is not implemented.** Businesses keep their existing number
  by forwarding to the AI number. Forwarding is configured with their own
  carrier — we provide instructions, not automation, and we say so.
- Outbound calling is not implemented; the receptionist answers, it does not
  dial out.
- Transfers use SIP REFER. Some carriers handle REFER poorly; when it fails the
  receptionist tells the caller honestly and offers to take a message.

**AI**

- Voice previews use a text-to-speech model, which is close to but not identical
  to the realtime voice.
- Multilingual mode is verified for English and Spanish. Other languages are
  best-effort and the product does not claim otherwise.
- Knowledge retrieval is PostgreSQL full-text search, not embeddings. It is fast,
  cheap, tenant-isolated and good enough for a small business's documents; it
  will not match a paraphrase that shares no words with the source.
- PDF text extraction handles text-based PDFs. Scanned PDFs are rejected with a
  clear message rather than indexed as empty. There is no OCR.

**Availability**

- Radius-based service areas cannot be evaluated without a geocoder. The
  receptionist says a human will confirm rather than guessing coverage.
- Availability comes from Google Calendar free/busy plus our own bookings.
  Other calendar providers are not implemented.

**Billing**

- One plan per organisation; no seat-based or usage-tier pricing.
- Overage is reported to a Stripe meter as it accrues. If meter reporting fails,
  the error is recorded in `error_events` and the ledger row stays unreported —
  reconcile before invoicing.
- Proration on plan change is left to Stripe's defaults.

**Operations**

- Rate limiting is in-process (see the security checklist).
- No audio recording, by design. Adding it requires consent handling and legal
  review; the disclosure page says so.
- Email uses a single provider abstraction with a Resend adapter. The default
  `console` adapter logs instead of sending, and says so in the log line.

**Legal**

- Everything under `/legal` is a **template** and is labelled as such on every
  page. It has not been reviewed by a lawyer.

---

## 12. Production checklist

- [ ] Migrations applied and verified
- [ ] Web app deployed with all environment variables
- [ ] Voice worker deployed, healthy, reachable from the web app
- [ ] All four webhooks configured and returning 200
- [ ] Scheduled maintenance job running
- [ ] Stripe in live mode, portal activated
- [ ] Twilio out of trial, A2P 10DLC approved, SIP trunk verified
- [ ] OpenAI webhook enabled, spend limit set
- [ ] Google OAuth consent screen submitted for verification
- [ ] Email domain authenticated (SPF/DKIM/DMARC)
- [ ] Monitoring and alerting live
- [ ] Backups enabled and a restore tested
- [ ] A real end-to-end call completed successfully (SETUP.md §10)
- [ ] Legal templates reviewed
- [ ] `DEMO_MODE=false`
