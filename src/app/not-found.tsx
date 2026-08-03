import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { LogoMark } from "@/components/ui/Logo";
import { navLinks } from "@/lib/data";

export default function NotFound() {
  return (
    <section className="relative isolate flex min-h-[80svh] flex-col justify-center overflow-hidden bg-navy-950 py-32 text-ivory-100">
      <div className="grain grain-light absolute inset-0 opacity-35" />
      <div
        aria-hidden
        className="absolute top-1/4 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full
                   bg-[radial-gradient(circle,rgba(180,112,63,0.16),transparent_65%)] blur-2xl"
      />

      <div className="shell relative max-w-2xl">
        <LogoMark className="h-12 w-auto text-copper-400" />
        <p className="mt-8 font-sans text-[0.625rem] tracking-[0.24em] text-copper-300 uppercase">
          Error 404
        </p>
        <h1 className="mt-4 font-display text-[clamp(2.25rem,6vw,4rem)] leading-[1.04]">
          That chair is empty.
        </h1>
        <p className="mt-5 text-[0.9375rem] leading-relaxed text-steel-200">
          The page you were after has moved or never existed. Everything else is still
          where you left it.
        </p>

        <div className="mt-9 flex flex-wrap gap-3">
          <ButtonLink href="/" size="lg">
            Back to the shop
          </ButtonLink>
          <ButtonLink href="/#booking" size="lg" variant="outline" className="text-ivory-100">
            Book an appointment
          </ButtonLink>
        </div>

        <nav aria-label="Site sections" className="mt-12 border-t border-ivory-100/12 pt-7">
          <ul className="flex flex-wrap gap-x-6 gap-y-3 text-[0.6875rem] tracking-[0.18em] text-ivory-100/60 uppercase">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="transition-colors hover:text-copper-300">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </section>
  );
}
