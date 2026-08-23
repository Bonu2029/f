"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { CopyButton } from "@/components/dashboard/copy-button";
import {
  activateTagAction,
  type ActivateTagState,
} from "@/lib/data/tags-actions";
import { brand, tagUrl, tagUrlDisplay } from "@/config/brand";

export function ActivateTagForm({
  defaultCode,
  today,
}: {
  defaultCode?: string;
  today: string;
}) {
  const initialState: ActivateTagState = { ok: false };
  const [state, formAction] = useActionState(activateTagAction, initialState);
  const errors = state.fieldErrors ?? {};

  if (state.ok && state.code) {
    return (
      <div className="rounded-2xl border border-line bg-white p-7 shadow-soft">
        <h2 className="text-xl font-semibold text-ink-950">Tag activated</h2>
        <p className="mt-2 text-[0.9375rem] text-ink-700">
          Write this link to the NFC chip. It never changes, so you can update
          the installation details any time.
        </p>

        {state.message ? (
          <div className="mt-4">
            <Alert tone="info">{state.message}</Alert>
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface-muted px-4 py-3">
          <code className="font-mono text-sm text-ink-950">
            {tagUrlDisplay(state.code)}
          </code>
          <CopyButton value={tagUrl(state.code)} label="Copy URL" />
        </div>

        <div className="mt-5 flex items-center gap-4 rounded-xl border border-line p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/t/${state.code}/qr`}
            alt={`QR code for tag ${state.code}`}
            width={96}
            height={96}
            className="size-24 shrink-0 rounded-lg"
          />
          <p className="text-sm text-ink-700">
            The same link also works as a QR code, so customers have a backup if
            their phone can&rsquo;t read NFC.
          </p>
        </div>

        <div className="mt-7 flex flex-wrap gap-3">
          <ButtonLink href={`/t/${state.code}`}>View customer page</ButtonLink>
          <ButtonLink href="/dashboard/tags" variant="secondary">
            Back to tags
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-6 rounded-2xl border border-line bg-white p-6 shadow-soft sm:p-8"
      noValidate
    >
      {state.message ? <Alert tone="error">{state.message}</Alert> : null}

      <Field
        label="Tag ID"
        htmlFor="code"
        hint={`Printed on the ${brand.tagNoun}.`}
        error={errors.code}
      >
        <Input
          id="code"
          name="code"
          defaultValue={defaultCode}
          placeholder="AB72KD"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          className="font-mono uppercase"
          required
        />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          label="Customer Name"
          htmlFor="customerName"
          error={errors.customerName}
          className="sm:col-span-2"
        >
          <Input id="customerName" name="customerName" required />
        </Field>

        <Field
          label="Customer Phone"
          htmlFor="customerPhone"
          optional
          error={errors.customerPhone}
        >
          <Input id="customerPhone" name="customerPhone" type="tel" inputMode="tel" />
        </Field>

        <Field
          label="Customer Email"
          htmlFor="customerEmail"
          optional
          error={errors.customerEmail}
        >
          <Input id="customerEmail" name="customerEmail" type="email" inputMode="email" />
        </Field>
      </div>

      <Field
        label="Product / Equipment"
        htmlFor="productName"
        hint="What you installed, e.g. Water Heater."
        error={errors.productName}
      >
        <Input id="productName" name="productName" required />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          label="Installation Date"
          htmlFor="installedOn"
          error={errors.installedOn}
        >
          <Input
            id="installedOn"
            name="installedOn"
            type="date"
            defaultValue={today}
            required
          />
        </Field>

        <Field
          label="Warranty Expiration"
          htmlFor="warrantyExpiresOn"
          optional
          error={errors.warrantyExpiresOn}
        >
          <Input id="warrantyExpiresOn" name="warrantyExpiresOn" type="date" />
        </Field>
      </div>

      <Field
        label="Notes"
        htmlFor="notes"
        optional
        hint="Only you can see this. It never appears on the customer's page."
        error={errors.notes}
      >
        <Textarea id="notes" name="notes" />
      </Field>

      <div className="flex flex-col gap-3 border-t border-line pt-6 sm:flex-row-reverse">
        <SubmitButton pendingLabel="Activating…" fullWidth={false}>
          Activate Tag
        </SubmitButton>
        <Link
          href="/dashboard/tags"
          className="inline-flex h-13 items-center justify-center rounded-full px-5 text-[0.9375rem] font-medium text-ink-700 hover:text-ink-950"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
