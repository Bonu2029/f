import 'server-only';
import { timingSafeEqual } from 'node:crypto';
import { workerEnv } from '@/lib/env';
import { errors } from '@/lib/errors';

/**
 * Authenticates the voice worker's calls into the web app's internal API.
 *
 * The worker holds a shared secret (VOICE_WORKER_SECRET). The comparison is
 * constant time so the secret cannot be recovered by timing the endpoint.
 *
 * These endpoints are the only way the worker touches the database, which keeps
 * all tenant-scoped business logic in one place.
 */
export function assertWorkerRequest(headers: Headers): void {
  const header = headers.get('authorization') ?? '';
  const presented = header.startsWith('Bearer ') ? header.slice(7) : '';
  const expected = workerEnv.secret;

  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw errors.forbidden('access the internal call API');
  }
}
