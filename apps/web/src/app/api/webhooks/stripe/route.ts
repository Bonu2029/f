import { NextResponse, type NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { getServiceSupabase } from '@/lib/supabase/server';
import { stripe } from '@/lib/providers/billing';
import { stripeEnv } from '@/lib/env';
import { childLogger, newRequestId } from '@/lib/logger';
import { recordErrorEvent } from '@/lib/audit';
import { sha256Hex } from '@/lib/crypto';
import {
  handleInvoicePaid,
  handleInvoicePaymentFailed,
  handleSubscriptionDeleted,
  resolveOrganizationId,
  syncSubscription,
} from '@/server/subscription-sync';
import { releaseFounderReservation } from '@/server/founder';

export const runtime = 'nodejs';
// The raw body is required for signature verification, so this must never be
// statically optimised or have its body parsed for us.
export const dynamic = 'force-dynamic';

/**
 * Stripe webhook — the authoritative source of subscription state.
 *
 * Guarantees:
 *   1. Signature verified before anything is read.
 *   2. Every event is claimed in `webhook_events` first; a duplicate delivery
 *      returns 200 without reprocessing.
 *   3. A processing failure returns 500 so Stripe retries, and the event is
 *      marked failed so it can be inspected in the admin panel.
 */
export async function POST(request: NextRequest) {
  const requestId = newRequestId();
  const logger = childLogger({ request_id: requestId, provider: 'stripe', event: 'webhook.stripe' });

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: { message: 'Missing stripe-signature header' } }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(rawBody, signature, stripeEnv.webhookSecret);
  } catch (err) {
    logger.warn('signature verification failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: { message: 'Invalid signature' } }, { status: 400 });
  }

  const svc = getServiceSupabase();

  // Idempotency gate.
  const { data: claimed, error: claimError } = await svc.rpc('claim_webhook_event', {
    p_provider: 'stripe',
    p_event_id: event.id,
    p_event_type: event.type,
    p_digest: sha256Hex(rawBody),
  });

  if (claimError) {
    logger.error('could not claim webhook event', { error: claimError.message });
    return NextResponse.json({ error: { message: 'Storage unavailable' } }, { status: 500 });
  }
  if (claimed === false) {
    logger.info('duplicate delivery ignored', { stripe_event_id: event.id, type: event.type });
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    await handleEvent(event, logger);
    await svc.rpc('complete_webhook_event', {
      p_provider: 'stripe',
      p_event_id: event.id,
      p_status: 'processed',
    });
    return NextResponse.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await svc.rpc('complete_webhook_event', {
      p_provider: 'stripe',
      p_event_id: event.id,
      p_status: 'failed',
      p_error: message.slice(0, 500),
    });
    await recordErrorEvent({
      scope: 'webhook.stripe',
      message: `Failed processing ${event.type}: ${message}`,
      requestId,
      metadata: { stripe_event_id: event.id, type: event.type },
    });
    logger.error('processing failed', { type: event.type, error: message });
    // 500 so Stripe retries with backoff.
    return NextResponse.json({ error: { message: 'Processing failed' } }, { status: 500 });
  }
}

async function handleEvent(event: Stripe.Event, logger: ReturnType<typeof childLogger>) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const organizationId = await resolveOrganizationId({
        metadata: session.metadata,
        customerId: typeof session.customer === 'string' ? session.customer : null,
        clientReferenceId: session.client_reference_id,
      });

      if (session.subscription) {
        const subscriptionId =
          typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
        // Re-fetch so we act on the authoritative object, not the snapshot.
        const subscription = await stripe().subscriptions.retrieve(subscriptionId);
        await syncSubscription(subscription, organizationId);
      }
      logger.info('checkout completed', { organization_id: organizationId ?? undefined });
      break;
    }

    case 'checkout.session.expired': {
      const session = event.data.object as Stripe.Checkout.Session;
      const organizationId = await resolveOrganizationId({
        metadata: session.metadata,
        customerId: typeof session.customer === 'string' ? session.customer : null,
        clientReferenceId: session.client_reference_id,
      });
      // Abandoned checkout returns the reserved founder slot to inventory.
      if (organizationId) await releaseFounderReservation(organizationId);
      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.resumed':
    case 'customer.subscription.paused':
      await syncSubscription(event.data.object as Stripe.Subscription);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;

    case 'invoice.paid':
    case 'invoice.payment_succeeded':
      await handleInvoicePaid(event.data.object as Stripe.Invoice);
      break;

    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;

    default:
      logger.debug('unhandled event type', { type: event.type });
  }
}
