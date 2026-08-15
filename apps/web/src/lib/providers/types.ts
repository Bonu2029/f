import 'server-only';

/**
 * Provider interfaces.
 *
 * Every external dependency sits behind one of these. Each has a real adapter
 * (used whenever credentials are present) and a mock adapter (used only when
 * DEMO_MODE=true). The application code never branches on which one is active —
 * `getTelephonyProvider()` and friends resolve it once.
 */

/* -------------------------------------------------------------------------- */
/* Telephony                                                                  */
/* -------------------------------------------------------------------------- */

export interface AvailableNumber {
  phoneNumber: string;
  friendlyName: string;
  locality: string | null;
  region: string | null;
  postalCode: string | null;
  capabilities: { voice: boolean; sms: boolean; mms: boolean };
}

export interface ProvisionedNumber {
  sid: string;
  phoneNumber: string;
  capabilities: { voice: boolean; sms: boolean; mms: boolean };
}

export interface SearchNumbersInput {
  areaCode?: string | null;
  contains?: string | null;
  country?: string;
  limit?: number;
}

export interface SendSmsInput {
  to: string;
  from: string;
  body: string;
  statusCallbackUrl?: string;
}

export interface SendSmsResult {
  sid: string;
  status: string;
}

export interface TelephonyProvider {
  readonly name: string;
  readonly isMock: boolean;
  searchAvailableNumbers(input: SearchNumbersInput): Promise<AvailableNumber[]>;
  purchaseNumber(phoneNumber: string, friendlyName: string): Promise<ProvisionedNumber>;
  releaseNumber(sid: string): Promise<void>;
  /** Points a purchased number at the SIP trunk that reaches OpenAI Realtime. */
  attachToSipTrunk(sid: string, trunkSid: string): Promise<void>;
  sendSms(input: SendSmsInput): Promise<SendSmsResult>;
  /** Verifies an inbound webhook actually came from the provider. */
  verifyWebhook(signature: string | null, url: string, params: Record<string, string>): boolean;
}

/* -------------------------------------------------------------------------- */
/* AI                                                                         */
/* -------------------------------------------------------------------------- */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface TrainingTurnResult {
  reply: string;
  /** Structured knowledge the assistant extracted from the owner's message. */
  extracted: ExtractedKnowledge;
}

export interface ExtractedKnowledge {
  services?: Array<{
    name: string;
    description?: string | null;
    price_type?: 'fixed' | 'starting_at' | 'range' | 'quote_only' | 'hourly';
    starting_price?: number | null;
    exact_price?: number | null;
    max_price?: number | null;
    price_notes?: string | null;
    estimated_duration?: number | null;
  }>;
  faqs?: Array<{ question: string; answer: string }>;
  policies?: Array<{ kind: string; title: string; body: string }>;
  service_areas?: Array<{
    type: 'city' | 'postal_code' | 'state' | 'radius';
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    center_postal_code?: string | null;
    radius_miles?: number | null;
  }>;
  rules?: Array<{ title: string; instruction: string }>;
  business?: {
    business_description?: string | null;
    emergency_information?: string | null;
    business_hours?: Array<{ weekday: number; closed: boolean; open: string; close: string }>;
  };
}

export interface CallSummaryResult {
  summary: string;
  structured: {
    reason: string;
    customer_name: string | null;
    location: string | null;
    service: string | null;
    result: string;
    appointment: string | null;
    notes: string | null;
    follow_up_required: boolean;
  };
  disposition: string;
  call_tone: string | null;
}

export interface AIProvider {
  readonly name: string;
  readonly isMock: boolean;
  /** One turn of the "Teach Your AI" conversation. */
  trainingTurn(input: {
    businessName: string;
    industry: string | null;
    history: ChatMessage[];
    message: string;
  }): Promise<TrainingTurnResult>;
  /** Post-call structured summary. */
  summarizeCall(input: {
    businessName: string;
    transcript: Array<{ role: string; text: string }>;
    appointmentBooked: boolean;
    transferred: boolean;
    leadCaptured: boolean;
  }): Promise<CallSummaryResult>;
  /** Turns scraped website text into suggested business information. */
  extractFromWebsite(input: { url: string; text: string }): Promise<ExtractedKnowledge & {
    display_name?: string | null;
    industry?: string | null;
    public_phone?: string | null;
    email?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
  }>;
  /** Generates a short audio sample of a voice. Returns raw audio bytes. */
  synthesizeVoiceSample(input: { voice: string; text: string }): Promise<{ audio: Buffer; mimeType: string }>;
  /** Mints a short-lived client credential for the browser test mode. */
  createRealtimeClientSecret(input: {
    model: string;
    voice: string;
    instructions: string;
  }): Promise<{ value: string; expiresAt: number }>;
}

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
