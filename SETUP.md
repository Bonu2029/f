# Setup checklist

Everything that has to be done by hand, in order. Items marked **dashboard**
cannot be scripted — they need a human in a provider's web console.

Work through it once for a staging environment and once for production.

---

## 1. Repository and secrets

- [ ] `npm install`
- [ ] `cp .env.example .env.local`
- [ ] Generate `APP_ENCRYPTION_KEY`
      `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
- [ ] Generate `VAPI_WEBHOOK_SECRET`
      `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- [ ] Generate `CRON_SECRET`
      `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- [ ] Set `NEXT_PUBLIC_APP_URL` to your real origin, no trailing slash
- [ ] Set `ADMIN_EMAILS` to the addresses that may reach `/admin`
- [ ] Confirm `.env.local` is **not** committed (`.gitignore` covers it)

---

## 2. Supabase

- [ ] **dashboard** Create a project
- [ ] **dashboard** Project Settings → API → copy Project URL → `NEXT_PUBLIC_SUPABASE_URL`
- [ ] **dashboard** Copy `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] **dashboard** Copy `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
      *(server only — never prefix it `NEXT_PUBLIC_`)*
- [ ] **dashboard** Project Settings → Database → copy the URI → `SUPABASE_DB_URL`
- [ ] **dashboard** Authentication → URL Configuration
  - [ ] Site URL = your origin
  - [ ] Redirect URLs include `<origin>/auth/callback`
- [ ] **dashboard** Authentication → Providers → Email enabled
- [ ] **dashboard** Decide on "Confirm email" (leave **on** for production)
- [ ] **dashboard** Authentication → Email Templates — rewrite the default
      Supabase copy to match your brand
- [ ] Run `npm run db:migrate`
- [ ] Verify in the SQL editor:
      `select count(*) from pg_policies where schemaname = 'public';`
      *(should be well over 50 — if it is 0, RLS did not apply and the database
      is not safe to use)*
- [ ] Optionally `npm run db:seed` for a demo organisation

---

## 3. Stripe

- [ ] Create an account; start in **test mode**
- [ ] **dashboard** Developers → API keys → copy the secret key → `STRIPE_SECRET_KEY`
- [ ] Run `npm run stripe:setup`
- [ ] Paste the printed ids into your environment:
  - [ ] `STRIPE_FOUNDER_PRICE_ID`
  - [ ] `STRIPE_STANDARD_PRICE_ID`
  - [ ] `STRIPE_OVERAGE_PRICE_ID`
  - [ ] `STRIPE_OVERAGE_METER_EVENT`
- [ ] **dashboard** Developers → Webhooks → Add endpoint
  - [ ] URL `<origin>/api/webhooks/stripe`
  - [ ] Events:
        `checkout.session.completed`,
        `checkout.session.expired`,
        `customer.subscription.created`,
        `customer.subscription.updated`,
        `customer.subscription.deleted`,
        `invoice.paid`,
        `invoice.payment_failed`
  - [ ] Copy the signing secret → `STRIPE_WEBHOOK_SECRET`
- [ ] **dashboard** Settings → Billing → Customer portal → **activate**
  - [ ] Allow updating payment methods
  - [ ] Allow viewing invoice history
  - [ ] Allow cancellation
  - [ ] Set the return URL to `<origin>/dashboard/billing`
- [ ] **dashboard** Settings → Business → set your public business name,
      support email and statement descriptor (customers see this on their card
      statement)
- [ ] **dashboard** Settings → Tax — decide whether you need Stripe Tax
- [ ] Test end to end with card `4242 4242 4242 4242`
- [ ] Repeat for **live mode** before launch

---

## 4. Vapi

Vapi supplies the number, carries the call, transcribes it and runs the OpenAI
model. There is no separate OpenAI key in this product.

- [ ] Create an account at vapi.ai
- [ ] **dashboard** Add a payment method — numbers and per-minute charges are
      billed by Vapi, separately from what your customers pay you through Stripe
- [ ] **dashboard** Copy the **private** API key → `VAPI_API_KEY`
      *(not the public key — that one is for browser SDKs, which this product
      does not use)*
- [ ] Set `VAPI_WEBHOOK_SECRET` to the value generated in step 1
- [ ] Confirm `NEXT_PUBLIC_APP_URL` is your real public origin. It is written
      into every assistant as the webhook URL at sync time, so an assistant
      synced against `localhost` will never deliver call reports
- [ ] Optionally set `VAPI_OPENAI_MODEL` (defaults to `gpt-4o`)
- [ ] **dashboard** Set a spend limit — a runaway loop on a phone line is
      expensive
- [ ] There is **nothing to configure in the Vapi dashboard for webhooks.** Each
      assistant we create carries its own `server.url` and `server.secret`

---

## 5. Email

- [ ] Choose a provider (`EMAIL_PROVIDER=resend` is implemented; `console` just
      logs)
- [ ] Set `RESEND_API_KEY` and `EMAIL_FROM`
- [ ] **dashboard** Verify your sending domain (SPF, DKIM, DMARC) — without this
      your notifications land in spam

---

## 6. Scheduled maintenance

- [ ] Schedule `POST <origin>/api/cron/maintenance` every 5–15 minutes with
      header `Authorization: Bearer $CRON_SECRET`
- [ ] Confirm it returns `{"ok":true}` and not 403

This job expires abandoned founder reservations and stale team invitations.
**Without it, abandoned checkouts hold Founding Member slots indefinitely.**

---

## 7. Go-live verification

Walk the whole path yourself before inviting anyone:

- [ ] Sign up with a real email; the verification link arrives and works
- [ ] Checkout completes and the subscription shows **active** in the dashboard
- [ ] The Stripe webhook shows a `200` for `checkout.session.completed`
- [ ] The founder counter decrements on the public pricing page
- [ ] Business Settings: details, services, service areas and FAQs all save
- [ ] The AI Receptionist page shows the assistant as **Up to date**, and the
      assistant exists in the Vapi dashboard with your business in its prompt
- [ ] Deliberately break it: set `VAPI_API_KEY` to garbage, save a service, and
      confirm the UI says *saved here, but not live yet* rather than "Saved".
      Restore the key and press **Update receptionist**
- [ ] A phone number is purchased and appears in the Vapi dashboard, attached to
      your assistant
- [ ] Activation succeeds and the checklist is green
- [ ] **Call the AI number from your own phone.** It answers, knows your
      business, and sounds right
- [ ] Ask "are you a real person?" — it answers truthfully
- [ ] Ask for a price you did not configure — it refuses to invent one
- [ ] Give a ZIP outside your service area — it says so politely
- [ ] Ask for an appointment — it takes your preferred time and says the team
      will confirm, rather than promising a slot
- [ ] Ask for a human — the transfer connects
- [ ] After hanging up: the call, transcript, summary, lead and usage all appear
      within a minute or so
- [ ] Pause the receptionist, call again, and confirm the missed call is still
      recorded against the business
- [ ] `/admin` is reachable by an `ADMIN_EMAILS` address and **not** by anyone
      else
- [ ] `/api/health` reports `ok`

---

## 8. Before charging real money

- [ ] `DEMO_MODE=false` in production (it is force-disabled in production builds
      anyway, but set it correctly)
- [ ] Stripe switched to **live** keys and a live webhook secret
- [ ] Legal templates under `/legal` reviewed by a lawyer
- [ ] Privacy Policy lists your actual sub-processors by name
- [ ] Call recording and consent requirements reviewed for every state you
      operate in
- [ ] Vapi spend limit set, and your per-minute cost checked against the plan
      allowances in `packages/shared/src/plans.ts` — if Vapi costs you more per
      minute than you charge in overage, every heavy customer loses you money
- [ ] Business registration, tax and sales-tax position sorted
- [ ] Uptime monitoring on `/api/health`
- [ ] Error alerting wired to the `error_events` table or your log platform
- [ ] Database backups confirmed (Supabase → Database → Backups)
- [ ] A tested restore, not just a backup
