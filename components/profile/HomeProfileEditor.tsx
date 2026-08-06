'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Counter, Field, OptionCards, Select, TextArea, TextInput, ToggleChip } from '@/components/ui/Form';
import { EmptyState, SuccessNote, ToastStack, useToasts } from '@/components/ui/States';
import { Badge, Note } from '@/components/ui/Primitives';
import { rooms, type RoomId } from '@/lib/content/rooms';
import { storageKeys, usePersistentState } from '@/lib/storage';
import { cn } from '@/lib/utils';

type Pet = {
  id: string;
  type: string;
  name: string;
  temperament: 'friendly' | 'nervous' | 'territorial';
  escapeRisk: boolean;
  safeRoom: string;
  productRestrictions: string;
  notes: string;
};

type HomeProfile = {
  nickname: string;
  layoutNotes: string;
  roomList: RoomId[];
  surfaces: string[];
  flooring: string[];
  applianceNotes: string;
  pets: Pet[];
  sensitivities: string;
  productPreference: 'standard' | 'eco' | 'fragrance-free' | 'customer-supplied';
  avoidIngredients: string;
  entryMethod: string;
  parking: string;
  alarmProcess: string;
  doNotDisturbRooms: RoomId[];
  doNotDisturbItems: string;
  priorityZones: RoomId[];
  fragileItems: string;
  communication: 'text' | 'email' | 'dashboard' | 'call';
  quietClean: boolean;
  photoPermission: boolean;
  cleanerPreference: string;
  bedrooms: number;
  bathrooms: number;
};

const emptyProfile: HomeProfile = {
  nickname: 'My home',
  layoutNotes: '',
  roomList: ['kitchen', 'bathroom', 'bedroom', 'living', 'entry'],
  surfaces: [],
  flooring: [],
  applianceNotes: '',
  pets: [],
  sensitivities: '',
  productPreference: 'standard',
  avoidIngredients: '',
  entryMethod: '',
  parking: '',
  alarmProcess: '',
  doNotDisturbRooms: [],
  doNotDisturbItems: '',
  priorityZones: [],
  fragileItems: '',
  communication: 'text',
  quietClean: false,
  photoPermission: false,
  cleanerPreference: '',
  bedrooms: 2,
  bathrooms: 2,
};

const surfaceOptions = [
  'Granite',
  'Quartz',
  'Marble',
  'Butcher block',
  'Stainless steel',
  'Painted wood',
  'Glass',
  'Tile',
  'Laminate',
];

const flooringOptions = [
  'Hardwood',
  'Engineered wood',
  'Luxury vinyl',
  'Tile',
  'Natural stone',
  'Carpet',
  'Area rugs',
  'Concrete',
];

const sections = [
  { id: 'layout', label: 'Home layout', icon: 'home' },
  { id: 'surfaces', label: 'Surfaces & flooring', icon: 'droplet' },
  { id: 'pets', label: 'Pet profile', icon: 'pet' },
  { id: 'products', label: 'Product preferences', icon: 'leaf' },
  { id: 'access', label: 'Access & parking', icon: 'key' },
  { id: 'zones', label: 'Zones', icon: 'lock' },
  { id: 'preferences', label: 'Communication', icon: 'chat' },
  { id: 'reset-score', label: 'Home Reset Score', icon: 'refresh' },
] as const;

