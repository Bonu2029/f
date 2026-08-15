import { ArrowUpRight, CalendarCheck, PhoneCall, Users } from 'lucide-react';

/**
 * A static rendering of the real dashboard layout, used as the hero visual.
 *
 * The numbers here are illustrative and the panel is labelled as an example.
 * It is built from the same components and spacing as the signed-in dashboard,
 * so what a visitor sees is genuinely what they get — no invented screenshot.
 */
export function DashboardPreview() {
  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface shadow-lift">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-line-strong" aria-hidden />
          <span className="size-2.5 rounded-full bg-line-strong" aria-hidden />
          <span className="size-2.5 rounded-full bg-line-strong" aria-hidden />
        </div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
          Example dashboard
        </p>
      </div>

      <div className="space-y-4 p-4">
        <div>
          <p className="text-sm font-semibold text-ink">Good morning, Daniel</p>
          <p className="text-xs text-ink-subtle">Here is what your receptionist handled this month.</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: PhoneCall, label: 'Calls answered', value: '143' },
            { icon: Users, label: 'Leads captured', value: '38' },
            { icon: CalendarCheck, label: 'Appointments', value: '17' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-lg border border-line bg-surface-sunken p-3">
              <Icon className="size-3.5 text-ink-faint" aria-hidden />
              <p className="mt-2 text-lg font-semibold leading-none text-ink tabular">{value}</p>
              <p className="mt-1 text-[10px] leading-tight text-ink-subtle">{label}</p>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-line p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-ink">Minutes used</span>
            <span className="text-ink-subtle tabular">143 / 200</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
            <div className="h-full w-[71.5%] rounded-full bg-brand-600" />
          </div>
        </div>

        <div className="rounded-lg border border-line">
          <div className="flex items-center justify-between border-b border-line px-3 py-2">
            <p className="text-xs font-semibold text-ink">Recent calls</p>
            <ArrowUpRight className="size-3 text-ink-faint" aria-hidden />
          </div>
          <ul className="divide-y divide-line text-xs">
            {[
              ['(215) 555-0143', 'AC not cooling', 'Booked'],
              ['(267) 555-0119', 'Quote request', 'Lead'],
              ['(215) 555-0188', 'Wants the owner', 'Transferred'],
            ].map(([phone, reason, result]) => (
              <li key={phone} className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="truncate text-ink tabular">{phone}</span>
                <span className="hidden truncate text-ink-subtle sm:block">{reason}</span>
                <span className="shrink-0 rounded-full border border-line bg-surface-sunken px-2 py-0.5 text-[10px] font-medium text-ink-muted">
                  {result}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
