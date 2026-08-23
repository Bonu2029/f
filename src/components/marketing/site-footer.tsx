import Link from "next/link";
import { brand } from "@/config/brand";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/ui/logo";

const footerLinks = [
  { href: "/how-it-works", label: "How It Works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/login", label: "Log In" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/contact", label: "Contact" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-white">
      <Container className="flex flex-col gap-8 py-12 sm:flex-row sm:items-center sm:justify-between">
        <Logo />
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-3">
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-ink-700 transition-colors hover:text-ink-950"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </Container>
      <Container className="border-t border-line py-6">
        <p className="text-xs text-ink-400">
          © {new Date().getFullYear()} {brand.name}. All rights reserved.
        </p>
      </Container>
    </footer>
  );
}
