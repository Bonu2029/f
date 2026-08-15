import 'server-only';
import type { ExtractedKnowledge } from '@/lib/providers/types';
import { getServiceSupabase } from '@/lib/supabase/server';
import { log } from '@/lib/logger';

/**
 * Persists knowledge extracted by the AI.
 *
 * Two rules make this safe to run automatically:
 *   1. Nothing is hidden — every write is echoed back to the UI as a list of
 *      changes, and the owner can edit or delete any of it in the Knowledge
 *      section.
 *   2. Nothing is destructive — existing records are updated or skipped, never
 *      silently replaced, so a misheard sentence cannot wipe a service list.
 */

export interface AppliedChange {
  kind: 'service' | 'faq' | 'policy' | 'service_area' | 'rule' | 'business';
  label: string;
  action: 'created' | 'updated' | 'skipped';
}

const dollarsToCents = (v: number | null | undefined) =>
  v == null || !Number.isFinite(v) ? null : Math.round(v * 100);

export async function applyExtractedKnowledge(
  organizationId: string,
  extracted: ExtractedKnowledge,
): Promise<AppliedChange[]> {
  const svc = getServiceSupabase();
  const changes: AppliedChange[] = [];

  /* Services ------------------------------------------------------------- */
  for (const s of (extracted.services ?? []).slice(0, 25)) {
    const name = s.name?.trim();
    if (!name) continue;

    const { data: existing } = await svc
      .from('services')
      .select('id, price_type, exact_price, starting_price')
      .eq('organization_id', organizationId)
      .ilike('name', name)
      .maybeSingle();

    const payload = {
      organization_id: organizationId,
      name,
      description: s.description ?? null,
      price_type: s.price_type ?? 'quote_only',
      starting_price: dollarsToCents(s.starting_price),
      exact_price: dollarsToCents(s.exact_price),
      max_price: dollarsToCents(s.max_price),
      price_notes: s.price_notes ?? null,
      estimated_duration: s.estimated_duration ?? null,
      active: true,
    };

    if (existing) {
      // Only fill gaps — never overwrite a price the owner already curated.
      const patch: Record<string, unknown> = {};
      if (payload.description) patch.description = payload.description;
      if (existing.price_type === 'quote_only' && payload.price_type !== 'quote_only') {
        patch.price_type = payload.price_type;
        patch.exact_price = payload.exact_price;
        patch.starting_price = payload.starting_price;
        patch.max_price = payload.max_price;
      }
      if (Object.keys(patch).length === 0) {
        changes.push({ kind: 'service', label: name, action: 'skipped' });
        continue;
      }
      await svc.from('services').update(patch).eq('id', existing.id);
      changes.push({ kind: 'service', label: name, action: 'updated' });
    } else {
      const { error } = await svc.from('services').insert(payload);
      changes.push({
        kind: 'service',
        label: name,
        action: error ? 'skipped' : 'created',
      });
    }
  }

  /* FAQs ----------------------------------------------------------------- */
  for (const f of (extracted.faqs ?? []).slice(0, 20)) {
    if (!f.question?.trim() || !f.answer?.trim()) continue;
    const { data: existing } = await svc
      .from('faqs')
      .select('id')
      .eq('organization_id', organizationId)
      .ilike('question', f.question.trim())
      .maybeSingle();
    if (existing) {
      changes.push({ kind: 'faq', label: f.question, action: 'skipped' });
      continue;
    }
    await svc.from('faqs').insert({
      organization_id: organizationId,
      question: f.question.trim(),
      answer: f.answer.trim(),
      active: true,
    });
    changes.push({ kind: 'faq', label: f.question, action: 'created' });
  }

  /* Policies ------------------------------------------------------------- */
  for (const p of (extracted.policies ?? []).slice(0, 15)) {
    if (!p.title?.trim() || !p.body?.trim()) continue;
    const { data: existing } = await svc
      .from('business_policies')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('kind', p.kind)
      .maybeSingle();

    if (existing) {
      await svc.from('business_policies').update({ title: p.title, body: p.body }).eq('id', existing.id);
      changes.push({ kind: 'policy', label: p.title, action: 'updated' });
    } else {
      await svc.from('business_policies').insert({
        organization_id: organizationId,
        kind: p.kind,
        title: p.title,
        body: p.body,
        active: true,
      });
      changes.push({ kind: 'policy', label: p.title, action: 'created' });
    }
  }

  /* Service areas -------------------------------------------------------- */
  for (const a of (extracted.service_areas ?? []).slice(0, 60)) {
    const identity =
      a.type === 'postal_code'
        ? a.postal_code
        : a.type === 'city'
          ? a.city
          : a.type === 'state'
            ? a.state
            : a.center_postal_code;
    if (!identity) continue;

    const query = svc
      .from('service_areas')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('type', a.type);

    const { data: existing } = await (a.type === 'postal_code'
      ? query.eq('postal_code', identity)
      : a.type === 'city'
        ? query.ilike('city', identity)
        : a.type === 'state'
          ? query.ilike('state', identity)
          : query.eq('center_postal_code', identity)
    ).maybeSingle();

    if (existing) {
      changes.push({ kind: 'service_area', label: identity, action: 'skipped' });
      continue;
    }

    await svc.from('service_areas').insert({
      organization_id: organizationId,
      type: a.type,
      city: a.city ?? null,
      state: a.state ?? null,
      postal_code: a.postal_code ?? null,
      center_postal_code: a.center_postal_code ?? null,
      radius_miles: a.radius_miles ?? null,
      active: true,
    });
    changes.push({ kind: 'service_area', label: identity, action: 'created' });
  }

  /* Owner rules ---------------------------------------------------------- */
  for (const r of (extracted.rules ?? []).slice(0, 10)) {
    if (!r.title?.trim() || !r.instruction?.trim()) continue;
    const { data: existing } = await svc
      .from('ai_rules')
      .select('id')
      .eq('organization_id', organizationId)
      .ilike('title', r.title.trim())
      .maybeSingle();
    if (existing) {
      changes.push({ kind: 'rule', label: r.title, action: 'skipped' });
      continue;
    }
    await svc.from('ai_rules').insert({
      organization_id: organizationId,
      title: r.title.trim(),
      instruction: r.instruction.trim(),
      priority: 200,
      enabled: true,
      is_system: false,
    });
    changes.push({ kind: 'rule', label: r.title, action: 'created' });
  }

  /* Business profile ----------------------------------------------------- */
  const b = extracted.business;
  if (b && (b.business_description || b.emergency_information || b.business_hours?.length)) {
    const patch: Record<string, unknown> = {};
    if (b.business_description) patch.business_description = b.business_description;
    if (b.emergency_information) patch.emergency_information = b.emergency_information;
    if (b.business_hours?.length) patch.business_hours = b.business_hours;

    await svc.from('business_profiles').update(patch).eq('organization_id', organizationId);
    changes.push({
      kind: 'business',
      label: Object.keys(patch).join(', ').replace(/_/g, ' '),
      action: 'updated',
    });
  }

  if (changes.length) {
    log.info('knowledge applied', {
      organization_id: organizationId,
      event: 'knowledge.applied',
      created: changes.filter((c) => c.action === 'created').length,
      updated: changes.filter((c) => c.action === 'updated').length,
    });
  }

  return changes;
}

