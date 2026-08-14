"use client";

import { useMemo, useState } from "react";
import {
  Ban,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Zap,
} from "lucide-react";
import { DashboardShell } from "./dashboard-shell";
import { FillSlotModal } from "./fill-slot-modal";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Segmented, Select, Textarea } from "@/components/ui/form";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { STATUS_META } from "@/components/bookings/status";
import { buildDaySchedule } from "./schedule";
import { useBusinessContext } from "@/lib/hooks";
import { useActions } from "@/lib/store";
import { formatCents } from "@/lib/pricing";
import {
  DAY_ABBR,
  addDays,
  dayLabel,
  daysInMonth,
  formatDuration,
  formatTime,
  formatTimeCompact,
  fullDateLabel,
  minutesToTime,
  monthLabel,
  parseDateOnly,
  startOfMonth,
  startOfWeek,
  timeToMinutes,
  toDateOnly,
} from "@/lib/time";
import type { Appointment, DateOnly } from "@/lib/types";
import { cn } from "@/lib/utils";

type View = "day" | "week" | "month";

export function CalendarScreen() {
  const context = useBusinessContext();
  const { createAppointment, blockTime, cancelAppointment, setAppointmentStatus, unpublishSlot } = useActions();
  const { toast } = useToast();

  const [view, setView] = useState<View>("day");
  const [cursor, setCursor] = useState<DateOnly>(() => toDateOnly(new Date()));
  const [fill, setFill] = useState<{ date: string; time: string } | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [selected, setSelected] = useState<Appointment | null>(null);

  if (!context) {
    return (
      <DashboardShell title="Calendar">
        <Skeleton className="h-[60vh] w-full rounded-2xl" />
      </DashboardShell>
    );
  }

  const { state, business, services, staff, now } = context;
  const today = toDateOnly(now);

  function step(delta: number) {
    setCursor((c) => addDays(c, view === "day" ? delta : view === "week" ? delta * 7 : delta * 30));
  }

  const title =
    view === "month"
      ? monthLabel(cursor)
      : view === "week"
        ? `Week of ${fullDateLabel(startOfWeek(cursor))}`
        : fullDateLabel(cursor);

  return (
    <DashboardShell
      title="Calendar"
      subtitle={title}
      actions={
        <>
          <Button size="sm" variant="outline" icon={<Plus className="h-4 w-4" />} onClick={() => setNewOpen(true)}>
            <span className="hidden sm:inline">New</span>
          </Button>
          <Button size="sm" icon={<Zap className="h-4 w-4" />} onClick={() => setFill({ date: cursor, time: "14:30" })}>
            <span className="hidden sm:inline">Fill slot</span>
          </Button>
        </>
      }
    >
      {/* ---- Controls ------------------------------------------------------ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <Button size="icon" variant="outline" onClick={() => step(-1)} aria-label="Previous">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => setCursor(today)}>
            Today
          </Button>
          <Button size="icon" variant="outline" onClick={() => step(1)} aria-label="Next">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Segmented
            ariaLabel="Calendar view"
            size="sm"
            value={view}
            onChange={setView}
            options={[
              { value: "day", label: "Day" },
              { value: "week", label: "Week" },
              { value: "month", label: "Month" },
            ]}
          />
          <Button size="sm" variant="ghost" icon={<Ban className="h-4 w-4" />} onClick={() => setBlockOpen(true)}>
            <span className="hidden sm:inline">Block time</span>
          </Button>
        </div>
      </div>

      {/* ---- Legend -------------------------------------------------------- */}
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge tone="live">Confirmed</Badge>
        <Badge tone="neutral">Completed</Badge>
        <Badge tone="urgent">Cancelled</Badge>
        <Badge tone="caution">No-show</Badge>
        <Badge tone="brand">Open slot</Badge>
        <Badge tone="urgent">Last-minute deal</Badge>
      </div>

      <div className="mt-4">
        {view === "day" && (
          <DayView
            date={cursor}
            onFill={(time) => setFill({ date: cursor, time })}
            onSelect={setSelected}
            onUnpublish={(id) => {
              unpublishSlot(id);
              toast({ title: "Opening removed", tone: "success" });
            }}
          />
        )}
        {view === "week" && <WeekView anchor={cursor} onPick={(d) => { setCursor(d); setView("day"); }} />}
        {view === "month" && <MonthView anchor={cursor} onPick={(d) => { setCursor(d); setView("day"); }} />}
      </div>

      <div className="h-6" />

      {/* ---- Modals -------------------------------------------------------- */}
      <FillSlotModal open={fill != null} onClose={() => setFill(null)} prefill={fill ?? undefined} />

      <NewAppointmentModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        date={cursor}
        onCreate={(input) => {
          const result = createAppointment(input);
          if (result.ok) toast({ title: "Appointment added", tone: "success" });
          else toast({ title: result.reason ?? "Couldn't add", tone: "error" });
          setNewOpen(false);
        }}
      />

      <BlockTimeModal
        open={blockOpen}
        onClose={() => setBlockOpen(false)}
        date={cursor}
        onBlock={(input) => {
          blockTime(input);
          toast({ title: "Time blocked", description: "It won't be offered to customers.", tone: "success" });
          setBlockOpen(false);
        }}
      />

      <AppointmentModal
        appointment={selected}
        onClose={() => setSelected(null)}
        onCancel={(reason) => {
          if (!selected) return;
          const result = cancelAppointment(selected.id, "business", reason);
          toast({
            title: result.ok ? "Booking cancelled" : (result.reason ?? "Couldn't cancel"),
            description: result.ok ? "The time was republished as an opening." : undefined,
            tone: result.ok ? "success" : "error",
          });
          setSelected(null);
        }}
        onStatus={(status) => {
          if (!selected) return;
          setAppointmentStatus(selected.id, status);
          toast({ title: `Marked ${STATUS_META[status].label.toLowerCase()}`, tone: "success" });
          setSelected(null);
        }}
      />
    </DashboardShell>
  );

  /* ---- Views ----------------------------------------------------------- */

  function DayView({
    date,
    onFill,
    onSelect,
    onUnpublish,
  }: {
    date: DateOnly;
    onFill: (time: string) => void;
    onSelect: (a: Appointment) => void;
    onUnpublish: (slotId: string) => void;
  }) {
    const schedule = buildDaySchedule(state, business.id, date);
    if (schedule.length === 0) {
      return (
        <EmptyState
          icon={<CalendarDays className="h-5 w-5" />}
          title="You don't have any bookings today"
          body="You're closed on this day, or nothing is on the books yet."
          action={<Button onClick={() => onFill("10:00")}>Publish an opening</Button>}
        />
      );
    }

    return (
      <Card className="divide-y divide-line-soft overflow-hidden">
        {schedule.map((entry, i) => {
          if (entry.kind === "appointment") {
            const a = entry.appointment;
            const customer = state.users.find((u) => u.id === a.customer_id);
            const line = state.appointmentServices.find((l) => l.appointment_id === a.id);
            const service = line && state.services.find((s) => s.id === line.service_id);
            const member = state.staff.find((s) => s.id === a.staff_id);
            const meta = STATUS_META[a.status];
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => onSelect(a)}
                className="flex w-full items-center gap-3.5 p-3.5 text-left transition hover:bg-sunken/50"
              >
                <span className="w-[74px] shrink-0">
                  <span className="block text-[13px] font-semibold tabular-nums text-ink">
                    {formatTime(a.start_time)}
                  </span>
                  <span className="block text-[11.5px] tabular-nums text-ink-muted">
                    {formatTime(a.end_time)}
                  </span>
                </span>
                <span
                  className={cn(
                    "h-10 w-1 shrink-0 rounded-full",
                    a.status === "confirmed" ? "bg-live-500" : a.status === "completed" ? "bg-line" : "bg-urgent-500",
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] font-semibold text-ink">
                    {customer?.full_name ?? "Customer"}
                  </span>
                  <span className="block truncate text-[12.5px] text-ink-muted">
                    {service?.name} · {member?.full_name}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-[13.5px] font-semibold tabular-nums text-ink">
                    {formatCents(a.subtotal_cents, { showCents: false })}
                  </span>
                  <Badge tone={a.is_last_minute_deal ? "urgent" : meta.tone}>
                    {a.is_last_minute_deal ? "Deal" : meta.short}
                  </Badge>
                </span>
              </button>
            );
          }

          if (entry.kind === "slot") {
            const slot = entry.slot;
            const service = state.services.find((s) => s.id === slot.service_id);
            const member = state.staff.find((s) => s.id === slot.staff_id);
            const blocked = slot.status === "blocked";
            return (
              <div key={slot.id} className={cn("flex items-center gap-3.5 p-3.5", !blocked && "bg-brand-50/40")}>
                <span className="w-[74px] shrink-0 text-[13px] font-semibold tabular-nums text-ink">
                  {formatTime(slot.start_time)}
                </span>
                <span className={cn("h-10 w-1 shrink-0 rounded-full", blocked ? "bg-ink-muted" : "bg-brand-500")} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] font-semibold text-ink">
                    {blocked ? "Blocked time" : (service?.name ?? "Opening")}
                  </span>
                  <span className="block truncate text-[12.5px] text-ink-muted">
                    {blocked ? "Not bookable" : `${member?.full_name} · ${slot.view_count} views`}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {!blocked && (
                    <Badge tone={slot.offer_price_cents ? "urgent" : "brand"}>
                      {slot.offer_price_cents
                        ? `${formatCents(slot.offer_price_cents)} deal`
                        : formatCents(slot.original_price_cents, { showCents: false })}
                    </Badge>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => onUnpublish(slot.id)}>
                    Remove
                  </Button>
                </span>
              </div>
            );
          }

          return (
            <div key={`gap-${i}`} className="flex items-center gap-3.5 bg-sunken/40 p-3.5">
              <span className="w-[74px] shrink-0 text-[13px] font-semibold tabular-nums text-ink-muted">
                {formatTime(entry.start)}
              </span>
              <span className="h-10 w-1 shrink-0 rounded-full bg-line" />
              <span className="min-w-0 flex-1">
                <span className="block text-[14.5px] font-semibold text-ink-soft">Available</span>
                <span className="block text-[12.5px] text-ink-muted">{formatDuration(entry.minutes)} unbooked</span>
              </span>
              <Button size="sm" icon={<Zap className="h-3.5 w-3.5" />} onClick={() => onFill(entry.start)}>
                Fill this slot
              </Button>
            </div>
          );
        })}
      </Card>
    );
  }

  function WeekView({ anchor, onPick }: { anchor: DateOnly; onPick: (d: DateOnly) => void }) {
    const start = startOfWeek(anchor);
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

    return (
      <div className="overflow-x-auto">
        <div className="grid min-w-[720px] grid-cols-7 gap-2">
          {days.map((date) => {
            const appointments = state.appointments
              .filter(
                (a) =>
                  a.business_id === business.id &&
                  a.date === date &&
                  a.status !== "cancelled_by_business" &&
                  a.status !== "cancelled_by_customer",
              )
              .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
            const slots = state.slots.filter(
              (s) => s.business_id === business.id && s.date === date && s.status === "available",
            );
            const revenue = appointments.reduce((sum, a) => sum + a.payout_cents, 0);

            return (
              <button
                key={date}
                type="button"
                onClick={() => onPick(date)}
                className={cn(
                  "flex min-h-[220px] flex-col rounded-2xl border bg-surface p-2.5 text-left transition hover:border-brand-300",
                  date === today ? "border-brand-500" : "border-line",
                )}
              >
                <span className="flex items-baseline justify-between">
                  <span className="text-[12px] font-semibold text-ink-muted">
                    {DAY_ABBR[parseDateOnly(date).getDay()]}
                  </span>
                  <span
                    className={cn(
                      "text-[15px] font-semibold",
                      date === today ? "text-brand-600" : "text-ink",
                    )}
                  >
                    {parseDateOnly(date).getDate()}
                  </span>
                </span>

                <span className="mt-2 space-y-1">
                  {appointments.slice(0, 4).map((a) => (
                    <span
                      key={a.id}
                      className="block truncate rounded-md bg-live-50 px-1.5 py-1 text-[11px] font-medium text-live-700"
                    >
                      {formatTimeCompact(a.start_time)}{" "}
                      {state.users.find((u) => u.id === a.customer_id)?.full_name.split(" ")[0]}
                    </span>
                  ))}
                  {appointments.length > 4 && (
                    <span className="block px-1.5 text-[11px] text-ink-muted">
                      +{appointments.length - 4} more
                    </span>
                  )}
                  {slots.slice(0, 2).map((s) => (
                    <span
                      key={s.id}
                      className="block truncate rounded-md bg-brand-50 px-1.5 py-1 text-[11px] font-medium text-brand-700"
                    >
                      {formatTimeCompact(s.start_time)} open
                    </span>
                  ))}
                </span>

                <span className="mt-auto pt-2 text-[11.5px] text-ink-muted">
                  {appointments.length} booked · {formatCents(revenue, { showCents: false })}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  function MonthView({ anchor, onPick }: { anchor: DateOnly; onPick: (d: DateOnly) => void }) {
    const first = startOfMonth(anchor);
    const total = daysInMonth(anchor);
    const leading = parseDateOnly(first).getDay();
    const cells: (DateOnly | null)[] = [
      ...Array.from({ length: leading }, () => null),
      ...Array.from({ length: total }, (_, i) => addDays(first, i)),
    ];

    return (
      <Card className="p-3">
        <div className="grid grid-cols-7 gap-1 pb-2">
          {DAY_ABBR.map((d) => (
            <span key={d} className="text-center text-[11.5px] font-semibold text-ink-muted">
              {d}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((date, i) => {
            if (!date) return <span key={`pad-${i}`} />;
            const appointments = state.appointments.filter(
              (a) =>
                a.business_id === business.id &&
                a.date === date &&
                a.status !== "cancelled_by_business" &&
                a.status !== "cancelled_by_customer",
            );
            const open = state.slots.filter(
              (s) => s.business_id === business.id && s.date === date && s.status === "available",
            ).length;
            const revenue = appointments.reduce((sum, a) => sum + a.payout_cents, 0);
            return (
              <button
                key={date}
                type="button"
                onClick={() => onPick(date)}
                className={cn(
                  "flex aspect-square flex-col items-start rounded-xl border p-1.5 text-left transition hover:border-brand-300",
                  date === today ? "border-brand-500 bg-brand-50/50" : "border-line-soft",
                )}
              >
                <span className={cn("text-[12px] font-semibold", date === today ? "text-brand-600" : "text-ink")}>
                  {parseDateOnly(date).getDate()}
                </span>
                {appointments.length > 0 && (
                  <span className="mt-auto text-[10.5px] font-semibold text-ink-soft">
                    {appointments.length} · {formatCents(revenue, { showCents: false })}
                  </span>
                )}
                {open > 0 && (
                  <span className="text-[10.5px] font-medium text-brand-600">{open} open</span>
                )}
              </button>
            );
          })}
        </div>
      </Card>
    );
  }

  /* ---- Modals ---------------------------------------------------------- */

  function NewAppointmentModal({
    open,
    onClose,
    date,
    onCreate,
  }: {
    open: boolean;
    onClose: () => void;
    date: DateOnly;
    onCreate: (input: {
      businessId: string;
      customerId: string;
      staffId: string;
      serviceId: string;
      date: string;
      startTime: string;
      note?: string | null;
    }) => void;
  }) {
    const customers = useMemo(
      () =>
        state.users
          .filter((u) => u.account_type === "customer")
          .sort((a, b) => a.full_name.localeCompare(b.full_name))
          .slice(0, 60),
      [],
    );
    const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
    const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
    const [staffId, setStaffId] = useState(staff[0]?.id ?? "");
    const [when, setWhen] = useState(date);
    const [time, setTime] = useState("10:00");
    const [note, setNote] = useState("");

    return (
      <Modal
        open={open}
        onClose={onClose}
        title="New appointment"
        description="Add a booking taken by phone or walk-in."
        footer={
          <Button
            fullWidth
            onClick={() =>
              onCreate({
                businessId: business.id,
                customerId,
                serviceId,
                staffId,
                date: when,
                startTime: time,
                note: note.trim() || null,
              })
            }
          >
            Add appointment
          </Button>
        }
      >
        <div className="space-y-4">
          <Field label="Customer" htmlFor="new-customer">
            <Select id="new-customer" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name} — {c.phone}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Service" htmlFor="new-service">
            <Select id="new-service" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {formatCents(s.price_cents, { showCents: false })}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Team member" htmlFor="new-staff">
            <Select id="new-staff" value={staffId} onChange={(e) => setStaffId(e.target.value)}>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date" htmlFor="new-date">
              <Input id="new-date" type="date" value={when} onChange={(e) => setWhen(e.target.value)} />
            </Field>
            <Field label="Time" htmlFor="new-time">
              <Input id="new-time" type="time" step={900} value={time} onChange={(e) => setTime(e.target.value)} />
            </Field>
          </div>
          <Field label="Internal note" htmlFor="new-note">
            <Textarea id="new-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <p className="text-[12.5px] text-ink-muted">
            Bookings you take yourself carry no NOW commission — only bookings acquired through the
            marketplace do.
          </p>
        </div>
      </Modal>
    );
  }

  function BlockTimeModal({
    open,
    onClose,
    date,
    onBlock,
  }: {
    open: boolean;
    onClose: () => void;
    date: DateOnly;
    onBlock: (input: {
      businessId: string;
      staffId: string;
      serviceId: string;
      date: string;
      startTime: string;
      durationMinutes: number;
    }) => void;
  }) {
    const [staffId, setStaffId] = useState(staff[0]?.id ?? "");
    const [when, setWhen] = useState(date);
    const [time, setTime] = useState("12:00");
    const [duration, setDuration] = useState(60);

    return (
      <Modal
        open={open}
        onClose={onClose}
        title="Block time"
        description="Hold time out of the calendar — lunch, admin, training."
        footer={
          <Button
            fullWidth
            variant="outline"
            onClick={() =>
              onBlock({
                businessId: business.id,
                staffId,
                serviceId: services[0]?.id ?? "",
                date: when,
                startTime: time,
                durationMinutes: duration,
              })
            }
          >
            Block this time
          </Button>
        }
      >
        <div className="space-y-4">
          <Field label="Team member" htmlFor="block-staff">
            <Select id="block-staff" value={staffId} onChange={(e) => setStaffId(e.target.value)}>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date" htmlFor="block-date">
              <Input id="block-date" type="date" value={when} onChange={(e) => setWhen(e.target.value)} />
            </Field>
            <Field label="Start" htmlFor="block-time">
              <Input id="block-time" type="time" step={900} value={time} onChange={(e) => setTime(e.target.value)} />
            </Field>
          </div>
          <Field label="Duration" htmlFor="block-duration">
            <Select
              id="block-duration"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            >
              {[30, 60, 90, 120, 240].map((m) => (
                <option key={m} value={m}>
                  {formatDuration(m)} (until {formatTime(minutesToTime(timeToMinutes(time) + m))})
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Modal>
    );
  }

  function AppointmentModal({
    appointment,
    onClose,
    onCancel,
    onStatus,
  }: {
    appointment: Appointment | null;
    onClose: () => void;
    onCancel: (reason: string) => void;
    onStatus: (status: Appointment["status"]) => void;
  }) {
    const [reason, setReason] = useState("Schedule conflict");
    if (!appointment) return null;

    const customer = state.users.find((u) => u.id === appointment.customer_id);
    const line = state.appointmentServices.find((l) => l.appointment_id === appointment.id);
    const service = line && state.services.find((s) => s.id === line.service_id);
    const member = state.staff.find((s) => s.id === appointment.staff_id);
    const active = appointment.status === "confirmed" || appointment.status === "pending";

    return (
      <Modal
        open
        onClose={onClose}
        title={customer?.full_name ?? "Appointment"}
        description={`${dayLabel(appointment.date, now)} · ${formatTime(appointment.start_time)} – ${formatTime(appointment.end_time)}`}
      >
        <div className="space-y-4">
          <Card className="divide-y divide-line-soft">
            <Row label="Service" value={service?.name ?? "—"} />
            <Row label="Provider" value={member?.full_name ?? "—"} />
            <Row label="Reference" value={appointment.reference} />
            <Row label="Source" value={appointment.from_open_slot ? "NOW opening" : "Direct booking"} />
            <Row label="Customer pays" value={formatCents(appointment.total_cents)} />
            <Row label="NOW commission" value={`−${formatCents(appointment.commission_cents)}`} />
            <Row label="Your payout" value={formatCents(appointment.payout_cents)} />
          </Card>

          {appointment.customer_note && (
            <div className="rounded-xl bg-sunken px-3.5 py-3">
              <p className="text-[12.5px] font-semibold text-ink">Customer note</p>
              <p className="mt-1 text-[13px] text-ink-soft">{appointment.customer_note}</p>
            </div>
          )}

          {active && (
            <>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="live" onClick={() => onStatus("completed")}>
                  Mark completed
                </Button>
                <Button size="sm" variant="outline" onClick={() => onStatus("no_show")}>
                  Mark no-show
                </Button>
              </div>

              <Field label="Cancel this booking" htmlFor="cancel-reason-biz">
                <Select id="cancel-reason-biz" value={reason} onChange={(e) => setReason(e.target.value)}>
                  <option>Schedule conflict</option>
                  <option>Staff unavailable</option>
                  <option>Shop closed unexpectedly</option>
                  <option>Customer requested by phone</option>
                </Select>
              </Field>
              <Button variant="danger" fullWidth onClick={() => onCancel(reason)}>
                Cancel booking &amp; republish the time
              </Button>
              <p className="text-[12px] text-ink-muted">
                The customer is refunded in full and notified, and the freed time is published back to the
                marketplace automatically.
              </p>
            </>
          )}
        </div>
      </Modal>
    );
  }
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <span className="text-[13px] text-ink-muted">{label}</span>
      <span className="text-[13.5px] font-medium tabular-nums text-ink">{value}</span>
    </div>
  );
}
