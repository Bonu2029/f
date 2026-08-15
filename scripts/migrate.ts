/**
 * Applies the SQL migrations in `supabase/migrations` in filename order.
 *
 * Uses a `schema_migrations` table so re-running is safe: a file that has
 * already been applied is skipped. Each file runs inside a transaction, so a
 * failure leaves the database in its previous state rather than half-migrated.
 *
 *   npm run db:migrate
 *
 * Requires SUPABASE_DB_URL (a direct Postgres connection string). For hosted
 * Supabase use the connection string from Project Settings → Database.
 */
import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: ['.env.local', '.env'], quiet: true });

const MIGRATIONS_DIR = path.join(process.cwd(), 'supabase', 'migrations');

async function main() {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) {
    console.error(
      'SUPABASE_DB_URL is not set.\n' +
        'Local:  postgresql://postgres:postgres@127.0.0.1:54322/postgres\n' +
        'Hosted: Project Settings → Database → Connection string (URI).',
    );
    process.exit(1);
  }

  // `pg` is loaded lazily so the rest of the toolchain does not depend on it.
  const { default: pg } = await import('pg');
  const client = new pg.Client({
    connectionString: url,
    ssl: url.includes('localhost') || url.includes('127.0.0.1') ? undefined : { rejectUnauthorized: false },
  });

  await client.connect();

  await client.query(`
    create table if not exists public.schema_migrations (
      filename text primary key,
      checksum text not null,
      applied_at timestamptz not null default now()
    );
  `);

  // `bundle.sql` is the generated whole-history concatenation for the Supabase
  // SQL editor, not a migration. Applying it here would re-run everything.
  const files = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith('.sql') && f !== 'bundle.sql')
    .sort();
  const { rows: applied } = await client.query<{ filename: string; checksum: string }>(
    'select filename, checksum from public.schema_migrations',
  );
  const appliedMap = new Map(applied.map((r) => [r.filename, r.checksum]));

  let ran = 0;
  for (const file of files) {
    const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
    const checksum = createHash('sha256').update(sql).digest('hex').slice(0, 16);

    const previous = appliedMap.get(file);
    if (previous) {
      if (previous === 'bundled') {
        // Applied by pasting bundle.sql into the Supabase SQL editor. Nothing
        // is wrong; there is simply no checksum to compare against.
        console.log(`· ${file} (already applied via bundle.sql)`);
      } else if (previous !== checksum) {
        console.warn(
          `⚠ ${file} has changed since it was applied. Migrations are append-only — ` +
            'add a new file instead of editing an applied one.',
        );
      } else {
        console.log(`· ${file} (already applied)`);
      }
      continue;
    }

    process.stdout.write(`→ ${file} … `);
    try {
      await client.query('begin');
      await client.query(sql);
      await client.query('insert into public.schema_migrations (filename, checksum) values ($1, $2)', [
        file,
        checksum,
      ]);
      await client.query('commit');
      console.log('done');
      ran += 1;
    } catch (err) {
      await client.query('rollback');
      console.log('failed');
      console.error(`\n${file} failed and was rolled back:\n`, err instanceof Error ? err.message : err);
      await client.end();
      process.exit(1);
    }
  }

  await client.end();
  console.log(ran === 0 ? '\nDatabase already up to date.' : `\nApplied ${ran} migration(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
