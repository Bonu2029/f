"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  Eye,
  Sparkles,
  TrendingUp,
  UserPlus,
  Zap,
} from "lucide-react";
import { DashboardShell } from "./dashboard-shell";
import { FillSlotModal } from "./fill-slot-modal";
import { Button, ButtonLink } from "@/components/ui/button";
import { Avatar } from "@/components/ui/media";
import { Badge, Card, EmptyState, LiveDot, Section, Skeleton, StatTile } from "@/components/ui/primitives";
import { STATUS_META } from "@/components/bookings/status";
import { buildDaySchedule } from "./schedule";
import { useBusinessContext } from "@/lib/hooks";
import { formatCents } from "@/lib/pricing";
import { formatDuration, formatTime, fullDateLabel, toDateOnly } from "@/lib/time";
import { cn } from "@/lib/utils";

export function OverviewScreen() {
  const context = useBusinessContext();
  const [fill, setFill] = useState<{ date: string; time: string } | null>(null);

  if (!context) {
    return (
      <DashboardShell title="Overview">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      </DashboardShell>
    );
  }

  const { state, business, metrics, now } = context;
  const today = toDateOnly(now);
  const schedule = buildDaySchedule(state, business.id, today);
  const openGaps = schedule.filter((e) => e.kind === "gap").length;
  const owner = state.businessMembers.find((m) => m.business_id === business.id && m.role === "owner");
  const ownerFirstName = state.users.find((u) => u.id === owner?.user_id)?.full_name.split(" ")[0] ?? null;

  return (
    <DashboardShell
      title={`Good ${greeting(now)}${ownerFirstName ? `, ${ownerFirstName}` : ""}`}
      subtitle={fullDateLabel(today)}
      actions={
        <ButtonLink href="/dashboard/calendar" variant="outline" size="sm">
          Calendar
        </ButtonLink>
      }
    >
      {/* ---- Headline metrics --------------------------------------------- */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Today's revenue"
          value={formatCents(metrics.todayRevenueCents, { showCents: false })}
          hint="After NOW commission"
          tone="brand"
        />
        <StatTile
          label="Today's bookings"
          value={metrics.todayBookings}
          hint={`${openGaps} ${openGaps === 1 ? "gap" : "gaps"} left`}
        />
        <StatTile
          label="Open slots"
          value={metrics.openSlotsToday}
          hint="Published and bookable"
          tone="live"
          icon={<LiveDot />}
        />
        <StatTile
          label="New customers"
          value={metrics.newCustomersToday}
          hint="First visit today"
          icon={<UserPlus className="h-4 w-4" />}
        />
      </div>

      {/* ---- Revenue recovered — the metric that justifies NOW ------------- */}
      <Card className="mt-3 overflow-hidden border-brand-200">
        <div className="flex flex-wrap items-center gap-5 p-5">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-[13px] font-semibold text-brand-700">
              <TrendingUp className="h-4 w-4" />
              Revenue recovered by NOW
            </p>
            <p className="mt-1.5 text-[38px] font-bold leading-none tracking-[-0.04em] text-ink">
              {formatCents(metrics.recoveredCents, { showCents: false })}
            </p>
            <p className="mt-1.5 text-[13.5px] text-ink-soft">
              {metrics.recoveredCount} empty {metrics.recoveredCount === 1 ? "slot" : "slots"} filled this
              month · {Math.round(metrics.fillRate * 100)}% of published openings booked
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button icon={<Zap className="h-4 w-4" />} onClick={() => setFill({ date: today, time: "14:30" })}>
              Fill a slot
            </Button>
            <Link
              href="/dashboard/analytics"
              className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand-600 hover:text-brand-700"
            >
              See analytics
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </Card>

      {/* ---- Today's schedule ---------------------------------------------- */}
      <Section
        className="mt-7"
        title="Today's schedule"
        subtitle={`${metrics.todayBookings} booked · ${openGaps} open ${openGaps === 1 ? "gap" : "gaps"}`}
        action={
          <ButtonLink href="/dashboard/calendar" variant="ghost" size="sm">
            Full calendar
          </ButtonLink>
        }
      >
        {schedule.length === 0 ? (
          <EmptyState
            icon={<CalendarDays className="h-5 w-5" />}
            title="You don't have any bookings today"
            body="Publish an opening and nearby customers will see it immediately."
            action={
              <Button onClick={() => setFill({ date: today, time: "10:00" })} icon={<Zap className="h-4 w-4" />}>
                Fill this slot
              </Button>
            }
          />
        ) : (
          <Card className="divide-y divide-line-soft overflow-hidden">
            {schedule.map((entry, i) => {
              if (entry.kind === "appointment") {
                const appointment = entry.appointment;
                const customer = state.users.find((u) => u.id === appointment.customer_id);
                const line = state.appointmentServices.find((l) => l.appointment_id === appointment.id);
                const service = line && state.services.find((s) => s.id === line.service_id);
                const staff = state.staff.find((s) => s.id === appointment.staff_id);
                const meta = STATUS_META[appointment.status];
                return (
                  <div key={appointment.id} className="flex items-center gap-3.5 p-3.5">
                    <span className="w-[68px] shrink-0 text-[13px] font-semibold tabular-nums text-ink">
                      {formatTime(appointment.start_time)}
                    </span>
                    <Avatar seed={appointment.customer_id} name={customer?.full_name ?? "Customer"} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14.5px] font-semibold text-ink">
                        {customer?.full_name ?? "Customer"}
                      </p>
                      <p className="truncate text-[12.5px] text-ink-muted">
                        {service?.name} · {staff?.full_name}
                        {appointment.from_open_slot && " · from a NOW opening"}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[14px] font-semibold tabular-nums text-ink">
                        {formatCents(appointment.subtotal_cents, { showCents: false })}
                      </p>
                      <Badge tone={meta.tone}>{meta.short}</Badge>
                    </div>
                  </div>
                );
              }

              if (entry.kind === "slot") {
                const slot = entry.slot;
                const service = state.services.find((s) => s.id === slot.service_id);
                const staff = state.staff.find((s) => s.id === slot.staff_id);
                const blocked = slot.status === "blocked";
                return (
                  <div
                    key={slot.id}
                    className={cn("flex items-center gap-3.5 p-3.5", !blocked && "bg-live-50/40")}
                  >
                    <span className="w-[68px] shrink-0 text-[13px] font-semibold tabular-nums text-ink">
                      {formatTime(slot.start_time)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14.5px] font-semibold text-ink">
                        {blocked ? "Blocked" : `Published · ${service?.name ?? "Opening"}`}
                      </p>
                      <p className="truncate text-[12.5px] text-ink-muted">
                        {blocked ? "Not bookable" : `${staff?.full_name} · ${slot.view_count} views`}
                      </p>
                    </div>
                    {!blocked && (
                      <div className="shrink-0 text-right">
                        <p className="text-[14px] font-semibold tabular-nums text-ink">
                          {formatCents(slot.offer_price_cents ?? slot.original_price_cents)}
                        </p>
                        <Badge tone={slot.status === "held" ? "caution" : "live"}>
                          {slot.status === "held" ? "IN CHECKOUT" : "AVAILABLE"}
                        </Badge>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div key={`gap-${i}`} className="flex items-center gap-3.5 bg-sunken/40 p-3.5">
                  <span className="w-[68px] shrink-0 text-[13px] font-semibold tabular-nums text-ink-muted">
                    {formatTime(entry.start)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14.5px] font-semibold text-ink-soft">Available</p>
                    <p className="text-[12.5px] text-ink-muted">
                      {formatDuration(entry.minutes)} unbooked
                    </p>
                  </div>
                  <Button
                    size="sm"
                    icon={<Zap className="h-3.5 w-3.5" />}
                    onClick={() => setFill({ date: today, time: entry.start })}
                  >
                    Fill this slot
                  </Button>
                </div>
              );
            })}
          </Card>
        )}
      </Section>

      {/* ---- Secondary --------------------------------------------------- */}
      <div className="mt-7 grid gap-3 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="text-[15px] font-semibold text-ink">This month</h3>
          <dl className="mt-3 space-y-2.5 text-[13.5px]">
            <Line label="Bookings" value={`${metrics.monthBookings}`} />
            <Line label="Revenue after fees" value={formatCents(metrics.monthRevenueCents, { showCents: false })} />
            <Line label="Average booking" value={formatCents(metrics.averageBookingCents)} />
            <Line label="NOW commission paid" value={formatCents(metrics.platformFeesCents)} />
            <Line label="Cancellation rate" value={`${Math.round(metrics.cancellationRate * 100)}%`} />
            <Line label="Returning customers" value={`${Math.round(metrics.returningRate * 100)}%`} />
          </dl>
        </Card>

        <Card className="p-4">
          <h3 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
            <Sparkles className="h-4 w-4 text-brand-500" />
            Make more of your empty time
          </h3>
          <ul className="mt-3 space-y-3">
            <Tip
              icon={<Zap className="h-4 w-4" />}
              title="Publish gaps the night before"
              body="Same-day openings published early get roughly twice the views."
            />
            <Tip
              icon={<Eye className="h-4 w-4" />}
              title="A 15–20% discount fills fastest"
              body="Enough to move someone who was undecided, small enough to protect your price."
            />
            <Tip
              icon={<CalendarDays className="h-4 w-4" />}
              title="Turn on auto-fill for cancellations"
              body={
                business.auto_fill_cancellations
                  ? "On — cancellations are republished automatically."
                  : "Off — turn it on in Settings to republish cancellations instantly."
              }
            />
          </ul>
          <ButtonLink href="/dashboard/settings" variant="outline" size="sm" className="mt-4">
            Open settings
          </ButtonLink>
        </Card>
      </div>

      <div className="h-6" />

      <FillSlotModal
        open={fill != null}
        onClose={() => setFill(null)}
        prefill={fill ?? undefined}
      />
    </DashboardShell>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="font-semibold tabular-nums text-ink">{value}</dd>
    </div>
  );
}

function Tip({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[13.5px] font-semibold text-ink">{title}</span>
        <span className="block text-[12.5px] leading-relaxed text-ink-muted">{body}</span>
      </span>
    </li>
  );
}

function greeting(now: Date): string {
  const h = now.getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}
