"use client";

import { useId, useState } from "react";
import { Field } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Optional photo for a service request.
 *
 * The file goes straight to storage from the browser; only the resulting
 * object path is submitted with the form, so the request payload stays small
 * on a phone connection.
 */
export function PhotoField({ code }: { code: string }) {
  const inputId = useId();
  const [state, setState] = useState<"idle" | "uploading" | "done" | "error">(
    "idle",
  );
  const [path, setPath] = useState("");
  const [fileName, setFileName] = useState("");

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setState("idle");
      setPath("");
      return;
    }

    if (file.size > MAX_BYTES) {
      setState("error");
      setPath("");
      return;
    }

    setFileName(file.name);

    if (!isSupabaseConfigured) {
      // Demo mode: accept the choice without uploading anywhere.
      setState("done");
      return;
    }

    setState("uploading");

    const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const objectPath = `${code}/${crypto.randomUUID()}.${extension}`;

    const supabase = createClient();
    const { error } = await supabase.storage
      .from("request-photos")
      .upload(objectPath, file, { contentType: file.type, upsert: false });

    if (error) {
      setState("error");
      setPath("");
      return;
    }

    setPath(objectPath);
    setState("done");
  }

  const hint =
    state === "uploading"
      ? "Uploading…"
      : state === "done"
        ? `Attached: ${fileName}`
        : state === "error"
          ? "That photo couldn't be attached. You can send the request without it."
          : "Helps them come prepared.";

  return (
    <Field label="Photo" htmlFor={inputId} optional hint={hint}>
      <input type="hidden" name="photoUrl" value={path} />
      <input
        id={inputId}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        className="w-full rounded-xl border border-dashed border-line-strong bg-surface-muted px-3.5 py-3 text-sm text-ink-700 file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-1.5 file:text-sm file:font-medium file:text-ink-950"
      />
    </Field>
  );
}
