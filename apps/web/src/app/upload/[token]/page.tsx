import type { Metadata } from 'next';
import { brand } from '@afd/shared';
import { resolveUploadToken } from '@/server/upload-tokens';
import { toAppError } from '@/lib/errors';
import { BrandMark } from '@/components/brand-mark';
import { Alert } from '@/components/ui';
import { UploadForm } from './upload-form';

export const metadata: Metadata = {
  title: 'Upload photos',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/**
 * Public photo-upload page. Reached from an SMS link; the customer needs no
 * account. It shows only the business name and the upload control — never any
 * other detail about the lead or the business.
 */
export default async function UploadPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  let resolved: Awaited<ReturnType<typeof resolveUploadToken>> | null = null;
  let error: string | null = null;

  try {
    resolved = await resolveUploadToken(token);
  } catch (err) {
    error = toAppError(err).message;
  }

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-14 max-w-lg items-center px-4">
          <BrandMark href={null} size="sm" />
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-lg flex-1 px-4 py-10">
        {error || !resolved ? (
          <Alert tone="critical" title="This link cannot be used">
            <p>{error ?? 'The link is not valid.'}</p>
            <p className="mt-2">
              If you still need to send photos, reply to the text message you received and the
              business will send a new link.
            </p>
          </Alert>
        ) : (
          <>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">
              Upload photos for {resolved.businessName}
            </h1>
            <p className="mt-2 text-sm text-ink-muted">
              Take photos now or choose them from your library. They go straight to the team —
              nobody else can see them.
            </p>

            <UploadForm
              token={token}
              maxFiles={resolved.maxFiles - resolved.usedCount}
              expiresAt={resolved.expiresAt}
            />
          </>
        )}
      </main>

      <footer className="border-t border-line py-5">
        <p className="text-center text-xs text-ink-subtle">
          Secure upload powered by {brand.name}. Do not send payment card details or identification
          documents.
        </p>
      </footer>
    </div>
  );
}
