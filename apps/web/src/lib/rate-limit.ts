import 'server-only';
import { errors } from '@/lib/errors';

/**
 * Fixed-window rate limiting.
 *
 * The default store is in-process, which is correct for a single instance and
 * degrades gracefully across several (each instance enforces its own share).
 * For a multi-instance production deployment, swap `store` for a Redis-backed
 * implementation of the same interface — see DEPLOYMENT.md.
 */

export interface RateLimitStore {
  hit(key: string, windowMs: number): Promise<{ count: number; resetAt: number }>;
}

class MemoryStore implements RateLimitStore {
  private readonly buckets = new Map<string, { count: number; resetAt: number }>();
  private lastSweep = Date.now();

  async hit(key: string, windowMs: number) {
    const now = Date.now();
    if (now - this.lastSweep > 60_000) {
      for (const [k, v] of this.buckets) if (v.resetAt <= now) this.buckets.delete(k);
      this.lastSweep = now;
    }
    const existing = this.buckets.get(key);
    if (!existing || existing.resetAt <= now) {
      const fresh = { count: 1, resetAt: now + windowMs };
      this.buckets.set(key, fresh);
      return fresh;
    }
    existing.count += 1;
    return existing;
  }
}

let store: RateLimitStore = new MemoryStore();

export function setRateLimitStore(next: RateLimitStore) {
  store = next;
}

export interface RateLimitRule {
  /** Requests allowed per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

/** Tuned per surface: auth is strict, dashboard reads are loose. */
export const RATE_LIMITS = {
  login: { limit: 8, windowMs: 5 * 60_000 },
  signup: { limit: 5, windowMs: 60 * 60_000 },
  passwordReset: { limit: 5, windowMs: 60 * 60_000 },
  checkout: { limit: 10, windowMs: 10 * 60_000 },
  /** Manual "Update receptionist" — each one is a write to Vapi. */
  vapi_sync: { limit: 20, windowMs: 10 * 60_000 },
  /** Provisioning buys a real number, so this is deliberately tight. */
  phonePurchase: { limit: 5, windowMs: 60 * 60_000 },
  api: { limit: 120, windowMs: 60_000 },
  webhook: { limit: 600, windowMs: 60_000 },
} as const satisfies Record<string, RateLimitRule>;

export type RateLimitName = keyof typeof RATE_LIMITS;

/**
 * Consumes one token. Throws `AppError('rate_limited')` when exhausted so route
 * handlers get a correct 429 with Retry-After without extra code.
 */
export async function enforceRateLimit(name: RateLimitName, identifier: string): Promise<void> {
  const rule = RATE_LIMITS[name];
  const { count, resetAt } = await store.hit(`${name}:${identifier}`, rule.windowMs);
  if (count > rule.limit) {
    throw errors.rateLimited(Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)));
  }
}

/** Best-effort client IP from proxy headers. */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return headers.get('x-real-ip') ?? headers.get('cf-connecting-ip') ?? 'unknown';
}
