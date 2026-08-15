import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  asService,
  closePool,
  createOrganization,
  createUser,
  hasDatabase,
  resetSchema,
  truncateAll,
  type TestOrg,
} from '../support/db.js';

/**
 * Call routing, usage metering and webhook idempotency, against the real
 * database functions.
 */
const describeDb = hasDatabase ? describe : describe.skip;

async function seedOrg(slug: string): Promise<TestOrg> {
  const user = await createUser(`${slug}@calls.test`);
  return createOrganization({ name: `Org ${slug}`, slug, ownerId: user.id });
}

async function attachNumber(orgId: string, number: string, status = 'active') {
  await asService(
    `insert into public.phone_numbers (organization_id, phone_number, vapi_phone_number_id, status)
     values ($1, $2, $3, $4)`,
    [orgId, number, `pn_${Math.random().toString(36).slice(2, 12)}`, status],
  );
}

/** Binds an assistant id to the organisation, the way a successful sync does. */
async function attachAssistant(orgId: string, assistantId: string) {
  await asService('update public.ai_agents set vapi_assistant_id = $2 where organization_id = $1', [
    orgId,
    assistantId,
  ]);
}

async function resolve(assistantId: string) {
  const { rows } = await asService<{
    organization_id: string | null;
    servable: boolean;
    reason: string;
  }>('select * from public.resolve_call_by_assistant($1)', [assistantId]);
  return rows[0]!;
}

async function createCall(orgId: string, vapiCallId: string) {
  const { rows } = await asService<{ id: string }>(
    `insert into public.calls
       (organization_id, vapi_call_id, caller_phone, business_phone, answered_at)
     values ($1, $2, '+12155550100', '+12155550142', now())
     returning id`,
    [orgId, vapiCallId],
  );
  return rows[0]!.id;
}

describeDb('inbound call routing', () => {
  let org: TestOrg;

  beforeAll(async () => {
    await resetSchema();
  }, 60_000);

  beforeEach(async () => {
    await truncateAll();
    org = await seedOrg('routing-org');
    await attachNumber(org.id, '+12155550142');
    await attachAssistant(org.id, 'asst_routing_org');
  });

  afterAll(async () => {
    await closePool();
  });

  it('resolves an assistant id to the owning organisation', async () => {
    const result = await resolve('asst_routing_org');
    expect(result.organization_id).toBe(org.id);
    expect(result.servable).toBe(true);
    expect(result.reason).toBe('ok');
  });

  it('rejects an assistant that belongs to nobody', async () => {
    const result = await resolve('asst_not_ours');
    expect(result.organization_id).toBeNull();
    expect(result.servable).toBe(false);
    expect(result.reason).toBe('unknown_assistant');
  });

  it('refuses to serve a paused receptionist', async () => {
    await asService('update public.organizations set ai_paused = true where id = $1', [org.id]);
    const result = await resolve('asst_routing_org');
    expect(result.servable).toBe(false);
    expect(result.reason).toBe('ai_paused');
    // Still attributed to the tenant, so the missed call is recorded for them.
    expect(result.organization_id).toBe(org.id);
  });

  it('refuses to serve an inactive agent', async () => {
    await asService('update public.ai_agents set active = false where organization_id = $1', [org.id]);
    const result = await resolve('asst_routing_org');
    expect(result.servable).toBe(false);
    expect(result.reason).toBe('agent_inactive');
  });

  it('refuses to serve a cancelled subscription', async () => {
    await asService(`update public.subscriptions set status = 'canceled' where organization_id = $1`, [
      org.id,
    ]);
    const result = await resolve('asst_routing_org');
    expect(result.servable).toBe(false);
    expect(result.reason).toBe('subscription_canceled');
  });

  it('still serves a past-due subscription so customers are not cut off mid-dispute', async () => {
    await asService(`update public.subscriptions set status = 'past_due' where organization_id = $1`, [
      org.id,
    ]);
    expect((await resolve('asst_routing_org')).servable).toBe(true);
  });

  it('prevents two organisations sharing one assistant id', async () => {
    const other = await seedOrg('other-org');
    await expect(attachAssistant(other.id, 'asst_routing_org')).rejects.toThrow(
      /duplicate key|unique/i,
    );
  });

  it('prevents two organisations holding the same live number', async () => {
    const other = await seedOrg('other-org-2');
    await expect(attachNumber(other.id, '+12155550142')).rejects.toThrow(/duplicate key|unique/i);
  });

  it('prevents duplicate call rows for one provider call id', async () => {
    await createCall(org.id, 'vapi_dup_1');
    await expect(createCall(org.id, 'vapi_dup_1')).rejects.toThrow(/duplicate key|unique/i);
  });
});

