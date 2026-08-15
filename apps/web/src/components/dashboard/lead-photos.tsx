import { ImageOff } from 'lucide-react';
import { getServiceSupabase } from '@/lib/supabase/server';

/**
 * Renders photos a customer uploaded through their secure link.
 *
 * The bucket is private, so each image is served through a short-lived signed
 * URL minted here on the server after the caller's organisation membership has
 * already been checked by the page.
 */
export async function LeadPhotos({
  leadId,
  organizationId,
}: {
  leadId: string;
  organizationId: string;
}) {
  const svc = getServiceSupabase();
  const { data: photos } = await svc
    .from('lead_photos')
    .select('id, storage_path, uploaded_at')
    .eq('lead_id', leadId)
    .eq('organization_id', organizationId)
    .order('uploaded_at', { ascending: false })
    .limit(24);

  if (!photos || photos.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-ink-subtle">
        <ImageOff className="size-4" aria-hidden />
        No photos have been uploaded.
      </div>
    );
  }

  const signed = await Promise.all(
    photos.map(async (p) => {
      const { data } = await svc.storage
        .from('lead-photos')
        .createSignedUrl(p.storage_path as string, 60 * 10);
      return { id: p.id as string, url: data?.signedUrl ?? null, uploadedAt: p.uploaded_at as string };
    }),
  );

  return (
    <ul className="grid grid-cols-3 gap-2">
      {signed
        .filter((p) => p.url)
        .map((p) => (
          <li key={p.id}>
            <a href={p.url!} target="_blank" rel="noopener noreferrer" className="block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url!}
                alt={`Customer photo uploaded ${new Date(p.uploadedAt).toLocaleDateString()}`}
                className="aspect-square w-full rounded-lg border border-line object-cover transition-opacity hover:opacity-90"
                loading="lazy"
              />
            </a>
          </li>
        ))}
    </ul>
  );
}
