/**
 * Shared env loading for every script in this directory.
 *
 * This exists because of a real trap in a monorepo: **Next.js reads `.env.local`
 * from the app directory (`apps/web/`), not the repository root.** A root-only
 * `.env.local` leaves `npm run dev` throwing MissingEnvError while
 * `npm run doctor` reports everything fine — the two disagree, and the
 * disagreement is invisible.
 *
 * So `apps/web/.env.local` is the canonical file, and the scripts read it first.
 * A root `.env.local` still works and still wins nothing it should not: dotenv
 * keeps the first definition it sees, so the file Next actually uses is also the
 * file the tooling reports on.
 */
import path from 'node:path';
import { existsSync } from 'node:fs';
import { config } from 'dotenv';

/** In load order. Earlier files win, matching dotenv's own precedence. */
export const ENV_FILES = [
  path.join('apps', 'web', '.env.local'),
  '.env.local',
  path.join('apps', 'web', '.env'),
  '.env',
];

/** Loads env files and returns the ones that existed, for reporting. */
export function loadEnvFiles(cwd = process.cwd()): string[] {
  const found = ENV_FILES.map((f) => path.join(cwd, f)).filter((f) => existsSync(f));
  if (found.length) config({ path: found, quiet: true });
  return found.map((f) => path.relative(cwd, f));
}
