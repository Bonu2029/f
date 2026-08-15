'use client';

import { useActionState, useRef, useState, useTransition } from 'react';
import { FileText, Plus, Trash2, Upload } from 'lucide-react';
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
import {
  deleteRecordAction,
  saveFaqAction,
  savePolicyAction,
  saveServiceAction,
  saveServiceAreaAction,
} from '@/server/actions';
import type { ActionResult } from '@/lib/errors';

type Row = Record<string, unknown>;

const TABS = [
  'Services',
  'Pricing',
  'FAQs',
  'Policies',
  'Service areas',
  'Documents',
] as const;

const money = (cents: unknown) =>
  typeof cents === 'number' ? `$${(cents / 100).toFixed(2).replace(/\.00$/, '')}` : '—';

export function KnowledgeTabs({
  canEdit,
  business,
  services,
  faqs,
  policies,
  areas,
  documents,
}: {
  canEdit: boolean;
  business: Row | null;
  services: Row[];
  faqs: Row[];
  policies: Row[];
  areas: Row[];
  documents: Row[];
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Services');
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function remove(
    table: 'services' | 'faqs' | 'business_policies' | 'service_areas' | 'knowledge_documents',
    id: string,
  ) {
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

      {tab === 'Services' && (
        <ServicesPanel canEdit={canEdit} services={services} onDelete={(id) => remove('services', id)} busy={busy} />
      )}

      {tab === 'Pricing' && (
        <div className="space-y-4">
          <p className="text-sm text-ink-muted">
            Your receptionist may only quote prices listed here, exactly as written. Anything marked
            quote-only means it will offer an estimate visit instead of a number.
          </p>
          {services.length === 0 ? (
            <p className="text-sm text-ink-subtle">Add a service first.</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Service</Th>
                  <Th>Pricing model</Th>
                  <Th>Price</Th>
                  <Th>Notes</Th>
                </tr>
              </thead>
              <tbody>
                {services.map((s) => (
                  <tr key={s.id as string}>
                    <Td className="font-medium">{s.name as string}</Td>
                    <Td className="text-sm text-ink-muted">
                      {String(s.price_type).replace(/_/g, ' ')}
                    </Td>
                    <Td className="tabular text-sm">
                      {s.price_type === 'range'
                        ? `${money(s.starting_price)} – ${money(s.max_price)}`
                        : s.price_type === 'starting_at'
                          ? `from ${money(s.starting_price)}`
                          : s.price_type === 'quote_only'
                            ? 'Estimate required'
                            : money(s.exact_price)}
                    </Td>
                    <Td className="text-sm text-ink-subtle">{(s.price_notes as string) ?? '—'}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      )}

      {tab === 'FAQs' && (
        <FaqPanel canEdit={canEdit} faqs={faqs} onDelete={(id) => remove('faqs', id)} busy={busy} />
      )}

      {tab === 'Policies' && (
        <PolicyPanel
          canEdit={canEdit}
          policies={policies}
          onDelete={(id) => remove('business_policies', id)}
          busy={busy}
        />
      )}

      {tab === 'Service areas' && (
        <AreaPanel
          canEdit={canEdit}
          areas={areas}
          onDelete={(id) => remove('service_areas', id)}
          busy={busy}
        />
      )}

      {tab === 'Documents' && (
        <DocumentPanel
          canEdit={canEdit}
          documents={documents}
          onDelete={(id) => remove('knowledge_documents', id)}
          busy={busy}
        />
      )}

      {tab === 'Services' && business?.business_description ? (
        <p className="border-t border-line pt-4 text-sm text-ink-subtle">
          <strong className="text-ink">About your business:</strong>{' '}
          {business.business_description as string}
        </p>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function ServicesPanel({
  canEdit,
  services,
  onDelete,
  busy,
}: {
  canEdit: boolean;
  services: Row[];
  onDelete: (id: string) => void;
  busy: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveServiceAction, null);
  const [priceType, setPriceType] = useState('quote_only');

  return (
    <div className="space-y-4">
      {state?.ok && <Alert tone="positive" title={state.message ?? 'Saved'} />}
      {state && !state.ok && <Alert tone="critical" title={state.message ?? 'That did not save'} />}

      {services.length === 0 ? (
        <p className="text-sm text-ink-subtle">
          No services yet. Your receptionist will not confirm any service until you add one.
        </p>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {services.map((s) => (
            <li key={s.id as string} className="flex items-start justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">
                  {s.name as string}
                  {!s.active && (
                    <Badge tone="neutral" className="ml-2">
                      Inactive
                    </Badge>
                  )}
                </p>
                {s.description ? (
                  <p className="mt-0.5 text-sm text-ink-muted">{s.description as string}</p>
                ) : null}
                <p className="mt-0.5 text-xs tabular text-ink-subtle">
                  {s.price_type === 'quote_only'
                    ? 'Estimate required'
                    : s.price_type === 'starting_at'
                      ? `from ${money(s.starting_price)}`
                      : s.price_type === 'range'
                        ? `${money(s.starting_price)} – ${money(s.max_price)}`
                        : money(s.exact_price)}
                  {s.estimated_duration ? ` · ${s.estimated_duration as number} min` : ''}
                </p>
              </div>
              {canEdit && (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Delete ${s.name as string}`}
                  disabled={busy}
                  onClick={() => onDelete(s.id as string)}
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

function FaqPanel({
  canEdit,
  faqs,
  onDelete,
  busy,
}: {
  canEdit: boolean;
  faqs: Row[];
  onDelete: (id: string) => void;
  busy: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveFaqAction, null);

  return (
    <div className="space-y-4">
      {state && !state.ok && <Alert tone="critical" title={state.message ?? 'That did not save'} />}

      {faqs.length === 0 ? (
        <p className="text-sm text-ink-subtle">
          No questions saved. Adding the questions you hear most makes calls much shorter.
        </p>
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

function PolicyPanel({
  canEdit,
  policies,
  onDelete,
  busy,
}: {
  canEdit: boolean;
  policies: Row[];
  onDelete: (id: string) => void;
  busy: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(savePolicyAction, null);

  return (
    <div className="space-y-4">
      {state && !state.ok && <Alert tone="critical" title={state.message ?? 'That did not save'} />}

      {policies.length === 0 ? (
        <p className="text-sm text-ink-subtle">
          No policies yet. A cancellation policy is the one callers ask about most.
        </p>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {policies.map((p) => (
            <li key={p.id as string} className="flex items-start justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">
                  {p.title as string}
                  <Badge tone="neutral" className="ml-2">
                    {String(p.kind).replace(/_/g, ' ')}
                  </Badge>
                </p>
                <p className="mt-0.5 text-sm text-ink-muted">{p.body as string}</p>
              </div>
              {canEdit && (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Delete policy"
                  disabled={busy}
                  onClick={() => onDelete(p.id as string)}
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
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Type" htmlFor="kind">
                <Select name="kind" defaultValue="cancellation">
                  {[
                    'cancellation',
                    'refunds',
                    'deposits',
                    'service_areas',
                    'emergency',
                    'warranty',
                    'financing',
                    'payment_methods',
                    'other',
                  ].map((k) => (
                    <option key={k} value={k}>
                      {k.replace(/_/g, ' ')}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Title" htmlFor="title" required error={state?.fields?.title}>
                <Input name="title" required placeholder="Cancellation policy" />
              </Field>
            </div>
            <Field label="What it says" htmlFor="body" required error={state?.fields?.body}>
              <Textarea name="body" rows={3} required />
            </Field>
            <div className="flex gap-2">
              <Button type="submit" loading={pending}>
                {pending ? 'Saving' : 'Add policy'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button variant="secondary" onClick={() => setAdding(true)}>
            <Plus aria-hidden /> Add a policy
          </Button>
        ))}
    </div>
  );
}

function AreaPanel({
  canEdit,
  areas,
  onDelete,
  busy,
}: {
  canEdit: boolean;
  areas: Row[];
  onDelete: (id: string) => void;
  busy: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState('postal_code');
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    saveServiceAreaAction,
    null,
  );

  return (
    <div className="space-y-4">
      {state && !state.ok && <Alert tone="critical" title={state.message ?? 'That did not save'} />}

      <p className="text-sm text-ink-muted">
        Your receptionist checks this before telling a caller they are covered. Distance-based areas
        cannot be verified automatically, so it will say a person will confirm.
      </p>

      {areas.length === 0 ? (
        <p className="text-sm text-ink-subtle">No service area set.</p>
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

function DocumentPanel({
  canEdit,
  documents,
  onDelete,
  busy,
}: {
  canEdit: boolean;
  documents: Row[];
  onDelete: (id: string) => void;
  busy: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ tone: 'positive' | 'critical' | 'caution'; text: string } | null>(
    null,
  );

  async function upload(file: File) {
    setUploading(true);
    setMessage(null);
    const body = new FormData();
    body.append('file', file);
    try {
      const res = await fetch('/api/knowledge/upload', { method: 'POST', body });
      const json = await res.json();
      if (!res.ok) {
        setMessage({ tone: 'critical', text: json?.error?.message ?? 'The upload failed.' });
      } else if (json.warning) {
        setMessage({ tone: 'caution', text: json.warning });
      } else {
        setMessage({
          tone: 'positive',
          text: `${json.filename} indexed into ${json.chunks} searchable section${json.chunks === 1 ? '' : 's'}.`,
        });
      }
      window.location.reload();
    } catch {
      setMessage({ tone: 'critical', text: 'The upload could not be completed.' });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-muted">
        Upload price lists, service sheets or FAQs. Your receptionist searches them during a call and
        can only ever see documents belonging to your business.
      </p>

      {message && (
        <Alert
          tone={message.tone}
          title={message.tone === 'critical' ? 'Upload problem' : message.tone === 'caution' ? 'Partly readable' : 'Uploaded'}
        >
          {message.text}
        </Alert>
      )}

      {documents.length === 0 ? (
        <p className="text-sm text-ink-subtle">No documents uploaded.</p>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {documents.map((d) => (
            <li key={d.id as string} className="flex items-center justify-between gap-3 p-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <FileText className="size-4 shrink-0 text-ink-faint" aria-hidden />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{d.filename as string}</p>
                  <p className="text-xs text-ink-subtle">
                    {Math.round((d.size_bytes as number) / 1024)} KB ·{' '}
                    {String(d.processing_status)}
                    {d.processing_error ? ` · ${d.processing_error as string}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  tone={
                    d.processing_status === 'ready'
                      ? 'positive'
                      : d.processing_status === 'failed'
                        ? 'critical'
                        : 'caution'
                  }
                >
                  {String(d.processing_status)}
                </Badge>
                {canEdit && (
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Delete ${d.filename as string}`}
                    disabled={busy}
                    onClick={() => onDelete(d.id as string)}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.txt,.csv,.md,.docx,application/pdf,text/plain,text/csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
            }}
          />
          <Button variant="secondary" loading={uploading} onClick={() => inputRef.current?.click()}>
            <Upload aria-hidden /> {uploading ? 'Uploading' : 'Upload a document'}
          </Button>
          <p className="text-xs text-ink-subtle">
            PDF, Word, plain text or CSV. Up to 25 MB. Scanned PDFs without selectable text cannot be
            read.
          </p>
        </>
      )}
    </div>
  );
}
