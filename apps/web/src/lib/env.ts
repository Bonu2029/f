import 'server-only';

/**
 * Typed, validated access to server environment variables.
 *
 * Nothing in this module may be imported from a client component — the
 * `server-only` import makes that a build error rather than a silent leak.
 *
 * Access is lazy: a missing credential throws when the feature that needs it is
 * used, not at boot. That is what lets the app run in DEMO_MODE with mock
 * adapters while the real adapters stay compiled and ready.
 */

export class MissingEnvError extends Error {
  constructor(
    readonly variable: string,
    readonly feature: string,
  ) {
    super(
      `${variable} is not configured, so ${feature} is unavailable. Add it to your environment (see .env.example) or enable DEMO_MODE=true for local development.`,
    );
    this.name = 'MissingEnvError';
  }
}

function read(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() !== '' ? v.trim() : undefined;
}

export function requireEnv(name: string, feature: string): string {
  const v = read(name);
  if (!v) throw new MissingEnvError(name, feature);
  return v;
}

export function optionalEnv(name: string): string | undefined {
  return read(name);
}

export const isProduction = process.env.NODE_ENV === 'production';
export const isTest = process.env.NODE_ENV === 'test';

/**
 * DEMO_MODE swaps every external provider for a mock adapter. It is force-
 * disabled in production builds so a misconfigured deploy cannot silently stop
 * charging customers or stop making real phone calls.
 */
export const DEMO_MODE = (() => {
  const raw = (read('DEMO_MODE') ?? 'false').toLowerCase();
  const requested = raw === 'true' || raw === '1';
  if (requested && isProduction) {
    console.warn('[env] DEMO_MODE requested in production build — ignoring.');
    return false;
  }
  return requested;
})();

export const appUrl = (() => {
  const v = read('NEXT_PUBLIC_APP_URL') ?? 'http://localhost:3000';
  return v.replace(/\/+$/, '');
})();

export function absoluteUrl(path: string): string {
  return `${appUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

/* -------------------------------------------------------------------------- */
/* Grouped accessors — each throws only when actually used                     */
/* -------------------------------------------------------------------------- */

export const supabaseEnv = {
  get url() {
    return requireEnv('NEXT_PUBLIC_SUPABASE_URL', 'the database');
  },
  get anonKey() {
    return requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'the database');
  },
  get serviceRoleKey() {
    return requireEnv('SUPABASE_SERVICE_ROLE_KEY', 'privileged server operations');
  },
  get configured() {
    return Boolean(read('NEXT_PUBLIC_SUPABASE_URL') && read('NEXT_PUBLIC_SUPABASE_ANON_KEY'));
  },
};

export const vapiEnv = {
  /**
   * Private Vapi API key. Server-only — this module imports `server-only`, so a
   * client component that reaches for it fails the build rather than shipping
   * the key to the browser.
   */
  get apiKey() {
    return requireEnv('VAPI_API_KEY', 'the AI receptionist');
  },
  /**
   * Shared secret set on each assistant and echoed back by Vapi in the
   * `x-vapi-secret` header, so the webhook can prove a call report is genuine.
   */
  get webhookSecret() {
    return requireEnv('VAPI_WEBHOOK_SECRET', 'verifying call reports from Vapi');
  },
  /**
   * Non-throwing variant used when building an assistant payload in demo mode,
   * where no real secret exists and none is needed.
   */
  get webhookSecretOrPlaceholder() {
    return read('VAPI_WEBHOOK_SECRET') ?? 'demo-mode-no-secret';
  },
  /** OpenAI model Vapi drives for the conversation. */
  get openaiModel() {
    return read('VAPI_OPENAI_MODEL') ?? 'gpt-4o';
  },
  get configured() {
    return Boolean(read('VAPI_API_KEY'));
  },
};

export const stripeEnv = {
  get secretKey() {
    return requireEnv('STRIPE_SECRET_KEY', 'billing');
  },
  get webhookSecret() {
    return requireEnv('STRIPE_WEBHOOK_SECRET', 'billing webhooks');
  },
  get founderPriceId() {
    return requireEnv('STRIPE_FOUNDER_PRICE_ID', 'Founding Member checkout');
  },
  get standardPriceId() {
    return requireEnv('STRIPE_STANDARD_PRICE_ID', 'checkout');
  },
  get overagePriceId() {
    return read('STRIPE_OVERAGE_PRICE_ID');
  },
  get overageMeterEvent() {
    return read('STRIPE_OVERAGE_METER_EVENT') ?? 'ai_minutes_overage';
  },
  get configured() {
    return Boolean(read('STRIPE_SECRET_KEY'));
  },
};

export const cryptoEnv = {
  get encryptionKey() {
    return requireEnv('APP_ENCRYPTION_KEY', 'hashing invitation tokens');
  },
};

export const adminEnv = {
  get emails(): string[] {
    return (read('ADMIN_EMAILS') ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
  },
  isAdmin(email: string | null | undefined): boolean {
    if (!email) return false;
    return this.emails.includes(email.toLowerCase());
  },
};

export const cronSecret = () => read('CRON_SECRET');

export const emailEnv = {
  get provider() {
    return (read('EMAIL_PROVIDER') ?? 'console').toLowerCase();
  },
  get from() {
    return read('EMAIL_FROM') ?? 'AI Front Desk <no-reply@example.com>';
  },
  get resendApiKey() {
    return read('RESEND_API_KEY');
  },
};

/** Snapshot of which integrations are wired up. Used by the admin health page. */
export function integrationStatus() {
  return {
    demoMode: DEMO_MODE,
    supabase: supabaseEnv.configured,
    vapi: vapiEnv.configured,
    stripe: stripeEnv.configured,
    encryption: Boolean(read('APP_ENCRYPTION_KEY')),
  };
}
