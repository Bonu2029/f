import Link from 'next/link';
import { Logo } from './Logo';
import { Newsletter } from './Newsletter';
import { Icon } from '@/components/ui/Icon';
import { footerNav, site } from '@/lib/site';
import { serviceAreas } from '@/lib/content/locations';

const socials = [
  { label: 'Instagram (placeholder)', href: '#' },
  { label: 'Facebook (placeholder)', href: '#' },
  { label: 'Pinterest (placeholder)', href: '#' },
];

export function Footer() {
  return (
    <footer className="border-t border-line bg-pearl/60">
      <div className="container-luma py-16 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_2fr]">
          <div>
            <Logo />
            <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-muted">
              {site.secondary} LumaNest builds a plan around your rooms, your
              surfaces and your routine — then keeps it.
            </p>

            <div className="mt-8 max-w-md rounded-3xl border border-line bg-white p-6">
              <p className="font-display text-xl leading-snug text-ink">
                A calmer home, one small reset at a time.
              </p>
              <p className="mt-2 text-sm text-muted">
                Seasonal ideas and practical home-care notes. No pressure, no
                pop-ups, unsubscribe in one click.
              </p>
              <Newsletter />
            </div>
          </div>

          <div className="grid gap-10 sm:grid-cols-3">
            <FooterColumn title="Services" links={footerNav.services} />
            <FooterColumn title="Company" links={footerNav.company} />
            <FooterColumn title="Customer support" links={footerNav.support} />
          </div>
        </div>

        <div className="mt-14 grid gap-10 border-t border-line pt-10 md:grid-cols-3">
          <div>
            <p className="eyebrow mb-4">Service areas</p>
            <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted">
              {serviceAreas.map((area) => (
                <li key={area.city}>
                  <Link href="/locations" className="hover:text-accent-deep">
                    {area.city}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">
              Placeholder areas — confirm coverage on the locations page.
            </p>
          </div>

          <div>
            <p className="eyebrow mb-4">Contact</p>
            <ul className="space-y-2 text-sm text-muted">
              <li className="flex items-center gap-2">
                <Icon name="chat" size={16} className="text-accent" />
                <a href={site.phoneHref} className="hover:text-accent-deep">
                  {site.phone}
                </a>
                <span className="text-xs">(placeholder)</span>
              </li>
              <li className="flex items-center gap-2">
                <Icon name="document" size={16} className="text-accent" />
                <a href={`mailto:${site.email}`} className="hover:text-accent-deep">
                  {site.email}
                </a>
              </li>
              <li className="flex items-start gap-2">
                <Icon name="clock" size={16} className="mt-0.5 text-accent" />
                <span>{site.hours}</span>
              </li>
            </ul>
          </div>

          <div>
            <p className="eyebrow mb-4">Follow</p>
            <ul className="space-y-2 text-sm text-muted">
              {socials.map((social) => (
                <li key={social.label}>
                  <a href={social.href} className="hover:text-accent-deep">
                    {social.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-line pt-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {site.name}. Business details, licensing
            and certifications to be confirmed before launch.
          </p>
          <ul className="flex flex-wrap gap-5">
            {footerNav.legal.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-accent-deep">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: readonly { label: string; href: string }[];
}) {
  return (
    <div>
      <p className="eyebrow mb-4">{title}</p>
      <ul className="space-y-2.5 text-[15px]">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-muted transition-colors hover:text-accent-deep">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
