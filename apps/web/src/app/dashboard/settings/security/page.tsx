import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { requireSession } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase/server';
import { Alert, Card, CardContent, CardHeader, CardTitle, Table, Td, Th } from '@/components/ui';

export const metadata: Metadata = { title: 'Security' };
export const dynamic = 'force-dynamic';

export default async function SecurityPage() {
  const ctx = await requireSession();
  const canView = ctx.active.role !== 'staff';
  const svc = getServiceSupabase();

  const { data: logs } = canView
    ? await svc
        .from('audit_logs')
        .select('id, action, actor_email, target_type, target_id, metadata, created_at')
        .eq('organization_id', ctx.active.organizationId)
        .order('created_at', { ascending: false })
        .limit(50)
    : { data: [] };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-brand-600" aria-hidden />
            How your account is protected
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-ink-muted">
            <li>
              <strong className="text-ink">Tenant isolation.</strong> Your data is separated from
              every other business at the database level, not just in application code.
            </li>
            <li>
              <strong className="text-ink">No card data.</strong> Payment details go straight to
              Stripe. We never see or store them.
            </li>
            <li>
              <strong className="text-ink">Encrypted integrations.</strong> Google Calendar tokens are
              encrypted before storage and are never sent to your browser.
            </li>
            <li>
              <strong className="text-ink">Private files.</strong> Documents and customer photos live
              in private storage, reachable only through short-lived signed links.
            </li>
            <li>
              <strong className="text-ink">No call recordings.</strong> Audio is not recorded. Written
              transcripts are stored so you can see what happened.
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your sign-in</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-ink-muted">
            Signed in as <strong className="text-ink">{ctx.profile.email}</strong>.
          </p>
          <p>
            <Link href="/reset-password" className="font-medium text-brand-600 hover:underline">
              Change your password
            </Link>{' '}
            — you will receive an email link.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account activity</CardTitle>
        </CardHeader>
        <CardContent>
          {!canView ? (
            <Alert tone="neutral" title="Owners and admins only" />
          ) : (logs ?? []).length === 0 ? (
            <p className="text-sm text-ink-subtle">No recorded activity yet.</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>When</Th>
                  <Th>Action</Th>
                  <Th>By</Th>
                </tr>
              </thead>
              <tbody>
                {(logs ?? []).map((l) => (
                  <tr key={l.id as string}>
                    <Td className="whitespace-nowrap text-sm text-ink-muted">
                      {new Date(l.created_at as string).toLocaleString(undefined, {
                        timeZone: ctx.active.timezone,
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </Td>
                    <Td className="text-sm">{String(l.action).replace(/[._]/g, ' ')}</Td>
                    <Td className="text-sm text-ink-subtle">{(l.actor_email as string) ?? 'System'}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
