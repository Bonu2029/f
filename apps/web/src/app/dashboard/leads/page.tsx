import type { Metadata } from 'next';
import Link from 'next/link';
import { Users } from 'lucide-react';
import { LEAD_STATUSES, formatPhone } from '@afd/shared';
import { requireSession } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase/server';
import { Button, Card, CardContent, EmptyState, Select, Table, Td, Th } from '@/components/ui';
import { LeadScoreBadge, StatusBadge, UrgencyBadge } from '@/components/dashboard/badges';

export const metadata: Metadata = { title: 'Leads' };
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 25;

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const ctx = await requireSession();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? '1') || 1);
  const status = params.status ?? '';
  const score = params.score ?? '';

  const svc = getServiceSupabase();
  let query = svc
    .from('leads')
    .select(
      'id, name, phone, service_requested, lead_score, status, urgency, city, state, postal_code, created_at, source',
      { count: 'exact' },
    )
    .eq('organization_id', ctx.active.organizationId);

  if (status) query = query.eq('status', status);
  if (score) query = query.eq('lead_score', score);

  const { data: leads, count } = await query
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Leads</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {total} lead{total === 1 ? '' : 's'} captured.
        </p>
      </header>

      <Card>
        <CardContent className="pt-5">
          <form className="flex flex-wrap items-end gap-3" method="get">
            <div className="min-w-[160px]">
              <label htmlFor="status" className="block text-sm font-medium text-ink">
                Status
              </label>
              <Select id="status" name="status" defaultValue={status} className="mt-1.5">
                <option value="">All statuses</option>
                {LEAD_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, ' ')}
                  </option>
                ))}
              </Select>
            </div>
            <div className="min-w-[140px]">
              <label htmlFor="score" className="block text-sm font-medium text-ink">
                Score
              </label>
              <Select id="score" name="score" defaultValue={score} className="mt-1.5">
                <option value="">Any score</option>
                <option value="hot">Hot</option>
                <option value="warm">Warm</option>
                <option value="cold">Cold</option>
              </Select>
            </div>
            <Button type="submit" variant="secondary">
              Filter
            </Button>
            {(status || score) && (
              <Button asChild variant="ghost">
                <Link href="/dashboard/leads">Clear</Link>
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          {(leads ?? []).length === 0 ? (
            <EmptyState
              icon={<Users className="size-6" aria-hidden />}
              title={status || score ? 'No leads match those filters' : 'No leads yet'}
              description={
                status || score
                  ? 'Try clearing the filters.'
                  : 'Callers your receptionist captures details from will show up here.'
              }
            />
          ) : (
            <>
              <Table>
                <thead>
                  <tr>
                    <Th>Customer</Th>
                    <Th>Service</Th>
                    <Th>Location</Th>
                    <Th>Urgency</Th>
                    <Th>Score</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {(leads ?? []).map((lead) => (
                    <tr key={lead.id} className="hover:bg-surface-sunken">
                      <Td>
                        <Link href={`/dashboard/leads/${lead.id}`} className="font-medium hover:underline">
                          {(lead.name as string) || 'Unnamed caller'}
                        </Link>
                        <p className="text-xs tabular text-ink-subtle">
                          {formatPhone(lead.phone as string) || 'No number'}
                        </p>
                      </Td>
                      <Td className="text-sm text-ink-muted">{(lead.service_requested as string) ?? '—'}</Td>
                      <Td className="text-sm text-ink-muted">
                        {[lead.city, lead.state, lead.postal_code].filter(Boolean).join(', ') || '—'}
                      </Td>
                      <Td>
                        <UrgencyBadge urgency={lead.urgency as string} />
                      </Td>
                      <Td>
                        <LeadScoreBadge score={lead.lead_score as 'hot' | 'warm' | 'cold'} />
                      </Td>
                      <Td>
                        <StatusBadge status={lead.status as string} />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>

              {pages > 1 && (
                <nav className="mt-4 flex items-center justify-between" aria-label="Pagination">
                  <p className="text-sm text-ink-subtle">
                    Page {page} of {pages}
                  </p>
                  <div className="flex gap-2">
                    <Button asChild variant="secondary" size="sm" disabled={page <= 1}>
                      <Link href={`/dashboard/leads?page=${page - 1}&status=${status}&score=${score}`}>
                        Previous
                      </Link>
                    </Button>
                    <Button asChild variant="secondary" size="sm" disabled={page >= pages}>
                      <Link href={`/dashboard/leads?page=${page + 1}&status=${status}&score=${score}`}>
                        Next
                      </Link>
                    </Button>
                  </div>
                </nav>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
