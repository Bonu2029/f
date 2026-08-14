"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarX2, ChevronRight, Clock, MapPin } from "lucide-react";
import { CustomerShell } from "@/components/layout/customer-shell";
import { ButtonLink } from "@/components/ui/button";
import { Avatar } from "@/components/ui/media";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui/primitives";
import { Segmented } from "@/components/ui/form";
import { useMarketplace } from "@/lib/store";
import { appointmentView, customerAppointments } from "@/lib/store/selectors";
import { formatCents } from "@/lib/pricing";
import { dayLabel, formatTime, relativeFromMinutes, minutesUntil } from "@/lib/time";
import { STATUS_META } from "@/components/bookings/status";

export function BookingsScreen({ initialTab = "upcoming" }: { initialTab?: "upcoming" | "past" }) {
  const { state, session, signIn } = useMarketplace();
  const [tab, setTab] = useState<"upcoming" | "past">(initialTab);

  if (!state) {
    return (
      <CustomerShell>
        <div className="space-y-3 pt-6">
          <Skeleton className="h-8 w-40" />
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      </CustomerShell>
    );
  }

  if (!session.userId) {
    return (
      <CustomerShell>
        <div className="py-14">
          <EmptyState
            icon={<CalendarX2 className="h-5 w-5" />}
            title="Sign in to see your bookings"
            body="You can browse and compare availability without an account — you'll only need one to book."
            action={
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => signIn("customer")}
                  className="rounded-xl bg-brand-500 px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-brand-600"
                >
                  Continue as Maya
                </button>
                <ButtonLink href="/search" variant="outline">
                  Keep browsing
                </ButtonLink>
              </div>
            }
          />
        </div>
      </CustomerShell>
    );
  }

  const { upcoming, past } = customerAppointments(state, session.userId);
  const list = tab === "upcoming" ? upcoming : past;
  const now = new Date(state.now);

  return (
    <CustomerShell>
      <div className="pt-5">
        <h1 className="text-[26px] font-bold tracking-[-0.03em] text-ink">Bookings</h1>
        <p className="mt-0.5 text-[13.5px] text-ink-muted">
          {upcoming.length} upcoming · {past.length} past
        </p>

        <div className="mt-4">
          <Segmented
            ariaLabel="Booking list"
            value={tab}
            onChange={setTab}
            options={[
              { value: "upcoming", label: `Upcoming (${upcoming.length})` },
              { value: "past", label: `Past (${past.length})` },
            ]}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-2.5">
        {list.length === 0 ? (
          <EmptyState
            icon={<CalendarX2 className="h-5 w-5" />}
            title={tab === "upcoming" ? "Nothing booked yet" : "No past appointments"}
            body={
              tab === "upcoming"
                ? "Find something available near you — most businesses have openings today."
                : "Once you complete a booking it'll show up here, and you can leave a review."
            }
            action={<ButtonLink href="/search">Find something now</ButtonLink>}
          />
        ) : (
          list.map((appointment) => {
            const view = appointmentView(state, appointment.id);
            if (!view) return null;
            const service = view.services[0]?.service;
            const meta = STATUS_META[appointment.status];
            const mins = minutesUntil(appointment.date, appointment.start_time, now);

            return (
              <Link key={appointment.id} href={`/bookings/${appointment.id}`} className="block">
                <Card interactive className="p-3.5">
                  <div className="flex items-center gap-3.5">
                    <Avatar
                      seed={`${view.business.media_seed}-logo`}
                      name={view.business.name}
                      size={48}
                      className="rounded-xl"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-[15.5px] font-semibold text-ink">
                          {view.business.name}
                        </p>
                        <Badge tone={meta.tone}>{meta.short}</Badge>
                      </div>
                      <p className="truncate text-[13px] text-ink-muted">
                        {service?.name} · {view.staff.full_name}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px]">
                        <span className="inline-flex items-center gap-1 font-semibold text-ink">
                          <Clock className="h-3.5 w-3.5 text-brand-500" />
                          {dayLabel(appointment.date, now)} · {formatTime(appointment.start_time)}
                        </span>
                        {tab === "upcoming" && mins > 0 && mins < 60 * 48 && (
                          <span className="text-live-700">{relativeFromMinutes(mins)}</span>
                        )}
                        <span className="inline-flex items-center gap-1 text-ink-muted">
                          <MapPin className="h-3.5 w-3.5" />
                          {view.business.neighborhood}
                        </span>
                        <span className="font-semibold text-ink">
                          {formatCents(appointment.total_cents)}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted" />
                  </div>

                  {appointment.status === "completed" && !view.review && (
                    <p className="mt-3 rounded-xl bg-brand-50 px-3 py-2 text-[12.5px] font-medium text-brand-700">
                      Leave a review — it takes 20 seconds
                    </p>
                  )}
                </Card>
              </Link>
            );
          })
        )}
      </div>

      <div className="h-6" />
    </CustomerShell>
  );
}
