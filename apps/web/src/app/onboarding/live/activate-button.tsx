'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Rocket } from 'lucide-react';
import { Alert, Button } from '@/components/ui';
import { activateReceptionistAction } from '@/server/actions';

export function ActivateButton({ canGoLive }: { canGoLive: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {error && <Alert tone="critical" title={error} />}
      <Button
        size="lg"
        disabled={!canGoLive}
        loading={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await activateReceptionistAction();
            if (!result.ok) {
              setError(result.message ?? 'Your receptionist could not be activated.');
              return;
            }
            router.push('/dashboard');
            router.refresh();
          })
        }
      >
        <Rocket aria-hidden /> {pending ? 'Activating' : 'Activate my receptionist'}
      </Button>
    </div>
  );
}
