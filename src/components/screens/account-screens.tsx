"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Bell,
  CalendarCheck,
  CheckCheck,
  CreditCard,
  Heart,
  LifeBuoy,
  LogOut,
  MessageSquare,
  Plus,
  Shield,
  Store,
} from "lucide-react";
import { CustomerShell } from "@/components/layout/customer-shell";
import { Button, ButtonLink } from "@/components/ui/button";
import { Avatar } from "@/components/ui/media";
import { Badge, Card, EmptyState, Section, Skeleton } from "@/components/ui/primitives";
import { Field, Input, Switch } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { useActions, useMarketplace } from "@/lib/store";
import { customerAppointments } from "@/lib/store/selectors";
import { SEARCH_RADIUS_OPTIONS } from "@/lib/config";
import type { NotificationPreferences } from "@/lib/types";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Profile                                                                     */
/* -------------------------------------------------------------------------- */

export function AccountScreen() {
  const { state, session, signIn, signOut, resetDemo } = useMarketplace();
  const { updateUser, updateProfile } = useActions();
  const { toast } = useToast();

  const user = state?.users.find((u) => u.id === session.userId) ?? null;
  const profile = state?.customerProfiles.find((p) => p.user_id === session.userId) ?? null;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dirty, setDirty] = useState(false);

  if (!state) {
    return (
      <CustomerShell>
        <div className="space-y-3 pt-6">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </CustomerShell>
    );
  }

  if (!user) {
    return (
      <CustomerShell>
        <div className="py-14">
          <EmptyState
            icon={<Shield className="h-5 w-5" />}
            title="You're browsing as a guest"
            body="Search and compare freely. Sign in when you're ready to book."
            action={
              <div className="flex gap-2">
                <Button onClick={() => signIn("customer")}>Continue as Maya</Button>
                <ButtonLink href="/auth/signup" variant="outline">
                  Create account
                </ButtonLink>
              </div>
            }
          />
        </div>
      </CustomerShell>
    );
  }

  const { upcoming, past } = customerAppointments(state, user.id);
  const favorites = state.favorites.filter((f) => f.customer_id === user.id).length;

  function save() {
    updateUser(user!.id, {
      full_name: name || user!.full_name,
      email: email || user!.email,
      phone: phone || user!.phone || undefined,
    });
    setDirty(false);
    toast({ title: "Profile updated", tone: "success" });
  }

  return (
    <CustomerShell>
      <div className="pt-5">
        <h1 className="text-[26px] font-bold tracking-[-0.03em] text-ink">Profile</h1>
      </div>

      <Card className="mt-4 flex items-center gap-4 p-4">
        <Avatar seed={user.id} name={user.full_name} size={58} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-semibold text-ink">{user.full_name}</p>
          <p className="truncate text-[13.5px] text-ink-muted">{user.email}</p>
        </div>
        <Badge tone="neutral">{session.role}</Badge>
      </Card>

      <div className="mt-3 grid grid-cols-3 gap-2.5">
        {[
          { label: "Upcoming", value: upcoming.length, href: "/bookings" },
          { label: "Completed", value: past.filter((a) => a.status === "completed").length, href: "/bookings" },
          { label: "Favourites", value: favorites, href: "/favorites" },
        ].map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="rounded-2xl border border-line bg-surface p-3.5 text-center transition hover:border-brand-200"
          >
            <p className="text-[22px] font-semibold tracking-[-0.02em] text-ink">{stat.value}</p>
            <p className="text-[12px] text-ink-muted">{stat.label}</p>
          </Link>
        ))}
      </div>

      <Section className="mt-7" title="Your details">
        <Card className="space-y-4 p-4">
          <Field label="Full name" htmlFor="acct-name">
            <Input
              id="acct-name"
              defaultValue={user.full_name}
              onChange={(e) => {
                setName(e.target.value);
                setDirty(true);
              }}
              autoComplete="name"
            />
          </Field>
          <Field label="Email" htmlFor="acct-email">
            <Input
              id="acct-email"
              type="email"
              defaultValue={user.email}
              onChange={(e) => {
                setEmail(e.target.value);
                setDirty(true);
              }}
              autoComplete="email"
            />
          </Field>
          <Field label="Phone" htmlFor="acct-phone" hint="Used for appointment reminders only.">
            <Input
              id="acct-phone"
              type="tel"
              defaultValue={user.phone ?? ""}
              onChange={(e) => {
                setPhone(e.target.value);
                setDirty(true);
              }}
              autoComplete="tel"
            />
          </Field>
          <Field label="Photo">
            <div className="flex items-center gap-3">
              <Avatar seed={user.id} name={user.full_name} size={44} />
              <Button variant="outline" size="sm" disabled>
                Upload photo
              </Button>
              <span className="text-[12px] text-ink-muted">Storage isn&rsquo;t wired up in the prototype</span>
            </div>
          </Field>
          <Button onClick={save} disabled={!dirty}>
            Save changes
          </Button>
        </Card>
      </Section>

      {profile && (
        <Section className="mt-7" title="Search preferences">
          <Card className="p-4">
            <Field label="Default search radius">
              <div className="flex flex-wrap gap-2">
                {SEARCH_RADIUS_OPTIONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      updateProfile(user.id, { search_radius_miles: r });
                      toast({ title: `Radius set to ${r} miles`, tone: "success" });
                    }}
                    className={cn(
                      "rounded-full border px-3.5 py-2 text-[13.5px] font-semibold transition",
                      profile.search_radius_miles === r
                        ? "border-brand-500 bg-brand-500 text-white"
                        : "border-line bg-surface text-ink-soft hover:border-brand-200",
                    )}
                  >
                    {r} mi
                  </button>
                ))}
              </div>
            </Field>
          </Card>
        </Section>
      )}

      <Section className="mt-7" title="Account">
        <Card className="divide-y divide-line-soft overflow-hidden">
          {[
            { href: "/bookings", label: "Bookings", icon: CalendarCheck },
            { href: "/favorites", label: "Favourites", icon: Heart },
            { href: "/messages", label: "Messages", icon: MessageSquare },
            { href: "/account/notifications", label: "Notifications", icon: Bell },
            { href: "/account/payments", label: "Payment methods", icon: CreditCard },
            { href: "/for-business", label: "List your business", icon: Store },
            { href: "/support", label: "Help & support", icon: LifeBuoy },
          ].map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-4 py-3.5 text-[14.5px] font-medium text-ink transition hover:bg-sunken/60"
            >
              <Icon className="h-[18px] w-[18px] text-ink-muted" />
              {label}
            </Link>
          ))}
        </Card>
      </Section>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button variant="outline" onClick={resetDemo}>
          Reset demo data
        </Button>
        <Button variant="danger" icon={<LogOut className="h-4 w-4" />} onClick={signOut}>
          Sign out
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap gap-x-4 gap-y-1.5 text-[12.5px] text-ink-muted">
        <Link href="/legal/terms" className="hover:text-ink">Terms</Link>
        <Link href="/legal/privacy" className="hover:text-ink">Privacy</Link>
        <Link href="/legal/cancellation-policy" className="hover:text-ink">Cancellations</Link>
        <Link href="/legal/guidelines" className="hover:text-ink">Community guidelines</Link>
      </div>

      <div className="h-6" />
    </CustomerShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Notifications                                                               */
