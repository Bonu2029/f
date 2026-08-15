import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { requirePlatformAdmin } from '@/lib/auth';
import { BrandMark } from '@/components/brand-mark';
import { Badge } from '@/components/ui';

/**
 * Platform super-admin area.
 *
 * Access is decided server-side from ADMIN_EMAILS on every request — the URL
 * being unlisted is not part of the control. Non-admins are redirected to their
 * own dashboard rather than shown a 403, so the area is not discoverable.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePlatformAdmin();

  const nav = [
    { href: '/admin', label: 'Overview' },
    { href: '/admin/businesses', label: 'Businesses' },
    { href: '/admin/webhooks', label: 'Webhooks' },
    { href: '/admin/errors', label: 'Errors' },
  ];

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <BrandMark href="/admin" />
            <Badge tone="critical">
              <ShieldCheck className="size-3" aria-hidden />
              Platform admin
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-ink-subtle sm:inline">{user.email}</span>
            <Link href="/dashboard" className="text-ink-muted hover:text-ink">
              Exit admin
            </Link>
          </div>
        </div>
        <nav aria-label="Admin" className="mx-auto max-w-6xl px-4 sm:px-6">
          <ul className="flex gap-1 overflow-x-auto">
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="-mb-px block whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-sm font-medium text-ink-muted hover:border-line-strong hover:text-ink"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main id="main" className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {children}
      </main>
    </div>
  );
}
