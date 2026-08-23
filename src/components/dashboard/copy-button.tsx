"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

/** Copies a tag URL to the clipboard with a short confirmation. */
export function CopyButton({
  value,
  label = "Copy link",
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        "rounded-lg px-2.5 py-1.5 text-sm font-medium text-ink-700 transition-colors hover:bg-surface-muted hover:text-ink-950",
        className,
      )}
    >
      {copied ? "Copied" : label}
    </button>
  );
}
