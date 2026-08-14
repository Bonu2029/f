"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Eye, Radio, Sparkles, Users, Zap } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Chip, Field, Input, Select } from "@/components/ui/form";
import { Badge, Card } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { useBusinessContext } from "@/lib/hooks";
import { useActions, useMarketplace } from "@/lib/store";
import { DISCOUNT_PRESETS, VISIBILITY_RADIUS_OPTIONS } from "@/lib/config";
import { applyDiscount, formatCents } from "@/lib/pricing";
import { addDays, addMinutes, dayLabel, formatDuration, formatTime, toDateOnly } from "@/lib/time";

/**
 * "Fill this slot" — the feature the whole business side exists for.
 *
 * A cancellation or a quiet hour becomes a published, optionally discounted
 * opening in the marketplace in about ten seconds, and the business
 * immediately sees how many people nearby can now see it.
 */
export function FillSlotModal({
  open,
  onClose,
  prefill,
}: {
  open: boolean;
  onClose: () => void;
  prefill?: { date?: string; time?: string; staffId?: string };
}) {
  const context = useBusinessContext();
  const { publishSlot } = useActions();
  const { state } = useMarketplace();
  const { toast } = useToast();

  const today = context ? toDateOnly(context.now) : toDateOnly(new Date());

  const [date, setDate] = useState(prefill?.date ?? today);
  const [time, setTime] = useState(prefill?.time ?? "14:30");
  const [serviceId, setServiceId] = useState("");
  const [staffId, setStaffId] = useState(prefill?.staffId ?? "");
  const [discount, setDiscount] = useState<number>(20);
  const [customDiscount, setCustomDiscount] = useState("25");
  const [useCustom, setUseCustom] = useState(false);
  const [radius, setRadius] = useState<number | null>(5);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishedId, setPublishedId] = useState<string | null>(null);

  // Re-seed the form each time the modal is opened from a specific gap.
  useEffect(() => {
    if (!open) return;
    setDate(prefill?.date ?? today);
    setTime(prefill?.time ?? "14:30");
    setStaffId(prefill?.staffId ?? "");
    setPublishedId(null);
    setError(null);
  }, [open, prefill?.date, prefill?.time, prefill?.staffId, today]);

  const services = context?.services.filter((s) => s.is_active && s.price_cents > 0) ?? [];
  const service = services.find((s) => s.id === serviceId) ?? services[0];

  const eligibleStaff = useMemo(() => {
    if (!context || !service) return [];
    return context.staff.filter((member) =>
      context.state.staffServices.some(
        (ss) => ss.staff_id === member.id && ss.service_id === service.id,
      ),
    );
  }, [context, service]);

  const staff = eligibleStaff.find((s) => s.id === staffId) ?? eligibleStaff[0];
  const effectiveDiscount = useCustom ? Math.min(80, Math.max(0, Number(customDiscount) || 0)) : discount;
  const offerCents = service ? applyDiscount(service.price_cents, effectiveDiscount) : 0;
  const publishedSlot = publishedId ? state?.slots.find((s) => s.id === publishedId) : null;

  function publish() {
    if (!context || !service || !staff) {
      setError("Add a service and a team member first.");
      return;
    }
    setPublishing(true);
    setError(null);
    const result = publishSlot({
      businessId: context.business.id,
      staffId: staff.id,
      serviceId: service.id,
      date,
      startTime: time,
      discountPct: effectiveDiscount,
      visibilityRadiusMiles: radius,
    });
    setPublishing(false);
    if (!result.ok) {
      setError(result.reason ?? "We couldn't publish that opening.");
      return;
    }
    setPublishedId(result.id ?? null);
    toast({
      title: "Your opening is live",
      description: `${dayLabel(date, context.now)} at ${formatTime(time)} · ${formatCents(offerCents)}`,
      tone: "success",
    });
  }

  if (publishedSlot && service && staff) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        title="Your opening is live"
        description="Customers nearby can now book this slot."
        footer={
          <div className="flex gap-2">
            <Button variant="outline" fullWidth onClick={() => setPublishedId(null)}>
              Publish another
            </Button>
            <Button fullWidth onClick={onClose}>
              Done
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Card className="border-live-500/30 bg-live-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[15px] font-semibold text-live-700">
                  {service.name} · {formatTime(time)}
                </p>
                <p className="mt-0.5 text-[13px] text-live-700/85">
                  {dayLabel(date, context!.now)} with {staff.full_name}
                </p>
              </div>
              <Badge tone="live">AVAILABLE</Badge>
            </div>
            <p className="mt-3 flex items-baseline gap-2">
              {effectiveDiscount > 0 && (
                <span className="text-[13px] text-live-700/70 line-through">
                  {formatCents(service.price_cents, { showCents: false })}
                </span>
              )}
              <span className="text-[22px] font-semibold tracking-[-0.02em] text-live-700">
                {formatCents(publishedSlot.offer_price_cents ?? publishedSlot.original_price_cents)}
              </span>
              {effectiveDiscount > 0 && <Badge tone="urgent">{effectiveDiscount}% off</Badge>}
            </p>
          </Card>

          <div className="grid grid-cols-2 gap-2.5">
            <Card className="p-3.5">
              <p className="flex items-center gap-1.5 text-[12px] font-medium text-ink-muted">
                <Users className="h-3.5 w-3.5" />
                People nearby
              </p>
              <p className="mt-1 text-[22px] font-semibold tracking-[-0.02em] text-ink">
                {publishedSlot.nearby_reach}
              </p>
              <p className="text-[11.5px] text-ink-muted">can see this opening</p>
            </Card>
            <Card className="p-3.5">
              <p className="flex items-center gap-1.5 text-[12px] font-medium text-ink-muted">
                <Eye className="h-3.5 w-3.5" />
                Profile views
              </p>
              <p className="mt-1 text-[22px] font-semibold tracking-[-0.02em] text-ink">
                {publishedSlot.view_count}
              </p>
              <p className="text-[11.5px] text-ink-muted">since publishing</p>
            </Card>
          </div>

          <p className="rounded-xl bg-sunken px-3.5 py-3 text-[12.5px] leading-relaxed text-ink-muted">
            The moment someone books it, this slot flips to <strong className="text-ink">BOOKED</strong> on
            your calendar and the revenue lands in today&rsquo;s numbers.
          </p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Fill this slot"
      description="Publish an empty time to the marketplace — with a discount if you want it gone fast."
      size="lg"
      footer={
        <Button
          fullWidth
          size="lg"
          loading={publishing}
          onClick={publish}
          icon={<Zap className="h-4 w-4" />}
        >
          Publish opening
        </Button>
      }
    >
      {!context ? (
        <p className="py-6 text-center text-[14px] text-ink-muted">Loading your calendar…</p>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date" htmlFor="fill-date">
              <input
                id="fill-date"
                type="date"
                value={date}
                min={today}
                max={addDays(today, 30)}
                onChange={(e) => setDate(e.target.value)}
                className="h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-[15px] text-ink focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/12"
              />
            </Field>
            <Field label="Start time" htmlFor="fill-time">
              <input
                id="fill-time"
                type="time"
                step={900}
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-[15px] text-ink focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/12"
              />
            </Field>
          </div>

          <Field label="Service" htmlFor="fill-service">
            <Select
              id="fill-service"
              value={service?.id ?? ""}
              onChange={(e) => {
                setServiceId(e.target.value);
                setStaffId("");
              }}
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {formatCents(s.price_cents, { showCents: false })} ·{" "}
                  {formatDuration(s.duration_minutes)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Provider" htmlFor="fill-staff">
            <Select id="fill-staff" value={staff?.id ?? ""} onChange={(e) => setStaffId(e.target.value)}>
              {eligibleStaff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.full_name} — {member.role}
                </option>
              ))}
            </Select>
          </Field>

          {service && (
            <div className="rounded-xl bg-sunken px-3.5 py-3 text-[13px] text-ink-soft">
              {formatDuration(service.duration_minutes)} · ends at{" "}
              <strong className="text-ink">{formatTime(addMinutes(time, service.duration_minutes))}</strong>
            </div>
          )}

          <Field label="Offer" hint="Discounts are the fastest way to fill a same-day gap.">
            <div className="flex flex-wrap gap-2">
              {DISCOUNT_PRESETS.map((d) => (
                <Chip
                  key={d}
                  active={!useCustom && discount === d}
                  onClick={() => {
                    setUseCustom(false);
                    setDiscount(d);
                  }}
                >
                  {d === 0 ? "No discount" : `${d}% off`}
                </Chip>
              ))}
              <Chip active={useCustom} onClick={() => setUseCustom(true)}>
                Custom
              </Chip>
            </div>
          </Field>

          {useCustom && (
            <Field label="Custom discount (%)" htmlFor="fill-custom">
              <Input
                id="fill-custom"
                type="number"
                min={0}
                max={80}
                value={customDiscount}
                onChange={(e) => setCustomDiscount(e.target.value)}
              />
            </Field>
          )}

          {service && (
            <Card className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="text-[12.5px] text-ink-muted">Normal price</p>
                <p className="text-[17px] font-semibold text-ink">
                  {formatCents(service.price_cents, { showCents: false })}
                </p>
              </div>
              <Sparkles className="h-4 w-4 text-brand-400" />
              <div className="text-right">
                <p className="text-[12.5px] text-ink-muted">Customer pays</p>
                <p className="text-[22px] font-semibold tracking-[-0.02em] text-brand-600">
                  {formatCents(offerCents)}
                </p>
              </div>
            </Card>
          )}

          <Field label="Visibility radius" hint="How far away customers can see this opening.">
            <div className="flex flex-wrap gap-2">
              {VISIBILITY_RADIUS_OPTIONS.map((option) => (
                <Chip
                  key={option.label}
                  active={radius === option.value}
                  onClick={() => setRadius(option.value)}
                  icon={<Radio className="h-3.5 w-3.5" />}
                >
                  {option.label}
                </Chip>
              ))}
            </div>
          </Field>

          {error && (
            <p className="rounded-xl bg-urgent-50 px-3.5 py-2.5 text-[13px] font-medium text-urgent-700">
              {error}
            </p>
          )}

          <p className="flex items-start gap-2 text-[12.5px] leading-relaxed text-ink-muted">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-live-500" />
            You keep{" "}
            {formatCents(
              offerCents - Math.round((offerCents * (context.business.subscription_tier === "pro" ? state!.settings.pro_commission_bps : state!.settings.commission_bps)) / 10000),
            )}{" "}
            after the NOW commission on a booking that would otherwise have been empty time.
          </p>
        </div>
      )}
    </Modal>
  );
}
