'use client';

import { useState, useTransition } from 'react';
import { Mail, Pause, Play, SlidersHorizontal } from 'lucide-react';
import { Alert, Button, Card, CardContent, Field, Input } from '@/components/ui';
import {
  adminAdjustUsageAction,
  adminResendOnboardingEmailAction,
  adminSetAiPausedAction,
} from '@/server/admin';
import type { ActionResult } from '@/lib/errors';

/**
 * Support actions. Each requires a written reason, which is stored in the audit
 * log alongside the operator's identity.
 */
export function AdminOrgActions({
  organizationId,
  aiPaused,
  usedMinutes,
  ownerEmail,
}: {
  organizationId: string;
  aiPaused: boolean;
  usedMinutes: number;
  ownerEmail: string;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pauseReason, setPauseReason] = useState('');
  const [delta, setDelta] = useState('');
  const [usageReason, setUsageReason] = useState('');
  const [showUsage, setShowUsage] = useState(false);

  const run = (fn: () => Promise<ActionResult>) =>
    startTransition(async () => {
      setResult(await fn());
    });

  return (
    <Card>
      <CardContent className="space-y-4 pt-5">
        {result && (
          <Alert tone={result.ok ? 'positive' : 'critical'} title={result.message ?? (result.ok ? 'Done' : 'Failed')} />
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Field
              label={aiPaused ? 'Reason for resuming' : 'Reason for pausing'}
              htmlFor="pause_reason"
              hint="Recorded in the audit log and shown to the customer."
            >
              <Input value={pauseReason} onChange={(e) => setPauseReason(e.target.value)} />
            </Field>
            <Button
              variant={aiPaused ? 'primary' : 'secondary'}
              loading={pending}
              disabled={pauseReason.trim().length < 5}
              onClick={() => run(() => adminSetAiPausedAction(organizationId, !aiPaused, pauseReason))}
            >
              {aiPaused ? <Play aria-hidden /> : <Pause aria-hidden />}
              {aiPaused ? 'Resume receptionist' : 'Pause receptionist'}
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-ink">Other actions</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                loading={pending}
                disabled={!ownerEmail}
                onClick={() => run(() => adminResendOnboardingEmailAction(organizationId, ownerEmail))}
              >
                <Mail aria-hidden /> Resend onboarding email
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setShowUsage((s) => !s)}>
                <SlidersHorizontal aria-hidden /> Adjust usage
              </Button>
            </div>
          </div>
        </div>

        {showUsage && (
          <div className="space-y-3 rounded-lg border border-amber-200 bg-caution-soft p-4">
            <p className="text-sm font-medium text-amber-900">
              Adjust recorded minutes (currently {usedMinutes})
            </p>
            <p className="text-xs text-amber-900/80">
              For genuine billing corrections only. A compensating ledger row is written so usage
              history still reconciles.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Minutes (negative to credit)" htmlFor="delta">
                <Input value={delta} onChange={(e) => setDelta(e.target.value)} inputMode="numeric" placeholder="-15" />
              </Field>
              <Field label="Reason (10+ characters)" htmlFor="usage_reason">
                <Input value={usageReason} onChange={(e) => setUsageReason(e.target.value)} />
              </Field>
            </div>
            <Button
              variant="danger"
              size="sm"
              loading={pending}
              disabled={!Number.isFinite(Number(delta)) || !delta || usageReason.trim().length < 10}
              onClick={() => run(() => adminAdjustUsageAction(organizationId, Number(delta), usageReason))}
            >
              Apply adjustment
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
