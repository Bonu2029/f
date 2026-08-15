/**
 * Lightweight inline-SVG charts.
 *
 * Deliberately dependency-free: these render on the server with no client
 * JavaScript, which matters because the dashboard is mostly read on phones.
 * Every value comes from the database — there are no placeholder series.
 */

export interface SeriesPoint {
  day: string;
  value: number;
}

function niceMax(values: number[]): number {
  const max = Math.max(1, ...values);
  const magnitude = 10 ** Math.floor(Math.log10(max));
  return Math.ceil(max / magnitude) * magnitude;
}

export function BarChart({
  data,
  label,
  height = 120,
  tone = 'brand',
}: {
  data: SeriesPoint[];
  label: string;
  height?: number;
  tone?: 'brand' | 'positive';
}) {
  if (data.length === 0) {
    return (
      <div
        className="grid place-items-center rounded-lg border border-dashed border-line text-xs text-ink-subtle"
        style={{ height }}
      >
        No data yet
      </div>
    );
  }

  const max = niceMax(data.map((d) => d.value));
  const barColor = tone === 'brand' ? 'var(--color-brand-600)' : 'var(--color-positive)';
  const width = 100;
  const gap = 100 / data.length / 6;
  const barWidth = 100 / data.length - gap;

  return (
    <figure>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
        role="img"
        aria-label={`${label}. ${data.map((d) => `${formatDay(d.day)}: ${d.value}`).join('. ')}`}
      >
        <line
          x1="0"
          y1={height - 0.5}
          x2={width}
          y2={height - 0.5}
          stroke="var(--color-line)"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
        {data.map((d, i) => {
          const h = max > 0 ? (d.value / max) * (height - 8) : 0;
          return (
            <rect
              key={d.day}
              x={i * (barWidth + gap)}
              y={height - h}
              width={barWidth}
              height={Math.max(h, d.value > 0 ? 1.5 : 0)}
              fill={barColor}
              rx="0.6"
            />
          );
        })}
      </svg>
      <figcaption className="mt-1.5 flex justify-between text-[11px] text-ink-subtle">
        <span>{formatDay(data[0]!.day)}</span>
        <span className="tabular">peak {max}</span>
        <span>{formatDay(data[data.length - 1]!.day)}</span>
      </figcaption>
    </figure>
  );
}

export function OutcomeBreakdown({
  outcomes,
}: {
  outcomes: Array<{ disposition: string; count: number }>;
}) {
  const total = outcomes.reduce((sum, o) => sum + o.count, 0);
  if (total === 0) {
    return <p className="py-6 text-center text-sm text-ink-subtle">No completed calls yet.</p>;
  }

  const palette = [
    'var(--color-brand-600)',
    'var(--color-brand-500)',
    'var(--color-positive)',
    'var(--color-caution)',
    'var(--color-brand-200)',
    'var(--color-line-strong)',
  ];

  return (
    <div className="space-y-3">
      <div
        className="flex h-2.5 overflow-hidden rounded-full"
        role="img"
        aria-label={outcomes.map((o) => `${labelFor(o.disposition)}: ${o.count}`).join(', ')}
      >
        {outcomes.map((o, i) => (
          <div
            key={o.disposition}
            style={{
              width: `${(o.count / total) * 100}%`,
              background: palette[i % palette.length],
            }}
          />
        ))}
      </div>
      <ul className="space-y-1.5">
        {outcomes.slice(0, 6).map((o, i) => (
          <li key={o.disposition} className="flex items-center gap-2 text-sm">
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: palette[i % palette.length] }}
            />
            <span className="flex-1 truncate text-ink-muted">{labelFor(o.disposition)}</span>
            <span className="tabular text-ink">{o.count}</span>
            <span className="w-10 text-right tabular text-xs text-ink-subtle">
              {Math.round((o.count / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function labelFor(disposition: string): string {
  const map: Record<string, string> = {
    lead_captured: 'Lead captured',
    appointment_booked: 'Appointment booked',
    question_answered: 'Question answered',
    transferred_to_human: 'Transferred to a person',
    spam: 'Spam',
    wrong_number: 'Wrong number',
    out_of_service_area: 'Outside service area',
    no_intent: 'No clear request',
    unresolved: 'Unresolved',
    unrecorded: 'Not categorised',
  };
  return map[disposition] ?? disposition.replace(/_/g, ' ');
}

function formatDay(day: string): string {
  const [, month, date] = day.split('-');
  return `${month}/${date}`;
}
