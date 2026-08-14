"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Apple,
  Check,
  ChevronLeft,
  Clock,
  CreditCard,
  Lock,
  ShieldCheck,
  Timer,
  Zap,
} from "lucide-react";
import { CustomerShell } from "@/components/layout/customer-shell";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/media";
import { Badge, Card, EmptyState, Rating, Skeleton } from "@/components/ui/primitives";
import { Field, Textarea } from "@/components/ui/form";
import { SlotPill } from "@/components/marketplace/slot-pill";
import { useToast } from "@/components/ui/toast";
import { useDiscovery } from "@/lib/hooks";
import { useActions, useMarketplace } from "@/lib/store";
import { formatCents, priceBooking } from "@/lib/pricing";
import { formatDistance } from "@/lib/geo";
import {
  addDays,
  dayLabel,
  formatCountdown,
  formatDuration,
  formatTime,
  toDateOnly,
} from "@/lib/time";
import type { SlotView } from "@/lib/types";
import { cn } from "@/lib/utils";

type Step = 1 | 2 | 3 | 4;

const STEPS: { id: Step; label: string }[] = [
  { id: 1, label: "Service" },
  { id: 2, label: "Provider" },
  { id: 3, label: "Time" },
  { id: 4, label: "Review" },
];

export function BookingFlow({ slotId }: { slotId: string }) {
  const discovery = useDiscovery();
  const router = useRouter();
  const { toast } = useToast();
  const { session, signIn } = useMarketplace();
  const { holdSlot, releaseSlot, bookSlot, registerSlotView } = useActions();

  const [step, setStep] = useState<Step>(4);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string>(slotId);
  const [note, setNote] = useState("");
  const [payMethod, setPayMethod] = useState<"card" | "apple" | "google">("card");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [heldUntil, setHeldUntil] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const heldSlotRef = useRef<string | null>(null);
  const viewedRef = useRef(false);

  const state = discovery?.state ?? null;

  /* ---- Resolve the current selection ------------------------------------ */

  const entrySlot = state?.slots.find((s) => s.id === slotId) ?? null;
  const business = entrySlot ? state?.businesses.find((b) => b.id === entrySlot.business_id) : null;

  // Initialise service/provider from the tapped slot exactly once.
  useEffect(() => {
    if (!entrySlot || serviceId) return;
    setServiceId(entrySlot.service_id);
    setStaffId(entrySlot.staff_id);
  }, [entrySlot, serviceId]);

  useEffect(() => {
    if (!entrySlot || viewedRef.current) return;
    viewedRef.current = true;
    registerSlotView(entrySlot.id);
  }, [entrySlot, registerSlotView]);

  const businessSlots = useMemo(() => {
    if (!discovery || !business) return [];
    return discovery.slots.filter((s) => s.business.id === business.id);
  }, [discovery, business]);

  const services = useMemo(
    () => (state && business ? state.services.filter((s) => s.business_id === business.id && s.is_active) : []),
    [state, business],
  );

  const staffForService = useMemo(() => {
    if (!state || !business || !serviceId) return [];
    const allowed = new Set(
      state.staffServices.filter((ss) => ss.service_id === serviceId).map((ss) => ss.staff_id),
    );
    return state.staff.filter((s) => s.business_id === business.id && s.is_active && allowed.has(s.id));
  }, [state, business, serviceId]);

  /** Candidate times for the chosen service (and provider, if pinned). */
  const candidateSlots = useMemo(() => {
    return businessSlots
      .filter((s) => (serviceId ? s.service.id === serviceId : true))
      .filter((s) => (staffId ? s.staff.id === staffId : true))
      .sort((a, b) => a.minutes_until - b.minutes_until);
  }, [businessSlots, serviceId, staffId]);

  const selected: SlotView | null = useMemo(() => {
    const match = businessSlots.find((s) => s.slot.id === selectedSlotId);
    if (match) return match;
    // Fall back to the current slot even once held, so the review step keeps
    // rendering while our own hold is in place.
    if (!discovery || !state) return null;
    const raw = state.slots.find((s) => s.id === selectedSlotId);
    if (!raw) return null;
    const svc = state.services.find((s) => s.id === raw.service_id);
    const stf = state.staff.find((s) => s.id === raw.staff_id);
    const biz = state.businesses.find((b) => b.id === raw.business_id);
    const cat = svc && state.categories.find((c) => c.id === svc.category_id);
    if (!svc || !stf || !biz || !cat) return null;
    const price = raw.offer_price_cents ?? raw.original_price_cents;
    return {
      slot: raw,
      business: biz,
      service: svc,
      staff: stf,
      category: cat,
      distance_miles: 0,
      price_cents: price,
      discount_pct:
        raw.offer_price_cents != null
          ? Math.round(((raw.original_price_cents - raw.offer_price_cents) / raw.original_price_cents) * 100)
          : 0,
      minutes_until: 0,
    };
  }, [businessSlots, selectedSlotId, discovery, state]);

  /* ---- Temporary hold ---------------------------------------------------- */

  const releaseCurrent = useCallback(() => {
    if (heldSlotRef.current) {
      releaseSlot(heldSlotRef.current);
      heldSlotRef.current = null;
    }
  }, [releaseSlot]);

  useEffect(() => {
    if (step !== 4 || !selected || !session.userId || expired) return;
    if (heldSlotRef.current === selected.slot.id) return;
    releaseCurrent();
    const result = holdSlot(selected.slot.id, session.userId);
    if (result.ok && result.heldUntil) {
      heldSlotRef.current = selected.slot.id;
      setHeldUntil(result.heldUntil);
      setExpired(false);
    } else if (!result.ok) {
      setError(result.reason ?? null);
    }
  }, [step, selected, session.userId, holdSlot, releaseCurrent, expired]);

  // Release the hold if the customer walks away mid-checkout.
  useEffect(() => () => releaseCurrent(), [releaseCurrent]);

  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!heldUntil) return;
    const tick = () => {
      const remaining = Math.round((new Date(heldUntil).getTime() - Date.now()) / 1000);
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        setExpired(true);
        setHeldUntil(null);
        heldSlotRef.current = null;
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [heldUntil]);

  /* ---- Submit ------------------------------------------------------------ */

  async function confirm() {
    if (!selected) return;
    if (!session.userId) {
      signIn("customer");
      toast({ title: "Signed in as Maya", description: "Demo customer account.", tone: "info" });
      return;
    }
    setSubmitting(true);
    setError(null);
    // Simulated network latency so the loading state is real, not decorative.
    await new Promise((r) => setTimeout(r, 700));
    const result = bookSlot(selected.slot.id, { customerId: session.userId, note: note.trim() || null });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.reason ?? "We couldn't complete that booking.");
      return;
    }
    heldSlotRef.current = null;
    router.push(`/bookings/${result.id}?confirmed=1`);
  }

  /* ---- Render ------------------------------------------------------------ */

  if (!discovery || !state) {
    return (
      <CustomerShell header="compact" title="Book" hideNav>
        <div className="space-y-3 py-6">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-56 w-full rounded-2xl" />
        </div>
      </CustomerShell>
    );
  }

  if (!entrySlot || !business || !selected) {
    return (
      <CustomerShell header="compact" title="Book" hideNav>
        <div className="py-10">
          <EmptyState
            icon={<AlertTriangle className="h-5 w-5" />}
            title="That appointment was just booked"
            body="It's gone from inventory. Here are the next closest options nearby."
            action={
              <div className="flex gap-2">
                <Button onClick={() => router.push("/search")}>Find another time</Button>
                <Button variant="outline" onClick={() => router.push("/deals")}>
                  See openings
                </Button>
              </div>
            }
          />
        </div>
      </CustomerShell>
    );
  }

  const service = state.services.find((s) => s.id === serviceId) ?? selected.service;
  const money = priceBooking(selected.price_cents, business, state.settings);
  const policyHours = business.cancellation_policy.free_cancellation_hours;

  return (
    <CustomerShell header="compact" title={`Book at ${business.name}`} hideNav>
      {/* Stepper */}
      <ol className="mt-4 flex items-center gap-1.5" aria-label="Booking steps">
        {STEPS.map((s, i) => {
          const done = s.id < step;
          const active = s.id === step;
          return (
            <li key={s.id} className="flex flex-1 items-center gap-1.5">
              <button
                type="button"
                onClick={() => setStep(s.id)}
                aria-current={active ? "step" : undefined}
                className="group flex min-w-0 flex-1 flex-col gap-1.5"
              >
                <span
                  className={cn(
                    "h-1 w-full rounded-full transition-colors",
                    done || active ? "bg-brand-500" : "bg-line",
                  )}
                />
                <span
                  className={cn(
                    "truncate text-left text-[11.5px] font-semibold transition-colors",
                    active ? "text-brand-600" : done ? "text-ink-soft" : "text-ink-muted",
                  )}
                >
                  {i + 1}. {s.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="mt-5"
        >
          {step === 1 && (
            <StepShell title="Choose a service" subtitle={business.name}>
              <div className="grid gap-2.5">
                {services.map((s) => {
                  const available = businessSlots.filter((v) => v.service.id === s.id).length;
                  const active = s.id === serviceId;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setServiceId(s.id);
                        setStaffId(null);
                        const first = businessSlots.find((v) => v.service.id === s.id);
                        if (first) setSelectedSlotId(first.slot.id);
                        setStep(2);
                      }}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl border p-3.5 text-left transition",
                        active ? "border-brand-500 bg-brand-50" : "border-line bg-surface hover:border-brand-200",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-semibold text-ink">{s.name}</p>
                        <p className="mt-0.5 text-[13px] text-ink-muted">
                          {formatDuration(s.duration_minutes)} ·{" "}
                          {available > 0 ? `${available} openings` : "No openings this week"}
                        </p>
                      </div>
                      <p className="shrink-0 text-[15.5px] font-semibold text-ink">
                        {formatCents(s.price_cents, { showCents: false })}
                      </p>
                      {active && <Check className="h-4 w-4 shrink-0 text-brand-600" />}
                    </button>
                  );
                })}
              </div>
            </StepShell>
          )}

          {step === 2 && (
            <StepShell title="Choose a provider" subtitle="Or let us pick whoever's free soonest">
              <div className="grid gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setStaffId(null);
                    const soonest = candidateSlots.find((s) => s.service.id === serviceId);
                    if (soonest) setSelectedSlotId(soonest.slot.id);
                    setStep(3);
                  }}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border p-3.5 text-left transition",
                    staffId == null ? "border-brand-500 bg-brand-50" : "border-line bg-surface hover:border-brand-200",
                  )}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white">
                    <Zap className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold text-ink">
                      Any available provider
                    </span>
                    <span className="block text-[13px] text-ink-muted">Fastest — usually the soonest time</span>
                  </span>
                  {staffId == null && <Check className="h-4 w-4 shrink-0 text-brand-600" />}
                </button>

                {staffForService.map((member) => {
                  const next = businessSlots.find(
                    (v) => v.staff.id === member.id && v.service.id === serviceId,
                  );
                  const active = staffId === member.id;
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => {
                        setStaffId(member.id);
                        if (next) setSelectedSlotId(next.slot.id);
                        setStep(3);
                      }}
                      disabled={!next}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl border p-3.5 text-left transition disabled:opacity-55",
                        active ? "border-brand-500 bg-brand-50" : "border-line bg-surface hover:border-brand-200",
                      )}
                    >
                      <Avatar seed={member.media_seed} name={member.full_name} size={44} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold text-ink">
                          {member.full_name}
                        </span>
                        <span className="block truncate text-[13px] text-ink-muted">{member.role}</span>
                        <span className="mt-1 flex items-center gap-2">
                          <Rating value={member.rating} />
                          <span className="text-[12.5px] text-ink-muted">
                            {next
                              ? `Next ${dayLabel(next.slot.date, discovery.now)} ${formatTime(next.slot.start_time)}`
                              : "Fully booked"}
                          </span>
                        </span>
                      </span>
                      {active && <Check className="h-4 w-4 shrink-0 text-brand-600" />}
                    </button>
                  );
                })}
              </div>
            </StepShell>
          )}

          {step === 3 && (
            <StepShell title="Pick a time" subtitle={service.name}>
              <TimePicker
                slots={candidateSlots}
                now={discovery.now}
                selectedId={selectedSlotId}
                onSelect={(s) => {
                  setSelectedSlotId(s.slot.id);
                  setStaffId(s.staff.id);
                  setExpired(false);
                  setError(null);
                  setStep(4);
                }}
              />
            </StepShell>
          )}

          {step === 4 && (
            <div className="space-y-4">
              {expired ? (
                <Card className="border-caution-500/40 bg-caution-50 p-4">
                  <p className="flex items-center gap-2 text-[14px] font-semibold text-caution-700">
                    <Timer className="h-4 w-4" />
                    Your hold expired
                  </p>
                  <p className="mt-1 text-[13px] text-caution-700/90">
                    We released the time back so someone else could book it. Pick a time again — it may
                    still be free.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    onClick={() => {
                      setExpired(false);
                      setStep(3);
                    }}
                  >
                    Choose a time
                  </Button>
                </Card>
              ) : (
                secondsLeft != null &&
                secondsLeft > 0 && (
                  <div className="flex items-center gap-2 rounded-xl border border-brand-100 bg-brand-50 px-3.5 py-2.5">
                    <Timer className="h-4 w-4 shrink-0 text-brand-600" />
                    <p className="text-[13px] text-brand-700">
                      This time is reserved for you for{" "}
                      <strong className="tabular-nums">{formatCountdown(secondsLeft)}</strong>
                    </p>
                  </div>
                )
              )}

              {error && (
                <Card className="border-urgent-100 bg-urgent-50 p-4">
                  <p className="flex items-center gap-2 text-[14px] font-semibold text-urgent-700">
                    <AlertTriangle className="h-4 w-4" />
                    {error}
                  </p>
                  <p className="mt-1 text-[13px] text-urgent-700/85">
                    Here are the next closest times at {business.name}.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {candidateSlots.slice(0, 4).map((s) => (
                      <SlotPill
                        key={s.slot.id}
                        slot={s}
                        size="sm"
                        onSelect={(v) => {
                          setSelectedSlotId(v.slot.id);
                          setError(null);
                          setExpired(false);
                        }}
                      />
                    ))}
                  </div>
                </Card>
              )}

              {/* Summary */}
              <Card className="overflow-hidden">
                <div className="flex items-start gap-3.5 p-4">
                  <Avatar seed={`${business.media_seed}-logo`} name={business.name} size={48} className="rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/business/${business.slug}`}
                      className="text-[16px] font-semibold text-ink hover:text-brand-600"
                    >
                      {business.name}
                    </Link>
                    <p className="mt-0.5 text-[13px] text-ink-muted">
                      {business.address_line1}, {business.neighborhood} ·{" "}
                      {formatDistance(selected.distance_miles)}
                    </p>
                  </div>
                </div>

                <dl className="divide-y divide-line-soft border-t border-line-soft">
                  <Row label="Service" value={service.name} onEdit={() => setStep(1)} />
                  <Row
                    label="When"
                    value={`${dayLabel(selected.slot.date, discovery.now)} · ${formatTime(selected.slot.start_time)}`}
                    onEdit={() => setStep(3)}
                  />
                  <Row label="With" value={selected.staff.full_name} onEdit={() => setStep(2)} />
                  <Row label="Duration" value={formatDuration(service.duration_minutes)} />
                </dl>
              </Card>

              <Field label="Note for the business (optional)" htmlFor="booking-note">
                <Textarea
                  id="booking-note"
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Anything they should know before you arrive?"
                />
              </Field>

              {/* Payment */}
              <Card className="p-4">
                <h3 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
                  <Lock className="h-4 w-4 text-brand-500" />
                  Payment
                </h3>

                <div className="mt-3 grid gap-2">
                  <PayOption
                    active={payMethod === "apple"}
                    onClick={() => setPayMethod("apple")}
                    icon={<Apple className="h-4 w-4" />}
                    label="Apple Pay"
                  />
                  <PayOption
                    active={payMethod === "google"}
                    onClick={() => setPayMethod("google")}
                    icon={<span className="text-[13px] font-bold">G</span>}
                    label="Google Pay"
                  />
                  <PayOption
                    active={payMethod === "card"}
                    onClick={() => setPayMethod("card")}
                    icon={<CreditCard className="h-4 w-4" />}
                    label="Visa •••• 4242"
                    sub="Default card"
                  />
                </div>

                <p className="mt-3 rounded-xl bg-sunken px-3 py-2.5 text-[12px] leading-relaxed text-ink-muted">
                  Payments are not processed in this prototype. The checkout is structured for Stripe
                  Payment Intents with Apple Pay and Google Pay wallets — no card data is collected here.
                </p>

                <dl className="mt-4 space-y-2 border-t border-line-soft pt-4 text-[14px]">
                  <div className="flex justify-between">
                    <dt className="text-ink-soft">
                      {service.name}
                      {selected.discount_pct > 0 && (
                        <Badge tone="urgent" className="ml-2">
                          {selected.discount_pct}% off
                        </Badge>
                      )}
                    </dt>
                    <dd className="tabular-nums text-ink">
                      {selected.discount_pct > 0 && (
                        <span className="mr-1.5 text-[12.5px] text-ink-muted line-through">
                          {formatCents(selected.slot.original_price_cents, { showCents: false })}
                        </span>
                      )}
                      {formatCents(money.subtotal_cents)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-soft">NOW service fee</dt>
                    <dd className="tabular-nums text-ink">{formatCents(money.service_fee_cents)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-line-soft pt-2.5 text-[16px] font-semibold">
                    <dt className="text-ink">Total</dt>
                    <dd className="tabular-nums text-ink">{formatCents(money.total_cents)}</dd>
                  </div>
                </dl>
              </Card>

              <div className="rounded-2xl border border-line bg-surface p-4">
                <p className="flex items-center gap-2 text-[13.5px] font-semibold text-ink">
                  <ShieldCheck className="h-4 w-4 text-live-500" />
                  Free cancellation up to {policyHours} hours before
                </p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">
                  Cancel later than that and up to{" "}
                  {business.cancellation_policy.late_cancellation_fee_pct}% of the service price may be
                  charged. Full policy on the{" "}
                  <Link href="/legal/cancellation-policy" className="font-medium text-brand-600 underline">
                    cancellation page
                  </Link>
                  .
                </p>
              </div>

              <div className="h-20" />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Sticky CTA */}
      {step === 4 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 px-4 pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] text-ink-muted">
                {dayLabel(selected.slot.date, discovery.now)} · {formatTime(selected.slot.start_time)} ·{" "}
                {selected.staff.full_name}
              </p>
              <p className="text-[17px] font-semibold tracking-[-0.02em] text-ink">
                {formatCents(money.total_cents)}
              </p>
            </div>
            <Button
              size="lg"
              loading={submitting}
              disabled={expired}
              onClick={confirm}
              trailing={!submitting ? <ArrowRight className="h-4 w-4" /> : undefined}
            >
              Confirm & Pay
            </Button>
          </div>
        </div>
      )}

      {step !== 4 && (
        <div className="mt-6 flex gap-2">
          <Button
            variant="outline"
            onClick={() => setStep((s) => (s > 1 ? ((s - 1) as Step) : s))}
            icon={<ChevronLeft className="h-4 w-4" />}
          >
            Back
          </Button>
          <Button fullWidth onClick={() => setStep(4)}>
            Continue
          </Button>
        </div>
      )}
    </CustomerShell>
  );
}

