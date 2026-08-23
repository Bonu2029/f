import type { ReactNode } from "react";

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div>
      <div className="rounded-3xl border border-line bg-white p-7 shadow-soft sm:p-9">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-950">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2 text-[0.9375rem] text-ink-700">{subtitle}</p>
        ) : null}
        <div className="mt-7">{children}</div>
      </div>
      {footer ? (
        <div className="mt-5 text-center text-sm text-ink-700">{footer}</div>
      ) : null}
    </div>
  );
}
