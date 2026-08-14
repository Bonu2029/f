"use client";

import { cn } from "@/lib/utils";

/**
 * Small, dependency-free charts.
 *
 * The dashboard needs four shapes (trend, comparison, share, distribution) and
 * nothing more, so they're drawn as inline SVG: no chart library in the bundle,
 * and every colour comes from the same design tokens as the rest of the UI.
 */

export interface Point {
  label: string;
  value: number;
  /** Secondary series, drawn as a lighter overlay. */
  compare?: number;
}

export function BarChart({
  data,
  height = 160,
  formatValue = (n) => `${n}`,
  tone = "brand",
  className,
}: {
  data: Point[];
  height?: number;
  formatValue?: (value: number) => string;
  tone?: "brand" | "live";
  className?: string;
}) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.value, d.compare ?? 0)));
  const fill = tone === "live" ? "bg-live-500" : "bg-brand-500";

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-end gap-1.5" style={{ height }}>
        {data.map((d) => (
          <div key={d.label} className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[10.5px] font-semibold text-ink opacity-0 transition group-hover:opacity-100">
              {formatValue(d.value)}
            </span>
            {d.compare != null && (
              <span
                className="w-full rounded-t-[3px] bg-line"
                style={{ height: `${(d.compare / max) * (height - 34)}px` }}
                aria-hidden="true"
              />
            )}
            <span
              className={cn("w-full rounded-t-[4px] transition-opacity group-hover:opacity-90", fill)}
              style={{ height: `${Math.max(2, (d.value / max) * (height - 34))}px` }}
              role="img"
              aria-label={`${d.label}: ${formatValue(d.value)}`}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1.5">
        {data.map((d) => (
          <span key={d.label} className="min-w-0 flex-1 truncate text-center text-[10.5px] text-ink-muted">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function LineChart({
  data,
  height = 150,
  formatValue = (n) => `${n}`,
  className,
}: {
  data: Point[];
  height?: number;
  formatValue?: (value: number) => string;
  className?: string;
}) {
  if (data.length < 2) return null;
  const max = Math.max(1, ...data.map((d) => d.value));
  const w = 100;
  const h = 100;
  const points = data.map((d, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - (d.value / max) * (h - 8) - 4,
  }));
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;

  return (
    <div className={cn("w-full", className)}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        style={{ height }}
        className="w-full overflow-visible"
        role="img"
        aria-label={`Trend from ${formatValue(data[0].value)} to ${formatValue(data[data.length - 1].value)}`}
      >
        <defs>
          <linearGradient id="now-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6C4DFF" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#6C4DFF" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#now-area)" />
        <path
          d={line}
          fill="none"
          stroke="#6C4DFF"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="1.6"
            fill="#fff"
            stroke="#6C4DFF"
            strokeWidth="1.6"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      <div className="mt-1.5 flex justify-between text-[10.5px] text-ink-muted">
        <span>{data[0].label}</span>
        <span>{data[data.length - 1].label}</span>
      </div>
    </div>
  );
}

export function RankedBars({
  data,
  formatValue = (n) => `${n}`,
  className,
}: {
  data: Point[];
  formatValue?: (value: number) => string;
  className?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className={cn("space-y-2.5", className)}>
      {data.map((d) => (
        <li key={d.label}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate text-[13.5px] text-ink">{d.label}</span>
            <span className="shrink-0 text-[13px] font-semibold tabular-nums text-ink">
              {formatValue(d.value)}
            </span>
          </div>
          <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-sunken">
            <span
              className="block h-full rounded-full bg-brand-500"
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Donut used for fill rate and cancellation rate. */
export function Donut({
  value,
  label,
  tone = "brand",
  size = 108,
}: {
  /** 0–1 */
  value: number;
  label: string;
  tone?: "brand" | "live" | "urgent";
  size?: number;
}) {
  const stroke = tone === "live" ? "#0F9F5A" : tone === "urgent" ? "#F2542D" : "#6C4DFF";
  const r = 42;
  const circumference = 2 * Math.PI * r;
  const filled = Math.min(1, Math.max(0, value)) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`${label}: ${Math.round(value * 100)}%`}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="#EDEBE3" strokeWidth="10" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          transform="rotate(-90 50 50)"
        />
        <text
          x="50"
          y="54"
          textAnchor="middle"
          className="fill-ink"
          style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em" }}
        >
          {Math.round(value * 100)}%
        </text>
      </svg>
      <p className="mt-1.5 text-[12.5px] text-ink-muted">{label}</p>
    </div>
  );
}
