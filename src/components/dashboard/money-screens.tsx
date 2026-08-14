"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownToLine,
  BadgeCheck,
  Building2,
  CreditCard,
  Info,
  Plug,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { DashboardShell } from "./dashboard-shell";
import { BarChart, Donut, LineChart, RankedBars } from "./charts";
import { Button } from "@/components/ui/button";
import { Field, Input, Segmented, Select, Switch, Textarea } from "@/components/ui/form";
import { Badge, Card, EmptyState, Section, Skeleton, StatTile } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { useBusinessContext } from "@/lib/hooks";
import { useActions, useMarketplace } from "@/lib/store";
import { CALENDAR_INTEGRATIONS } from "@/lib/config";
import { bpsToPct, commissionBpsFor, formatCents } from "@/lib/pricing";
import { DAY_ABBR, DAY_NAMES, addDays, dayLabel, formatTime, parseDateOnly, toDateOnly } from "@/lib/time";

/* -------------------------------------------------------------------------- */
/* Analytics                                                                   */
/* -------------------------------------------------------------------------- */

export function BusinessAnalyticsScreen() {
  const context = useBusinessContext();
  const [range, setRange] = useState<"7" | "30" | "90">("30");

  const data = useMemo(() => {
    if (!context) return null;
    const { state, business, now } = context;
    const days = Number(range);
    const today = toDateOnly(now);
    const from = addDays(today, -(days - 1));

    const inRange = state.appointments.filter(
      (a) => a.business_id === business.id && a.date >= from && a.date <= today,
    );
    const earning = inRange.filter(
      (a) => a.status === "completed" || a.status === "confirmed" || a.status === "no_show",
    );

    // Bucket by day for the trend, collapsing to weeks on the 90-day view.
    const bucketDays = days > 30 ? 7 : 1;
    const buckets: { label: string; revenue: number; bookings: number; newCustomers: number }[] = [];
    for (let i = 0; i < days; i += bucketDays) {
      const start = addDays(from, i);
      const end = addDays(start, bucketDays - 1);
      const slice = earning.filter((a) => a.date >= start && a.date <= end);
      buckets.push({
        label:
          bucketDays === 1
            ? `${DAY_ABBR[parseDateOnly(start).getDay()]} ${parseDateOnly(start).getDate()}`
            : `${parseDateOnly(start).getMonth() + 1}/${parseDateOnly(start).getDate()}`,
        revenue: slice.reduce((sum, a) => sum + a.payout_cents, 0),
        bookings: slice.length,
        newCustomers: 0,
      });
    }

    const firstSeen = new Map<string, string>();
    for (const a of [...state.appointments]
      .filter((x) => x.business_id === business.id)
      .sort((x, y) => x.date.localeCompare(y.date))) {
      if (!firstSeen.has(a.customer_id)) firstSeen.set(a.customer_id, a.date);
    }
    const customersInRange = new Set(earning.map((a) => a.customer_id));
    const newCustomers = [...customersInRange].filter((id) => (firstSeen.get(id) ?? "") >= from).length;

    const services = new Map<string, { bookings: number; revenue: number }>();
    for (const a of earning) {
      const line = state.appointmentServices.find((l) => l.appointment_id === a.id);
      const service = line && state.services.find((s) => s.id === line.service_id);
      if (!service) continue;
      const rec = services.get(service.name) ?? { bookings: 0, revenue: 0 };
      rec.bookings += 1;
      rec.revenue += a.subtotal_cents;
      services.set(service.name, rec);
    }

    const hours = new Array(14).fill(0);
    for (const a of earning) {
      const hour = Number(a.start_time.slice(0, 2));
      if (hour >= 7 && hour < 21) hours[hour - 7] += 1;
    }

    const cancelled = inRange.filter(
      (a) => a.status === "cancelled_by_customer" || a.status === "cancelled_by_business",
    ).length;
    const recovered = earning.filter((a) => a.from_open_slot);
    const liveInventory = state.slots.filter(
      (s) => s.business_id === business.id && s.status !== "blocked",
    ).length;
    const filledSlots = recovered.length;
    const publishedSlots = liveInventory + filledSlots;

    return {
      buckets,
      revenue: earning.reduce((sum, a) => sum + a.payout_cents, 0),
      gross: earning.reduce((sum, a) => sum + a.total_cents, 0),
      commission: earning.reduce((sum, a) => sum + a.commission_cents, 0),
      bookings: earning.length,
      newCustomers,
      returning: customersInRange.size - newCustomers,
      averageBooking: earning.length
        ? Math.round(earning.reduce((sum, a) => sum + a.subtotal_cents, 0) / earning.length)
        : 0,
      cancellationRate: inRange.length ? cancelled / inRange.length : 0,
      fillRate: publishedSlots ? filledSlots / publishedSlots : 0,
      recoveredCents: recovered.reduce((sum, a) => sum + a.payout_cents, 0),
      recoveredCount: recovered.length,
      topServices: [...services.entries()]
        .map(([label, v]) => ({ label, value: v.revenue, bookings: v.bookings }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6),
      busiestHours: hours.map((count, i) => ({ label: `${((i + 7) % 12) || 12}${i + 7 >= 12 ? "p" : "a"}`, value: count })),
    };
  }, [context, range]);

  if (!context || !data) {
    return (
      <DashboardShell title="Analytics">
        <Skeleton className="h-80 w-full rounded-2xl" />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title="Analytics"
      subtitle={`Last ${range} days`}
      actions={
        <Segmented
          ariaLabel="Date range"
          size="sm"
          value={range}
          onChange={setRange}
          options={[
            { value: "7", label: "7d" },
            { value: "30", label: "30d" },
            { value: "90", label: "90d" },
          ]}
        />
      }
    >
      {/* The metric that matters most to a business using NOW. */}
      <Card className="border-brand-200 p-5">
        <p className="flex items-center gap-2 text-[13px] font-semibold text-brand-700">
          <TrendingUp className="h-4 w-4" />
          Empty time recovered by NOW
        </p>
        <div className="mt-1.5 flex flex-wrap items-end gap-x-6 gap-y-2">
          <p className="text-[40px] font-bold leading-none tracking-[-0.04em] text-ink">
            {formatCents(data.recoveredCents, { showCents: false })}
          </p>
          <p className="pb-1 text-[14px] text-ink-soft">
            {data.recoveredCount} empty {data.recoveredCount === 1 ? "slot" : "slots"} filled ·{" "}
            {Math.round(data.fillRate * 100)}% of published openings booked
          </p>
        </div>
      </Card>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Revenue after fees" value={formatCents(data.revenue, { showCents: false })} tone="brand" />
        <StatTile label="Bookings" value={data.bookings} />
        <StatTile label="Average booking" value={formatCents(data.averageBooking)} />
        <StatTile label="NOW commission" value={formatCents(data.commission, { showCents: false })} hint={`on ${formatCents(data.gross, { showCents: false })} gross`} />
      </div>

      <Section className="mt-6" title="Revenue trend">
        <Card className="p-4">
          <LineChart
            data={data.buckets.map((b) => ({ label: b.label, value: b.revenue }))}
            formatValue={(v) => formatCents(v, { showCents: false })}
          />
        </Card>
      </Section>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="text-[15px] font-semibold text-ink">Bookings per day</h3>
          <BarChart className="mt-3" data={data.buckets.map((b) => ({ label: b.label, value: b.bookings }))} />
        </Card>

        <Card className="p-4">
          <h3 className="text-[15px] font-semibold text-ink">Busiest hours</h3>
          <BarChart
            className="mt-3"
            tone="live"
            data={data.busiestHours}
          />
        </Card>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <Card className="flex items-center justify-around p-4">
          <Donut value={data.fillRate} label="Open-slot fill rate" tone="live" />
          <Donut value={data.cancellationRate} label="Cancellation rate" tone="urgent" />
        </Card>

        <Card className="p-4">
          <h3 className="text-[15px] font-semibold text-ink">Customers</h3>
          <div className="mt-3 space-y-3">
            <RankedBars
              data={[
                { label: "New", value: data.newCustomers },
                { label: "Returning", value: data.returning },
              ]}
            />
          </div>
          <p className="mt-3 text-[12.5px] text-ink-muted">
            {data.newCustomers + data.returning > 0
              ? `${Math.round((data.returning / (data.newCustomers + data.returning)) * 100)}% of bookings came from returning customers.`
              : "No bookings in this range yet."}
          </p>
        </Card>

        <Card className="p-4">
          <h3 className="text-[15px] font-semibold text-ink">Most popular services</h3>
          {data.topServices.length === 0 ? (
            <EmptyState className="border-0 py-6" title="No data yet" />
          ) : (
            <RankedBars
              className="mt-3"
              data={data.topServices}
              formatValue={(v) => formatCents(v, { showCents: false })}
            />
          )}
        </Card>
      </div>

      <div className="h-6" />
    </DashboardShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Payments                                                                    */
/* -------------------------------------------------------------------------- */

export function BusinessPaymentsScreen() {
  const context = useBusinessContext();
  const { state } = useMarketplace();
  const { toast } = useToast();

  if (!context || !state) {
    return (
      <DashboardShell title="Payments">
        <Skeleton className="h-64 w-full rounded-2xl" />
      </DashboardShell>
    );
  }

  const { business, metrics, now } = context;
  const payouts = state.payouts
    .filter((p) => p.business_id === business.id)
    .sort((a, b) => b.period_end.localeCompare(a.period_end));

  const transactions = state.appointments
    .filter((a) => a.business_id === business.id && (a.status === "completed" || a.status === "confirmed"))
    .sort((a, b) => `${b.date}${b.start_time}`.localeCompare(`${a.date}${a.start_time}`))
    .slice(0, 25);

  const commissionRate = commissionBpsFor(business, state.settings);

  return (
    <DashboardShell title="Payments" subtitle="Balances, transactions and payouts">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Available balance"
          value={formatCents(metrics.availableBalanceCents, { showCents: false })}
          hint="In transit to your bank"
          tone="brand"
        />
        <StatTile
          label="Pending"
          value={formatCents(metrics.pendingPayoutCents, { showCents: false })}
          hint="From upcoming appointments"
        />
        <StatTile label="This month" value={formatCents(metrics.monthRevenueCents, { showCents: false })} />
        <StatTile
          label="Platform fees"
          value={formatCents(metrics.platformFeesCents, { showCents: false })}
          hint={`${bpsToPct(commissionRate)} marketplace commission`}
        />
      </div>

      <Card className="mt-3 flex flex-wrap items-center gap-4 p-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink text-white">
          <CreditCard className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-semibold text-ink">Payouts</p>
          <p className="text-[13px] text-ink-muted">
            {business.verification_status === "verified"
              ? "Bank account connected · weekly payouts, two business days after each period."
              : "Connect a payout account to receive money from NOW bookings."}
          </p>
        </div>
        <Button
          variant={business.verification_status === "verified" ? "outline" : "primary"}
          onClick={() =>
            toast({
              title: "Stripe Connect isn't wired up yet",
              description: "Payouts are modelled end-to-end but no real account is connected in the prototype.",
              tone: "info",
            })
          }
        >
          {business.verification_status === "verified" ? "Manage account" : "Connect Stripe account"}
        </Button>
      </Card>

      <Section className="mt-6" title="Recent transactions">
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead className="border-b border-line-soft bg-sunken/50 text-[12px] font-semibold text-ink-muted">
                <tr>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Service</th>
                  <th className="px-4 py-2.5">Customer</th>
                  <th className="px-4 py-2.5 text-right">Booking</th>
                  <th className="px-4 py-2.5 text-right">NOW fee</th>
                  <th className="px-4 py-2.5 text-right">Payout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft text-[13.5px]">
                {transactions.map((a) => {
                  const line = state.appointmentServices.find((l) => l.appointment_id === a.id);
                  const service = line && state.services.find((s) => s.id === line.service_id);
                  const customer = state.users.find((u) => u.id === a.customer_id);
                  return (
                    <tr key={a.id}>
                      <td className="whitespace-nowrap px-4 py-3 text-ink-muted">
                        {parseDateOnly(a.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-ink">{service?.name}</span>
                        {a.from_open_slot && (
                          <Badge tone="brand" className="ml-2">
                            NOW
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-ink-muted">{customer?.full_name}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-ink">
                        {formatCents(a.total_cents)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-ink-muted">
                        −{formatCents(a.commission_cents)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-ink">
                        {formatCents(a.payout_cents)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {transactions.length === 0 && <EmptyState className="border-0" title="No transactions yet" />}
        </Card>
      </Section>

      <Section className="mt-6" title="Payout history">
        <Card className="divide-y divide-line-soft">
          {payouts.length === 0 ? (
            <EmptyState className="border-0" title="No payouts yet" />
          ) : (
            payouts.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sunken text-ink-soft">
                  <ArrowDownToLine className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium text-ink">
                    {parseDateOnly(p.period_start).toLocaleDateString("en-US", { month: "short", day: "numeric" })}{" "}
                    – {parseDateOnly(p.period_end).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                  <p className="text-[12.5px] text-ink-muted">
                    Arriving {dayLabel(p.arrival_date, now)}
                  </p>
                </div>
                <Badge tone={p.status === "paid" ? "neutral" : "live"}>{p.status.replace("_", " ")}</Badge>
                <p className="w-24 text-right text-[14.5px] font-semibold tabular-nums text-ink">
                  {formatCents(p.amount_cents, { showCents: false })}
                </p>
              </div>
            ))
          )}
        </Card>
      </Section>

      <p className="mt-4 flex items-start gap-2 rounded-2xl bg-sunken px-4 py-3 text-[12.5px] leading-relaxed text-ink-muted">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Figures shown are demo data. NOW charges {bpsToPct(commissionRate)} on bookings acquired through
        the marketplace; bookings you take yourself are commission-free.
      </p>

      <div className="h-6" />
    </DashboardShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Business profile                                                            */
/* -------------------------------------------------------------------------- */

export function BusinessProfileScreen() {
  const context = useBusinessContext();
  const { updateBusiness, setBusinessHours } = useActions();
  const { toast } = useToast();
  const [draft, setDraft] = useState<Record<string, string>>({});

  if (!context) {
    return (
      <DashboardShell title="Profile">
        <Skeleton className="h-64 w-full rounded-2xl" />
      </DashboardShell>
    );
  }

  const { state, business } = context;
  const hours = state.businessHours
    .filter((h) => h.business_id === business.id)
    .sort((a, b) => a.day_of_week - b.day_of_week);
  const verification = state.verifications.find((v) => v.business_id === business.id);

  function field(key: string, fallback: string) {
    return draft[key] ?? fallback;
  }

  function save() {
    updateBusiness(business.id, {
      name: field("name", business.name),
      tagline: field("tagline", business.tagline),
      about: field("about", business.about),
      phone: field("phone", business.phone),
      email: field("email", business.email),
      website: field("website", business.website ?? ""),
      address_line1: field("address", business.address_line1),
      parking_note: field("parking", business.parking_note ?? ""),
    });
    setDraft({});
    toast({ title: "Profile saved", description: "Your public listing has been updated.", tone: "success" });
  }

  return (
    <DashboardShell
      title="Business profile"
      subtitle="What customers see on NOW"
      actions={
        <Button size="sm" onClick={save} disabled={Object.keys(draft).length === 0}>
          Save
        </Button>
      }
    >
      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="space-y-4 p-4">
          <h3 className="text-[15px] font-semibold text-ink">Business information</h3>
          <Field label="Business name" htmlFor="biz-name">
            <Input
              id="biz-name"
              defaultValue={business.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            />
          </Field>
          <Field label="Tagline" htmlFor="biz-tagline">
            <Input
              id="biz-tagline"
              defaultValue={business.tagline}
              onChange={(e) => setDraft((d) => ({ ...d, tagline: e.target.value }))}
            />
          </Field>
          <Field label="About" htmlFor="biz-about">
            <Textarea
              id="biz-about"
              rows={5}
              defaultValue={business.about}
              onChange={(e) => setDraft((d) => ({ ...d, about: e.target.value }))}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone" htmlFor="biz-phone">
              <Input
                id="biz-phone"
                defaultValue={business.phone}
                onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
              />
            </Field>
            <Field label="Email" htmlFor="biz-email">
              <Input
                id="biz-email"
                defaultValue={business.email}
                onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
              />
            </Field>
          </div>
          <Field label="Website" htmlFor="biz-website">
            <Input
              id="biz-website"
              defaultValue={business.website ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, website: e.target.value }))}
            />
          </Field>
          <Field label="Address" htmlFor="biz-address">
            <Input
              id="biz-address"
              defaultValue={business.address_line1}
              onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))}
            />
          </Field>
          <Field label="Parking notes" htmlFor="biz-parking">
            <Textarea
              id="biz-parking"
              rows={2}
              defaultValue={business.parking_note ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, parking: e.target.value }))}
            />
          </Field>
        </Card>

        <div className="space-y-3">
          <Card className="p-4">
            <h3 className="text-[15px] font-semibold text-ink">Opening hours</h3>
            <div className="mt-3 space-y-2">
              {hours.map((h) => (
                <div key={h.id} className="flex items-center gap-2">
                  <span className="w-[86px] shrink-0 text-[13.5px] text-ink-soft">{DAY_NAMES[h.day_of_week]}</span>
                  {h.is_closed ? (
                    <span className="flex-1 text-[13.5px] text-ink-muted">Closed</span>
                  ) : (
                    <>
                      <Input
                        type="time"
                        aria-label={`${DAY_NAMES[h.day_of_week]} opening time`}
                        value={h.opens_at ?? "09:00"}
                        onChange={(e) =>
                          setBusinessHours(business.id, h.day_of_week, e.target.value, h.closes_at, false)
                        }
                        className="h-9 w-[120px] text-[13.5px]"
                      />
                      <span className="text-ink-muted">–</span>
                      <Input
                        type="time"
                        aria-label={`${DAY_NAMES[h.day_of_week]} closing time`}
                        value={h.closes_at ?? "18:00"}
                        onChange={(e) =>
                          setBusinessHours(business.id, h.day_of_week, h.opens_at, e.target.value, false)
                        }
                        className="h-9 w-[120px] text-[13.5px]"
                      />
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setBusinessHours(
                        business.id,
                        h.day_of_week,
                        h.opens_at ?? "09:00",
                        h.closes_at ?? "18:00",
                        !h.is_closed,
                      )
                    }
                  >
                    {h.is_closed ? "Open" : "Close"}
                  </Button>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
              <BadgeCheck className="h-4 w-4 text-brand-500" />
              Verification
            </h3>
            <Badge tone={business.verification_status === "verified" ? "live" : "caution"} className="mt-2">
              {business.verification_status}
            </Badge>
            <ul className="mt-3 space-y-1.5 text-[13px]">
              {[
                ["Business registration", verification?.business_registration_submitted],
                ["Phone verified", verification?.phone_verified],
                ["Email verified", verification?.email_verified],
                ["Address verified", verification?.address_verified],
                ["Identity verified", verification?.identity_verified],
                ["Payout account connected", verification?.payout_account_connected],
              ].map(([label, done]) => (
                <li key={String(label)} className="flex items-center justify-between gap-3">
                  <span className="text-ink-soft">{label as string}</span>
                  <Badge tone={done ? "live" : "neutral"}>{done ? "Done" : "Pending"}</Badge>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[12px] leading-relaxed text-ink-muted">
              Verification is modelled end-to-end but no documents are collected in this prototype. Only
              demo businesses show as verified.
            </p>
          </Card>

          <Card className="p-4">
            <h3 className="text-[15px] font-semibold text-ink">Photos</h3>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {business.gallery_seeds.map((seed) => (
                <div key={seed} className="aspect-square rounded-xl bg-sunken" />
              ))}
            </div>
            <Button variant="outline" size="sm" className="mt-3" disabled>
              Upload photos
            </Button>
            <p className="mt-2 text-[12px] text-ink-muted">Image storage isn&rsquo;t connected yet.</p>
          </Card>
        </div>
      </div>

      <div className="h-6" />
    </DashboardShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Settings                                                                    */
/* -------------------------------------------------------------------------- */

export function BusinessSettingsScreen() {
  const context = useBusinessContext();
  const { updateBusiness } = useActions();
  const { state, resetDemo } = useMarketplace();
  const { toast } = useToast();

  if (!context || !state) {
    return (
      <DashboardShell title="Settings">
        <Skeleton className="h-64 w-full rounded-2xl" />
      </DashboardShell>
    );
  }

  const { business } = context;
  const policy = business.cancellation_policy;
  const commissionRate = commissionBpsFor(business, state.settings);

  return (
    <DashboardShell title="Settings">
      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="text-[15px] font-semibold text-ink">Booking rules</h3>
          <div className="mt-2 divide-y divide-line-soft">
            <Switch
              checked={business.instant_book}
              onChange={(next) => updateBusiness(business.id, { instant_book: next })}
              label="Instant booking"
              description="Customers book without waiting for you to approve."
            />
            <Switch
              checked={business.auto_fill_cancellations}
              onChange={(next) => {
                updateBusiness(business.id, { auto_fill_cancellations: next });
                toast({
                  title: next ? "Auto-fill on" : "Auto-fill off",
                  description: next
                    ? "Cancellations are republished to the marketplace automatically."
                    : "You'll publish cancellations manually.",
                  tone: "success",
                });
              }}
              label="Auto-fill cancellations"
              description="Republish a cancelled appointment as an opening the moment it frees up."
            />
          </div>

          <Field className="mt-4" label="Free cancellation window" htmlFor="policy-hours">
            <Select
              id="policy-hours"
              value={policy.free_cancellation_hours}
              onChange={(e) =>
                updateBusiness(business.id, {
                  cancellation_policy: { ...policy, free_cancellation_hours: Number(e.target.value) },
                })
              }
            >
              {[2, 4, 6, 12, 24, 48].map((h) => (
                <option key={h} value={h}>
                  {h} hours before the appointment
                </option>
              ))}
            </Select>
          </Field>

          <Field className="mt-4" label="Late cancellation fee" htmlFor="policy-fee">
            <Select
              id="policy-fee"
              value={policy.late_cancellation_fee_pct}
              onChange={(e) =>
                updateBusiness(business.id, {
                  cancellation_policy: { ...policy, late_cancellation_fee_pct: Number(e.target.value) },
                })
              }
            >
              {[0, 25, 50, 100].map((p) => (
                <option key={p} value={p}>
                  {p}% of the service price
                </option>
              ))}
            </Select>
          </Field>

          <p className="mt-3 rounded-xl bg-sunken px-3.5 py-2.5 text-[12.5px] leading-relaxed text-ink-muted">
            Customers see this policy before they pay: &ldquo;Free cancellation until{" "}
            {policy.free_cancellation_hours} hours before your appointment.&rdquo;
          </p>
        </Card>

        <div className="space-y-3">
          <Card className="p-4">
            <h3 className="text-[15px] font-semibold text-ink">Plan &amp; commission</h3>
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-line p-3.5">
              <div>
                <p className="text-[14px] font-semibold text-ink">
                  {business.subscription_tier === "pro" ? "NOW Business Pro" : "Free plan"}
                </p>
                <p className="text-[12.5px] text-ink-muted">
                  {bpsToPct(commissionRate)} commission on marketplace bookings
                </p>
              </div>
              <Badge tone={business.subscription_tier === "pro" ? "brand" : "neutral"}>
                {business.subscription_tier === "pro" ? "Pro" : "Free"}
              </Badge>
            </div>

            {business.subscription_tier !== "pro" && (
              <div className="mt-3 rounded-xl border border-brand-200 bg-brand-50/60 p-3.5">
                <p className="flex items-center gap-2 text-[14px] font-semibold text-brand-700">
                  <Sparkles className="h-4 w-4" />
                  NOW Business Pro · {formatCents(state.settings.pro_subscription_price_cents, { showCents: false })}/mo
                </p>
                <ul className="mt-2 space-y-1 text-[12.5px] text-ink-soft">
                  <li>· {bpsToPct(state.settings.pro_commission_bps)} commission instead of {bpsToPct(state.settings.commission_bps)}</li>
                  <li>· Automated cancellation filling</li>
                  <li>· Advanced analytics and customer reactivation</li>
                  <li>· Featured placement in your categories</li>
                </ul>
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={() =>
                    toast({
                      title: "Pro isn't purchasable in the prototype",
                      description: "Subscription billing would run through Stripe Billing.",
                      tone: "info",
                    })
                  }
                >
                  Learn about Pro
                </Button>
              </div>
            )}
          </Card>

          <Card className="p-4">
            <h3 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
              <Plug className="h-4 w-4 text-brand-500" />
              Calendar integrations
            </h3>
            <p className="mt-1 text-[12.5px] text-ink-muted">
              Two-way sync is on the roadmap. Nothing below is connected yet.
            </p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {CALENDAR_INTEGRATIONS.map((integration) => (
                <li
                  key={integration.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2.5"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px] font-medium text-ink">
                      {integration.name}
                    </span>
                    <span className="block truncate text-[11.5px] text-ink-muted">{integration.blurb}</span>
                  </span>
                  <Badge tone="neutral">Coming soon</Badge>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-4">
            <h3 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
              <Building2 className="h-4 w-4 text-ink-muted" />
              Account
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={resetDemo}>
                Reset demo data
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  toast({
                    title: "Support request opened",
                    description: "A real build would create a ticket here.",
                    tone: "success",
                  })
                }
              >
                Contact support
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <div className="h-6" />
    </DashboardShell>
  );
}

export { formatTime };
