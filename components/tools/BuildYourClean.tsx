'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useReducedMotion } from '@/lib/motion';
import { useMemo, useState } from 'react';
import { RoomSelector } from './RoomSelector';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import {
  Counter,
  Field,
  OptionCards,
  Select,
  TextArea,
  TextInput,
  ToggleChip,
} from '@/components/ui/Form';
import {
  EmptyState,
  ErrorMessage,
  ProgressBar,
  SuccessNote,
  ToastStack,
  useToasts,
} from '@/components/ui/States';
import { Note, PlaceholderTag } from '@/components/ui/Primitives';
import { rooms, roomPriorities, type RoomId, type RoomPriorityId } from '@/lib/content/rooms';
import { cleaningModes } from '@/lib/content/general';
import {
  addOns,
  cleaningLevels,
  conditions,
  estimate,
  frequencies,
  homeTypes,
} from '@/lib/pricing';
import {
  emptyPlan,
  planToEstimateInput,
  recommendLevel,
  recommendMode,
  type CleaningPlan,
} from '@/lib/plan';
import { storageKeys, usePersistentState } from '@/lib/storage';
import { currency, formatDuration } from '@/lib/utils';

const steps = [
  'Home type',
  'Home size',
  'Rooms',
  'Room priorities',
  'Special tasks',
  'Preferences',
  'Schedule',
  'Summary',
];

