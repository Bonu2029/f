import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { normalizeSupabaseUrl } from '@afd/shared';

/**
 * Guards against a bug class that has already cost a debugging cycle.
 *
 * Supabase renamed its public key: newer projects issue `sb_publishable_…`,
 * older ones a JWT-shaped `anon` key. The app accepts either — but only where
 * someone remembered to write both names. A file that reads just one is not a
 * type error, not a lint error, and not a crash. It reports "no user", which
 * looks exactly like a signed-out visitor, and the visible symptom is a login
 * that succeeds and then redirects straight back to the login page.
 *
 * That is precisely what happened in `lib/supabase/middleware.ts`. These tests
 * exist so the next file to read one name fails here instead of in someone's
 * afternoon.
 */

const SRC = path.join(process.cwd(), 'apps', 'web', 'src');

async function sourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (e) => {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) return sourceFiles(full);
      return /\.tsx?$/.test(e.name) ? [full] : [];
    }),
  );
  return files.flat();
}

describe('Supabase public key naming', () => {
  it('never reads the anon key without also accepting the publishable key', async () => {
    const files = await sourceFiles(SRC);
    const offenders: string[] = [];

    for (const file of files) {
      const text = await readFile(file, 'utf8');
      const readsAnon = text.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY');
      const readsPublishable = text.includes('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
      if (readsAnon && !readsPublishable) offenders.push(path.relative(process.cwd(), file));
    }

    expect(offenders).toEqual([]);
  });

  it('resolves the public key the same way in every entry point', async () => {
    // The three places a Supabase client is constructed. Each must handle both
    // names, or one surface silently disagrees with the other two about
    // whether the visitor is signed in.
    for (const rel of [
      'lib/supabase/client.ts',
      'lib/supabase/middleware.ts',
      'lib/env.ts',
    ]) {
      const text = await readFile(path.join(SRC, rel), 'utf8');
      expect(text, `${rel} must read NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`).toContain(
        'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
      );
      expect(text, `${rel} must still accept NEXT_PUBLIC_SUPABASE_ANON_KEY`).toContain(
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      );
    }
  });

  it('distinguishes "not configured" from "not signed in" in middleware', async () => {
    const text = await readFile(path.join(SRC, 'lib/supabase/middleware.ts'), 'utf8');
    // Collapsing these two is what turns a one-line config mistake into an
    // unexplained redirect loop.
    expect(text).toContain('configured');
  });
});

describe('normalizeSupabaseUrl', () => {
  it('accepts the project URL unchanged', () => {
    expect(normalizeSupabaseUrl('https://abc.supabase.co')).toBe('https://abc.supabase.co');
  });

  it('strips the API path people copy from the dashboard by mistake', () => {
    for (const suffix of ['/rest/v1/', '/rest/v1', '/auth/v1/', '/storage/v1', '/realtime/v1']) {
      expect(normalizeSupabaseUrl(`https://abc.supabase.co${suffix}`)).toBe('https://abc.supabase.co');
    }
  });

  it('strips trailing slashes and surrounding whitespace', () => {
    expect(normalizeSupabaseUrl('  https://abc.supabase.co///  ')).toBe('https://abc.supabase.co');
  });

  it('leaves a URL that merely contains a version-like segment alone', () => {
    // Only a trailing API path is stripped — a self-hosted instance behind a
    // path prefix must survive.
    expect(normalizeSupabaseUrl('https://example.com/rest/v1/supabase')).toBe(
      'https://example.com/rest/v1/supabase',
    );
  });
});
