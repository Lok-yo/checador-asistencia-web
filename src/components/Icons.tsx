import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;

const base = (props: P) => ({
  width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  'aria-hidden': true, focusable: false, ...props,
});

/** Flecha que entra por una puerta. */
export const EntryIcon = (p: P) => (
  <svg {...base(p)}><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" /><path d="M3 12h11" /><path d="m10 8 4 4-4 4" /></svg>
);
/** Flecha que sale por una puerta. */
export const ExitIcon = (p: P) => (
  <svg {...base(p)}><path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" /><path d="M10 12h11" /><path d="m17 8 4 4-4 4" /></svg>
);
export const RefreshIcon = (p: P) => (
  <svg {...base(p)}><path d="M20 11a8 8 0 0 0-14.3-4.9L4 8" /><path d="M4 3v5h5" /><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16" /><path d="M20 21v-5h-5" /></svg>
);
export const ScreenIcon = (p: P) => (
  <svg {...base(p)}><rect x="2" y="4" width="20" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></svg>
);
export const LogoutIcon = (p: P) => (
  <svg {...base(p)}><path d="M9 20H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h4" /><path d="M16 16l4-4-4-4" /><path d="M20 12H9" /></svg>
);
export const PhotoIcon = (p: P) => (
  <svg {...base(p)}><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
);
export const CloseIcon = (p: P) => (
  <svg {...base(p)}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const SearchIcon = (p: P) => (
  <svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);
export const ClockMark = (p: P) => (
  <svg {...base({ viewBox: '0 0 64 64', width: 36, height: 36, strokeWidth: 0, ...p })}>
    <rect width="64" height="64" rx="14" fill="#14243A" />
    <circle cx="32" cy="32" r="19" fill="none" stroke="#EDF1F0" strokeWidth="3.5" />
    <path d="M32 32V20M32 32l-10 6" stroke="#EDF1F0" strokeWidth="3" strokeLinecap="round" />
    <circle cx="32" cy="32" r="3.2" fill="#F2C230" />
  </svg>
);
