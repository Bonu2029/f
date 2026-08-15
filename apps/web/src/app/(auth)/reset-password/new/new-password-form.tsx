'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Field, Input } from '@/components/ui';
import { updatePasswordAction } from '../../actions';
import type { ActionResult } from '@/lib/errors';

export function NewPasswordForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    updatePasswordAction,
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      const t = setTimeout(() => router.push('/dashboard'), 1200);
      return () => clearTimeout(t);
    }
  }, [state, router]);

  return (
    <form action={action} className="space-y-5" noValidate>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Choose a new password</h1>
        <p className="mt-1.5 text-sm text-ink-muted">At least 10 characters.</p>
      </div>

      {state?.ok && <Alert tone="positive" title="Password updated">Taking you to your dashboard…</Alert>}
      {state && !state.ok && <Alert tone="critical" title={state.message ?? 'That did not work'} />}

      <Field label="New password" htmlFor="password" required error={state?.fields?.password}>
        <Input name="password" type="password" autoComplete="new-password" required minLength={10} autoFocus />
      </Field>

      <Field label="Confirm password" htmlFor="confirm" required error={state?.fields?.confirm}>
        <Input name="confirm" type="password" autoComplete="new-password" required minLength={10} />
      </Field>

      <Button type="submit" size="lg" className="w-full" loading={pending}>
        {pending ? 'Updating' : 'Update password'}
      </Button>
    </form>
  );
}
