"use client";

import { useState } from "react";
import { Eye, Users, Zap } from "lucide-react";
import { DashboardShell } from "./dashboard-shell";
import { FillSlotModal } from "./fill-slot-modal";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/form";
import { Badge, Card, EmptyState, Skeleton, StatTile } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { useBusinessContext } from "@/lib/hooks";
import { useActions } from "@/lib/store";
import { formatCents } from "@/lib/pricing";
import { dayLabel, formatTime, toDateOnly } from "@/lib/time";
import type { SlotStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type Filter = "all" | "available" | "booked";

const STATUS_TONE: Record<SlotStatus, "live" | "caution" | "brand" | "neutral" | "urgent"> = {
  available: "live",
  held: "caution",
  booked: "brand",
  expired: "neutral",
  blocked: "neutral",
};

export function OpenSlotsScreen() {
  const context = useBusinessContext();
  const { unpublishSlot } = useActions();
  const { toast } = useToast();
  const [filter, setFilter] = useState<Filter>("all");
  const [fillOpen, setFillOpen] = useState(false);

  if (!context) {
    return (
      <DashboardShell title="Open Slots">
        <Skeleton className="h-64 w-full rounded-2xl" />
      </DashboardShell>
    );
  }

  const { state, business, now } = context;
  const today = toDateOnly(now);

  const slots = state.slots
    .filter((s) => s.business_id === business.id && s.status !== "blocked" && s.date >= today)
    .filter((s) =>
      filter === "all" ? true : filter === "available" ? s.status !== "booked" : s.status === "booked",
    )
    .sort((a, b) => `${a.date}${a.start_time}`.localeCompare(`${b.date}${b.start_time}`));

  const listed = state.slots.filter((s) => s.business_id === business.id && s.status !== "blocked");
  const filledBookings = state.appointments.filter(
    (a) => a.business_id === business.id && a.from_open_slot && a.status !== "cancelled_by_customer",
  );
  // An opening that converted into a booking has left the slot inventory, so
  // the denominator is "everything ever published", not "what's still listed".
  const published = listed.length + filledBookings.length;
  const booked = filledBookings.length;
  const recovered = filledBookings.reduce((sum, a) => sum + a.payout_cents, 0);

  return (
    <DashboardShell
      title="Open Slots"
      subtitle="Empty time you've published to the marketplace"
      actions={
        <Button size="sm" icon={<Zap className="h-4 w-4" />} onClick={() => setFillOpen(true)}>
          <span className="hidden sm:inline">Fill this slot</span>
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Published" value={published} hint="Listed plus already booked" />
        <StatTile label="Booked" value={booked} tone="brand" hint="From published openings" />
        <StatTile
          label="Fill rate"
          value={`${published ? Math.round((booked / published) * 100) : 0}%`}
          tone="live"
        />
        <StatTile
          label="Recovered revenue"
          value={formatCents(recovered, { showCents: false })}
          hint="Would otherwise have been empty"
          tone="brand"
        />
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <Segmented
          ariaLabel="Filter slots"
          size="sm"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All" },
            { value: "available", label: "Available" },
            { value: "booked", label: "Booked" },
          ]}
        />
        <p className="text-[13px] text-ink-muted">{slots.length} shown</p>
      </div>

      <div className="mt-3 grid gap-2.5">
        {slots.length === 0 ? (
          <EmptyState
            icon={<Zap className="h-5 w-5" />}
            title="No published openings"
            body="When you have a cancellation or a quiet hour, publish it here and nearby customers see it straight away."
            action={<Button onClick={() => setFillOpen(true)}>Publish an opening</Button>}
          />
        ) : (
          slots.map((slot) => {
            const service = state.services.find((s) => s.id === slot.service_id);
            const member = state.staff.find((s) => s.id === slot.staff_id);
            const appointment = state.appointments.find((a) => a.slot_id === slot.id);
            const customer = appointment && state.users.find((u) => u.id === appointment.customer_id);
            const discount =
              slot.offer_price_cents != null
                ? Math.round(((slot.original_price_cents - slot.offer_price_cents) / slot.original_price_cents) * 100)
                : 0;

            return (
              <Card key={slot.id} className={cn("p-4", slot.status === "booked" && "border-brand-200")}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[15.5px] font-semibold text-ink">
                        {dayLabel(slot.date, now)} · {formatTime(slot.start_time)}
                      </p>
                      <Badge tone={STATUS_TONE[slot.status]}>{slot.status.toUpperCase()}</Badge>
                      {discount > 0 && <Badge tone="urgent">{discount}% off</Badge>}
                    </div>
                    <p className="mt-1 text-[13px] text-ink-muted">
                      {service?.name} · {member?.full_name}
                      {customer && ` · booked by ${customer.full_name}`}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-[18px] font-semibold tracking-[-0.02em] text-ink">
                      {formatCents(slot.offer_price_cents ?? slot.original_price_cents)}
                    </p>
                    {discount > 0 && (
                      <p className="text-[12.5px] text-ink-muted line-through">
                        {formatCents(slot.original_price_cents, { showCents: false })}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-3">
                  <div className="flex flex-wrap gap-4 text-[12.5px] text-ink-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      {slot.nearby_reach} people nearby
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Eye className="h-3.5 w-3.5" />
                      {slot.view_count} views
                    </span>
                    <span>
                      Visible within{" "}
                      {slot.visibility_radius_miles == null ? "everywhere" : `${slot.visibility_radius_miles} mi`}
                    </span>
                  </div>
                  {slot.status !== "booked" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        unpublishSlot(slot.id);
                        toast({ title: "Opening removed from the marketplace", tone: "success" });
                      }}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>

      <div className="h-6" />
      <FillSlotModal open={fillOpen} onClose={() => setFillOpen(false)} />
    </DashboardShell>
  );
}
