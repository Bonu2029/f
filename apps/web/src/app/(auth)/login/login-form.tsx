'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Alert, Button, Field, Input } from '@/components/ui';
import { loginAction } from '../actions';
import type { ActionResult } from '@/lib/errors';

export function LoginForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(loginAction, null);

  useEffect(() => {
    if (state?.ok) {
      router.push('/dashboard');
      router.refresh();
    }
  }, [state, router]);

  const fields = state?.fields ?? {};

  return (
    <form action={action} className="space-y-5" noValidate>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Sign in</h1>
        <p className="mt-1.5 text-sm text-ink-muted">Welcome back.</p>
      </div>

      {state && !state.ok && (
        <Alert tone="critical" title={state.message ?? 'Sign in failed'}>
          {state.code === 'rate_limited' && <p>Wait a moment before trying again.</p>}
        </Alert>
      )}

      <Field label="Email" htmlFor="email" required error={fields.email}>
        <Input name="email" type="email" autoComplete="email" inputMode="email" required autoFocus />
      </Field>

      <Field label="Password" htmlFor="password" required error={fields.password}>
        <Input name="password" type="password" autoComplete="current-password" required />
      </Field>

      <Button type="submit" size="lg" className="w-full" loading={pending}>
        {pending ? 'Signing in' : 'Sign in'}
      </Button>

      <div className="flex items-center justify-between text-sm">
        <Link href="/reset-password" className="text-ink-muted hover:text-ink">
          Forgot password?
        </Link>
        <Link href="/signup" className="font-medium text-brand-600 hover:underline">
          Create an account
        </Link>
      </div>
    </form>
  );
}
