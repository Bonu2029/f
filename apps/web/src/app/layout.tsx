import type { Metadata, Viewport } from 'next';
import { brand, pageTitle } from '@afd/shared';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: pageTitle(),
    template: `%s · ${brand.name}`,
  },
  description: brand.description,
  applicationName: brand.name,
  authors: [{ name: brand.legalEntity }],
  openGraph: {
    title: pageTitle(),
    description: brand.description,
    siteName: brand.name,
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: brand.colors.background,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
