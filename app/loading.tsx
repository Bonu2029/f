import { Container, Section } from '@/components/ui/Primitives';

/** Route-level loading skeleton. Static markup so it costs nothing to render. */
export default function Loading() {
  return (
    <Section tone="plain" className="py-20">
      <Container>
        <div className="animate-pulse space-y-6" aria-hidden="true">
          <div className="h-3 w-28 rounded-full bg-pearl" />
          <div className="h-12 w-2/3 rounded-2xl bg-pearl" />
          <div className="h-4 w-1/2 rounded-full bg-pearl" />
          <div className="grid gap-5 pt-6 sm:grid-cols-3">
            <div className="h-48 rounded-3xl bg-pearl" />
            <div className="h-48 rounded-3xl bg-pearl" />
            <div className="h-48 rounded-3xl bg-pearl" />
          </div>
        </div>
        <p className="sr-only" role="status">
          Loading page content
        </p>
      </Container>
    </Section>
  );
}
