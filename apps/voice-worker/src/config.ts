/**
 * Voice worker configuration.
 *
 * The worker holds no database credentials and no provider secrets beyond the
 * OpenAI key it needs to open realtime sessions. Everything tenant-related goes
 * through the web app's internal API, authenticated with a shared secret. That
 * keeps all business logic and all tenant scoping in one place.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(
      `${name} is required by the voice worker. See .env.example and DEPLOYMENT.md.`,
    );
  }
  return value.trim();
}

function optional(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim() !== '' ? value.trim() : fallback;
}

export const config = {
  port: Number(optional('PORT', '8787')),
  /** Base URL of the Next.js app's internal API. */
  webInternalUrl: optional('WEB_INTERNAL_URL', 'http://localhost:3000').replace(/\/+$/, ''),
  get workerSecret() {
    return required('VOICE_WORKER_SECRET');
  },
  get openaiApiKey() {
    return required('OPENAI_API_KEY');
  },
  realtimeModel: optional('OPENAI_REALTIME_MODEL', 'gpt-realtime-2.1'),
  logLevel: optional('LOG_LEVEL', 'info'),
  /** Hard ceiling on a single call, as a runaway-cost backstop. */
  maxCallSeconds: Number(optional('MAX_CALL_SECONDS', '1800')),
  /** How long to wait for the caller before ending a silent call. */
  idleTimeoutSeconds: Number(optional('IDLE_TIMEOUT_SECONDS', '45')),
  /** Transcript batching interval. */
  transcriptFlushMs: Number(optional('TRANSCRIPT_FLUSH_MS', '3000')),
} as const;

export const REALTIME_BASE = 'wss://api.openai.com/v1/realtime';
export const REALTIME_REST = 'https://api.openai.com/v1/realtime';
