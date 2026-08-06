'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { EditorialImage } from '@/components/ui/EditorialImage';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

type Need = {
  id: string;
  label: string;
  service: string;
  serviceHref: string;
  why: string;
  ctaLabel: string;
  ctaHref: string;
};

const needs: Need[] = [
  {
    id: 'refresh',
    label: 'A regular refresh',
    service: 'Standard Cleaning',
    serviceHref: '/services/standard-cleaning',
    why: 'A full pass through the rooms you use most, on a rhythm you choose.',
    ctaLabel: 'See standard cleaning',
    ctaHref: '/services/standard-cleaning',
  },
  {
    id: 'deep',
    label: 'A complete deep clean',
    service: 'Deep Cleaning',
    serviceHref: '/services/deep-cleaning',
    why: 'Slower, detailed work on buildup, baseboards, frames and fixtures.',
    ctaLabel: 'See deep cleaning',
    ctaHref: '/services/deep-cleaning',
  },
  {
    id: 'guest',
    label: 'Guest-ready cleaning',
    service: 'Standard Cleaning · Guest Ready mode',
    serviceHref: '/services/standard-cleaning',
    why: 'Entry, guest bath, kitchen and living room move to the front of the plan.',
    ctaLabel: 'Plan a guest-ready visit',
    ctaHref: '/build-your-clean',
  },
  {
    id: 'move',
    label: 'Move-in or move-out',
    service: 'Move-In & Move-Out',
    serviceHref: '/services/move-in-move-out',
    why: 'Cabinets, closets, baseboards and floors in an empty property.',
    ctaLabel: 'See move cleaning',
    ctaHref: '/services/move-in-move-out',
  },
  {
    id: 'airbnb',
    label: 'Airbnb turnover',
    service: 'Airbnb & Rental Turnover',
    serviceHref: '/services/airbnb-cleaning',
    why: 'Linens, restocking, photo confirmation and same-day scheduling where possible.',
    ctaLabel: 'See turnover service',
    ctaHref: '/services/airbnb-cleaning',
  },
  {
    id: 'unsure',
    label: 'Help deciding',
    service: 'CleanMatch',
    serviceHref: '/clean-match',
    why: 'Twelve short questions, then a recommended service, frequency and mode.',
    ctaLabel: 'Take CleanMatch',
    ctaHref: '/clean-match',
  },
];

export function Hero() {
  const [selected, setSelected] = useState<string | null>(null);
  const reduce = useReducedMotion();
  const active = useMemo(() => needs.find((need) => need.id === selected), [selected]);

  const particles = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        left: (i * 37) % 96,
        top: (i * 61) % 84,
        delay: (i % 7) * 1.1,
        size: 3 + (i % 3),
      })),
    [],
  );

  return (
    <section className="relative overflow-hidden bg-luma-gradient">
      <div className="pointer-events-none absolute inset-0 bg-luma-veil" aria-hidden="true" />

      {!reduce ? (
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          {particles.map((particle, index) => (
            <motion.span
              key={index}
              className="absolute rounded-full bg-white/70"
              style={{
                left: `${particle.left}%`,
                top: `${particle.top}%`,
                width: particle.size,
                height: particle.size,
              }}
              animate={{ y: [0, -26, 0], opacity: [0.15, 0.65, 0.15] }}
              transition={{
                duration: 14 + (index % 5) * 2,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: particle.delay,
              }}
            />
          ))}
        </div>
      ) : null}

      <div className="container-luma relative py-16 sm:py-24 lg:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div>
            <motion.p
              className="eyebrow"
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              Your home, beautifully reset
            </motion.p>

            <motion.h1
              className="mt-4 text-balance text-[2.6rem] leading-[1.06] sm:text-6xl lg:text-[4.1rem]"
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
            >
              Come home to a complete reset.
            </motion.h1>

            <motion.p
              className="lede mt-6 max-w-xl text-pretty"
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
            >
              LumaNest creates personalized cleaning experiences built around your
              home, your routines, your surfaces, and the way you live.
            </motion.p>

            <motion.div
              className="mt-8 flex flex-col gap-3 sm:flex-row"
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <Button href="/build-your-clean" size="lg">
                Build My Cleaning Plan
              </Button>
              <Button href="/instant-estimate" variant="secondary" size="lg">
                Get an Instant Estimate
              </Button>
            </motion.div>

            <motion.p
              className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.34 }}
            >
              <span className="inline-flex items-center gap-1.5">
                <Icon name="shield" size={16} className="text-accent" />
                Background-checked professionals
              </span>
              <span aria-hidden="true" className="text-line">·</span>
              <span>Personalized preferences</span>
              <span aria-hidden="true" className="text-line">·</span>
              <span>Satisfaction support</span>
            </motion.p>
          </div>

          <motion.div
            className="relative"
            initial={reduce ? false : { opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <EditorialImage
              id="home-hero"
              aspect="aspect-[4/5] sm:aspect-[5/4] lg:aspect-[4/5]"
              priority
              className="shadow-lift"
            />
            <div className="absolute -bottom-6 -left-4 hidden max-w-[230px] rounded-2xl border border-line bg-white/95 p-4 shadow-lift backdrop-blur sm:block">
              <p className="text-sm font-medium text-ink">Your plan, remembered</p>
              <p className="mt-1 text-sm leading-snug text-muted">
                Products, pets, priority rooms and no-entry zones travel with every
                appointment.
              </p>
            </div>
          </motion.div>
        </div>

        {/* Hero selector */}
        <div className="mt-14 rounded-3xl border border-line bg-white/85 p-6 shadow-soft backdrop-blur sm:p-8">
          <fieldset>
            <legend className="font-display text-xl text-ink sm:text-2xl">
              What does your home need today?
            </legend>
            <div className="mt-5 flex flex-wrap gap-2.5">
              {needs.map((need) => {
                const isActive = selected === need.id;
                return (
                  <label
                    key={need.id}
                    className={cn(
                      'cursor-pointer rounded-full border px-4 py-2.5 text-[15px] transition-all duration-300 ease-luma',
                      isActive
                        ? 'border-accent bg-accent text-white shadow-soft'
                        : 'border-line bg-white text-ink hover:border-sage hover:bg-mint/25',
                    )}
                  >
                    <input
                      type="radio"
                      name="home-need"
                      className="sr-only"
                      checked={isActive}
                      onChange={() => setSelected(need.id)}
                    />
                    {need.label}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div aria-live="polite" className="mt-5">
            {active ? (
              <motion.div
                key={active.id}
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col gap-4 rounded-2xl bg-mint/25 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm text-muted">Recommended for you</p>
                  <p className="font-display text-xl text-ink">{active.service}</p>
                  <p className="mt-1 max-w-xl text-sm text-muted">{active.why}</p>
                </div>
                <Button href={active.ctaHref} className="flex-none">
                  {active.ctaLabel}
                </Button>
              </motion.div>
            ) : (
              <p className="text-sm text-muted">
                Choose one and we will point you to the right starting place — no
                account, no email required.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
