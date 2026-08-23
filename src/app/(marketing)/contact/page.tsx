import type { Metadata } from "next";
import { Container, Section } from "@/components/ui/container";
import { brand } from "@/config/brand";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <Section>
      <Container size="narrow">
        <h1 className="text-4xl font-semibold tracking-tight text-ink-950 sm:text-5xl">
          Contact
        </h1>
        <p className="mt-6 text-lg text-ink-700">
          Questions about {brand.name}, pricing or tags? Send us a note and
          we&rsquo;ll get back to you.
        </p>
        <a
          href={`mailto:${brand.supportEmail}`}
          className="mt-10 flex items-center justify-between rounded-2xl border border-line bg-white p-6 shadow-soft transition-colors hover:bg-surface-muted"
        >
          <span>
            <span className="block text-sm text-ink-500">Email</span>
            <span className="mt-1 block text-lg font-medium text-ink-950">
              {brand.supportEmail}
            </span>
          </span>
          <svg viewBox="0 0 20 20" className="size-5 text-ink-400" fill="none">
            <path
              d="M7 4.5 12.5 10 7 15.5"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
      </Container>
    </Section>
  );
}
