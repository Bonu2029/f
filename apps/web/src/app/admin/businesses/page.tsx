import type { Metadata } from 'next';
import Link from 'next/link';
import { formatPhone } from '@afd/shared';
import { requirePlatformAdmin } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase/server';
import { Badge, Button, Card, CardContent, Input, Table, Td, Th } from '@/components/ui';
import { StatusBadge } from '@/components/dashboard/badges';

export const metadata: Metadata = { title: 'Businesses' };
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 25;

export default async function AdminBusinessesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requirePlatformAdmin();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? '1') || 1);
  const q = (params.q ?? '').trim();

  const svc = getServiceSupabase();
  let query = svc
    .from('organizations')
    .select(
      'id, name, slug, status, created_at, ai_paused, is_demo, owner:profiles!organizations_owner_user_id_fkey(email), subscription:subscriptions(plan, status, used_minutes, included_minutes, founder, founder_slot, billing_period_end), phone:phone_numbers(phone_number, status)',
      { count: 'exact' },
    );

  if (q) query = query.ilike('name', `%${q}%`);

  const { data: orgs, count } = await query
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  type Row = {
    id: string;
    name: string;
    status: string;
    created_at: string;
    ai_paused: boolean;
    is_demo: boolean;
    owner: { email: string } | null;
    subscription: Array<{
      plan: string;
      status: string;
      used_minutes: number;
      included_minutes: number;
      founder: boolean;
      founder_slot: number | null;
      billing_period_end: string | null;
    }> | null;
    phone: Array<{ phone_number: string; status: string }> | null;
  };

  const rows = (orgs ?? []) as unknown as Row[];
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Businesses <span className="text-base font-normal text-ink-subtle">({count ?? 0})</span>
        </h1>
        <form method="get" className="flex gap-2">
          <Input name="q" defaultValue={q} placeholder="Search by name" className="w-56" aria-label="Search businesses" />
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
      </div>

      <Card>
        <CardContent className="pt-5">
          <Table>
            <thead>
              <tr>
                <Th>Business</Th>
                <Th>Owner</Th>
                <Th>Plan</Th>
                <Th>Status</Th>
                <Th>Phone</Th>
                <Th className="text-right">Minutes</Th>
                <Th className="text-right">Created</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((org) => {
                const sub = org.subscription?.[0];
                const phone = org.phone?.find((p) => p.status === 'active');
                return (
                  <tr key={org.id} className="hover:bg-surface-sunken">
                    <Td>
                      <Link href={`/admin/businesses/${org.id}`} className="font-medium hover:underline">
                        {org.name}
                      </Link>
                      <div className="mt-0.5 flex gap-1">
                        {org.is_demo && <Badge tone="caution">Demo</Badge>}
                        {org.ai_paused && <Badge tone="critical">Paused</Badge>}
                      </div>
                    </Td>
                    <Td className="text-sm text-ink-muted">{org.owner?.email ?? '—'}</Td>
                    <Td>
                      {sub?.founder ? (
                        <Badge tone="brand">Founder #{sub.founder_slot}</Badge>
                      ) : (
                        <span className="text-sm text-ink-muted">{sub?.plan ?? '—'}</span>
                      )}
                    </Td>
                    <Td>
                      <StatusBadge status={sub?.status ?? org.status} />
                    </Td>
                    <Td className="tabular text-sm text-ink-muted">
                      {phone ? formatPhone(phone.phone_number) : '—'}
                    </Td>
                    <Td className="text-right tabular text-sm">
                      {sub ? `${sub.used_minutes} / ${sub.included_minutes}` : '—'}
                    </Td>
                    <Td className="text-right text-sm text-ink-subtle">
                      {new Date(org.created_at).toLocaleDateString()}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>

          {pages > 1 && (
            <nav className="mt-4 flex items-center justify-between" aria-label="Pagination">
              <p className="text-sm text-ink-subtle">
                Page {page} of {pages}
              </p>
              <div className="flex gap-2">
                <Button asChild variant="secondary" size="sm" disabled={page <= 1}>
                  <Link href={`/admin/businesses?page=${page - 1}&q=${q}`}>Previous</Link>
                </Button>
                <Button asChild variant="secondary" size="sm" disabled={page >= pages}>
                  <Link href={`/admin/businesses?page=${page + 1}&q=${q}`}>Next</Link>
                </Button>
              </div>
            </nav>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
