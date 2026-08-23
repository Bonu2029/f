import { brand } from "@/config/brand";

/**
 * Shown whenever the dashboard is rendering sample content because Supabase
 * has not been connected. Makes it unambiguous that nothing here is real.
 */
export function DemoBanner() {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <span className="rounded-full bg-amber-200/70 px-2 py-0.5 text-xs font-semibold tracking-wide uppercase">
        Demo data
      </span>
      <span>
        Sample content, shown because {brand.name} is not connected to a
        database yet. Add your Supabase keys to see real records.
      </span>
    </div>
  );
}
