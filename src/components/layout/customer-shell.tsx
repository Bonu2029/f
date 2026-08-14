"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  Bell,
  CalendarCheck,
  ChevronDown,
  ChevronLeft,
  Compass,
  Flame,
  Home,
  MapPin,
  User as UserIcon,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Avatar } from "@/components/ui/media";
import { useMarketplace } from "@/lib/store";
import { cn } from "@/lib/utils";
import { AccountSheet } from "./account-sheet";
import { LocationSheet } from "./location-sheet";

const TABS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/deals", label: "Deals", icon: Flame },
  { href: "/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/account", label: "Profile", icon: UserIcon },
];

export function CustomerShell({
  children,
  header = "full",
  title,
  backHref,
  hideNav,
}: {
  children: ReactNode;
  /** "full" = brand + location + profile, "compact" = back + title, "none" */
  header?: "full" | "compact" | "none";
  title?: string;
  backHref?: string;
  hideNav?: boolean;
}) {
  const [locationOpen, setLocationOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const { location, session, state } = useMarketplace();
  const pathname = usePathname();
  const router = useRouter();

  const user = state?.users.find((u) => u.id === session.userId) ?? null;
  const unread =
    state?.notifications.filter((n) => n.user_id === session.userId && n.read_at == null).length ?? 0;

  return (
    <div className="min-h-dvh">
      {header !== "none" && (
        <header className="sticky top-0 z-40 border-b border-line/70 bg-canvas/85 backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 pt-safe sm:h-16 sm:px-6">
            {header === "compact" ? (
              <>
                <button
                  type="button"
                  onClick={() => (backHref ? router.push(backHref) : router.back())}
                  aria-label="Go back"
                  className="tap-target -ml-2 flex items-center justify-center rounded-full text-ink transition hover:bg-sunken"
                >
                  <ChevronLeft className="h-5.5 w-5.5" />
                </button>
                <h1 className="min-w-0 flex-1 truncate text-[16px] font-semibold tracking-[-0.02em] text-ink">
                  {title}
                </h1>
              </>
            ) : (
              <>
                <Link href="/" aria-label="NOW home" className="shrink-0">
                  <Logo size={28} />
                </Link>
                <button
                  type="button"
                  onClick={() => setLocationOpen(true)}
                  className="ml-1 flex min-w-0 flex-1 items-center gap-1 rounded-full px-2 py-1.5 text-left transition hover:bg-sunken"
                >
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-500" />
                  <span className="truncate text-[13.5px] font-semibold text-ink">
                    {location.label}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
                </button>
              </>
            )}

            <div className="ml-auto flex shrink-0 items-center gap-1">
              <Link
                href="/account/notifications"
                aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
                className="tap-target relative hidden items-center justify-center rounded-full text-ink-soft transition hover:bg-sunken hover:text-ink sm:flex"
              >
                <Bell className="h-5 w-5" />
                {unread > 0 && (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-urgent-500 ring-2 ring-canvas" />
                )}
              </Link>
              <button
                type="button"
                onClick={() => setAccountOpen(true)}
                aria-label="Account menu"
                className="tap-target flex items-center justify-center rounded-full"
              >
                {user ? (
                  <Avatar seed={user.id} name={user.full_name} size={32} />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface text-ink-soft">
                    <UserIcon className="h-4 w-4" />
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>
      )}

      <main id="main" className={cn("mx-auto max-w-6xl px-4 sm:px-6", !hideNav && "pb-24 sm:pb-12")}>
        {children}
      </main>

      {!hideNav && <BottomNav pathname={pathname} />}

      <LocationSheet open={locationOpen} onClose={() => setLocationOpen(false)} />
      <AccountSheet open={accountOpen} onClose={() => setAccountOpen(false)} />
    </div>
  );
}

function BottomNav({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur-xl sm:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between px-2 pb-safe">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className="tap-target flex flex-col items-center gap-1 rounded-xl px-1 pb-1.5 pt-2.5"
              >
                <Icon
                  className={cn(
                    "h-[21px] w-[21px] transition-colors",
                    active ? "text-brand-500" : "text-ink-muted",
                  )}
                  strokeWidth={active ? 2.4 : 1.9}
                />
                <span
                  className={cn(
                    "text-[10.5px] font-semibold tracking-[0.005em] transition-colors",
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
  );
}

/** Desktop-only secondary nav used on wide screens where there's no tab bar. */
export function DesktopNav() {
  const pathname = usePathname();
  return (
    <nav className="hidden items-center gap-1 sm:flex" aria-label="Sections">
      {TABS.slice(1, 4).map(({ href, label }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "rounded-full px-3 py-1.5 text-[13.5px] font-semibold transition",
              active ? "bg-brand-50 text-brand-700" : "text-ink-soft hover:bg-sunken hover:text-ink",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
