'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Counter, Field, OptionCards, Select, TextInput, ToggleChip } from '@/components/ui/Form';
import { Note, PlaceholderTag } from '@/components/ui/Primitives';
import { ErrorMessage, SuccessNote } from '@/components/ui/States';
import {
  addOns,
  cleaningLevels,
  conditions,
  defaultEstimateInput,
  estimate,
  frequencies,
  homeTypes,
  type EstimateInput,
} from '@/lib/pricing';
import { lookupZip, zoneCopy } from '@/lib/content/locations';
import { currency, formatDuration, isoDate } from '@/lib/utils';

export function InstantEstimate() {
  const [input, setInput] = useState<EstimateInput>(defaultEstimateInput);
  const [zip, setZip] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const reduce = useReducedMotion();

  const set = <K extends keyof EstimateInput>(key: K, value: EstimateInput[K]) =>
    setInput((current) => ({ ...current, [key]: value }));

  const result = useMemo(() => estimate(input), [input]);
  const zipResult = zip.length >= 5 ? lookupZip(zip) : null;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_400px] lg:gap-10">
      <div className="space-y-6">
        <Panel title="Where and what" step="1">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="ZIP code"
              htmlFor="estimate-zip"
              hint="Used to check service availability. Not stored."
            >
              <TextInput
                id="estimate-zip"
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={5}
                value={zip}
                onChange={(event) => setZip(event.target.value.replace(/\D/g, ''))}
                placeholder="10001"
              />
            </Field>
            <Field label="Preferred date" htmlFor="estimate-date" hint="Optional at this stage.">
              <TextInput
                id="estimate-date"
                type="date"
                min={isoDate(new Date())}
                value={preferredDate}
                onChange={(event) => setPreferredDate(event.target.value)}
              />
            </Field>
          </div>

          {zipResult ? (
            <div className="mt-4" aria-live="polite">
              {zipResult.status === 'invalid' ? (
                <ErrorMessage
                  title="That ZIP code looks incomplete"
                  body="Enter five digits and we will check it against our confirmed service areas."
                />
              ) : zipResult.status === 'unknown' ? (
                <Note title="Not on the confirmed list yet">
                  We have not verified coverage for this ZIP code. You can still see an
                  estimate, and you can join the area waitlist from the locations page.
                </Note>
              ) : (
                <SuccessNote
                  title={`${zipResult.area.city} — ${zoneCopy[zipResult.area.zone].label}`}
                  body={zoneCopy[zipResult.area.zone].detail}
                />
              )}
            </div>
          ) : null}

          <div className="mt-6">
            <OptionCards
              legend="Home type"
              name="estimate-home-type"
              columns={3}
              value={input.homeType}
              onChange={(value) => set('homeType', value)}
              options={homeTypes.map((type) => ({ id: type.id, label: type.label }))}
              size="sm"
            />
          </div>
        </Panel>

        <Panel title="Size and condition" step="2">
          <Field label="Approximate square footage" htmlFor="estimate-sqft">
            <div className="flex items-center gap-4">
              <input
                id="estimate-sqft"
                type="range"
                min={300}
                max={5000}
                step={50}
                value={input.squareFeet}
                onChange={(event) => set('squareFeet', Number(event.target.value))}
                className="w-full"
              />
              <span className="w-28 flex-none rounded-xl border border-line bg-pearl/50 px-3 py-2 text-center text-sm">
                {input.squareFeet.toLocaleString('en-US')}
              </span>
            </div>
          </Field>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Counter
              label="Bedrooms"
              value={input.bedrooms}
              onChange={(value) => set('bedrooms', value)}
              max={10}
            />
            <Counter
              label="Bathrooms"
              value={input.bathrooms}
              onChange={(value) => set('bathrooms', value)}
              max={10}
            />
            <Counter
              label="Pets"
              value={input.pets}
              onChange={(value) => set('pets', value)}
              max={8}
            />
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <Field label="Cleaning level" htmlFor="estimate-level">
              <Select
                id="estimate-level"
                value={input.level}
                onChange={(event) => set('level', event.target.value as EstimateInput['level'])}
              >
                {cleaningLevels.map((level) => (
                  <option key={level.id} value={level.id}>
                    {level.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Current condition" htmlFor="estimate-condition">
              <Select
                id="estimate-condition"
                value={input.condition}
                onChange={(event) =>
                  set('condition', event.target.value as EstimateInput['condition'])
                }
              >
                {conditions.map((condition) => (
                  <option key={condition.id} value={condition.id}>
                    {condition.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="mt-6">
            <OptionCards
              legend="Is the home occupied or empty?"
              name="estimate-occupancy"
              value={input.occupancy}
              onChange={(value) => set('occupancy', value)}
              options={[
                { id: 'occupied', label: 'Occupied' },
                { id: 'empty', label: 'Empty' },
              ]}
              size="sm"
            />
          </div>
        </Panel>

        <Panel title="Add-ons" step="3">
          <div className="grid gap-3 sm:grid-cols-2">
            {addOns.map((addOn) => (
              <ToggleChip
                key={addOn.id}
                checked={input.addOnIds.includes(addOn.id)}
                onChange={(next) =>
                  set(
                    'addOnIds',
                    next
                      ? [...input.addOnIds, addOn.id]
                      : input.addOnIds.filter((id) => id !== addOn.id),
                  )
                }
                label={addOn.label}
                price={currency(addOn.price)}
                icon={<Icon name={addOn.icon} size={18} />}
              />
            ))}
          </div>
        </Panel>

        <Panel title="Frequency" step="4">
          <OptionCards
            legend="How often?"
            legendHidden
            name="estimate-frequency"
            columns={2}
            value={input.frequency}
            onChange={(value) => set('frequency', value)}
            options={frequencies.map((frequency) => ({
              id: frequency.id,
              label: frequency.label,
              hint: frequency.note,
            }))}
          />
        </Panel>
      </div>

      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="rounded-[2rem] border border-line bg-white p-6 shadow-lift">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow">Your estimate</p>
              <motion.p
                key={result.total}
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28 }}
                className="mt-2 font-display text-3xl text-ink"
              >
                {currency(result.low)} – {currency(result.high)}
              </motion.p>
              <p className="mt-1 text-sm text-muted">
                About {formatDuration(result.minutes)} · {result.teamSize}-person team
              </p>
            </div>
            <PlaceholderTag>Sample rates</PlaceholderTag>
          </div>

          <dl className="mt-6 space-y-2.5 border-t border-line pt-5 text-sm">
            {result.lines.map((line) => (
              <div key={`${line.label}-${line.detail ?? ''}`} className="flex items-baseline justify-between gap-4">
                <dt className="text-muted">
                  {line.label}
                  {line.detail ? (
                    <span className="block text-xs text-muted/80">{line.detail}</span>
                  ) : null}
                </dt>
                <dd className="flex-none font-medium text-ink">
                  {line.amount < 0 ? `−${currency(Math.abs(line.amount))}` : currency(line.amount)}
                </dd>
              </div>
            ))}

            <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
              <dt className="text-muted">Subtotal</dt>
              <dd className="font-medium text-ink">{currency(result.subtotal)}</dd>
            </div>

            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-muted">
                Frequency adjustment
                <span className="block text-xs text-muted/80">
                  {frequencies.find((f) => f.id === input.frequency)?.label}
                </span>
              </dt>
              <dd className="font-medium text-ink">
                {result.frequencyAdjustment === 0
                  ? '—'
                  : `−${currency(Math.abs(result.frequencyAdjustment))}`}
              </dd>
            </div>

            <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
              <dt className="font-medium text-ink">Estimated total</dt>
              <dd className="font-display text-xl text-ink">{currency(result.total)}</dd>
            </div>

            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-muted">Estimated duration</dt>
              <dd className="font-medium text-ink">{formatDuration(result.minutes)}</dd>
            </div>
          </dl>

          <div className="mt-6 grid gap-2">
            <Button href="/booking">Continue to booking</Button>
            <Button href="/build-your-clean" variant="secondary">
              Refine it room by room
            </Button>
          </div>

          <p className="mt-5 text-xs leading-relaxed text-muted">
            The final amount changes only when you change the scope, or when the
            property details are substantially different from what was submitted here.
            There are no crossed-out prices and no invented discounts — the frequency
            adjustment is the only reduction, and it is shown above.
          </p>
        </div>
      </aside>
    </div>
  );
}

function Panel({
  title,
  step,
  children,
}: {
  title: string;
  step: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-line bg-white p-6 shadow-soft sm:p-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-mint/50 font-display text-sm text-accent-deep">
          {step}
        </span>
        <h2 className="text-xl">{title}</h2>
      </div>
      {children}
    </section>
  );
}
