"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { logInAction } from "@/lib/auth/actions";
import { emptyFormState } from "@/lib/validation/form";

export function LogInForm({ notice }: { notice?: string }) {
  const [state, formAction] = useActionState(logInAction, emptyFormState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {notice ? <Alert tone="info">{notice}</Alert> : null}
      {state.message ? <Alert tone="error">{state.message}</Alert> : null}

      <Field label="Email" htmlFor="email" error={errors.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
        />
      </Field>

      <div>
        <Field label="Password" htmlFor="password" error={errors.password}>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </Field>
        <div className="mt-2 text-right">
          <Link
            href="/forgot-password"
            className="text-sm text-ink-700 underline-offset-4 hover:text-ink-950 hover:underline"
          >
            Forgot password?
          </Link>
        </div>
      </div>

      <SubmitButton pendingLabel="Logging in…">Log In</SubmitButton>
    </form>
  );
}
