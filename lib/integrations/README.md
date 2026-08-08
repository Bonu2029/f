# Integrations

Every external service sits behind a small adapter in this folder. Pages and
components import the adapter, never a vendor SDK directly, so a provider can be
swapped without touching the UI.

## Rules

1. **Server-side only.** Adapters run in Server Actions or Route Handlers.
   Nothing in `app/` or `components/` should import a vendor SDK.
2. **No keys in the client.** Only variables prefixed `NEXT_PUBLIC_` reach the
   browser, and no secret ever gets that prefix. See `.env.example`.
3. **Fail visibly, not silently.** An adapter returns a typed result; the UI
   renders the error state rather than pretending the call succeeded.
4. **Card data never touches our servers.** Payment uses the provider's hosted
   fields, so the booking flow collects an intent reference, not a card number.

## Planned adapters

| File | Responsibility | Candidate provider |
| --- | --- | --- |
| `db.ts` | Customers, homes, plans, appointments, services, add-ons, reports | Supabase (Postgres + RLS) |
| `auth.ts` | Sign-in, sessions, account recovery | Supabase Auth |
| `payments.ts` | Deposits, final charges, membership subscriptions | Stripe |
| `email.ts` | Confirmations, reports, plan-by-email, newsletter | Resend / Postmark |
| `sms.ts` | Arrival updates, short-notice changes | Twilio |
| `storage.ts` | Approved photo uploads, signed URLs, deletion jobs | Supabase Storage / S3 |

## Data model sketch

```
customer      → id, name, email, phone, communication_preference
home          → id, customer_id, nickname, type, bedrooms, bathrooms, sq_ft
home_detail   → home_id, surfaces[], flooring[], appliance_notes, fragile_notes
access        → home_id, entry_method, parking, alarm_process, secrets_ref
pet           → id, home_id, type, name, temperament, escape_risk, restrictions
preference    → home_id, products, avoid_ingredients, quiet_clean, photo_permission
zone          → home_id, room, kind ('do_not_disturb' | 'priority')
plan          → id, home_id, rooms[], room_priorities, add_ons[], frequency, mode
appointment   → id, plan_id, service, date, arrival_window, status, price_lines
report        → appointment_id, completed_at, checklist, notes, incomplete[], photos[]
membership    → customer_id, tier, cadence, billing_ref, status
```

`secrets_ref` is a pointer into an encrypted store — alarm and lockbox codes are
never written into an ordinary notes column, and the UI reflects that by
collecting them separately from free-text access notes.

## Current state

The site runs entirely without these adapters. Plans and profiles persist to
`localStorage` through `lib/storage.ts`, and the booking flow simulates its round
trip. `lib/storage.ts` is the seam: replacing it with account-backed calls is the
first step of connecting the backend.
