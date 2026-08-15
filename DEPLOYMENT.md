# Deployment

The operational runbook. [SETUP.md](SETUP.md) is the checklist of provider
configuration; this is how the thing runs, fails and is put back.

---

## Architecture in production

| Component | Where it goes | Why |
| --- | --- | --- |
| `apps/web` | Any Next.js host — Vercel, Netlify, a container | Serverless-friendly: no request handler needs to live longer than 60 seconds |

| Managed service | Provider | Responsibility |
| --- | --- | --- |
| Database, auth | Supabase | Postgres with RLS, user accounts |
| Voice and telephony | Vapi | Phone numbers, carrying calls, transcription, running the OpenAI model |
| Billing | Stripe | Subscriptions, invoices, metered overage |
| Email | Resend (or the console adapter) | Transactional notifications |

There is exactly one thing to deploy. A phone call needs a socket held open for
minutes, but Vapi holds it, not us — the app only receives a webhook when the
call is over. That is what makes Vercel a viable host for a voice product.

---

## 1. Database first

Migrations always go ahead of the code that needs them.

```bash
SUPABASE_DB_URL=postgresql://... npm run db:migrate
```

The runner is transactional per file and records a checksum in
`schema_migrations`, so re-running is safe and an edited-after-the-fact
migration is refused rather than silently skipped.

Verify RLS actually applied — this is the check that matters most:

```sql
select count(*) from pg_policies where schemaname = 'public';
-- expect well over 50. If it is 0, the database is NOT safe to use.

select relname from pg_class
 where relnamespace = 'public'::regnamespace
   and relkind = 'r' and relrowsecurity = false;
-- expect zero rows for tenant tables.
```

---

## 2. Deploy the web app

### Build

```bash
npm ci
npm run build          # Next.js production build
npm run start          # or the host's own start command
```

On Vercel: framework preset **Next.js**, build command `npm run build`, and
nothing else to configure. The repository is an npm workspace; Vercel resolves
`@afd/shared` from source.

### Environment

Everything in [`.env.example`](.env.example) except the `TEST_` block. Three
values deserve individual attention:

- **`NEXT_PUBLIC_APP_URL`** — must be the real public origin, no trailing slash.
  Stripe return URLs and, more importantly, the webhook URL written into every
  Vapi assistant are derived from it. Change it and every assistant must be
  re-synced, or call reports go to the old address.
- **`VAPI_API_KEY`** — server-only. If this ever appears with a `NEXT_PUBLIC_`
  prefix, it is in the browser bundle and must be rotated immediately.
- **`DEMO_MODE`** — force-disabled in production builds, but set it to `false`
  explicitly so nobody has to rely on that.

### Function timeouts

| Route | Timeout | Why |
| --- | --- | --- |
| `/api/webhooks/vapi` | 60s | Ingests a call, transcript, lead and usage in one transactionable batch |
| `/api/webhooks/stripe` | 30s | Several database writes per event |
| `/api/vapi/sync` | 60s | One `PATCH` to Vapi plus a fan-out read of the tenant's rows |
| `/api/vapi/phone-number` | 60s | Buys a number, with a release-on-failure path |
| `/api/cron/maintenance` | 60s | Batch cleanup |
| `/api/account/export` | 60s | Reads every tenant table |
| `/api/account/delete` | 60s | Releases provider resources before deleting |

These are declared with `export const maxDuration` in each route, so a host that
reads that value needs no extra configuration.

---

## 3. Webhook URLs

| Source | URL | Configured where |
| --- | --- | --- |
| Vapi | `<origin>/api/webhooks/vapi` | **Not in the dashboard.** Set per-assistant by our own sync, from `NEXT_PUBLIC_APP_URL` |
| Stripe | `<origin>/api/webhooks/stripe` | Stripe dashboard |

Both routes verify before they read:

- Stripe — signature over the **raw body**. The route is excluded from
  middleware so nothing rewrites it.
- Vapi — the `x-vapi-secret` shared secret we set on the assistant, compared in
  constant time.

