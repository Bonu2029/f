import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  asService,
  closePool,
  createOrganization,
  createUser,
  getPool,
  hasDatabase,
  resetSchema,
  truncateAll,
} from '../support/db.js';

/**
 * FOUNDING 50 — capacity, concurrency and permanence.
 *
 * These run against the real PL/pgSQL functions, so the concurrency test
 * genuinely exercises the advisory lock and the partial unique index rather
 * than a simulation of them.
 */
const describeDb = hasDatabase ? describe : describe.skip;

async function makeOrg(index: number) {
  const user = await createUser(`owner${index}-${Date.now()}@founder.test`);
  return createOrganization({
    name: `Founder Business ${index}`,
    slug: `founder-business-${index}-${Math.random().toString(36).slice(2, 7)}`,
    ownerId: user.id,
  });
}

async function reserve(orgId: string, userId: string | null = null, ttl = 30) {
  const { rows } = await asService<{ reserve_founder_slot: number | null }>(
    'select public.reserve_founder_slot($1, $2, $3)',
    [orgId, userId, ttl],
  );
  return rows[0]!.reserve_founder_slot;
}

async function stats() {
  const { rows } = await asService<{
    total: number;
    active: number;
    reserved: number;
    remaining: number;
  }>('select * from public.founder_slot_stats()');
  return rows[0]!;
}

