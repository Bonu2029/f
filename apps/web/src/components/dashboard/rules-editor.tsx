'use client';

import { useActionState, useState, useTransition } from 'react';
import { Lock, Plus, Trash2 } from 'lucide-react';
import { Alert, Badge, Button, Field, Input, Textarea } from '@/components/ui';
import { deleteRecordAction, saveRuleAction, toggleRuleAction } from '@/server/actions';
import type { ActionResult } from '@/lib/errors';

export interface RuleRow {
  id: string;
  title: string;
  instruction: string;
  enabled: boolean;
  is_system: boolean;
  priority: number;
}

/**
 * Rules the receptionist must follow. Built-in safety rules can be switched off
 * but not deleted, and that distinction is shown rather than hidden.
 */
export function RulesEditor({ rules, canEdit }: { rules: RuleRow[]; canEdit: boolean }) {
  const [adding, setAdding] = useState(false);
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveRuleAction, null);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string, enabled: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await toggleRuleAction(id, enabled);
      if (!result.ok) setError(result.message ?? 'That could not be changed.');
    });
  }

  function remove(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteRecordAction('ai_rules', id);
      if (!result.ok) setError(result.message ?? 'That could not be deleted.');
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-muted">
        These are read to your receptionist on every call. Safety rules are always applied first.
      </p>

      {error && <Alert tone="critical" title={error} />}
      {state?.ok && <Alert tone="positive" title={state.message ?? 'Rule saved'} />}
      {state && !state.ok && <Alert tone="critical" title={state.message ?? 'That did not save'} />}

      <ul className="divide-y divide-line rounded-lg border border-line">
        {rules.map((rule) => (
          <li key={rule.id} className="flex items-start gap-3 p-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-ink">{rule.title}</p>
                {rule.is_system && (
                  <Badge tone="neutral">
                    <Lock className="size-2.5" aria-hidden />
                    Built in
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 text-sm text-ink-muted">{rule.instruction}</p>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                role="switch"
                aria-checked={rule.enabled}
                aria-label={`${rule.enabled ? 'Disable' : 'Enable'} rule: ${rule.title}`}
                disabled={!canEdit || busy}
                onClick={() => toggle(rule.id, !rule.enabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors disabled:opacity-50 ${
                  rule.enabled ? 'bg-brand-600' : 'bg-line-strong'
                }`}
              >
                <span
                  className={`pointer-events-none block size-5 rounded-full bg-white shadow transition-transform ${
                    rule.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              {canEdit && !rule.is_system && (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Delete rule: ${rule.title}`}
                  disabled={busy}
                  onClick={() => remove(rule.id)}
                >
                  <Trash2 aria-hidden />
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {canEdit &&
        (adding ? (
          <form action={action} className="space-y-3 rounded-lg border border-line p-4">
            <Field label="Rule name" htmlFor="title" required error={state?.fields?.title}>
              <Input name="title" placeholder="Never quote a roof without an inspection" required />
            </Field>
            <Field
              label="What the receptionist should do"
              htmlFor="instruction"
              required
              error={state?.fields?.instruction}
            >
              <Textarea
                name="instruction"
                rows={2}
                placeholder="If a caller asks for a roofing price, explain that we need to inspect the roof first and offer to book an inspection."
                required
              />
            </Field>
            <input type="hidden" name="priority" value="200" />
            <div className="flex gap-2">
              <Button type="submit" loading={pending}>
                {pending ? 'Adding' : 'Add rule'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button variant="secondary" onClick={() => setAdding(true)}>
            <Plus aria-hidden /> Add a rule
          </Button>
        ))}
    </div>
  );
}
