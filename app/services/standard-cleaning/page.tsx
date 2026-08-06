import type { Metadata } from 'next';
import { ServiceDetailPage } from '@/components/services/ServiceDetailPage';
import { getService } from '@/lib/content/services';
import { pageMeta } from '@/lib/seo';

const service = getService('standard-cleaning')!;

export const metadata: Metadata = pageMeta({
  title: service.metaTitle,
  description: service.metaDescription,
  path: '/services/standard-cleaning',
});

export default function Page() {
  return <ServiceDetailPage service={service} />;
}
