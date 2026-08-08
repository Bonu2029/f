'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, Select, TextArea, TextInput, ToggleChip } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import { Note } from '@/components/ui/Primitives';
import { ErrorMessage, LoadingState, SuccessNote } from '@/components/ui/States';

const categories = [
  'New cleaning request',
  'Existing appointment',
  'Membership',
  'Airbnb or property management',
  'Commercial cleaning',
  'Feedback',
  'Other',
];

type Values = {
  name: string;
  email: string;
  phone: string;
  zip: string;
  category: string;
  message: string;
};

const emptyValues: Values = {
  name: '',
  email: '',
  phone: '',
  zip: '',
  category: categories[0],
  message: '',
};

export function ContactForm() {
  const [values, setValues] = useState<Values>(emptyValues);
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>({});
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: '' }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const next: Partial<Record<keyof Values, string>> = {};
    if (!values.name.trim()) next.name = 'Enter your name so we know who we are replying to.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email.trim()))
      next.email = 'Enter an email address in the format name@example.com.';
    if (values.message.trim().length < 10)
      next.message = 'Add a sentence or two so we can give you a useful answer.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setState('sending');
    // Submission connects to the email/CRM provider at launch.
    await new Promise((resolve) => setTimeout(resolve, 800));
    setState('sent');
  };

  if (state === 'sent') {
    return (
      <div className="rounded-[2rem] border border-line bg-white p-8 shadow-soft">
        <SuccessNote
          title="Message ready to send"
          body="Delivery connects to our email provider at launch, so nothing has actually been transmitted from this preview build."
        />
        <p className="mt-5 text-[15px] leading-relaxed text-muted">
          When live, general questions receive a reply within one business day, and
          existing-appointment questions are answered the same business day where
          possible.
        </p>
        <Button
          variant="secondary"
          className="mt-6"
          onClick={() => {
            setValues(emptyValues);
            setState('idle');
          }}
        >
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className="rounded-[2rem] border border-line bg-white p-6 shadow-soft sm:p-8"
    >
      <h2 className="text-2xl">Send us a message</h2>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">
        Choose the category that fits best — it routes your message to the right person
        rather than a shared inbox.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="contact-name" required error={errors.name}>
          <TextInput
            id="contact-name"
            autoComplete="name"
            value={values.name}
            aria-invalid={Boolean(errors.name)}
            onChange={(event) => set('name', event.target.value)}
          />
        </Field>
        <Field label="Email" htmlFor="contact-email" required error={errors.email}>
          <TextInput
            id="contact-email"
            type="email"
            autoComplete="email"
            value={values.email}
            aria-invalid={Boolean(errors.email)}
            onChange={(event) => set('email', event.target.value)}
          />
        </Field>
        <Field label="Phone" htmlFor="contact-phone" hint="Optional.">
          <TextInput
            id="contact-phone"
            type="tel"
            autoComplete="tel"
            value={values.phone}
            onChange={(event) => set('phone', event.target.value)}
          />
        </Field>
        <Field label="ZIP code" htmlFor="contact-zip" hint="Helps us check availability.">
          <TextInput
            id="contact-zip"
            inputMode="numeric"
            maxLength={5}
            autoComplete="postal-code"
            value={values.zip}
            onChange={(event) => set('zip', event.target.value.replace(/\D/g, ''))}
          />
        </Field>
        <Field label="What is this about?" htmlFor="contact-category" className="sm:col-span-2">
          <Select
            id="contact-category"
            value={values.category}
            onChange={(event) => set('category', event.target.value)}
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Message"
          htmlFor="contact-message"
          required
          error={errors.message}
          className="sm:col-span-2"
        >
          <TextArea
            id="contact-message"
            rows={5}
            value={values.message}
            aria-invalid={Boolean(errors.message)}
            onChange={(event) => set('message', event.target.value)}
            placeholder="Tell us about the home, the timing and anything specific you want handled."
          />
        </Field>
      </div>

      {Object.keys(errors).some((key) => errors[key as keyof Values]) ? (
        <div className="mt-5">
          <ErrorMessage body="A few fields need attention before this can be sent. They are marked above." />
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-4">
        {state === 'sending' ? (
          <LoadingState label="Preparing your message" />
        ) : (
          <Button type="submit" size="lg">
            Send message
          </Button>
        )}
        <p className="text-sm text-muted">
          Please do not include alarm codes, payment details or medical information.
        </p>
      </div>
    </form>
  );
}

export function PhotoQuoteRequest() {
  const [files, setFiles] = useState<{ name: string; size: number }[]>([]);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const MAX_FILES = 6;
  const MAX_MB = 8;

  const onFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(event.target.files ?? []);
    if (list.length > MAX_FILES) {
      setError(`Please choose up to ${MAX_FILES} photos.`);
      return;
    }
    const tooBig = list.find((file) => file.size > MAX_MB * 1024 * 1024);
    if (tooBig) {
      setError(`“${tooBig.name}” is over the ${MAX_MB} MB limit.`);
      return;
    }
    setError('');
    setFiles(list.map((file) => ({ name: file.name, size: file.size })));
  };

  return (
    <div className="rounded-[2rem] border border-line bg-white p-6 shadow-soft sm:p-8">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-mint/45 text-accent-deep">
          <Icon name="camera" size={20} />
        </span>
        <h2 className="text-2xl">Photo quote request</h2>
      </div>
      <p className="mt-3 text-[15px] leading-relaxed text-muted">
        Photos let us scope the work accurately — and tell you honestly when something
        is surface damage rather than soil. Entirely optional.
      </p>

      <div className="mt-6">
        <Field
          label="Room photos"
          htmlFor="photo-upload"
          hint={`Up to ${MAX_FILES} images, ${MAX_MB} MB each. JPEG, PNG or HEIC.`}
          error={error}
        >
          <input
            id="photo-upload"
            type="file"
            accept="image/*"
            multiple
            onChange={onFiles}
            className="w-full rounded-2xl border border-dashed border-line bg-pearl/40 px-4 py-4 text-sm text-muted file:mr-4 file:rounded-full file:border-0 file:bg-accent file:px-4 file:py-2 file:text-sm file:text-white"
          />
        </Field>

        {files.length ? (
          <ul className="mt-4 space-y-2">
            {files.map((file) => (
              <li
                key={file.name}
                className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-2.5 text-sm"
              >
                <span className="truncate text-ink">{file.name}</span>
                <span className="flex-none text-muted">
                  {(file.size / (1024 * 1024)).toFixed(1)} MB
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="mt-5">
        <ToggleChip
          checked={consent}
          onChange={setConsent}
          label="I consent to LumaNest reviewing these photos to prepare a quote"
          hint="Photos are used only to scope your request, are visible only to the estimating team, and are deleted within 30 days unless you book — in which case they are kept with your appointment record until it closes."
          icon={<Icon name="lock" size={18} />}
        />
      </div>

      <Note className="mt-5" title="Please do not upload">
        Documents, mail, screens showing personal information, photographs of people, or
        anything you would not want reviewed by our estimating team. Photograph the
        rooms and surfaces, not the contents of your life.
      </Note>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <Button
          disabled={!consent || files.length === 0}
          onClick={() => setSent(true)}
          size="lg"
        >
          Send photo quote request
        </Button>
        {!consent ? (
          <p className="text-sm text-muted">Consent is required before photos can be sent.</p>
        ) : null}
      </div>

      {sent ? (
        <div className="mt-5">
          <SuccessNote
            title="Request prepared"
            body="Secure upload connects to approved cloud storage at launch. Nothing has left this device in this preview build."
          />
        </div>
      ) : null}
    </div>
  );
}

export function EmergencyRequest() {
  const [values, setValues] = useState({ name: '', phone: '', zip: '', detail: '' });
  const [sent, setSent] = useState(false);

  return (
    <div className="rounded-[2rem] border border-champagne bg-champagne/20 p-6 sm:p-8">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-accent-deep">
          <Icon name="clock" size={20} />
        </span>
        <h2 className="text-2xl">Emergency clean request</h2>
      </div>
      <p className="mt-3 text-[15px] leading-relaxed text-muted">
        For urgent situations — an unexpected showing, a last-minute guest, a
        turnaround that moved. We will check the nearest available appointment and
        contact you. We do not guarantee same-day availability.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="emergency-name">
          <TextInput
            id="emergency-name"
            value={values.name}
            onChange={(event) => setValues({ ...values, name: event.target.value })}
          />
        </Field>
        <Field label="Phone" htmlFor="emergency-phone" hint="Fastest way to reach you.">
          <TextInput
            id="emergency-phone"
            type="tel"
            value={values.phone}
            onChange={(event) => setValues({ ...values, phone: event.target.value })}
          />
        </Field>
        <Field label="ZIP code" htmlFor="emergency-zip">
          <TextInput
            id="emergency-zip"
            inputMode="numeric"
            maxLength={5}
            value={values.zip}
            onChange={(event) =>
              setValues({ ...values, zip: event.target.value.replace(/\D/g, '') })
            }
          />
        </Field>
        <Field label="What do you need, and by when?" htmlFor="emergency-detail" className="sm:col-span-2">
          <TextArea
            id="emergency-detail"
            value={values.detail}
            onChange={(event) => setValues({ ...values, detail: event.target.value })}
            placeholder="Two-bedroom apartment, guests arriving Friday evening, kitchen and bathrooms are the priority."
          />
        </Field>
      </div>

      <Button className="mt-6" onClick={() => setSent(true)}>
        Request the nearest appointment
      </Button>

      {sent ? (
        <div className="mt-5">
          <SuccessNote
            title="Request noted"
            body="We will check the nearest available appointment and contact you. No same-day promise is being made here."
          />
        </div>
      ) : null}
    </div>
  );
}
