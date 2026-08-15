'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  CalendarCheck,
  CreditCard,
  LayoutDashboard,
  LogOut,
  type LucideIcon,
  Menu,
  Mic,
  PhoneCall,
  Settings,
  Shield,
  Users,
  X,
  BookOpen,
} from 'lucide-react';
import { BrandMark } from '@/components/brand-mark';
import { Badge, Button, cn } from '@/components/ui';
import { signOutAction } from '@/app/(auth)/actions';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Shown in the bottom bar on mobile. */
  primary?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, primary: true },
  { href: '/dashboard/calls', label: 'Calls', icon: PhoneCall, primary: true },
  { href: '/dashboard/leads', label: 'Leads', icon: Users, primary: true },
  { href: '/dashboard/appointments', label: 'Appointments', icon: CalendarCheck, primary: true },
  { href: '/dashboard/receptionist', label: 'Receptionist', icon: Mic, primary: true },
  { href: '/dashboard/knowledge', label: 'Knowledge', icon: BookOpen },
  { href: '/dashboard/billing', label: 'Billing', icon: CreditCard },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export function DashboardShell({
  children,
  organizationName,
  userName,
  userEmail,
  role,
  unreadCount,
  isPlatformAdmin,
  isDemo,
  aiPaused,
}: {
  children: React.ReactNode;
  organizationName: string;
  userName: string;
  userEmail: string;
  role: string;
  unreadCount: number;
  isPlatformAdmin: boolean;
  isDemo: boolean;
  aiPaused: boolean;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  const sidebar = (
    <nav aria-label="Dashboard" className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center justify-between px-4">
        <BrandMark />
        <button
          type="button"
          className="rounded-lg p-1.5 text-ink-muted lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>

      <div className="px-3 pb-3">
        <div className="rounded-lg border border-line bg-surface-sunken px-3 py-2">
          <p className="truncate text-sm font-medium text-ink">{organizationName}</p>
          <p className="text-xs capitalize text-ink-subtle">{role}</p>
        </div>
      </div>

      <ul className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              onClick={() => setMobileOpen(false)}
              aria-current={isActive(href) ? 'page' : undefined}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive(href)
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              {label}
            </Link>
          </li>
        ))}

        {isPlatformAdmin && (
          <li className="pt-2">
            <Link
              href="/admin"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-ink-muted hover:bg-surface-sunken hover:text-ink"
            >
              <Shield className="size-4 shrink-0" aria-hidden />
              Platform admin
            </Link>
          </li>
        )}
      </ul>

      <div className="border-t border-line p-3">
        <p className="truncate px-1 text-sm font-medium text-ink">{userName}</p>
        <p className="truncate px-1 text-xs text-ink-subtle">{userEmail}</p>
        <form action={signOutAction} className="mt-2">
          <Button type="submit" variant="ghost" size="sm" className="w-full justify-start">
            <LogOut aria-hidden /> Sign out
          </Button>
        </form>
      </div>
    </nav>
  );

  return (
    <div className="min-h-dvh bg-canvas">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-line bg-surface lg:block">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-ink/25"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0 w-64 bg-surface shadow-lift">{sidebar}</div>
        </div>
      )}

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-canvas/90 px-4 backdrop-blur-sm sm:px-6">
          <button
            type="button"
            className="rounded-lg p-1.5 text-ink-muted lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-5" aria-hidden />
          </button>

          <div className="flex flex-1 items-center gap-2 overflow-hidden">
            {isDemo && <Badge tone="caution">Demo data</Badge>}
            {aiPaused && <Badge tone="critical">Receptionist paused</Badge>}
          </div>

          <Link
            href="/dashboard/notifications"
            className="relative rounded-lg p-2 text-ink-muted hover:bg-surface-sunken hover:text-ink"
            aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
          >
            <Bell className="size-4.5" aria-hidden />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
        </header>

        <main id="main" className="px-4 pb-24 pt-6 sm:px-6 lg:pb-10">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation — the primary way owners use this on a phone. */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface lg:hidden"
      >
        {NAV_ITEMS.filter((i) => i.primary).map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? 'page' : undefined}
            className={cn(
              'flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium',
              isActive(href) ? 'text-brand-700' : 'text-ink-subtle',
            )}
          >
            <Icon className="size-5" aria-hidden />
            <span className="truncate px-0.5">{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