Both claim their event in `webhook_events` before processing, so a provider
retry is a no-op rather than a double-write. Both return 500 on a genuine
processing failure so the provider retries; a 200 means the event is durably
recorded.

> **Rotating `VAPI_WEBHOOK_SECRET` is a two-step change.** Change the variable,
> redeploy, then re-sync every assistant. Until an assistant is re-synced it
> still presents the old secret and its call reports will be rejected with 401.
> To re-sync everything at once:
>
> ```sql
> -- find the affected tenants
> select o.id, o.name
>   from public.ai_agents a
>   join public.organizations o on o.id = a.organization_id
>  where a.vapi_assistant_id is not null;
> ```
>
> then press **Update receptionist** per business, or script it against
> `syncAssistant()`.

---

## 4. Scheduled job

```
POST <origin>/api/cron/maintenance
Authorization: Bearer $CRON_SECRET
```

Every 5–15 minutes. On Vercel, `vercel.json`:

```json
{ "crons": [{ "path": "/api/cron/maintenance", "schedule": "*/10 * * * *" }] }
```

It expires abandoned founder reservations and stale team invitations. **Without
it, an abandoned checkout holds a Founding Member slot indefinitely** and you
run out of slots you never sold.

---

## 5. Health checks and monitoring

| Probe | Expect |
| --- | --- |
| `GET <origin>/api/health` | `200` with `status: "ok"` |

The response reports which integrations are *configured* as booleans. It never
returns a credential, or part of one — there is an E2E test asserting that.

Alert on:

- `status: "degraded"` — the database is unreachable.
- Rows in `error_events` with `scope = 'vapi.sync'` — customers' settings are
  saved but not reaching their receptionist.
- Rows in `error_events` with `scope = 'webhook.vapi'` — calls are happening
  that you are not recording, or not billing.
- `webhook_events` with `status = 'failed'` in the last hour.
- Agents with a non-null `vapi_sync_error` — settings saved but not live:

  ```sql
  select o.name, a.vapi_sync_error, a.vapi_synced_at
    from public.ai_agents a
    join public.organizations o on o.id = a.organization_id
   where a.vapi_sync_error is not null;
  ```

- A drop to zero calls during business hours, which is what a broken webhook
  looks like from the outside.

---

## 6. Rollback

**Application.** Redeploy the previous build. Nothing else is stateful.

**Database.** Migrations are forward-only. `0005_vapi.sql` **drops tables**
(`knowledge_documents`, `upload_tokens`, `lead_photos`, `training_messages`,
`sms_messages`, `calendar_connections`, `oauth_states`) and `0006_mvp_schema.sql`
**drops columns** (`phone_numbers.twilio_sid`, the forwarding columns, and the
unused `ai_agents` capability flags) — take a backup before applying either, and
be aware that rolling the app back past them will not bring the data back. For anything else, write a new migration rather than editing an applied
one; the checksum will reject the edit anyway.

**Assistants.** Rolling the app back does **not** roll back what is configured
at Vapi. If a bad deploy pushed a broken prompt, fix the code, redeploy, then
re-sync the affected assistants — until you do, the old prompt is still
answering calls.

---

## 7. Zero-downtime notes

- Migrations are additive. Add columns, backfill, then deploy code that reads
  them — never the other way round.
- In-flight calls are unaffected by a deploy: Vapi owns the call, and the only
  thing it needs from us is a webhook endpoint that exists when the call ends.
- Phone numbers stay attached to their assistant across deploys.
- A deploy that changes the assistant payload takes effect per business on their
  next save or manual sync, not automatically. If a change must reach everyone,
  script a sync across tenants and expect it to take a while.

---

## 8. Cost control

Two bills to keep apart: what Vapi charges **you**, and what you charge your
customers.

| Cost | Driver | Control |
| --- | --- | --- |
| Vapi minutes | Per minute of conversation, including the OpenAI usage | `maxDurationSeconds: 1800` and `silenceTimeoutSeconds: 30` on every assistant, plus a spend limit in the Vapi dashboard |
| Vapi numbers | Monthly rental | One number per organisation; account deletion releases it |
| Supabase | Rows and egress | Transcript retention policy |
| Stripe | Percentage of revenue | — |

