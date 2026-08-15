'use client';

import { useActionState, useState } from 'react';
import { Download, Sparkles } from 'lucide-react';
import { INDUSTRIES, DEFAULT_BUSINESS_HOURS, type BusinessHoursDay } from '@afd/shared';
import { Alert, Button, Field, Input, Select, Switch, Textarea } from '@/components/ui';
import { saveBusinessProfileAction } from '@/server/actions';
import type { ActionResult } from '@/lib/errors';

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Phoenix',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
];

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface Initial {
  display_name: string;
  legal_name: string;
  industry: string;
  website: string;
  public_phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  timezone: string;
  business_description: string;
  emergency_information: string;
  emergency_phone: string;
  business_hours: unknown[];
}

/**
 * Business profile form, shared by onboarding step 1 and settings.
 *
 * "Import from website" fetches suggestions server-side and fills the form for
 * REVIEW — it never saves anything on its own. The owner still has to press
 * save, which is the whole point.
 */
export function BusinessForm({
  initial,
  canEdit,
  showImport,
  submitLabel = 'Save business details',
}: {
  initial: Initial;
  canEdit: boolean;
  showImport: boolean;
  submitLabel?: string;
}) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    saveBusinessProfileAction,
    null,
  );

  const [values, setValues] = useState({
    display_name: initial.display_name,
    industry: initial.industry,
    website: initial.website,
    public_phone: initial.public_phone,
    email: initial.email,
    address: initial.address,
    city: initial.city,
    state: initial.state,
    postal_code: initial.postal_code,
    business_description: initial.business_description,
    emergency_information: initial.emergency_information,
  });

  const [hours, setHours] = useState<BusinessHoursDay[]>(() => {
    const stored = initial.business_hours as BusinessHoursDay[];
    return Array.isArray(stored) && stored.length === 7 ? stored : DEFAULT_BUSINESS_HOURS;
  });

  const [importing, setImporting] = useState(false);
  const [importUrl, setImportUrl] = useState(initial.website);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const fields = state?.fields ?? {};
  const set = (key: keyof typeof values) => (v: string) => setValues((s) => ({ ...s, [key]: v }));

  function updateDay(weekday: number, patch: Partial<BusinessHoursDay>) {
    setHours((h) => h.map((d) => (d.weekday === weekday ? { ...d, ...patch } : d)));
  }

  async function importFromWebsite() {
    setImporting(true);
    setImportError(null);
    setImportNotice(null);
    try {
      const res = await fetch('/api/business/import-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl }),
      });
      const json = await res.json();
      if (!res.ok) {
        setImportError(json?.error?.message ?? 'That website could not be read.');
        return;
      }

      const s = json.suggestion as Record<string, string | null>;
      setValues((v) => ({
        ...v,
        display_name: s.display_name || v.display_name,
        industry: s.industry || v.industry,
        public_phone: s.public_phone || v.public_phone,
        email: s.email || v.email,
        address: s.address || v.address,
        city: s.city || v.city,
        state: s.state || v.state,
        postal_code: s.postal_code || v.postal_code,
        business_description:
          (json.suggestion?.business?.business_description as string) || v.business_description,
      }));
      setImportNotice(
        'Suggestions filled in below. Nothing has been saved yet — check each field, then press save.',
      );
    } catch {
      setImportError('We could not reach that website.');
    } finally {
      setImporting(false);
    }
  }

  return (
    <form action={action} className="space-y-6">
      {state?.ok && <Alert tone="positive" title={state.message ?? 'Saved'} />}
      {state && !state.ok && (
        <Alert tone="critical" title={state.message ?? 'That did not save'}>
          {state.action && <p>{state.action}</p>}
        </Alert>
      )}

      {showImport && canEdit && (
        <div className="rounded-lg border border-line bg-surface-sunken p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Sparkles className="size-4 text-brand-600" aria-hidden />
            Import from your website
          </h3>
          <p className="mt-1 text-sm text-ink-muted">
            We&rsquo;ll read your public site and suggest details. You review everything before it is
            saved.
          </p>
          {importNotice && <Alert tone="positive" title={importNotice} className="mt-3" />}
          {importError && <Alert tone="critical" title={importError} className="mt-3" />}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Input
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              placeholder="danielshvac.com"
              aria-label="Website address to import from"
            />
            <Button
              type="button"
              variant="secondary"
              loading={importing}
              disabled={!importUrl}
              onClick={importFromWebsite}
            >
              <Download aria-hidden /> {importing ? 'Reading' : 'Import'}
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Business name" htmlFor="display_name" required error={fields.display_name}>
          <Input
            name="display_name"
            value={values.display_name}
            onChange={(e) => set('display_name')(e.target.value)}
            disabled={!canEdit}
            required
          />
        </Field>
        <Field label="Legal name" htmlFor="legal_name" hint="If different." error={fields.legal_name}>
          <Input name="legal_name" defaultValue={initial.legal_name} disabled={!canEdit} />
        </Field>
        <Field label="Industry" htmlFor="industry">
          <Select
            name="industry"
            value={values.industry}
            onChange={(e) => set('industry')(e.target.value)}
            disabled={!canEdit}
          >
            <option value="">Choose an industry</option>
            {INDUSTRIES.map((i) => (
              <option key={i.id} value={i.id}>
                {i.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Website" htmlFor="website" error={fields.website}>
          <Input
            name="website"
            value={values.website}
            onChange={(e) => set('website')(e.target.value)}
            disabled={!canEdit}
            placeholder="danielshvac.com"
          />
        </Field>
        <Field label="Business phone" htmlFor="public_phone" error={fields.public_phone}>
          <Input
            name="public_phone"
            value={values.public_phone}
            onChange={(e) => set('public_phone')(e.target.value)}
            inputMode="tel"
            disabled={!canEdit}
          />
        </Field>
        <Field label="Business email" htmlFor="email" error={fields.email}>
          <Input
            name="email"
            type="email"
            value={values.email}
            onChange={(e) => set('email')(e.target.value)}
            disabled={!canEdit}
          />
        </Field>
      </div>

      <Field label="Address" htmlFor="address" error={fields.address}>
        <Input
          name="address"
          value={values.address}
          onChange={(e) => set('address')(e.target.value)}
          disabled={!canEdit}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-4">
        <Field label="City" htmlFor="city" error={fields.city}>
          <Input name="city" value={values.city} onChange={(e) => set('city')(e.target.value)} disabled={!canEdit} />
        </Field>
        <Field label="State" htmlFor="state" error={fields.state}>
          <Input name="state" value={values.state} onChange={(e) => set('state')(e.target.value)} disabled={!canEdit} />
        </Field>
        <Field label="ZIP" htmlFor="postal_code" error={fields.postal_code}>
          <Input
            name="postal_code"
            value={values.postal_code}
            onChange={(e) => set('postal_code')(e.target.value)}
            inputMode="numeric"
            disabled={!canEdit}
          />
        </Field>
        <Field label="Timezone" htmlFor="timezone" required>
          <Select name="timezone" defaultValue={initial.timezone} disabled={!canEdit}>
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz.replace('America/', '').replace(/_/g, ' ')}
              </option>
            ))}
          </Select>
        </Field>
        <input type="hidden" name="country" value={initial.country || 'US'} />
      </div>

      <Field
        label="What your business does"
        htmlFor="business_description"
        hint="Your receptionist uses this to explain you to callers."
        error={fields.business_description}
      >
        <Textarea
          name="business_description"
          value={values.business_description}
          onChange={(e) => set('business_description')(e.target.value)}
          rows={3}
          disabled={!canEdit}
          placeholder="Family-run HVAC company serving the Philadelphia area since 2009. Residential heating and cooling repair, installation and maintenance."
        />
      </Field>

      {/* Business hours ------------------------------------------------- */}
      <fieldset>
        <legend className="text-sm font-medium text-ink">Business hours</legend>
        <p className="mt-1 text-xs text-ink-subtle">
          Used to answer &ldquo;are you open?&rdquo; and to decide what counts as after hours.
        </p>
        <input type="hidden" name="business_hours" value={JSON.stringify(hours)} />
        <div className="mt-3 divide-y divide-line rounded-lg border border-line">
          {hours
            .slice()
            .sort((a, b) => a.weekday - b.weekday)
            .map((day) => (
              <div key={day.weekday} className="flex flex-wrap items-center gap-3 px-3 py-2">
                <span className="w-24 shrink-0 text-sm font-medium text-ink">
                  {WEEKDAYS[day.weekday]}
                </span>
                <div className="flex-1">
                  <Switch
                    id={`open-${day.weekday}`}
                    label={day.closed ? 'Closed' : 'Open'}
                    checked={!day.closed}
                    onChange={(next) => updateDay(day.weekday, { closed: !next })}
                    disabled={!canEdit}
                  />
                </div>
                {!day.closed && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={day.open}
                      onChange={(e) => updateDay(day.weekday, { open: e.target.value })}
                      className="w-32"
                      aria-label={`${WEEKDAYS[day.weekday]} opening time`}
                      disabled={!canEdit}
                    />
                    <span className="text-ink-subtle">to</span>
                    <Input
                      type="time"
                      value={day.close}
                      onChange={(e) => updateDay(day.weekday, { close: e.target.value })}
                      className="w-32"
                      aria-label={`${WEEKDAYS[day.weekday]} closing time`}
                      disabled={!canEdit}
                    />
                  </div>
                )}
              </div>
            ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Emergency handling"
          htmlFor="emergency_information"
          hint="What counts as an emergency and what should happen."
          error={fields.emergency_information}
        >
          <Textarea
            name="emergency_information"
            value={values.emergency_information}
            onChange={(e) => set('emergency_information')(e.target.value)}
            rows={3}
            disabled={!canEdit}
          />
        </Field>
        <Field
          label="Emergency contact number"
          htmlFor="emergency_phone"
          hint="Where urgent calls go outside hours."
          error={fields.emergency_phone}
        >
          <Input
            name="emergency_phone"
            defaultValue={initial.emergency_phone}
            inputMode="tel"
            disabled={!canEdit}
          />
        </Field>
      </div>

      {canEdit && (
        <Button type="submit" size="lg" loading={pending}>
          {pending ? 'Saving' : submitLabel}
        </Button>
      )}
    </form>
  );
}
