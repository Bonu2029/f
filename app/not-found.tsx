import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Container, Section } from '@/components/ui/Primitives';
import { footerNav } from '@/lib/site';

export default function NotFound() {
  return (
    <Section tone="gradient" className="py-24 sm:py-32">
      <Container narrow>
        <p className="eyebrow">404</p>
        <h1 className="mt-4 text-balance text-4xl sm:text-5xl">
          This page has been tidied away.
        </h1>
        <p className="lede mt-5 max-w-xl">
          The link may be old, or the address slightly off. Here are the places people
          usually mean to land.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button href="/">Back to home</Button>
          <Button href="/services" variant="secondary">
            Browse services
          </Button>
          <Button href="/booking" variant="ghost">
            Book a cleaning
          </Button>
        </div>

        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {[
            { title: 'Services', links: footerNav.services.slice(0, 5) },
            { title: 'Company', links: footerNav.company.slice(0, 5) },
            { title: 'Support', links: footerNav.support.slice(0, 5) },
          ].map((column) => (
            <div key={column.title}>
              <p className="eyebrow mb-3">{column.title}</p>
              <ul className="space-y-2 text-[15px]">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-muted hover:text-accent-deep">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
