import Link from 'next/link';
import { brand } from '@afd/shared';
import { BrandMark } from '@/components/brand-mark';
import { Button } from '@/components/ui';

const NAV = [
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/#faq', label: 'FAQ' },
];

export function MarketingHeader({ ctaLabel }: { ctaLabel: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur-sm">
      <nav
        aria-label="Main"
        className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6"
      >
        <BrandMark />

        <ul className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">{ctaLabel}</Link>
          </Button>
        </div>
      </nav>
    </header>
  );
}

export function MarketingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <BrandMark />
            <p className="mt-3 max-w-xs text-sm text-ink-subtle">{brand.tagline}</p>
          </div>

          <FooterColumn
            title="Product"
            links={[
              { href: '/#how-it-works', label: 'How it works' },
              { href: '/#features', label: 'Features' },
              { href: '/pricing', label: 'Pricing' },
              { href: '/#faq', label: 'FAQ' },
            ]}
          />
          <FooterColumn
            title="Account"
            links={[
              { href: '/signup', label: 'Create an account' },
              { href: '/login', label: 'Sign in' },
              { href: '/reset-password', label: 'Reset password' },
            ]}
          />
          <FooterColumn
            title="Legal"
            links={[
              { href: '/legal/terms', label: 'Terms of Service' },
              { href: '/legal/privacy', label: 'Privacy Policy' },
              { href: '/legal/acceptable-use', label: 'Acceptable Use' },
              { href: '/legal/ai-disclosure', label: 'AI & communications' },
            ]}
          />
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-line pt-6 text-xs text-ink-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {brand.legalEntity}. All rights reserved.
          </p>
          <p>
            <a className="hover:text-ink" href={`mailto:${brand.contact.support}`}>
              {brand.contact.support}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: Array<{ href: string; label: string }>;
}) {
  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{title}</h2>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-sm text-ink-muted hover:text-ink">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
