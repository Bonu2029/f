"use client";

import Link from "next/link";
import {
  Bell,
  Building2,
  CalendarCheck,
  CreditCard,
  Heart,
  LifeBuoy,
  LogOut,
  MessageSquare,
  RotateCcw,
  Shield,
  User as UserIcon,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Avatar } from "@/components/ui/media";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { useMarketplace } from "@/lib/store";

const CUSTOMER_LINKS = [
  { href: "/bookings", label: "My bookings", icon: CalendarCheck },
  { href: "/favorites", label: "Favourites", icon: Heart },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/account/notifications", label: "Notifications", icon: Bell },
  { href: "/account/payments", label: "Payment methods", icon: CreditCard },
  { href: "/account", label: "Profile", icon: UserIcon },
];

/** Account menu, plus the demo account switcher that makes the prototype explorable. */
export function AccountSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { session, signIn, signOut, state, resetDemo } = useMarketplace();
  const user = state?.users.find((u) => u.id === session.userId) ?? null;

  return (
    <Modal open={open} onClose={onClose} title={user ? "Your account" : "Welcome to NOW"}>
      <div className="space-y-5">
        {user ? (
          <div className="flex items-center gap-3 rounded-2xl border border-line bg-sunken/60 p-3.5">
            <Avatar seed={user.id} name={user.full_name} size={46} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold text-ink">{user.full_name}</p>
              <p className="truncate text-[13px] text-ink-muted">{user.email}</p>
            </div>
            <Badge tone={session.role === "admin" ? "dark" : session.role === "business" ? "brand" : "neutral"}>
              {session.role}
            </Badge>
          </div>
        ) : (
          <div className="rounded-2xl border border-line bg-sunken/60 p-4">
            <p className="text-[14.5px] font-semibold text-ink">Browse freely, sign in to book</p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
              You never need an account to search or compare availability.
            </p>
            <div className="mt-3.5 flex gap-2">
              <Button size="sm" onClick={() => { signIn("customer"); onClose(); }}>
                Continue as Maya
              </Button>
              <Link href="/auth/login" onClick={onClose}>
                <Button size="sm" variant="outline">Sign in</Button>
              </Link>
            </div>
          </div>
        )}

        {session.role === "customer" && (
          <nav className="grid gap-0.5">
            {CUSTOMER_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-[14.5px] font-medium text-ink transition hover:bg-sunken"
              >
                <Icon className="h-[18px] w-[18px] text-ink-muted" />
                {label}
              </Link>
            ))}
          </nav>
        )}

        <div className="rounded-2xl border border-line p-3.5">
          <p className="text-[13px] font-semibold text-ink-soft">Explore the prototype</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">
            Switch between the three demo accounts. All data is fictional.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <DemoButton
              label="Customer"
              sub="Maya"
              active={session.role === "customer"}
              icon={<UserIcon className="h-4 w-4" />}
              onClick={() => { signIn("customer"); onClose(); }}
            />
            <DemoButton
              label="Business"
              sub="Luxe Nail Studio"
              active={session.role === "business"}
              icon={<Building2 className="h-4 w-4" />}
              onClick={() => { signIn("business"); onClose(); }}
            />
            <DemoButton
              label="Admin"
              sub="NOW ops"
              active={session.role === "admin"}
              icon={<Shield className="h-4 w-4" />}
              onClick={() => { signIn("admin"); onClose(); }}
            />
          </div>
        </div>

        <div className="grid gap-0.5 border-t border-line-soft pt-3">
          <Link
            href="/support"
            onClick={onClose}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium text-ink-soft transition hover:bg-sunken"
          >
            <LifeBuoy className="h-[18px] w-[18px] text-ink-muted" />
            Help & support
          </Link>
          <button
            type="button"
            onClick={resetDemo}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] font-medium text-ink-soft transition hover:bg-sunken"
          >
            <RotateCcw className="h-[18px] w-[18px] text-ink-muted" />
            Reset demo data
          </button>
          {user && (
            <button
              type="button"
              onClick={() => { signOut(); onClose(); }}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] font-medium text-urgent-600 transition hover:bg-urgent-50"
            >
              <LogOut className="h-[18px] w-[18px]" />
              Sign out
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function DemoButton({
  label,
  sub,
  active,
  icon,
  onClick,
}: {
  label: string;
  sub: string;
  active: boolean;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-xl border p-2.5 text-left transition ${
        active
          ? "border-brand-500 bg-brand-50"
          : "border-line bg-surface hover:border-brand-200"
      }`}
    >
      <span className={`flex items-center gap-1.5 text-[13px] font-semibold ${active ? "text-brand-700" : "text-ink"}`}>
        {icon}
        {label}
      </span>
      <span className="mt-0.5 block truncate text-[12px] text-ink-muted">{sub}</span>
    </button>
  );
}