/* -------------------------------------------------------------------------- */

function StepShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-[20px] font-bold tracking-[-0.025em] text-ink">{title}</h2>
      {subtitle && <p className="mt-0.5 text-[13.5px] text-ink-muted">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: string;
  onEdit?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <dt className="text-[13.5px] text-ink-muted">{label}</dt>
      <dd className="flex items-center gap-2 text-[14.5px] font-medium text-ink">
        {value}
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="text-[12.5px] font-semibold text-brand-600 hover:text-brand-700"
          >
            Change
          </button>
        )}
      </dd>
    </div>
  );
}

function PayOption({
  active,
  onClick,
  icon,
  label,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  sub?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition",
        active ? "border-brand-500 bg-brand-50" : "border-line bg-surface hover:border-brand-200",
      )}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-white">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold text-ink">{label}</span>
        {sub && <span className="block text-[12.5px] text-ink-muted">{sub}</span>}
      </span>
      <span
        className={cn(
          "flex h-4.5 w-4.5 items-center justify-center rounded-full border-2",
          active ? "border-brand-500 bg-brand-500" : "border-line",
        )}
      >
        {active && <Check className="h-3 w-3 text-white" strokeWidth={3.5} />}
      </span>
    </button>
  );
}

function TimePicker({
  slots,
  now,
  selectedId,
  onSelect,
}: {
  slots: SlotView[];
  now: Date;
  selectedId: string | null;
  onSelect: (slot: SlotView) => void;
}) {
  const today = toDateOnly(now);
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const soonest = slots[0] ?? null;

  if (slots.length === 0) {
    return (
      <EmptyState
        icon={<Clock className="h-5 w-5" />}
        title="No openings for this combination"
        body="Try 'any available provider', a different service, or check back — cancellations show up here instantly."
      />
    );
  }

  return (
    <div className="space-y-5">
      {soonest && (
        <button
          type="button"
          onClick={() => onSelect(soonest)}
          className="flex w-full items-center gap-3 rounded-2xl border border-live-500/30 bg-live-50 p-3.5 text-left transition hover:border-live-500"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-live-500 text-white">
            <Zap className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14.5px] font-semibold text-live-700">Soonest available</span>
            <span className="block text-[13px] text-live-700/85">
              {dayLabel(soonest.slot.date, now)} at {formatTime(soonest.slot.start_time)} with{" "}
              {soonest.staff.full_name}
            </span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-live-700" />
        </button>
      )}

      {days.map((date) => {
        const dayySlots = slots.filter((s) => s.slot.date === date);
        if (dayySlots.length === 0) return null;
        return (
          <div key={date}>
            <p className="mb-2 text-[13.5px] font-semibold text-ink">{dayLabel(date, now)}</p>
            <div className="flex flex-wrap gap-2">
              {dayySlots.map((s) => (
                <SlotPill key={s.slot.id} slot={s} selected={selectedId === s.slot.id} onSelect={onSelect} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
