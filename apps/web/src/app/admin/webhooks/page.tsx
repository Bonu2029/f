import type { Metadata } from 'next';
import { requirePlatformAdmin } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase/server';
import { Badge, Card, CardContent, CardHeader, CardTitle, Table, Td, Th } from '@/components/ui';

export const metadata: Metadata = { title: 'Webhook health', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function AdminWebhooksPage() {
  await requirePlatformAdmin();
  const svc = getServiceSupabase();

  const { data: events } = await svc
    .from('webhook_events')
    .select('id, provider, provider_event_id, event_type, status, error_message, received_at, processed_at')
    .order('received_at', { ascending: false })
    .limit(100);

  const failed = (events ?? []).filter((e) => e.status === 'failed');

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Webhook health</h1>
      <p className="text-sm text-ink-muted">
        Every inbound provider webhook is recorded here before processing. A duplicate delivery is
        rejected by the same table, which is what makes retries safe.
      </p>

      {failed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Failed deliveries ({failed.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {failed.slice(0, 10).map((e) => (
                <li key={e.id as string} className="rounded-lg border border-red-200 bg-critical-soft p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone="critical">
                      {e.provider as string} · {e.event_type as string}
                    </Badge>
                    <span className="text-xs text-ink-subtle">
                      {new Date(e.received_at as string).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 text-red-900">{(e.error_message as string) ?? 'No detail recorded.'}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent events</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <thead>
              <tr>
                <Th>Provider</Th>
                <Th>Type</Th>
                <Th>Status</Th>
                <Th className="text-right">Received</Th>
              </tr>
            </thead>
            <tbody>
              {(events ?? []).map((e) => (
                <tr key={e.id as string}>
                  <Td className="text-sm">{e.provider as string}</Td>
                  <Td className="text-sm text-ink-muted">{e.event_type as string}</Td>
                  <Td>
                    <Badge
                      tone={
                        e.status === 'processed'
                          ? 'positive'
                          : e.status === 'failed'
                            ? 'critical'
                            : e.status === 'skipped'
                              ? 'neutral'
                              : 'caution'
                      }
                    >
                      {e.status as string}
                    </Badge>
                  </Td>
                  <Td className="text-right text-sm text-ink-subtle">
                    {new Date(e.received_at as string).toLocaleString()}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
