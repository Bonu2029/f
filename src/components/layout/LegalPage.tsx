import Link from "next/link";
import Logo from "@/components/ui/Logo";
import Footer from "@/components/layout/Footer";
import { site } from "@/lib/site";

export default function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="shell flex items-center justify-between py-8">
        <Link href="/" aria-label={`${site.name} — home`}>
          <Logo size="md" />
        </Link>
        <Link
          href="/"
          className="min-h-[44px] rounded-full border border-taupe px-5 py-2.5 text-[0.8125rem] tracking-[0.08em] text-graphite transition-colors duration-300 hover:border-copper hover:text-copper"
        >
          ← Back
        </Link>
      </header>

      <main id="main" className="relative isolate overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[24rem]"
          style={{
            background:
              "radial-gradient(60% 100% at 30% 0%, rgba(239,224,203,0.75), transparent 70%)",
          }}
        />

        <article className="shell relative max-w-[46rem] pb-[clamp(4rem,8vw,7rem)] pt-[clamp(2rem,5vw,4rem)]">
          <p className="eyebrow">Legal</p>
          <h1 className="mt-5 font-display text-[clamp(2.25rem,6vw,4rem)] leading-[0.98] text-graphite">
            {title}
          </h1>
          <p className="mt-4 text-[0.8125rem] tracking-[0.08em] text-graphite-faint">
            Last updated {updated}
          </p>

          <div className="rule-copper my-10 opacity-60" />

          <div className="space-y-8 text-[1rem] leading-[1.8] text-graphite-soft [&_a]:text-copper [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-[1.375rem] [&_h2]:text-graphite [&_li]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
            {children}
          </div>

          <p className="mt-14 rounded-2xl bg-shell px-5 py-4 text-[0.8125rem] leading-relaxed text-graphite-faint">
            This page is a starting template, not legal advice. Have it reviewed
            before the site goes live.
          </p>
        </article>
      </main>

      <Footer />
    </>
  );
}
