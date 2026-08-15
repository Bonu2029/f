/**
 * Concatenates `supabase/migrations/*.sql` into one file you can paste into the
 * Supabase dashboard SQL editor.
 *
 *   npm run db:bundle
 *
 * This exists because the SQL editor is the only route into a hosted database
 * when you do not have the Postgres password to hand. It produces exactly the
 * same schema as `npm run db:migrate`.
 *
 * IT IS A ONE-TIME APPLY, not a re-runnable script. Individual migrations are
 * idempotent, but the sequence is not: a later migration drops columns an
 * earlier one indexes, so a second pass over the whole bundle fails partway.
 * The bundle therefore opens with a guard that refuses to run against a
 * database that has already been migrated, and closes by recording the
 * migrations so `npm run db:migrate` picks up cleanly from there.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const MIGRATIONS_DIR = path.join(process.cwd(), 'supabase', 'migrations');
const OUT_FILE = path.join(MIGRATIONS_DIR, 'bundle.sql');
const BUNDLE_NAME = 'bundle.sql';

async function main() {
  const files = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith('.sql') && f !== BUNDLE_NAME)
    .sort();

  if (files.length === 0) {
    console.error('No migrations found.');
    process.exit(1);
  }

  const parts: string[] = [
    '-- =============================================================================',
    '-- AI Front Desk — complete schema bundle',
    '--',
    '-- GENERATED FILE. Do not edit: run `npm run db:bundle` after changing any',
    '-- migration. Source of truth is the individual files in this directory.',
    '--',
    '-- To apply: open your Supabase project -> SQL Editor -> New query, paste this',
    '-- whole file, and Run. Expect "Success. No rows returned".',
    '--',
    '-- ONE-TIME APPLY. This is the whole history concatenated, and the sequence',
    '-- is not re-runnable: a later migration drops columns an earlier one',
    '-- indexes. The guard below stops a second pass before it can fail partway.',
    '-- For incremental changes afterwards, use `npm run db:migrate`.',
    '--',
    `-- Contains, in order: ${files.join(', ')}`,
    '-- =============================================================================',
    '',
    '-- Refuse to run twice. Without this, a second pass fails partway through',
    '-- with a confusing "column does not exist" and leaves you guessing whether',
    '-- anything broke.',
    'do $guard$',
    'declare',
    '  already boolean := false;',
    'begin',
    "  if to_regclass('public.schema_migrations') is not null then",
    '    -- Dynamic, because PL/pgSQL resolves table references when it plans the',
    '    -- block — a static reference would fail on a database where the table',
    '    -- does not exist yet, which is exactly the case this guard allows.',
    '    execute',
    "      'select exists (select 1 from public.schema_migrations where filename = $1)'",
    `      into already using '${files[files.length - 1]}';`,
    '  end if;',
    '',
    '  if already then',
    '    raise exception',
    "      'This database has already been migrated. Use `npm run db:migrate` for incremental changes.';",
    '  end if;',
    'end $guard$;',
    '',
  ];

  for (const file of files) {
    const sql = (await readFile(path.join(MIGRATIONS_DIR, file), 'utf8')).trim();
    parts.push(
      '',
      `-- ${'='.repeat(76)}`,
      `-- BEGIN ${file}`,
      `-- ${'='.repeat(76)}`,
      '',
      sql,
      '',
      `-- END ${file}`,
      '',
    );
  }

  // Record the bundled files as applied, so a later `npm run db:migrate`
  // against the same database does not try to re-run them.
  parts.push(
    '',
    `-- ${'='.repeat(76)}`,
    '-- Mark these migrations as applied, so `npm run db:migrate` against this',
    '-- same database later is a no-op rather than a second pass.',
    '--',
    '-- The checksum is deliberately left as \'bundled\'. The migration runner warns',
    '-- when a checksum does not match, which is the correct signal here: it means',
    '-- "this was applied by hand, not by me".',
    `-- ${'='.repeat(76)}`,
    'create table if not exists public.schema_migrations (',
    '  filename   text primary key,',
    '  checksum   text not null,',
    '  applied_at timestamptz not null default now()',
    ');',
    '',
    'insert into public.schema_migrations (filename, checksum) values',
    files.map((f) => `  ('${f}', 'bundled')`).join(',\n') +
      '\non conflict (filename) do nothing;',
    '',
  );

  const output = parts.join('\n');
  await writeFile(OUT_FILE, output, 'utf8');

  console.log(
    `Bundled ${files.length} migration(s) into ${path.relative(process.cwd(), OUT_FILE)} ` +
      `(${(output.length / 1024).toFixed(1)} KB).`,
  );
  console.log('Paste it into Supabase → SQL Editor → New query, then Run.');
  console.log('One-time apply: it refuses to run against an already-migrated database.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
