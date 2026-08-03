import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = (props: IconProps) => ({
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: "false" as const,
  ...props,
});

export const ArrowUpRight = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M7 17 17 7M8 7h9v9" />
  </svg>
);

export const ArrowRight = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 12h16M14 6l6 6-6 6" />
  </svg>
);

export const ArrowLeft = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M20 12H4M10 6l-6 6 6 6" />
  </svg>
);

export const ChevronDown = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const ChevronLeft = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m15 6-6 6 6 6" />
  </svg>
);

export const ChevronRight = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);

export const Close = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const Check = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m4 12.5 5 5L20 6.5" />
  </svg>
);

export const Star = ({ filled = false, ...p }: IconProps & { filled?: boolean }) => (
  <svg {...base(p)} fill={filled ? "currentColor" : "none"}>
    <path d="m12 3.6 2.6 5.4 5.9.8-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.8l5.9-.8L12 3.6Z" />
  </svg>
);

export const Clock = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 1.8" />
  </svg>
);

export const MapPin = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" />
    <circle cx="12" cy="10" r="2.6" />
  </svg>
);

export const Phone = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6.3 3.5h3l1.5 4-2 1.4a12 12 0 0 0 5.3 5.3l1.4-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.3 5.7a2 2 0 0 1 2-2.2Z" />
  </svg>
);

export const Mail = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="5.5" width="18" height="13" rx="2" />
    <path d="m3.8 6.7 8.2 6 8.2-6" />
  </svg>
);

export const Calendar = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2.2" />
    <path d="M3.5 10h17M8.5 3v4M15.5 3v4" />
  </svg>
);

export const User = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="8.5" r="3.8" />
    <path d="M4.8 20a7.4 7.4 0 0 1 14.4 0" />
  </svg>
);

export const Scissors = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="6.5" cy="17.5" r="2.8" />
    <circle cx="6.5" cy="6.5" r="2.8" />
    <path d="M8.7 8.4 20 19M20 5 8.7 15.6" />
  </svg>
);

export const Razor = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M14.5 3.5 20.5 9.5 9 21H3v-6L14.5 3.5Z" />
    <path d="M11.5 6.5 17.5 12.5" />
  </svg>
);

export const Quote = (p: IconProps) => (
  <svg {...base(p)} fill="currentColor" stroke="none" viewBox="0 0 32 24">
    <path d="M0 24V13.4C0 6.3 3.7 1.8 11 0l1.4 3.6C8.2 5.1 6.1 7.4 6 10.4h4.9V24H0Zm18.6 0V13.4c0-7.1 3.7-11.6 11-13.4L31 3.6c-4.2 1.5-6.3 3.8-6.4 6.8h4.9V24h-10.9Z" />
  </svg>
);

export const Instagram = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="4.6" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.1" cy="6.9" r="1" fill="currentColor" stroke="none" />
  </svg>
);

export const Facebook = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M14.8 21v-8h2.7l.5-3.2h-3.2V7.7c0-.9.3-1.6 1.7-1.6H18V3.2A22 22 0 0 0 15.5 3c-2.6 0-4.3 1.5-4.3 4.4v2.4H8.4V13h2.8v8h3.6Z" />
  </svg>
);

export const TikTok = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M14.4 3v11.6a3.4 3.4 0 1 1-2.8-3.35" />
    <path d="M14.4 3c.5 2.5 2 4 4.6 4.3" />
  </svg>
);

export const socialIcon = {
  Instagram,
  Facebook,
  TikTok,
} as const;
