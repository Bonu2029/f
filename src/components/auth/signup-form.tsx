"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Field, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { signUpAction } from "@/lib/auth/actions";
import { emptyFormState } from "@/lib/validation/form";
import { businessTypes } from "@/config/business-types";
import type { PlanId } from "@/config/pricing";

export function SignUpForm({ plan }: { plan: PlanId }) {
  const [state, formAction] = useActionState(signUpAction, emptyFormState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <input type="hidden" name="plan" value={plan} />

      {state.message ? (
        <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>
      ) : null}

      <Field label="Business Name" htmlFor="businessName" error={errors.businessName}>
        <Input
          id="businessName"
          name="businessName"
          autoComplete="organization"
          placeholder="ABC Plumbing"
          required
        />
      </Field>

      <Field label="Owner Name" htmlFor="ownerName" error={errors.ownerName}>
        <Input id="ownerName" name="ownerName" autoComplete="name" required />
      </Field>

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

      <Field
        label="Password"
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

      <Field label="Phone Number" htmlFor="phone" error={errors.phone}>
        <Input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          placeholder="(555) 010-4477"
          required
        />
      </Field>

      <Field label="Business Type" htmlFor="businessType" error={errors.businessType}>
        <Select id="businessType" name="businessType" defaultValue="" required>
          <option value="" disabled>
            Choose one
          </option>
          {businessTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Website" htmlFor="website" optional error={errors.website}>
        <Input
          id="website"
          name="website"
          type="url"
          inputMode="url"
          placeholder="https://"
        />
      </Field>

      <SubmitButton pendingLabel="Creating account…">Create Account</SubmitButton>

      <p className="text-center text-xs leading-relaxed text-ink-500">
        By creating an account you agree to our{" "}
        <Link href="/terms" className="underline underline-offset-2">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline underline-offset-2">
          Privacy
        </Link>
        .
      </p>
    </form>
  );
}
