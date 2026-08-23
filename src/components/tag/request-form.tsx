"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Field, Input, Textarea } from "@/components/ui/field";
import { PhotoField } from "@/components/tag/photo-field";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  submitServiceRequestAction,
  type ServiceRequestState,
} from "@/lib/data/public-actions";
import type { ServiceRequestKind } from "@/lib/supabase/types";

export function RequestForm({
  code,
  businessName,
  kind,
}: {
  code: string;
  businessName: string;
  kind: ServiceRequestKind;
}) {
  const initialState: ServiceRequestState = { ok: false };
  const [state, formAction] = useActionState(
    submitServiceRequestAction,
    initialState,
  );
  const errors = state.fieldErrors ?? {};

  if (state.ok) {
    return (
      <div className="rounded-2xl border border-line bg-white p-7 text-center">
        <div
          aria-hidden
          className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-50 text-emerald-600"
        >
          <svg viewBox="0 0 20 20" className="size-6" fill="none">
            <path
              d="m4.5 10.5 3.5 3.5 7.5-8"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h2 className="mt-4 text-lg font-semibold text-ink-950">
          Request sent to {state.businessName ?? businessName}.
        </h2>
        <p className="mt-2 text-[0.9375rem] text-ink-700">
          They&rsquo;ll get in touch with you soon.
        </p>

        {state.message ? (
          <div className="mt-5 text-left">
            <Alert tone="info">{state.message}</Alert>
          </div>
        ) : null}

        <Link
          href={`/t/${code}`}
          className="mt-7 inline-flex h-12 items-center justify-center rounded-2xl border border-line-strong px-6 text-[0.9375rem] font-medium text-ink-950 hover:bg-surface-muted"
        >
          Back
        </Link>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-5 rounded-2xl border border-line bg-white p-6"
      noValidate
    >
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="kind" value={kind} />

      {state.message ? <Alert tone="error">{state.message}</Alert> : null}

      <Field label="Name" htmlFor="name" error={errors.name}>
        <Input id="name" name="name" autoComplete="name" required />
      </Field>

      <Field label="Phone Number" htmlFor="phone" error={errors.phone}>
        <Input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
        />
      </Field>

      <Field
        label="What do you need help with?"
        htmlFor="message"
        error={errors.message}
      >
        <Textarea
          id="message"
          name="message"
          placeholder="Tell them what's going on."
          required
        />
      </Field>

      <PhotoField code={code} />

      <SubmitButton pendingLabel="Sending…">Send Request</SubmitButton>

      <p className="text-center text-xs text-ink-500">
        No account needed. Your details go straight to {businessName}.
      </p>
    </form>
  );
}
