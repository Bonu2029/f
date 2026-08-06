'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { Calendar, TimeSlotSelector, arrivalWindows } from './Calendar';
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
  AnimatedCheck,
  ErrorMessage,
  LoadingState,
  ProgressBar,
  SuccessNote,
} from '@/components/ui/States';
import { Note, PlaceholderTag } from '@/components/ui/Primitives';
import { rooms, type RoomId } from '@/lib/content/rooms';
import { cleaningModes } from '@/lib/content/general';
import {
  addOns,
  cleaningLevels,
  conditions,
  estimate,
  frequencies,
  homeTypes,
  type CleaningLevel,
} from '@/lib/pricing';
import { emptyPlan, planToEstimateInput, type CleaningPlan } from '@/lib/plan';
import { storageKeys, usePersistentState } from '@/lib/storage';
import { currency, formatDuration } from '@/lib/utils';
import { site } from '@/lib/site';

type Contact = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  unit: string;
  city: string;
  zip: string;
  entryMethod: 'home' | 'lockbox' | 'doorman' | 'key-on-file' | 'code';
  accessNotes: string;
  parking: string;
  contactPreference: 'text' | 'email' | 'call';
  photoPermission: boolean;
};

const emptyContact: Contact = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  unit: '',
  city: '',
  zip: '',
  entryMethod: 'home',
  accessNotes: '',
  parking: '',
  contactPreference: 'text',
  photoPermission: false,
};

const steps = [
  'Service',
  'Property',
  'Rooms & add-ons',
  'Preferences',
  'Date & window',
  'Your details',
  'Review',
  'Payment',
  'Confirmation',
];

