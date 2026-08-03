import type { ReactNode } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition } from "@/components/layout/PageTransition";

export type LegalSection = { heading: string; body: ReactNode[] };

/** Shared shell for the Privacy and Terms pages. */
export function LegalPage({
  breadcrumb,
  eyebrow,
  lines,
  intro,
  updated,
  sections,
}: {
  breadcrumb: string;
  eyebrow: string;
  lines: ReactNode[];
  intro: string;
  updated: string;
  sections: LegalSection[];
}) {
  return (
    <PageTransition>
      <PageHeader breadcrumb={breadcrumb} eyebrow={eyebrow} lines={lines} intro={intro} />

      <section className="relative overflow-hidden bg-ivory-100 py-16 sm:py-24">
        <div className="grain pointer-events-none absolute inset-0" />

        <div className="shell relative grid gap-10 lg:grid-cols-[0.32fr_1fr] lg:gap-16">
          {/* Contents rail */}
          <nav aria-label="On this page" className="lg:sticky lg:top-28 lg:self-start">
            <p className="font-sans text-[0.625rem] tracking-[0.22em] text-copper-600 uppercase">
              On this page
            </p>
            <ol className="mt-5 flex flex-col gap-2.5 text-[0.8125rem] text-navy-800/65">
              {sections.map((section, i) => (
                <li key={section.heading}>
                  <a
                    href={`#${slug(section.heading)}`}
                    className="inline-flex gap-2.5 transition-colors hover:text-copper-600"
                  >
                    <span className="tabular-nums text-copper-600/70">{`0${i + 1}`}</span>
                    {section.heading}
                  </a>
                </li>
              ))}
            </ol>
            <p className="mt-8 border-t border-navy-900/12 pt-5 text-[0.6875rem] text-navy-800/50">
              Last updated {updated}
            </p>
          </nav>

          <div className="max-w-2xl">
            {sections.map((section, i) => (
              <article
                key={section.heading}
                id={slug(section.heading)}
                className="scroll-mt-28 border-b border-navy-900/10 py-8 first:pt-0 last:border-b-0"
              >
                <h2 className="flex items-baseline gap-4 font-display text-[clamp(1.25rem,2.4vw,1.75rem)] text-navy-900">
                  <span className="font-sans text-[0.625rem] tracking-[0.2em] text-copper-600 tabular-nums">
                    {`0${i + 1}`}
                  </span>
                  {section.heading}
                </h2>
                <div className="mt-4 flex flex-col gap-4 text-[0.9375rem] leading-relaxed text-navy-800/75">
                  {section.body.map((paragraph, j) => (
                    <p key={j}>{paragraph}</p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </PageTransition>
  );
}

const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