describeDb('usage metering', () => {
  let org: TestOrg;

  beforeAll(async () => {
    await resetSchema();
  }, 60_000);

  beforeEach(async () => {
    await truncateAll();
    org = await seedOrg('usage-org');
  });

  afterAll(async () => {
    await closePool();
  });

  async function record(callId: string, seconds: number) {
    const { rows } = await asService<{
      billable_minutes: number;
      used_minutes_before: number;
      used_minutes_after: number;
      already_recorded: boolean;
    }>('select * from public.record_call_usage($1, $2, $3)', [callId, seconds, '{}']);
    return rows[0]!;
  }

  it('rounds a call up to the next whole minute', async () => {
    const callId = await createCall(org.id, 'ext_usage_1');
    const result = await record(callId, 61);
    expect(result.billable_minutes).toBe(2);
    expect(result.used_minutes_after).toBe(2);
  });

  it('bills a one-second call as one minute', async () => {
    const callId = await createCall(org.id, 'ext_usage_2');
    expect((await record(callId, 1)).billable_minutes).toBe(1);
  });

  it('is idempotent — a retried recording does not double-bill', async () => {
    const callId = await createCall(org.id, 'ext_usage_3');
    const first = await record(callId, 120);
    expect(first.already_recorded).toBe(false);
    expect(first.used_minutes_after).toBe(2);

    const second = await record(callId, 120);
    expect(second.already_recorded).toBe(true);

    const sub = await asService<{ used_minutes: number }>(
      'select used_minutes from public.subscriptions where organization_id = $1',
      [org.id],
    );
    expect(sub.rows[0]!.used_minutes).toBe(2);

    const ledger = await asService<{ count: string }>(
      'select count(*)::text from public.usage_ledger where call_id = $1',
      [callId],
    );
    expect(Number(ledger.rows[0]!.count)).toBe(1);
  });

  it('sums per-call rounding rather than rounding the total', async () => {
    for (let i = 0; i < 3; i++) {
      const callId = await createCall(org.id, `ext_usage_sum_${i}`);
      await record(callId, 30); // 3 × 30s → 3 minutes, not 2
    }
    const sub = await asService<{ used_minutes: number }>(
      'select used_minutes from public.subscriptions where organization_id = $1',
      [org.id],
    );
    expect(sub.rows[0]!.used_minutes).toBe(3);
  });

  it('records demo calls without charging plan minutes', async () => {
    const { rows } = await asService<{ id: string }>(
      `insert into public.calls
         (organization_id, vapi_call_id, answered_at, is_demo)
       values ($1, 'vapi_demo', now(), true) returning id`,
      [org.id],
    );
    const result = await record(rows[0]!.id, 300);
    expect(result.billable_minutes).toBe(5);
    expect(result.used_minutes_after).toBe(0);

    const sub = await asService<{ used_minutes: number }>(
      'select used_minutes from public.subscriptions where organization_id = $1',
      [org.id],
    );
    expect(sub.rows[0]!.used_minutes).toBe(0);
  });

  it('resets the allowance at the start of a new billing period', async () => {
    const callId = await createCall(org.id, 'ext_usage_reset');
    await record(callId, 600);

    const start = new Date();
    const end = new Date(start.getTime() + 30 * 86_400_000);
    await asService('select public.reset_usage_for_period($1, $2, $3)', [
      org.id,
      start.toISOString(),
      end.toISOString(),
    ]);

    const sub = await asService<{ used_minutes: number; billing_period_end: string }>(
      'select used_minutes, billing_period_end from public.subscriptions where organization_id = $1',
      [org.id],
    );
    expect(sub.rows[0]!.used_minutes).toBe(0);
    expect(new Date(sub.rows[0]!.billing_period_end).getTime()).toBeGreaterThan(Date.now());
  });
});

