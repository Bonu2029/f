"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Scissors,
  Settings,
  Star,
  Store,
  Users,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Avatar } from "@/components/ui/media";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { useBusinessContext } from "@/lib/hooks";
import { useMarketplace } from "@/lib/store";
import { cn } from "@/lib/utils";
import { FillSlotModal } from "./fill-slot-modal";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/dashboard/bookings", label: "Bookings", icon: ClipboardList },
  { href: "/dashboard/open-slots", label: "Open Slots", icon: Zap },
  { href: "/dashboard/services", label: "Services", icon: Scissors },
  { href: "/dashboard/team", label: "Team", icon: Users },
  { href: "/dashboard/customers", label: "Customers", icon: Store },
  { href: "/dashboard/messages", label: "Messages", icon: MessageSquare },
  { href: "/dashboard/reviews", label: "Reviews", icon: Star },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/payments", label: "Payments", icon: Wallet },
  { href: "/dashboard/profile", label: "Profile", icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

/** Mobile keeps the five highest-frequency destinations in reach. */
const MOBILE_NAV = [NAV[0], NAV[1], NAV[3], NAV[7], NAV[10]];

export function DashboardShell({
  children,
  title,
  subtitle,
  actions,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const pathname = usePathname();
  const context = useBusinessContext();
  const { session, signIn, state } = useMarketplace();
  const [menuOpen, setMenuOpen] = useState(false);
  const [fillOpen, setFillOpen] = useState(false);

  // Route guard: a business surface only ever renders for a business session
  // that actually resolves to a business the user manages. A stale or partial
  // session falls through to the sign-in prompt rather than loading forever.
  const resolved = session.role === "business" && (context != null || state == null);
  if (!resolved) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg items-center px-5">
        <EmptyState
          className="w-full"
          icon={<Store className="h-5 w-5" />}
          title="Business account required"
          body="The dashboard shows a business's own bookings, customers and payouts, so it's only available to signed-in business accounts."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => signIn("business")}>Open the Luxe Nail Studio demo</Button>
              <Link href="/">
                <Button variant="outline">Back to NOW</Button>
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  const unread =
    state?.notifications.filter((n) => n.user_id === session.userId && n.read_at == null).length ?? 0;

  return (
    <div className="min-h-dvh lg:flex">
      {/* ---- Desktop sidebar --------------------------------------------- */}
      <aside className="sticky top-0 hidden h-dvh w-[236px] shrink-0 flex-col border-r border-line bg-surface lg:flex">
        <div className="flex items-center gap-2 px-4 py-4">
          <Link href="/" aria-label="NOW home">
            <Logo size={26} />
          </Link>
          <Badge tone="brand">Business</Badge>
        </div>

        {context && (
          <div className="mx-3 mb-3 flex items-center gap-2.5 rounded-xl border border-line bg-sunken/50 p-2.5">
            <Avatar
              seed={`${context.business.media_seed}-logo`}
              name={context.business.name}
              size={34}
              className="rounded-lg"
            />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-ink">{context.business.name}</p>
              <p className="truncate text-[11.5px] text-ink-muted">
                {context.business.subscription_tier === "pro" ? "NOW Pro" : "Free plan"}
              </p>
            </div>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Dashboard">
          <ul className="space-y-0.5">
            {NAV.map(({ href, label, icon: Icon, exact }) => {
              const active = exact ? pathname === href : pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition",
                      active
                        ? "bg-brand-50 text-brand-700"
                        : "text-ink-soft hover:bg-sunken hover:text-ink",
                    )}
                  >
                    <Icon className={cn("h-[17px] w-[17px]", active && "text-brand-600")} />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-line p-3">
          <Button fullWidth icon={<Zap className="h-4 w-4" />} onClick={() => setFillOpen(true)}>
            Fill this slot
          </Button>
        </div>
      </aside>

      {/* ---- Main --------------------------------------------------------- */}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur-xl">
          <div className="flex items-center gap-3 px-4 py-3 pt-safe sm:px-6">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className="tap-target -ml-2 flex items-center justify-center rounded-xl text-ink lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[19px] font-bold tracking-[-0.025em] text-ink sm:text-[22px]">
                {title}
              </h1>
              {subtitle && <p className="truncate text-[13px] text-ink-muted">{subtitle}</p>}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {actions}
              <Link
                href="/dashboard/settings"
                aria-label={unread ? `${unread} unread notifications` : "Settings"}
                className="tap-target relative hidden items-center justify-center rounded-full text-ink-soft hover:bg-sunken sm:flex"
              >
                <Settings className="h-[18px] w-[18px]" />
                {unread > 0 && (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-urgent-500 ring-2 ring-canvas" />
                )}
              </Link>
            </div>
          </div>
        </header>

        <main id="main" className="px-4 pb-24 pt-4 sm:px-6 lg:pb-10">{children}</main>
      </div>

      {/* ---- Mobile drawer ------------------------------------------------- */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-ink/45"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[268px] flex-col bg-surface shadow-pop">
            <div className="flex items-center justify-between px-4 py-4">
              <Logo size={26} />
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="tap-target flex items-center justify-center rounded-full text-ink-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 pb-6" aria-label="Dashboard">
              <ul className="space-y-0.5">
                {NAV.map(({ href, label, icon: Icon, exact }) => {
                  const active = exact ? pathname === href : pathname.startsWith(href);
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        onClick={() => setMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-2.5 rounded-xl px-3 py-3 text-[14px] font-medium",
                          active ? "bg-brand-50 text-brand-700" : "text-ink-soft",
                        )}
                      >
                        <Icon className="h-[18px] w-[18px]" />
                        {label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <Link
                href="/"
                className="mt-3 block rounded-xl px-3 py-3 text-[14px] font-medium text-ink-muted"
              >
                ← Back to NOW marketplace
              </Link>
            </nav>
          </div>
        </div>
      )}

      {/* ---- Mobile bottom nav --------------------------------------------- */}
      <nav
        aria-label="Dashboard sections"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur-xl lg:hidden"
      >
        <ul className="flex items-stretch justify-between px-2 pb-safe">
          {MOBILE_NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  className="tap-target flex flex-col items-center gap-1 px-1 pb-1.5 pt-2.5"
                  aria-current={active ? "page" : undefined}
                >
                  <Icon
                    className={cn("h-5 w-5", active ? "text-brand-500" : "text-ink-muted")}
                    strokeWidth={active ? 2.4 : 1.9}
                  />
                  <span
                    className={cn(
                      "text-[10.5px] font-semibold",
                      active ? "text-brand-600" : "text-ink-muted",
                    )}
                  >
                    {label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Floating primary action on mobile */}
      <button
        type="button"
        onClick={() => setFillOpen(true)}
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+4.6rem)] right-4 z-40 flex h-13 items-center gap-2 rounded-2xl bg-brand-500 px-4 text-[14px] font-semibold text-white shadow-pop transition active:scale-95 lg:hidden"
      >
        <Zap className="h-4 w-4" />
        Fill this slot
      </button>

      <FillSlotModal open={fillOpen} onClose={() => setFillOpen(false)} />
    </div>
  );
}
