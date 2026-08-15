'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { Alert, Button, Field, Input } from '@/components/ui';
import { requestPasswordResetAction } from '../actions';
import type { ActionResult } from '@/lib/errors';

export function ResetRequestForm() {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    requestPasswordResetAction,
    null,
  );

  return (
    <form action={action} className="space-y-5" noValidate>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Reset your password</h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Enter the email you signed up with and we&rsquo;ll send a reset link.
        </p>
      </div>

      {state?.ok && <Alert tone="positive" title="Check your email">{state.message}</Alert>}
      {state && !state.ok && <Alert tone="critical" title={state.message ?? 'That did not work'} />}

      <Field label="Email" htmlFor="email" required error={state?.fields?.email}>
        <Input name="email" type="email" autoComplete="email" required autoFocus />
      </Field>

      <Button type="submit" size="lg" className="w-full" loading={pending}>
        {pending ? 'Sending' : 'Send reset link'}
      </Button>

      <p className="text-center text-sm">
        <Link href="/login" className="text-ink-muted hover:text-ink">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
