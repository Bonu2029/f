'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui';
import { markNotificationsReadAction } from '@/server/actions';

export function MarkAllRead() {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="secondary"
      size="sm"
      loading={pending}
      onClick={() => startTransition(() => markNotificationsReadAction().then(() => undefined))}
    >
      Mark all read
    </Button>
  );
}
