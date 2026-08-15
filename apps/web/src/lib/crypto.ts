import 'server-only';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { cryptoEnv } from '@/lib/env';

/**
 * Cryptographic helpers.
 *
 * OAuth refresh tokens are the most sensitive thing this product stores, so
 * they are encrypted at rest with AES-256-GCM before they ever reach Postgres.
 * Even a database dump does not yield usable Google credentials without
 * APP_ENCRYPTION_KEY, which lives only in the server environment.
 */

const ALGO = 'aes-256-gcm';
const IV_BYTES = 12;

function key(): Buffer {
  const raw = Buffer.from(cryptoEnv.encryptionKey, 'base64');
  if (raw.length !== 32) {
    throw new Error(
      'APP_ENCRYPTION_KEY must be exactly 32 bytes, base64 encoded. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"',
    );
  }
  return raw;
}

/** Returns `v1.<iv>.<tag>.<ciphertext>`, all base64url. */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', iv.toString('base64url'), tag.toString('base64url'), enc.toString('base64url')].join('.');
}

export function decryptSecret(payload: string): string {
  const parts = payload.split('.');
  if (parts.length !== 4 || parts[0] !== 'v1') {
    throw new Error('Encrypted value is malformed or was written with a different key version.');
  }
  const [, ivB64, tagB64, dataB64] = parts;
  const decipher = createDecipheriv(ALGO, key(), Buffer.from(ivB64!, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagB64!, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(dataB64!, 'base64url')), decipher.final()]).toString(
    'utf8',
  );
}

/* -------------------------------------------------------------------------- */
/* Opaque tokens (team invites)                                               */
/* -------------------------------------------------------------------------- */

/**
 * Generates a high-entropy token and its storage hash. Only the hash is
 * persisted, so a database leak cannot be replayed against the invite endpoint.
 *
 * The HMAC is keyed with APP_ENCRYPTION_KEY rather than a bare hash so a stolen
 * database still cannot be used to pre-compute matching tokens.
 */
export function generateToken(bytes = 32): { token: string; hash: string } {
  const token = randomBytes(bytes).toString('base64url');
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHmac('sha256', cryptoEnv.encryptionKey).update(token).digest('hex');
}

export function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/* -------------------------------------------------------------------------- */
/* OAuth state                                                                */
/* -------------------------------------------------------------------------- */

export function generateOAuthState(): string {
  return randomBytes(24).toString('base64url');
}

export function sha256Hex(input: string | Buffer): string {
  return createHash('sha256').update(input).digest('hex');
}

/**
 * Verifies an HMAC-SHA256 webhook signature in constant time.
 * Accepts hex or base64 digests since providers differ.
 */
export function verifyHmacSignature(
  payload: string | Buffer,
  signature: string,
  secret: string,
  encoding: 'hex' | 'base64' = 'hex',
): boolean {
  const expected = createHmac('sha256', secret).update(payload).digest(encoding);
  try {
    return constantTimeEqual(signature.trim(), expected);
  } catch {
    return false;
  }
}
