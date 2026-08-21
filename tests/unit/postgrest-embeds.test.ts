import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * PostgREST can only embed one table in another when a foreign key joins them
 * directly. `organization_members.user_id` and `profiles.id` both point at
 * `auth.users`, so there is no key between THEM — and
 * `select('role, profile:profiles(email)')` fails with PGRST200.
 *
 * The failure is silent in the worst way. supabase-js returns the error in a
 * field rather than throwing, and every call site here discarded it, read an
 * empty result, and carried on. The consequences went unnoticed for the life of
 * the project: no owner ever received an operational email, the team page listed
 * memberships with nobody attached, and the account export produced a team with
 * no people in it.
 *
 * This test reads the source rather than the database, because the point is to
 * stop the pattern being written again — the database cannot tell us about a
 * query nobody has run yet.
 */

const SOURCE_ROOT = path.resolve(__dirname, '../../apps/web/src');

/** Embeds known to be impossible, and why. */
const FORBIDDEN: Array<{ pattern: RegExp; explain: string }> = [
  {
    pattern: /profiles\s*\(/,
    explain:
      'organization_members and profiles have no foreign key between them, so this returns PGRST200 and an empty result. Use listOrganizationMembers() from @/server/members instead.',
  },
];

/** Where the helper itself lives; it is the sanctioned replacement. */
const ALLOWED_FILES = new Set([path.join(SOURCE_ROOT, 'server', 'members.ts')]);

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.tsx?$/.test(entry) ? [full] : [];
  });
}

/** `.select('…')` calls, including the multi-line ones. */
function selectStrings(source: string): string[] {
  return [...source.matchAll(/\.select\(\s*(['"`])([\s\S]*?)\1/g)].map((m) => m[2] ?? '');
}

describe('PostgREST embedded selects', () => {
  const files = walk(SOURCE_ROOT);

  it('finds the source tree, so a passing run means something', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it.each(FORBIDDEN)('never embeds a table it cannot join ($explain)', ({ pattern, explain }) => {
    const offenders: string[] = [];

    for (const file of files) {
      if (ALLOWED_FILES.has(file)) continue;
      const source = readFileSync(file, 'utf8');
      for (const select of selectStrings(source)) {
        if (pattern.test(select)) {
          offenders.push(`${path.relative(SOURCE_ROOT, file)}: .select('${select}')`);
        }
      }
    }

    expect(offenders, `${explain}\n\nFound in:\n${offenders.join('\n')}`).toEqual([]);
  });
});
