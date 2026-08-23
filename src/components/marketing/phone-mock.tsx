import { ImagePlaceholder } from "@/components/ui/image-placeholder";

const actions = [
  { label: "Request Service", primary: true },
  { label: "Book Appointment" },
  { label: "Call Us" },
  { label: "View Warranty" },
];

/**
 * Phone-shaped frame showing an example customer page.
 *
 * The company logo slot inside stays an empty placeholder — real branding
 * is uploaded by each business.
 */
export function PhoneMock() {
  return (
    <div className="relative mx-auto w-full max-w-[19rem]">
      <div className="rounded-[2.5rem] border border-line-strong bg-white p-2.5 shadow-lift">
        <div className="overflow-hidden rounded-[2rem] border border-line bg-white">
          <div className="flex justify-center pt-3 pb-1">
            <span className="h-1.5 w-16 rounded-full bg-surface-sunken" />
          </div>

          <div className="space-y-5 px-5 pt-4 pb-7">
            <div className="flex items-center gap-3">
              <div className="w-12 shrink-0">
                <ImagePlaceholder ratio="1 / 1" rounded="rounded-xl" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[0.9375rem] font-semibold text-ink-950">
                  ABC Plumbing
                </p>
                <p className="text-xs text-ink-500">Example customer page</p>
              </div>
            </div>

            <div className="rounded-xl border border-line bg-surface-muted px-4 py-3">
              <p className="text-[0.9375rem] font-medium text-ink-950">
                Water Heater
              </p>
              <p className="mt-0.5 text-xs text-ink-500">
                Installed: August 2026
              </p>
            </div>

            <div className="space-y-2.5">
              {actions.map((action) => (
                <div
                  key={action.label}
                  className={
                    action.primary
                      ? "rounded-xl bg-accent-500 px-4 py-3 text-center text-sm font-medium text-white"
                      : "rounded-xl border border-line-strong bg-white px-4 py-3 text-center text-sm font-medium text-ink-900"
                  }
                >
                  {action.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
