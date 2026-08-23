import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-line-strong bg-surface-muted px-6 py-16 text-center">
      <h2 className="text-lg font-semibold text-ink-950">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-[0.9375rem] text-ink-700">
        {description}
      </p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
