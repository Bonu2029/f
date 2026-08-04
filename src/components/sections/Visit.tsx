"use client";

import { useEffect, useState } from "react";
import Reveal from "@/components/motion/Reveal";
import SplitLines from "@/components/motion/SplitLines";
import Button from "@/components/ui/Button";
import Divider from "@/components/decor/Divider";
import OpenStatus from "@/components/ui/OpenStatus";
import {
  site,
  hours,
  hoursAreVerified,
  formattedAddress,
  mapsUrl,
  mapsEmbedUrl,
  telHref,
  hasRealPhone,
  hasRealEmail,
  todayHours,
} from "@/lib/site";

function InstagramIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FacebookIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M14 8.5V6.9c0-.7.2-1.1 1.2-1.1H17V3.1A21 21 0 0 0 14.7 3C12.3 3 10.8 4.4 10.8 7v1.5H8.5v2.9h2.3V21H14v-9.6h2.4l.4-2.9H14z" />
    </svg>
  );
}

export default function Visit() {
  /* The page is statically prerendered, so "today" has to be resolved in the
     visitor's browser — baking the build day in would both mislead and break
     hydration. */
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => setToday(todayHours().day), []);

  return (
    <>
      <Divider shape="swell" from="var(--color-cream)" to="var(--color-ivory)" />

      <section id="visit" className="relative isolate overflow-hidden bg-ivory pb-[clamp(4rem,8vw,7rem)]">
        <div className="shell relative">
          <div className="max-w-[42rem]">
            <Reveal variant="rise">
              <p className="eyebrow">Visit</p>
            </Reveal>
            <SplitLines
              as="h2"
              mode="words"
              className="mt-6 font-display text-[length:var(--text-display)] leading-[0.95] text-graphite"
            >
              Come and sit down for an hour
            </SplitLines>
          </div>

          <div className="mt-[clamp(2.5rem,5vw,4rem)] grid gap-[clamp(1.5rem,3vw,2.5rem)] lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            {/* ------------------------------------------------------ map --- */}
            <Reveal variant="unveil" className="relative">
              <div className="frame-soft relative overflow-hidden bg-shell shadow-[0_40px_100px_-50px_rgba(33,30,27,0.4)]">
                {/* Sits behind the embed, so a blocked or slow map degrades to
                    a designed surface rather than a white void. */}
                <div
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(60% 60% at 50% 45%, rgba(239,224,203,0.9), transparent 70%), repeating-linear-gradient(38deg, rgba(176,162,148,0.16) 0 1px, transparent 1px 62px), repeating-linear-gradient(-52deg, rgba(176,162,148,0.13) 0 1px, transparent 1px 84px)",
                  }}
                />
                <iframe
                  src={mapsEmbedUrl}
                  title={`Map showing ${site.name} at ${formattedAddress}`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="relative h-[clamp(20rem,44vw,32rem)] w-full border-0 bg-transparent grayscale-[35%] sepia-[18%] contrast-[0.95] transition-all duration-700 hover:grayscale-0 hover:sepia-0"
                />

                {/* Animated marker — decorative, layered over the embed */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full"
                >
                  <span className="relative flex h-14 w-14 items-center justify-center">
                    <span className="absolute h-14 w-14 animate-ping rounded-full bg-copper/25" />
                    <span className="absolute h-8 w-8 rounded-full bg-copper/20 backdrop-blur" />
                    <span className="relative h-3 w-3 rounded-full bg-copper shadow-[0_0_18px_rgba(154,90,50,0.7)]" />
                  </span>
                </span>

                {/* Address plate */}
                <div className="glass-deep absolute bottom-4 left-4 right-4 flex flex-wrap items-center gap-4 rounded-2xl p-4 sm:left-6 sm:right-auto sm:max-w-[22rem] sm:p-5">
                  <div className="min-w-0 flex-1">
                    <p className="eyebrow text-[0.5rem]">Studio</p>
                    <p className="mt-1.5 font-display text-[1.0625rem] leading-snug text-graphite">
                      {site.address.street}
                    </p>
                    <p className="text-[0.875rem] text-graphite-soft">
                      {site.address.locality}, {site.address.region}{" "}
                      {site.address.postalCode}
                    </p>
                  </div>
                  <Button href={mapsUrl} variant="outline" size="md" className="shrink-0">
                    Directions
                  </Button>
                </div>
              </div>

              <Reveal variant="rise" delay={0.1}>
                <p className="mt-5 flex items-start gap-3 text-[0.875rem] leading-relaxed text-graphite-soft">
                  <span aria-hidden className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-sage-deep" />
                  {site.parking}
                </p>
              </Reveal>
            </Reveal>

            {/* --------------------------------------------------- details --- */}
            <div className="flex flex-col gap-[clamp(1rem,2vw,1.5rem)]">
              {/* Hours */}
              <Reveal variant="drape" className="glass frame-soft p-6 sm:p-7">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="font-display text-[1.375rem] text-graphite">Hours</h3>
                  <span className="text-graphite-soft">
                    <OpenStatus compact />
                  </span>
                </div>

                <ul className="mt-5 space-y-0.5">
                  {hours.map((d) => {
                    const isToday = d.day === today;
                    return (
                      <li
                        key={d.day}
                        className={`flex items-center justify-between gap-4 rounded-lg px-2.5 py-2 text-[0.875rem] transition-colors duration-300 ${
                          isToday ? "bg-champagne/45 text-graphite" : "text-graphite-soft"
                        }`}
                      >
                        <span className={isToday ? "font-medium" : ""}>
                          {d.day}
                          {isToday && <span className="sr-only"> (today)</span>}
                        </span>
                        <span className="tabular-nums">
                          {d.open && d.close ? `${d.open} – ${d.close}` : "Closed"}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                {!hoursAreVerified && (
                  <p className="mt-4 rounded-lg bg-shell px-3 py-2.5 text-[0.75rem] leading-relaxed text-graphite-faint">
                    Placeholder schedule — confirm with the salon before launch.
                  </p>
                )}
              </Reveal>

              {/* Contact */}
              <Reveal variant="drape" delay={0.08} className="glass frame-soft p-6 sm:p-7">
                <h3 className="font-display text-[1.375rem] text-graphite">Contact</h3>

                <ul className="mt-5 space-y-4 text-[0.9375rem]">
                  <li>
                    <p className="eyebrow text-[0.5rem]">Address</p>
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="mt-1.5 inline-block leading-snug text-graphite transition-colors duration-300 hover:text-copper"
                    >
                      {formattedAddress}
                    </a>
                  </li>

                  {hasRealPhone && (
                    <li>
                      <p className="eyebrow text-[0.5rem]">Phone</p>
                      <a
                        href={telHref}
                        className="mt-1.5 inline-block text-graphite transition-colors duration-300 hover:text-copper"
                      >
                        {site.phone}
                      </a>
                    </li>
                  )}

                  {hasRealEmail && (
                    <li>
                      <p className="eyebrow text-[0.5rem]">Email</p>
                      <a
                        href={`mailto:${site.email}`}
                        className="mt-1.5 inline-block break-all text-graphite transition-colors duration-300 hover:text-copper"
                      >
                        {site.email}
                      </a>
                    </li>
                  )}

                  {(site.social.instagram || site.social.facebook) && (
                    <li>
                      <p className="eyebrow text-[0.5rem]">Social</p>
                      <div className="mt-2.5 flex gap-2">
                        {site.social.instagram && (
                          <a
                            href={site.social.instagram}
                            target="_blank"
                            rel="noreferrer noopener"
                            aria-label="Instagram"
                            className="flex h-11 w-11 items-center justify-center rounded-full border border-taupe text-graphite-soft transition-all duration-300 hover:border-copper hover:text-copper"
                          >
                            <InstagramIcon />
                          </a>
                        )}
                        {site.social.facebook && (
                          <a
                            href={site.social.facebook}
                            target="_blank"
                            rel="noreferrer noopener"
                            aria-label="Facebook"
                            className="flex h-11 w-11 items-center justify-center rounded-full border border-taupe text-graphite-soft transition-all duration-300 hover:border-copper hover:text-copper"
                          >
                            <FacebookIcon />
                          </a>
                        )}
                      </div>
                    </li>
                  )}
                </ul>

                {(!hasRealPhone || !hasRealEmail) && (
                  <p className="mt-5 rounded-lg bg-shell px-3 py-2.5 text-[0.75rem] leading-relaxed text-graphite-faint">
                    Phone and email are hidden until the real details are supplied —
                    the site will not publish a number that does not connect.
                  </p>
                )}
              </Reveal>

              <Reveal variant="bloom" delay={0.12}>
                <Button href="#booking" size="lg" className="w-full">
                  Book Appointment
                </Button>
              </Reveal>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