export function HomeProfileEditor() {
  const { value: profile, setValue: setProfile, hydrated } = usePersistentState<HomeProfile>(
    storageKeys.profile,
    emptyProfile,
  );
  const [active, setActive] = useState<(typeof sections)[number]['id']>('layout');
  const { toasts, push, dismiss } = useToasts();
  const reduce = useReducedMotion();

  const set = <K extends keyof HomeProfile>(key: K, value: HomeProfile[K]) =>
    setProfile({ ...profile, [key]: value });

  const toggleInList = <T,>(list: T[], item: T) =>
    list.includes(item) ? list.filter((entry) => entry !== item) : [...list, item];

  const togglePriority = (roomId: RoomId) => {
    const already = profile.priorityZones.includes(roomId);
    if (!already && profile.priorityZones.length >= 3) {
      push('Three zones is the limit', 'Remove one before adding another.');
      return;
    }
    set('priorityZones', toggleInList(profile.priorityZones, roomId));
  };

  if (!hydrated) {
    return <div className="surface h-64 animate-pulse bg-pearl/50" />;
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[240px_1fr] lg:gap-10">
      {/* min-w-0 keeps the horizontally scrolling chip row from widening the grid */}
      <nav aria-label="Profile sections" className="min-w-0 lg:sticky lg:top-28 lg:self-start">
        <ul className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
          {sections.map((section) => (
            <li key={section.id} className="flex-none lg:flex-auto">
              <button
                type="button"
                onClick={() => setActive(section.id)}
                aria-current={active === section.id ? 'true' : undefined}
                className={cn(
                  'flex w-full items-center gap-2.5 whitespace-nowrap rounded-2xl border px-4 py-3 text-left text-sm transition-all duration-300',
                  active === section.id
                    ? 'border-accent bg-mint/30 font-medium text-ink'
                    : 'border-line bg-white text-muted hover:border-sage hover:text-ink',
                )}
              >
                <Icon name={section.icon} size={17} className="text-accent" />
                {section.label}
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-6 hidden rounded-2xl border border-line bg-pearl/40 p-4 lg:block">
          <p className="text-sm font-medium text-ink">Saved locally</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            This profile stays on your device until you create an account. Nothing is
            transmitted from this page.
          </p>
        </div>
      </nav>

      <motion.div
        key={active}
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="min-w-0 rounded-[2rem] border border-line bg-white p-6 shadow-soft sm:p-8"
      >
        {active === 'layout' ? (
          <Panel title="Home layout" body="The shape of the home, described once.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                className="sm:col-span-2"
                label="Home nickname"
                htmlFor="nickname"
                hint="Helpful if you have more than one property."
              >
                <TextInput
                  id="nickname"
                  value={profile.nickname}
                  onChange={(event) => set('nickname', event.target.value)}
                />
              </Field>
              <Counter
                label="Bedrooms"
                value={profile.bedrooms}
                onChange={(value) => set('bedrooms', value)}
                max={10}
              />
              <Counter
                label="Bathrooms"
                value={profile.bathrooms}
                onChange={(value) => set('bathrooms', value)}
                max={10}
              />
            </div>

            <p className="eyebrow mt-8">Rooms in this home</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {rooms.map((room) => {
                const on = profile.roomList.includes(room.id);
                return (
                  <button
                    key={room.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => set('roomList', toggleInList(profile.roomList, room.id))}
                    className={cn(
                      'rounded-full border px-4 py-2 text-sm transition-all duration-300',
                      on
                        ? 'border-accent bg-accent text-white'
                        : 'border-line bg-white text-ink hover:border-sage',
                    )}
                  >
                    {room.label}
                  </button>
                );
              })}
            </div>

            <Field
              className="mt-8"
              label="Layout notes"
              htmlFor="layout-notes"
              hint="Anything that would take a new team member ten minutes to figure out."
            >
              <TextArea
                id="layout-notes"
                value={profile.layoutNotes}
                onChange={(event) => set('layoutNotes', event.target.value)}
                placeholder="Split level, laundry in the basement, half bath off the entry."
              />
            </Field>
          </Panel>
        ) : null}

        {active === 'surfaces' ? (
          <Panel title="Surfaces and flooring" body="Materials decide products. This is the section that prevents damage.">
            <p className="eyebrow">Counter and surface materials</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {surfaceOptions.map((surface) => (
                <Chip
                  key={surface}
                  label={surface}
                  active={profile.surfaces.includes(surface)}
                  onClick={() => set('surfaces', toggleInList(profile.surfaces, surface))}
                />
              ))}
            </div>

            <p className="eyebrow mt-8">Flooring types</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {flooringOptions.map((floor) => (
                <Chip
                  key={floor}
                  label={floor}
                  active={profile.flooring.includes(floor)}
                  onClick={() => set('flooring', toggleInList(profile.flooring, floor))}
                />
              ))}
            </div>

            <Field
              className="mt-8"
              label="Appliance notes"
              htmlFor="appliance-notes"
              hint="Anything with a quirk: a temperamental oven door, a fragile cooktop finish, a dishwasher that needs a specific cycle."
            >
              <TextArea
                id="appliance-notes"
                value={profile.applianceNotes}
                onChange={(event) => set('applianceNotes', event.target.value)}
              />
            </Field>

            <Field
              className="mt-4"
              label="Fragile items and specialty finishes"
              htmlFor="fragile-items"
            >
              <TextArea
                id="fragile-items"
                value={profile.fragileItems}
                onChange={(event) => set('fragileItems', event.target.value)}
                placeholder="Unsealed marble in the guest bath, framed art in the hallway, antique dresser."
              />
            </Field>
          </Panel>
        ) : null}

        {active === 'pets' ? (
          <Panel title="Pet profile" body="Names, temperament and the rules that keep everyone comfortable.">
            {profile.pets.length === 0 ? (
              <EmptyState
                icon="pet"
                title="No pets added yet"
                body="If animals live here — even part-time — adding them helps us plan doors, products and timing."
                action={
                  <Button
                    onClick={() =>
                      set('pets', [
                        ...profile.pets,
                        {
                          id: `pet-${Date.now()}`,
                          type: 'Dog',
                          name: '',
                          temperament: 'friendly',
                          escapeRisk: false,
                          safeRoom: '',
                          productRestrictions: '',
                          notes: '',
                        },
                      ])
                    }
                  >
                    Add a pet
                  </Button>
                }
              />
            ) : (
              <div className="space-y-5">
                {profile.pets.map((pet, index) => (
                  <fieldset key={pet.id} className="rounded-2xl border border-line bg-pearl/35 p-5">
                    <legend className="px-1 text-sm font-medium text-ink">
                      Pet {index + 1}
                    </legend>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Type" htmlFor={`${pet.id}-type`}>
                        <TextInput
                          id={`${pet.id}-type`}
                          value={pet.type}
                          onChange={(event) =>
                            set(
                              'pets',
                              profile.pets.map((entry) =>
                                entry.id === pet.id ? { ...entry, type: event.target.value } : entry,
                              ),
                            )
                          }
                        />
                      </Field>
                      <Field label="Name" htmlFor={`${pet.id}-name`}>
                        <TextInput
                          id={`${pet.id}-name`}
                          value={pet.name}
                          onChange={(event) =>
                            set(
                              'pets',
                              profile.pets.map((entry) =>
                                entry.id === pet.id ? { ...entry, name: event.target.value } : entry,
                              ),
                            )
                          }
                        />
                      </Field>
                      <Field label="Temperament" htmlFor={`${pet.id}-temperament`}>
                        <Select
                          id={`${pet.id}-temperament`}
                          value={pet.temperament}
                          onChange={(event) =>
                            set(
                              'pets',
                              profile.pets.map((entry) =>
                                entry.id === pet.id
                                  ? { ...entry, temperament: event.target.value as Pet['temperament'] }
                                  : entry,
                              ),
                            )
                          }
                        >
                          <option value="friendly">Friendly with visitors</option>
                          <option value="nervous">Nervous around new people</option>
                          <option value="territorial">Protective of the space</option>
                        </Select>
                      </Field>
                      <Field label="Where they stay during a visit" htmlFor={`${pet.id}-room`}>
                        <TextInput
                          id={`${pet.id}-room`}
                          value={pet.safeRoom}
                          onChange={(event) =>
                            set(
                              'pets',
                              profile.pets.map((entry) =>
                                entry.id === pet.id ? { ...entry, safeRoom: event.target.value } : entry,
                              ),
                            )
                          }
                          placeholder="Crate in the office, or the back bedroom"
                        />
                      </Field>
                    </div>

                    <div className="mt-4 space-y-3">
                      <ToggleChip
                        checked={pet.escapeRisk}
                        onChange={(next) =>
                          set(
                            'pets',
                            profile.pets.map((entry) =>
                              entry.id === pet.id ? { ...entry, escapeRisk: next } : entry,
                            ),
                          )
                        }
                        label="Escape risk — doors must stay closed"
                        icon={<Icon name="lock" size={18} />}
                      />
                      <Field label="Product restrictions" htmlFor={`${pet.id}-products`}>
                        <TextInput
                          id={`${pet.id}-products`}
                          value={pet.productRestrictions}
                          onChange={(event) =>
                            set(
                              'pets',
                              profile.pets.map((entry) =>
                                entry.id === pet.id
                                  ? { ...entry, productRestrictions: event.target.value }
                                  : entry,
                              ),
                            )
                          }
                          placeholder="No essential-oil based cleaners near the cat areas."
                        />
                      </Field>
                      <Field label="Special instructions" htmlFor={`${pet.id}-notes`}>
                        <TextArea
                          id={`${pet.id}-notes`}
                          value={pet.notes}
                          onChange={(event) =>
                            set(
                              'pets',
                              profile.pets.map((entry) =>
                                entry.id === pet.id ? { ...entry, notes: event.target.value } : entry,
                              ),
                            )
                          }
                        />
                      </Field>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        set('pets', profile.pets.filter((entry) => entry.id !== pet.id))
                      }
                      className="mt-4 text-sm text-accent underline-offset-4 hover:underline"
                    >
                      Remove this pet
                    </button>
                  </fieldset>
                ))}
                <Button
                  variant="secondary"
                  onClick={() =>
                    set('pets', [
                      ...profile.pets,
                      {
                        id: `pet-${Date.now()}`,
                        type: 'Cat',
                        name: '',
                        temperament: 'friendly',
                        escapeRisk: false,
                        safeRoom: '',
                        productRestrictions: '',
                        notes: '',
                      },
                    ])
                  }
                >
                  Add another pet
                </Button>
              </div>
            )}
          </Panel>
        ) : null}

        {active === 'products' ? (
          <Panel title="Product Preference Center" body="We follow this list exactly. We do not assess sensitivities or make health claims.">
            <OptionCards
              legend="Which products should we use?"
              name="product-preference"
              columns={2}
              value={profile.productPreference}
              onChange={(value) => set('productPreference', value)}
              options={[
                { id: 'standard', label: 'Standard professional products', hint: 'Our default kit.' },
                { id: 'eco', label: 'Eco-conscious products', hint: 'Plant-derived where effective.' },
                { id: 'fragrance-free', label: 'Fragrance-free', hint: 'Unscented throughout the home.' },
                { id: 'customer-supplied', label: 'I will provide the products', hint: 'Left where the team can find them.' },
              ]}
            />

            <Field
              className="mt-6"
              label="Ingredients to avoid"
              htmlFor="avoid-ingredients"
              hint="For example: bleach, ammonia, citrus oils, quaternary ammonium compounds."
            >
              <TextArea
                id="avoid-ingredients"
                value={profile.avoidIngredients}
                onChange={(event) => set('avoidIngredients', event.target.value)}
              />
            </Field>

            <Field
              className="mt-4"
              label="Allergy or sensitivity notes"
              htmlFor="sensitivities"
              hint="Written in your own words. Shared only with the assigned team."
            >
              <TextArea
                id="sensitivities"
                value={profile.sensitivities}
                onChange={(event) => set('sensitivities', event.target.value)}
              />
            </Field>

            <Note className="mt-6" title="What we can and cannot do">
              We can follow a product list precisely and document what was used. We
              cannot diagnose a sensitivity, guarantee an allergen-free environment or
              advise on medical questions.
            </Note>
          </Panel>
        ) : null}

        {active === 'access' ? (
          <Panel title="Access, parking and alarms" body="Enough for the team to arrive and get in without calling you.">
            <div className="grid gap-4">
              <Field label="Entry method" htmlFor="entry-method-profile">
                <TextInput
                  id="entry-method-profile"
                  value={profile.entryMethod}
                  onChange={(event) => set('entryMethod', event.target.value)}
                  placeholder="Lockbox on the side gate; front desk holds a key."
                />
              </Field>
              <Field label="Parking" htmlFor="parking-profile">
                <TextInput
                  id="parking-profile"
                  value={profile.parking}
                  onChange={(event) => set('parking', event.target.value)}
                  placeholder="Visitor spot 12, or street parking on the north side."
                />
              </Field>
              <Field
                label="Alarm process"
                htmlFor="alarm-profile"
                hint="Describe the process here — not the code. Codes are collected separately through a secure field and are never stored in this form."
              >
                <TextArea
                  id="alarm-profile"
                  value={profile.alarmProcess}
                  onChange={(event) => set('alarmProcess', event.target.value)}
                  placeholder="Panel is inside the hall closet; disarm on entry, re-arm on exit."
                />
              </Field>
            </div>

            <Note className="mt-6" title="How access details are handled">
              Access notes are restricted to the team assigned to your appointment.
              Physical keys are logged in and out. Full detail is on the{' '}
              <a className="link-underline" href="/trust-safety">
                Trust &amp; Safety page
              </a>
              .
            </Note>
          </Panel>
        ) : null}

        {active === 'zones' ? (
          <Panel
            title="Do Not Disturb and Priority Zones"
            body="The two settings customers tell us change the most about how a visit feels."
          >
            <div className="rounded-2xl border border-line bg-pearl/35 p-5">
              <div className="flex items-center gap-2">
                <Icon name="lock" size={18} className="text-accent" />
                <h3 className="text-lg">Do Not Disturb Zones</h3>
              </div>
              <p className="mt-2 text-sm text-muted">
                Rooms marked here are not entered. Nothing inside them is opened, moved
                or cleaned.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {rooms.map((room) => (
                  <Chip
                    key={room.id}
                    label={room.label}
                    active={profile.doNotDisturbRooms.includes(room.id)}
                    onClick={() =>
                      set('doNotDisturbRooms', toggleInList(profile.doNotDisturbRooms, room.id))
                    }
                    tone="warn"
                  />
                ))}
              </div>
              <Field
                className="mt-5"
                label="Specific cabinets, drawers, desks or personal areas"
                htmlFor="dnd-items"
              >
                <TextArea
                  id="dnd-items"
                  value={profile.doNotDisturbItems}
                  onChange={(event) => set('doNotDisturbItems', event.target.value)}
                  placeholder="The office desk and its drawers; the top-left kitchen cabinet; the closet in the guest room."
                />
              </Field>
            </div>

            <div className="mt-6 rounded-2xl border border-line bg-mint/25 p-5">
              <div className="flex items-center gap-2">
                <Icon name="star" size={18} className="text-accent" />
                <h3 className="text-lg">Priority Zones</h3>
              </div>
              <p className="mt-2 text-sm text-muted">
                Pick up to three areas that get attention first on every visit, before
                anything else.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {rooms.map((room) => (
                  <Chip
                    key={room.id}
                    label={room.label}
                    active={profile.priorityZones.includes(room.id)}
                    onClick={() => togglePriority(room.id)}
                  />
                ))}
              </div>
              <p className="mt-4 text-sm text-muted" aria-live="polite">
                {profile.priorityZones.length} of 3 selected
                {profile.priorityZones.length
                  ? `: ${profile.priorityZones
                      .map((id) => rooms.find((room) => room.id === id)?.label)
                      .join(', ')}`
                  : '.'}
              </p>
            </div>
          </Panel>
        ) : null}

        {active === 'preferences' ? (
          <Panel title="Communication and cleaner preferences" body="How you would like to hear from us, and who you would like to see.">
            <OptionCards
              legend="Preferred communication"
              name="communication"
              columns={2}
              value={profile.communication}
              onChange={(value) => set('communication', value)}
              options={[
                { id: 'text', label: 'Text message', hint: 'Arrival updates and short questions.' },
                { id: 'email', label: 'Email', hint: 'Confirmations and reports.' },
                { id: 'dashboard', label: 'Dashboard only', hint: 'Nothing to your phone or inbox.' },
                { id: 'call', label: 'Phone call', hint: 'For anything that needs a conversation.' },
              ]}
            />

            <div className="mt-6 space-y-3">
              <ToggleChip
                checked={profile.quietClean}
                onChange={(next) => set('quietClean', next)}
                label="Quiet Clean by default"
                hint="No doorbell, text-only arrival, lower-noise equipment where possible, closed offices left alone."
                icon={<Icon name="bellOff" size={18} />}
              />
              <ToggleChip
                checked={profile.photoPermission}
                onChange={(next) => set('photoPermission', next)}
                label="Allow completion photos in my reports"
                hint="Off by default. Photos are never published or shared outside your account without separate written consent."
                icon={<Icon name="camera" size={18} />}
              />
            </div>

            <Field
              className="mt-6"
              label="Cleaner preferences"
              htmlFor="cleaner-preference"
              hint="We record this and aim for it. We do not promise it absolutely — schedules, illness and time off are real."
            >
              <TextArea
                id="cleaner-preference"
                value={profile.cleanerPreference}
                onChange={(event) => set('cleanerPreference', event.target.value)}
                placeholder="Same team each visit if possible; please introduce anyone new."
              />
            </Field>
          </Panel>
        ) : null}

        {active === 'reset-score' ? <ResetScore /> : null}

        {active !== 'reset-score' ? (
          <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-line pt-6">
            <Button onClick={() => push('Profile saved', 'Stored on this device until you create an account.')}>
              Save profile
            </Button>
            <Button href="/booking" variant="secondary">
              Use this profile to book
            </Button>
            <span className="text-sm text-muted">Changes save as you type.</span>
          </div>
        ) : null}
      </motion.div>

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

function Panel({
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
      <h2 className="text-2xl">{title}</h2>
      <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">{body}</p>
      <div className="mt-7">{children}</div>
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
  tone = 'accent',
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  tone?: 'accent' | 'warn';
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'rounded-full border px-4 py-2 text-sm transition-all duration-300',
        active
          ? tone === 'warn'
            ? 'border-champagne bg-champagne text-ink'
            : 'border-accent bg-accent text-white'
          : 'border-line bg-white text-ink hover:border-sage',
      )}
    >
      {active ? <span className="mr-1.5" aria-hidden="true">✓</span> : null}
      {label}
    </button>
  );
}

const resetQuestions = [
  { id: 'kitchen', label: 'How is the kitchen feeling this week?', zone: 'Kitchen' },
  { id: 'entry', label: 'And the entryway and hallway?', zone: 'Entryway' },
  { id: 'bathrooms', label: 'How about the bathrooms?', zone: 'Bathrooms' },
  { id: 'bedrooms', label: 'The bedrooms?', zone: 'Bedrooms' },
  { id: 'living', label: 'Living and shared spaces?', zone: 'Living areas' },
];

const resetScale = [
  { value: 3, label: 'Settled' },
  { value: 2, label: 'Slipping a little' },
  { value: 1, label: 'Ready for attention' },
];

function ResetScore() {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const answered = Object.keys(answers).length;
  const complete = answered === resetQuestions.length;

  const focusZones = resetQuestions
    .filter((question) => (answers[question.id] ?? 3) <= 2)
    .sort((a, b) => (answers[a.id] ?? 3) - (answers[b.id] ?? 3))
    .slice(0, 2)
    .map((question) => question.zone);

  return (
    <Panel
      title="Home Reset Score"
      body="A short planning questionnaire to help decide where a visit should start. There are no wrong answers and no judgment here — homes are lived in."
    >
      <div className="space-y-5">
        {resetQuestions.map((question) => (
          <fieldset key={question.id} className="rounded-2xl border border-line bg-pearl/35 p-5">
            <legend className="px-1 text-[15px] font-medium text-ink">{question.label}</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {resetScale.map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    'cursor-pointer rounded-full border px-4 py-2 text-sm transition-all duration-300',
                    answers[question.id] === option.value
                      ? 'border-accent bg-accent text-white'
                      : 'border-line bg-white text-ink hover:border-sage',
                  )}
                >
                  <input
                    type="radio"
                    name={question.id}
                    className="sr-only"
                    checked={answers[question.id] === option.value}
                    onChange={() =>
                      setAnswers((current) => ({ ...current, [question.id]: option.value }))
                    }
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      <div className="mt-6" aria-live="polite">
        {complete ? (
          <SuccessNote
            title="Where to begin"
            body={
              focusZones.length
                ? `Your ${focusZones.join(' and ').toLowerCase()} may benefit from a focused reset. We will start there and work outward.`
                : 'Your home sounds settled. A standard maintenance visit will keep it that way.'
            }
          />
        ) : (
          <p className="text-sm text-muted">
            {answered} of {resetQuestions.length} answered. Your result appears here —
            it never leaves this page.
          </p>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button href="/build-your-clean" variant="secondary">
          Build a plan around this
        </Button>
        <Badge tone="outline">Planning tool · not a health or hygiene assessment</Badge>
      </div>
    </Panel>
  );
}
