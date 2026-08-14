"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  CalendarPlus,
  Check,
  Flag,
  MessageSquare,
  Navigation,
  Receipt,
  Star,
  XCircle,
} from "lucide-react";
import { CustomerShell } from "@/components/layout/customer-shell";
import { Button, ButtonLink } from "@/components/ui/button";
import { Avatar } from "@/components/ui/media";
import { Badge, Card, EmptyState, Skeleton, StarRow } from "@/components/ui/primitives";
import { Field, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useActions, useMarketplace } from "@/lib/store";
import { appointmentView } from "@/lib/store/selectors";
import { downloadIcs } from "@/lib/calendar";
import { formatCents } from "@/lib/pricing";
import { combine, dayLabel, formatDuration, formatTime, minutesUntil } from "@/lib/time";
import { STATUS_META } from "@/components/bookings/status";

export function BookingDetail({ appointmentId }: { appointmentId: string }) {
  const { state, session } = useMarketplace();
  const params = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { cancelAppointment, addReview, sendMessage, createDispute } = useActions();

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("Something came up");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [reviewBody, setReviewBody] = useState("");
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeDetail, setDisputeDetail] = useState("");

  const confirmed = params.get("confirmed") === "1";

  if (!state) {
    return (
      <CustomerShell header="compact" title="Booking">
        <div className="space-y-3 py-6">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-56 w-full rounded-2xl" />
        </div>
      </CustomerShell>
    );
  }

  const view = appointmentView(state, appointmentId);
  if (!view) {
    return (
      <CustomerShell header="compact" title="Booking">
        <div className="py-10">
          <EmptyState
            title="We couldn't find that booking"
            body="It may have been cancelled, or the demo data was reset."
            action={<ButtonLink href="/bookings">Back to bookings</ButtonLink>}
          />
        </div>
      </CustomerShell>
    );
  }

  const { appointment, business, staff, services } = view;
  const service = services[0]?.service;
  const now = new Date(state.now);
  const minsUntil = minutesUntil(appointment.date, appointment.start_time, now);
  const meta = STATUS_META[appointment.status];
  const canCancel = appointment.status === "confirmed" || appointment.status === "pending";
  const freeCancelDeadline = business.cancellation_policy.free_cancellation_hours * 60;
  const withinFreeWindow = minsUntil > freeCancelDeadline;
  const canReview = appointment.status === "completed" && !view.review;
  const isMine = appointment.customer_id === session.userId;

  function addToCalendar() {
    if (!service) return;
    downloadIcs({
      uid: appointment.id,
      title: `${service.name} at ${business.name}`,
      description: `NOW booking ${appointment.reference}. ${service.name} with ${staff.full_name}.`,
      location: `${business.address_line1}, Philadelphia PA ${business.postal_code}`,
      date: appointment.date,
      startTime: appointment.start_time,
      endTime: appointment.end_time,
    });
    toast({ title: "Calendar file downloaded", description: "Open it to add the appointment.", tone: "success" });
  }

  function messageBusiness() {
    const thread = state!.threads.find(
      (t) => t.business_id === business.id && t.customer_id === appointment.customer_id,
    );
    const result = sendMessage({
      threadId: thread?.id,
      businessId: business.id,
      customerId: appointment.customer_id,
      appointmentId: appointment.id,
      body: thread ? "Hi — quick question about my booking." : `Hi! About my ${service?.name ?? "booking"} on ${appointment.date}…`,
      role: "customer",
    });
    if (result.ok) router.push(`/messages/${result.id}`);
  }

  function doCancel() {
    const result = cancelAppointment(appointment.id, "customer", cancelReason);
    setCancelOpen(false);
    if (result.ok) {
      toast({
        title: "Booking cancelled",
        description: withinFreeWindow
          ? "You were inside the free cancellation window — nothing charged."
          : "A late cancellation fee may apply per the business policy.",
        tone: "success",
      });
    } else {
      toast({ title: result.reason ?? "Couldn't cancel", tone: "error" });
    }
  }

  function submitReview() {
    const result = addReview({ appointmentId: appointment.id, rating, body: reviewBody.trim() });
    if (!result.ok) {
      toast({ title: result.reason ?? "Couldn't post review", tone: "error" });
      return;
    }
    setReviewOpen(false);
    toast({ title: "Thanks for the review", description: "It's now live on their profile.", tone: "success" });
  }

  function submitDispute() {
    createDispute({
      kind: "booking_dispute",
      appointmentId: appointment.id,
      businessId: business.id,
      customerId: appointment.customer_id,
      openedByRole: "customer",
      reason: "Booking dispute",
      detail: disputeDetail.trim() || "Customer opened a dispute about this booking.",
    });
    setDisputeOpen(false);
    setDisputeDetail("");
    toast({ title: "Dispute opened", description: "Our team will follow up by email.", tone: "success" });
  }

  return (
    <CustomerShell header="compact" title={confirmed ? "Booking confirmed" : "Your booking"}>
      {confirmed && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 text-center"
        >
          <motion.span
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.08 }}
            className="mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-full bg-live-500 text-white shadow-[0_10px_30px_rgba(15,159,90,0.35)]"
          >
            <motion.span
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.25, duration: 0.35 }}
            >
              <Check className="h-9 w-9" strokeWidth={3} />
            </motion.span>
          </motion.span>
          <h1 className="mt-4 text-[27px] font-bold tracking-[-0.035em] text-ink">You&rsquo;re booked!</h1>
          <p className="mt-1.5 text-[15px] text-ink-soft">
            {business.name} · {dayLabel(appointment.date, now)} at {formatTime(appointment.start_time)}
          </p>
          <p className="text-[14px] text-ink-muted">
            {service?.name} with {staff.full_name}
          </p>
          <p className="mt-2 text-[12.5px] text-ink-muted">
            Confirmation <span className="font-semibold text-ink">{appointment.reference}</span>
          </p>
        </motion.div>
      )}

      {/* ---- Actions ------------------------------------------------------- */}
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Button
          variant="outline"
          icon={<Navigation className="h-4 w-4" />}
          onClick={() =>
            window.open(
              `https://maps.google.com/?q=${encodeURIComponent(`${business.name}, ${business.address_line1}, Philadelphia PA`)}`,
              "_blank",
              "noopener,noreferrer",
            )
          }
        >
          Directions
        </Button>
        <Button variant="outline" icon={<CalendarPlus className="h-4 w-4" />} onClick={addToCalendar}>
          Calendar
        </Button>
        <Button variant="outline" icon={<MessageSquare className="h-4 w-4" />} onClick={messageBusiness}>
          Message
        </Button>
        <ButtonLink href={`/business/${business.slug}`} variant="outline">
          Profile
        </ButtonLink>
      </div>

      {/* ---- Detail -------------------------------------------------------- */}
      <Card className="mt-4 overflow-hidden">
        <div className="flex items-center gap-3.5 border-b border-line-soft p-4">
          <Avatar seed={`${business.media_seed}-logo`} name={business.name} size={48} className="rounded-xl" />
          <div className="min-w-0 flex-1">
            <Link href={`/business/${business.slug}`} className="text-[16px] font-semibold text-ink hover:text-brand-600">
              {business.name}
            </Link>
            <p className="truncate text-[13px] text-ink-muted">
              {business.address_line1}, {business.neighborhood}
            </p>
          </div>
          <Badge tone={meta.tone}>{meta.label}</Badge>
        </div>

        <dl className="divide-y divide-line-soft">
          <DetailRow label="Service" value={service?.name ?? "—"} />
          <DetailRow
            label="When"
            value={`${dayLabel(appointment.date, now)} · ${formatTime(appointment.start_time)} – ${formatTime(appointment.end_time)}`}
          />
          <DetailRow label="Provider" value={staff.full_name} />
          <DetailRow label="Duration" value={formatDuration(services[0]?.line.duration_minutes ?? 30)} />
          <DetailRow label="Reference" value={appointment.reference} />
          {appointment.customer_note && <DetailRow label="Your note" value={appointment.customer_note} />}
        </dl>

        <div className="border-t border-line-soft bg-sunken/40 p-4">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-ink">
            <Receipt className="h-4 w-4 text-ink-muted" />
            Payment
          </p>
          <dl className="mt-2.5 space-y-1.5 text-[13.5px]">
            <div className="flex justify-between">
              <dt className="text-ink-muted">
                Service
                {appointment.is_last_minute_deal && (
                  <Badge tone="urgent" className="ml-2">Last-minute deal</Badge>
                )}
              </dt>
              <dd className="tabular-nums text-ink">{formatCents(appointment.subtotal_cents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">NOW service fee</dt>
              <dd className="tabular-nums text-ink">{formatCents(appointment.service_fee_cents)}</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-1.5 font-semibold">
              <dt className="text-ink">Total</dt>
              <dd className="tabular-nums text-ink">{formatCents(appointment.total_cents)}</dd>
            </div>
          </dl>
        </div>
      </Card>

      {/* ---- Review prompt -------------------------------------------------- */}
      {canReview && isMine && (
        <Card className="mt-4 border-brand-100 bg-brand-50/60 p-4">
          <h2 className="text-[15.5px] font-semibold text-ink">How was your appointment?</h2>
          <p className="mt-1 text-[13px] text-ink-soft">
            Only customers who completed a booking can review — that&rsquo;s what makes reviews here worth reading.
          </p>
          <div className="mt-3 flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
                onClick={() => {
                  setRating(n as 1 | 2 | 3 | 4 | 5);
                  setReviewOpen(true);
                }}
                className="rounded-lg p-1 transition hover:scale-110"
              >
                <Star className="h-7 w-7 fill-caution-500/25 text-caution-500 transition hover:fill-caution-500" />
              </button>
            ))}
          </div>
        </Card>
      )}

      {view.review && (
        <Card className="mt-4 p-4">
          <p className="text-[14px] font-semibold text-ink">Your review</p>
          <StarRow value={view.review.rating} className="mt-1.5" />
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">{view.review.body}</p>
          {view.review.business_reply && (
            <div className="mt-3 rounded-xl bg-sunken px-3.5 py-3">
              <p className="text-[12.5px] font-semibold text-ink">Reply from {business.name}</p>
              <p className="mt-1 text-[13px] text-ink-soft">{view.review.business_reply}</p>
            </div>
          )}
        </Card>
      )}

      {/* ---- Policy & safety ------------------------------------------------ */}
      <Card className="mt-4 p-4">
        <h2 className="text-[14.5px] font-semibold text-ink">Cancellation policy</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
          Free cancellation up to {business.cancellation_policy.free_cancellation_hours} hours before
          your appointment
          {canCancel && (
            <> — {withinFreeWindow ? "you're inside that window right now." : "that window has passed for this booking."}</>
          )}
        </p>
        <div className="mt-3.5 flex flex-wrap gap-2">
          {canCancel && isMine && (
            <Button variant="danger" size="sm" icon={<XCircle className="h-4 w-4" />} onClick={() => setCancelOpen(true)}>
              Cancel booking
            </Button>
          )}
          {(appointment.status === "completed" || appointment.status === "no_show") && isMine && (
            <Button variant="ghost" size="sm" icon={<Flag className="h-4 w-4" />} onClick={() => setDisputeOpen(true)}>
              Dispute this booking
            </Button>
          )}
          <ButtonLink href="/support" variant="ghost" size="sm">
            Contact support
          </ButtonLink>
        </div>
      </Card>

      <div className="h-8" />

      {/* ---- Modals --------------------------------------------------------- */}
      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel this booking?"
        description={
          withinFreeWindow
            ? "You're within the free cancellation window, so there's no charge."
            : `Cancelling now is outside the free window — up to ${business.cancellation_policy.late_cancellation_fee_pct}% may be charged.`
        }
        footer={
          <div className="flex gap-2">
            <Button variant="outline" fullWidth onClick={() => setCancelOpen(false)}>
              Keep booking
            </Button>
            <Button variant="urgent" fullWidth onClick={doCancel}>
              Cancel booking
            </Button>
          </div>
        }
      >
        <Field label="Reason" htmlFor="cancel-reason">
          <Select id="cancel-reason" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}>
            <option>Something came up</option>
            <option>Feeling unwell</option>
            <option>Found a better time</option>
            <option>Booked by mistake</option>
            <option>Other</option>
          </Select>
        </Field>
        <p className="mt-3 text-[12.5px] text-ink-muted">
          The time is returned to the marketplace immediately so someone else can take it.
        </p>
      </Modal>

      <Modal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        title="How was your appointment?"
        description={`${service?.name} with ${staff.full_name} at ${business.name}`}
        footer={
          <Button fullWidth onClick={submitReview} disabled={reviewBody.trim().length < 3}>
            Post review
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`${n} stars`}
                aria-pressed={rating === n}
                onClick={() => setRating(n as 1 | 2 | 3 | 4 | 5)}
                className="rounded-lg p-1"
              >
                <Star
                  className={`h-8 w-8 transition ${n <= rating ? "fill-caution-500 text-caution-500" : "fill-line text-line"}`}
                />
              </button>
            ))}
          </div>
          <Field label="Your review" htmlFor="review-body">
            <Textarea
              id="review-body"
              value={reviewBody}
              onChange={(e) => setReviewBody(e.target.value)}
              placeholder="What stood out? Was it on time? Would you go back?"
            />
          </Field>
          <p className="text-[12.5px] text-ink-muted">
            Photo upload is part of the review model but isn&rsquo;t wired to storage in this prototype.
          </p>
        </div>
      </Modal>

      <Modal
        open={disputeOpen}
        onClose={() => setDisputeOpen(false)}
        title="Dispute this booking"
        description="Tell us what went wrong. NOW reviews every dispute before any refund decision."
        footer={
          <Button variant="urgent" fullWidth onClick={submitDispute}>
            Open dispute
          </Button>
        }
      >
        <Field label="What happened?" htmlFor="dispute-detail">
          <Textarea
            id="dispute-detail"
            value={disputeDetail}
            onChange={(e) => setDisputeDetail(e.target.value)}
            placeholder="Describe the issue…"
          />
        </Field>
      </Modal>
    </CustomerShell>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <dt className="text-[13.5px] text-ink-muted">{label}</dt>
      <dd className="text-right text-[14px] font-medium text-ink">{value}</dd>
    </div>
  );
}
