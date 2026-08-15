import Link from 'next/link';
import { requireSession } from '@/lib/auth';

const SETTINGS_NAV = [
  { href: '/dashboard/settings', label: 'Business' },
  { href: '/dashboard/settings/phone', label: 'Phone' },
  { href: '/dashboard/settings/calendar', label: 'Calendar' },
  { href: '/dashboard/settings/team', label: 'Team' },
  { href: '/dashboard/settings/notifications', label: 'Notifications' },
  { href: '/dashboard/billing', label: 'Billing' },
  { href: '/dashboard/settings/security', label: 'Security' },
  { href: '/dashboard/settings/account', label: 'Account' },
];

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  await requireSession();
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Settings</h1>

      <nav aria-label="Settings" className="mt-4 overflow-x-auto border-b border-line">
        <ul className="flex gap-1">
          {SETTINGS_NAV.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="-mb-px block whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-6">{children}</div>
    </div>
  );
}
