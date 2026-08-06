import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ivory: '#FFF9F2',
        pearl: '#F7F5F0',
        mint: '#CFE8DE',
        sage: '#AFCDBF',
        airy: '#CFE3F3',
        lavender: '#DDD8F0',
        champagne: '#E8D8C3',
        ink: '#39443F',
        muted: '#6E7C75',
        accent: {
          DEFAULT: '#5F8F7B',
          soft: '#7BA894',
          deep: '#4E7A68',
        },
        line: '#E7E4DC',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'Cambria', 'serif'],
        sans: ['var(--font-body)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
        '4xl': '2.5rem',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(57,68,63,0.04), 0 8px 24px -12px rgba(57,68,63,0.14)',
        lift: '0 2px 6px rgba(57,68,63,0.05), 0 22px 44px -22px rgba(57,68,63,0.24)',
        inset: 'inset 0 1px 0 rgba(255,255,255,0.65)',
      },
      backgroundImage: {
        'luma-gradient':
          'linear-gradient(135deg, #FFF9F2 0%, #EAF5F0 50%, #EEF3FA 100%)',
        'luma-veil':
          'radial-gradient(80% 60% at 15% 10%, rgba(207,232,222,0.55) 0%, rgba(255,249,242,0) 60%), radial-gradient(70% 70% at 90% 20%, rgba(207,227,243,0.5) 0%, rgba(255,249,242,0) 62%)',
      },
      maxWidth: {
        prose: '68ch',
      },
      transitionTimingFunction: {
        luma: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        'fade-rise': {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        drift: {
          '0%': { transform: 'translate3d(0,0,0)' },
          '50%': { transform: 'translate3d(0,-14px,0)' },
          '100%': { transform: 'translate3d(0,0,0)' },
        },
        sheen: {
          '0%': { transform: 'translateX(-60%)', opacity: '0' },
          '35%': { opacity: '0.55' },
          '100%': { transform: 'translateX(140%)', opacity: '0' },
        },
      },
      animation: {
        'fade-rise': 'fade-rise 0.7s cubic-bezier(0.22,1,0.36,1) both',
        drift: 'drift 12s ease-in-out infinite',
        sheen: 'sheen 9s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
