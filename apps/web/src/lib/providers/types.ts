import 'server-only';

/**
 * Provider interfaces.
 *
 * Every external dependency sits behind one of these. Each has a real adapter
 * (used whenever credentials are present) and a development adapter (used only
 * when DEMO_MODE=true). Application code never branches on which one is active —
 * `getVapiProvider()` and friends resolve it once.
 *
 * Voice and telephony live in `./vapi`, which declares its own interface because
 * it is the one provider with a bespoke shape.
 */

/* -------------------------------------------------------------------------- */
/* Calendar                                                                   */
/* -------------------------------------------------------------------------- */

export interface CalendarBusySpan {
  start: string;
  end: string;
}

export interface CalendarEventInput {
  summary: string;
  description?: string;
  location?: string;
  startISO: string;
  endISO: string;
  timeZone: string;
  attendeeEmail?: string | null;
  /** Stable key so a retried booking cannot create two events. */
  idempotencyKey: string;
}

export interface CalendarEventResult {
  externalId: string;
  htmlLink: string | null;
}

export interface CalendarListEntry {
  id: string;
  summary: string;
  primary: boolean;
  timeZone: string | null;
}

export interface CalendarProvider {
  readonly name: string;
  readonly isMock: boolean;
  listCalendars(organizationId: string): Promise<CalendarListEntry[]>;
  getBusy(organizationId: string, fromISO: string, toISO: string): Promise<CalendarBusySpan[]>;
  createEvent(organizationId: string, event: CalendarEventInput): Promise<CalendarEventResult>;
  cancelEvent(organizationId: string, externalId: string): Promise<void>;
  rescheduleEvent(
    organizationId: string,
    externalId: string,
    startISO: string,
    endISO: string,
  ): Promise<CalendarEventResult>;
}

/* -------------------------------------------------------------------------- */
/* Billing                                                                    */
/* -------------------------------------------------------------------------- */

export interface CheckoutSessionInput {
  organizationId: string;
  userId: string;
  email: string;
  planId: 'founder' | 'standard';
  priceId: string;
  overagePriceId?: string | null;
  successUrl: string;
  cancelUrl: string;
  existingCustomerId?: string | null;
  /** Founder slot reserved for this checkout, recorded on the session. */
  founderSlot?: number | null;
}

export interface CheckoutSessionResult {
  id: string;
  url: string;
  customerId: string | null;
}

export interface PortalSessionResult {
  url: string;
}

export interface BillingProvider {
  readonly name: string;
  readonly isMock: boolean;
  createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult>;
  createPortalSession(customerId: string, returnUrl: string): Promise<PortalSessionResult>;
  /** Reports overage minutes to the usage meter. */
  reportUsage(input: {
    customerId: string;
    quantity: number;
    identifier: string;
    timestamp?: Date;
  }): Promise<void>;
  listInvoices(customerId: string, limit?: number): Promise<
    Array<{
      id: string;
      number: string | null;
      amountPaid: number;
      currency: string;
      status: string | null;
      created: number;
      hostedUrl: string | null;
      pdfUrl: string | null;
    }>
  >;
  cancelSubscription(subscriptionId: string, atPeriodEnd: boolean): Promise<void>;
}

/* -------------------------------------------------------------------------- */
/* Email                                                                      */
/* -------------------------------------------------------------------------- */

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailProvider {
  readonly name: string;
  readonly isMock: boolean;
  send(message: EmailMessage): Promise<{ id: string }>;
}
