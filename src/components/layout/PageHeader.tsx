"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { MaskedLines, Reveal } from "@/components/ui/motion";

/** Compact hero used by the inner pages, so they never start on a blank slab. */
export function PageHeader({
  eyebrow,
  lines,
  intro,
  breadcrumb,
}: {
  eyebrow: string;
  lines: ReactNode[];
  intro?: ReactNode;
  breadcrumb: string;
}) {
  return (
    <header className="relative isolate overflow-hidden bg-navy-950 pt-36 pb-16 text-ivory-100 sm:pt-44 sm:pb-20">
      <div className="grain grain-light absolute inset-0 opacity-35" />
      <div
        aria-hidden
        className="absolute -top-32 left-1/3 h-[30rem] w-[30rem] rounded-full
                   bg-[radial-gradient(circle,rgba(180,112,63,0.18),transparent_65%)] blur-2xl"
      />
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-px rule-copper opacity-60" />

      <div className="shell relative">
        <Reveal>
          <nav aria-label="Breadcrumb" className="text-[0.625rem] tracking-[0.22em] uppercase">
            <ol className="flex items-center gap-2.5 text-ivory-100/50">
              <li>
                <Link href="/" className="transition-colors hover:text-copper-300">
                  Home
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li className="text-copper-300">{breadcrumb}</li>
            </ol>
          </nav>
        </Reveal>

        <Reveal delay={0.06}>
          <span className="eyebrow mt-8 text-copper-300">{eyebrow}</span>
        </Reveal>

        <MaskedLines
          as="h1"
          lines={lines}
          delay={0.1}
          className="mt-5 max-w-3xl font-display text-[clamp(2.25rem,6vw,4.5rem)] leading-[1.02]"
        />

        {intro && (
          <Reveal delay={0.2}>
            <p className="mt-6 max-w-xl text-[0.9375rem] leading-relaxed text-steel-200">{intro}</p>
          </Reveal>
        )}
      </div>
    </header>
  );
}
