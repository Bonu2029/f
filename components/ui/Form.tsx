'use client';

import { useId } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
  htmlFor,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={cn('w-full', className)}>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink"
      >
        {label}
        {required ? (
          <span className="text-xs font-normal text-muted">(required)</span>
        ) : null}
      </label>
      {hint ? <p className="mb-2 text-xs text-muted">{hint}</p> : null}
      {children}
      {error ? (
        <p className="mt-1.5 flex items-start gap-1.5 text-sm text-accent-deep">
          <span aria-hidden="true">•</span>
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

const controlClass =
  'w-full rounded-2xl border border-line bg-white px-4 py-3 text-[15px] text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-accent aria-[invalid=true]:border-accent-deep';

export function TextInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlClass, className)} {...props} />;
}

export function TextArea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea rows={4} className={cn(controlClass, 'resize-y', className)} {...props} />
  );
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(controlClass, 'appearance-none pr-10', className)} {...props}>
      {children}
    </select>
  );
}

/** Card-style radio group that stays a real fieldset + radio inputs. */
export function OptionCards<T extends string>({
  legend,
  legendHidden = false,
  name,
  options,
  value,
  onChange,
  columns = 2,
  size = 'md',
}: {
  legend: string;
  legendHidden?: boolean;
  name: string;
  options: { id: T; label: string; hint?: string }[];
  value: T | null;
  onChange: (value: T) => void;
  columns?: 1 | 2 | 3 | 4;
  size?: 'sm' | 'md';
}) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 lg:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
  }[columns];

  return (
    <fieldset>
      <legend
        className={cn(
          'mb-3 text-sm font-medium text-ink',
          legendHidden && 'sr-only',
        )}
      >
        {legend}
      </legend>
      <div className={cn('grid gap-3', gridCols)}>
        {options.map((option) => {
          const checked = value === option.id;
          return (
            <label
              key={option.id}
              className={cn(
                'group relative cursor-pointer rounded-2xl border bg-white transition-all duration-300 ease-luma hover:-translate-y-[1px] hover:shadow-soft',
                size === 'sm' ? 'p-3.5' : 'p-4',
                checked
                  ? 'border-accent bg-mint/25 shadow-soft'
                  : 'border-line hover:border-sage',
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.id}
                checked={checked}
                onChange={() => onChange(option.id)}
                className="peer sr-only"
              />
              <span className="flex items-start gap-3">
                <span
                  className={cn(
                    'mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full border transition-colors',
                    checked ? 'border-accent bg-accent' : 'border-line bg-white',
                  )}
                  aria-hidden="true"
                >
                  {checked ? (
                    <svg width="10" height="8" viewBox="0 0 10 8">
                      <path
                        d="M1 4.2 3.4 6.6 9 1"
                        fill="none"
                        stroke="#fff"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : null}
                </span>
                <span>
                  <span className="block text-[15px] font-medium text-ink">
                    {option.label}
                  </span>
                  {option.hint ? (
                    <span className="mt-0.5 block text-sm text-muted">
                      {option.hint}
                    </span>
                  ) : null}
                </span>
              </span>
              <span className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-accent/70 opacity-0 transition-opacity peer-focus-visible:opacity-100" />
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function ToggleChip({
  checked,
  onChange,
  label,
  hint,
  icon,
  price,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint?: string;
  icon?: ReactNode;
  price?: string;
}) {
  return (
    <label
      className={cn(
        'group relative flex cursor-pointer gap-3 rounded-2xl border bg-white p-4 transition-all duration-300 ease-luma hover:-translate-y-[1px] hover:shadow-soft',
        checked ? 'border-accent bg-mint/25 shadow-soft' : 'border-line hover:border-sage',
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      {icon ? (
        <span
          className={cn(
            'mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-xl transition-colors',
            checked ? 'bg-accent text-white' : 'bg-pearl text-accent',
          )}
          aria-hidden="true"
        >
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-3">
          <span className="text-[15px] font-medium text-ink">{label}</span>
          {price ? (
            <span className="flex-none text-sm text-muted">{price}</span>
          ) : null}
        </span>
        {hint ? (
          <span className="mt-0.5 block text-sm leading-snug text-muted">{hint}</span>
        ) : null}
      </span>
      <span
        className={cn(
          'mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-md border transition-colors',
          checked ? 'border-accent bg-accent' : 'border-line bg-white',
        )}
        aria-hidden="true"
      >
        {checked ? (
          <svg width="10" height="8" viewBox="0 0 10 8">
            <path
              d="M1 4.2 3.4 6.6 9 1"
              fill="none"
              stroke="#fff"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </span>
      <span className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-accent/70 opacity-0 transition-opacity peer-focus-visible:opacity-100" />
    </label>
  );
}

export function Counter({
  label,
  value,
  onChange,
  min = 0,
  max = 12,
  hint,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-white px-4 py-3">
      <div>
        <label htmlFor={id} className="text-[15px] font-medium text-ink">
          {label}
        </label>
        {hint ? <p className="text-sm text-muted">{hint}</p> : null}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink transition-colors hover:border-accent hover:bg-mint/30 disabled:opacity-40"
        >
          <span className="sr-only">Decrease {label}</span>
          <svg width="14" height="2" viewBox="0 0 14 2" aria-hidden="true">
            <path d="M0 1h14" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        </button>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          value={value}
          min={min}
          max={max}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (Number.isNaN(next)) return;
            onChange(Math.min(max, Math.max(min, next)));
          }}
          className="w-14 rounded-xl border border-line bg-pearl/50 py-2 text-center text-[15px] outline-none focus:border-accent"
        />
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink transition-colors hover:border-accent hover:bg-mint/30 disabled:opacity-40"
        >
          <span className="sr-only">Increase {label}</span>
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path d="M7 0v14M0 7h14" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