/**
 * Splits document text into overlapping chunks for retrieval. Small, boring and
 * deterministic — good enough for the size of knowledge base a local business
 * has, and it keeps retrieval inside Postgres full-text search.
 */
export function chunkText(text: string, chunkSize = 1200, overlap = 150): string[] {
  const clean = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (clean.length <= chunkSize) return clean ? [clean] : [];

  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + chunkSize, clean.length);
    if (end < clean.length) {
      // Prefer a paragraph or sentence boundary near the end of the window.
      const window = clean.slice(start, end);
      const breakAt = Math.max(window.lastIndexOf('\n\n'), window.lastIndexOf('. '));
      if (breakAt > chunkSize * 0.5) end = start + breakAt + 1;
    }
    const piece = clean.slice(start, end).trim();
    if (piece) chunks.push(piece);
    if (end >= clean.length) break;
    start = end - overlap;
  }
  return chunks.slice(0, 500);
}

/** Extracts plain text from an uploaded document. */
export async function extractDocumentText(
  buffer: Buffer,
  mimeType: string,
  filename: string,
): Promise<{ text: string; warning?: string }> {
  if (mimeType.startsWith('text/') || /\.(txt|md|csv)$/i.test(filename)) {
    return { text: buffer.toString('utf8') };
  }

  if (mimeType === 'application/pdf' || /\.pdf$/i.test(filename)) {
    return extractPdfText(buffer);
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    /\.docx$/i.test(filename)
  ) {
    return extractDocxText(buffer);
  }

  return { text: '', warning: `No text extractor is available for ${mimeType}.` };
}

