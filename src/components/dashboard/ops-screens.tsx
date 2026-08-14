"use client";

import { useMemo, useState } from "react";
import { ClipboardList, Flag, MessageSquare, Search, Star, X } from "lucide-react";
import { DashboardShell } from "./dashboard-shell";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Avatar } from "@/components/ui/media";
import { Field, Input, Segmented, Select, Textarea } from "@/components/ui/form";
import { Badge, Card, EmptyState, Rating, Skeleton, StarRow, StatTile } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { STATUS_META } from "@/components/bookings/status";
import { ThreadList, ThreadView, useThreads } from "@/components/messaging/conversation";
import { useBusinessContext } from "@/lib/hooks";
import { useActions } from "@/lib/store";
import { businessCustomers } from "@/lib/store/selectors";
import { formatCents } from "@/lib/pricing";
import { dayLabel, formatTime, toDateOnly } from "@/lib/time";
import type { AppointmentStatus } from "@/lib/types";

/* -------------------------------------------------------------------------- */
/* Bookings                                                                    */
/* -------------------------------------------------------------------------- */

type BookingFilter = "upcoming" | "today" | "past" | "cancelled";

export function BusinessBookingsScreen() {
  const context = useBusinessContext();
  const { setAppointmentStatus, cancelAppointment } = useActions();
  const { toast } = useToast();
  const [filter, setFilter] = useState<BookingFilter>("upcoming");
  const [query, setQuery] = useState("");

  if (!context) {
    return (
      <DashboardShell title="Bookings">
        <Skeleton className="h-64 w-full rounded-2xl" />
      </DashboardShell>
    );
  }

  const { state, business, now } = context;
  const today = toDateOnly(now);

  const all = state.appointments.filter((a) => a.business_id === business.id);
  const cancelledStatuses: AppointmentStatus[] = [
    "cancelled_by_business",
    "cancelled_by_customer",
    "no_show",
    "refunded",
    "disputed",
  ];

  const filtered = all
    .filter((a) => {
      if (filter === "today") return a.date === today;
      if (filter === "upcoming") return a.date >= today && !cancelledStatuses.includes(a.status);
      if (filter === "past") return a.date < today && !cancelledStatuses.includes(a.status);
      return cancelledStatuses.includes(a.status);
    })
    .filter((a) => {
      if (!query.trim()) return true;
      const customer = state.users.find((u) => u.id === a.customer_id);
      const line = state.appointmentServices.find((l) => l.appointment_id === a.id);
      const service = line && state.services.find((s) => s.id === line.service_id);
      const haystack = `${customer?.full_name} ${customer?.email} ${service?.name} ${a.reference}`.toLowerCase();
      return haystack.includes(query.trim().toLowerCase());
    })
    .sort((a, b) =>
      filter === "upcoming" || filter === "today"
        ? `${a.date}${a.start_time}`.localeCompare(`${b.date}${b.start_time}`)
        : `${b.date}${b.start_time}`.localeCompare(`${a.date}${a.start_time}`),
    );

  const revenue = filtered
    .filter((a) => !cancelledStatuses.includes(a.status))
    .reduce((sum, a) => sum + a.payout_cents, 0);

  return (
    <DashboardShell title="Bookings" subtitle={`${filtered.length} bookings · ${formatCents(revenue, { showCents: false })} payout`}>
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          ariaLabel="Filter bookings"
          size="sm"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "upcoming", label: "Upcoming" },
            { value: "today", label: "Today" },
            { value: "past", label: "Past" },
            { value: "cancelled", label: "Cancelled" },
          ]}
        />
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search customer, service or reference"
            className="h-9 pl-9 text-[13.5px]"
            aria-label="Search bookings"
          />
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="h-5 w-5" />}
            title="Nothing here"
            body="Bookings taken through NOW and added by hand both land in this list."
          />
        ) : (
          filtered.slice(0, 60).map((a) => {
            const customer = state.users.find((u) => u.id === a.customer_id);
            const line = state.appointmentServices.find((l) => l.appointment_id === a.id);
            const service = line && state.services.find((s) => s.id === line.service_id);
            const member = state.staff.find((s) => s.id === a.staff_id);
            const meta = STATUS_META[a.status];
            const active = a.status === "confirmed" || a.status === "pending";

            return (
              <Card key={a.id} className="flex flex-wrap items-center gap-3.5 p-3.5">
                <Avatar seed={a.customer_id} name={customer?.full_name ?? "Customer"} size={42} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-[14.5px] font-semibold text-ink">
                      {customer?.full_name ?? "Customer"}
                    </p>
                    <Badge tone={meta.tone}>{meta.short}</Badge>
                    {a.from_open_slot && <Badge tone="brand">NOW opening</Badge>}
                  </div>
                  <p className="truncate text-[12.5px] text-ink-muted">
                    {service?.name} · {member?.full_name} · {a.reference}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[13.5px] font-semibold text-ink">
                    {dayLabel(a.date, now)} · {formatTime(a.start_time)}
                  </p>
                  <p className="text-[12.5px] tabular-nums text-ink-muted">
                    {formatCents(a.total_cents)} · payout {formatCents(a.payout_cents)}
                  </p>
                </div>
                {active && (
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => {
                      setAppointmentStatus(a.id, "completed");
                      toast({ title: "Marked completed", tone: "success" });
                    }}>
                      Complete
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label="Cancel booking"
                      onClick={() => {
                        const result = cancelAppointment(a.id, "business", "Cancelled by the business");
                        toast({
                          title: result.ok ? "Cancelled and republished" : (result.reason ?? "Couldn't cancel"),
                          tone: result.ok ? "success" : "error",
                        });
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      <div className="h-6" />
    </DashboardShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Customers (CRM)                                                             */
/* -------------------------------------------------------------------------- */

export function BusinessCustomersScreen() {
  const context = useBusinessContext();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const records = useMemo(() => {
    if (!context) return [];
    return businessCustomers(context.state, context.business.id);
  }, [context]);

  if (!context) {
    return (
      <DashboardShell title="Customers">
        <Skeleton className="h-64 w-full rounded-2xl" />
      </DashboardShell>
    );
  }

  const { state, business, now } = context;
  const filtered = records.filter((r) =>
    query.trim() ? `${r.name} ${r.email} ${r.phone}`.toLowerCase().includes(query.toLowerCase()) : true,
  );
  const selected = records.find((r) => r.id === selectedId) ?? null;
  const history = selected
    ? state.appointments
        .filter((a) => a.business_id === business.id && a.customer_id === selected.id)
        .sort((a, b) => `${b.date}`.localeCompare(a.date))
    : [];

  const totalSpend = records.reduce((sum, r) => sum + r.totalSpentCents, 0);
  const repeat = records.filter((r) => r.totalBookings > 1).length;

  return (
    <DashboardShell title="Customers" subtitle={`${records.length} people have booked with you`}>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Customers" value={records.length} />
        <StatTile
          label="Repeat rate"
          value={`${records.length ? Math.round((repeat / records.length) * 100) : 0}%`}
          tone="brand"
        />
        <StatTile label="Lifetime spend" value={formatCents(totalSpend, { showCents: false })} />
      </div>

      <div className="relative mt-5">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email or phone"
          className="pl-9"
          aria-label="Search customers"
        />
      </div>

      <Card className="mt-3 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead className="border-b border-line-soft bg-sunken/50">
              <tr className="text-[12px] font-semibold text-ink-muted">
                <th className="px-4 py-2.5">Customer</th>
                <th className="px-4 py-2.5">Last visit</th>
                <th className="px-4 py-2.5">Upcoming</th>
                <th className="px-4 py-2.5 text-right">Bookings</th>
                <th className="px-4 py-2.5 text-right">Spent</th>
                <th className="px-4 py-2.5 text-right">No-shows</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {filtered.slice(0, 50).map((r) => (
                <tr
                  key={r.id}
                  className="cursor-pointer text-[13.5px] transition hover:bg-sunken/40"
                  onClick={() => setSelectedId(r.id)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar seed={r.id} name={r.name} size={32} />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">{r.name}</p>
                        <p className="truncate text-[12px] text-ink-muted">{r.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{r.lastVisit ? dayLabel(r.lastVisit, now) : "—"}</td>
                  <td className="px-4 py-3">
                    {r.nextVisit ? (
                      <Badge tone="live">{dayLabel(r.nextVisit, now)}</Badge>
                    ) : (
                      <span className="text-ink-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink">{r.totalBookings}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium text-ink">
                    {formatCents(r.totalSpentCents, { showCents: false })}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {r.noShows > 0 ? (
                      <span className="font-semibold text-urgent-600">{r.noShows}</span>
                    ) : (
                      <span className="text-ink-muted">0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <EmptyState className="border-0" title="No customers match that search" />
        )}
      </Card>

      <Modal
        open={selected != null}
        onClose={() => setSelectedId(null)}
        title={selected?.name ?? "Customer"}
        description={selected ? `${selected.email} · ${selected.phone ?? "no phone"}` : undefined}
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2.5">
              <StatTile label="Bookings" value={selected.totalBookings} />
              <StatTile label="Spent" value={formatCents(selected.totalSpentCents, { showCents: false })} />
              <StatTile label="No-shows" value={selected.noShows} tone={selected.noShows ? "urgent" : "neutral"} />
            </div>

            <div>
              <h3 className="text-[14px] font-semibold text-ink">History</h3>
              <div className="mt-2 divide-y divide-line-soft rounded-xl border border-line">
                {history.slice(0, 8).map((a) => {
                  const line = state.appointmentServices.find((l) => l.appointment_id === a.id);
                  const service = line && state.services.find((s) => s.id === line.service_id);
                  const meta = STATUS_META[a.status];
                  return (
                    <div key={a.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] text-ink">{service?.name}</p>
                        <p className="text-[12px] text-ink-muted">{dayLabel(a.date, now)} · {formatTime(a.start_time)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] tabular-nums text-ink">
                          {formatCents(a.subtotal_cents, { showCents: false })}
                        </span>
                        <Badge tone={meta.tone}>{meta.short}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <Field label="Private note" htmlFor="customer-note" hint="Only your team can see this.">
              <Textarea
                id="customer-note"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Preferences, allergies, usual booking…"
              />
            </Field>
          </div>
        )}
      </Modal>

      <div className="h-6" />
    </DashboardShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Reviews                                                                     */
/* -------------------------------------------------------------------------- */

export function BusinessReviewsScreen() {
  const context = useBusinessContext();
  const { replyToReview, reportReview } = useActions();
  const { toast } = useToast();
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [reportOf, setReportOf] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("This review isn't about our business");

  if (!context) {
    return (
      <DashboardShell title="Reviews">
        <Skeleton className="h-64 w-full rounded-2xl" />
      </DashboardShell>
    );
  }

  const { state, business } = context;
  const reviews = state.reviews
    .filter((r) => r.business_id === business.id && !r.is_hidden)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const unanswered = reviews.filter((r) => !r.business_reply).length;
  const average = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : business.rating;

  return (
    <DashboardShell title="Reviews" subtitle={`${business.review_count.toLocaleString()} lifetime reviews`}>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Rating" value={business.rating.toFixed(1)} hint={`${average.toFixed(1)} recent average`} tone="brand" />
        <StatTile label="Reviews" value={reviews.length} hint="Verified bookings only" />
        <StatTile label="Awaiting reply" value={unanswered} tone={unanswered ? "urgent" : "neutral"} />
      </div>

      <div className="mt-5 grid gap-2.5">
        {reviews.length === 0 ? (
          <EmptyState
            icon={<Star className="h-5 w-5" />}
            title="No reviews yet"
            body="Customers can only review after a completed booking, so the first ones arrive a few days after you start."
          />
        ) : (
          reviews.map((review) => {
            const customer = state.users.find((u) => u.id === review.customer_id);
            const member = state.staff.find((s) => s.id === review.staff_id);
            return (
              <Card key={review.id} className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar seed={review.customer_id} name={customer?.full_name ?? "Customer"} size={38} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[14.5px] font-semibold text-ink">{customer?.full_name}</p>
                      <Badge tone="live">Verified booking</Badge>
                      {review.is_reported && <Badge tone="caution">Reported</Badge>}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[12.5px] text-ink-muted">
                      <StarRow value={review.rating} />
                      <span>
                        {new Date(review.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      {member && <span>· with {member.full_name}</span>}
                    </div>
                    <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">{review.body}</p>

                    {review.business_reply ? (
                      <div className="mt-3 rounded-xl bg-sunken px-3.5 py-3">
                        <p className="text-[12.5px] font-semibold text-ink">Your reply</p>
                        <p className="mt-1 text-[13.5px] text-ink-soft">{review.business_reply}</p>
                      </div>
                    ) : (
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => { setReplyTo(review.id); setReplyBody(""); }}>
                          Reply
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={<Flag className="h-3.5 w-3.5" />}
                          onClick={() => setReportOf(review.id)}
                        >
                          Report
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      <Modal
        open={replyTo != null}
        onClose={() => setReplyTo(null)}
        title="Reply to review"
        description="Your reply is public and appears under the review."
        footer={
          <Button
            fullWidth
            disabled={replyBody.trim().length < 3}
            onClick={() => {
              if (replyTo) replyToReview(replyTo, replyBody.trim());
              setReplyTo(null);
              toast({ title: "Reply posted", tone: "success" });
            }}
          >
            Post reply
          </Button>
        }
      >
        <Field label="Your reply" htmlFor="review-reply">
          <Textarea
            id="review-reply"
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            placeholder="Thanks for the feedback…"
          />
        </Field>
      </Modal>

      <Modal
        open={reportOf != null}
        onClose={() => setReportOf(null)}
        title="Report this review"
        description="NOW reviews reports before anything is hidden. Reviews are never removed just for being negative."
        footer={
          <Button
            variant="urgent"
            fullWidth
            onClick={() => {
              if (reportOf) reportReview(reportOf, reportReason);
              setReportOf(null);
              toast({ title: "Report submitted", tone: "success" });
            }}
          >
            Submit report
          </Button>
        }
      >
        <Field label="Reason" htmlFor="review-report">
          <Select id="review-report" value={reportReason} onChange={(e) => setReportReason(e.target.value)}>
            <option>This review isn&rsquo;t about our business</option>
            <option>Contains abusive or discriminatory language</option>
            <option>Contains private or personal information</option>
            <option>Appears to be spam or a competitor</option>
          </Select>
        </Field>
      </Modal>

      <div className="h-6" />
    </DashboardShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Messages                                                                    */
/* -------------------------------------------------------------------------- */

export function BusinessMessagesScreen() {
  const threads = useThreads("business");
  const [activeId, setActiveId] = useState<string | null>(null);
  const current = activeId ?? threads[0]?.thread.id ?? null;

  return (
    <DashboardShell title="Messages" subtitle={`${threads.length} conversations`}>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,340px)_1fr]">
        <ThreadList
          threads={threads}
          activeId={current ?? undefined}
          onSelect={setActiveId}
          emptyBody="Customers can message you about a booking — running late, parking, a quick question."
        />
        {current ? (
          <ThreadView threadId={current} role="business" className="min-h-[60vh]" />
        ) : (
          <EmptyState
            icon={<MessageSquare className="h-5 w-5" />}
            title="No conversation selected"
            body="Messages are always attached to a booking."
          />
        )}
      </div>
      <div className="h-6" />
    </DashboardShell>
  );
}

export { Rating };
