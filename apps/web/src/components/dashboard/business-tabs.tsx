'use client';

import { useActionState, useState, useTransition } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  Field,
  Input,
  Select,
  Tab,
  TabList,
  Table,
  Td,
  Textarea,
  Th,
} from '@/components/ui';
import { BusinessForm } from '@/components/dashboard/business-form';
import {
  deleteRecordAction,
  saveFaqAction,
  saveServiceAction,
  saveServiceAreaAction,
} from '@/server/actions';
import type { ActionResult } from '@/lib/errors';

type Row = Record<string, unknown>;

const TABS = ['Business', 'Services', 'Service areas', 'FAQ'] as const;

const money = (cents: unknown) =>
  typeof cents === 'number' ? `$${(cents / 100).toFixed(2).replace(/\.00$/, '')}` : '—';

/**
 * Business Settings.
 *
 * Everything here feeds the assistant's system prompt, so each tab warns that a
 * change re-publishes the receptionist. The save actions perform that sync
 * server-side and report honestly if it fails.
 */
export function BusinessTabs({
  canEdit,
  business,
  services,
  areas,
  faqs,
  organizationName,
}: {
  canEdit: boolean;
  business: Row | null;
  services: Row[];
  areas: Row[];
  faqs: Row[];
  organizationName: string;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Business');
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function remove(table: 'services' | 'faqs' | 'service_areas', id: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteRecordAction(table, id);
      if (!result.ok) setError(result.message ?? 'That could not be deleted.');
    });
  }

  return (
    <div className="space-y-5">
      <TabList>
        {TABS.map((t) => (
          <Tab key={t} active={tab === t} onClick={() => setTab(t)}>
            {t}
          </Tab>
        ))}
      </TabList>

      {error && <Alert tone="critical" title={error} />}

      {tab === 'Business' && (
        <BusinessForm
          canEdit={canEdit}
          initial={{
            display_name: (business?.display_name as string) ?? organizationName,
            legal_name: (business?.legal_name as string) ?? '',
            industry: (business?.industry as string) ?? '',
            website: (business?.website as string) ?? '',
            public_phone: (business?.public_phone as string) ?? '',
            email: (business?.email as string) ?? '',
            address: (business?.address as string) ?? '',
            city: (business?.city as string) ?? '',
            state: (business?.state as string) ?? '',
            postal_code: (business?.postal_code as string) ?? '',
            country: (business?.country as string) ?? 'US',
            timezone: (business?.timezone as string) ?? 'America/New_York',
            business_description: (business?.business_description as string) ?? '',
            emergency_information: (business?.emergency_information as string) ?? '',
            emergency_phone: (business?.emergency_phone as string) ?? '',
            business_hours: (business?.business_hours as unknown[]) ?? [],
          }}
        />
      )}

      {tab === 'Services' && (
        <ServicesPanel
          canEdit={canEdit}
          services={services}
          busy={busy}
          onDelete={(id) => remove('services', id)}
        />
      )}

      {tab === 'Service areas' && (
        <AreasPanel canEdit={canEdit} areas={areas} busy={busy} onDelete={(id) => remove('service_areas', id)} />
      )}

      {tab === 'FAQ' && (
        <FaqPanel canEdit={canEdit} faqs={faqs} busy={busy} onDelete={(id) => remove('faqs', id)} />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Reports the outcome of a save honestly. A write that succeeded here but failed
 * to reach Vapi is neither a success nor a failure, and is shown as neither.
 */
function SyncNotice({ state }: { state: ActionResult | null }) {
  if (!state) return null;
  if (state.ok && state.warning) {
    return (
      <Alert tone="caution" title="Saved here, but not live yet">
        {state.warning}
      </Alert>
    );
  }
  if (state.ok) {
    return <Alert tone="positive" title={state.message ?? 'Saved'} />;
  }
  return (
    <Alert tone="critical" title={state.message ?? 'That did not save'}>
      {state.action && <p>{state.action}</p>}
    </Alert>
  );
}

function ServicesPanel({
  canEdit,
  services,
  busy,
  onDelete,
}: {
  canEdit: boolean;
  services: Row[];
  busy: boolean;
  onDelete: (id: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [priceType, setPriceType] = useState('quote_only');
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveServiceAction, null);

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-muted">
        Your receptionist may only confirm services listed here, and may only quote the prices you
        set. Anything marked estimate-required makes it offer a visit instead of a number.
      </p>

      <SyncNotice state={state} />

      {services.length === 0 ? (
        <p className="text-sm text-ink-subtle">
          No services yet. Until you add one, the receptionist takes a message rather than confirming
          what you do.
        </p>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Service</Th>
              <Th>Pricing</Th>
              <Th>Duration</Th>
              {canEdit && <Th className="text-right">Actions</Th>}
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.id as string}>
                <Td>
                  <span className="font-medium">{s.name as string}</span>
                  {!s.active && (
                    <Badge tone="neutral" className="ml-2">
                      Inactive
                    </Badge>
                  )}
                  {s.description ? (
                    <p className="mt-0.5 text-xs text-ink-subtle">{s.description as string}</p>
                  ) : null}
                </Td>
                <Td className="tabular text-sm">
                  {s.price_type === 'quote_only'
                    ? 'Estimate required'
                    : s.price_type === 'starting_at'
                      ? `from ${money(s.starting_price)}`
                      : s.price_type === 'range'
                        ? `${money(s.starting_price)} – ${money(s.max_price)}`
                        : s.price_type === 'hourly'
                          ? `${money(s.exact_price)}/hr`
                          : money(s.exact_price)}
                </Td>
                <Td className="text-sm text-ink-subtle">
                  {s.estimated_duration ? `${s.estimated_duration as number} min` : '—'}
                </Td>
                {canEdit && (
                  <Td className="text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Delete ${s.name as string}`}
                      disabled={busy}
                      onClick={() => onDelete(s.id as string)}
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  </Td>
                )}
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {canEdit &&
        (adding ? (
          <form action={action} className="space-y-3 rounded-lg border border-line p-4">
            <Field label="Service name" htmlFor="name" required error={state?.fields?.name}>
              <Input name="name" required placeholder="AC repair" />
            </Field>
            <Field label="Description" htmlFor="description">
              <Textarea name="description" rows={2} placeholder="Diagnostic visit and repair for residential cooling systems." />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Pricing model" htmlFor="price_type">
                <Select name="price_type" value={priceType} onChange={(e) => setPriceType(e.target.value)}>
                  <option value="quote_only">Estimate required</option>
                  <option value="fixed">Fixed price</option>
                  <option value="starting_at">Starting at</option>
                  <option value="range">Range</option>
                  <option value="hourly">Hourly</option>
                </Select>
              </Field>
              <Field label="Typical duration (minutes)" htmlFor="estimated_duration">
                <Input name="estimated_duration" inputMode="numeric" placeholder="60" />
              </Field>
            </div>
            {(priceType === 'fixed' || priceType === 'hourly') && (
              <Field label="Price (dollars)" htmlFor="exact_price">
                <Input name="exact_price" inputMode="decimal" placeholder="149" />
              </Field>
            )}
            {(priceType === 'starting_at' || priceType === 'range') && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="From (dollars)" htmlFor="starting_price">
                  <Input name="starting_price" inputMode="decimal" placeholder="400" />
                </Field>
                {priceType === 'range' && (
                  <Field label="To (dollars)" htmlFor="max_price">
                    <Input name="max_price" inputMode="decimal" placeholder="1200" />
                  </Field>
                )}
              </div>
            )}
            <Field label="Pricing notes" htmlFor="price_notes" hint="Read out alongside the price.">
              <Input name="price_notes" placeholder="Waived if you go ahead with the repair" />
            </Field>
            <div className="flex gap-2">
              <Button type="submit" loading={pending}>
                {pending ? 'Saving' : 'Add service'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button variant="secondary" onClick={() => setAdding(true)}>
            <Plus aria-hidden /> Add a service
          </Button>
        ))}
    </div>
  );
}

function AreasPanel({
  canEdit,
  areas,
  busy,
  onDelete,
}: {
  canEdit: boolean;
  areas: Row[];
  busy: boolean;
  onDelete: (id: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState('postal_code');
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveServiceAreaAction, null);

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-muted">
        Where you work. The receptionist tells callers outside these areas politely, and still takes
        their details.
      </p>

      <SyncNotice state={state} />

      {areas.length === 0 ? (
        <p className="text-sm text-ink-subtle">
          No service area set. Until you add one, the receptionist will not tell callers whether they
          are covered.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {areas.map((a) => (
            <li
              key={a.id as string}
              className="flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-sm"
            >
              <span className="text-ink">
                {a.type === 'postal_code'
                  ? (a.postal_code as string)
                  : a.type === 'city'
                    ? `${a.city as string}${a.state ? `, ${a.state as string}` : ''}`
                    : a.type === 'state'
                      ? (a.state as string)
                      : `${a.radius_miles as number} mi around ${a.center_postal_code as string}`}
              </span>
              {canEdit && (
                <button
                  type="button"
                  aria-label="Remove service area"
                  disabled={busy}
                  onClick={() => onDelete(a.id as string)}
                  className="text-ink-faint hover:text-critical"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit &&
        (adding ? (
          <form action={action} className="space-y-3 rounded-lg border border-line p-4">
            <Field label="Area type" htmlFor="type">
              <Select name="type" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="postal_code">ZIP code</option>
                <option value="city">City</option>
                <option value="state">Entire state</option>
                <option value="radius">Radius from a ZIP</option>
              </Select>
            </Field>

            {type === 'postal_code' && (
              <Field label="ZIP code" htmlFor="postal_code" required>
                <Input name="postal_code" inputMode="numeric" placeholder="19020" required />
              </Field>
            )}
            {type === 'city' && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="City" htmlFor="city" required>
                  <Input name="city" required placeholder="Philadelphia" />
                </Field>
                <Field label="State" htmlFor="state">
                  <Input name="state" placeholder="PA" />
                </Field>
              </div>
            )}
            {type === 'state' && (
              <Field label="State" htmlFor="state" required>
                <Input name="state" required placeholder="PA" />
              </Field>
            )}
            {type === 'radius' && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Centre ZIP" htmlFor="center_postal_code" required>
                  <Input name="center_postal_code" inputMode="numeric" required />
                </Field>
                <Field label="Radius (miles)" htmlFor="radius_miles" required>
                  <Input name="radius_miles" inputMode="numeric" placeholder="25" required />
                </Field>
              </div>
            )}

            <div className="flex gap-2">
              <Button type="submit" loading={pending}>
                {pending ? 'Saving' : 'Add area'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button variant="secondary" onClick={() => setAdding(true)}>
            <Plus aria-hidden /> Add a service area
          </Button>
        ))}
    </div>
  );
}

function FaqPanel({
  canEdit,
  faqs,
  busy,
  onDelete,
}: {
  canEdit: boolean;
  faqs: Row[];
  busy: boolean;
  onDelete: (id: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveFaqAction, null);

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-muted">
        The questions you hear most. Adding them here makes calls shorter and stops the receptionist
        saying it will check.
      </p>

      <SyncNotice state={state} />

      {faqs.length === 0 ? (
        <p className="text-sm text-ink-subtle">No questions saved yet.</p>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {faqs.map((f) => (
            <li key={f.id as string} className="flex items-start justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{f.question as string}</p>
                <p className="mt-0.5 text-sm text-ink-muted">{f.answer as string}</p>
              </div>
              {canEdit && (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Delete question"
                  disabled={busy}
                  onClick={() => onDelete(f.id as string)}
                >
                  <Trash2 aria-hidden />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit &&
        (adding ? (
          <form action={action} className="space-y-3 rounded-lg border border-line p-4">
            <Field label="Question" htmlFor="question" required error={state?.fields?.question}>
              <Input name="question" required placeholder="Do you offer free estimates?" />
            </Field>
            <Field label="Answer" htmlFor="answer" required error={state?.fields?.answer}>
              <Textarea name="answer" rows={2} required />
            </Field>
            <div className="flex gap-2">
              <Button type="submit" loading={pending}>
                {pending ? 'Saving' : 'Add question'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button variant="secondary" onClick={() => setAdding(true)}>
            <Plus aria-hidden /> Add a question
          </Button>
        ))}
    </div>
  );
}
