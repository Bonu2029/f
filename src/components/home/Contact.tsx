"use client";

import { SectionHeading } from "@/components/ui/SectionHeading";
import { ButtonLink } from "@/components/ui/Button";
import { ArrowUpRight, Clock, Mail, MapPin, Phone, socialIcon } from "@/components/ui/Icons";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/motion";
import { addressLines, hours, parkingInfo, shop, socials, transitInfo } from "@/lib/data";

export function Contact() {
  return (
    <section id="contact" className="relative overflow-hidden bg-ivory-200 py-24 sm:py-32">
      <div className="grain pointer-events-none absolute inset-0" />

      <div className="shell relative">
        <SectionHeading
          eyebrow="Find Us"
          lines={["Calder Row,", "Shoreditch."]}
          intro="Six minutes from Hoxton Overground, above the old print works. Look for the copper pole."
          action={
            <div className="flex flex-wrap gap-3">
              <ButtonLink
                href={shop.mapsUrl}
                size="md"
                icon={<ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:rotate-45" />}
              >
                Get Directions
              </ButtonLink>
              <ButtonLink href={shop.phoneHref} size="md" variant="outline" className="text-navy-900">
                Call Now
              </ButtonLink>
            </div>
          }
        />
      </div>

      {/* Split screen: map on one side, details on the other */}
      <div className="mt-14 grid lg:grid-cols-2">
        <Reveal y={20} className="relative min-h-[22rem] lg:min-h-[38rem]">
          <div className="absolute inset-0 overflow-hidden bg-sand-200 lg:rounded-r-[2rem]">
            {/* Street-grid underlay — keeps the panel composed while the map loads */}
            <div aria-hidden className="absolute inset-0">
              <div
                className="absolute inset-0 opacity-60"
                style={{
                  backgroundImage:
                    "linear-gradient(var(--color-sand-400) 1px, transparent 1px), linear-gradient(90deg, var(--color-sand-400) 1px, transparent 1px)",
                  backgroundSize: "72px 72px",
                }}
              />
              <div
                className="absolute inset-0 opacity-45"
                style={{
                  backgroundImage:
                    "linear-gradient(28deg, transparent 48%, var(--color-sand-400) 48%, var(--color-sand-400) 49%, transparent 49%)",
                }}
              />
              <span className="absolute top-1/2 left-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-copper-500 ring-8 ring-copper-500/20" />
            </div>

            <iframe
              src={shop.osmEmbed}
              title={`Map showing ${shop.name} at ${shop.street}, ${shop.district}`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="relative h-full w-full border-0 grayscale-[0.35] contrast-[1.05]"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-navy-900/10 mix-blend-multiply"
            />
          </div>

          {/* Floating address card over the map */}
          <div className="absolute bottom-5 left-5 max-w-[17rem] rounded-2xl border border-navy-900/10 bg-ivory-50/95 p-5 shadow-[0_24px_50px_-28px_rgba(14,26,43,0.7)] backdrop-blur-sm sm:bottom-8 sm:left-8">
            <span className="eyebrow text-copper-600">Address</span>
            <address className="mt-3 flex flex-col gap-0.5 text-sm text-navy-900 not-italic">
              {addressLines.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </address>
            <a
              href={shop.mapsUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="group mt-4 inline-flex items-center gap-2 border-b border-navy-900/25 pb-1
                         font-sans text-[0.625rem] tracking-[0.18em] text-navy-900 uppercase
                         transition-colors hover:border-copper-500 hover:text-copper-600"
            >
              Open in maps
              <ArrowUpRight className="h-3 w-3 transition-transform duration-300 group-hover:rotate-45" />
            </a>
          </div>
        </Reveal>

        <div className="shell py-14 lg:py-4 lg:pl-16">
          <Stagger className="grid gap-8 sm:grid-cols-2">
            {/* Direct contact */}
            <StaggerItem className="sm:col-span-2">
              <div className="flex flex-col gap-4 border-b border-navy-900/12 pb-8 sm:flex-row sm:items-center sm:justify-between">
                <a
                  href={shop.phoneHref}
                  className="group inline-flex items-center gap-4 text-navy-900 transition-colors hover:text-copper-600"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-navy-900/15 transition-colors group-hover:border-copper-500">
                    <Phone className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block font-sans text-[0.5625rem] tracking-[0.2em] text-navy-800/50 uppercase">
                      Phone
                    </span>
                    <span className="mt-0.5 block font-display text-lg">{shop.phone}</span>
                  </span>
                </a>

                <a
                  href={`mailto:${shop.email}`}
                  className="group inline-flex items-center gap-4 text-navy-900 transition-colors hover:text-copper-600"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-navy-900/15 transition-colors group-hover:border-copper-500">
                    <Mail className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block font-sans text-[0.5625rem] tracking-[0.2em] text-navy-800/50 uppercase">
                      Email
                    </span>
                    <span className="mt-0.5 block text-[0.9375rem]">{shop.email}</span>
                  </span>
                </a>
              </div>
            </StaggerItem>

            {/* Hours */}
            <StaggerItem>
              <h3 className="flex items-center gap-2.5 font-sans text-[0.625rem] tracking-[0.22em] text-copper-600 uppercase">
                <Clock className="h-3.5 w-3.5" /> Business hours
              </h3>
              <dl className="mt-5 flex flex-col gap-2.5 text-sm">
                {hours
                  .slice()
                  .sort((a, b) => ((a.day + 6) % 7) - ((b.day + 6) % 7))
                  .map((entry) => (
                    <div key={entry.day} className="flex items-baseline justify-between gap-4">
                      <dt className="text-navy-800/60">{entry.label}</dt>
                      <dd
                        className={
                          entry.open
                            ? "tabular-nums text-navy-900"
                            : "text-navy-800/40 italic"
                        }
                      >
                        {entry.open ? `${entry.open} – ${entry.close}` : "Closed"}
                      </dd>
                    </div>
                  ))}
              </dl>
            </StaggerItem>

            {/* Getting here */}
            <StaggerItem>
              <h3 className="flex items-center gap-2.5 font-sans text-[0.625rem] tracking-[0.22em] text-copper-600 uppercase">
                <MapPin className="h-3.5 w-3.5" /> Parking & transport
              </h3>
              <ul className="mt-5 flex flex-col gap-3 text-[0.8125rem] leading-relaxed text-navy-800/70">
                {[...parkingInfo, ...transitInfo].map((line) => (
                  <li key={line} className="flex gap-3">
                    <span aria-hidden className="mt-2 h-px w-3 shrink-0 bg-copper-500" />
                    {line}
                  </li>
                ))}
              </ul>
            </StaggerItem>

            {/* Socials */}
            <StaggerItem className="sm:col-span-2">
              <div className="flex flex-wrap items-center gap-3 border-t border-navy-900/12 pt-8">
                {socials.map((social) => {
                  const Icon = socialIcon[social.label as keyof typeof socialIcon];
                  return (
                    <a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="group inline-flex items-center gap-2.5 rounded-full border border-navy-900/15
                                 px-4 py-2.5 text-[0.75rem] text-navy-900 transition-all duration-300
                                 hover:-translate-y-0.5 hover:border-copper-500 hover:text-copper-600"
                    >
                      <Icon className="h-4 w-4" />
                      {social.handle}
                    </a>
                  );
                })}
              </div>
            </StaggerItem>
          </Stagger>
        </div>
      </div>
    </section>
  );
}
