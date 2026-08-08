import type { Metadata } from 'next';
import Link from 'next/link';
import { Reveal } from '@/components/motion/Reveal';
import { Accordion } from '@/components/ui/Accordion';
import { Button } from '@/components/ui/Button';
import { Container, Section, SectionHeading } from '@/components/ui/Primitives';
import { generalFaqs } from '@/lib/content/general';
import { faqJsonLd, pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({
  title: 'Frequently Asked Questions',
  description:
    'Answers about booking, pricing, preparing your home, trust and safety, and LumaCare membership.',
  path: '/faq',
});

const categories = ['Booking', 'Pricing', 'Your home', 'Trust', 'Membership'];

export default function FaqPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            faqJsonLd(generalFaqs.map(({ q, a }) => ({ q, a }))),
          ),
        }}
      />

      <Section tone="gradient" className="pb-10 pt-12 sm:pb-12 sm:pt-16">
        <Container narrow>
          <Reveal>
            <SectionHeading
              level={1}
              eyebrow="FAQ"
              title="Questions, answered without the marketing voice."
              lede="If something is not decided yet, we say that instead of writing a confident sentence around it."
            />
          </Reveal>
        </Container>
      </Section>

      <Section tone="plain" className="pt-0 sm:pt-0">
        <Container narrow>
          <div className="space-y-12">
            {categories.map((category, index) => {
              const items = generalFaqs.filter((faq) => faq.category === category);
              if (items.length === 0) return null;
              return (
                <Reveal key={category} delay={index * 0.04}>
                  <section>
                    <h2 className="mb-5 text-2xl">{category}</h2>
                    <Accordion items={items} defaultOpen={index === 0 ? 0 : -1} />
                  </section>
                </Reveal>
              );
            })}
          </div>

          <Reveal className="mt-14">
            <div className="rounded-[2rem] border border-line bg-luma-gradient p-8 text-center sm:p-12">
              <h2 className="text-balance text-2xl sm:text-3xl">
                Still have a question?
              </h2>
              <p className="lede mx-auto mt-3 max-w-lg">
                Service-specific questions live on each service page. Anything else, ask
                us directly — a person answers.
              </p>
              <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                <Button href="/contact">Contact us</Button>
                <Button href="/services" variant="secondary">
                  Browse services
                </Button>
              </div>
              <p className="mt-6 text-sm text-muted">
                Looking for safety and privacy detail? See{' '}
                <Link href="/trust-safety" className="link-underline">
                  Trust &amp; Safety
                </Link>
                .
              </p>
            </div>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}
