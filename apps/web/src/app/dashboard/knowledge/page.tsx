import type { Metadata } from 'next';
import { requireSession } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase/server';
import { Alert, Card, CardContent } from '@/components/ui';
import { KnowledgeTabs } from '@/components/dashboard/knowledge-tabs';

export const metadata: Metadata = { title: 'Knowledge' };
export const dynamic = 'force-dynamic';

/**
 * Everything the receptionist knows about the business, in one editable place.
 * Anything the training conversation extracted is visible and changeable here —
 * there is no hidden knowledge.
 */
export default async function KnowledgePage() {
  const ctx = await requireSession();
  const svc = getServiceSupabase();
  const organizationId = ctx.active.organizationId;
  const canEdit = ctx.active.role !== 'staff';

  const [business, services, faqs, policies, areas, documents] = await Promise.all([
    svc.from('business_profiles').select('*').eq('organization_id', organizationId).maybeSingle(),
    svc.from('services').select('*').eq('organization_id', organizationId).order('name'),
    svc.from('faqs').select('*').eq('organization_id', organizationId).order('created_at'),
    svc.from('business_policies').select('*').eq('organization_id', organizationId).order('kind'),
    svc.from('service_areas').select('*').eq('organization_id', organizationId).order('created_at'),
    svc
      .from('knowledge_documents')
      .select('id, filename, mime_type, size_bytes, processing_status, processing_error, created_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false }),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Knowledge</h1>
        <p className="mt-1 text-sm text-ink-muted">
          What your receptionist knows and is allowed to say. Edits apply to the next call.
        </p>
      </header>

      {!canEdit && (
        <Alert tone="neutral" title="Read-only">
          Your role can view this but not change it.
        </Alert>
      )}

      <Card>
        <CardContent className="pt-5">
          <KnowledgeTabs
            canEdit={canEdit}
            business={business.data as Record<string, unknown> | null}
            services={(services.data ?? []) as Array<Record<string, unknown>>}
            faqs={(faqs.data ?? []) as Array<Record<string, unknown>>}
            policies={(policies.data ?? []) as Array<Record<string, unknown>>}
            areas={(areas.data ?? []) as Array<Record<string, unknown>>}
            documents={(documents.data ?? []) as Array<Record<string, unknown>>}
          />
        </CardContent>
      </Card>
    </div>
  );
}
