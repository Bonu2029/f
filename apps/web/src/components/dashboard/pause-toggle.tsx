'use client';

import { useState, useTransition } from 'react';
import { Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui';
import { setAiPausedAction } from '@/server/actions';

/**
 * Pause / resume the receptionist. Pausing takes effect immediately for new
 * calls: the inbound-call resolver checks `ai_paused` before answering.
 */
export function PauseToggle({ paused, isLive }: { paused: boolean; isLive: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!isLive) return null;

  return (
    <div className="text-right">
      <Button
        variant={paused ? 'primary' : 'secondary'}
        loading={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await setAiPausedAction(!paused);
            if (!result.ok) setError(result.message ?? 'That did not work.');
          })
        }
      >
        {paused ? <Play aria-hidden /> : <Pause aria-hidden />}
        {paused ? 'Resume answering' : 'Pause receptionist'}
      </Button>
      {error && (
        <p role="alert" className="mt-1 text-xs text-critical">
          {error}
        </p>
      )}
    </div>
  );
}
