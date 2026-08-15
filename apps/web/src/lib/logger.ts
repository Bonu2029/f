import 'server-only';

/**
 * Structured server logging with automatic secret redaction.
 *
 * Every line is a single JSON object so it can be ingested by any log platform.
 * Values that look like credentials, tokens or card numbers are replaced before
 * serialisation — this is a belt-and-braces control, not a licence to log
 * secrets deliberately.
 */

export type Severity = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<Severity, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const threshold = LEVELS[(process.env.LOG_LEVEL as Severity) ?? 'info'] ?? 20;

/** Keys whose values are always replaced with `[redacted]`. */
const SECRET_KEY_PATTERN =
  /(authorization|api[_-]?key|secret|token|password|passwd|credential|signature|cookie|refresh_token|access_token|client_secret|card|cvv|cvc|iban|ssn)/i;

/**
 * Value patterns for credentials that are recognisable on sight.
 *
 * A Vapi key is a bare UUID, indistinguishable from an organisation id, so it
 * cannot be caught here without redacting every identifier and making the logs
 * useless. It is caught by SECRET_KEY_PATTERN instead — which is why nothing in
 * this codebase ever puts a provider key in a log field not named for a secret.
 */
const SECRET_VALUE_PATTERNS: RegExp[] = [
  /\bsk-[A-Za-z0-9_-]{12,}\b/g, // OpenAI
  /\b(sk|pk|rk)_(live|test)_[A-Za-z0-9]{10,}\b/g, // Stripe
  /\bwhsec_[A-Za-z0-9+/=_-]{10,}\b/g, // webhook secrets
  /\bey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, // JWTs
  /\b(?:\d[ -]*?){13,19}\b/g, // card-like number runs
];

function redactString(value: string): string {
  let out = value;
  for (const p of SECRET_VALUE_PATTERNS) out = out.replace(p, '[redacted]');
  return out;
}

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 6) return '[depth-limit]';
  if (value == null) return value;
  if (typeof value === 'string') return redactString(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Error) {
    return { name: value.name, message: redactString(value.message), stack: value.stack?.split('\n').slice(0, 6).join('\n') };
  }
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => redact(v, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SECRET_KEY_PATTERN.test(k) ? '[redacted]' : redact(v, depth + 1);
    }
    return out;
  }
  return String(value);
}

export interface LogContext {
  request_id?: string;
  organization_id?: string;
  user_id?: string;
  call_id?: string;
  provider?: string;
  event?: string;
  [key: string]: unknown;
}

function emit(severity: Severity, message: string, context: LogContext = {}) {
  if (LEVELS[severity] < threshold) return;
  const line = {
    ts: new Date().toISOString(),
    severity,
    message: redactString(message),
    ...(redact(context) as Record<string, unknown>),
  };
  const serialised = JSON.stringify(line);
  if (severity === 'error') console.error(serialised);
  else if (severity === 'warn') console.warn(serialised);
  else console.log(serialised);
}

export const log = {
  debug: (message: string, context?: LogContext) => emit('debug', message, context),
  info: (message: string, context?: LogContext) => emit('info', message, context),
  warn: (message: string, context?: LogContext) => emit('warn', message, context),
  error: (message: string, context?: LogContext) => emit('error', message, context),
};

/** Creates a logger with a fixed context (request id, org id, …). */
export function childLogger(base: LogContext) {
  return {
    debug: (m: string, c?: LogContext) => emit('debug', m, { ...base, ...c }),
    info: (m: string, c?: LogContext) => emit('info', m, { ...base, ...c }),
    warn: (m: string, c?: LogContext) => emit('warn', m, { ...base, ...c }),
    error: (m: string, c?: LogContext) => emit('error', m, { ...base, ...c }),
  };
}

export function newRequestId(): string {
  return crypto.randomUUID();
}
