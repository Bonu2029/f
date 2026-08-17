import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  asService,
  closePool,
  createOrganization,
  createUser,
  hasDatabase,
  resetSchema,
  truncateAll,
} from '../support/db.js';

/**
 * The schema contract the MVP depends on.
 *
 * These are not "does Postgres work" tests. Every assertion here is something
 * the application silently mis-behaves on if it drifts: a missing
 * `organization_id` turns an RLS policy into a no-op, a missing
 * `vapi_assistant_id` means inbound calls resolve to nobody, and a tenant table
 * without RLS is a cross-customer data leak that no unit test would catch.
 */
const describeDb = hasDatabase ? describe : describe.skip;

/** Every table the MVP reads or writes. */
const MVP_TABLES = [
  'profiles',
  'organizations',
  'organization_members',
  'business_profiles',
  'services',
  'faqs',
  'ai_agents',
  'phone_numbers',
  'calls',
  'leads',
  'appointments',
  'subscriptions',
  'usage_ledger',
  'founder_claims',
  'employees',
  'employee_availability',
  'employee_time_off',
  'service_employees',
] as const;

/** Tenant-scoped tables — `profiles` is keyed on the user instead. */
const TENANT_TABLES = MVP_TABLES.filter((t) => t !== 'profiles' && t !== 'organizations');

async function columns(table: string): Promise<Set<string>> {
  const { rows } = await asService<{ column_name: string }>(
    `select column_name from information_schema.columns
      where table_schema = 'public' and table_name = $1`,
    [table],
  );
  return new Set(rows.map((r) => r.column_name));
}

