"use client";

import type { ReactNode } from "react";
import { MaskedLines, Reveal } from "@/components/ui/motion";

export function SectionHeading({
  eyebrow,
  lines,
  intro,
  align = "left",
  tone = "dark",
  className = "",
  action,
}: {
  eyebrow: string;
  lines: ReactNode[];
  intro?: ReactNode;
  align?: "left" | "center";
  /** `dark` = ink on light surfaces, `light` = ivory on navy. */
  tone?: "dark" | "light";
  className?: string;
  action?: ReactNode;
}) {
  const centered = align === "center";

  return (
    <div
      className={`flex flex-col gap-6 ${
        centered ? "items-center text-center" : "md:flex-row md:items-end md:justify-between"
      } ${className}`}
    >
      <div className={centered ? "max-w-2xl" : "max-w-3xl"}>
        <Reveal>
          <span className={`eyebrow ${tone === "light" ? "text-copper-300" : "text-copper-600"}`}>
            {eyebrow}
          </span>
        </Reveal>

        <MaskedLines
          as="h2"
          lines={lines}
          delay={0.05}
          className={`mt-5 text-[clamp(2.1rem,5.4vw,4rem)] leading-[1.04] ${
            tone === "light" ? "text-ivory-100" : "text-navy-900"
          }`}
        />

        {intro && (
          <Reveal delay={0.18}>
            <p
              className={`mt-5 max-w-xl text-[0.9375rem] leading-relaxed ${
                centered ? "mx-auto" : ""
              } ${tone === "light" ? "text-steel-200" : "text-navy-800/75"}`}
            >
              {intro}
            </p>
          </Reveal>
        )}
      </div>

      {action && (
        <Reveal delay={0.24} className={centered ? "" : "shrink-0"}>
          {action}
        </Reveal>
      )}
    </div>
  );
}
