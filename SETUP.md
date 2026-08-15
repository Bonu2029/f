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
- [ ] Generate `UPLOAD_TOKEN_SECRET`
      `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- [ ] Generate `VOICE_WORKER_SECRET`
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

## 4. Twilio

- [ ] Create an account and complete verification
- [ ] **dashboard** Copy Account SID → `TWILIO_ACCOUNT_SID`
- [ ] **dashboard** Copy Auth Token → `TWILIO_AUTH_TOKEN`
- [ ] Run `npm run twilio:setup` → paste `TWILIO_SIP_TRUNK_SID`
- [ ] **dashboard** Elastic SIP Trunking → your trunk → confirm:
  - [ ] Origination URI is `sip:<OPENAI_PROJECT_ID>@sip.api.openai.com;transport=tls`
  - [ ] Secure trunking (TLS + SRTP) is on
- [ ] **dashboard** Messaging → register a Messaging Service if you want better
      SMS deliverability → `TWILIO_MESSAGING_SERVICE_SID`
- [ ] **dashboard** Complete **A2P 10DLC registration** before sending SMS to US
      numbers. Unregistered traffic is filtered by carriers. This takes days —
      start early.
- [ ] **dashboard** Confirm your account is out of trial (trial accounts can
      only call verified numbers)

---

## 5. OpenAI

- [ ] **dashboard** Create a project at platform.openai.com
- [ ] **dashboard** Copy an API key → `OPENAI_API_KEY`
- [ ] **dashboard** Copy the **project id** → `OPENAI_PROJECT_ID`
- [ ] **dashboard** Settings → Webhooks → Add endpoint
  - [ ] URL `<origin>/api/webhooks/openai`
  - [ ] Enable event `realtime.call.incoming`
  - [ ] Copy the signing secret → `OPENAI_WEBHOOK_SECRET`
- [ ] **dashboard** Confirm the project has Realtime API access
- [ ] **dashboard** Set a monthly spend limit — a runaway loop on a phone line
      is expensive
- [ ] Confirm `OPENAI_REALTIME_MODEL` names a model your project can use

---

## 6. Google Calendar

- [ ] **dashboard** Google Cloud Console → create a project
- [ ] **dashboard** APIs & Services → Library → enable **Google Calendar API**
- [ ] **dashboard** OAuth consent screen
  - [ ] User type: External
  - [ ] App name, support email, developer contact
  - [ ] Scopes: `calendar.readonly`, `calendar.events`, `openid`, `email`
  - [ ] Add test users while the app is unverified
- [ ] **dashboard** Credentials → Create OAuth client ID → Web application
  - [ ] Authorised redirect URI `<origin>/api/integrations/google/callback`
  - [ ] Copy client id → `GOOGLE_CLIENT_ID`
  - [ ] Copy client secret → `GOOGLE_CLIENT_SECRET`
- [ ] Set `GOOGLE_REDIRECT_URI` to the same value
- [ ] **dashboard** Submit for verification before public launch — unverified
      apps are capped at 100 users and show a warning screen

---

## 7. Email

- [ ] Choose a provider (`EMAIL_PROVIDER=resend` is implemented; `console` just
      logs)
- [ ] Set `RESEND_API_KEY` and `EMAIL_FROM`
- [ ] **dashboard** Verify your sending domain (SPF, DKIM, DMARC) — without this
      your notifications land in spam

---

## 8. Voice worker

- [ ] Deploy the container (see DEPLOYMENT.md)
- [ ] Set on the worker: `OPENAI_API_KEY`, `VOICE_WORKER_SECRET`,
      `WEB_INTERNAL_URL`, `OPENAI_REALTIME_MODEL`, `PORT`
- [ ] Set on the web app: `VOICE_WORKER_URL` pointing at the deployed worker
- [ ] Confirm `VOICE_WORKER_SECRET` is **identical** on both
- [ ] `curl https://<worker>/health` returns `{"status":"ok"}`
- [ ] Confirm the web app can reach the worker (private networking is fine and
      preferable)

---

## 9. Scheduled maintenance

- [ ] Schedule `POST <origin>/api/cron/maintenance` every 5–15 minutes with
      header `Authorization: Bearer $CRON_SECRET`
- [ ] Confirm it returns `{"ok":true}` and not 403

This job expires abandoned founder reservations, finalises calls the worker
never closed, and purges expired OAuth state and upload tokens. **Without it,
abandoned checkouts hold Founding Member slots indefinitely.**

---

## 10. Go-live verification

Walk the whole path yourself before inviting anyone:

- [ ] Sign up with a real email; the verification link arrives and works
- [ ] Checkout completes and the subscription shows **active** in the dashboard
- [ ] The Stripe webhook shows a `200` for `checkout.session.completed`
- [ ] The founder counter decrements on the public pricing page
- [ ] Onboarding: business details save
- [ ] Onboarding: the training conversation creates real services and FAQs
- [ ] Onboarding: a voice preview actually plays audio
- [ ] Onboarding: a phone number is purchased and appears in Twilio, attached to
      the trunk
- [ ] Onboarding: Google Calendar connects and lists your calendars
- [ ] Onboarding: activation succeeds and the checklist is green
- [ ] **Call the AI number from your own phone.** It answers, knows your
      business, and sounds right
- [ ] Ask "are you a real person?" — it answers truthfully
- [ ] Ask for a price you did not configure — it refuses to invent one
- [ ] Give a ZIP outside your service area — it says so politely
- [ ] Book an appointment — it appears in Google Calendar and in Appointments
- [ ] The confirmation SMS arrives
- [ ] Ask for photos — the link arrives, uploads work, photos appear on the lead
- [ ] Ask for a human — the transfer connects
- [ ] After hanging up: the call, transcript, summary, lead and usage all appear
- [ ] `/admin` is reachable by an `ADMIN_EMAILS` address and **not** by anyone
      else
- [ ] `/api/health` reports `ok`

---

## 11. Before charging real money

- [ ] `DEMO_MODE=false` in production (it is force-disabled in production builds
      anyway, but set it correctly)
- [ ] Stripe switched to **live** keys and a live webhook secret
- [ ] Legal templates under `/legal` reviewed by a lawyer
- [ ] Privacy Policy lists your actual sub-processors by name
- [ ] Call recording and consent requirements reviewed for every state you
      operate in
- [ ] A2P 10DLC registration approved
- [ ] Google OAuth verification submitted
- [ ] Business registration, tax and sales-tax position sorted
- [ ] Uptime monitoring on `/api/health` and the worker's `/health`
- [ ] Error alerting wired to the `error_events` table or your log platform
- [ ] Database backups confirmed (Supabase → Database → Backups)
- [ ] A tested restore, not just a backup
