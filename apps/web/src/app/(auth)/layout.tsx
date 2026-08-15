import Link from 'next/link';
import { brand } from '@afd/shared';
import { BrandMark } from '@/components/brand-mark';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <BrandMark />
          <Link href="/" className="text-sm text-ink-muted hover:text-ink">
            Back to site
          </Link>
        </div>
      </header>

      <main id="main" className="flex flex-1 items-start justify-center px-4 py-10 sm:py-16">
        <div className="w-full max-w-md">{children}</div>
      </main>

      <footer className="border-t border-line py-6">
        <p className="text-center text-xs text-ink-subtle">
          © {new Date().getFullYear()} {brand.legalEntity} ·{' '}
          <Link href="/legal/terms" className="hover:text-ink">
            Terms
          </Link>{' '}
          ·{' '}
          <Link href="/legal/privacy" className="hover:text-ink">
            Privacy
          </Link>
        </p>
      </footer>
    </div>
  );
}
