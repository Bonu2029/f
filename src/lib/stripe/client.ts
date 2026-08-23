import "server-only";
import Stripe from "stripe";

/**
 * Stripe is optional at build time so the app can run before keys exist.
 * Every caller goes through `getStripe()` and handles null.
 */
export function getStripe(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;

  return new Stripe(secretKey, {
    appInfo: { name: "ServiceTag" },
  });
}

export const isStripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);
