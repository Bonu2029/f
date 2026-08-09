/* Inline SVG icons — stroke-based, sized to match iOS-style UI. */

const S = ({ children, size = 22, fill = "none", stroke = "currentColor", w = 2 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke={stroke}
    strokeWidth={w}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);

export const IcBell = (p) => (
  <S {...p}>
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.7 21a2 2 0 01-3.4 0" />
  </S>
);

export const IcHome = ({ active, ...p }) => (
  <S {...p} fill={active ? "currentColor" : "none"}>
    <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z" />
  </S>
);

export const IcFeed = ({ active, ...p }) => (
  <S {...p} fill={active ? "currentColor" : "none"}>
    <rect x="3" y="4" width="18" height="16" rx="3" />
    <path d="M7 9h6M7 13h10M7 17h5" stroke={active ? "#000" : "currentColor"} />
  </S>
);

export const IcTrophy = ({ active, ...p }) => (
  <S {...p} fill={active ? "currentColor" : "none"}>
    <path d="M7 4h10v5a5 5 0 01-10 0z" />
    <path d="M17 5h3v2a3 3 0 01-3 3M7 5H4v2a3 3 0 003 3" />
    <path d="M12 14v4M8 21h8M10 21v-3h4v3" />
  </S>
);

export const IcWallet = ({ active, ...p }) => (
  <S {...p} fill={active ? "currentColor" : "none"}>
    <rect x="3" y="6" width="18" height="13" rx="3" />
    <path d="M3 10h18" />
    <circle cx="17" cy="14.5" r="1.2" fill={active ? "#000" : "currentColor"} stroke="none" />
  </S>
);

export const IcSearch = (p) => (
  <S {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </S>
);

export const IcStar = ({ filled, ...p }) => (
  <S {...p} fill={filled ? "currentColor" : "none"}>
    <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
  </S>
);

export const IcChevron = ({ dir = "right", ...p }) => {
  const rot = { right: 0, left: 180, up: -90, down: 90 }[dir];
  return (
    <span style={{ display: "inline-flex", transform: `rotate(${rot}deg)` }}>
      <S {...p}>
        <path d="M9 5l7 7-7 7" />
      </S>
    </span>
  );
};

export const IcClose = (p) => (
  <S {...p}>
    <path d="M18 6L6 18M6 6l12 12" />
  </S>
);

export const IcBack = (p) => (
  <S {...p}>
    <path d="M15 5l-7 7 7 7" />
  </S>
);

export const IcArrowUp = (p) => (
  <S {...p} w={2.6}>
    <path d="M12 19V5M5 12l7-7 7 7" />
  </S>
);

export const IcArrowDown = (p) => (
  <S {...p} w={2.6}>
    <path d="M12 5v14M19 12l-7 7-7-7" />
  </S>
);

export const IcSwap = (p) => (
  <S {...p}>
    <path d="M7 4v16M7 20l-3-3M7 20l3-3" />
    <path d="M17 20V4M17 4l-3 3M17 4l3 3" />
  </S>
);

export const IcShare = (p) => (
  <S {...p}>
    <path d="M12 16V4M12 4L8 8M12 4l4 4" />
    <path d="M4 14v4a2 2 0 002 2h12a2 2 0 002-2v-4" />
  </S>
);

export const IcComment = (p) => (
  <S {...p}>
    <path d="M21 12a8 8 0 01-8 8H7l-4 3 1-5.5A8 8 0 1121 12z" />
  </S>
);

export const IcEyes = (p) => (
  <S {...p} w={1.8}>
    <circle cx="8" cy="12" r="4.5" />
    <circle cx="16" cy="12" r="4.5" />
    <circle cx="9" cy="12" r="1.4" fill="currentColor" />
    <circle cx="17" cy="12" r="1.4" fill="currentColor" />
  </S>
);

export const IcTrend = (p) => (
  <S {...p} w={2.4}>
    <path d="M3 17l6-6 4 4 7-7" />
    <path d="M15 8h5v5" />
  </S>
);

export const IcCheck = (p) => (
  <S {...p} w={3}>
    <path d="M20 6L9 17l-5-5" />
  </S>
);

export const IcPlus = (p) => (
  <S {...p} w={2.4}>
    <path d="M12 5v14M5 12h14" />
  </S>
);

export const IcTrash = (p) => (
  <S {...p}>
    <path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13" />
  </S>
);

export const IcGear = (p) => (
  <S {...p}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-2.7 1.1V21a2 2 0 11-4 0v-.1A1.6 1.6 0 007.9 19l-.1.1A2 2 0 115 16.3l.1-.1a1.6 1.6 0 00-1.1-2.7H3a2 2 0 110-4h.1A1.6 1.6 0 005 7.9l-.1-.1A2 2 0 117.7 5l.1.1a1.6 1.6 0 001.8.3H10a1.6 1.6 0 001-1.5V3a2 2 0 114 0v.1a1.6 1.6 0 001 1.5 1.6 1.6 0 001.8-.3l.1-.1A2 2 0 1119.7 7l-.1.1a1.6 1.6 0 00-.3 1.8V9a1.6 1.6 0 001.5 1H21a2 2 0 110 4h-.1a1.6 1.6 0 00-1.5 1z" />
  </S>
);

export const IcExternal = (p) => (
  <S {...p}>
    <path d="M14 4h6v6M20 4l-9 9" />
    <path d="M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5" />
  </S>
);

export const IcDots = (p) => (
  <S {...p} stroke="none" fill="currentColor">
    <circle cx="5" cy="12" r="1.8" />
    <circle cx="12" cy="12" r="1.8" />
    <circle cx="19" cy="12" r="1.8" />
  </S>
);

export const IcApple = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.05 12.5c.02-2.1 1.72-3.1 1.8-3.15-.98-1.44-2.5-1.63-3.04-1.65-1.3-.13-2.53.76-3.19.76-.65 0-1.67-.74-2.74-.72-1.41.02-2.71.82-3.44 2.08-1.46 2.54-.37 6.3 1.05 8.36.7 1.01 1.53 2.14 2.62 2.1 1.05-.04 1.45-.68 2.72-.68 1.27 0 1.63.68 2.74.66 1.13-.02 1.85-1.03 2.54-2.04.8-1.17 1.13-2.3 1.15-2.36-.03-.01-2.2-.85-2.21-3.36zM15.1 5.9c.58-.7.97-1.68.86-2.65-.83.03-1.84.55-2.44 1.25-.53.62-1 1.61-.87 2.56.93.07 1.87-.47 2.45-1.16z" />
  </svg>
);

export const IcLogo = ({ size = 30 }) => (
  <svg width={size * 1.5} height={size} viewBox="0 0 60 40" fill="none">
    <ellipse cx="17" cy="20" rx="11" ry="15" fill="#fff" />
    <ellipse cx="39" cy="20" rx="11" ry="15" fill="#fff" />
    <ellipse cx="19" cy="21" rx="4.5" ry="7" fill="#000" />
    <ellipse cx="41" cy="21" rx="4.5" ry="7" fill="#000" />
  </svg>
);
