import type { ReactNode } from "react";
import { Container, Section } from "@/components/ui/container";

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <Section>
      <Container size="narrow">
        <h1 className="text-4xl font-semibold tracking-tight text-ink-950 sm:text-5xl">
          {title}
        </h1>
        <p className="mt-3 text-sm text-ink-500">Last updated {updated}</p>
        <div className="mt-12 space-y-10">{children}</div>
      </Container>
    </Section>
  );
}

export function LegalBlock({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-ink-950">{heading}</h2>
      <div className="mt-3 space-y-3 text-[1.0625rem] leading-relaxed text-ink-700">
        {children}
      </div>
    </section>
  );
}