**Check your unit economics before launch.** The Founding plan bills overage at
$0.10/minute. If your all-in Vapi cost per minute is higher than that, every
customer who exceeds their allowance costs you money. The numbers live in
[`packages/shared/src/plans.ts`](packages/shared/src/plans.ts) and changing them
is a one-line edit plus a new Stripe price.

---

## 9. Security checklist

Verified before launch, and after any change to auth or the provider layer:

- [ ] `SUPABASE_SERVICE_ROLE_KEY` is server-only and has no `NEXT_PUBLIC_` twin.
- [ ] `VAPI_API_KEY` appears nowhere in the client bundle:
      `npm run build && grep -r "VAPI_API_KEY\|vapi.ai" apps/web/.next/static/`
      returns nothing.
- [ ] Every tenant table has `rowsecurity = true` **and** `forcerowsecurity`.
- [ ] The Stripe webhook rejects an unsigned request with 400.
- [ ] The Vapi webhook rejects a wrong secret with 401 and never writes a call.
- [ ] `/admin` is refused to a signed-in user not in `ADMIN_EMAILS`.
- [ ] There is no impersonation path — admins cannot read customer transcripts
      from the admin console.
- [ ] Logs contain no keys, secrets or full phone numbers.
- [ ] Card details are never written to our database; Stripe holds them.
- [ ] Invitation tokens are stored as keyed hashes, never in plaintext.
- [ ] Account deletion releases the Vapi number and assistant before deleting
      the organisation, and is audit-logged first so the record survives.

---

## 10. Known limitations

Stated plainly, because a launch decision needs them:

- **Rate limiting is per-instance.** The default store is in-memory, so N
  instances allow roughly N times the configured limit. Swap
  `setRateLimitStore()` for a Redis-backed implementation of the same interface
  before serious traffic.
- **Assistant sync is not transactional.** A settings save commits to Postgres
  before the push to Vapi is attempted. When the push fails the row is stamped
  with `vapi_sync_error` and the UI says the change is not live — but the two
  can be out of step until someone retries.
- **No bulk re-sync tool.** A change to the prompt builder reaches each business
  only on their next save or manual sync. A migration that must reach everyone
  needs a script.
- **Overage is reported, not enforced.** A business past its allowance keeps
  being answered and is billed afterwards. That is deliberate — cutting off a
  customer's phone line mid-month is worse — but it means a runaway caller can
  run up a bill.
- **Transfers depend on the carrier.** `forwardingPhoneNumber` hands the call to
  Vapi's transfer path; some destinations handle it poorly. Test the actual
  number a business gives you.
- **The receptionist does not book appointments.** It records the time a caller
  asked for. There is no availability lookup, so two callers can request the
  same slot and a human resolves it.
- **No SMS.** Nothing texts the caller. If a business needs confirmation texts,
  that is a feature to build, not a setting to turn on.
- **Legal pages are templates.** They describe what the software actually does,
  which is the hard part, but they have not been reviewed by a lawyer.

---

## 11. Production checklist

- [ ] Migrations applied; `pg_policies` count verified non-zero
- [ ] Web app deployed and `/api/health` returns `ok`
- [ ] `DEMO_MODE=false`
- [ ] `NEXT_PUBLIC_APP_URL` is the real origin, and assistants were synced after
      it was set
- [ ] Vapi private key configured, spend limit set
- [ ] `VAPI_WEBHOOK_SECRET` set, and a real call report was received and stored
- [ ] Stripe in live mode; live webhook secret; portal activated
- [ ] Cron job scheduled and returning `{"ok":true}`
- [ ] `ADMIN_EMAILS` set to real addresses
- [ ] Email domain verified (SPF, DKIM, DMARC)
- [ ] Uptime monitoring on `/api/health`
- [ ] Alerting on `error_events` and `webhook_events.status = 'failed'`
- [ ] Backups confirmed, and a restore actually tested
- [ ] Legal templates reviewed
- [ ] You have called the number yourself, from a phone, and it worked