describeDb('schema contract', () => {
  beforeAll(async () => {
    await resetSchema();
  }, 60_000);

  afterAll(async () => {
    await closePool();
  });

  it('has every table the MVP depends on', async () => {
    const { rows } = await asService<{ table_name: string }>(
      `select table_name from information_schema.tables
        where table_schema = 'public' and table_type = 'BASE TABLE'`,
    );
    const present = new Set(rows.map((r) => r.table_name));
    expect([...MVP_TABLES].filter((t) => !present.has(t))).toEqual([]);
  });

  it('carries organization_id on every tenant table', async () => {
    const missing: string[] = [];
    for (const table of TENANT_TABLES) {
      if (!(await columns(table)).has('organization_id')) missing.push(table);
    }
    expect(missing).toEqual([]);
  });

  it('enables AND forces row-level security on every tenant table', async () => {
    const { rows } = await asService<{
      relname: string;
      relrowsecurity: boolean;
      relforcerowsecurity: boolean;
    }>(
      `select c.relname, c.relrowsecurity, c.relforcerowsecurity
         from pg_class c
         join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relname = any($1::text[])`,
      [[...MVP_TABLES]],
    );

    // FORCE matters as much as ENABLE: without it the table owner — which is
    // what a migration or a poorly-scoped connection runs as — bypasses every
    // policy silently.
    const unprotected = rows
      .filter((r) => !r.relrowsecurity || !r.relforcerowsecurity)
      .map((r) => r.relname);
    expect(unprotected).toEqual([]);
  });

  it('has at least one policy on every tenant table', async () => {
    const { rows } = await asService<{ tablename: string; n: string }>(
      `select tablename, count(*)::text as n from pg_policies
        where schemaname = 'public' group by tablename`,
    );
    const counted = new Map(rows.map((r) => [r.tablename, Number(r.n)]));
    const without = [...MVP_TABLES].filter((t) => (counted.get(t) ?? 0) === 0);
    expect(without).toEqual([]);
  });

  it('stores the Vapi assistant identity on ai_agents', async () => {
    const cols = await columns('ai_agents');
    for (const c of [
      'vapi_assistant_id',
      'voice_id',
      'name',
      'greeting',
      'personality',
      'system_prompt',
      'transfer_phone',
      'active',
      'organization_id',
    ]) {
      expect(cols).toContain(c);
    }
  });

  it('stores the Vapi phone number identity on phone_numbers', async () => {
    const cols = await columns('phone_numbers');
    for (const c of ['vapi_phone_number_id', 'phone_number', 'organization_id']) {
      expect(cols).toContain(c);
    }
    // Twilio is gone; a leftover column invites code that half-supports it.
    expect(cols).not.toContain('twilio_sid');
  });

  it('stores what the end-of-call report carries on calls', async () => {
    const cols = await columns('calls');
    for (const c of [
      'vapi_call_id',
      'caller_phone',
      'started_at',
      'ended_at',
      'duration_seconds',
      'transcript',
      'summary',
      'ended_reason',
      'organization_id',
    ]) {
      expect(cols).toContain(c);
    }
  });

  it('exposes onboarding_completed on organizations, derived from the timestamp', async () => {
    expect(await columns('organizations')).toContain('onboarding_completed');

    await truncateAll();
    const user = await createUser('contract@schema.test');
    const { id } = await createOrganization({
      name: 'Contract Co',
      slug: 'contract-co',
      ownerId: user.id,
    });

    const read = async () =>
      (
        await asService<{ onboarding_completed: boolean }>(
          'select onboarding_completed from public.organizations where id = $1',
          [id],
        )
      ).rows[0]!.onboarding_completed;

    expect(await read()).toBe(false);

    await asService('update public.organizations set onboarding_completed_at = now() where id = $1', [
      id,
    ]);
    expect(await read()).toBe(true);

    // It is generated, so it cannot drift from the timestamp by being written.
    await expect(
      asService('update public.organizations set onboarding_completed = false where id = $1', [id]),
    ).rejects.toThrow(/can only be updated to DEFAULT|generated/i);
  });

  it('refuses one user owning two organisations', async () => {
    // /onboarding/start creates the organisation on first visit, and that page
    // is reachable by refresh and by double submit. Without this index a user
    // ends up owning two businesses with their data split across them.
    await truncateAll();
    const user = await createUser('double@schema.test');
    await createOrganization({ name: 'First', slug: 'schema-first', ownerId: user.id });

    await expect(
      createOrganization({ name: 'Second', slug: 'schema-second', ownerId: user.id }),
    ).rejects.toThrow(/duplicate key|unique/i);
  });

  it('still allows a user to be a member of several organisations', async () => {
    // Ownership is capped at one; membership is not. Team invitations must
    // keep working.
    await truncateAll();
    const [owner, guest] = await Promise.all([
      createUser('owner@schema.test'),
      createUser('guest@schema.test'),
    ]);
    const a = await createOrganization({ name: 'Alpha Co', slug: 'schema-mem-a', ownerId: owner.id });
    const b = await createOrganization({ name: 'Bravo Co', slug: 'schema-mem-b', ownerId: guest.id });

    await asService(
      `insert into public.organization_members (organization_id, user_id, role) values ($1, $2, 'staff')`,
      [b.id, owner.id],
    );

    const { rows } = await asService<{ n: string }>(
      'select count(*)::text as n from public.organization_members where user_id = $1',
      [owner.id],
    );
    expect(Number(rows[0]!.n)).toBe(2);
    expect(a.id).not.toBe(b.id);
  });

  it('bootstraps a whole tenant exactly once under concurrency', async () => {
    // /onboarding/start is reachable by refresh, back button and double
    // submit. Eight simultaneous bootstraps must produce one tenant, and every
    // caller must get a usable organisation id back — the loser of the race
    // has a page to render too.
    await truncateAll();
    const user = await createUser('race@schema.test');

    const call = () =>
      asService<{ organization_id: string; was_created: boolean }>(
        `select organization_id, was_created from public.bootstrap_organization(
           $1::uuid, 'Levittown Plumbing', 'levittown-plumbing', 'America/New_York',
           'plumbing', false, 'Mia', 'elliot', 'Thanks for calling Levittown Plumbing.',
           $2::jsonb, $3::jsonb, $4::jsonb, 500)`,
        [
          user.id,
          JSON.stringify([
            { weekday: 1, closed: false, open: '08:00', close: '17:00' },
            { weekday: 0, closed: true, open: '00:00', close: '00:00' },
          ]),
          JSON.stringify([
            { title: 'Never invent prices', instruction: 'Only quote stored prices.', priority: 10, is_system: true },
          ]),
          JSON.stringify({ appointment_duration: 60 }),
        ],
      );

    const results = await Promise.all(Array.from({ length: 8 }, call));
    const rows = results.map((r) => r.rows[0]!);

    // Exactly one creator, and everyone agrees which organisation it is.
    expect(rows.filter((r) => r.was_created)).toHaveLength(1);
    expect(new Set(rows.map((r) => r.organization_id)).size).toBe(1);

    // Every table the app assumes exists has exactly one row.
    for (const table of [
      'organizations',
      'organization_members',
      'business_profiles',
      'ai_agents',
      'subscriptions',
      'availability_settings',
      'notification_preferences',
    ]) {
      const { rows: counted } = await asService<{ n: string }>(
        `select count(*)::text as n from public.${table}`,
      );
      expect(Number(counted[0]!.n), `${table} should have exactly one row`).toBe(1);
    }
  });

  it('leaves nothing behind when the bootstrap fails partway', async () => {
    // The old implementation inserted the organisation, then eight child rows,
    // then DELETED the organisation if any failed — a rollback that is itself a
    // network call. One transaction removes the possibility of a tenant with no
    // agent and no subscription, which every screen assumes cannot exist.
    await truncateAll();
    const user = await createUser('atomic@schema.test');

    await expect(
      asService(
        `select public.bootstrap_organization(
           $1::uuid, 'Atomic Test Co', 'atomic-test-co', 'America/New_York', null, false,
           'Mia', 'elliot', 'Hello there, thanks for calling.',
           '[]'::jsonb,
           $2::jsonb,
           '{}'::jsonb, 500)`,
        // A rule with no title violates ai_rules.title NOT NULL, which fires
        // after the organisation row is already inserted.
        [user.id, JSON.stringify([{ instruction: 'no title', priority: 10 }])],
      ),
    ).rejects.toThrow(/not-null|null value/i);

    const { rows } = await asService<{ n: string }>(
      'select count(*)::text as n from public.organizations',
    );
    expect(Number(rows[0]!.n)).toBe(0);
  });

  it('lets two employees work at the same instant, but neither twice', async () => {
    // The original index was (organization_id, start_at): one appointment per
    // BUSINESS at any moment. A three-van plumber could not book two jobs at
    // once, which makes tracking employees pointless. Double-booking is a
    // property of a person, not a company.
    await truncateAll();
    const user = await createUser('vans@schema.test');
    const org = await createOrganization({
      name: 'Vans Plumbing',
      slug: 'schema-vans',
      ownerId: user.id,
    });

    const employee = async (name: string) =>
      (
        await asService<{ id: string }>(
          'insert into public.employees (organization_id, name) values ($1, $2) returning id',
          [org.id, name],
        )
      ).rows[0]!.id;

    const [dave, priya] = await Promise.all([employee('Dave'), employee('Priya')]);

    const book = (employeeId: string | null, customer: string, at: string) =>
      asService(
        `insert into public.appointments
           (organization_id, employee_id, customer_name, start_at, end_at)
         values ($1, $2, $3, $4::timestamptz, $4::timestamptz + interval '1 hour')`,
        [org.id, employeeId, customer, at],
      );

    await book(dave, 'Smith', '2026-09-01T14:00:00Z');
    // Two vans, one instant. This is the whole point.
    await expect(book(priya, 'Jones', '2026-09-01T14:00:00Z')).resolves.toBeDefined();
    // The same van twice is still refused.
    await expect(book(dave, 'Clash', '2026-09-01T14:00:00Z')).rejects.toThrow(/duplicate key|unique/i);

    // Appointments with nobody assigned keep the old protection, so the manual
    // form cannot create two bookings at one time before employees are set up.
    await book(null, 'Walk-in', '2026-09-01T16:00:00Z');
    await expect(book(null, 'Clash', '2026-09-01T16:00:00Z')).rejects.toThrow(/duplicate key|unique/i);
  });

  it('scopes employee tables to the organisation and admins', async () => {
    const { rows } = await asService<{ tablename: string; cmd: string }>(
      `select tablename, cmd from pg_policies
        where schemaname = 'public'
          and tablename in ('employees','employee_availability','employee_time_off','service_employees')`,
    );
    // One read policy and one write policy per table. A missing write policy
    // would leave staff able to grant themselves working hours.
    expect(rows).toHaveLength(8);
    for (const t of ['employees', 'employee_availability', 'employee_time_off', 'service_employees']) {
      expect(rows.filter((r) => r.tablename === t)).toHaveLength(2);
    }
  });

  it('refuses two agents claiming the same Vapi assistant', async () => {
    await truncateAll();
    const [a, b] = await Promise.all([
      createUser('assistant-a@schema.test'),
      createUser('assistant-b@schema.test'),
    ]);
    const orgA = await createOrganization({ name: 'Org A', slug: 'schema-org-a', ownerId: a.id });
    const orgB = await createOrganization({ name: 'Org B', slug: 'schema-org-b', ownerId: b.id });

    await asService(
      `update public.ai_agents set vapi_assistant_id = 'asst_contract' where organization_id = $1`,
      [orgA.id],
    );
    await expect(
      asService(
        `update public.ai_agents set vapi_assistant_id = 'asst_contract' where organization_id = $1`,
        [orgB.id],
      ),
    ).rejects.toThrow(/duplicate key|unique/i);
  });
});
