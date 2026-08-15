import Link from 'next/link';
import { ONBOARDING_STEPS } from '@afd/shared';
import { requireSession } from '@/lib/auth';
import { BrandMark } from '@/components/brand-mark';
import { OnboardingProgress } from '@/components/onboarding-progress';

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  // Signed-in but possibly without an organisation yet — /onboarding/start
  // handles that case itself, so only require a user here.
  const ctx = await requireSession().catch(() => null);

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <BrandMark />
          <div className="flex items-center gap-4 text-sm">
            {ctx && (
              <span className="hidden text-ink-subtle sm:inline">{ctx.active.organizationName}</span>
            )}
            <Link href="/dashboard" className="text-ink-muted hover:text-ink">
              Skip for now
            </Link>
          </div>
        </div>
        {ctx && (
          <div className="mx-auto max-w-4xl px-4 pb-4 sm:px-6">
            <OnboardingProgress steps={ONBOARDING_STEPS} current={ctx.active.onboardingStep} />
          </div>
        )}
      </header>

      <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        {children}
      </main>
    </div>
  );
}
