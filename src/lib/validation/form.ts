import type { ZodType } from "zod";

/** Shape returned by every server action, consumed by useActionState. */
export type FormState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export const emptyFormState: FormState = { ok: false };

/**
 * Validates FormData against a schema and flattens Zod issues into a map the
 * form components can render field by field.
 */
export function parseForm<T>(
  schema: ZodType<T>,
  formData: FormData,
): { data: T; errors?: never } | { data?: never; errors: FormState } {
  const raw: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") raw[key] = value;
  }

  const result = schema.safeParse(raw);

  if (result.success) return { data: result.data };

  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "form");
    fieldErrors[key] ??= issue.message;
  }

  return {
    errors: {
      ok: false,
      message: "Please check the highlighted fields.",
      fieldErrors,
    },
  };
}