/**
 * Minimal PDF text extraction: pulls literal strings out of uncompressed
 * content streams. It handles the text-based PDFs small businesses actually
 * upload (price lists, service sheets) and reports honestly when it cannot —
 * a scanned PDF yields a warning rather than silently empty knowledge.
 */
function extractPdfText(buffer: Buffer): { text: string; warning?: string } {
  const raw = buffer.toString('latin1');
  const pieces: string[] = [];

  // Text-showing operators: (string) Tj  and  [(a) -2 (b)] TJ
  const showRegex = /\((?:\\.|[^\\()])*\)\s*Tj|\[(?:[^\]]*)\]\s*TJ/g;
  let match: RegExpExecArray | null;
  while ((match = showRegex.exec(raw)) !== null) {
    const literals = match[0].match(/\((?:\\.|[^\\()])*\)/g) ?? [];
    for (const lit of literals) {
      pieces.push(
        lit
          .slice(1, -1)
          .replace(/\\([()\\])/g, '$1')
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '')
          .replace(/\\t/g, ' '),
      );
    }
    pieces.push(' ');
  }

  const text = pieces.join('').replace(/[ \t]{2,}/g, ' ').trim();
  if (text.length < 40) {
    return {
      text,
      warning:
        'Very little text could be read from this PDF. It is probably a scan — upload a text-based PDF, or paste the content into a service, FAQ or policy instead.',
    };
  }
  if (/FlateDecode/.test(raw) && text.length < 200) {
    return {
      text,
      warning:
        'This PDF uses compressed content streams that could not be fully read. Some of the document may be missing from your knowledge base.',
    };
  }
  return { text };
}

/**
 * DOCX text extraction. A .docx is a ZIP; word/document.xml holds the body.
 * We read the ZIP central directory and inflate the entry with zlib, so there
 * is no third-party parser in the trust path for user-uploaded files.
 */
async function extractDocxText(buffer: Buffer): Promise<{ text: string; warning?: string }> {
  const { inflateRawSync } = await import('node:zlib');

  // Find the local file header for word/document.xml.
  const needle = Buffer.from('word/document.xml');
  let offset = -1;
  for (let i = 0; i + 4 <= buffer.length; i++) {
    if (buffer.readUInt32LE(i) === 0x04034b50) {
      const nameLen = buffer.readUInt16LE(i + 26);
      const extraLen = buffer.readUInt16LE(i + 28);
      const name = buffer.subarray(i + 30, i + 30 + nameLen);
      if (name.equals(needle)) {
        const method = buffer.readUInt16LE(i + 8);
        const compressedSize = buffer.readUInt32LE(i + 18);
        const dataStart = i + 30 + nameLen + extraLen;
        try {
          const data = buffer.subarray(dataStart, dataStart + compressedSize);
          const xml = method === 0 ? data.toString('utf8') : inflateRawSync(data).toString('utf8');
          return { text: xmlToText(xml) };
        } catch {
          return { text: '', warning: 'This .docx file could not be decompressed.' };
        }
      }
      offset = i;
    }
  }

  return {
    text: '',
    warning:
      offset === -1
        ? 'This does not look like a valid .docx file.'
        : 'The document body could not be located inside the .docx file.',
  };
}

function xmlToText(xml: string): string {
  return xml
    .replace(/<w:p\b[^>]*>/g, '\n')
    .replace(/<w:tab\b[^>]*\/>/g, '\t')
    .replace(/<w:br\b[^>]*\/>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
