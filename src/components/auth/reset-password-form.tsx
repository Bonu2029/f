"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { resetPasswordAction } from "@/lib/auth/actions";
import { emptyFormState } from "@/lib/validation/form";

export function ResetPasswordForm() {
  const [state, formAction] = useActionState(resetPasswordAction, emptyFormState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.message ? <Alert tone="error">{state.message}</Alert> : null}

      <Field
        label="New Password"
        htmlFor="password"
        hint="At least 8 characters."
        error={errors.password}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>

      <Field
        label="Confirm Password"
        htmlFor="confirmPassword"
        error={errors.confirmPassword}
      >
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>

      <SubmitButton pendingLabel="Saving…">Save Password</SubmitButton>
    </form>
  );
}
