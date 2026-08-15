import { NextResponse, type NextRequest } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase/server';
import { errorResponse, errors } from '@/lib/errors';
import { AUDIT_ACTIONS, recordAudit } from '@/lib/audit';
import { newRequestId, childLogger } from '@/lib/logger';
import { chunkText, extractDocumentText } from '@/server/knowledge';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED = new Set([
  'application/pdf',
  'text/plain',
  'text/csv',
  'text/markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

/**
 * Uploads a knowledge document, extracts its text server-side and indexes it
 * for organisation-scoped retrieval.
 *
 * The storage key is prefixed with the organisation id, which is what the
 * storage RLS policies match on — a file can only ever be read by members of
 * the organisation that owns it.
 */
export async function POST(request: NextRequest) {
  const requestId = newRequestId();
  const logger = childLogger({ request_id: requestId, event: 'knowledge.upload' });

  try {
    const ctx = await requireRole('admin');
    const organizationId = ctx.active.organizationId;

    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) throw errors.uploadRejected('No file was received.');

    if (file.size > MAX_BYTES) {
      throw errors.uploadRejected(`That file is ${(file.size / 1e6).toFixed(1)} MB. The limit is 25 MB.`);
    }
    if (file.size === 0) throw errors.uploadRejected('That file is empty.');

    const mimeType = file.type || 'application/octet-stream';
    if (!ALLOWED.has(mimeType)) {
      throw errors.uploadRejected(
        `${mimeType} files are not supported. Upload a PDF, Word document, plain text or CSV file.`,
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const safeName = file.name.replace(/[^\w.\- ]+/g, '_').slice(0, 120);
    const storagePath = `${organizationId}/${crypto.randomUUID()}-${safeName}`;

    const svc = getServiceSupabase();
    const { error: uploadError } = await svc.storage
      .from('knowledge')
      .upload(storagePath, buffer, { contentType: mimeType, upsert: false });
    if (uploadError) {
      logger.error('storage upload failed', { error: uploadError.message });
      throw errors.providerUnavailable('File storage');
    }

    const { data: doc, error: insertError } = await svc
      .from('knowledge_documents')
      .insert({
        organization_id: organizationId,
        filename: safeName,
        storage_path: storagePath,
        mime_type: mimeType,
        size_bytes: file.size,
        processing_status: 'processing',
      })
      .select('id')
      .single();

    if (insertError || !doc) {
      await svc.storage.from('knowledge').remove([storagePath]);
      throw errors.conflict('The document could not be saved.');
    }

    // Extract and index. Failures are recorded on the row, not swallowed.
    try {
      const { text, warning } = await extractDocumentText(buffer, mimeType, safeName);
      const chunks = chunkText(text);

      if (chunks.length > 0) {
        await svc.from('knowledge_chunks').insert(
          chunks.map((content, i) => ({
            organization_id: organizationId,
            document_id: doc.id,
            chunk_index: i,
            content,
          })),
        );
      }

      await svc
        .from('knowledge_documents')
        .update({
          processing_status: chunks.length > 0 ? 'ready' : 'failed',
          extracted_text: text.slice(0, 200_000),
          processing_error:
            warning ?? (chunks.length === 0 ? 'No readable text was found in this file.' : null),
        })
        .eq('id', doc.id);

      await recordAudit({
        organizationId,
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email ?? null,
        action: AUDIT_ACTIONS.KNOWLEDGE_UPLOADED,
        targetType: 'knowledge_document',
        targetId: doc.id as string,
        metadata: { filename: safeName, chunks: chunks.length },
      });

      return NextResponse.json({
        id: doc.id,
        filename: safeName,
        chunks: chunks.length,
        status: chunks.length > 0 ? 'ready' : 'failed',
        warning: warning ?? null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await svc
        .from('knowledge_documents')
        .update({ processing_status: 'failed', processing_error: message.slice(0, 500) })
        .eq('id', doc.id);
      throw errors.uploadRejected(`The file uploaded but its text could not be read: ${message}`);
    }
  } catch (err) {
    return errorResponse(err, requestId);
  }
}
