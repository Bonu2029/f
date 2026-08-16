/**
 * Creates the Stripe product, prices and billing meter this app expects.
 *
 * Idempotent: everything is looked up by a stable lookup key or metadata tag
 * before being created, so running it twice does not create duplicates.
 *
 *   STRIPE_SECRET_KEY=sk_test_... npm run stripe:setup
 *
 * Prints the ids to paste into your environment.
 */
import Stripe from 'stripe';
import { loadEnvFiles } from './load-env';
import { PLANS } from '../packages/shared/src/plans.js';

loadEnvFiles();

const PRODUCT_TAG = 'ai_front_desk_receptionist';
const OVERAGE_METER_NAME = process.env.STRIPE_OVERAGE_METER_EVENT ?? 'ai_minutes_overage';

async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.error('STRIPE_SECRET_KEY is not set. Use a test key (sk_test_…) first.');
    process.exit(1);
  }
  if (key.startsWith('sk_live_')) {
    console.warn('⚠ Running against LIVE Stripe. Ctrl-C now if that was not intended.\n');
  }

  const stripe = new Stripe(key, { appInfo: { name: 'AI Front Desk setup', version: '1.0.0' } });

  /* ---- Product ---------------------------------------------------------- */
  const products = await stripe.products.search({ query: `metadata['app']:'${PRODUCT_TAG}'` });
  const product =
    products.data[0] ??
    (await stripe.products.create({
      name: 'AI Front Desk',
      description: 'AI receptionist that answers calls, captures leads and books appointments.',
      metadata: { app: PRODUCT_TAG },
    }));
  console.log(`Product:  ${product.id}${products.data[0] ? ' (existing)' : ' (created)'}`);

  /* ---- Billing meter for overage ---------------------------------------- */
  const meters = await stripe.billing.meters.list({ limit: 100 });
  const meter =
    meters.data.find((m) => m.event_name === OVERAGE_METER_NAME && m.status === 'active') ??
    (await stripe.billing.meters.create({
      display_name: 'AI minutes overage',
      event_name: OVERAGE_METER_NAME,
      default_aggregation: { formula: 'sum' },
      customer_mapping: { type: 'by_id', event_payload_key: 'stripe_customer_id' },
      value_settings: { event_payload_key: 'value' },
    }));
  console.log(`Meter:    ${meter.id} (event "${OVERAGE_METER_NAME}")`);

  /* ---- Recurring prices -------------------------------------------------- */
  const created: Record<string, string> = {};

  for (const plan of Object.values(PLANS)) {
    const lookupKey = `afd_${plan.id}_monthly`;
    const existing = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });

    const price =
      existing.data[0] ??
      (await stripe.prices.create({
        product: product.id,
        lookup_key: lookupKey,
        nickname: `${plan.name} — monthly`,
        unit_amount: plan.priceCents,
        currency: 'usd',
        recurring: { interval: 'month' },
        metadata: { plan: plan.id, included_minutes: String(plan.includedMinutes) },
      }));

    created[plan.id] = price.id;
    console.log(`Price:    ${plan.name.padEnd(18)} ${price.id}${existing.data[0] ? ' (existing)' : ' (created)'}`);
  }

  /* ---- Metered overage price -------------------------------------------- */
  const overageLookup = 'afd_overage_per_minute';
  const existingOverage = await stripe.prices.list({ lookup_keys: [overageLookup], limit: 1 });
  const overagePrice =
    existingOverage.data[0] ??
    (await stripe.prices.create({
      product: product.id,
      lookup_key: overageLookup,
      nickname: 'Additional AI minutes',
      currency: 'usd',
      recurring: { interval: 'month', usage_type: 'metered', meter: meter.id },
      billing_scheme: 'per_unit',
      unit_amount: PLANS.standard.overageCentsPerMinute,
      metadata: { kind: 'overage' },
    }));
  console.log(
    `Price:    ${'Overage / minute'.padEnd(18)} ${overagePrice.id}${existingOverage.data[0] ? ' (existing)' : ' (created)'}`,
  );

  console.log(`
─────────────────────────────────────────────────────────────
Add these to your environment:

STRIPE_FOUNDER_PRICE_ID=${created.founder}
STRIPE_STANDARD_PRICE_ID=${created.standard}
STRIPE_OVERAGE_PRICE_ID=${overagePrice.id}
STRIPE_OVERAGE_METER_EVENT=${OVERAGE_METER_NAME}

Still to do in the Stripe dashboard (cannot be scripted):
  1. Developers → Webhooks → add endpoint
     URL:    https://YOUR_DOMAIN/api/webhooks/stripe
     Events: checkout.session.completed, checkout.session.expired,
             customer.subscription.created, customer.subscription.updated,
             customer.subscription.deleted, invoice.paid,
             invoice.payment_failed
     Copy the signing secret into STRIPE_WEBHOOK_SECRET.

  2. Settings → Billing → Customer portal → activate it, and allow
     customers to update payment methods, view invoices and cancel.
─────────────────────────────────────────────────────────────`);
}

main().catch((err) => {
  console.error('\nStripe setup failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
