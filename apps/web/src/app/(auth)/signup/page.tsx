import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getFounderStats } from '@/server/founder';
import { getUser } from '@/lib/auth';
import { Badge } from '@/components/ui';
import { SignupForm } from './signup-form';

export const metadata: Metadata = { title: 'Create your account' };

export default async function SignupPage() {
  if (await getUser()) redirect('/dashboard');

  const stats = await getFounderStats().catch(() => null);
  const founderAvailable = Boolean(stats && !stats.soldOut);

  return (
    <div className="space-y-5">
      {founderAvailable && stats && (
        <Badge tone="brand" className="py-1">
          {stats.remaining} of {stats.total} Founding Member spots remaining
        </Badge>
      )}
      <SignupForm founderAvailable={founderAvailable} />
    </div>
  );
}
