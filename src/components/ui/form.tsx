"use client";

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const FIELD =
  "w-full rounded-xl border border-line bg-surface px-3.5 text-[15px] text-ink transition placeholder:text-ink-muted focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/12 disabled:bg-sunken disabled:text-ink-muted";

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
  className,
  required,
}: {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  htmlFor?: string;
  className?: string;
  required?: boolean;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label htmlFor={htmlFor} className="block text-[13px] font-semibold text-ink-soft">
          {label}
          {required && <span className="ml-0.5 text-urgent-500">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-[12.5px] font-medium text-urgent-600">{error}</p>
      ) : hint ? (
        <p className="text-[12.5px] text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function Input({ className, invalid, ...rest }, ref) {
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(FIELD, "h-11", invalid && "border-urgent-500 focus:ring-urgent-500/15", className)}
        {...rest}
      />
    );
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, rows = 4, ...rest }, ref) {
    return <textarea ref={ref} rows={rows} className={cn(FIELD, "py-2.5 leading-relaxed", className)} {...rest} />;
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...rest }, ref) {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(FIELD, "h-11 appearance-none pr-9", className)}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
      </div>
    );
  },
);

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <label htmlFor={id} className="block text-[14.5px] font-medium text-ink">
          {label}
        </label>
        {description && <p className="mt-0.5 text-[13px] leading-relaxed text-ink-muted">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-50",
          checked ? "bg-brand-500" : "bg-line",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200",
            checked ? "translate-x-[22px]" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
  className,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn("flex w-full items-center gap-2.5 py-2 text-left", className)}
    >
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition",
          checked ? "border-brand-500 bg-brand-500 text-white" : "border-line bg-surface",
        )}
      >
        {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </span>
      <span className="text-[14.5px] text-ink">{label}</span>
    </button>
  );
}

/** Segmented control — used for tabs, view toggles and sort switches. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  className,
  ariaLabel,
}: {
  options: { value: T; label: ReactNode; icon?: ReactNode }[];
  value: T;
  onChange: (next: T) => void;
  size?: "sm" | "md";
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-1 rounded-xl bg-sunken p-1",
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-all duration-150",
              size === "sm" ? "h-8 px-3 text-[13px]" : "h-9 px-3.5 text-[13.5px]",
              active
                ? "bg-surface text-ink shadow-[0_1px_3px_rgba(22,22,42,0.1)]"
                : "text-ink-muted hover:text-ink",
            )}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** Filter chip / pill toggle. */
export function Chip({
  active,
  onClick,
  children,
  icon,
  className,
  as = "button",
  count,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
  as?: "button" | "span";
  count?: number;
}) {
  const cls = cn(
    "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-2 text-[13.5px] font-semibold transition-all duration-150",
    active
      ? "border-brand-500 bg-brand-500 text-white shadow-[0_1px_2px_rgba(108,77,255,0.35)]"
      : "border-line bg-surface text-ink-soft hover:border-brand-200 hover:text-ink",
    className,
  );
  if (as === "span") return <span className={cls}>{icon}{children}</span>;
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={cls}>
      {icon}
      {children}
      {count != null && count > 0 && (
        <span className={cn("rounded-full px-1.5 text-[11px]", active ? "bg-white/25" : "bg-sunken")}>
          {count}
        </span>
      )}
    </button>
  );
}
