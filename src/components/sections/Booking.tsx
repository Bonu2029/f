"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useForm } from "react-hook-form";
import Art from "@/components/ui/Art";
import Button from "@/components/ui/Button";
import Reveal from "@/components/motion/Reveal";
import SplitLines from "@/components/motion/SplitLines";
import Divider from "@/components/decor/Divider";
import Particles from "@/components/decor/Particles";
import { services, pricesAreVerified, ACCENT_HEX } from "@/lib/services";
import { specialists } from "@/lib/content";
import { hours, site } from "@/lib/site";

/* ------------------------------------------------------------- constants --- */

const STEPS = [
  "Service",
  "Specialist",
  "Date",
  "Time",
  "Details",
  "Confirmed",
] as const;

type Details = {
  name: string;
  email: string;
  phone: string;
  notes: string;
};

type SendState =
  | { status: "idle" }
  | { status: "sending" }
  | { status: "sent" }
  | { status: "unconfigured" }
  | { status: "error"; message: string };

/* --------------------------------------------------------------- helpers --- */

function toMinutes(time: string) {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(time.trim());
  if (!m) return null;
  let h = Number(m[1]) % 12;
  if (m[3].toUpperCase() === "PM") h += 12;
  return h * 60 + Number(m[2]);
}

function fromMinutes(total: number) {
  const h24 = Math.floor(total / 60);
  const mins = total % 60;
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(mins).padStart(2, "0")} ${suffix}`;
}

const isoOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

/** Monday-first index for a Date. */
const dayIndex = (d: Date) => (d.getDay() + 6) % 7;

function monthMatrix(year: number, month: number) {
  const first = new Date(year, month, 1);
  const lead = dayIndex(first);
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= days; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/* ------------------------------------------------------------- component --- */

export default function Booking() {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [service, setService] = useState<string | null>(null);
  const [specialist, setSpecialist] = useState<string | null>("any");
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [send, setSend] = useState<SendState>({ status: "idle" });

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const panel = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<Details>({ mode: "onBlur" });

  const chosenService = services.find((s) => s.id === service) ?? null;
  const chosenSpecialist = specialists.find((s) => s.id === specialist) ?? null;

  /* Slots come straight from the opening hours for the chosen day. Nothing
     here claims a slot is free — the salon confirms availability by reply. */
  const slots = useMemo(() => {
    if (!date) return [];
    const d = new Date(`${date}T00:00:00`);
    const day = hours[dayIndex(d)];
    const open = day.open ? toMinutes(day.open) : null;
    const close = day.close ? toMinutes(day.close) : null;
    if (open === null || close === null) return [];

    const out: string[] = [];
    for (let t = open; t <= close - 60; t += 30) out.push(fromMinutes(t));
    return out;
  }, [date]);

  const goto = (next: number) => {
    setDirection(next > step ? 1 : -1);
    setStep(next);
    // Keep the panel in view when the height changes between steps.
    requestAnimationFrame(() =>
      panel.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }),
    );
  };

  const canAdvance =
    (step === 0 && Boolean(service)) ||
    (step === 1 && Boolean(specialist)) ||
    (step === 2 && Boolean(date)) ||
    (step === 3 && Boolean(time));

  const submit = handleSubmit(async (values) => {
    setSend({ status: "sending" });
    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service, specialist, date, time, ...values }),
      });

      if (res.ok) {
        setSend({ status: "sent" });
      } else if (res.status === 501 || res.status === 404 || res.status === 405) {
        // 501 = endpoint present but no delivery configured.
        // 404/405 = static hosting, so there is no endpoint at all.
        // Both mean "nothing was sent" and must say so rather than celebrate.
        setSend({ status: "unconfigured" });
      } else {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setSend({
          status: "error",
          message: data?.error ?? "Something went wrong. Please try again.",
        });
        return;
      }
      goto(5);
    } catch {
      setSend({
        status: "error",
        message: "We could not reach the studio. Please try again, or call us.",
      });
    }
  });

  const prettyDate = date
    ? new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : null;

  const fieldClass =
    "peer w-full min-h-[52px] rounded-xl border border-taupe bg-ivory/70 px-4 pt-5 pb-2 text-[0.9375rem] text-graphite outline-none transition-colors duration-300 placeholder:text-transparent focus:border-copper";
  const labelClass =
    "pointer-events-none absolute left-4 top-1.5 text-[0.6875rem] tracking-[0.14em] text-graphite-faint transition-all duration-300 peer-placeholder-shown:top-4 peer-placeholder-shown:text-[0.9375rem] peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[0.6875rem] peer-focus:tracking-[0.14em] peer-focus:text-copper";

  return (
    <>
      <Divider shape="wave" from="var(--color-ivory)" to="var(--color-cream)" flip />

      <section id="booking" className="relative isolate overflow-hidden py-[clamp(3rem,7vw,6rem)]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(75% 55% at 15% 8%, rgba(239,224,203,0.8), transparent 62%), radial-gradient(60% 50% at 92% 82%, rgba(210,204,221,0.6), transparent 66%)",
          }}
        />
        <Particles count={16} />

        <div className="shell relative">
          <div className="max-w-[44rem]">
            <Reveal variant="rise">
              <p className="eyebrow">Reservations</p>
            </Reveal>
            <SplitLines
              as="h2"
              mode="words"
              className="mt-6 font-display text-[length:var(--text-display)] leading-[0.95] text-graphite"
            >
              Reserve your chair
            </SplitLines>
            <Reveal variant="rise" delay={0.08}>
              <p className="mt-6 max-w-[34rem] text-[length:var(--text-lede)] leading-[1.7] text-graphite-soft">
                Six short steps. We&apos;ll reply to confirm the time — nothing is
                charged and nothing is locked in until we do.
              </p>
            </Reveal>
          </div>

          <div className="mt-[clamp(2.5rem,5vw,4rem)] grid gap-[clamp(1.5rem,3vw,2.5rem)] lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] lg:items-start">
            {/* =================================================== flow === */}
            <div ref={panel} className="glass-deep frame-soft relative overflow-hidden p-5 sm:p-8">
              {/* progress rail */}
              <ol className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto pb-1">
                {STEPS.map((label, i) => {
                  const done = i < step;
                  const current = i === step;
                  return (
                    <li key={label} className="flex min-w-0 flex-1 items-center gap-1">
                      <button
                        type="button"
                        disabled={i > step || step === 5}
                        onClick={() => i < step && goto(i)}
                        aria-current={current ? "step" : undefined}
                        className={`group flex min-w-0 flex-1 flex-col gap-2 rounded-lg px-1 py-2 text-left transition-opacity duration-300 ${
                          i > step || step === 5 ? "cursor-default" : "cursor-pointer"
                        } ${current || done ? "opacity-100" : "opacity-45"}`}
                      >
                        <span className="relative h-[3px] w-full overflow-hidden rounded-full bg-taupe/70">
                          <motion.span
                            className="absolute inset-y-0 left-0 rounded-full bg-copper"
                            initial={false}
                            animate={{ width: done ? "100%" : current ? "55%" : "0%" }}
                            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                          />
                        </span>
                        <span className="truncate text-[0.625rem] tracking-[0.16em] text-graphite-soft">
                          {label.toUpperCase()}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>

              <div className="mt-7 min-h-[22rem]">
                <AnimatePresence mode="wait" custom={direction}>
                  {/* ------------------------------------------ 0 service --- */}
                  {step === 0 && (
                    <motion.div
                      key="service"
                      custom={direction}
                      initial={{ opacity: 0, x: 40 * direction }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -40 * direction }}
                      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <h3 className="font-display text-[1.5rem] text-graphite">
                        What are you coming in for?
                      </h3>
                      <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
                        {services.map((s) => {
                          const active = service === s.id;
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => setService(s.id)}
                              aria-pressed={active}
                              className={`group flex min-h-[64px] cursor-pointer items-center gap-4 rounded-2xl border px-4 py-3.5 text-left transition-all duration-300 ${
                                active
                                  ? "border-copper bg-ivory shadow-[0_18px_44px_-24px_rgba(154,90,50,0.55)]"
                                  : "border-taupe/70 bg-ivory/45 hover:border-copper/50"
                              }`}
                            >
                              <span
                                aria-hidden
                                className="h-9 w-9 shrink-0 rounded-full transition-transform duration-500 group-hover:scale-110"
                                style={{ background: ACCENT_HEX[s.accent] }}
                              />
                              <span className="min-w-0">
                                <span className="block truncate text-[0.9375rem] text-graphite">
                                  {s.name}
                                </span>
                                <span className="block text-[0.75rem] text-graphite-faint">
                                  {s.duration}
                                  {pricesAreVerified ? ` · from $${s.priceFrom}` : ""}
                                </span>
                              </span>
                              <span
                                aria-hidden
                                className={`ml-auto text-copper transition-opacity duration-300 ${
                                  active ? "opacity-100" : "opacity-0"
                                }`}
                              >
                                ✓
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {/* --------------------------------------- 1 specialist --- */}
                  {step === 1 && (
                    <motion.div
                      key="specialist"
                      custom={direction}
                      initial={{ opacity: 0, x: 40 * direction }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -40 * direction }}
                      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <h3 className="font-display text-[1.5rem] text-graphite">
                        Who would you like to see?
                      </h3>
                      <div className="mt-6 grid gap-2.5">
                        {specialists.map((p) => {
                          const active = specialist === p.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => setSpecialist(p.id)}
                              aria-pressed={active}
                              className={`flex min-h-[64px] cursor-pointer items-center gap-4 rounded-2xl border px-4 py-3.5 text-left transition-all duration-300 ${
                                active
                                  ? "border-copper bg-ivory shadow-[0_18px_44px_-24px_rgba(154,90,50,0.55)]"
                                  : "border-taupe/70 bg-ivory/45 hover:border-copper/50"
                              }`}
                            >
                              <span
                                aria-hidden
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-champagne font-display text-[0.9375rem] text-graphite"
                              >
                                {p.name.charAt(0)}
                              </span>
                              <span className="min-w-0">
                                <span className="block text-[0.9375rem] text-graphite">
                                  {p.name}
                                </span>
                                <span className="block text-[0.75rem] text-graphite-faint">
                                  {p.focus}
                                </span>
                              </span>
                              <span
                                aria-hidden
                                className={`ml-auto text-copper transition-opacity duration-300 ${
                                  active ? "opacity-100" : "opacity-0"
                                }`}
                              >
                                ✓
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {/* --------------------------------------------- 2 date --- */}
                  {step === 2 && (
                    <motion.div
                      key="date"
                      custom={direction}
                      initial={{ opacity: 0, x: 40 * direction }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -40 * direction }}
                      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <h3 className="font-display text-[1.5rem] text-graphite">
                          {cursor.toLocaleDateString("en-US", {
                            month: "long",
                            year: "numeric",
                          })}
                        </h3>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            aria-label="Previous month"
                            disabled={
                              cursor.getFullYear() === today.getFullYear() &&
                              cursor.getMonth() === today.getMonth()
                            }
                            onClick={() =>
                              setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
                            }
                            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-taupe text-graphite transition-colors duration-300 hover:border-copper hover:text-copper disabled:cursor-not-allowed disabled:opacity-35"
                          >
                            <span aria-hidden>←</span>
                          </button>
                          <button
                            type="button"
                            aria-label="Next month"
                            onClick={() =>
                              setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
                            }
                            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-taupe text-graphite transition-colors duration-300 hover:border-copper hover:text-copper"
                          >
                            <span aria-hidden>→</span>
                          </button>
                        </div>
                      </div>

                      <div className="mt-6 grid grid-cols-7 gap-1 text-center">
                        {hours.map((d) => (
                          <span
                            key={d.day}
                            className="pb-2 text-[0.625rem] tracking-[0.14em] text-graphite-faint"
                          >
                            {d.short.charAt(0)}
                            <span className="sr-only">{d.day}</span>
                          </span>
                        ))}

                        {monthMatrix(cursor.getFullYear(), cursor.getMonth()).map((d, i) => {
                          if (!d) return <span key={`pad-${i}`} />;
                          const iso = isoOf(d);
                          const closed = !hours[dayIndex(d)].open;
                          const past = d < today;
                          const disabled = closed || past;
                          const active = date === iso;

                          return (
                            <button
                              key={iso}
                              type="button"
                              disabled={disabled}
                              onClick={() => {
                                setDate(iso);
                                setTime(null);
                              }}
                              aria-pressed={active}
                              aria-label={`${d.toLocaleDateString("en-US", {
                                weekday: "long",
                                month: "long",
                                day: "numeric",
                              })}${closed ? " — closed" : ""}`}
                              className={`relative flex h-11 cursor-pointer items-center justify-center rounded-xl text-[0.875rem] transition-all duration-300 sm:h-12 ${
                                active
                                  ? "bg-graphite text-cream"
                                  : disabled
                                    ? "cursor-not-allowed text-graphite-faint/45"
                                    : "text-graphite hover:bg-champagne/60"
                              }`}
                            >
                              {d.getDate()}
                              {closed && !past && (
                                <span
                                  aria-hidden
                                  className="absolute bottom-1.5 h-px w-3 bg-taupe-deep/60"
                                />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      <p className="mt-5 text-[0.75rem] leading-relaxed text-graphite-faint">
                        Struck-through days are when the studio is closed.
                      </p>
                    </motion.div>
                  )}

                  {/* --------------------------------------------- 3 time --- */}
                  {step === 3 && (
                    <motion.div
                      key="time"
                      custom={direction}
                      initial={{ opacity: 0, x: 40 * direction }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -40 * direction }}
                      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <h3 className="font-display text-[1.5rem] text-graphite">
                        Preferred time
                      </h3>
                      <p className="mt-2 text-[0.875rem] text-graphite-soft">{prettyDate}</p>

                      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                        {slots.map((slot, i) => {
                          const active = time === slot;
                          return (
                            <motion.button
                              key={slot}
                              type="button"
                              onClick={() => setTime(slot)}
                              aria-pressed={active}
                              initial={{ opacity: 0, y: 14 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.022, duration: 0.4 }}
                              className={`min-h-[48px] cursor-pointer rounded-xl border text-[0.875rem] transition-all duration-300 ${
                                active
                                  ? "border-copper bg-graphite text-cream"
                                  : "border-taupe/70 bg-ivory/45 text-graphite hover:border-copper/60"
                              }`}
                            >
                              {slot}
                            </motion.button>
                          );
                        })}
                      </div>

                      <p className="mt-6 text-[0.75rem] leading-relaxed text-graphite-faint">
                        These are the studio&apos;s opening times, not a live diary —
                        we&apos;ll confirm your slot by reply.
                      </p>
                    </motion.div>
                  )}

                  {/* ------------------------------------------ 4 details --- */}
                  {step === 4 && (
                    <motion.form
                      key="details"
                      onSubmit={submit}
                      noValidate
                      custom={direction}
                      initial={{ opacity: 0, x: 40 * direction }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -40 * direction }}
                      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <h3 className="font-display text-[1.5rem] text-graphite">
                        And how do we reach you?
                      </h3>

                      <div className="mt-6 grid gap-3.5 sm:grid-cols-2">
                        <div className="relative">
                          <input
                            id="bk-name"
                            placeholder="Full name"
                            autoComplete="name"
                            aria-invalid={Boolean(errors.name)}
                            aria-describedby={errors.name ? "bk-name-error" : undefined}
                            className={fieldClass}
                            {...register("name", {
                              required: "Tell us your name.",
                              minLength: { value: 2, message: "Tell us your name." },
                            })}
                          />
                          <label htmlFor="bk-name" className={labelClass}>
                            Full name
                          </label>
                          {errors.name && (
                            <p id="bk-name-error" role="alert" className="mt-1.5 text-[0.75rem] text-copper">
                              {errors.name.message}
                            </p>
                          )}
                        </div>

                        <div className="relative">
                          <input
                            id="bk-phone"
                            type="tel"
                            placeholder="Phone"
                            autoComplete="tel"
                            aria-invalid={Boolean(errors.phone)}
                            aria-describedby={errors.phone ? "bk-phone-error" : undefined}
                            className={fieldClass}
                            {...register("phone", {
                              required: "A contactable number, please.",
                              validate: (v) =>
                                v.replace(/\D/g, "").length >= 7 ||
                                "That number looks too short.",
                            })}
                          />
                          <label htmlFor="bk-phone" className={labelClass}>
                            Phone
                          </label>
                          {errors.phone && (
                            <p id="bk-phone-error" role="alert" className="mt-1.5 text-[0.75rem] text-copper">
                              {errors.phone.message}
                            </p>
                          )}
                        </div>

                        <div className="relative sm:col-span-2">
                          <input
                            id="bk-email"
                            type="email"
                            placeholder="Email"
                            autoComplete="email"
                            aria-invalid={Boolean(errors.email)}
                            aria-describedby={errors.email ? "bk-email-error" : undefined}
                            className={fieldClass}
                            {...register("email", {
                              required: "We need an email to confirm.",
                              pattern: {
                                value: /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i,
                                message: "That address does not look right.",
                              },
                            })}
                          />
                          <label htmlFor="bk-email" className={labelClass}>
                            Email
                          </label>
                          {errors.email && (
                            <p id="bk-email-error" role="alert" className="mt-1.5 text-[0.75rem] text-copper">
                              {errors.email.message}
                            </p>
                          )}
                        </div>

                        <div className="relative sm:col-span-2">
                          <textarea
                            id="bk-notes"
                            rows={4}
                            placeholder="Anything we should know?"
                            className={`${fieldClass} resize-y`}
                            {...register("notes", { maxLength: 1200 })}
                          />
                          <label htmlFor="bk-notes" className={labelClass}>
                            Anything we should know?
                          </label>
                        </div>
                      </div>

                      {send.status === "error" && (
                        <p role="alert" className="mt-4 rounded-xl bg-rose/40 px-4 py-3 text-[0.875rem] text-graphite">
                          {send.message}
                        </p>
                      )}

                      <div className="mt-7 flex flex-wrap items-center gap-3">
                        <Button
                          type="submit"
                          size="lg"
                          disabled={send.status === "sending"}
                        >
                          {send.status === "sending" ? "Sending…" : "Request appointment"}
                        </Button>
                        <button
                          type="button"
                          onClick={() => goto(3)}
                          className="min-h-[44px] cursor-pointer px-2 text-[0.8125rem] tracking-[0.1em] text-graphite-soft transition-colors duration-300 hover:text-copper"
                        >
                          Back
                        </button>
                      </div>

                      <p className="mt-5 text-[0.75rem] leading-relaxed text-graphite-faint">
                        We use these details only to confirm this appointment.
                      </p>
                    </motion.form>
                  )}

                  {/* ------------------------------------- 5 confirmation --- */}
                  {step === 5 && (
                    <motion.div
                      key="done"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5 }}
                      className="flex flex-col items-center py-6 text-center"
                    >
                      {/* Copper ring draws itself, then the mark lands */}
                      <svg viewBox="0 0 120 120" className="h-24 w-24" fill="none" aria-hidden>
                        <motion.circle
                          cx="60"
                          cy="60"
                          r="52"
                          stroke="#B87A4E"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          initial={{ pathLength: 0, rotate: -90 }}
                          animate={{ pathLength: 1 }}
                          style={{ transformOrigin: "center" }}
                          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
                        />
                        <motion.path
                          d="M40 62 L54 76 L82 46"
                          stroke="#9A5A32"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.7, delay: 0.85, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </svg>

                      <motion.h3
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.15, duration: 0.7 }}
                        className="mt-6 font-display text-[clamp(1.5rem,3vw,2.25rem)] text-graphite"
                      >
                        {send.status === "sent"
                          ? "Request received"
                          : "Almost there"}
                      </motion.h3>

                      <motion.p
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.3, duration: 0.7 }}
                        className="mt-4 max-w-[30rem] text-[0.9375rem] leading-[1.75] text-graphite-soft"
                      >
                        {send.status === "sent" ? (
                          <>
                            Thank you, {getValues("name")?.split(" ")[0] || "and see you soon"}.
                            We&apos;ll confirm {prettyDate} at {time} by email shortly. Nothing
                            is booked until you hear back from us.
                          </>
                        ) : (
                          <>
                            This site isn&apos;t connected to the studio&apos;s inbox yet, so
                            your request wasn&apos;t sent. Everything you chose is
                            summarised beside this — please finish booking through
                            the studio directly.
                          </>
                        )}
                      </motion.p>

                      <motion.div
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.45, duration: 0.7 }}
                        className="mt-8 flex flex-wrap justify-center gap-3"
                      >
                        {send.status !== "sent" && site.bookingUrl && (
                          <Button href={site.bookingUrl} size="lg">
                            Continue to booking
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="lg"
                          onClick={() => {
                            setSend({ status: "idle" });
                            setTime(null);
                            goto(0);
                          }}
                        >
                          Start another booking
                        </Button>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* step controls */}
              {step < 4 && (
                <div className="mt-7 flex items-center justify-between gap-4 border-t border-taupe/50 pt-6">
                  <button
                    type="button"
                    onClick={() => goto(Math.max(0, step - 1))}
                    disabled={step === 0}
                    className="min-h-[44px] cursor-pointer px-2 text-[0.8125rem] tracking-[0.1em] text-graphite-soft transition-colors duration-300 hover:text-copper disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    Back
                  </button>
                  <Button
                    size="lg"
                    disabled={!canAdvance}
                    onClick={() => canAdvance && goto(step + 1)}
                  >
                    Continue
                  </Button>
                </div>
              )}
            </div>

            {/* ================================================ summary === */}
            <aside className="lg:sticky lg:top-28">
              <div className="glass frame-soft overflow-hidden">
                <div className="relative">
                  <Art
                    slot="booking-ambient"
                    frame="none"
                    aspect="16 / 9"
                    sizes="(max-width: 1024px) 92vw, 30vw"
                    hoverZoom={false}
                    decorative
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(to_top,rgba(255,252,247,0.95),transparent)] p-5">
                    <p className="eyebrow text-[0.5rem]">Your appointment</p>
                  </div>
                </div>

                <dl className="divide-y divide-taupe/45 px-5 pb-2">
                  {[
                    { label: "Service", value: chosenService?.name },
                    { label: "With", value: chosenSpecialist?.name },
                    { label: "Date", value: prettyDate },
                    { label: "Time", value: time },
                    {
                      label: "Duration",
                      value: chosenService?.duration,
                    },
                  ].map((row) => (
                    <div key={row.label} className="flex items-baseline justify-between gap-4 py-3.5">
                      <dt className="text-[0.6875rem] tracking-[0.18em] text-graphite-faint">
                        {row.label.toUpperCase()}
                      </dt>
                      <dd
                        className={`text-right text-[0.9375rem] ${
                          row.value ? "text-graphite" : "text-graphite-faint/70"
                        }`}
                      >
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={String(row.value)}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.3 }}
                            className="inline-block"
                          >
                            {row.value ?? "—"}
                          </motion.span>
                        </AnimatePresence>
                      </dd>
                    </div>
                  ))}
                </dl>

                <div className="px-5 pb-5 pt-2">
                  <p className="text-[0.75rem] leading-relaxed text-graphite-faint">
                    {pricesAreVerified && chosenService
                      ? `From $${chosenService.priceFrom}. Final pricing confirmed at consultation.`
                      : "Pricing is confirmed at your consultation, before anything is opened."}
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
