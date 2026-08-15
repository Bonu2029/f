import { getFounderStats } from '@/server/founder';
import { MarketingFooter, MarketingHeader } from '@/components/marketing/chrome';

export const revalidate = 30;

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  // The CTA label reflects real inventory, so it never advertises a price the
  // visitor cannot actually get.
  const stats = await getFounderStats().catch(() => null);
  const ctaLabel = stats && !stats.soldOut ? 'Start for $20' : 'Get started';

  return (
    <div className="flex min-h-dvh flex-col">
      <MarketingHeader ctaLabel={ctaLabel} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <MarketingFooter />
    </div>
  );
}
