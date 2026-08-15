import Link from 'next/link';
import { Check } from 'lucide-react';
import type { OnboardingStep } from '@afd/shared';
import { cn } from '@/lib/cn';

/**
 * Wizard progress. Completed steps stay clickable so an owner can go back and
 * change an answer without losing their place.
 */
export function OnboardingProgress({
  steps,
  current,
}: {
  steps: readonly OnboardingStep[];
  current: number;
}) {
  const pct = Math.round(((current - 1) / (steps.length - 1)) * 100);

  return (
    <nav aria-label="Setup progress">
      {/* Compact bar on small screens. */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-ink">
            Step {current} of {steps.length}
          </span>
          <span className="text-ink-subtle">{steps[current - 1]?.label}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
          <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <ol className="hidden items-center gap-1 sm:flex">
        {steps.map((step, i) => {
          const done = step.index < current;
          const active = step.index === current;
          const reachable = step.index <= current;

          const label = (
            <span
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition-colors',
                active && 'bg-brand-50 text-brand-700',
                done && 'text-ink-muted hover:bg-surface-sunken',
                !done && !active && 'text-ink-faint',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'grid size-4 shrink-0 place-items-center rounded-full text-[9px] font-bold',
                  done && 'bg-positive text-white',
                  active && 'bg-brand-600 text-white',
                  !done && !active && 'border border-line-strong text-ink-faint',
                )}
              >
                {done ? <Check className="size-2.5" /> : step.index}
              </span>
              {step.label}
            </span>
          );

          return (
            <li key={step.slug} className="flex items-center">
              {reachable && !active ? (
                <Link href={`/onboarding/${step.slug}`} aria-current={undefined}>
                  {label}
                </Link>
              ) : (
                <span aria-current={active ? 'step' : undefined}>{label}</span>
              )}
              {i < steps.length - 1 && (
                <span aria-hidden className="mx-0.5 h-px w-3 bg-line-strong" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
