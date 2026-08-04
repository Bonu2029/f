import Logo from "@/components/ui/Logo";
import { navLinks, site, hours, formattedAddress, mapsUrl, telHref, hasRealPhone } from "@/lib/site";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative isolate overflow-hidden bg-cream pt-[clamp(4rem,8vw,7rem)]">
      {/* Soft moving texture — two slow gradient fields, no JS */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="animate-drift-a absolute -left-40 top-[-8rem] h-[34rem] w-[34rem] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(239,224,203,0.85), transparent 68%)",
            filter: "blur(70px)",
          }}
        />
        <div
          className="animate-drift-b absolute -right-32 bottom-[-10rem] h-[30rem] w-[30rem] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(230,198,189,0.75), transparent 68%)",
            filter: "blur(70px)",
          }}
        />
      </div>

      <div className="shell relative">
        <div className="grid gap-[clamp(2.5rem,5vw,4rem)] pb-[clamp(3rem,6vw,5rem)] md:grid-cols-2 lg:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,0.7fr))]">
          {/* Brand */}
          <div>
            <Logo size="lg" />
            <p className="mt-7 max-w-[24rem] text-[0.9375rem] leading-[1.75] text-graphite-soft">
              {site.tagline} in {site.address.locality}, {site.address.region}. By
              appointment.
            </p>
            <a
              href="#booking"
              className="group mt-6 inline-flex min-h-[44px] items-center gap-3 text-[0.8125rem] tracking-[0.14em] text-graphite transition-colors duration-300 hover:text-copper"
            >
              <span className="relative">
                Book an appointment
                <span className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-copper transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100" />
              </span>
              <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </a>
          </div>

          {/* Navigation */}
          <nav aria-label="Footer">
            <h2 className="eyebrow text-[0.5625rem]">Explore</h2>
            <ul className="mt-5 space-y-1">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="inline-flex min-h-[40px] items-center text-[0.9375rem] text-graphite-soft transition-colors duration-300 hover:text-copper"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Hours */}
          <div>
            <h2 className="eyebrow text-[0.5625rem]">Hours</h2>
            <ul className="mt-5 space-y-1.5 text-[0.875rem] text-graphite-soft">
              {hours.map((d) => (
                <li key={d.day} className="flex justify-between gap-3">
                  <span>{d.short}</span>
                  <span className="tabular-nums">
                    {d.open && d.close ? `${d.open.replace(":00", "")}–${d.close.replace(":00", "")}` : "Closed"}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Find us */}
          <div>
            <h2 className="eyebrow text-[0.5625rem]">Find us</h2>
            <address className="mt-3 text-[0.9375rem] not-italic text-graphite-soft">
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="flex min-h-[44px] items-center leading-snug transition-colors duration-300 hover:text-copper"
              >
                {formattedAddress}
              </a>
              {hasRealPhone && (
                <a
                  href={telHref}
                  className="flex min-h-[44px] items-center transition-colors duration-300 hover:text-copper"
                >
                  {site.phone}
                </a>
              )}
              {site.social.instagram && (
                <a
                  href={site.social.instagram}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex min-h-[44px] items-center transition-colors duration-300 hover:text-copper"
                >
                  Instagram
                </a>
              )}
            </address>
          </div>
        </div>

        <div className="rule-copper opacity-50" />

        <div className="flex flex-col gap-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[0.75rem] tracking-[0.08em] text-graphite-faint">
            © {year} {site.legalName}. All rights reserved.
          </p>
          <ul className="-my-2 flex flex-wrap gap-x-6 text-[0.75rem] tracking-[0.08em] text-graphite-faint">
            {[
              { href: "/privacy", label: "Privacy" },
              { href: "/terms", label: "Terms" },
              { href: "#top", label: "Back to top ↑" },
            ].map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="flex min-h-[44px] items-center transition-colors duration-300 hover:text-copper"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
