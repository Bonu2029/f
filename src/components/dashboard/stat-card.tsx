export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-soft">
      <p className="text-sm text-ink-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-ink-950 tabular-nums">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-ink-400">{hint}</p> : null}
    </div>
  );
}
