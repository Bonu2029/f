import { config } from './config.js';

/**
 * Structured logging with secret redaction, matching the web app's format so
 * both services produce one coherent log stream.
 */

type Severity = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<Severity, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const threshold = LEVELS[config.logLevel as Severity] ?? 20;

const SECRET_KEY = /(authorization|api[_-]?key|secret|token|password|credential|signature|cookie)/i;
const SECRET_VALUE: RegExp[] = [
  /\bsk-[A-Za-z0-9_-]{12,}\b/g,
  /\bek_[A-Za-z0-9_-]{12,}\b/g,
  /\bey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
  /\b(?:\d[ -]*?){13,19}\b/g,
];

function scrub(value: string): string {
  return SECRET_VALUE.reduce((acc, pattern) => acc.replace(pattern, '[redacted]'), value);
}

function redact(value: unknown, depth = 0): unknown {
  if (depth > 5) return '[depth-limit]';
  if (value == null) return value;
  if (typeof value === 'string') return scrub(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Error) {
    return { name: value.name, message: scrub(value.message) };
  }
  if (Array.isArray(value)) return value.slice(0, 30).map((v) => redact(v, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SECRET_KEY.test(k) ? '[redacted]' : redact(v, depth + 1);
    }
    return out;
  }
  return String(value);
}

export interface LogContext {
  call_id?: string;
  organization_id?: string;
  openai_call_id?: string;
  event?: string;
  [key: string]: unknown;
}

function emit(severity: Severity, message: string, context: LogContext = {}) {
  if (LEVELS[severity] < threshold) return;
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    severity,
    service: 'voice-worker',
    message: scrub(message),
    ...(redact(context) as Record<string, unknown>),
  });
  if (severity === 'error') console.error(line);
  else if (severity === 'warn') console.warn(line);
  else console.log(line);
}

export const log = {
  debug: (m: string, c?: LogContext) => emit('debug', m, c),
  info: (m: string, c?: LogContext) => emit('info', m, c),
  warn: (m: string, c?: LogContext) => emit('warn', m, c),
  error: (m: string, c?: LogContext) => emit('error', m, c),
};