/* -------------------------------------------------------------------------- */

const PREF_COPY: { key: keyof NotificationPreferences; label: string; description: string }[] = [
  { key: "appointment_reminders", label: "Appointment reminders", description: "\"Your appointment starts in 1 hour.\"" },
  { key: "last_minute_deals", label: "Last-minute deals", description: "\"A nail appointment near you dropped to $45.\"" },
  { key: "favorite_businesses", label: "Favourite businesses", description: "\"Modern Cuts just opened a 4:30 PM appointment.\"" },
  { key: "nearby_openings", label: "Nearby openings", description: "New same-day availability in your categories." },
  { key: "promotional", label: "Product news", description: "Occasional updates about NOW. Off by default." },
];

export function NotificationsScreen() {
  const { state, session } = useMarketplace();
  const { markNotificationRead, markAllNotificationsRead, updateProfile } = useActions();

  if (!state || !session.userId) {
    return (
      <CustomerShell header="compact" title="Notifications">
        <div className="py-10">
          <EmptyState
            icon={<Bell className="h-5 w-5" />}
            title="Sign in to manage notifications"
            body="We only send what you ask for — reminders, deals and openings at places you follow."
          />
        </div>
      </CustomerShell>
    );
  }

  const notifications = state.notifications
    .filter((n) => n.user_id === session.userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const profile = state.customerProfiles.find((p) => p.user_id === session.userId);
  const unread = notifications.filter((n) => n.read_at == null).length;

  return (
    <CustomerShell header="compact" title="Notifications">
      <div className="flex items-center justify-between gap-3 pt-4">
        <p className="text-[13.5px] text-ink-muted">
          {unread > 0 ? `${unread} unread` : "You're all caught up"}
        </p>
        {unread > 0 && (
          <Button
            size="sm"
            variant="ghost"
            icon={<CheckCheck className="h-4 w-4" />}
            onClick={() => markAllNotificationsRead(session.userId!)}
          >
            Mark all read
          </Button>
        )}
      </div>

      <div className="mt-3 grid gap-2">
        {notifications.length === 0 ? (
          <EmptyState
            icon={<Bell className="h-5 w-5" />}
            title="Nothing yet"
            body="Reminders and nearby openings will show up here."
          />
        ) : (
          notifications.map((n) => {
            const body = (
              <Card
                className={cn(
                  "flex items-start gap-3 p-3.5 transition",
                  n.read_at == null && "border-brand-200 bg-brand-50/50",
                )}
              >
                <span className="mt-1 flex h-2 w-2 shrink-0 rounded-full bg-brand-500 data-[read=true]:bg-transparent" data-read={n.read_at != null} />
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] font-semibold text-ink">{n.title}</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-ink-soft">{n.body}</p>
                  <p className="mt-1 text-[11.5px] text-ink-muted">
                    {new Date(n.created_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </Card>
            );
            return n.href ? (
              <Link key={n.id} href={n.href} onClick={() => markNotificationRead(n.id)}>
                {body}
              </Link>
            ) : (
              <button key={n.id} type="button" className="text-left" onClick={() => markNotificationRead(n.id)}>
                {body}
              </button>
            );
          })
        )}
      </div>

      {profile && (
        <Section className="mt-7" title="What you want to hear about">
          <Card className="divide-y divide-line-soft px-4">
            {PREF_COPY.map(({ key, label, description }) => (
              <Switch
                key={key}
                checked={profile.notification_prefs[key]}
                label={label}
                description={description}
                onChange={(next) =>
                  updateProfile(session.userId!, {
                    notification_prefs: { ...profile.notification_prefs, [key]: next },
                  })
                }
              />
            ))}
          </Card>
          <p className="mt-2 px-1 text-[12px] text-ink-muted">
            Push notifications aren&rsquo;t enabled in this prototype — these preferences are stored and
            respected by the notification model.
          </p>
        </Section>
      )}

      <div className="h-6" />
    </CustomerShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Payment methods                                                             */
/* -------------------------------------------------------------------------- */

export function PaymentMethodsScreen() {
  const { state, session } = useMarketplace();
  const { toast } = useToast();

  const methods = state?.paymentMethods.filter((m) => m.customer_id === session.userId) ?? [];
  const payments = (state?.payments ?? [])
    .filter((p) => p.customer_id === session.userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 8);

  return (
    <CustomerShell header="compact" title="Payment methods">
      <Section className="pt-4" title="Saved methods">
        {methods.length === 0 ? (
          <EmptyState
            icon={<CreditCard className="h-5 w-5" />}
            title="No payment methods yet"
            body="You'll be able to add a card, Apple Pay or Google Pay at checkout."
          />
        ) : (
          <Card className="divide-y divide-line-soft">
            {methods.map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-4">
                <span className="flex h-9 w-12 items-center justify-center rounded-lg bg-ink text-[11px] font-bold text-white">
                  {m.brand === "Apple Pay" ? "" : m.brand.slice(0, 4).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] font-semibold text-ink">
                    {m.brand} •••• {m.last4}
                  </p>
                  <p className="text-[12.5px] text-ink-muted">
                    Expires {`${m.exp_month}`.padStart(2, "0")}/{m.exp_year}
                  </p>
                </div>
                {m.is_default && <Badge tone="brand">Default</Badge>}
              </div>
            ))}
          </Card>
        )}
        <Button
          variant="outline"
          className="mt-3"
          icon={<Plus className="h-4 w-4" />}
          onClick={() =>
            toast({
              title: "Stripe isn't connected yet",
              description: "Card entry is handled by Stripe Elements in production.",
              tone: "info",
            })
          }
        >
          Add payment method
        </Button>
      </Section>

      <Section className="mt-7" title="Recent charges">
        {payments.length === 0 ? (
          <EmptyState title="No charges yet" body="Payments for your bookings will appear here." />
        ) : (
          <Card className="divide-y divide-line-soft">
            {payments.map((p) => {
              const appointment = state?.appointments.find((a) => a.id === p.appointment_id);
              const business = state?.businesses.find((b) => b.id === p.business_id);
              return (
                <div key={p.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium text-ink">{business?.name}</p>
                    <p className="text-[12.5px] text-ink-muted">
                      {appointment?.date} · {p.payment_method_brand} •••• {p.payment_method_last4}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[14px] font-semibold tabular-nums text-ink">
                      ${(p.amount_cents / 100).toFixed(2)}
                    </p>
                    {p.status === "refunded" && <Badge tone="neutral">Refunded</Badge>}
                  </div>
                </div>
              );
            })}
          </Card>
        )}
      </Section>

      <p className="mt-5 rounded-2xl bg-sunken px-4 py-3 text-[12.5px] leading-relaxed text-ink-muted">
        No real payments are processed in this prototype. The data model and checkout are structured
        for Stripe Payment Intents, with the marketplace commission split out per booking.
      </p>

      <div className="h-6" />
    </CustomerShell>
  );
}
