import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';

/**
 * Integration-test database harness.
 *
 * These tests run the REAL migrations against a real PostgreSQL instance, so
 * they verify the actual schema, RLS policies and PL/pgSQL functions rather
 * than a re-implementation of them.
 *
 * Set TEST_DATABASE_URL to a throwaway database. When it is not set the
 * integration suites skip themselves with an explanation instead of silently
 * passing — see `describeIfDatabase`.
 *
 *   # local postgres
 *   createdb afd_test
 *   TEST_DATABASE_URL=postgresql://localhost/afd_test npm test
 */

export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? '';
export const hasDatabase = TEST_DATABASE_URL.length > 0;

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    pool = new pg.Pool({
      connectionString: TEST_DATABASE_URL,
      max: 12,
      ssl: /localhost|127\.0\.0\.1|host=/.test(TEST_DATABASE_URL) ? undefined : { rejectUnauthorized: false },
    });
  }
  return pool;
}

export async function closePool(): Promise<void> {
  await pool?.end();
  pool = null;
  resetOnce = null;
}

let resetOnce: Promise<void> | null = null;

/**
 * Applies the Supabase shim and every migration, from scratch.
 *
 * Rebuilding the schema is expensive and mutually exclusive, so this is
 * single-flighted within a process and guarded by a session-level advisory lock
 * across processes. Test files therefore share one prepared schema instead of
 * racing each other to drop it.
 */
export async function resetSchema(): Promise<void> {
  resetOnce ??= (async () => {
    const client = await getPool().connect();
    try {
      // Serialise schema rebuilds across every test process.
      await client.query('select pg_advisory_lock(918273)');

      await client.query('drop schema if exists public cascade; create schema public;');
      await client.query('drop schema if exists auth cascade; drop schema if exists storage cascade;');

      const shim = await readFile(path.join(process.cwd(), 'tests/support/supabase-shim.sql'), 'utf8');
      await client.query(shim);

      const dir = path.join(process.cwd(), 'supabase/migrations');
      // `bundle.sql` is the generated whole-history concatenation for the
      // Supabase SQL editor, not a migration — applying it here would re-run
      // everything on top of itself.
      const files = (await readdir(dir))
        .filter((f) => f.endsWith('.sql') && f !== 'bundle.sql')
        .sort();
      for (const file of files) {
        await client.query(await readFile(path.join(dir, file), 'utf8'));
      }
    } finally {
      await client.query('select pg_advisory_unlock(918273)').catch(() => undefined);
      client.release();
    }
  })();

  return resetOnce;
}

/** Removes tenant data between tests without re-running migrations. */
export async function truncateAll(): Promise<void> {
  const db = getPool();
  await db.query(`
    truncate table
      public.organizations,
      public.profiles,
      public.webhook_events,
      public.audit_logs,
      public.error_events
    restart identity cascade;
  `);
  await db.query('delete from auth.users;');
}

export interface TestUser {
  id: string;
  email: string;
}

export async function createUser(email: string): Promise<TestUser> {
  const db = getPool();
  const { rows } = await db.query<{ id: string }>(
    'insert into auth.users (email) values ($1) returning id',
    [email],
  );
  const id = rows[0]!.id;
  // The handle_new_user trigger normally creates this; do it explicitly so the
  // test does not depend on trigger timing.
  await db.query(
    'insert into public.profiles (id, email) values ($1, $2) on conflict (id) do nothing',
    [id, email],
  );
  return { id, email };
}

export interface TestOrg {
  id: string;
  slug: string;
  ownerId: string;
}

/** Creates a fully-formed organisation the way the application does. */
export async function createOrganization(input: {
  name: string;
  slug: string;
  ownerId: string;
}): Promise<TestOrg> {
  const db = getPool();
  const { rows } = await db.query<{ id: string }>(
    `insert into public.organizations (name, slug, owner_user_id, status)
     values ($1, $2, $3, 'active') returning id`,
    [input.name, input.slug, input.ownerId],
  );
  const id = rows[0]!.id;

  await db.query(
    `insert into public.organization_members (organization_id, user_id, role)
     values ($1, $2, 'owner')`,
    [id, input.ownerId],
  );
  await db.query(
    `insert into public.business_profiles (organization_id, display_name) values ($1, $2)`,
    [id, input.name],
  );
  await db.query(
    `insert into public.ai_agents (organization_id, greeting, active) values ($1, $2, true)`,
    [id, `Thanks for calling ${input.name}.`],
  );
  await db.query(
    `insert into public.subscriptions (organization_id, plan, status, included_minutes, used_minutes)
     values ($1, 'founder', 'active', 200, 0)`,
    [id],
  );

  return { id, slug: input.slug, ownerId: input.ownerId };
}

/**
 * Runs a query as an authenticated end user, exactly as PostgREST would:
 * the `authenticated` role with the user's id in the JWT claim. This is what
 * makes the RLS assertions meaningful.
 */
export async function asUser<T extends pg.QueryResultRow = pg.QueryResultRow>(
  userId: string,
  sql: string,
  params: unknown[] = [],
): Promise<pg.QueryResult<T>> {
  const client = await getPool().connect();
  try {
    await client.query('begin');
    await client.query(`set local role authenticated`);
    await client.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId]);
    const result = await client.query<T>(sql, params);
    await client.query('commit');
    return result;
  } catch (err) {
    await client.query('rollback').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

/** Runs a query with service-role privileges (bypasses RLS), as the server does. */
export async function asService<T extends pg.QueryResultRow = pg.QueryResultRow>(
  sql: string,
  params: unknown[] = [],
): Promise<pg.QueryResult<T>> {
  return getPool().query<T>(sql, params);
}