export function BookingFlow() {
  const { value: plan, setValue: setPlan, hydrated } = usePersistentState<CleaningPlan>(
    storageKeys.plan,
    emptyPlan,
  );
  const [level, setLevel] = useState<CleaningLevel>('standard');
  const [step, setStep] = useState(1);
  const [date, setDate] = useState<string | null>(null);
  const [window, setWindow] = useState<string | null>(null);
  const [contact, setContact] = useState<Contact>(emptyContact);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [payment, setPayment] = useState<'deposit' | 'full'>('deposit');
  const [processing, setProcessing] = useState(false);
  const [confirmationId, setConfirmationId] = useState<string | null>(null);
  const reduce = useReducedMotion();

  const result = useMemo(
    () => estimate({ ...planToEstimateInput(plan), level }),
    [plan, level],
  );

  const deposit = Math.round(result.total * 0.25);

  const updateContact = <K extends keyof Contact>(key: K, value: Contact[K]) => {
    setContact((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: '' }));
  };

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

  const validateStep = (current: number) => {
    const next: Record<string, string> = {};
    if (current === 3 && plan.rooms.length === 0) {
      next.rooms = 'Choose at least one room so we know where to start.';
    }
    if (current === 5) {
      if (!date) next.date = 'Choose a date for the visit.';
      if (!window) next.window = 'Choose an arrival window.';
    }
    if (current === 6) {
      if (!contact.firstName.trim()) next.firstName = 'Enter your first name.';
      if (!contact.lastName.trim()) next.lastName = 'Enter your last name.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contact.email.trim()))
        next.email = 'Enter an email address in the format name@example.com.';
      if (contact.phone.replace(/\D/g, '').length < 10)
        next.phone = 'Enter a phone number with at least 10 digits.';
      if (!contact.address.trim()) next.address = 'Enter the service address.';
      if (!/^\d{5}$/.test(contact.zip.trim())) next.zip = 'Enter a five-digit ZIP code.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setStep((current) => Math.min(steps.length, current + 1));
    if (typeof globalThis.scrollTo === 'function') {
      globalThis.scrollTo({ top: 220, behavior: 'smooth' });
    }
  };

  const confirmBooking = async () => {
    setProcessing(true);
    // The payment provider is intentionally not wired up yet; this simulates the
    // round trip so the confirmation state can be designed and reviewed.
    await new Promise((resolve) => setTimeout(resolve, 1100));
    setConfirmationId(`LN-${Math.floor(100000 + Math.random() * 899999)}`);
    setProcessing(false);
    setStep(9);
  };

  if (!hydrated) {
    return (
      <div className="surface p-8">
        <LoadingState label="Loading your saved plan" />
      </div>
    );
  }

  const selectedWindow = arrivalWindows.find((item) => item.id === window);
  const selectedRooms = rooms.filter((room) => plan.rooms.includes(room.id));
  const selectedAddOns = addOns.filter((addOn) => plan.tasks.includes(addOn.id));

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:gap-10">
      <div>
        <ProgressBar value={step} total={steps.length} label={steps[step - 1]} />

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
                <Step title="Choose your service" body="You can change this later without losing anything you have entered.">
                  <OptionCards
                    legend="Service"
                    legendHidden
                    name="booking-service"
                    columns={2}
                    value={level}
                    onChange={setLevel}
                    options={cleaningLevels.map((item) => ({
                      id: item.id,
                      label: item.label,
                      hint: item.blurb,
                    }))}
                  />
                  <Note className="mt-6">
                    Not sure yet? <a className="link-underline" href="/clean-match">CleanMatch</a>{' '}
                    recommends a service in about two minutes, and your answers carry
                    into this flow.
                  </Note>
                </Step>
              ) : null}

              {step === 2 ? (
                <Step title="Tell us about the property" body="Approximate numbers are fine — we confirm details before the visit.">
                  <OptionCards
                    legend="Property type"
                    name="booking-home-type"
                    columns={3}
                    size="sm"
                    value={plan.homeType}
                    onChange={(value) => setPlan({ ...plan, homeType: value })}
                    options={homeTypes.map((type) => ({ id: type.id, label: type.label }))}
                  />

                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    <Counter
                      label="Bedrooms"
                      value={plan.bedrooms}
                      onChange={(value) => setPlan({ ...plan, bedrooms: value })}
                      max={10}
                    />
                    <Counter
                      label="Bathrooms"
                      value={plan.bathrooms}
                      onChange={(value) => setPlan({ ...plan, bathrooms: value })}
                      max={10}
                    />
                    <Counter
                      label="Floors"
                      value={plan.floors}
                      onChange={(value) => setPlan({ ...plan, floors: value })}
                      min={1}
                      max={5}
                    />
                  </div>

                  <div className="mt-6 grid gap-6 sm:grid-cols-2">
                    <Field label="Approximate square footage" htmlFor="booking-sqft">
                      <TextInput
                        id="booking-sqft"
                        type="number"
                        min={200}
                        max={8000}
                        step={50}
                        value={plan.squareFeet}
                        onChange={(event) =>
                          setPlan({ ...plan, squareFeet: Number(event.target.value) || 0 })
                        }
                      />
                    </Field>
                    <Field label="Current condition" htmlFor="booking-condition">
                      <Select
                        id="booking-condition"
                        value={plan.condition}
                        onChange={(event) =>
                          setPlan({
                            ...plan,
                            condition: event.target.value as CleaningPlan['condition'],
                          })
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
                      legend="Occupied or empty?"
                      name="booking-occupancy"
                      size="sm"
                      value={plan.occupancy}
                      onChange={(value) => setPlan({ ...plan, occupancy: value })}
                      options={[
                        { id: 'occupied', label: 'Occupied' },
                        { id: 'empty', label: 'Empty' },
                      ]}
                    />
                  </div>
                </Step>
              ) : null}

              {step === 3 ? (
                <Step title="Choose rooms and add-ons" body="Your saved plan is pre-loaded. Adjust anything that has changed.">
                  <RoomSelector selected={plan.rooms} onToggle={toggleRoom} />
                  {errors.rooms ? (
                    <div className="mt-4">
                      <ErrorMessage title="One room, at least" body={errors.rooms} />
                    </div>
                  ) : null}

                  <p className="eyebrow mt-8">Add-ons</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {addOns.map((addOn) => (
                      <ToggleChip
                        key={addOn.id}
                        checked={plan.tasks.includes(addOn.id)}
                        onChange={(next) =>
                          setPlan({
                            ...plan,
                            tasks: next
                              ? [...plan.tasks, addOn.id]
                              : plan.tasks.filter((id) => id !== addOn.id),
                          })
                        }
                        label={addOn.label}
                        price={currency(addOn.price)}
                        icon={<Icon name={addOn.icon} size={18} />}
                      />
                    ))}
                  </div>
                </Step>
              ) : null}

              {step === 4 ? (
                <Step title="Household preferences" body="These become part of your profile, so you will not be asked again next time.">
                  <div className="space-y-4">
                    <ToggleChip
                      checked={plan.household.pets}
                      onChange={(next) => updateHousehold('pets', next)}
                      label="There are pets in the home"
                      icon={<Icon name="pet" size={18} />}
                    />
                    <ToggleChip
                      checked={plan.household.children}
                      onChange={(next) => updateHousehold('children', next)}
                      label="Children are present"
                      icon={<Icon name="users" size={18} />}
                    />
                    <ToggleChip
                      checked={plan.household.quietClean}
                      onChange={(next) => updateHousehold('quietClean', next)}
                      label="Quiet Clean — no doorbell, text-only arrival"
                      icon={<Icon name="bellOff" size={18} />}
                    />

                    <Field label="Product preference" htmlFor="booking-products">
                      <Select
                        id="booking-products"
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

                    <Field
                      label="Do Not Disturb Zones"
                      htmlFor="booking-no-entry"
                      hint="Rooms, drawers, desks or cabinets the team should not open, move or enter."
                    >
                      <TextArea
                        id="booking-no-entry"
                        value={plan.household.noEntryNotes}
                        onChange={(event) => updateHousehold('noEntryNotes', event.target.value)}
                      />
                    </Field>

                    <Field label="Cleaning mode" htmlFor="booking-mode">
                      <Select
                        id="booking-mode"
                        value={plan.mode}
                        onChange={(event) => setPlan({ ...plan, mode: event.target.value })}
                      >
                        {cleaningModes.map((mode) => (
                          <option key={mode.id} value={mode.id}>
                            {mode.name} — {mode.tagline}
                          </option>
                        ))}
                      </Select>
                    </Field>

                    <Field label="Frequency" htmlFor="booking-frequency">
                      <Select
                        id="booking-frequency"
                        value={plan.frequency}
                        onChange={(event) =>
                          setPlan({
                            ...plan,
                            frequency: event.target.value as CleaningPlan['frequency'],
                          })
                        }
                      >
                        {frequencies.map((frequency) => (
                          <option key={frequency.id} value={frequency.id}>
                            {frequency.label}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                </Step>
              ) : null}

              {step === 5 ? (
                <Step title="Choose a date and arrival window" body="We hold a window rather than a single time, and message you when the team is on the way.">
                  <div className="grid gap-6 lg:grid-cols-2">
                    <div>
                      <Calendar value={date} onChange={setDate} />
                      {errors.date ? (
                        <p className="mt-2 text-sm text-accent-deep">{errors.date}</p>
                      ) : null}
                    </div>
                    <div>
                      <TimeSlotSelector value={window} onChange={setWindow} />
                      {errors.window ? (
                        <p className="mt-2 text-sm text-accent-deep">{errors.window}</p>
                      ) : null}
                      {date && window ? (
                        <div className="mt-5">
                          <SuccessNote
                            title="Window selected"
                            body={`${new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
                              weekday: 'long',
                              month: 'long',
                              day: 'numeric',
                            })} · ${selectedWindow?.detail}`}
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </Step>
              ) : null}

              {step === 6 ? (
                <Step title="Your details and home access" body="Only what we need to arrive, get in and reach you if something changes.">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="First name" htmlFor="first-name" required error={errors.firstName}>
                      <TextInput
                        id="first-name"
                        autoComplete="given-name"
                        value={contact.firstName}
                        aria-invalid={Boolean(errors.firstName)}
                        onChange={(event) => updateContact('firstName', event.target.value)}
                      />
                    </Field>
                    <Field label="Last name" htmlFor="last-name" required error={errors.lastName}>
                      <TextInput
                        id="last-name"
                        autoComplete="family-name"
                        value={contact.lastName}
                        aria-invalid={Boolean(errors.lastName)}
                        onChange={(event) => updateContact('lastName', event.target.value)}
                      />
                    </Field>
                    <Field label="Email" htmlFor="email" required error={errors.email}>
                      <TextInput
                        id="email"
                        type="email"
                        autoComplete="email"
                        value={contact.email}
                        aria-invalid={Boolean(errors.email)}
                        onChange={(event) => updateContact('email', event.target.value)}
                      />
                    </Field>
                    <Field label="Phone" htmlFor="phone" required error={errors.phone}>
                      <TextInput
                        id="phone"
                        type="tel"
                        autoComplete="tel"
                        value={contact.phone}
                        aria-invalid={Boolean(errors.phone)}
                        onChange={(event) => updateContact('phone', event.target.value)}
                      />
                    </Field>
                    <Field
                      label="Service address"
                      htmlFor="address"
                      required
                      error={errors.address}
                      className="sm:col-span-2"
                    >
                      <TextInput
                        id="address"
                        autoComplete="street-address"
                        value={contact.address}
                        aria-invalid={Boolean(errors.address)}
                        onChange={(event) => updateContact('address', event.target.value)}
                      />
                    </Field>
                    <Field label="Unit or apartment" htmlFor="unit">
                      <TextInput
                        id="unit"
                        value={contact.unit}
                        onChange={(event) => updateContact('unit', event.target.value)}
                      />
                    </Field>
                    <Field label="City" htmlFor="city">
                      <TextInput
                        id="city"
                        autoComplete="address-level2"
                        value={contact.city}
                        onChange={(event) => updateContact('city', event.target.value)}
                      />
                    </Field>
                    <Field label="ZIP code" htmlFor="zip" required error={errors.zip}>
                      <TextInput
                        id="zip"
                        inputMode="numeric"
                        maxLength={5}
                        autoComplete="postal-code"
                        value={contact.zip}
                        aria-invalid={Boolean(errors.zip)}
                        onChange={(event) =>
                          updateContact('zip', event.target.value.replace(/\D/g, ''))
                        }
                      />
                    </Field>
                    <Field label="How should we reach you?" htmlFor="contact-pref">
                      <Select
                        id="contact-pref"
                        value={contact.contactPreference}
                        onChange={(event) =>
                          updateContact(
                            'contactPreference',
                            event.target.value as Contact['contactPreference'],
                          )
                        }
                      >
                        <option value="text">Text message</option>
                        <option value="email">Email</option>
                        <option value="call">Phone call</option>
                      </Select>
                    </Field>
                  </div>

                  <div className="mt-6 grid gap-4">
                    <Field label="How will we get in?" htmlFor="entry-method">
                      <Select
                        id="entry-method"
                        value={contact.entryMethod}
                        onChange={(event) =>
                          updateContact('entryMethod', event.target.value as Contact['entryMethod'])
                        }
                      >
                        <option value="home">Someone will be home</option>
                        <option value="lockbox">Lockbox</option>
                        <option value="doorman">Front desk or doorman</option>
                        <option value="key-on-file">Key on file</option>
                        <option value="code">Keypad code</option>
                      </Select>
                    </Field>

                    <Field
                      label="Access notes"
                      htmlFor="access-notes"
                      hint="Please do not type alarm codes or lockbox codes here. After booking we collect those through a separate secure field."
                    >
                      <TextArea
                        id="access-notes"
                        value={contact.accessNotes}
                        onChange={(event) => updateContact('accessNotes', event.target.value)}
                        placeholder="Side gate, second door on the left, dog gate at the stairs."
                      />
                    </Field>

                    <Field label="Parking" htmlFor="parking">
                      <TextInput
                        id="parking"
                        value={contact.parking}
                        onChange={(event) => updateContact('parking', event.target.value)}
                        placeholder="Visitor spot 12, or street parking on the north side."
                      />
                    </Field>

                    <ToggleChip
                      checked={contact.photoPermission}
                      onChange={(next) => updateContact('photoPermission', next)}
                      label="Allow completion photos in my cleaning report"
                      hint="Off by default. You can withdraw permission at any time, and we never publish customer photos without separate written consent."
                      icon={<Icon name="camera" size={18} />}
                    />
                  </div>
                </Step>
              ) : null}

              {step === 7 ? (
                <Step title="Review your booking" body="Everything below is what we will act on. Change anything before you continue.">
                  <div className="space-y-4">
                    <ReviewRow label="Service" value={cleaningLevels.find((l) => l.id === level)!.label} onEdit={() => setStep(1)} />
                    <ReviewRow
                      label="Property"
                      value={`${homeTypes.find((h) => h.id === plan.homeType)?.label} · ${plan.bedrooms} bed · ${plan.bathrooms} bath · ${plan.squareFeet.toLocaleString('en-US')} sq ft`}
                      onEdit={() => setStep(2)}
                    />
                    <ReviewRow
                      label="Rooms"
                      value={selectedRooms.map((room) => room.label).join(', ') || 'None selected'}
                      onEdit={() => setStep(3)}
                    />
                    <ReviewRow
                      label="Add-ons"
                      value={
                        selectedAddOns.length
                          ? selectedAddOns.map((addOn) => addOn.label).join(', ')
                          : 'None'
                      }
                      onEdit={() => setStep(3)}
                    />
                    <ReviewRow
                      label="Preferences"
                      value={`${cleaningModes.find((m) => m.id === plan.mode)?.name ?? 'Everyday Reset'} · ${plan.household.productPreference.replace('-', ' ')} products${plan.household.quietClean ? ' · Quiet Clean' : ''}`}
                      onEdit={() => setStep(4)}
                    />
                    <ReviewRow
                      label="Date and window"
                      value={
                        date && selectedWindow
                          ? `${new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
                              weekday: 'long',
                              month: 'long',
                              day: 'numeric',
                            })} · ${selectedWindow.detail}`
                          : 'Not selected'
                      }
                      onEdit={() => setStep(5)}
                    />
                    <ReviewRow
                      label="Contact"
                      value={`${contact.firstName} ${contact.lastName} · ${contact.email}`}
                      onEdit={() => setStep(6)}
                    />
                    <ReviewRow
                      label="Address"
                      value={
                        contact.address
                          ? `${contact.address}${contact.unit ? `, ${contact.unit}` : ''} ${contact.zip}`
                          : 'Not entered'
                      }
                      onEdit={() => setStep(6)}
                    />
                  </div>

                  <div className="mt-6 rounded-2xl border border-line bg-luma-gradient p-6">
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <p className="eyebrow">Price breakdown</p>
                      <PlaceholderTag>Placeholder rate card</PlaceholderTag>
                    </div>
                    <dl className="mt-4 space-y-2 text-sm">
                      {result.lines.map((line) => (
                        <div key={`${line.label}-${line.detail ?? ''}`} className="flex justify-between gap-4">
                          <dt className="text-muted">{line.label}</dt>
                          <dd className="font-medium text-ink">
                            {line.amount < 0
                              ? `−${currency(Math.abs(line.amount))}`
                              : currency(line.amount)}
                          </dd>
                        </div>
                      ))}
                      {result.frequencyAdjustment !== 0 ? (
                        <div className="flex justify-between gap-4">
                          <dt className="text-muted">Frequency adjustment</dt>
                          <dd className="font-medium text-ink">
                            −{currency(Math.abs(result.frequencyAdjustment))}
                          </dd>
                        </div>
                      ) : null}
                      <div className="flex justify-between gap-4 border-t border-line pt-3">
                        <dt className="font-medium text-ink">Estimated total</dt>
                        <dd className="font-display text-xl text-ink">{currency(result.total)}</dd>
                      </div>
                    </dl>
                  </div>
                </Step>
              ) : null}

              {step === 8 ? (
                <Step title="Payment" body="Choose how you would like to pay. Nothing is charged in this preview build.">
                  <OptionCards
                    legend="Payment option"
                    name="payment"
                    value={payment}
                    onChange={setPayment}
                    options={[
                      {
                        id: 'deposit',
                        label: `Pay a ${currency(deposit)} deposit now`,
                        hint: 'The balance is charged after the visit is completed.',
                      },
                      {
                        id: 'full',
                        label: `Pay ${currency(result.total)} in full`,
                        hint: 'Adjusted afterwards only if the scope changes.',
                      },
                    ]}
                  />

                  <Note className="mt-6" title="Payment is not connected yet">
                    This build does not collect card details. At launch, payment runs
                    through a PCI-compliant provider in a hosted field, so card data
                    never touches LumaNest servers or this page. No API keys are held
                    in front-end code.
                  </Note>

                  <div className="mt-6">
                    {processing ? (
                      <LoadingState label="Confirming your appointment" />
                    ) : (
                      <Button size="lg" onClick={confirmBooking}>
                        Confirm booking
                      </Button>
                    )}
                  </div>
                </Step>
              ) : null}

              {step === 9 && confirmationId ? (
                <Confirmation
                  confirmationId={confirmationId}
                  level={level}
                  plan={plan}
                  date={date}
                  windowLabel={selectedWindow?.detail ?? ''}
                  contact={contact}
                  total={result.total}
                  paid={payment === 'full' ? result.total : deposit}
                  payment={payment}
                  minutes={result.minutes}
                />
              ) : null}
            </motion.div>
          </AnimatePresence>

          {step < 8 ? (
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
              <Button onClick={goNext}>Continue</Button>
            </div>
          ) : null}
        </div>
      </div>

      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="rounded-[2rem] border border-line bg-white p-6 shadow-soft">
          <p className="eyebrow">Booking summary</p>
          <p className="mt-2 font-display text-2xl text-ink">{currency(result.total)}</p>
          <p className="mt-1 text-sm text-muted">
            {formatDuration(result.minutes)} · {result.teamSize}-person team
          </p>

          <dl className="mt-6 space-y-2.5 border-t border-line pt-5 text-sm">
            <SummaryRow label="Service" value={cleaningLevels.find((l) => l.id === level)!.label} />
            <SummaryRow label="Rooms" value={`${plan.rooms.length} selected`} />
            <SummaryRow label="Add-ons" value={`${plan.tasks.length} added`} />
            <SummaryRow
              label="Date"
              value={
                date
                  ? new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })
                  : 'Not set'
              }
            />
            <SummaryRow label="Window" value={selectedWindow?.label ?? 'Not set'} />
            <SummaryRow label="Deposit" value={currency(deposit)} />
          </dl>

          <p className="mt-5 text-xs leading-relaxed text-muted">
            You can see availability and pricing without an account. An account is
            only needed to manage recurring visits or save preferences across devices.
          </p>
        </div>
      </aside>
    </div>
  );
}

function Step({
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

function ReviewRow({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: string;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-line bg-pearl/35 p-4">
      <div className="min-w-0">
        <p className="text-sm text-muted">{label}</p>
        <p className="mt-0.5 text-[15px] text-ink">{value}</p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="flex-none text-sm text-accent underline-offset-4 hover:underline"
      >
        Edit
      </button>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium text-ink">{value}</dd>
    </div>
  );
}

function Confirmation({
  confirmationId,
  level,
  plan,
  date,
  windowLabel,
  contact,
  total,
  paid,
  payment,
  minutes,
}: {
  confirmationId: string;
  level: CleaningLevel;
  plan: CleaningPlan;
  date: string | null;
  windowLabel: string;
  contact: Contact;
  total: number;
  paid: number;
  payment: 'deposit' | 'full';
  minutes: number;
}) {
  const serviceName = cleaningLevels.find((item) => item.id === level)!.label;
  const readableDate = date
    ? new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'To be scheduled';

  const icsHref = useMemo(() => {
    if (!date) return null;
    const start = `${date.replace(/-/g, '')}T140000`;
    const end = `${date.replace(/-/g, '')}T170000`;
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//LumaNest//Booking//EN',
      'BEGIN:VEVENT',
      `UID:${confirmationId}@lumanest`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:LumaNest ${serviceName}`,
      `DESCRIPTION:Confirmation ${confirmationId}. Arrival window: ${windowLabel}.`,
      `LOCATION:${contact.address} ${contact.unit} ${contact.city} ${contact.zip}`.trim(),
      'END:VEVENT',
      'END:VCALENDAR',
    ];
    return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join('\r\n'))}`;
  }, [confirmationId, contact, date, serviceName, windowLabel]);

  return (
    <div>
      <div className="flex items-center gap-3">
        <AnimatedCheck size={40} />
        <div>
          <p className="eyebrow">Booking confirmed</p>
          <h2 className="text-2xl sm:text-3xl">You are on the schedule.</h2>
        </div>
      </div>

      <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted">
        Confirmation <span className="font-medium text-ink">{confirmationId}</span>. A
        written confirmation goes to {contact.email || 'your email address'} once the
        email provider is connected. Nothing has been charged in this preview build.
      </p>

      <dl className="mt-8 grid gap-4 sm:grid-cols-2">
        <ConfirmBlock label="Service">{serviceName}</ConfirmBlock>
        <ConfirmBlock label="Appointment date">{readableDate}</ConfirmBlock>
        <ConfirmBlock label="Arrival window">{windowLabel || 'To be confirmed'}</ConfirmBlock>
        <ConfirmBlock label="Address">
          {contact.address
            ? `${contact.address}${contact.unit ? `, ${contact.unit}` : ''}${contact.city ? `, ${contact.city}` : ''} ${contact.zip}`
            : 'To be confirmed'}
        </ConfirmBlock>
        <ConfirmBlock label="Cleaning plan">
          {plan.rooms.length} rooms · {formatDuration(minutes)} on site
        </ConfirmBlock>
        <ConfirmBlock label="Add-ons">
          {plan.tasks.length
            ? addOns
                .filter((addOn) => plan.tasks.includes(addOn.id))
                .map((addOn) => addOn.label)
                .join(', ')
            : 'None'}
        </ConfirmBlock>
        <ConfirmBlock label="Payment status">
          {payment === 'full'
            ? `${currency(paid)} to be charged in full at launch`
            : `${currency(paid)} deposit, ${currency(total - paid)} after the visit`}
        </ConfirmBlock>
        <ConfirmBlock label="Photo permission">
          {contact.photoPermission ? 'Completion photos allowed' : 'No photos will be taken'}
        </ConfirmBlock>
      </dl>

      <div className="mt-8 rounded-2xl border border-line bg-pearl/40 p-6">
        <p className="font-display text-xl text-ink">Before we arrive</p>
        <ul className="mt-4 space-y-2.5 text-[15px] text-ink/85">
          {[
            'Clear counters and surfaces you would like cleaned underneath.',
            'Secure valuables, medications and personal documents.',
            'Let us know where pets will be during the visit.',
            'Confirm your Do Not Disturb Zones in your home profile.',
            'Make sure parking and entry details are still accurate.',
          ].map((item) => (
            <li key={item} className="flex gap-2.5">
              <Icon name="check" size={15} className="mt-1 flex-none text-accent" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        {icsHref ? (
          <a
            href={icsHref}
            download={`lumanest-${confirmationId}.ics`}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-[15px] font-medium text-white shadow-soft transition-all hover:bg-accent-deep"
          >
            <Icon name="calendar" size={17} />
            Add to calendar
          </a>
        ) : null}
        <Button href="/customer-dashboard" variant="secondary">
          Go to my dashboard
        </Button>
        <Button href="/contact" variant="ghost">
          Contact support
        </Button>
      </div>

      <p className="mt-6 text-sm text-muted">
        Questions before the visit? Call{' '}
        <a href={site.phoneHref} className="link-underline">
          {site.phone}
        </a>{' '}
        (placeholder number) or write to{' '}
        <a href={`mailto:${site.supportEmail}`} className="link-underline">
          {site.supportEmail}
        </a>
        .
      </p>
    </div>
  );
}

function ConfirmBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 text-[15px] font-medium text-ink">{children}</dd>
    </div>
  );
}
