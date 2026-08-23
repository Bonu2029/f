"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/cn";
import { logOutAction } from "@/lib/auth/actions";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: IconHome, exact: true },
  { href: "/dashboard/tags", label: "Tags", icon: IconTag },
  { href: "/dashboard/customers", label: "Customers", icon: IconUsers },
  { href: "/dashboard/requests", label: "Service Requests", icon: IconInbox },
  { href: "/dashboard/settings", label: "Settings", icon: IconGear },
  { href: "/dashboard/billing", label: "Billing", icon: IconCard },
];

export function Sidebar({ businessName }: { businessName: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const links = (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.9375rem] font-medium transition-colors",
              active
                ? "bg-white text-ink-950 shadow-soft"
                : "text-ink-700 hover:bg-white/70 hover:text-ink-950",
            )}
          >
            <Icon />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const logOut = (
    <form action={logOutAction}>
      <button
        type="submit"
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[0.9375rem] font-medium text-ink-700 transition-colors hover:bg-white/70 hover:text-ink-950"
      >
        <IconExit />
        Log Out
      </button>
    </form>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-white px-4 lg:hidden">
        <Logo href="/dashboard" />
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="-mr-2 grid size-10 place-items-center rounded-xl text-ink-900"
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          <svg viewBox="0 0 24 24" className="size-5" fill="none">
            {open ? (
              <path
                d="m6 6 12 12M18 6 6 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            ) : (
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            )}
          </svg>
        </button>
      </div>

      {open ? (
        <div className="border-b border-line bg-surface-muted px-4 py-4 lg:hidden">
          {links}
          <div className="mt-2 border-t border-line pt-2">{logOut}</div>
        </div>
      ) : null}

      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-line bg-surface-muted lg:flex lg:flex-col">
        <div className="px-5 py-5">
          <Logo href="/dashboard" />
        </div>

        <div className="flex-1 px-3">{links}</div>

        <div className="border-t border-line px-3 py-3">
          <p className="truncate px-3 pb-2 text-xs text-ink-400">
            {businessName}
          </p>
          {logOut}
        </div>
      </aside>
    </>
  );
}

function base(path: React.ReactNode) {
  return (
    <svg viewBox="0 0 20 20" className="size-[1.125rem] shrink-0" fill="none">
      {path}
    </svg>
  );
}

const stroke = {
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function IconHome() {
  return base(<path d="M3.5 8.5 10 3l6.5 5.5V16a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V8.5Z" {...stroke} />);
}

function IconTag() {
  return base(
    <>
      <path d="M10.4 2.8H15a2.2 2.2 0 0 1 2.2 2.2v4.6a1.8 1.8 0 0 1-.53 1.27l-5.6 5.6a1.8 1.8 0 0 1-2.54 0l-4.06-4.06a1.8 1.8 0 0 1 0-2.54l5.6-5.6a1.8 1.8 0 0 1 1.27-.53Z" {...stroke} />
      <circle cx="13" cy="7" r="1.2" fill="currentColor" />
    </>,
  );
}

function IconUsers() {
  return base(
    <>
      <circle cx="8" cy="7.5" r="2.6" {...stroke} />
      <path d="M3.4 16.2c.6-2.3 2.4-3.7 4.6-3.7s4 1.4 4.6 3.7M13.6 5.3a2.4 2.4 0 0 1 0 4.6M15.2 16.2c-.2-1-.6-1.9-1.2-2.6" {...stroke} />
    </>,
  );
}

function IconInbox() {
  return base(
    <>
      <path d="M3 11.5 5 4.2a1.2 1.2 0 0 1 1.15-.9h7.7A1.2 1.2 0 0 1 15 4.2l2 7.3v3.3a1.2 1.2 0 0 1-1.2 1.2H4.2A1.2 1.2 0 0 1 3 14.8v-3.3Z" {...stroke} />
      <path d="M3 11.5h3.6l.9 1.8h5l.9-1.8H17" {...stroke} />
    </>,
  );
}

function IconGear() {
  return base(
    <>
      <circle cx="10" cy="10" r="2.4" {...stroke} />
      <path d="M10 2.8v1.6M10 15.6v1.6M17.2 10h-1.6M4.4 10H2.8M15.1 4.9l-1.1 1.1M6 14l-1.1 1.1M15.1 15.1 14 14M6 6 4.9 4.9" {...stroke} />
    </>,
  );
}

function IconCard() {
  return base(
    <>
      <rect x="2.8" y="5" width="14.4" height="10" rx="2" {...stroke} />
      <path d="M2.8 8.6h14.4" {...stroke} />
    </>,
  );
}

function IconExit() {
  return base(
    <>
      <path d="M12 5.2V4a1.2 1.2 0 0 0-1.2-1.2H4.6A1.2 1.2 0 0 0 3.4 4v12a1.2 1.2 0 0 0 1.2 1.2h6.2A1.2 1.2 0 0 0 12 16v-1.2" {...stroke} />
      <path d="M8.4 10h8.2m0 0-2.4-2.4M16.6 10l-2.4 2.4" {...stroke} />
    </>,
  );
}
