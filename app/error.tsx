'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Container, Section } from '@/components/ui/Primitives';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Replace with the production error reporter when one is configured.
    console.error(error);
  }, [error]);

  return (
    <Section tone="gradient" className="py-24 sm:py-32">
      <Container narrow>
        <p className="eyebrow">Something went wrong</p>
        <h1 className="mt-4 text-balance text-4xl sm:text-5xl">
          That did not load the way it should have.
        </h1>
        <p className="lede mt-5 max-w-xl">
          Nothing you entered has been lost — saved plans and profiles live on your
          device. Try again, and if it keeps happening, tell us what you were doing.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button onClick={reset}>Try again</Button>
          <Button href="/" variant="secondary">
            Back to home
          </Button>
          <Button href="/contact" variant="ghost">
            Report the problem
          </Button>
        </div>
        {error.digest ? (
          <p className="mt-6 text-sm text-muted">Reference: {error.digest}</p>
        ) : null}
      </Container>
    </Section>
  );
}
