'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MailCheck } from 'lucide-react';
import { Alert, Button, Field, Input } from '@/components/ui';
import { signupAction } from '../actions';
import type { ActionResult } from '@/lib/errors';

export function SignupForm({ founderAvailable }: { founderAvailable: boolean }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(signupAction, null);

  // When email confirmation is disabled the user already has a session — go
  // straight to organisation setup instead of asking them to check their inbox.
  useEffect(() => {
    if (state?.ok && (state.data as { verified?: boolean } | undefined)?.verified) {
      router.push('/onboarding/start');
    }
  }, [state, router]);

  if (state?.ok && !(state.data as { verified?: boolean } | undefined)?.verified) {
    return (
      <div className="rounded-card border border-line bg-surface p-6 text-center shadow-soft">
        <MailCheck className="mx-auto size-8 text-brand-600" aria-hidden />
        <h1 className="mt-4 text-xl font-semibold text-ink">Check your email</h1>
        <p className="mt-2 text-sm text-ink-muted">
          We sent a verification link to confirm your address. Open it and you&rsquo;ll come straight
          back here to set up your receptionist.
        </p>
        <p className="mt-4 text-xs text-ink-subtle">
          Nothing in your inbox after a minute? Check spam, or{' '}
          <Link href="/login" className="font-medium text-brand-600 hover:underline">
            try signing in
          </Link>
          .
        </p>
      </div>
    );
  }

  const fields = state?.fields ?? {};

  return (
    <form action={action} className="space-y-5" noValidate>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Create your account</h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          {founderAvailable
            ? 'Founding Member pricing is applied at checkout while spots remain.'
            : 'Set up your AI receptionist in a few minutes.'}
        </p>
      </div>

      {state && !state.ok && (
        <Alert tone="critical" title={state.message ?? 'That did not work'}>
          {state.action && <p>{state.action}</p>}
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" htmlFor="first_name" required error={fields.first_name}>
          <Input name="first_name" autoComplete="given-name" required />
        </Field>
        <Field label="Last name" htmlFor="last_name" required error={fields.last_name}>
          <Input name="last_name" autoComplete="family-name" required />
        </Field>
      </div>

      <Field label="Business name" htmlFor="business_name" required error={fields.business_name}>
        <Input name="business_name" autoComplete="organization" placeholder="Daniel's HVAC" required />
      </Field>

      <Field label="Work email" htmlFor="email" required error={fields.email}>
        <Input name="email" type="email" autoComplete="email" inputMode="email" required />
      </Field>

      <Field
        label="Password"
        htmlFor="password"
        required
        hint="At least 10 characters."
        error={fields.password}
      >
        <Input name="password" type="password" autoComplete="new-password" required minLength={10} />
      </Field>

      <label className="flex items-start gap-2.5 text-sm text-ink-muted">
        <input
          type="checkbox"
          name="accept_terms"
          required
          className="mt-0.5 size-4 rounded border-line-strong text-brand-600"
        />
        <span>
          I agree to the{' '}
          <Link href="/legal/terms" className="font-medium text-brand-600 hover:underline">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/legal/privacy" className="font-medium text-brand-600 hover:underline">
            Privacy Policy
          </Link>
          .
        </span>
      </label>
      {fields.accept_terms && (
        <p role="alert" className="text-xs font-medium text-critical">
          {fields.accept_terms}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" loading={pending}>
        {pending ? 'Creating your account' : 'Create account'}
      </Button>

      <p className="text-center text-sm text-ink-muted">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-brand-600 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
