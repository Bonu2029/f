"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Check, Star } from "@/components/ui/Icons";
import { EASE_EDITORIAL } from "@/components/ui/motion";
import { barbers, services } from "@/lib/data";

type Form = {
  name: string;
  serviceId: string;
  barberId: string;
  rating: number;
  body: string;
};

type Errors = Partial<Record<keyof Form, string>>;

const empty: Form = { name: "", serviceId: "", barberId: "", rating: 0, body: "" };

const validate = (form: Form): Errors => {
  const errors: Errors = {};
  if (form.name.trim().length < 2) errors.name = "Please add a first name.";
  if (!form.serviceId) errors.serviceId = "Which service was it?";
  if (!form.barberId) errors.barberId = "Who cut your hair?";
  if (form.rating === 0) errors.rating = "Pick a rating from one to five stars.";
  if (form.body.trim().length < 15) errors.body = "A sentence or two is plenty — 15 characters minimum.";
  return errors;
};

export function ReviewForm() {
  const [form, setForm] = useState<Form>(empty);
  const [errors, setErrors] = useState<Errors>({});
  const [hovered, setHovered] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return;
    setSubmitted(true);
  };

  const inputClass = (error?: string) =>
    `w-full rounded-xl border bg-ivory-50 px-4 py-3 text-sm text-navy-900 outline-none transition-colors
     duration-300 placeholder:text-navy-900/30 focus:border-copper-500 ${
       error ? "border-burgundy-500" : "border-navy-900/15"
     }`;

  return (
    <div
      id="leave-a-review"
      className="relative overflow-hidden rounded-[1.75rem] border border-navy-900/10 bg-ivory-200 p-7 sm:p-10"
    >
      <span aria-hidden className="absolute inset-x-0 top-0 h-px rule-copper" />

      <AnimatePresence mode="wait">
        {submitted ? (
          <motion.div
            key="thanks"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE_EDITORIAL }}
            className="py-8 text-center"
          >
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-copper-500 text-ivory-50">
              <Check className="h-6 w-6" />
            </span>
            <h3 className="mt-6 font-display text-2xl text-navy-900">Thank you, {form.name.split(" ")[0]}.</h3>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-navy-800/70">
              Your review has been sent to the shop. We read every one, and it'll appear
              here once a barber has matched it to your appointment.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-7 text-navy-900"
              onClick={() => {
                setForm(empty);
                setSubmitted(false);
              }}
            >
              Write another
            </Button>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            noValidate
            onSubmit={submit}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <span className="eyebrow text-copper-600">Leave a Review</span>
            <h2 className="mt-4 font-display text-[clamp(1.6rem,3.4vw,2.4rem)] leading-tight text-navy-900">
              Had a cut with us?
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-navy-800/65">
              Two sentences is plenty. It helps the next person pick the right barber.
            </p>

            <div className="mt-9 grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="review-name"
                  className="mb-2 block font-sans text-[0.625rem] tracking-[0.18em] text-navy-800/55 uppercase"
                >
                  First name
                </label>
                <input
                  id="review-name"
                  value={form.name}
                  autoComplete="given-name"
                  onChange={(e) => set("name", e.target.value)}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? "review-name-error" : undefined}
                  className={inputClass(errors.name)}
                />
                {errors.name && (
                  <p id="review-name-error" role="alert" className="mt-2 text-[0.75rem] text-burgundy-600">
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Rating */}
              <fieldset>
                <legend className="mb-2 font-sans text-[0.625rem] tracking-[0.18em] text-navy-800/55 uppercase">
                  Rating
                </legend>
                <div
                  className="flex items-center gap-1.5"
                  onMouseLeave={() => setHovered(0)}
                  role="radiogroup"
                  aria-label="Star rating"
                  aria-invalid={Boolean(errors.rating)}
                >
                  {[1, 2, 3, 4, 5].map((value) => {
                    const filled = value <= (hovered || form.rating);
                    return (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={form.rating === value}
                        aria-label={`${value} star${value === 1 ? "" : "s"}`}
                        onMouseEnter={() => setHovered(value)}
                        onClick={() => set("rating", value)}
                        className="cursor-pointer p-1 transition-transform duration-200 hover:scale-115"
                      >
                        <Star
                          filled={filled}
                          className={`h-7 w-7 transition-colors duration-200 ${
                            filled ? "text-copper-500" : "text-navy-900/22"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
                {errors.rating && (
                  <p role="alert" className="mt-2 text-[0.75rem] text-burgundy-600">
                    {errors.rating}
                  </p>
                )}
              </fieldset>

              <div>
                <label
                  htmlFor="review-service"
                  className="mb-2 block font-sans text-[0.625rem] tracking-[0.18em] text-navy-800/55 uppercase"
                >
                  Service
                </label>
                <select
                  id="review-service"
                  value={form.serviceId}
                  onChange={(e) => set("serviceId", e.target.value)}
                  aria-invalid={Boolean(errors.serviceId)}
                  className={`${inputClass(errors.serviceId)} cursor-pointer appearance-none`}
                >
                  <option value="">Choose a service</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {errors.serviceId && (
                  <p role="alert" className="mt-2 text-[0.75rem] text-burgundy-600">
                    {errors.serviceId}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="review-barber"
                  className="mb-2 block font-sans text-[0.625rem] tracking-[0.18em] text-navy-800/55 uppercase"
                >
                  Barber
                </label>
                <select
                  id="review-barber"
                  value={form.barberId}
                  onChange={(e) => set("barberId", e.target.value)}
                  aria-invalid={Boolean(errors.barberId)}
                  className={`${inputClass(errors.barberId)} cursor-pointer appearance-none`}
                >
                  <option value="">Choose a barber</option>
                  {barbers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                {errors.barberId && (
                  <p role="alert" className="mt-2 text-[0.75rem] text-burgundy-600">
                    {errors.barberId}
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="review-body"
                  className="mb-2 block font-sans text-[0.625rem] tracking-[0.18em] text-navy-800/55 uppercase"
                >
                  Your review
                </label>
                <textarea
                  id="review-body"
                  rows={4}
                  maxLength={400}
                  value={form.body}
                  onChange={(e) => set("body", e.target.value)}
                  aria-invalid={Boolean(errors.body)}
                  placeholder="What was the cut like? Would you go back?"
                  className={`${inputClass(errors.body)} resize-none`}
                />
                <div className="mt-2 flex items-center justify-between gap-4">
                  {errors.body ? (
                    <p role="alert" className="text-[0.75rem] text-burgundy-600">
                      {errors.body}
                    </p>
                  ) : (
                    <span />
                  )}
                  <span className="shrink-0 text-[0.6875rem] tabular-nums text-navy-800/45">
                    {form.body.trim().length} / 400
                  </span>
                </div>
              </div>
            </div>

            <Button type="submit" size="lg" magnetic className="mt-8 w-full sm:w-auto">
              Submit review
            </Button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
