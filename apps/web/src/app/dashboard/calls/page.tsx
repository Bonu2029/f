import type { Metadata } from 'next';
import Link from 'next/link';
import { PhoneCall } from 'lucide-react';
import { formatDuration, formatPhone } from '@afd/shared';
import { requireSession } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase/server';
import { Badge, Card, CardContent, EmptyState, Table, Td, Th, Button, Select } from '@/components/ui';
import { labelFor } from '@/components/dashboard/charts';

export const metadata: Metadata = { title: 'Calls' };
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 25;

/**
 * Call history with server-side filtering and pagination. Transcripts are never
 * loaded here — only on the detail page — so a busy account does not pull
 * thousands of messages into one response.
 */
export default async function CallsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const ctx = await requireSession();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? '1') || 1);
  const outcome = params.outcome ?? '';
  const search = (params.q ?? '').trim();

  const svc = getServiceSupabase();
  let query = svc
    .from('calls')
    .select(
      'id, caller_phone, started_at, duration_seconds, result, disposition, transferred, appointment_booked, lead_id, summary, summary_json, is_demo',
      { count: 'exact' },
    )
    .eq('organization_id', ctx.active.organizationId);

  if (outcome === 'booked') query = query.eq('appointment_booked', true);
  else if (outcome === 'transferred') query = query.eq('transferred', true);
  else if (outcome === 'lead') query = query.not('lead_id', 'is', null);
  else if (outcome === 'failed') query = query.eq('result', 'failed');
  if (search) query = query.ilike('caller_phone', `%${search.replace(/\D/g, '')}%`);

  const { data: calls, count } = await query
    .order('started_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Calls</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {total} call{total === 1 ? '' : 's'} recorded.
        </p>
      </header>

      <Card>
        <CardContent className="pt-5">
          <form className="flex flex-wrap items-end gap-3" method="get">
            <div className="min-w-[180px] flex-1">
              <label htmlFor="q" className="block text-sm font-medium text-ink">
                Caller number
              </label>
              <input
                id="q"
                name="q"
                defaultValue={search}
                placeholder="Any digits, e.g. 5550143"
                className="mt-1.5 flex h-10 w-full rounded-lg border border-line-strong bg-surface px-3 text-sm shadow-soft"
              />
            </div>
            <div className="min-w-[160px]">
              <label htmlFor="outcome" className="block text-sm font-medium text-ink">
                Outcome
              </label>
              <Select id="outcome" name="outcome" defaultValue={outcome} className="mt-1.5">
                <option value="">All calls</option>
                <option value="booked">Appointment booked</option>
                <option value="lead">Lead created</option>
                <option value="transferred">Transferred</option>
                <option value="failed">Failed</option>
              </Select>
            </div>
            <Button type="submit" variant="secondary">
              Filter
            </Button>
            {(search || outcome) && (
              <Button asChild variant="ghost">
                <Link href="/dashboard/calls">Clear</Link>
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          {(calls ?? []).length === 0 ? (
            <EmptyState
              icon={<PhoneCall className="size-6" aria-hidden />}
              title={search || outcome ? 'No calls match those filters' : 'No calls yet'}
              description={
                search || outcome
                  ? 'Try widening the filters.'
                  : 'Once your receptionist starts answering, conversations will appear here.'
              }
            />
          ) : (
            <>
              <Table>
                <thead>
                  <tr>
                    <Th>Caller</Th>
                    <Th>Reason</Th>
                    <Th>Result</Th>
                    <Th className="text-right">Duration</Th>
                    <Th className="text-right">When</Th>
                  </tr>
                </thead>
                <tbody>
                  {(calls ?? []).map((call) => {
                    const summary = call.summary_json as { reason?: string } | null;
                    return (
                      <tr key={call.id} className="hover:bg-surface-sunken">
                        <Td>
                          <Link href={`/dashboard/calls/${call.id}`} className="font-medium tabular hover:underline">
                            {formatPhone(call.caller_phone as string) || 'Unknown'}
                          </Link>
                          {call.is_demo && (
                            <Badge tone="caution" className="ml-2">
                              Demo
                            </Badge>
                          )}
                        </Td>
                        <Td className="max-w-[280px]">
                          <span className="line-clamp-2 text-sm text-ink-muted">
                            {summary?.reason ?? call.summary ?? '—'}
                          </span>
                        </Td>
                        <Td>
                          <Badge
                            tone={
                              call.result === 'failed'
                                ? 'critical'
                                : call.appointment_booked
                                  ? 'positive'
                                  : call.transferred
                                    ? 'brand'
                                    : 'neutral'
                            }
                          >
                            {call.result === 'failed'
                              ? 'Not answered'
                              : call.appointment_booked
                                ? 'Booked'
                                : call.transferred
                                  ? 'Transferred'
                                  : labelFor((call.disposition as string) ?? 'unrecorded')}
                          </Badge>
                        </Td>
                        <Td className="text-right tabular text-ink-muted">
                          {formatDuration(call.duration_seconds as number)}
                        </Td>
                        <Td className="text-right text-sm text-ink-subtle">
                          {new Date(call.started_at as string).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
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
                      <Link href={`/dashboard/calls?page=${page - 1}&outcome=${outcome}&q=${search}`}>
                        Previous
                      </Link>
                    </Button>
                    <Button asChild variant="secondary" size="sm" disabled={page >= pages}>
                      <Link href={`/dashboard/calls?page=${page + 1}&outcome=${outcome}&q=${search}`}>
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
