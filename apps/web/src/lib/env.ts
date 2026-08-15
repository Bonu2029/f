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

export const openaiEnv = {
  get apiKey() {
    return requireEnv('OPENAI_API_KEY', 'AI features');
  },
  get projectId() {
    return requireEnv('OPENAI_PROJECT_ID', 'SIP call routing');
  },
  get webhookSecret() {
    return requireEnv('OPENAI_WEBHOOK_SECRET', 'incoming call webhooks');
  },
  get realtimeModel() {
    return read('OPENAI_REALTIME_MODEL') ?? 'gpt-realtime-2.1';
  },
  get textModel() {
    return read('OPENAI_TEXT_MODEL') ?? 'gpt-5.1';
  },
  get ttsModel() {
    return read('OPENAI_TTS_MODEL') ?? 'gpt-4o-mini-tts';
  },
  get configured() {
    return Boolean(read('OPENAI_API_KEY'));
  },
  get sipUri() {
    return `sip:${this.projectId}@sip.api.openai.com;transport=tls`;
  },
};

export const twilioEnv = {
  get accountSid() {
    return requireEnv('TWILIO_ACCOUNT_SID', 'phone numbers and SMS');
  },
  get authToken() {
    return requireEnv('TWILIO_AUTH_TOKEN', 'phone numbers and SMS');
  },
  get sipTrunkSid() {
    return requireEnv('TWILIO_SIP_TRUNK_SID', 'routing calls to the AI');
  },
  get messagingServiceSid() {
    return read('TWILIO_MESSAGING_SERVICE_SID');
  },
  get configured() {
    return Boolean(read('TWILIO_ACCOUNT_SID') && read('TWILIO_AUTH_TOKEN'));
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

export const googleEnv = {
  get clientId() {
    return requireEnv('GOOGLE_CLIENT_ID', 'Google Calendar');
  },
  get clientSecret() {
    return requireEnv('GOOGLE_CLIENT_SECRET', 'Google Calendar');
  },
  get redirectUri() {
    return read('GOOGLE_REDIRECT_URI') ?? absoluteUrl('/api/integrations/google/callback');
  },
  get configured() {
    return Boolean(read('GOOGLE_CLIENT_ID') && read('GOOGLE_CLIENT_SECRET'));
  },
};

export const cryptoEnv = {
  get encryptionKey() {
    return requireEnv('APP_ENCRYPTION_KEY', 'encrypting stored OAuth tokens');
  },
  get uploadTokenSecret() {
    return requireEnv('UPLOAD_TOKEN_SECRET', 'secure photo upload links');
  },
};

export const workerEnv = {
  get url() {
    return read('VOICE_WORKER_URL') ?? 'http://localhost:8787';
  },
  get secret() {
    return requireEnv('VOICE_WORKER_SECRET', 'the voice worker connection');
  },
  get configured() {
    return Boolean(read('VOICE_WORKER_SECRET'));
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
    openai: openaiEnv.configured,
    twilio: twilioEnv.configured,
    stripe: stripeEnv.configured,
    google: googleEnv.configured,
    voiceWorker: workerEnv.configured,
    encryption: Boolean(read('APP_ENCRYPTION_KEY')),
  };
}
