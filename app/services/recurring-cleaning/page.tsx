import type { Metadata } from 'next';
import { ServiceDetailPage } from '@/components/services/ServiceDetailPage';
import { getService } from '@/lib/content/services';
import { pageMeta } from '@/lib/seo';

const service = getService('recurring-cleaning')!;

export const metadata: Metadata = pageMeta({
  title: service.metaTitle,
  description: service.metaDescription,
  path: '/services/recurring-cleaning',
});

export default function Page() {
  return <ServiceDetailPage service={service} />;
}
