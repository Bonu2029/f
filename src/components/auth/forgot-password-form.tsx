"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { forgotPasswordAction } from "@/lib/auth/actions";
import { emptyFormState } from "@/lib/validation/form";

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(
    forgotPasswordAction,
    emptyFormState,
  );

  if (state.ok && state.message) {
    return <Alert tone="success">{state.message}</Alert>;
  }

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.message ? <Alert tone="error">{state.message}</Alert> : null}

      <Field
        label="Email"
        htmlFor="email"
        error={state.fieldErrors?.email}
      >
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
        />
      </Field>

      <SubmitButton pendingLabel="Sending…">Send Reset Link</SubmitButton>
    </form>
  );
}
