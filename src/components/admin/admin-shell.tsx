"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Shield } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { useMarketplace } from "@/lib/store";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/businesses", label: "Businesses" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/disputes", label: "Disputes" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/settings", label: "Settings" },
];

/**
 * Admin console shell. Protected the same way every other role surface is:
 * the route renders nothing but a sign-in prompt unless the session is an
 * admin session.
 */
export function AdminShell({
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
  const { session, signIn } = useMarketplace();

  if (session.role !== "admin") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg items-center px-5">
        <EmptyState
          className="w-full"
          icon={<Shield className="h-5 w-5" />}
          title="Admin access required"
          body="This console manages businesses, disputes, payouts and platform settings across the whole marketplace."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => signIn("admin")}>Open the admin demo</Button>
              <Link href="/">
                <Button variant="outline">Back to NOW</Button>
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-line bg-surface">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 pt-safe sm:px-6">
          <Link href="/" aria-label="NOW home">
            <Logo size={26} />
          </Link>
          <Badge tone="dark">Admin</Badge>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/" className="text-[13px] font-medium text-ink-muted hover:text-ink">
              Marketplace
            </Link>
          </div>
        </div>
        <nav className="no-scrollbar mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-2 sm:px-6" aria-label="Admin">
          {NAV.map(({ href, label, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-semibold transition",
                  active ? "bg-ink text-white" : "text-ink-soft hover:bg-sunken hover:text-ink",
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main id="main" className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[24px] font-bold tracking-[-0.03em] text-ink">{title}</h1>
            {subtitle && <p className="mt-0.5 text-[13.5px] text-ink-muted">{subtitle}</p>}
          </div>
          {actions}
        </div>
        <div className="mt-5">{children}</div>
        <div className="h-10" />
      </main>
    </div>
  );
}
