import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  asService,
  asUser,
  closePool,
  createOrganization,
  createUser,
  hasDatabase,
  resetSchema,
  truncateAll,
  type TestOrg,
  type TestUser,
} from '../support/db.js';

/**
 * TENANT ISOLATION — the security property this product depends on.
 *
 * These tests run against the real migrations, as the `authenticated` Postgres
 * role with a JWT claim, which is exactly how PostgREST executes a request from
 * the browser. A user from Business A must not be able to read or write
 * Business B's data even by crafting the SQL directly — which is a stronger
 * guarantee than "the UI doesn't show it".
 */
const describeDb = hasDatabase ? describe : describe.skip;

if (!hasDatabase) {
  console.warn(
    '\n⚠ Integration tests skipped: TEST_DATABASE_URL is not set.\n' +
      '  Run them with a throwaway database, e.g.\n' +
      '  TEST_DATABASE_URL=postgresql://localhost/afd_test npm test\n',
  );
}

describeDb('tenant isolation (RLS)', () => {
  let alice: TestUser;
  let bob: TestUser;
  let orgA: TestOrg;
  let orgB: TestOrg;

  beforeAll(async () => {
    await resetSchema();
    await truncateAll();

    alice = await createUser('alice@business-a.test');
    bob = await createUser('bob@business-b.test');
    orgA = await createOrganization({ name: 'Business A', slug: 'business-a', ownerId: alice.id });
    orgB = await createOrganization({ name: 'Business B', slug: 'business-b', ownerId: bob.id });

    // Give each organisation one lead and one call.
    for (const [org, label] of [
      [orgA, 'A'],
      [orgB, 'B'],
    ] as const) {
      const { rows } = await asService<{ id: string }>(
        `insert into public.calls (organization_id, vapi_call_id, caller_phone, business_phone)
         values ($1, $2, '+12155550100', '+12155550142') returning id`,
        [org.id, `ext_${label}`],
      );
      await asService(
        `insert into public.leads (organization_id, call_id, name, phone, service_requested)
         values ($1, $2, $3, '+12155550100', 'AC repair')`,
        [org.id, rows[0]!.id, `Customer ${label}`],
      );
      await asService(
        `insert into public.call_transcript_messages (call_id, organization_id, role, text, sequence)
         values ($1, $2, 'user', $3, 1)`,
        [rows[0]!.id, org.id, `Secret conversation for ${label}`],
      );
    }
  }, 60_000);

  afterAll(async () => {
    await closePool();
  });

  it('lets a member read their own organisation', async () => {
    const result = await asUser(alice.id, 'select id, name from public.organizations');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]!.name).toBe('Business A');
  });

  it('hides another organisation entirely, even by explicit id', async () => {
    const result = await asUser(alice.id, 'select id from public.organizations where id = $1', [
      orgB.id,
    ]);
    expect(result.rows).toHaveLength(0);
  });

  it('hides another tenant\'s leads', async () => {
    const all = await asUser(alice.id, 'select organization_id, name from public.leads');
    expect(all.rows).toHaveLength(1);
    expect(all.rows[0]!.organization_id).toBe(orgA.id);

    const targeted = await asUser(alice.id, 'select id from public.leads where organization_id = $1', [
      orgB.id,
    ]);
    expect(targeted.rows).toHaveLength(0);
  });

  it('hides another tenant\'s calls and transcripts', async () => {
    const calls = await asUser(alice.id, 'select organization_id from public.calls');
    expect(calls.rows.every((r) => r.organization_id === orgA.id)).toBe(true);

    const transcripts = await asUser(
      alice.id,
      'select text from public.call_transcript_messages where organization_id = $1',
      [orgB.id],
    );
    expect(transcripts.rows).toHaveLength(0);
  });

  it('refuses a write into another tenant', async () => {
    await expect(
      asUser(
        alice.id,
        `insert into public.leads (organization_id, name, phone) values ($1, 'Injected', '+12155550199')`,
        [orgB.id],
      ),
    ).rejects.toThrow(/row-level security|violates/i);
  });

  it('refuses an update of another tenant\'s row', async () => {
    const before = await asService('select name from public.leads where organization_id = $1', [orgB.id]);
    await asUser(alice.id, `update public.leads set name = 'Hacked' where organization_id = $1`, [
      orgB.id,
    ]);
    const after = await asService('select name from public.leads where organization_id = $1', [orgB.id]);
    expect(after.rows[0]!.name).toBe(before.rows[0]!.name);
  });

  it('never exposes webhook events or audit logs to a client role', async () => {
    const webhooks = await asUser(alice.id, 'select * from public.webhook_events');
    expect(webhooks.rows).toHaveLength(0);

    const audits = await asUser(alice.id, 'select * from public.audit_logs');
    expect(audits.rows).toHaveLength(0);
  });

  it('never exposes another tenant\'s Vapi identifiers', async () => {
    await asService(
      `update public.ai_agents set vapi_assistant_id = 'asst_secret_b' where organization_id = $1`,
      [orgB.id],
    );
    const rows = await asUser(alice.id, 'select vapi_assistant_id from public.ai_agents');
    expect(rows.rows.map((r) => (r as { vapi_assistant_id: string | null }).vapi_assistant_id)).not.toContain(
      'asst_secret_b',
    );
  });

  it('applies role hierarchy: staff may work leads but not change settings', async () => {
    const carol = await createUser('carol@business-a.test');
    await asService(
      `insert into public.organization_members (organization_id, user_id, role)
       values ($1, $2, 'staff')`,
      [orgA.id, carol.id],
    );

    // Staff can read and update leads.
    const leads = await asUser(carol.id, 'select id from public.leads');
    expect(leads.rows).toHaveLength(1);

    // Staff cannot insert a service (admin-only table).
    await expect(
      asUser(
        carol.id,
        `insert into public.services (organization_id, name) values ($1, 'Sneaky service')`,
        [orgA.id],
      ),
    ).rejects.toThrow(/row-level security|violates/i);
  });

  it('keeps at least one owner per organisation', async () => {
    const { rows } = await asService<{ id: string }>(
      `select id from public.organization_members where organization_id = $1 and role = 'owner'`,
      [orgA.id],
    );
    await expect(
      asService('delete from public.organization_members where id = $1', [rows[0]!.id]),
    ).rejects.toThrow(/at least one owner/i);
  });
});
