'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useReducedMotion } from '@/lib/motion';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { services } from '@/lib/content/services';
import { cn } from '@/lib/utils';

const occasions = [
  { id: 'everyday', label: 'Everyday life', slug: 'standard-cleaning', note: 'A maintenance rhythm is usually the right starting point.' },
  { id: 'guests', label: 'Guests', slug: 'standard-cleaning', note: 'Pair a standard visit with Guest Ready mode so the entry, guest bath and kitchen lead the plan.' },
  { id: 'baby', label: 'A new baby', slug: 'deep-cleaning', note: 'A deep clean with fragrance-free products sets a calm baseline before everything gets busy.' },
  { id: 'moving', label: 'Moving', slug: 'move-in-move-out', note: 'Empty-property cleaning covers cabinets, closets, baseboards and floors end to end.' },
  { id: 'event', label: 'A special event', slug: 'standard-cleaning', note: 'A standard visit before, and post-event cleaning as an add-on after.' },
  { id: 'rental', label: 'Rental guests', slug: 'airbnb-cleaning', note: 'Turnover service adds linens, restocking and photo confirmation.' },
  { id: 'seasonal', label: 'Seasonal cleaning', slug: 'deep-cleaning', note: 'Deep Restore handles the buildup a seasonal reset is really about.' },
  { id: 'unsure', label: 'I am not sure', slug: 'recurring-cleaning', note: 'Most households land on a recurring plan — and CleanMatch can confirm it in two minutes.' },
];

export function ServiceFinder() {
  const [selected, setSelected] = useState<string | null>(null);
  const reduce = useReducedMotion();

  const occasion = occasions.find((item) => item.id === selected);
  const service = occasion ? services.find((s) => s.slug === occasion.slug) : undefined;

  return (
    <div className="rounded-[2rem] border border-line bg-white p-6 shadow-soft sm:p-9">
      <fieldset>
        <legend className="font-display text-2xl text-ink sm:text-3xl">
          What are you preparing your home for?
        </legend>
        <p className="mt-2 text-[15px] text-muted">
          One answer is enough. We will point you at the service that usually fits,
          and you can change it at any time.
        </p>
        <div className="mt-6 flex flex-wrap gap-2.5">
          {occasions.map((item) => {
            const active = selected === item.id;
            return (
              <label
                key={item.id}
                className={cn(
                  'cursor-pointer rounded-full border px-4 py-2.5 text-[15px] transition-all duration-300 ease-luma',
                  active
                    ? 'border-accent bg-accent text-white shadow-soft'
                    : 'border-line bg-white text-ink hover:border-sage hover:bg-mint/20',
                )}
              >
                <input
                  type="radio"
                  name="occasion"
                  className="sr-only"
                  checked={active}
                  onChange={() => setSelected(item.id)}
                />
                {item.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div aria-live="polite" className="mt-6">
        <AnimatePresence mode="wait">
          {occasion && service ? (
            <motion.div
              key={occasion.id}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col gap-5 rounded-2xl bg-luma-gradient p-6 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="max-w-xl">
                <p className="eyebrow">Recommended service</p>
                <p className="mt-1 font-display text-2xl text-ink">{service.name}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{occasion.note}</p>
              </div>
              <div className="flex flex-none flex-col gap-2 sm:w-48">
                <Button href={`/services/${service.slug}`}>View this service</Button>
                <Button href="/clean-match" variant="quiet">
                  Or take CleanMatch →
                </Button>
              </div>
            </motion.div>
          ) : (
            <p className="text-sm text-muted">
              Nothing selected yet — the full list of services is below either way.
            </p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
