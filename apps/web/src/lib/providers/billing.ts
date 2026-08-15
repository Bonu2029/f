import 'server-only';
import Stripe from 'stripe';
import { DEMO_MODE, stripeEnv, absoluteUrl } from '@/lib/env';
import { errors } from '@/lib/errors';
import { log } from '@/lib/logger';
import type {
  BillingProvider,
  CheckoutSessionInput,
  CheckoutSessionResult,
  PortalSessionResult,
} from './types';

let stripeClient: Stripe | null = null;

/** Shared Stripe client. Uses the SDK's pinned API version. */
export function stripe(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(stripeEnv.secretKey, {
      appInfo: { name: 'AI Front Desk', version: '1.0.0' },
      maxNetworkRetries: 2,
      timeout: 20_000,
    });
  }
  return stripeClient;
}

class StripeBillingProvider implements BillingProvider {
  readonly name = 'stripe';
  readonly isMock = false;

  /**
   * Creates a Checkout Session for a subscription.
   *
   * The founder slot and organisation id travel in `metadata` and
   * `subscription_data.metadata` so the webhook — which is the authoritative
   * activation path — can reconcile without trusting the browser redirect.
   */
  async createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult> {
    try {
      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
        { price: input.priceId, quantity: 1 },
      ];
      // Metered overage is a second subscription item with no quantity.
      if (input.overagePriceId) lineItems.push({ price: input.overagePriceId });

      const metadata: Record<string, string> = {
        organization_id: input.organizationId,
        user_id: input.userId,
        plan: input.planId,
        ...(input.founderSlot ? { founder_slot: String(input.founderSlot) } : {}),
      };

      const session = await stripe().checkout.sessions.create(
        {
          mode: 'subscription',
          line_items: lineItems,
          success_url: input.successUrl,
          cancel_url: input.cancelUrl,
          client_reference_id: input.organizationId,
          ...(input.existingCustomerId
            ? { customer: input.existingCustomerId }
            : { customer_email: input.email }),
          allow_promotion_codes: false,
          billing_address_collection: 'auto',
          metadata,
          subscription_data: { metadata },
          // Stripe expires the session, which is what releases an abandoned
          // founder reservation back into inventory.
          expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
        },
        // Idempotent per organisation+plan attempt window.
        { idempotencyKey: `checkout:${input.organizationId}:${input.planId}:${Math.floor(Date.now() / 60000)}` },
      );

      if (!session.url) throw new Error('Stripe returned a session without a URL');
      return {
        id: session.id,
        url: session.url,
        customerId: typeof session.customer === 'string' ? session.customer : null,
      };
    } catch (err) {
      log.error('stripe checkout failed', { provider: 'stripe', error: err });
      throw errors.providerUnavailable('Stripe');
    }
  }

  async createPortalSession(customerId: string, returnUrl: string): Promise<PortalSessionResult> {
    try {
      const session = await stripe().billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });
      return { url: session.url };
    } catch (err) {
      log.error('stripe portal failed', { provider: 'stripe', error: err });
      throw errors.providerUnavailable('Stripe');
    }
  }

  /**
   * Reports overage minutes to the Stripe billing meter.
   * `identifier` makes the event idempotent so a retry cannot double-charge.
   */
  async reportUsage(input: {
    customerId: string;
    quantity: number;
    identifier: string;
    timestamp?: Date;
  }): Promise<void> {
    if (input.quantity <= 0) return;
    try {
      await stripe().billing.meterEvents.create({
        event_name: stripeEnv.overageMeterEvent,
        identifier: input.identifier,
        timestamp: Math.floor((input.timestamp ?? new Date()).getTime() / 1000),
        payload: {
          stripe_customer_id: input.customerId,
          value: String(input.quantity),
        },
      });
    } catch (err) {
      // A duplicate identifier means we already reported this usage.
      if (err instanceof Stripe.errors.StripeError && /already exists|duplicate/i.test(err.message)) {
        log.info('stripe meter event already recorded', { provider: 'stripe', identifier: input.identifier });
        return;
      }
      log.error('stripe usage report failed', { provider: 'stripe', error: err });
      throw errors.providerUnavailable('Stripe usage reporting');
    }
  }

  async listInvoices(customerId: string, limit = 12) {
    try {
      const res = await stripe().invoices.list({ customer: customerId, limit });
      return res.data.map((i) => ({
        id: i.id ?? '',
        number: i.number ?? null,
        amountPaid: i.amount_paid,
        currency: i.currency,
        status: i.status ?? null,
        created: i.created,
        hostedUrl: i.hosted_invoice_url ?? null,
        pdfUrl: i.invoice_pdf ?? null,
      }));
    } catch (err) {
      log.error('stripe invoice list failed', { provider: 'stripe', error: err });
      throw errors.providerUnavailable('Stripe');
    }
  }

  async cancelSubscription(subscriptionId: string, atPeriodEnd: boolean): Promise<void> {
    try {
      if (atPeriodEnd) {
        await stripe().subscriptions.update(subscriptionId, { cancel_at_period_end: true });
      } else {
        await stripe().subscriptions.cancel(subscriptionId);
      }
    } catch (err) {
      log.error('stripe cancel failed', { provider: 'stripe', error: err });
      throw errors.providerUnavailable('Stripe');
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Mock                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Demo billing. Instead of pretending a payment succeeded, it redirects to a
 * local page that explains no charge was made and then completes the same
 * activation path the real webhook uses — so the rest of the product behaves
 * identically without inventing a Stripe response.
 */
class MockBillingProvider implements BillingProvider {
  readonly name = 'mock-billing';
  readonly isMock = true;

  async createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult> {
    const id = `cs_demo_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
    const url = absoluteUrl(
      `/api/billing/demo-complete?session=${id}&org=${encodeURIComponent(input.organizationId)}&plan=${input.planId}`,
    );
    log.info('[demo] checkout session simulated — no payment taken', {
      provider: 'mock-billing',
      organization_id: input.organizationId,
      plan: input.planId,
    });
    return { id, url, customerId: `cus_demo_${input.organizationId.slice(0, 8)}` };
  }

  async createPortalSession(): Promise<PortalSessionResult> {
    return { url: absoluteUrl('/dashboard/billing?demo_portal=1') };
  }

  async reportUsage(input: { customerId: string; quantity: number; identifier: string }) {
    log.info('[demo] usage not reported to Stripe', {
      provider: 'mock-billing',
      quantity: input.quantity,
      identifier: input.identifier,
    });
  }

  async listInvoices() {
    return [];
  }

  async cancelSubscription() {
    /* nothing to cancel in demo mode */
  }
}

/* -------------------------------------------------------------------------- */

let cached: BillingProvider | null = null;

export function getBillingProvider(): BillingProvider {
  if (cached) return cached;
  cached = DEMO_MODE || !stripeEnv.configured ? new MockBillingProvider() : new StripeBillingProvider();
  return cached;
}

export function __setBillingProviderForTests(p: BillingProvider | null) {
  cached = p;
}

export { StripeBillingProvider, MockBillingProvider };
