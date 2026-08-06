'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, TextInput } from '@/components/ui/Form';
import { Badge } from '@/components/ui/Primitives';
import { ErrorMessage, SuccessNote } from '@/components/ui/States';
import { lookupZip, serviceAreas, zoneCopy } from '@/lib/content/locations';
import { cn } from '@/lib/utils';

export function LocationChecker() {
  const [zip, setZip] = useState('');
  const [checked, setChecked] = useState<ReturnType<typeof lookupZip> | null>(null);
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistError, setWaitlistError] = useState('');
  const [waitlistDone, setWaitlistDone] = useState(false);
  const reduce = useReducedMotion();

  const check = (event: React.FormEvent) => {
    event.preventDefault();
    setChecked(lookupZip(zip));
    setWaitlistDone(false);
  };

  const joinWaitlist = (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(waitlistEmail.trim())) {
      setWaitlistError('Enter an email address in the format name@example.com.');
      return;
    }
    setWaitlistError('');
    setWaitlistDone(true);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:gap-12">
      <div className="rounded-[2rem] border border-line bg-white p-6 shadow-soft sm:p-8">
        <h2 className="text-2xl">Check your ZIP code</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          We only list areas we have confirmed. If yours is not here yet, the waitlist
          is a real list — not a marketing form.
        </p>

        <form onSubmit={check} className="mt-6" noValidate>
          <Field label="ZIP code" htmlFor="area-zip">
            <div className="flex flex-col gap-2 sm:flex-row">
              <TextInput
                id="area-zip"
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={5}
                value={zip}
                onChange={(event) => setZip(event.target.value.replace(/\D/g, ''))}
                placeholder="10001"
              />
              <Button type="submit" className="flex-none">
                Check availability
              </Button>
            </div>
          </Field>
        </form>

        <div className="mt-5" aria-live="polite">
          {checked?.status === 'invalid' ? (
            <ErrorMessage
              title="That does not look like a ZIP code"
              body="Enter five digits and we will check it against our confirmed service areas."
            />
          ) : null}

          {checked?.status === 'found' ? (
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <SuccessNote
                title={`${checked.area.city} — ${zoneCopy[checked.area.zone].label}`}
                body={zoneCopy[checked.area.zone].detail}
              />
              <div className="mt-4 flex flex-wrap gap-2">
                {checked.area.neighborhoods.map((neighborhood) => (
                  <Badge key={neighborhood} tone="outline">
                    {neighborhood}
                  </Badge>
                ))}
              </div>
              <Button href="/booking" className="mt-5">
                Book in {checked.area.city}
              </Button>
            </motion.div>
          ) : null}

          {checked?.status === 'unknown' ? (
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="rounded-2xl border border-champagne bg-champagne/25 p-5"
            >
              <p className="text-[15px] font-medium text-ink">
                We have not confirmed service in {zip} yet.
              </p>
              <p className="mt-1 text-sm text-muted">
                We would rather tell you that than take a booking we cannot honor. Join
                the list and we will contact you when coverage is verified.
              </p>

              {waitlistDone ? (
                <div className="mt-4">
                  <SuccessNote
                    title="You are on the list"
                    body="We will get in touch when this area is confirmed. Nothing else will be sent to you."
                  />
                </div>
              ) : (
                <form onSubmit={joinWaitlist} className="mt-4" noValidate>
                  <Field label="Email address" htmlFor="waitlist-email" error={waitlistError}>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <TextInput
                        id="waitlist-email"
                        type="email"
                        autoComplete="email"
                        value={waitlistEmail}
                        aria-invalid={Boolean(waitlistError)}
                        onChange={(event) => {
                          setWaitlistEmail(event.target.value);
                          setWaitlistError('');
                        }}
                        placeholder="you@example.com"
                      />
                      <Button type="submit" className="flex-none">
                        Request my area
                      </Button>
                    </div>
                  </Field>
                </form>
              )}
            </motion.div>
          ) : null}

          {!checked ? (
            <p className="text-sm text-muted">
              Enter a ZIP code to see whether it falls in a core, extended or waitlist
              area.
            </p>
          ) : null}
        </div>
      </div>

      <div>
        <h2 className="text-2xl">Where we work</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          Zones exist so travel time does not quietly become your problem. Extended
          areas run on scheduled days, which keeps recurring plans consistent.
        </p>

        <ul className="mt-6 space-y-4">
          {serviceAreas.map((area) => (
            <li key={area.city} className="rounded-2xl border border-line bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-display text-xl text-ink">{area.city}</p>
                  <p className="text-sm text-muted">{area.region}</p>
                </div>
                <span
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium',
                    zoneCopy[area.zone].tone,
                  )}
                >
                  {zoneCopy[area.zone].label}
                </span>
              </div>
              <p className="mt-3 text-sm text-muted">
                {area.neighborhoods.join(' · ')}
              </p>
              <p className="mt-1 text-xs text-muted">ZIP codes: {area.zips.join(', ')}</p>
            </li>
          ))}
        </ul>

        <p className="mt-5 text-sm text-muted">
          These are placeholder areas used to build and test the checker. Replace them
          with confirmed coverage before launch — and do not claim availability
          anywhere it has not been verified.
        </p>
      </div>
    </div>
  );
}
