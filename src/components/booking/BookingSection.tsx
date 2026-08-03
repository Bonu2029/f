"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar } from "@/components/booking/Calendar";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import {
  ArrowLeft,
  ArrowRight,
  Calendar as CalendarIcon,
  Check,
  Clock,
  MapPin,
  Scissors,
  User,
} from "@/components/ui/Icons";
import { EASE_EDITORIAL, useSafeReducedMotion } from "@/components/ui/motion";
import {
  addressLines,
  barbers,
  barberById,
  serviceById,
  services,
  shop,
  yearsOfExperience,
} from "@/lib/data";
import {
  barberCanDo,
  endTime,
  formatDuration,
  formatLongDate,
  formatPrice,
  getDayStatus,
  getSlots,
} from "@/lib/booking";
import { onBookingRequest } from "@/lib/booking-bus";

const STEPS = ["Service", "Barber", "Date", "Time", "Details", "Confirm"] as const;

type Details = { name: string; email: string; phone: string; notes: string };
type Errors = Partial<Record<keyof Details, string>>;

const emptyDetails: Details = { name: "", email: "", phone: "", notes: "" };

const validate = (details: Details): Errors => {
  const errors: Errors = {};
  if (details.name.trim().length < 2) errors.name = "Please tell us your name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(details.email.trim()))
    errors.email = "Enter an email we can send the confirmation to.";
  if (details.phone.replace(/\D/g, "").length < 7)
    errors.phone = "Enter a contact number for same-day changes.";
  return errors;
};

