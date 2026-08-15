'use client';

import { useActionState, useState, useTransition } from 'react';
import { Mail, UserPlus } from 'lucide-react';
import { MEMBER_ROLES, type MemberRole } from '@afd/shared';
import { Alert, Badge, Button, Field, Input, Select, Table, Td, Th } from '@/components/ui';
import {
  cancelInviteAction,
  changeMemberRoleAction,
  inviteMemberAction,
  removeMemberAction,
} from '@/server/team';
import type { ActionResult } from '@/lib/errors';

interface Member {
  id: string;
  role: string;
  name: string;
  email: string;
  initials: string;
  isSelf: boolean;
}

export function TeamManager({
  members,
  invites,
  canManage,
  viewerRole,
  seatsUsed,
  seatLimit,
}: {
  members: Member[];
  invites: Array<{ id: string; email: string; role: string; expiresAt: string }>;
  canManage: boolean;
  viewerRole: string;
  seatsUsed: number;
  seatLimit: number;
}) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(inviteMemberAction, null);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<ActionResult>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) setError(result.message ?? 'That did not work.');
    });
  }

  const canGrant = (role: MemberRole) =>
    viewerRole === 'owner' || (viewerRole === 'admin' && role !== 'owner');

  return (
    <div className="space-y-6">
      {error && <Alert tone="critical" title={error} />}
      {state?.ok && <Alert tone="positive" title={state.message ?? 'Invitation sent'} />}
      {state && !state.ok && <Alert tone="critical" title={state.message ?? 'That did not work'} />}

      <Table>
        <thead>
          <tr>
            <Th>Person</Th>
            <Th>Role</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id}>
              <Td>
                <div className="flex items-center gap-2.5">
                  <span
                    aria-hidden
                    className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700"
                  >
                    {m.initials}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">
                      {m.name}
                      {m.isSelf && <span className="ml-1.5 text-xs text-ink-subtle">(you)</span>}
                    </p>
                    <p className="truncate text-xs text-ink-subtle">{m.email}</p>
                  </div>
                </div>
              </Td>
              <Td>
                {canManage && !m.isSelf && canGrant(m.role as MemberRole) ? (
                  <Select
                    value={m.role}
                    disabled={busy}
                    aria-label={`Role for ${m.name}`}
                    className="w-32"
                    onChange={(e) => run(() => changeMemberRoleAction(m.id, e.target.value as MemberRole))}
                  >
                    {MEMBER_ROLES.filter(canGrant).map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Badge tone={m.role === 'owner' ? 'brand' : 'neutral'}>{m.role}</Badge>
                )}
              </Td>
              <Td className="text-right">
                {canManage && !m.isSelf && canGrant(m.role as MemberRole) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => run(() => removeMemberAction(m.id))}
                  >
                    Remove
                  </Button>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>

      {invites.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-ink">Pending invitations</h3>
          <ul className="mt-2 divide-y divide-line rounded-lg border border-line">
            {invites.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 p-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Mail className="size-4 shrink-0 text-ink-faint" aria-hidden />
                  <div className="min-w-0">
                    <p className="truncate text-sm text-ink">{i.email}</p>
                    <p className="text-xs text-ink-subtle">
                      {i.role} · expires {new Date(i.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {canManage && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => run(() => cancelInviteAction(i.id))}
                  >
                    Cancel
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {canManage && (
        <form action={action} className="space-y-3 rounded-lg border border-line p-4">
          <h3 className="text-sm font-semibold text-ink">Invite someone</h3>
          <p className="text-xs text-ink-subtle">
            {seatsUsed} of {seatLimit} seats used on your plan.
          </p>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
            <Field label="Email address" htmlFor="email" required error={state?.fields?.email}>
              <Input name="email" type="email" required placeholder="colleague@example.com" />
            </Field>
            <Field label="Role" htmlFor="role">
              <Select name="role" defaultValue="staff" className="w-32">
                {MEMBER_ROLES.filter(canGrant).map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            </Field>
            <Button type="submit" loading={pending} disabled={seatsUsed >= seatLimit}>
              <UserPlus aria-hidden /> {pending ? 'Sending' : 'Send invite'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
