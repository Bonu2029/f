'use client';

import { useRef, useState } from 'react';
import { Camera, CheckCircle2, ImagePlus, X } from 'lucide-react';
import { Alert, Button, Progress } from '@/components/ui';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif';
const MAX_BYTES = 15 * 1024 * 1024;

/**
 * Camera or library upload with client-side previews. All validation is
 * repeated server-side — this is purely so the customer gets an instant answer
 * instead of waiting for a rejected upload.
 */
export function UploadForm({
  token,
  maxFiles,
  expiresAt,
}: {
  token: string;
  maxFiles: number;
  expiresAt: string;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState(0);
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);

  function addFiles(list: FileList | null) {
    if (!list) return;
    setError(null);
    const incoming = Array.from(list);

    const tooBig = incoming.find((f) => f.size > MAX_BYTES);
    if (tooBig) {
      setError(`"${tooBig.name}" is too large. Each photo must be under 15 MB.`);
      return;
    }
    const combined = [...files, ...incoming].slice(0, maxFiles);
    if (files.length + incoming.length > maxFiles) {
      setError(`You can upload up to ${maxFiles} photo${maxFiles === 1 ? '' : 's'} with this link.`);
    }
    setFiles(combined);
  }

  async function submit() {
    if (files.length === 0) return;
    setStatus('uploading');
    setError(null);

    const body = new FormData();
    for (const f of files) body.append('files', f);

    try {
      const res = await fetch(`/api/upload/${encodeURIComponent(token)}`, { method: 'POST', body });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? 'The upload did not go through. Please try again.');
        setStatus('idle');
        return;
      }
      setUploaded(json.uploaded ?? files.length);
      setStatus('done');
      setFiles([]);
    } catch {
      setError('We could not reach the server. Check your connection and try again.');
      setStatus('idle');
    }
  }

  if (status === 'done') {
    return (
      <div className="mt-8 rounded-card border border-line bg-surface p-6 text-center shadow-soft">
        <CheckCircle2 className="mx-auto size-9 text-positive" aria-hidden />
        <h2 className="mt-3 text-lg font-semibold text-ink">
          {uploaded} photo{uploaded === 1 ? '' : 's'} sent
        </h2>
        <p className="mt-1.5 text-sm text-ink-muted">
          The team has them now. You can close this page.
        </p>
        {maxFiles - uploaded > 0 && (
          <Button variant="secondary" className="mt-5" onClick={() => setStatus('idle')}>
            Send more photos
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-4">
      {error && <Alert tone="critical" title={error} />}

      <input
        ref={cameraRef}
        type="file"
        accept={ACCEPT}
        capture="environment"
        multiple
        className="sr-only"
        onChange={(e) => addFiles(e.target.files)}
      />
      <input
        ref={libraryRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="sr-only"
        onChange={(e) => addFiles(e.target.files)}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          type="button"
          size="lg"
          variant="secondary"
          onClick={() => cameraRef.current?.click()}
          disabled={files.length >= maxFiles}
        >
          <Camera aria-hidden /> Take a photo
        </Button>
        <Button
          type="button"
          size="lg"
          variant="secondary"
          onClick={() => libraryRef.current?.click()}
          disabled={files.length >= maxFiles}
        >
          <ImagePlus aria-hidden /> Choose from library
        </Button>
      </div>

      {files.length > 0 && (
        <>
          <ul className="grid grid-cols-3 gap-2">
            {files.map((file, i) => (
              <li key={`${file.name}-${i}`} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="aspect-square w-full rounded-lg border border-line object-cover"
                />
                <button
                  type="button"
                  aria-label={`Remove ${file.name}`}
                  onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                  className="absolute -right-1.5 -top-1.5 grid size-6 place-items-center rounded-full border border-line bg-surface text-ink-muted shadow-soft"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>

          <Button size="lg" className="w-full" loading={status === 'uploading'} onClick={submit}>
            {status === 'uploading'
              ? 'Sending photos'
              : `Send ${files.length} photo${files.length === 1 ? '' : 's'}`}
          </Button>
          {status === 'uploading' && <Progress value={60} label="Uploading" />}
        </>
      )}

      <p className="text-center text-xs text-ink-subtle">
        Up to {maxFiles} photo{maxFiles === 1 ? '' : 's'} · link expires{' '}
        {new Date(expiresAt).toLocaleDateString()}
      </p>
    </div>
  );
}