export function BookingSection() {
  const reduced = useSafeReducedMotion();
  const [step, setStep] = useState(0);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [barberId, setBarberId] = useState<string | null>(null);
  const [dateISO, setDateISO] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [details, setDetails] = useState<Details>(emptyDetails);
  const [errors, setErrors] = useState<Errors>({});
  const [reference, setReference] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const service = serviceId ? serviceById(serviceId) : undefined;
  const barber = barberId ? barberById(barberId) : undefined;

  const eligibleBarbers = useMemo(
    () => (serviceId ? barbers.filter((b) => barberCanDo(b, serviceId)) : barbers),
    [serviceId],
  );

  const slots = useMemo(
    () => (dateISO && barberId && serviceId ? getSlots(dateISO, barberId, serviceId) : []),
    [dateISO, barberId, serviceId],
  );

  /* "Book this" buttons elsewhere on the page jump straight in. */
  useEffect(
    () =>
      onBookingRequest(({ serviceId: s, barberId: b }) => {
        if (s) {
          setServiceId(s);
          const current = b ?? barberId;
          if (current && !barberCanDo(barberById(current)!, s)) setBarberId(null);
        }
        if (b) setBarberId(b);
        setTime(null);
        setReference(null);
        setStep(s && b ? 2 : s ? 1 : 1);
      }),
    [barberId],
  );

  /* Changing an earlier answer invalidates the later ones. */
  const chooseService = (id: string) => {
    setServiceId(id);
    if (barberId && !barberCanDo(barberById(barberId)!, id)) setBarberId(null);
    setTime(null);
    setStep(1);
  };

  const chooseBarber = (id: string) => {
    setBarberId(id);
    if (dateISO && !getDayStatus(new Date(`${dateISO}T00:00:00`), id).selectable) {
      setDateISO(null);
    }
    setTime(null);
    setStep(2);
  };

  const chooseDate = (iso: string) => {
    setDateISO(iso);
    setTime(null);
    setStep(3);
  };

  const chooseTime = (value: string) => {
    setTime(value);
    setStep(4);
  };

  /* The details step stays clickable on purpose: pressing Continue is how you
     surface the validation messages. Earlier steps gate on a real choice. */
  const canAdvance = [
    Boolean(serviceId),
    Boolean(barberId),
    Boolean(dateISO),
    Boolean(time),
    true,
    true,
  ][step];

  const goNext = useCallback(() => {
    if (step === 4) {
      const found = validate(details);
      setErrors(found);
      if (Object.keys(found).length) return;
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }, [step, details]);

  const goBack = () => setStep((s) => Math.max(0, s - 1));

  /* Editing a field clears its error straight away rather than waiting for the
     next Continue press. */
  const setField = (key: keyof Details) => (value: string) => {
    setDetails((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const confirm = () => {
    // Human-readable reference: date, slot, then two initials-derived letters.
    const [, month, day] = (dateISO ?? "0000-00-00").split("-");
    const slot = (time ?? "0000").replace(":", "");
    const letters = details.name
      .trim()
      .split(/\s+/)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("")
      .padEnd(2, "X")
      .slice(0, 2);
    setReference(`ASH-${day}${month}-${slot}${letters}`);
    setStep(5);
  };

  const restart = () => {
    setStep(0);
    setServiceId(null);
    setBarberId(null);
    setDateISO(null);
    setTime(null);
    setDetails(emptyDetails);
    setErrors({});
    setReference(null);
  };

  /* Keep the panel in view as steps change height, without yanking the page. */
  useEffect(() => {
    if (step === 0 || reduced) return;
    const el = panelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < 0 || rect.top > window.innerHeight * 0.6) {
      window.scrollTo({ top: window.scrollY + rect.top - 96, behavior: "smooth" });
    }
  }, [step, reduced]);

  const summaryReady = service && barber && dateISO && time;

  return (
    <section id="booking" className="relative overflow-hidden bg-navy-950 py-24 text-ivory-100 sm:py-32">
      <div className="grain grain-light absolute inset-0 opacity-40" />
      <div
        aria-hidden
        className="absolute -top-40 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full
                   bg-[radial-gradient(circle,rgba(180,112,63,0.16),transparent_65%)] blur-2xl"
      />

      <div className="shell relative">
        <SectionHeading
          eyebrow="Booking"
          tone="light"
          align="center"
          lines={["Six short steps.", "One good chair."]}
          intro="Pick the service, the barber and the slot. No account, no phone call, no back and forth."
        />

        {/* ── Progress ── */}
        <ol className="mx-auto mt-14 flex max-w-3xl items-center gap-1.5 sm:gap-3">
          {STEPS.map((label, i) => {
            const done = i < step;
            const current = i === step;
            return (
              <li key={label} className="flex flex-1 flex-col gap-2.5">
                <span className="relative block h-[3px] overflow-hidden rounded-full bg-ivory-100/12">
                  <motion.span
                    className="absolute inset-y-0 left-0 rounded-full bg-copper-500"
                    initial={false}
                    animate={{ width: done ? "100%" : current ? "50%" : "0%" }}
                    transition={{ duration: 0.6, ease: EASE_EDITORIAL }}
                  />
                </span>
                <span
                  className={`font-sans text-[0.5625rem] tracking-[0.16em] uppercase transition-colors duration-500 sm:text-[0.625rem] ${
                    current ? "text-copper-300" : done ? "text-ivory-100/70" : "text-ivory-100/35"
                  }`}
                >
                  <span className="hidden sm:inline">{`0${i + 1} · `}</span>
                  {label}
                </span>
              </li>
            );
          })}
        </ol>

        {/* ── Panel + summary ── */}
        <div className="mt-12 grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:items-start">
          <div
            ref={panelRef}
            className="relative overflow-hidden rounded-[1.75rem] border border-ivory-100/10 bg-ivory-100 p-6 text-navy-900 sm:p-9"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 34 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -34 }}
                transition={{ duration: reduced ? 0 : 0.45, ease: EASE_EDITORIAL }}
              >
                {/* ── 1 · Service ── */}
                {step === 0 && (
                  <StepShell title="Which service?" hint="Prices include the consultation and finish.">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {services.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => chooseService(s.id)}
                          aria-pressed={serviceId === s.id}
                          className={`group flex cursor-pointer items-start gap-4 rounded-2xl border p-4 text-left
                                      transition-all duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                                        serviceId === s.id
                                          ? "border-copper-500 bg-copper-500/[0.07]"
                                          : "border-navy-900/12 hover:-translate-y-0.5 hover:border-copper-500/50 hover:bg-sand-200/30"
                                      }`}
                        >
                          <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full ring-1 ring-navy-900/10">
                            <Image
                              src={s.image.src}
                              alt=""
                              fill
                              sizes="56px"
                              placeholder="blur"
                              blurDataURL={s.image.blurDataURL}
                              className="object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-display text-base leading-tight">{s.name}</span>
                            <span className="mt-1 block text-[0.75rem] leading-snug text-navy-800/60">
                              {formatDuration(s.minutes)} · {formatPrice(s.price)}
                            </span>
                          </span>
                          <span
                            className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                              serviceId === s.id
                                ? "border-copper-500 bg-copper-500 text-ivory-50"
                                : "border-navy-900/20"
                            }`}
                          >
                            {serviceId === s.id && <Check className="h-3 w-3" />}
                          </span>
                        </button>
                      ))}
                    </div>
                  </StepShell>
                )}

                {/* ── 2 · Barber ── */}
                {step === 1 && (
                  <StepShell
                    title="Who's cutting?"
                    hint={
                      service && eligibleBarbers.length < barbers.length
                        ? `Showing the barbers who take ${service.name.toLowerCase()} appointments.`
                        : "Every barber works to the same standard — pick who suits you."
                    }
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      {eligibleBarbers.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => chooseBarber(b.id)}
                          aria-pressed={barberId === b.id}
                          className={`group flex cursor-pointer items-center gap-4 rounded-2xl border p-4 text-left
                                      transition-all duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                                        barberId === b.id
                                          ? "border-copper-500 bg-copper-500/[0.07]"
                                          : "border-navy-900/12 hover:-translate-y-0.5 hover:border-copper-500/50 hover:bg-sand-200/30"
                                      }`}
                        >
                          <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full ring-1 ring-navy-900/10">
                            <Image
                              src={b.image.src}
                              alt={b.imageAlt}
                              fill
                              sizes="64px"
                              placeholder="blur"
                              blurDataURL={b.image.blurDataURL}
                              className="object-cover object-top transition-transform duration-700 group-hover:scale-110"
                            />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-display text-base leading-tight">{b.name}</span>
                            <span className="mt-1 block text-[0.75rem] text-navy-800/60">{b.specialty}</span>
                            <span className="mt-1 block text-[0.6875rem] tracking-[0.1em] text-copper-600 uppercase">
                              {yearsOfExperience(b.since)} yrs
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </StepShell>
                )}

                {/* ── 3 · Date ── */}
                {step === 2 && (
                  <StepShell
                    title="Pick a date"
                    hint={
                      barber
                        ? `${barber.name.split(" ")[0]} takes the chair on the days shown below.`
                        : "Closed Sundays."
                    }
                  >
                    <Calendar barberId={barberId} value={dateISO} onSelect={chooseDate} />
                  </StepShell>
                )}

                {/* ── 4 · Time ── */}
                {step === 3 && (
                  <StepShell
                    title="Choose a time"
                    hint={
                      dateISO && service
                        ? `${formatLongDate(dateISO)} · ${formatDuration(service.minutes)} appointment`
                        : undefined
                    }
                  >
                    {slots.length === 0 ? (
                      <p className="rounded-2xl border border-navy-900/12 p-6 text-sm text-navy-800/70">
                        No slots left on this date. Try another day — or call us on{" "}
                        <a href={shop.phoneHref} className="text-copper-600 underline underline-offset-4">
                          {shop.phone}
                        </a>{" "}
                        and we'll find you something.
                      </p>
                    ) : (
                      <>
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                          {slots.map((slot) => (
                            <button
                              key={slot.time}
                              type="button"
                              disabled={!slot.available}
                              onClick={() => chooseTime(slot.time)}
                              aria-pressed={time === slot.time}
                              aria-label={
                                slot.available
                                  ? `${slot.time}${service ? `, finishes ${endTime(slot.time, service.minutes)}` : ""}`
                                  : `${slot.time} — unavailable`
                              }
                              className={`cursor-pointer rounded-xl border py-3 font-sans text-[0.8125rem] tabular-nums
                                          transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
                                          disabled:cursor-not-allowed ${
                                            time === slot.time
                                              ? "border-navy-900 bg-navy-900 text-ivory-100"
                                              : slot.available
                                                ? "border-navy-900/15 hover:-translate-y-0.5 hover:border-copper-500 hover:text-copper-600"
                                                : "border-transparent bg-navy-900/[0.04] text-navy-900/25 line-through"
                                          }`}
                            >
                              {slot.time}
                            </button>
                          ))}
                        </div>
                        <p className="mt-5 text-[0.6875rem] text-navy-800/50">
                          Struck-through times are already taken or too close to closing for this service.
                        </p>
                      </>
                    )}
                  </StepShell>
                )}

                {/* ── 5 · Details ── */}
                {step === 4 && (
                  <StepShell title="Your details" hint="We'll send a confirmation and a reminder the day before.">
                    <form
                      noValidate
                      onSubmit={(e) => {
                        e.preventDefault();
                        goNext();
                      }}
                      className="grid gap-5 sm:grid-cols-2"
                    >
                      <Field
                        id="booking-name"
                        label="Full name"
                        value={details.name}
                        error={errors.name}
                        autoComplete="name"
                        onChange={setField("name")}
                      />
                      <Field
                        id="booking-phone"
                        label="Phone"
                        type="tel"
                        value={details.phone}
                        error={errors.phone}
                        autoComplete="tel"
                        onChange={setField("phone")}
                      />
                      <Field
                        id="booking-email"
                        label="Email"
                        type="email"
                        className="sm:col-span-2"
                        value={details.email}
                        error={errors.email}
                        autoComplete="email"
                        onChange={setField("email")}
                      />
                      <Field
                        id="booking-notes"
                        label="Anything we should know?"
                        optional
                        textarea
                        className="sm:col-span-2"
                        value={details.notes}
                        onChange={setField("notes")}
                      />
                      <button type="submit" className="sr-only">
                        Review appointment
                      </button>
                    </form>
                  </StepShell>
                )}

                {/* ── 6 · Confirm / confirmed ── */}
                {step === 5 &&
                  (reference ? (
                    <div className="py-6 text-center">
                      <motion.span
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.6, ease: EASE_EDITORIAL }}
                        className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-copper-500 text-ivory-50"
                      >
                        <Check className="h-7 w-7" />
                      </motion.span>

                      <h3 className="mt-6 font-display text-3xl">You're in the book.</h3>
                      <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-navy-800/70">
                        A confirmation is on its way to{" "}
                        <span className="text-navy-900">{details.email}</span>. Reference{" "}
                        <span className="font-medium text-copper-600">{reference}</span>.
                      </p>

                      <dl className="mx-auto mt-8 grid max-w-md gap-px overflow-hidden rounded-2xl bg-navy-900/10 text-left sm:grid-cols-2">
                        {[
                          ["Service", service?.name],
                          ["Barber", barber?.name],
                          ["Date", dateISO ? formatLongDate(dateISO) : ""],
                          [
                            "Time",
                            time && service ? `${time} – ${endTime(time, service.minutes)}` : "",
                          ],
                        ].map(([label, value]) => (
                          <div key={label} className="bg-ivory-100 p-4">
                            <dt className="font-sans text-[0.5625rem] tracking-[0.18em] text-navy-800/45 uppercase">
                              {label}
                            </dt>
                            <dd className="mt-1.5 text-sm text-navy-900">{value}</dd>
                          </div>
                        ))}
                      </dl>

                      <p className="mx-auto mt-6 flex max-w-md items-start gap-2.5 text-left text-[0.75rem] leading-relaxed text-navy-800/60">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-copper-600" />
                        {addressLines.join(", ")}. Arrive five minutes early — the kettle's on.
                      </p>

                      <Button variant="outline" size="sm" className="mt-8 text-navy-900" onClick={restart}>
                        Book another appointment
                      </Button>
                    </div>
                  ) : (
                    <StepShell title="Check it over" hint="Nothing is booked until you confirm.">
                      <div className="overflow-hidden rounded-2xl border border-navy-900/12">
                        {[
                          { icon: Scissors, label: "Service", value: service?.name, meta: service ? formatPrice(service.price) : "" },
                          { icon: User, label: "Barber", value: barber?.name, meta: barber?.specialty },
                          { icon: CalendarIcon, label: "Date", value: dateISO ? formatLongDate(dateISO) : "", meta: "" },
                          {
                            icon: Clock,
                            label: "Time",
                            value: time && service ? `${time} – ${endTime(time, service.minutes)}` : "",
                            meta: service ? formatDuration(service.minutes) : "",
                          },
                        ].map((row) => (
                          <div
                            key={row.label}
                            className="flex items-center gap-4 border-b border-navy-900/10 p-4 last:border-b-0"
                          >
                            <row.icon className="h-4 w-4 shrink-0 text-copper-600" />
                            <span className="w-16 shrink-0 font-sans text-[0.5625rem] tracking-[0.18em] text-navy-800/45 uppercase">
                              {row.label}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-sm text-navy-900">{row.value}</span>
                            <span className="shrink-0 text-[0.75rem] text-navy-800/55">{row.meta}</span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-5 flex items-baseline justify-between border-t border-navy-900/12 pt-5">
                        <span className="font-sans text-[0.6875rem] tracking-[0.18em] text-navy-800/55 uppercase">
                          Total on the day
                        </span>
                        <span className="font-display text-2xl text-navy-900">
                          {service ? formatPrice(service.price) : ""}
                        </span>
                      </div>

                      {details.notes && (
                        <p className="mt-4 rounded-xl bg-sand-200/50 p-4 text-[0.8125rem] leading-relaxed text-navy-800/75">
                          <span className="font-medium text-navy-900">Your note: </span>
                          {details.notes}
                        </p>
                      )}

                      <Button size="lg" magnetic className="mt-7 w-full" onClick={confirm}>
                        Confirm appointment
                      </Button>
                    </StepShell>
                  ))}
              </motion.div>
            </AnimatePresence>

            {/* ── Step navigation ── */}
            {!(step === 5 && reference) && (
              <div className="mt-9 flex items-center justify-between gap-4 border-t border-navy-900/10 pt-6">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goBack}
                  disabled={step === 0}
                  className="text-navy-900"
                  icon={undefined}
                >
                  <span className="inline-flex items-center gap-2">
                    <ArrowLeft className="h-3.5 w-3.5" /> Back
                  </span>
                </Button>

                <span className="font-sans text-[0.625rem] tracking-[0.18em] text-navy-800/40 uppercase">
                  Step {step + 1} of {STEPS.length}
                </span>

                {step < 5 ? (
                  <Button
                    size="sm"
                    onClick={goNext}
                    disabled={!canAdvance}
                    icon={<ArrowRight className="h-3.5 w-3.5" />}
                  >
                    Continue
                  </Button>
                ) : (
                  <span className="w-[5.5rem]" />
                )}
              </div>
            )}
          </div>

          {/* ── Live summary ── */}
          <aside
            aria-label="Appointment summary"
            className="relative overflow-hidden rounded-[1.75rem] border border-ivory-100/12 bg-navy-900/60 p-7 backdrop-blur-sm lg:sticky lg:top-28"
          >
            <span className="eyebrow text-copper-300">Your appointment</span>

            <div className="mt-6 flex flex-col gap-5">
              {barber ? (
                <div className="flex items-center gap-4">
                  <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full ring-1 ring-copper-500/40">
                    <Image
                      src={barber.image.src}
                      alt={barber.imageAlt}
                      fill
                      sizes="64px"
                      placeholder="blur"
                      blurDataURL={barber.image.blurDataURL}
                      className="object-cover object-top"
                    />
                  </span>
                  <span>
                    <span className="block font-display text-lg text-ivory-100">{barber.name}</span>
                    <span className="block text-[0.75rem] text-steel-200">{barber.role}</span>
                    <span className="mt-0.5 block text-[0.6875rem] tracking-[0.1em] text-copper-300 uppercase">
                      {yearsOfExperience(barber.since)} years · {barber.specialty}
                    </span>
                  </span>
                </div>
              ) : (
                <p className="text-sm leading-relaxed text-steel-200">
                  Pick a service and a barber and your appointment builds up here as you go.
                </p>
              )}

              <dl className="flex flex-col gap-3 border-t border-ivory-100/10 pt-5 text-sm">
                <SummaryRow label="Service" value={service?.name} />
                <SummaryRow label="Duration" value={service ? formatDuration(service.minutes) : undefined} />
                <SummaryRow label="Date" value={dateISO ? formatLongDate(dateISO) : undefined} />
                <SummaryRow
                  label="Time"
                  value={time && service ? `${time} – ${endTime(time, service.minutes)}` : undefined}
                />
              </dl>

              <div className="flex items-baseline justify-between border-t border-ivory-100/10 pt-5">
                <span className="font-sans text-[0.625rem] tracking-[0.18em] text-steel-400 uppercase">
                  Price
                </span>
                <motion.span
                  key={service?.id ?? "none"}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: EASE_EDITORIAL }}
                  className="font-display text-3xl text-copper-300"
                >
                  {service ? formatPrice(service.price) : "—"}
                </motion.span>
              </div>

              {summaryReady && !reference && (
                <p className="text-[0.6875rem] leading-relaxed text-steel-400">
                  Free to cancel or move up to 12 hours before your slot.
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

/* ── Small building blocks ─────────────────────────────────── */

function StepShell({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="font-display text-2xl text-navy-900 sm:text-[1.75rem]">{title}</h3>
      {hint && <p className="mt-2 text-[0.8125rem] leading-relaxed text-navy-800/60">{hint}</p>}
      <div className="mt-7">{children}</div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 font-sans text-[0.625rem] tracking-[0.18em] text-steel-400 uppercase">
        {label}
      </dt>
      <dd className={`text-right ${value ? "text-ivory-100" : "text-steel-400/60"}`}>
        {value ?? "—"}
      </dd>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  type = "text",
  textarea = false,
  optional = false,
  className = "",
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  textarea?: boolean;
  optional?: boolean;
  className?: string;
  autoComplete?: string;
}) {
  const shared =
    "w-full rounded-xl border bg-transparent px-4 py-3 text-sm text-navy-900 outline-none " +
    "transition-colors duration-300 placeholder:text-navy-900/30 focus:border-copper-500";

  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="mb-2 block font-sans text-[0.625rem] tracking-[0.18em] text-navy-800/55 uppercase"
      >
        {label}
        {optional && <span className="ml-2 normal-case tracking-normal opacity-60">optional</span>}
      </label>

      {textarea ? (
        <textarea
          id={id}
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${shared} resize-none border-navy-900/15`}
          placeholder="Allergies, a reference photo, or how short you want it."
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`${shared} ${error ? "border-burgundy-500" : "border-navy-900/15"}`}
        />
      )}

      {error && (
        <p id={`${id}-error`} role="alert" className="mt-2 text-[0.75rem] text-burgundy-600">
          {error}
        </p>
      )}
    </div>
  );
}
