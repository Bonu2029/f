"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, Building2, DollarSign, Search, Users } from "lucide-react";
import { AdminShell } from "./admin-shell";
import { BarChart, RankedBars } from "@/components/dashboard/charts";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Avatar } from "@/components/ui/media";
import { Chip, Field, Input, Select, Switch, Textarea } from "@/components/ui/form";
import { Badge, Card, EmptyState, Rating, Section, Skeleton, StarRow, StatTile } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { STATUS_META } from "@/components/bookings/status";
import { useMarketplace, useActions } from "@/lib/store";
import { platformMetrics } from "@/lib/store/selectors";
import { bpsToPct, formatCents } from "@/lib/pricing";
import { addDays, dayLabel, parseDateOnly, toDateOnly } from "@/lib/time";
import { CITIES } from "@/lib/data/cities";
import type { Business, BusinessStatus, Dispute } from "@/lib/types";

function useAdminState() {
  const { state } = useMarketplace();
  return state;
}

/* -------------------------------------------------------------------------- */
/* Overview                                                                    */
/* -------------------------------------------------------------------------- */

export function AdminOverviewScreen() {
  const state = useAdminState();
  if (!state) {
    return (
      <AdminShell title="Platform overview">
        <Skeleton className="h-64 w-full rounded-2xl" />
      </AdminShell>
    );
  }

  const m = platformMetrics(state);
  const today = toDateOnly(new Date(state.now));
  const trend = Array.from({ length: 14 }, (_, i) => {
    const date = addDays(today, -(13 - i));
    const bookings = state.appointments.filter((a) => a.date === date);
    return {
      label: `${parseDateOnly(date).getMonth() + 1}/${parseDateOnly(date).getDate()}`,
      value: bookings.reduce((sum, a) => sum + a.total_cents, 0),
    };
  });

  return (
    <AdminShell title="Platform overview" subtitle="Last 30 days across all markets">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Gross booking value" value={formatCents(m.gmvCents, { showCents: false })} tone="brand" />
        <StatTile label="NOW revenue" value={formatCents(m.revenueCents, { showCents: false })} hint="Commission + service fees" />
        <StatTile label="Bookings" value={m.bookings30d.toLocaleString()} />
        <StatTile label="Average order" value={formatCents(m.averageOrderCents)} />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Total users" value={m.totalUsers.toLocaleString()} icon={<Users className="h-4 w-4" />} />
        <StatTile label="Active businesses" value={m.activeBusinesses} icon={<Building2 className="h-4 w-4" />} />
        <StatTile label="Repeat booking rate" value={`${Math.round(m.repeatRate * 100)}%`} />
        <StatTile
          label="Open cases"
          value={m.openDisputes + m.reportedReviews}
          tone={m.openDisputes + m.reportedReviews > 0 ? "urgent" : "neutral"}
          hint={`${m.openDisputes} disputes · ${m.reportedReviews} reported reviews`}
        />
      </div>

      <Section className="mt-6" title="Gross booking value">
        <Card className="p-4">
          <BarChart data={trend} formatValue={(v) => formatCents(v, { showCents: false })} height={180} />
        </Card>
      </Section>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="text-[15px] font-semibold text-ink">Top categories</h3>
          <RankedBars
            className="mt-3"
            data={m.topCategories.map((c) => ({ label: `${c.name} · ${c.bookings} bookings`, value: c.gmvCents }))}
            formatValue={(v) => formatCents(v, { showCents: false })}
          />
        </Card>
        <Card className="p-4">
          <h3 className="text-[15px] font-semibold text-ink">Markets</h3>
          <ul className="mt-3 space-y-2">
            {CITIES.map((city) => (
              <li key={city.id} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3.5 py-2.5">
                <span>
                  <span className="block text-[14px] font-medium text-ink">
                    {city.name}, {city.state_code}
                  </span>
                  <span className="block text-[12px] text-ink-muted">
                    {city.is_live
                      ? `${m.activeBusinesses} businesses · ${m.bookings30d} bookings`
                      : "Not launched"}
                  </span>
                </span>
                <Badge tone={city.is_live ? "live" : "neutral"}>{city.is_live ? "Live" : "Planned"}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </AdminShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Businesses                                                                  */
/* -------------------------------------------------------------------------- */

const BUSINESS_TABS: { value: BusinessStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "active", label: "Verified & active" },
  { value: "suspended", label: "Suspended" },
  { value: "rejected", label: "Rejected" },
];

export function AdminBusinessesScreen() {
  const state = useAdminState();
  const { setBusinessStatus, setVerification } = useActions();
  const { toast } = useToast();
  const [tab, setTab] = useState<BusinessStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Business | null>(null);

  if (!state) {
    return (
      <AdminShell title="Businesses">
        <Skeleton className="h-64 w-full rounded-2xl" />
      </AdminShell>
    );
  }

  const businesses = state.businesses
    .filter((b) => (tab === "all" ? true : b.status === tab))
    .filter((b) =>
      query.trim() ? `${b.name} ${b.neighborhood} ${b.email}`.toLowerCase().includes(query.toLowerCase()) : true,
    );

  return (
    <AdminShell title="Businesses" subtitle={`${state.businesses.length} listed on NOW`}>
      <div className="flex flex-wrap items-center gap-2">
        {BUSINESS_TABS.map((t) => (
          <Chip key={t.value} active={tab === t.value} onClick={() => setTab(t.value)}>
            {t.label}
          </Chip>
        ))}
        <div className="relative ml-auto min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search businesses"
            className="h-9 pl-9 text-[13.5px]"
            aria-label="Search businesses"
          />
        </div>
      </div>

      <Card className="mt-4 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead className="border-b border-line-soft bg-sunken/50 text-[12px] font-semibold text-ink-muted">
              <tr>
                <th className="px-4 py-2.5">Business</th>
                <th className="px-4 py-2.5">Category</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Verification</th>
                <th className="px-4 py-2.5 text-right">Rating</th>
                <th className="px-4 py-2.5 text-right">Bookings</th>
                <th className="px-4 py-2.5 text-right">GMV</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft text-[13.5px]">
              {businesses.map((b) => {
                const category = state.categories.find((c) => c.id === b.primary_category_id);
                const appointments = state.appointments.filter((a) => a.business_id === b.id);
                const gmv = appointments.reduce((sum, a) => sum + a.total_cents, 0);
                return (
                  <tr
                    key={b.id}
                    className="cursor-pointer transition hover:bg-sunken/40"
                    onClick={() => setSelected(b)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar seed={`${b.media_seed}-logo`} name={b.name} size={32} className="rounded-lg" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink">{b.name}</p>
                          <p className="truncate text-[12px] text-ink-muted">{b.neighborhood}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{category?.name}</td>
                    <td className="px-4 py-3">
                      <Badge
                        tone={
                          b.status === "active" ? "live" : b.status === "suspended" ? "urgent" : "caution"
                        }
                      >
                        {b.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={b.verification_status === "verified" ? "brand" : "neutral"}>
                        {b.verification_status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink">{b.rating.toFixed(1)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink">{appointments.length}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-ink">
                      {formatCents(gmv, { showCents: false })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {businesses.length === 0 && <EmptyState className="border-0" title="No businesses match" />}
      </Card>

      <Modal
        open={selected != null}
        onClose={() => setSelected(null)}
        title={selected?.name ?? ""}
        description={selected ? `${selected.address_line1}, ${selected.neighborhood}` : undefined}
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge tone={selected.status === "active" ? "live" : "caution"}>{selected.status}</Badge>
              <Badge tone={selected.verification_status === "verified" ? "brand" : "neutral"}>
                {selected.verification_status}
              </Badge>
              <Badge tone="neutral">{selected.subscription_tier === "pro" ? "Pro" : "Free"}</Badge>
            </div>

            <p className="text-[13.5px] leading-relaxed text-ink-soft">{selected.about}</p>

            <div className="grid grid-cols-2 gap-2.5">
              <StatTile label="Rating" value={selected.rating.toFixed(1)} />
              <StatTile label="Reviews" value={selected.review_count} />
            </div>

            <div>
              <p className="mb-2 text-[13px] font-semibold text-ink-soft">Account status</p>
              <div className="flex flex-wrap gap-2">
                {(["active", "suspended", "rejected", "pending"] as BusinessStatus[]).map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={selected.status === s ? "primary" : "outline"}
                    onClick={() => {
                      setBusinessStatus(selected.id, s);
                      toast({ title: `${selected.name} marked ${s}`, tone: "success" });
                      setSelected({ ...selected, status: s });
                    }}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-[13px] font-semibold text-ink-soft">Verification</p>
              <div className="flex flex-wrap gap-2">
                {(["verified", "pending", "rejected", "unverified"] as const).map((v) => (
                  <Button
                    key={v}
                    size="sm"
                    variant={selected.verification_status === v ? "primary" : "outline"}
                    onClick={() => {
                      setVerification(selected.id, v, null);
                      toast({ title: `Verification set to ${v}`, tone: "success" });
                      setSelected({ ...selected, verification_status: v });
                    }}
                  >
                    {v}
                  </Button>
                ))}
              </div>
              <p className="mt-2 text-[12px] text-ink-muted">
                Only mark a business verified once registration, address and identity checks pass.
              </p>
            </div>

            <Link
              href={`/business/${selected.slug}`}
              className="inline-block text-[13.5px] font-semibold text-brand-600 hover:text-brand-700"
            >
              View public profile →
            </Link>
          </div>
        )}
      </Modal>
    </AdminShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Users                                                                       */
/* -------------------------------------------------------------------------- */

export function AdminUsersScreen() {
  const state = useAdminState();
  const [role, setRole] = useState<"all" | "customer" | "business" | "admin">("all");
  const [query, setQuery] = useState("");

  if (!state) {
    return (
      <AdminShell title="Users">
        <Skeleton className="h-64 w-full rounded-2xl" />
      </AdminShell>
    );
  }

  const users = state.users
    .filter((u) => (role === "all" ? true : u.account_type === role))
    .filter((u) => (query.trim() ? `${u.full_name} ${u.email}`.toLowerCase().includes(query.toLowerCase()) : true))
    .slice(0, 80);

  return (
    <AdminShell title="Users" subtitle={`${state.users.length} accounts`}>
      <div className="flex flex-wrap items-center gap-2">
        {(["all", "customer", "business", "admin"] as const).map((r) => (
          <Chip key={r} active={role === r} onClick={() => setRole(r)}>
            {r === "all" ? "All accounts" : `${r}s`}
          </Chip>
        ))}
        <div className="relative ml-auto min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users"
            className="h-9 pl-9 text-[13.5px]"
            aria-label="Search users"
          />
        </div>
      </div>

      <Card className="mt-4 divide-y divide-line-soft">
        {users.map((u) => {
          const bookings = state.appointments.filter((a) => a.customer_id === u.id).length;
          return (
            <div key={u.id} className="flex items-center gap-3 p-3.5">
              <Avatar seed={u.id} name={u.full_name} size={38} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14.5px] font-medium text-ink">{u.full_name}</p>
                <p className="truncate text-[12.5px] text-ink-muted">
                  {u.email} · {u.phone}
                </p>
              </div>
              <Badge tone={u.account_type === "admin" ? "dark" : u.account_type === "business" ? "brand" : "neutral"}>
                {u.account_type}
              </Badge>
              <p className="w-24 text-right text-[13px] tabular-nums text-ink-muted">
                {bookings} {bookings === 1 ? "booking" : "bookings"}
              </p>
            </div>
          );
        })}
      </Card>
    </AdminShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Bookings                                                                    */
/* -------------------------------------------------------------------------- */

export function AdminBookingsScreen() {
  const state = useAdminState();
  const [filter, setFilter] = useState<"all" | "cancelled" | "refunded" | "disputed">("all");

  if (!state) {
    return (
      <AdminShell title="Bookings">
        <Skeleton className="h-64 w-full rounded-2xl" />
      </AdminShell>
    );
  }

  const appointments = state.appointments
    .filter((a) => {
      if (filter === "all") return true;
      if (filter === "cancelled")
        return a.status === "cancelled_by_business" || a.status === "cancelled_by_customer";
      if (filter === "refunded") return a.status === "refunded";
      return a.status === "disputed";
    })
    .sort((a, b) => `${b.date}${b.start_time}`.localeCompare(`${a.date}${a.start_time}`))
    .slice(0, 60);

  const now = new Date(state.now);

  return (
    <AdminShell title="Bookings" subtitle={`${state.appointments.length.toLocaleString()} total`}>
      <div className="flex flex-wrap gap-2">
        {(["all", "cancelled", "refunded", "disputed"] as const).map((f) => (
          <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>
            {f === "all" ? "All bookings" : f}
          </Chip>
        ))}
      </div>

      <Card className="mt-4 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead className="border-b border-line-soft bg-sunken/50 text-[12px] font-semibold text-ink-muted">
              <tr>
                <th className="px-4 py-2.5">Reference</th>
                <th className="px-4 py-2.5">Business</th>
                <th className="px-4 py-2.5">Customer</th>
                <th className="px-4 py-2.5">When</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Total</th>
                <th className="px-4 py-2.5 text-right">NOW fee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft text-[13.5px]">
              {appointments.map((a) => {
                const business = state.businesses.find((b) => b.id === a.business_id);
                const customer = state.users.find((u) => u.id === a.customer_id);
                const meta = STATUS_META[a.status];
                return (
                  <tr key={a.id}>
                    <td className="px-4 py-3 font-mono text-[12.5px] text-ink-muted">{a.reference}</td>
                    <td className="px-4 py-3 text-ink">{business?.name}</td>
                    <td className="px-4 py-3 text-ink-muted">{customer?.full_name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-muted">{dayLabel(a.date, now)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={meta.tone}>{meta.short}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink">{formatCents(a.total_cents)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink-muted">
                      {formatCents(a.commission_cents + a.service_fee_cents)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </AdminShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Disputes                                                                    */
/* -------------------------------------------------------------------------- */

export function AdminDisputesScreen() {
  const state = useAdminState();
  const { resolveDispute } = useActions();
  const { toast } = useToast();
  const [selected, setSelected] = useState<Dispute | null>(null);
  const [note, setNote] = useState("");

  if (!state) {
    return (
      <AdminShell title="Disputes">
        <Skeleton className="h-64 w-full rounded-2xl" />
      </AdminShell>
    );
  }

  const disputes = [...state.disputes].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const open = disputes.filter((d) => d.status === "open" || d.status === "under_review");

  return (
    <AdminShell title="Disputes & reports" subtitle={`${open.length} awaiting action`}>
      {disputes.length === 0 ? (
        <EmptyState
          icon={<AlertTriangle className="h-5 w-5" />}
          title="Nothing to review"
          body="Reported businesses, reported customers, refund requests and booking disputes all land here."
        />
      ) : (
        <div className="grid gap-2.5">
          {disputes.map((d) => {
            const business = state.businesses.find((b) => b.id === d.business_id);
            const customer = state.users.find((u) => u.id === d.customer_id);
            return (
              <Card key={d.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[15px] font-semibold text-ink">{d.reason}</p>
                      <Badge
                        tone={
                          d.status === "open" ? "urgent" : d.status === "under_review" ? "caution" : "neutral"
                        }
                      >
                        {d.status.replace("_", " ")}
                      </Badge>
                      <Badge tone="neutral">{d.kind.replace(/_/g, " ")}</Badge>
                    </div>
                    <p className="mt-1 text-[13.5px] leading-relaxed text-ink-soft">{d.detail}</p>
                    <p className="mt-1.5 text-[12.5px] text-ink-muted">
                      {business?.name}
                      {customer && ` · ${customer.full_name}`} · opened by {d.opened_by_role} ·{" "}
                      {new Date(d.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <div className="text-right">
                    {d.amount_in_question_cents != null && (
                      <p className="text-[16px] font-semibold text-ink">
                        {formatCents(d.amount_in_question_cents)}
                      </p>
                    )}
                    {(d.status === "open" || d.status === "under_review") && (
                      <Button size="sm" className="mt-2" onClick={() => { setSelected(d); setNote(""); }}>
                        Review
                      </Button>
                    )}
                  </div>
                </div>
                {d.resolution_note && (
                  <p className="mt-3 rounded-xl bg-sunken px-3.5 py-2.5 text-[12.5px] text-ink-muted">
                    Resolution: {d.resolution_note}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={selected != null}
        onClose={() => setSelected(null)}
        title="Resolve dispute"
        description={selected?.reason}
        footer={
          <div className="flex gap-2">
            <Button
              variant="outline"
              fullWidth
              onClick={() => {
                if (selected) resolveDispute(selected.id, "rejected", note || "No action taken.");
                toast({ title: "Dispute closed with no action", tone: "success" });
                setSelected(null);
              }}
            >
              Reject
            </Button>
            <Button
              fullWidth
              onClick={() => {
                if (selected) resolveDispute(selected.id, "resolved", note || "Resolved by NOW support.");
                toast({ title: "Dispute resolved", tone: "success" });
                setSelected(null);
              }}
            >
              Resolve
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-[13.5px] leading-relaxed text-ink-soft">{selected?.detail}</p>
          <Field label="Resolution note" htmlFor="dispute-note" hint="Shared with both parties.">
            <Textarea id="dispute-note" value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </div>
      </Modal>
    </AdminShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Reviews                                                                     */
/* -------------------------------------------------------------------------- */

export function AdminReviewsScreen() {
  const state = useAdminState();
  const { setReviewHidden } = useActions();
  const { toast } = useToast();
  const [onlyReported, setOnlyReported] = useState(true);

  if (!state) {
    return (
      <AdminShell title="Reviews">
        <Skeleton className="h-64 w-full rounded-2xl" />
      </AdminShell>
    );
  }

  const reviews = state.reviews
    .filter((r) => (onlyReported ? r.is_reported : true))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 40);

  return (
    <AdminShell
      title="Reviews"
      subtitle={`${state.reviews.filter((r) => r.is_reported).length} reported`}
      actions={
        <Chip active={onlyReported} onClick={() => setOnlyReported(!onlyReported)}>
          Reported only
        </Chip>
      }
    >
      {reviews.length === 0 ? (
        <EmptyState title="Nothing reported" body="Reported reviews appear here for moderation." />
      ) : (
        <div className="grid gap-2.5">
          {reviews.map((r) => {
            const business = state.businesses.find((b) => b.id === r.business_id);
            const customer = state.users.find((u) => u.id === r.customer_id);
            return (
              <Card key={r.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[14.5px] font-semibold text-ink">{customer?.full_name}</p>
                      <StarRow value={r.rating} />
                      <Badge tone="neutral">{business?.name}</Badge>
                      {r.is_hidden && <Badge tone="urgent">Hidden</Badge>}
                    </div>
                    <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">{r.body}</p>
                    {r.report_reason && (
                      <p className="mt-2 rounded-xl bg-caution-50 px-3 py-2 text-[12.5px] text-caution-700">
                        Reported: {r.report_reason}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant={r.is_hidden ? "outline" : "danger"}
                    onClick={() => {
                      setReviewHidden(r.id, !r.is_hidden);
                      toast({ title: r.is_hidden ? "Review restored" : "Review hidden", tone: "success" });
                    }}
                  >
                    {r.is_hidden ? "Restore" : "Hide"}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Categories                                                                  */
/* -------------------------------------------------------------------------- */

export function AdminCategoriesScreen() {
  const state = useAdminState();
  const { toggleCategory } = useActions();

  if (!state) {
    return (
      <AdminShell title="Categories">
        <Skeleton className="h-64 w-full rounded-2xl" />
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Service categories" subtitle={`${state.categories.length} categories`}>
      <Card className="divide-y divide-line-soft px-4">
        {state.categories.map((c) => {
          const businesses = state.businesses.filter((b) => b.category_ids.includes(c.id)).length;
          const services = state.services.filter((s) => s.category_id === c.id).length;
          return (
            <Switch
              key={c.id}
              checked={c.is_active}
              onChange={(next) => toggleCategory(c.id, next)}
              label={`${c.name} — /${c.slug}`}
              description={`${businesses} businesses · ${services} services · synonyms: ${c.synonyms.slice(0, 4).join(", ")}`}
            />
          );
        })}
      </Card>
      <p className="mt-3 text-[12.5px] text-ink-muted">
        Turning a category off removes it from search and the home screen without touching existing
        bookings. Categories are data — adding one needs no code change.
      </p>
    </AdminShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Payments                                                                    */
/* -------------------------------------------------------------------------- */

export function AdminPaymentsScreen() {
  const state = useAdminState();
  if (!state) {
    return (
      <AdminShell title="Payments">
        <Skeleton className="h-64 w-full rounded-2xl" />
      </AdminShell>
    );
  }

  const m = platformMetrics(state);
  const refunds = state.payments.filter((p) => p.status === "refunded");
  const payouts = [...state.payouts].sort((a, b) => b.period_end.localeCompare(a.period_end)).slice(0, 20);

  return (
    <AdminShell title="Payments" subtitle="Marketplace money movement">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="GMV (30d)" value={formatCents(m.gmvCents, { showCents: false })} tone="brand" />
        <StatTile label="NOW revenue" value={formatCents(m.revenueCents, { showCents: false })} icon={<DollarSign className="h-4 w-4" />} />
        <StatTile label="Business payouts" value={formatCents(m.payoutsCents, { showCents: false })} />
        <StatTile
          label="Refunds"
          value={formatCents(refunds.reduce((sum, p) => sum + p.refunded_cents, 0), { showCents: false })}
          tone={refunds.length ? "urgent" : "neutral"}
          hint={`${refunds.length} refunded bookings`}
        />
      </div>

      <Section className="mt-6" title="Recent payouts">
        <Card className="divide-y divide-line-soft">
          {payouts.map((p) => {
            const business = state.businesses.find((b) => b.id === p.business_id);
            return (
              <div key={p.id} className="flex items-center gap-3 p-3.5">
                <Avatar seed={`${business?.media_seed}-logo`} name={business?.name ?? "?"} size={34} className="rounded-lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-ink">{business?.name}</p>
                  <p className="text-[12px] text-ink-muted">
                    {p.period_start} – {p.period_end}
                  </p>
                </div>
                <Badge tone={p.status === "paid" ? "neutral" : "live"}>{p.status.replace("_", " ")}</Badge>
                <p className="w-24 text-right text-[14px] font-semibold tabular-nums text-ink">
                  {formatCents(p.amount_cents, { showCents: false })}
                </p>
              </div>
            );
          })}
        </Card>
      </Section>
    </AdminShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Platform settings                                                           */
/* -------------------------------------------------------------------------- */

export function AdminSettingsScreen() {
  const state = useAdminState();
  const { updateSettings } = useActions();
  const { toast } = useToast();

  if (!state) {
    return (
      <AdminShell title="Platform settings">
        <Skeleton className="h-64 w-full rounded-2xl" />
      </AdminShell>
    );
  }

  const s = state.settings;

  return (
    <AdminShell title="Platform settings" subtitle="These values drive every price calculation in NOW">
      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="space-y-4 p-4">
          <h3 className="text-[15px] font-semibold text-ink">Marketplace economics</h3>

          <Field
            label="Marketplace commission"
            htmlFor="set-commission"
            hint={`Currently ${bpsToPct(s.commission_bps)} of the service subtotal on bookings acquired through NOW.`}
          >
            <Select
              id="set-commission"
              value={s.commission_bps}
              onChange={(e) => {
                updateSettings({ commission_bps: Number(e.target.value) });
                toast({ title: `Commission set to ${bpsToPct(Number(e.target.value))}`, tone: "success" });
              }}
            >
              {[800, 1000, 1200, 1500, 1800, 2000].map((bps) => (
                <option key={bps} value={bps}>
                  {bpsToPct(bps)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Pro plan commission" htmlFor="set-pro-commission">
            <Select
              id="set-pro-commission"
              value={s.pro_commission_bps}
              onChange={(e) => updateSettings({ pro_commission_bps: Number(e.target.value) })}
            >
              {[500, 700, 900, 1000].map((bps) => (
                <option key={bps} value={bps}>
                  {bpsToPct(bps)}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Customer service fee ($)" htmlFor="set-fee-flat">
              <Input
                id="set-fee-flat"
                type="number"
                min={0}
                step={0.25}
                value={(s.customer_service_fee_cents / 100).toFixed(2)}
                onChange={(e) =>
                  updateSettings({ customer_service_fee_cents: Math.round(Number(e.target.value) * 100) })
                }
              />
            </Field>
            <Field label="Service fee (%)" htmlFor="set-fee-pct">
              <Input
                id="set-fee-pct"
                type="number"
                min={0}
                max={20}
                step={0.5}
                value={s.customer_service_fee_bps / 100}
                onChange={(e) =>
                  updateSettings({ customer_service_fee_bps: Math.round(Number(e.target.value) * 100) })
                }
              />
            </Field>
          </div>

          <Field label="Pro subscription ($/month)" htmlFor="set-pro-price">
            <Input
              id="set-pro-price"
              type="number"
              min={0}
              step={1}
              value={s.pro_subscription_price_cents / 100}
              onChange={(e) =>
                updateSettings({ pro_subscription_price_cents: Math.round(Number(e.target.value) * 100) })
              }
            />
          </Field>
        </Card>

        <div className="space-y-3">
          <Card className="space-y-4 p-4">
            <h3 className="text-[15px] font-semibold text-ink">Booking rules</h3>
            <Field label="Default free cancellation window" htmlFor="set-cancel">
              <Select
                id="set-cancel"
                value={s.default_free_cancellation_hours}
                onChange={(e) => updateSettings({ default_free_cancellation_hours: Number(e.target.value) })}
              >
                {[2, 4, 6, 12, 24].map((h) => (
                  <option key={h} value={h}>
                    {h} hours
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Checkout hold" htmlFor="set-hold" hint="How long a slot is reserved during checkout.">
              <Select
                id="set-hold"
                value={s.slot_hold_seconds}
                onChange={(e) => updateSettings({ slot_hold_seconds: Number(e.target.value) })}
              >
                {[120, 300, 600, 900].map((sec) => (
                  <option key={sec} value={sec}>
                    {sec / 60} minutes
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Last-minute window" htmlFor="set-window" hint="Slots starting inside this window are treated as last-minute.">
              <Select
                id="set-window"
                value={s.last_minute_window_hours}
                onChange={(e) => updateSettings({ last_minute_window_hours: Number(e.target.value) })}
              >
                {[4, 8, 12, 24, 48].map((h) => (
                  <option key={h} value={h}>
                    {h} hours
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Default search radius" htmlFor="set-radius">
              <Select
                id="set-radius"
                value={s.default_search_radius_miles}
                onChange={(e) => updateSettings({ default_search_radius_miles: Number(e.target.value) })}
              >
                {[3, 5, 10, 25].map((r) => (
                  <option key={r} value={r}>
                    {r} miles
                  </option>
                ))}
              </Select>
            </Field>
          </Card>

          <Card className="p-4">
            <h3 className="text-[15px] font-semibold text-ink">Supported cities</h3>
            <ul className="mt-3 space-y-2">
              {CITIES.map((city) => (
                <li key={city.id} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3.5 py-2.5">
                  <span className="text-[14px] text-ink">
                    {city.name}, {city.state_code}
                  </span>
                  <Badge tone={city.is_live ? "live" : "neutral"}>{city.is_live ? "Live" : "Planned"}</Badge>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[12px] leading-relaxed text-ink-muted">
              Cities, categories and commission are all configuration. Nothing in the booking pipeline
              hard-codes Philadelphia or a 12% take rate.
            </p>
          </Card>
        </div>
      </div>
    </AdminShell>
  );
}

export { Rating };
