import { ButtonLink } from "@/components/ui/button";
import { plans, pricingNote } from "@/config/pricing";
import { cn } from "@/lib/cn";

function Check() {
  return (
    <svg viewBox="0 0 20 20" className="mt-0.5 size-4 shrink-0" fill="none">
      <path
        d="m4.5 10.5 3.5 3.5 7.5-8"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PricingPlans() {
  return (
    <div>
      <div className="grid gap-5 lg:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={cn(
              "relative flex flex-col rounded-3xl border bg-white p-7",
              plan.highlighted
                ? "border-ink-950 shadow-lift lg:-my-3 lg:py-10"
                : "border-line shadow-soft",
            )}
          >
            {plan.badge ? (
              <span className="absolute -top-3 left-7 rounded-full bg-ink-950 px-3 py-1 text-xs font-medium text-white">
                {plan.badge}
              </span>
            ) : null}

            <h3 className="text-lg font-semibold text-ink-950">{plan.name}</h3>

            <p className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-semibold tracking-tight text-ink-950">
                ${plan.price}
              </span>
              <span className="text-sm text-ink-500">/month</span>
            </p>

            <p className="mt-2 text-[0.9375rem] font-medium text-ink-900">
              {plan.tagline}
            </p>

            <ul className="mt-6 flex-1 space-y-3 text-[0.9375rem] text-ink-700">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-2.5">
                  <span className="text-accent-500">
                    <Check />
                  </span>
                  {feature}
                </li>
              ))}
            </ul>

            <ButtonLink
              href={`/signup?plan=${plan.id}`}
              variant={plan.highlighted ? "primary" : "secondary"}
              size="lg"
              fullWidth
              className="mt-8"
            >
              {plan.cta}
            </ButtonLink>
          </div>
        ))}
      </div>

      <p className="mt-8 text-center text-sm text-ink-500">{pricingNote}</p>
    </div>
  );
}