export function BuildYourClean() {
  const { value: plan, setValue: setPlan, hydrated } = usePersistentState<CleaningPlan>(
    storageKeys.plan,
    emptyPlan,
  );
  const [step, setStep] = useState(1);
  const [emailValue, setEmailValue] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const { toasts, push, dismiss } = useToasts();
  const reduce = useReducedMotion();

  const update = <K extends keyof CleaningPlan>(key: K, value: CleaningPlan[K]) =>
    setPlan({ ...plan, [key]: value });

  const updateHousehold = <K extends keyof CleaningPlan['household']>(
    key: K,
    value: CleaningPlan['household'][K],
  ) => setPlan({ ...plan, household: { ...plan.household, [key]: value } });

  const toggleRoom = (id: RoomId) =>
    setPlan({
      ...plan,
      rooms: plan.rooms.includes(id)
        ? plan.rooms.filter((room) => room !== id)
        : [...plan.rooms, id],
    });

  const togglePriority = (roomId: RoomId, priority: RoomPriorityId) => {
    const current = plan.priorities[roomId] ?? [];
    const next = current.includes(priority)
      ? current.filter((item) => item !== priority)
      : [...current, priority];
    setPlan({ ...plan, priorities: { ...plan.priorities, [roomId]: next } });
  };

  const toggleTask = (id: string) =>
    setPlan({
      ...plan,
      tasks: plan.tasks.includes(id)
        ? plan.tasks.filter((task) => task !== id)
        : [...plan.tasks, id],
    });

  const result = useMemo(() => estimate(planToEstimateInput(plan)), [plan]);
  const level = recommendLevel(plan);
  const levelMeta = cleaningLevels.find((item) => item.id === level)!;
  const roomMinutes = rooms
    .filter((room) => plan.rooms.includes(room.id))
    .reduce((sum, room) => sum + room.baseMinutes, 0);

  const canContinue = step !== 3 || plan.rooms.length > 0;

  const emailPlan = () => {
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailValue.trim());
    if (!valid) {
      setEmailError('Enter an email address in the format name@example.com.');
      return;
    }
    setEmailError('');
    setEmailSent(true);
    push('Plan queued for email', 'Delivery connects to the email provider at launch.');
  };

  if (!hydrated) {
    return (
      <div className="surface p-8">
        <div className="h-2 w-1/3 animate-pulse rounded-full bg-pearl" />
        <div className="mt-6 h-40 animate-pulse rounded-2xl bg-pearl/70" />
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:gap-10">
      <div>
        <ProgressBar value={step} total={steps.length} label={steps[step - 1]} />

        <nav aria-label="Plan builder steps" className="mt-5 flex flex-wrap gap-2">
          {steps.map((label, index) => {
            const number = index + 1;
            const state =
              number === step ? 'current' : number < step ? 'done' : 'upcoming';
            return (
              <button
                key={label}
                type="button"
                onClick={() => setStep(number)}
                aria-current={state === 'current' ? 'step' : undefined}
                className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  state === 'current'
                    ? 'border-accent bg-accent text-white'
                    : state === 'done'
                      ? 'border-sage bg-mint/40 text-ink'
                      : 'border-line bg-white text-muted hover:border-sage'
                }`}
              >
                <span className="mr-1 font-semibold">{number}</span>
                {label}
              </button>
            );
          })}
        </nav>

        <div className="mt-6 rounded-[2rem] border border-line bg-white p-6 shadow-soft sm:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={reduce ? false : { opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? undefined : { opacity: 0, x: -12 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              {step === 1 ? (
                <StepShell
                  title="What kind of home are we caring for?"
                  body="This sets the baseline for layout, access and how long a visit usually takes."
                >
                  <OptionCards
                    legend="Home type"
                    legendHidden
                    name="home-type"
                    columns={3}
                    value={plan.homeType}
                    onChange={(value) => update('homeType', value)}
                    options={homeTypes.map((type) => ({
                      id: type.id,
                      label: type.label,
                      hint: type.hint,
                    }))}
                  />
                </StepShell>
              ) : null}

              {step === 2 ? (
                <StepShell
                  title="How big is the space?"
                  body="Rough numbers are fine. We confirm details before the visit rather than surprising you afterwards."
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Counter
                      label="Bedrooms"
                      value={plan.bedrooms}
                      onChange={(value) => update('bedrooms', value)}
                      max={10}
                    />
                    <Counter
                      label="Bathrooms"
                      value={plan.bathrooms}
                      onChange={(value) => update('bathrooms', value)}
                      max={10}
                    />
                    <Counter
                      label="Floors"
                      value={plan.floors}
                      onChange={(value) => update('floors', value)}
                      min={1}
                      max={5}
                    />
                    <Field label="Approximate square footage" htmlFor="sqft">
                      <TextInput
                        id="sqft"
                        type="number"
                        inputMode="numeric"
                        min={200}
                        max={8000}
                        step={50}
                        value={plan.squareFeet}
                        onChange={(event) =>
                          update('squareFeet', Number(event.target.value) || 0)
                        }
                      />
                    </Field>
                  </div>

                  <div className="mt-6">
                    <input
                      type="range"
                      min={300}
                      max={5000}
                      step={50}
                      value={plan.squareFeet}
                      aria-label="Approximate square footage slider"
                      onChange={(event) => update('squareFeet', Number(event.target.value))}
                      className="w-full"
                    />
                    <div className="mt-1 flex justify-between text-xs text-muted">
                      <span>300 sq ft</span>
                      <span>{plan.squareFeet.toLocaleString('en-US')} sq ft</span>
                      <span>5,000 sq ft</span>
                    </div>
                  </div>

                  <div className="mt-8">
                    <OptionCards
                      legend="Is the home occupied or empty?"
                      name="occupancy"
                      value={plan.occupancy}
                      onChange={(value) => update('occupancy', value)}
                      options={[
                        { id: 'occupied', label: 'Occupied', hint: 'Furnished and lived in' },
                        { id: 'empty', label: 'Empty', hint: 'No furniture or belongings' },
                      ]}
                    />
                  </div>

                  <div className="mt-8">
                    <OptionCards
                      legend="How would you describe the current condition?"
                      name="condition"
                      columns={2}
                      value={plan.condition}
                      onChange={(value) => update('condition', value)}
                      options={conditions.map((condition) => ({
                        id: condition.id,
                        label: condition.label,
                        hint: condition.hint,
                      }))}
                    />
                  </div>
                </StepShell>
              ) : null}

              {step === 3 ? (
                <StepShell
                  title="Which rooms should we include?"
                  body="Tap a room to add or remove it. This is an illustration — the plan follows your real layout."
                >
                  <RoomSelector selected={plan.rooms} onToggle={toggleRoom} />
                  {plan.rooms.length === 0 ? (
                    <div className="mt-5">
                      <ErrorMessage
                        title="Add at least one room"
                        body="A plan needs somewhere to start. Choose the room that matters most and we can build outward from there."
                      />
                    </div>
                  ) : null}
                </StepShell>
              ) : null}

              {step === 4 ? (
                <StepShell
                  title="How should each room be handled?"
                  body="Optional. Anything left unset gets our standard reset for that room."
                >
                  {plan.rooms.length === 0 ? (
                    <EmptyState
                      title="No rooms selected yet"
                      body="Go back a step and choose the rooms you would like included, then set priorities here."
                      action={
                        <Button onClick={() => setStep(3)} variant="secondary">
                          Choose rooms
                        </Button>
                      }
                    />
                  ) : (
                    <div className="space-y-4">
                      {rooms
                        .filter((room) => plan.rooms.includes(room.id))
                        .map((room) => (
                          <fieldset
                            key={room.id}
                            className="rounded-2xl border border-line bg-pearl/35 p-5"
                          >
                            <legend className="px-1 text-[15px] font-medium text-ink">
                              {room.label}
                            </legend>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {roomPriorities.map((priority) => {
                                const active = (plan.priorities[room.id] ?? []).includes(
                                  priority.id,
                                );
                                return (
                                  <label
                                    key={priority.id}
                                    className={`cursor-pointer rounded-full border px-3.5 py-2 text-sm transition-all duration-300 ${
                                      active
                                        ? 'border-accent bg-accent text-white'
                                        : 'border-line bg-white text-ink hover:border-sage'
                                    }`}
                                    title={priority.hint}
                                  >
                                    <input
                                      type="checkbox"
                                      className="sr-only"
                                      checked={active}
                                      onChange={() => togglePriority(room.id, priority.id)}
                                    />
                                    {priority.label}
                                  </label>
                                );
                              })}
                            </div>
                          </fieldset>
                        ))}
                    </div>
                  )}
                </StepShell>
              ) : null}

              {step === 5 ? (
                <StepShell
                  title="Any special tasks this visit?"
                  body="Each one is priced separately and appears as its own line on your estimate."
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    {addOns.map((addOn) => (
                      <ToggleChip
                        key={addOn.id}
                        checked={plan.tasks.includes(addOn.id)}
                        onChange={() => toggleTask(addOn.id)}
                        label={addOn.label}
                        hint={addOn.description}
                        price={`${currency(addOn.price)} · ${addOn.minutes}m`}
                        icon={<Icon name={addOn.icon} size={18} />}
                      />
                    ))}
                  </div>
                </StepShell>
              ) : null}

              {step === 6 ? (
                <StepShell
                  title="Tell us about the household."
                  body="Saved once and applied to every visit. You can change any of it later from your home profile."
                >
                  <div className="space-y-4">
                    <ToggleChip
                      checked={plan.household.pets}
                      onChange={(next) => updateHousehold('pets', next)}
                      label="There are pets in the home"
                      hint="We adjust products, door discipline and hair-focused passes."
                      icon={<Icon name="pet" size={18} />}
                    />
                    {plan.household.pets ? (
                      <Counter
                        label="How many pets?"
                        value={plan.household.petCount}
                        onChange={(value) => updateHousehold('petCount', value)}
                        min={1}
                        max={8}
                      />
                    ) : null}

                    <ToggleChip
                      checked={plan.household.children}
                      onChange={(next) => updateHousehold('children', next)}
                      label="Children are present"
                      hint="Affects product choice and where equipment is left between rooms."
                      icon={<Icon name="users" size={18} />}
                    />

                    <ToggleChip
                      checked={plan.household.sensitivities}
                      onChange={(next) => updateHousehold('sensitivities', next)}
                      label="Someone has allergies or product sensitivities"
                      hint="We follow your list. We do not assess sensitivities or make health claims."
                      icon={<Icon name="leaf" size={18} />}
                    />
                    {plan.household.sensitivities ? (
                      <Field
                        label="Ingredients or products to avoid"
                        htmlFor="sensitivity-notes"
                        hint="For example: no bleach, no citrus fragrance, no ammonia."
                      >
                        <TextArea
                          id="sensitivity-notes"
                          value={plan.household.sensitivityNotes}
                          onChange={(event) =>
                            updateHousehold('sensitivityNotes', event.target.value)
                          }
                        />
                      </Field>
                    ) : null}

                    <ToggleChip
                      checked={plan.household.workingFromHome}
                      onChange={(next) => updateHousehold('workingFromHome', next)}
                      label="Someone works from home"
                      hint="We plan the vacuuming window and avoid closed office doors."
                      icon={<Icon name="document" size={18} />}
                    />

                    <ToggleChip
                      checked={plan.household.quietClean}
                      onChange={(next) => updateHousehold('quietClean', next)}
                      label="Quiet Clean preferred"
                      hint="No doorbell, text-only arrival, lower-noise equipment where possible."
                      icon={<Icon name="bellOff" size={18} />}
                    />

                    <Field
                      label="Rooms, drawers or areas we should not enter"
                      htmlFor="no-entry"
                      hint="These become Do Not Disturb Zones on your profile."
                    >
                      <TextArea
                        id="no-entry"
                        value={plan.household.noEntryNotes}
                        onChange={(event) => updateHousehold('noEntryNotes', event.target.value)}
                        placeholder="For example: the office desk, the top dresser drawer, the guest room closet."
                      />
                    </Field>

                    <Field label="Shoes inside the home" htmlFor="shoes">
                      <Select
                        id="shoes"
                        value={plan.household.shoeHandling}
                        onChange={(event) =>
                          updateHousehold(
                            'shoeHandling',
                            event.target.value as CleaningPlan['household']['shoeHandling'],
                          )
                        }
                      >
                        <option value="no-preference">No preference</option>
                        <option value="remove">Please remove shoes</option>
                        <option value="covers">Please use shoe covers</option>
                      </Select>
                    </Field>

                    <Field
                      label="Fragile or specialty surfaces"
                      htmlFor="fragile"
                      hint="Marble, unsealed wood, antiques, art, or anything that needs a specific product."
                    >
                      <TextInput
                        id="fragile"
                        value={plan.household.fragileSurfaces}
                        onChange={(event) =>
                          updateHousehold('fragileSurfaces', event.target.value)
                        }
                      />
                    </Field>

                    <Field
                      label="Entry instructions"
                      htmlFor="entry"
                      hint="Do not include alarm codes here — those are collected separately at booking, over an encrypted field."
                    >
                      <TextArea
                        id="entry"
                        value={plan.household.entryInstructions}
                        onChange={(event) =>
                          updateHousehold('entryInstructions', event.target.value)
                        }
                        placeholder="For example: side door, lockbox on the gate, parking in visitor spot 12."
                      />
                    </Field>

                    <Field label="Product preference" htmlFor="products">
                      <Select
                        id="products"
                        value={plan.household.productPreference}
                        onChange={(event) =>
                          updateHousehold(
                            'productPreference',
                            event.target.value as CleaningPlan['household']['productPreference'],
                          )
                        }
                      >
                        <option value="standard">Standard professional products</option>
                        <option value="eco">Eco-conscious products</option>
                        <option value="fragrance-free">Fragrance-free products</option>
                        <option value="customer-supplied">I will provide the products</option>
                      </Select>
                    </Field>
                  </div>
                </StepShell>
              ) : null}

              {step === 7 ? (
                <StepShell
                  title="How often should we come?"
                  body="Recurring visits are priced per visit, and the adjustment is shown on the estimate."
                >
                  <OptionCards
                    legend="Frequency"
                    legendHidden
                    name="frequency"
                    columns={2}
                    value={plan.frequency}
                    onChange={(value) => update('frequency', value)}
                    options={frequencies.map((frequency) => ({
                      id: frequency.id,
                      label: frequency.label,
                      hint: frequency.note,
                    }))}
                  />

                  <div className="mt-6">
                    <Field
                      label="Custom frequency or scheduling notes"
                      htmlFor="custom-frequency"
                      hint="Optional. For example: every three weeks, or only during term time."
                    >
                      <TextInput
                        id="custom-frequency"
                        value={plan.customFrequencyNote}
                        onChange={(event) => update('customFrequencyNote', event.target.value)}
                      />
                    </Field>
                  </div>

                  <div className="mt-8">
                    <p className="mb-3 text-sm font-medium text-ink">Preferred cleaning mode</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {cleaningModes.map((mode) => (
                        <label
                          key={mode.id}
                          className={`cursor-pointer rounded-2xl border p-4 transition-all duration-300 ${
                            plan.mode === mode.id
                              ? 'border-accent bg-mint/25 shadow-soft'
                              : 'border-line bg-white hover:border-sage'
                          }`}
                        >
                          <input
                            type="radio"
                            name="mode"
                            className="sr-only"
                            checked={plan.mode === mode.id}
                            onChange={() => update('mode', mode.id)}
                          />
                          <span className="block text-[15px] font-medium text-ink">
                            {mode.name}
                          </span>
                          <span className="mt-1 block text-sm text-muted">{mode.tagline}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </StepShell>
              ) : null}

              {step === 8 ? (
                <StepShell
                  title="Your plan"
                  body="Review it, save it, send it to yourself or take it straight to booking."
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <SummaryBlock title="Rooms included">
                      {plan.rooms.length ? (
                        <ul className="space-y-1.5">
                          {rooms
                            .filter((room) => plan.rooms.includes(room.id))
                            .map((room) => (
                              <li key={room.id} className="text-sm text-ink/85">
                                {room.label}
                                {plan.priorities[room.id]?.length ? (
                                  <span className="text-muted">
                                    {' '}
                                    ·{' '}
                                    {plan.priorities[room.id]!
                                      .map(
                                        (id) =>
                                          roomPriorities.find((p) => p.id === id)?.label ?? id,
                                      )
                                      .join(', ')}
                                  </span>
                                ) : null}
                              </li>
                            ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted">No rooms selected.</p>
                      )}
                    </SummaryBlock>

                    <SummaryBlock title="Special tasks">
                      {plan.tasks.length ? (
                        <ul className="space-y-1.5">
                          {addOns
                            .filter((addOn) => plan.tasks.includes(addOn.id))
                            .map((addOn) => (
                              <li key={addOn.id} className="flex justify-between text-sm">
                                <span className="text-ink/85">{addOn.label}</span>
                                <span className="text-muted">{currency(addOn.price)}</span>
                              </li>
                            ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted">None selected.</p>
                      )}
                    </SummaryBlock>

                    <SummaryBlock title="Recommended service">
                      <p className="font-display text-xl text-ink">{levelMeta.label}</p>
                      <p className="mt-1 text-sm text-muted">{levelMeta.blurb}</p>
                      <Button href={levelMeta.href} variant="quiet" className="mt-2">
                        Read what this covers →
                      </Button>
                    </SummaryBlock>

                    <SummaryBlock title="Visit shape">
                      <dl className="space-y-2 text-sm">
                        <Row label="Cleaning mode" value={recommendMode(plan)} />
                        <Row
                          label="Estimated duration"
                          value={formatDuration(result.minutes)}
                        />
                        <Row
                          label="Recommended team size"
                          value={`${result.teamSize} ${result.teamSize === 1 ? 'cleaner' : 'cleaners'}`}
                        />
                        <Row
                          label="Time per cleaner"
                          value={formatDuration(result.perCleanerMinutes)}
                        />
                        <Row label="Rooms time" value={formatDuration(roomMinutes)} />
                      </dl>
                    </SummaryBlock>
                  </div>

                  <div className="mt-6 rounded-2xl border border-line bg-luma-gradient p-6">
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <p className="eyebrow">Estimated price range</p>
                      <PlaceholderTag>Placeholder rate card</PlaceholderTag>
                    </div>
                    <p className="mt-2 font-display text-3xl text-ink">
                      {currency(result.low)} – {currency(result.high)}
                    </p>
                    <p className="mt-2 text-sm text-muted">
                      Based on {currency(result.total)} for this scope. The final amount
                      changes only if you change the scope, or if the property differs
                      substantially from what you entered here.
                    </p>
                    <Button href="/instant-estimate" variant="quiet" className="mt-2">
                      See the full line-by-line breakdown →
                    </Button>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <Button
                      onClick={() =>
                        push('Plan saved to this device', 'Create an account to sync it across devices.')
                      }
                      variant="secondary"
                    >
                      Save this plan
                    </Button>
                    <Button href="/booking">Continue to booking</Button>
                    <Button href="/customer-dashboard" variant="secondary">
                      Create an account
                    </Button>
                    <Button onClick={() => setStep(1)} variant="ghost">
                      Modify selections
                    </Button>
                  </div>

                  <div className="mt-6 rounded-2xl border border-line bg-white p-5">
                    <Field
                      label="Email this plan to yourself"
                      htmlFor="plan-email"
                      error={emailError}
                    >
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <TextInput
                          id="plan-email"
                          type="email"
                          autoComplete="email"
                          value={emailValue}
                          aria-invalid={Boolean(emailError)}
                          onChange={(event) => {
                            setEmailValue(event.target.value);
                            setEmailError('');
                          }}
                          placeholder="you@example.com"
                        />
                        <Button onClick={emailPlan} className="flex-none">
                          Email plan
                        </Button>
                      </div>
                    </Field>
                    {emailSent ? (
                      <div className="mt-3">
                        <SuccessNote
                          title="Plan queued"
                          body="Email delivery is wired to the provider at launch. Nothing has been sent yet."
                        />
                      </div>
                    ) : null}
                  </div>

                  <Note className="mt-6" title="Where this plan lives">
                    Saved plans are stored on this device until you create an account.
                    Nothing is transmitted anywhere from this page.
                  </Note>
                </StepShell>
              ) : null}
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-6">
            <Button
              variant="ghost"
              onClick={() => setStep((current) => Math.max(1, current - 1))}
              disabled={step === 1}
            >
              Back
            </Button>
            <p className="text-sm text-muted">
              Step {step} of {steps.length}
            </p>
            {step < steps.length ? (
              <Button
                onClick={() => setStep((current) => Math.min(steps.length, current + 1))}
                disabled={!canContinue}
              >
                Continue
              </Button>
            ) : (
              <Button href="/booking">Book this plan</Button>
            )}
          </div>
        </div>
      </div>

      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="rounded-[2rem] border border-line bg-white p-6 shadow-soft">
          <p className="eyebrow">Live summary</p>
          <p className="mt-2 font-display text-2xl text-ink">
            {currency(result.low)} – {currency(result.high)}
          </p>
          <p className="mt-1 text-sm text-muted">
            {formatDuration(result.minutes)} · {result.teamSize}-person team
          </p>

          <dl className="mt-6 space-y-2.5 border-t border-line pt-5 text-sm">
            <Row label="Service" value={levelMeta.label} />
            <Row label="Home" value={homeTypes.find((h) => h.id === plan.homeType)?.label ?? ''} />
            <Row label="Size" value={`${plan.squareFeet.toLocaleString('en-US')} sq ft`} />
            <Row label="Rooms" value={`${plan.rooms.length} selected`} />
            <Row label="Tasks" value={`${plan.tasks.length} added`} />
            <Row
              label="Frequency"
              value={frequencies.find((f) => f.id === plan.frequency)?.label ?? ''}
            />
            <Row label="Mode" value={recommendMode(plan)} />
          </dl>

          <Button href="/booking" className="mt-6 w-full">
            Continue to booking
          </Button>
          <p className="mt-3 text-xs text-muted">
            No account needed to see availability or an estimate.
          </p>
        </div>
      </aside>

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

function StepShell({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-2xl sm:text-[1.75rem]">{title}</h2>
      <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">{body}</p>
      <div className="mt-7">{children}</div>
    </div>
  );
}

function SummaryBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-pearl/40 p-5">
      <p className="eyebrow mb-3">{title}</p>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium text-ink">{value}</dd>
    </div>
  );
}
