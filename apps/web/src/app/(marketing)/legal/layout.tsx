import { Alert } from '@/components/ui';

/**
 * Legal documents are TEMPLATES. They are a starting point drafted for a
 * generic US SaaS and have not been reviewed by a lawyer. The banner says so
 * on every page, deliberately and permanently, until a real review replaces it.
 */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Alert tone="caution" title="Template — requires legal review before commercial launch">
        This document is a drafting aid, not legal advice, and it has not been reviewed by a
        qualified lawyer. Have counsel review and adapt it for your jurisdiction, your business
        model and the data you actually process before you rely on it.
      </Alert>

      <article
        className="mt-8 space-y-6 text-[15px] leading-relaxed text-ink-muted
          [&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h1]:text-ink
          [&_h2]:mt-10 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-ink
          [&_h3]:mt-6 [&_h3]:font-semibold [&_h3]:text-ink
          [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-6
          [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-6
          [&_a]:text-brand-600 [&_a]:underline [&_a]:underline-offset-2"
      >
        {children}
      </article>
    </div>
  );
}
