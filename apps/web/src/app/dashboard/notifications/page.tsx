import type { Metadata } from 'next';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { requireSession } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase/server';
import { Badge, Card, CardContent, EmptyState } from '@/components/ui';
import { MarkAllRead } from './mark-all-read';

export const metadata: Metadata = { title: 'Notifications' };
export const dynamic = 'force-dynamic';

const TONE: Record<string, 'neutral' | 'brand' | 'positive' | 'caution' | 'critical'> = {
  lead_created: 'brand',
  appointment_booked: 'positive',
  transfer_failed: 'caution',
  usage_70: 'neutral',
  usage_90: 'caution',
  usage_100: 'caution',
  payment_failed: 'critical',
  calendar_disconnected: 'caution',
  phone_issue: 'critical',
  ai_unavailable: 'critical',
};

export default async function NotificationsPage() {
  const ctx = await requireSession();
  const svc = getServiceSupabase();

  const { data: notifications } = await svc
    .from('notifications')
    .select('*')
    .eq('organization_id', ctx.active.organizationId)
    .order('created_at', { ascending: false })
    .limit(100);

  const unread = (notifications ?? []).filter((n) => !n.read_at).length;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Notifications</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {unread > 0 ? `${unread} unread` : 'You are all caught up.'}
          </p>
        </div>
        {unread > 0 && <MarkAllRead />}
      </header>

      <Card>
        <CardContent className="pt-5">
          {(notifications ?? []).length === 0 ? (
            <EmptyState
              icon={<Bell className="size-6" aria-hidden />}
              title="Nothing yet"
              description="New leads, bookings, usage alerts and billing problems will appear here."
            />
          ) : (
            <ul className="divide-y divide-line">
              {(notifications ?? []).map((n) => {
                const body = (
                  <div className="flex items-start gap-3 py-3">
                    <span
                      aria-hidden
                      className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read_at ? 'bg-line-strong' : 'bg-brand-600'}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-ink">{n.title as string}</p>
                        <Badge tone={TONE[n.kind as string] ?? 'neutral'}>
                          {String(n.kind).replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      {n.body && <p className="mt-0.5 text-sm text-ink-muted">{n.body as string}</p>}
                      <p className="mt-1 text-xs text-ink-subtle">
                        {new Date(n.created_at as string).toLocaleString(undefined, {
                          timeZone: ctx.active.timezone,
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </p>
                    </div>
                  </div>
                );
                return (
                  <li key={n.id as string}>
                    {n.link ? (
                      <Link href={n.link as string} className="block hover:bg-surface-sunken">
                        {body}
                      </Link>
                    ) : (
                      body
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
