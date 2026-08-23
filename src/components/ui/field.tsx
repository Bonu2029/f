import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded-xl border border-line-strong bg-white px-3.5 py-2.5 text-[0.9375rem] " +
  "text-ink-950 placeholder:text-ink-400 transition-colors " +
  "focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/12 " +
  "disabled:bg-surface-muted disabled:text-ink-500";

export function Field({
  label,
  htmlFor,
  hint,
  optional,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  optional?: boolean;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="flex items-baseline gap-2 text-sm font-medium text-ink-900"
      >
        {label}
        {optional ? (
          <span className="text-xs font-normal text-ink-400">Optional</span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-ink-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea className={cn(control, "min-h-28 resize-y", className)} {...props} />
  );
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={cn(control, "appearance-none pr-9", className)} {...props}>
      {children}
    </select>
  );
}