describeDb('Founding 50 slot inventory', () => {
  beforeAll(async () => {
    await resetSchema();
  }, 60_000);

  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await closePool();
  });

  it('starts with all 50 slots available', async () => {
    const s = await stats();
    expect(s.total).toBe(50);
    expect(s.remaining).toBe(50);
    expect(s.active).toBe(0);
  });

  it('hands out slots 1 to 50 in order, then refuses the 51st', async () => {
    const assigned: number[] = [];

    for (let i = 1; i <= 50; i++) {
      const org = await makeOrg(i);
      const slot = await reserve(org.id);
      expect(slot).toBe(i);
      assigned.push(slot!);
    }

    expect(new Set(assigned).size).toBe(50);
    expect(Math.min(...assigned)).toBe(1);
    expect(Math.max(...assigned)).toBe(50);

    const overflow = await makeOrg(51);
    expect(await reserve(overflow.id)).toBeNull();

    const s = await stats();
    expect(s.remaining).toBe(0);
  }, 60_000);

  it('never issues the same slot twice under simultaneous reservation', async () => {
    // Fill 49 slots, then have ten organisations race for the last one.
    for (let i = 1; i <= 49; i++) {
      const org = await makeOrg(i);
      await reserve(org.id);
    }
    expect((await stats()).remaining).toBe(1);

    const contenders = await Promise.all(Array.from({ length: 10 }, (_, i) => makeOrg(100 + i)));

    // Genuinely concurrent: ten separate pooled connections, fired together.
    const results = await Promise.all(
      contenders.map(async (org) => {
        const client = await getPool().connect();
        try {
          const { rows } = await client.query<{ reserve_founder_slot: number | null }>(
            'select public.reserve_founder_slot($1, $2, $3)',
            [org.id, null, 30],
          );
          return rows[0]!.reserve_founder_slot;
        } finally {
          client.release();
        }
      }),
    );

    const winners = results.filter((r): r is number => r !== null);
    expect(winners).toHaveLength(1);
    expect(winners[0]).toBe(50);
    expect(results.filter((r) => r === null)).toHaveLength(9);

    // And the database agrees there is exactly one live claim for slot 50.
    const { rows } = await asService<{ count: string }>(
      `select count(*)::text from public.founder_claims
        where slot_number = 50 and status in ('reserved','active')`,
    );
    expect(Number(rows[0]!.count)).toBe(1);
  }, 90_000);

  it('is idempotent for an organisation that already holds a claim', async () => {
    const org = await makeOrg(1);
    const first = await reserve(org.id);
    const second = await reserve(org.id);
    expect(second).toBe(first);

    const { rows } = await asService<{ count: string }>(
      `select count(*)::text from public.founder_claims where organization_id = $1`,
      [org.id],
    );
    expect(Number(rows[0]!.count)).toBe(1);
  });

  it('returns an abandoned reservation to inventory when it expires', async () => {
    const org = await makeOrg(1);
    const slot = await reserve(org.id);
    expect(slot).toBe(1);
    expect((await stats()).remaining).toBe(49);

    // Simulate the hold lapsing.
    await asService(
      `update public.founder_claims set expires_at = now() - interval '1 minute'
        where organization_id = $1`,
      [org.id],
    );

    const expired = await asService<{ expire_founder_reservations: number }>(
      'select public.expire_founder_reservations()',
    );
    expect(expired.rows[0]!.expire_founder_reservations).toBe(1);
    expect((await stats()).remaining).toBe(50);

    // The freed slot is handed to the next organisation.
    const next = await makeOrg(2);
    expect(await reserve(next.id)).toBe(1);
  });

  it('returns an explicitly released reservation to inventory', async () => {
    const org = await makeOrg(1);
    await reserve(org.id);

    const released = await asService<{ release_founder_reservation: boolean }>(
      'select public.release_founder_reservation($1)',
      [org.id],
    );
    expect(released.rows[0]!.release_founder_reservation).toBe(true);
    expect((await stats()).remaining).toBe(50);
  });

  it('activates a slot on payment and stamps it on the subscription', async () => {
    const org = await makeOrg(1);
    await reserve(org.id);

    const { rows } = await asService<{ activate_founder_slot: number }>(
      'select public.activate_founder_slot($1)',
      [org.id],
    );
    expect(rows[0]!.activate_founder_slot).toBe(1);

    const sub = await asService<{ founder: boolean; founder_slot: number }>(
      'select founder, founder_slot from public.subscriptions where organization_id = $1',
      [org.id],
    );
    expect(sub.rows[0]!.founder).toBe(true);
    expect(sub.rows[0]!.founder_slot).toBe(1);

    const s = await stats();
    expect(s.active).toBe(1);
    expect(s.reserved).toBe(0);
    expect(s.remaining).toBe(49);
  });

  it('does NOT reopen an activated slot after cancellation', async () => {
    const org = await makeOrg(1);
    await reserve(org.id);
    await asService('select public.activate_founder_slot($1)', [org.id]);

    // Cancel the subscription the way the Stripe webhook does.
    await asService(
      `update public.subscriptions set status = 'canceled' where organization_id = $1`,
      [org.id],
    );
    await asService(`update public.organizations set status = 'cancelled' where id = $1`, [org.id]);

    // Releasing must refuse to touch an active claim.
    await asService('select public.release_founder_reservation($1)', [org.id]);

    const s = await stats();
    expect(s.active).toBe(1);
    expect(s.remaining).toBe(49);

    const claim = await asService<{ status: string }>(
      'select status from public.founder_claims where organization_id = $1',
      [org.id],
    );
    expect(claim.rows[0]!.status).toBe('active');
  });

  it('rejects an out-of-range slot number at the database level', async () => {
    const org = await makeOrg(1);
    await expect(
      asService(
        `insert into public.founder_claims (organization_id, slot_number, status)
         values ($1, 51, 'reserved')`,
        [org.id],
      ),
    ).rejects.toThrow(/check constraint|slot_number/i);
  });

  it('rejects a duplicate live claim for the same slot at the database level', async () => {
    const orgA = await makeOrg(1);
    const orgB = await makeOrg(2);
    await asService(
      `insert into public.founder_claims (organization_id, slot_number, status) values ($1, 7, 'active')`,
      [orgA.id],
    );
    await expect(
      asService(
        `insert into public.founder_claims (organization_id, slot_number, status) values ($1, 7, 'reserved')`,
        [orgB.id],
      ),
    ).rejects.toThrow(/duplicate key|unique/i);
  });
});
