"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ReviewCard } from "@/components/ui/ReviewCard";
import { Button } from "@/components/ui/Button";
import { Stars } from "@/components/ui/Stars";
import { CountUp, EASE_EDITORIAL, Reveal } from "@/components/ui/motion";
import { barbers, reviews, reviewStats, services } from "@/lib/data";

const PAGE_SIZE = 6;
type Sort = "newest" | "highest";

export function ReviewsBrowser() {
  const [serviceId, setServiceId] = useState("all");
  const [barberId, setBarberId] = useState("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [shown, setShown] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    const list = reviews.filter(
      (r) =>
        (serviceId === "all" || r.serviceId === serviceId) &&
        (barberId === "all" || r.barberId === barberId),
    );
    return list.sort((a, b) =>
      sort === "newest"
        ? b.date.localeCompare(a.date)
        : b.rating - a.rating || b.date.localeCompare(a.date),
    );
  }, [serviceId, barberId, sort]);

  const stats = useMemo(() => reviewStats(filtered), [filtered]);
  const overall = useMemo(() => reviewStats(), []);
  const visible = filtered.slice(0, shown);

  const reset = (fn: () => void) => {
    fn();
    setShown(PAGE_SIZE);
  };

  return (
    <>
      {/* ── Summary ── */}
      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.4fr] lg:items-center">
        <Reveal>
          <div className="relative rounded-[1.5rem] border border-navy-900/10 bg-sand-200/45 p-8">
            <span
              aria-hidden
              className="absolute -top-3 -right-3 h-16 w-16 rounded-full border border-copper-500/35"
            />
            <p className="flex items-baseline gap-2">
              <span className="font-display text-6xl leading-none text-navy-900">
                {overall.average.toFixed(1)}
              </span>
              <span className="font-sans text-sm text-navy-800/50">/ 5</span>
            </p>
            <Stars value={overall.average} size={18} className="mt-4" />
            <p className="mt-4 text-sm text-navy-800/65">
              From <CountUp to={overall.total} /> verified appointments since {new Date().getFullYear() - 1}
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <dl className="flex flex-col gap-3">
            {overall.distribution.map((row) => (
              <div key={row.stars} className="flex items-center gap-4 text-[0.8125rem]">
                <dt className="w-14 shrink-0 tabular-nums text-navy-800/60">{row.stars} stars</dt>
                <dd className="flex flex-1 items-center gap-4">
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-navy-900/10">
                    <motion.span
                      className="block h-full rounded-full bg-copper-500"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${row.percent}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, ease: EASE_EDITORIAL }}
                    />
                  </span>
                  <span className="w-16 shrink-0 text-right tabular-nums text-navy-800/50">
                    {row.count} · {row.percent}%
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>

      {/* ── Filters ── */}
      <div className="mt-14 flex flex-col gap-4 border-y border-navy-900/12 py-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid gap-4 sm:grid-cols-2 lg:max-w-xl lg:flex-1">
          <Select
            id="filter-service"
            label="Service"
            value={serviceId}
            onChange={(v) => reset(() => setServiceId(v))}
            options={[
              { value: "all", label: "All services" },
              ...services.map((s) => ({ value: s.id, label: s.name })),
            ]}
          />
          <Select
            id="filter-barber"
            label="Barber"
            value={barberId}
            onChange={(v) => reset(() => setBarberId(v))}
            options={[
              { value: "all", label: "All barbers" },
              ...barbers.map((b) => ({ value: b.id, label: b.name })),
            ]}
          />
        </div>

        <div className="flex items-end gap-4">
          <fieldset>
            <legend className="mb-2 font-sans text-[0.625rem] tracking-[0.18em] text-navy-800/55 uppercase">
              Sort by
            </legend>
            <div className="flex gap-2">
              {(
                [
                  ["newest", "Newest"],
                  ["highest", "Highest rated"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => reset(() => setSort(value))}
                  aria-pressed={sort === value}
                  className={`cursor-pointer rounded-full border px-4 py-2.5 font-sans text-[0.625rem]
                              tracking-[0.16em] uppercase transition-all duration-300 ${
                                sort === value
                                  ? "border-navy-900 bg-navy-900 text-ivory-100"
                                  : "border-navy-900/15 text-navy-900 hover:border-copper-500 hover:text-copper-600"
                              }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      </div>

      <p aria-live="polite" className="mt-6 text-[0.8125rem] text-navy-800/60">
        Showing {visible.length} of {filtered.length} review{filtered.length === 1 ? "" : "s"}
        {filtered.length > 0 && (
          <> · {stats.average.toFixed(1)} average for this selection</>
        )}
      </p>

      {/* ── Cards ── */}
      {filtered.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-navy-900/12 p-10 text-center text-sm text-navy-800/70">
          No reviews match that combination yet. Try a different barber or service.
        </p>
      ) : (
        <>
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {visible.map((review, i) => (
                <motion.div
                  key={review.id}
                  layout
                  initial={{ opacity: 0, y: 22 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.5, delay: (i % PAGE_SIZE) * 0.05, ease: EASE_EDITORIAL }}
                >
                  <ReviewCard review={review} className="h-full" />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {shown < filtered.length && (
            <div className="mt-10 flex justify-center">
              <Button
                variant="outline"
                size="md"
                magnetic
                className="text-navy-900"
                onClick={() => setShown((s) => s + PAGE_SIZE)}
              >
                Load {Math.min(PAGE_SIZE, filtered.length - shown)} more
              </Button>
            </div>
          )}
        </>
      )}
    </>
  );
}

function Select({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block font-sans text-[0.625rem] tracking-[0.18em] text-navy-800/55 uppercase"
      >
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full cursor-pointer appearance-none rounded-xl border border-navy-900/15 bg-transparent
                     px-4 py-3 pr-10 text-sm text-navy-900 outline-none transition-colors focus:border-copper-500"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="pointer-events-none absolute top-1/2 right-4 h-4 w-4 -translate-y-1/2 text-navy-800/45"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    </div>
  );
}