describeDb('webhook idempotency', () => {
  beforeAll(async () => {
    await resetSchema();
  }, 60_000);

  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await closePool();
  });

  async function claim(provider: string, eventId: string, type: string) {
    const { rows } = await asService<{ claim_webhook_event: boolean }>(
      'select public.claim_webhook_event($1, $2, $3, $4)',
      [provider, eventId, type, null],
    );
    return rows[0]!.claim_webhook_event;
  }

  it('claims an event once and rejects the retry', async () => {
    expect(await claim('stripe', 'evt_1', 'invoice.paid')).toBe(true);
    expect(await claim('stripe', 'evt_1', 'invoice.paid')).toBe(false);
    expect(await claim('stripe', 'evt_1', 'invoice.paid')).toBe(false);
  });

  it('treats the same id from different providers as different events', async () => {
    expect(await claim('stripe', 'shared_id', 'a')).toBe(true);
    expect(await claim('twilio', 'shared_id', 'b')).toBe(true);
    expect(await claim('openai', 'shared_id', 'c')).toBe(true);
  });

  it('records the processing outcome', async () => {
    await claim('stripe', 'evt_done', 'checkout.session.completed');
    await asService('select public.complete_webhook_event($1, $2, $3, $4)', [
      'stripe',
      'evt_done',
      'processed',
      null,
    ]);

    const { rows } = await asService<{ status: string; processed_at: string | null }>(
      'select status, processed_at from public.webhook_events where provider_event_id = $1',
      ['evt_done'],
    );
    expect(rows[0]!.status).toBe('processed');
    expect(rows[0]!.processed_at).not.toBeNull();
  });

  it('records a failure with its reason for the admin panel', async () => {
    await claim('stripe', 'evt_fail', 'invoice.paid');
    await asService('select public.complete_webhook_event($1, $2, $3, $4)', [
      'stripe',
      'evt_fail',
      'failed',
      'Downstream timeout',
    ]);

    const { rows } = await asService<{ status: string; error_message: string }>(
      'select status, error_message from public.webhook_events where provider_event_id = $1',
      ['evt_fail'],
    );
    expect(rows[0]!.status).toBe('failed');
    expect(rows[0]!.error_message).toBe('Downstream timeout');
  });

  it('survives concurrent deliveries of the same event', async () => {
    const results = await Promise.all(
      Array.from({ length: 8 }, () => claim('stripe', 'evt_race', 'invoice.paid').catch(() => false)),
    );
    expect(results.filter(Boolean)).toHaveLength(1);
  });
});

describeDb('appointment double-booking', () => {
  let org: TestOrg;

  beforeAll(async () => {
    await resetSchema();
  }, 60_000);

  beforeEach(async () => {
    await truncateAll();
    org = await seedOrg('booking-org');
  });

  afterAll(async () => {
    await closePool();
  });

  const slot = '2026-09-01T17:00:00.000Z';

  async function book(name: string) {
    return asService(
      `insert into public.appointments
         (organization_id, customer_name, start_at, end_at, status)
       values ($1, $2, $3, $4, 'scheduled')`,
      [org.id, name, slot, '2026-09-01T18:00:00.000Z'],
    );
  }

  it('refuses a second booking in the same slot', async () => {
    await book('First customer');
    await expect(book('Second customer')).rejects.toThrow(/duplicate key|unique/i);
  });

  it('frees the slot when the first booking is cancelled', async () => {
    await book('First customer');
    await asService(`update public.appointments set status = 'cancelled' where organization_id = $1`, [
      org.id,
    ]);
    await expect(book('Second customer')).resolves.toBeDefined();
  });

  it('does not block the same slot for a different organisation', async () => {
    await book('First customer');
    const other = await seedOrg('booking-org-2');
    await expect(
      asService(
        `insert into public.appointments
           (organization_id, customer_name, start_at, end_at, status)
         values ($1, 'Other tenant customer', $2, $3, 'scheduled')`,
        [other.id, slot, '2026-09-01T18:00:00.000Z'],
      ),
    ).resolves.toBeDefined();
  });

  it('rejects an appointment that ends before it starts', async () => {
    await expect(
      asService(
        `insert into public.appointments
           (organization_id, customer_name, start_at, end_at)
         values ($1, 'Backwards', $2, $3)`,
        [org.id, '2026-09-01T18:00:00.000Z', '2026-09-01T17:00:00.000Z'],
      ),
    ).rejects.toThrow(/appointments_time_valid|check constraint/i);
  });
});
