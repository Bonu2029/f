import Link from 'next/link';
import { brand } from '@afd/shared';
import { BrandMark } from '@/components/brand-mark';

/**
 * Wrapper for the one remaining pre-dashboard step: choosing a plan. Everything
 * else that used to be a wizard is now Business Settings and AI Receptionist
 * Settings, which the owner can revisit whenever they like.
 */
export default function GetStartedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <BrandMark />
          <Link href="/dashboard" className="text-sm text-ink-muted hover:text-ink">
            Skip for now
          </Link>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6 sm:py-16">
        {children}
      </main>

      <footer className="border-t border-line py-6">
        <p className="text-center text-xs text-ink-subtle">
          © {new Date().getFullYear()} {brand.legalEntity}
        </p>
      </footer>
    </div>
  );
}
