import type { Metadata } from 'next';
import Link from 'next/link';
import { requirePlatformAdmin } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase/server';
import { Badge, Card, CardContent, EmptyState } from '@/components/ui';

export const metadata: Metadata = { title: 'System errors', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function AdminErrorsPage() {
  await requirePlatformAdmin();
  const svc = getServiceSupabase();

  const { data: events } = await svc
    .from('error_events')
    .select('id, organization_id, severity, scope, message, request_id, call_id, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">System errors</h1>
      <p className="text-sm text-ink-muted">
        Operational failures recorded by the application. Secrets are redacted before anything is
        written here.
      </p>

      <Card>
        <CardContent className="pt-5">
          {(events ?? []).length === 0 ? (
            <EmptyState title="No errors recorded" description="Nothing has failed recently." />
          ) : (
            <ul className="space-y-3">
              {(events ?? []).map((e) => (
                <li key={e.id as string} className="rounded-lg border border-line p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={e.severity === 'warn' ? 'caution' : 'critical'}>
                        {e.severity as string}
                      </Badge>
                      <Badge tone="neutral">{e.scope as string}</Badge>
                      {e.organization_id && (
                        <Link
                          href={`/admin/businesses/${e.organization_id as string}`}
                          className="text-xs font-medium text-brand-600 hover:underline"
                        >
                          View business
                        </Link>
                      )}
                    </div>
                    <span className="text-xs text-ink-subtle">
                      {new Date(e.created_at as string).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-ink">{e.message as string}</p>
                  {e.request_id && (
                    <p className="mt-1 text-xs tabular text-ink-subtle">request {e.request_id as string}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
