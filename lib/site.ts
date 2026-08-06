export const site = {
  name: 'LumaNest Cleaning',
  shortName: 'LumaNest',
  tagline: 'Your home, beautifully reset.',
  secondary: 'More than cleaning. A personalized home-care experience.',
  description:
    'LumaNest builds personalized cleaning plans around your home, your surfaces, your pets and your routines — with transparent estimates and easy booking.',
  // Placeholder — replace with the real production domain before launch.
  url: 'https://www.lumanest.example',
  // PLACEHOLDER contact details. Replace with verified business information.
  phone: '(000) 000-0000',
  phoneHref: 'tel:+10000000000',
  email: 'hello@lumanest.example',
  supportEmail: 'support@lumanest.example',
  hours: 'Mon–Fri 8:00am–6:00pm · Sat 9:00am–3:00pm (placeholder hours)',
  addressPlaceholder: 'Service address to be confirmed',
} as const;

export type NavChild = {
  label: string;
  href: string;
  description?: string;
};

export type NavItem = {
  label: string;
  href: string;
  columns?: { title: string; items: NavChild[] }[];
  featured?: { title: string; body: string; href: string; cta: string };
};

export const primaryNav: NavItem[] = [
  {
    label: 'Services',
    href: '/services',
    columns: [
      {
        title: 'Cleaning services',
        items: [
          {
            label: 'Standard Cleaning',
            href: '/services/standard-cleaning',
            description: 'Regular maintenance for a consistently fresh home.',
          },
          {
            label: 'Deep Cleaning',
            href: '/services/deep-cleaning',
            description: 'Detailed work on the areas routine visits skip.',
          },
          {
            label: 'Move-In & Move-Out',
            href: '/services/move-in-move-out',
            description: 'A complete reset for an empty property.',
          },
          {
            label: 'Recurring Cleaning',
            href: '/services/recurring-cleaning',
            description: 'A rhythm that matches how you actually live.',
          },
          {
            label: 'Airbnb & Rental Turnover',
            href: '/services/airbnb-cleaning',
            description: 'Guest-ready resets with photo confirmation.',
          },
        ],
      },
      {
        title: 'Discover',
        items: [
          {
            label: 'Build Your Clean',
            href: '/build-your-clean',
            description: 'Design a visit room by room.',
          },
          {
            label: 'Instant Estimate',
            href: '/instant-estimate',
            description: 'A transparent, itemized price range.',
          },
          {
            label: 'CleanMatch',
            href: '/clean-match',
            description: 'Find the plan that fits your household.',
          },
          {
            label: 'Before & After',
            href: '/before-after',
            description: 'Demonstration transformations.',
          },
          {
            label: 'Trust & Safety',
            href: '/trust-safety',
            description: 'How we handle access, privacy and care.',
          },
        ],
      },
    ],
    featured: {
      title: 'Not sure which service fits?',
      body: 'CleanMatch asks twelve short questions and recommends a service, a frequency and a cleaning mode.',
      href: '/clean-match',
      cta: 'Take CleanMatch',
    },
  },
  { label: 'Build Your Clean', href: '/build-your-clean' },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'Membership', href: '/membership' },
  { label: 'About', href: '/about' },
];

export const footerNav = {
  services: [
    { label: 'Standard Cleaning', href: '/services/standard-cleaning' },
    { label: 'Deep Cleaning', href: '/services/deep-cleaning' },
    { label: 'Move-In & Move-Out', href: '/services/move-in-move-out' },
    { label: 'Recurring Cleaning', href: '/services/recurring-cleaning' },
    { label: 'Airbnb & Rental Turnover', href: '/services/airbnb-cleaning' },
    { label: 'All services', href: '/services' },
  ],
  company: [
    { label: 'About LumaNest', href: '/about' },
    { label: 'How It Works', href: '/how-it-works' },
    { label: 'Trust & Safety', href: '/trust-safety' },
    { label: 'Membership', href: '/membership' },
    { label: 'Before & After', href: '/before-after' },
    { label: 'Locations', href: '/locations' },
  ],
  support: [
    { label: 'Book a cleaning', href: '/booking' },
    { label: 'Instant estimate', href: '/instant-estimate' },
    { label: 'My Home Profile', href: '/home-profile' },
    { label: 'Customer dashboard', href: '/customer-dashboard' },
    { label: 'FAQ', href: '/faq' },
    { label: 'Contact us', href: '/contact' },
  ],
  legal: [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Accessibility', href: '/terms#accessibility' },
  ],
} as const;
