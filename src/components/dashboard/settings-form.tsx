"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { updateBusinessAction } from "@/lib/data/settings-actions";
import { emptyFormState } from "@/lib/validation/form";
import { businessTypes } from "@/config/business-types";
import type { Business } from "@/lib/supabase/types";

export function SettingsForm({ business }: { business: Business }) {
  const [state, formAction] = useActionState(updateBusinessAction, emptyFormState);
  const errors = state.fieldErrors ?? {};

  return (
    <form
      action={formAction}
      className="space-y-6 rounded-2xl border border-line bg-white p-6 shadow-soft sm:p-8"
      noValidate
    >
      {state.message ? (
        <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>
      ) : null}

      <Field label="Business Name" htmlFor="name" error={errors.name}>
        <Input id="name" name="name" defaultValue={business.name} required />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Business Type" htmlFor="businessType" error={errors.businessType}>
          <Select
            id="businessType"
            name="businessType"
            defaultValue={
              businessTypes.includes(
                business.business_type as (typeof businessTypes)[number],
              )
                ? business.business_type
                : "Other"
            }
          >
            {businessTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Phone Number"
          htmlFor="phone"
          hint="Shown on your tag pages."
          error={errors.phone}
        >
          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            defaultValue={business.phone ?? ""}
            required
          />
        </Field>
      </div>

      <Field label="Email" htmlFor="email" error={errors.email}>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          defaultValue={business.email ?? ""}
          required
        />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Website" htmlFor="website" optional error={errors.website}>
          <Input
            id="website"
            name="website"
            type="url"
            inputMode="url"
            placeholder="https://"
            defaultValue={business.website ?? ""}
          />
        </Field>

        <Field
          label="Booking Link"
          htmlFor="bookingUrl"
          optional
          hint="Powers the Book Appointment button."
          error={errors.bookingUrl}
        >
          <Input
            id="bookingUrl"
            name="bookingUrl"
            type="url"
            inputMode="url"
            placeholder="https://"
            defaultValue={business.booking_url ?? ""}
          />
        </Field>
      </div>

      <Field
        label="About"
        htmlFor="about"
        optional
        hint="One or two lines about your business, shown to customers."
        error={errors.about}
      >
        <Textarea id="about" name="about" defaultValue={business.about ?? ""} />
      </Field>

      <div className="border-t border-line pt-6">
        <SubmitButton pendingLabel="Saving…" fullWidth={false}>
          Save Changes
        </SubmitButton>
      </div>
    </form>
  );
}
