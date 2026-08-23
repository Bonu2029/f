import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { brand } from "@/config/brand";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface-muted">
      <header className="px-5 py-6 sm:px-8">
        <Logo />
      </header>

      <main className="flex flex-1 items-start justify-center px-5 pb-16 sm:items-center sm:px-8">
        <div className="w-full max-w-md">{children}</div>
      </main>

      <footer className="px-5 pb-8 text-center text-xs text-ink-400 sm:px-8">
        <Link href="/privacy" className="hover:text-ink-700">
          Privacy
        </Link>
        <span className="px-2">·</span>
        <Link href="/terms" className="hover:text-ink-700">
          Terms
        </Link>
        <span className="px-2">·</span>
        <span>
          © {new Date().getFullYear()} {brand.name}
        </span>
      </footer>
    </div>
  );
}
