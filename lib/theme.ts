// lib/theme.ts
// QMG brand tokens — mirrored exactly from the web app's PlatformUI.tsx `T` object.
// Green + Gold scheme (charcoal -> forest -> gold). Do NOT drift from these values.

export const C = {
  // Golds
  gold: '#C9A227',
  goldLight: '#E3C04A',
  goldPale: '#F5EDD0',
  accent2: '#8A6A16',
  // Greens
  forest: '#166534',
  forestDeep: '#16291E',
  success: '#16A34A',
  // Neutrals / ink
  ink: '#111111',
  ink900: '#111111',
  text: '#374151',
  muted: '#6B7280',
  faint: '#9CA3AF',
  // Surfaces
  cream: '#F8F5EE',
  card: '#FFFFFF',
  white: '#FFFFFF',
  // States
  red: '#DC2626',
  redMuted: '#B23A2A',
  orange: '#C2410C',
  indigo: '#4F46E5',
  // Tile tints (stat cards)
  tintGreen: 'rgba(22,101,52,0.08)',
  tintGold: 'rgba(201,162,39,0.12)',
  tintIndigo: 'rgba(79,70,229,0.08)',
  tintCream: '#F1ECE0',
  // Lines
  border: 'rgba(201,162,39,0.18)',
  borderSoft: 'rgba(201,162,39,0.12)',
  hoverGold: 'rgba(201,162,39,0.10)',
  // Text on dark
  textHi: '#FFFFFF',
  textMid: '#F5F5F5',
  textLo: '#CFCFCF',
} as const;

// Signature gradients (used with expo-linear-gradient: pass `colors` + start/end).
export const G = {
  // charcoal -> forest -> gold (hero / dashboard banner signature)
  signature: ['#111111', '#166534', '#C9A227'] as const,
  signatureLocations: [0, 0.55, 1] as const,
  // sidebar / shell dark (charcoal -> forest)
  dark: ['#111111', '#166534'] as const,
  // primary button (forest -> gold)
  primary: ['#166534', '#C9A227'] as const,
  // soft (forest -> gold lighter)
  soft: ['#166534', '#C9A227'] as const,
  // drawer panel (forest -> deep emerald), matches web side menu
  drawer: ['#175E33', '#0F3A22'] as const,
} as const;

export const RADIUS = { sm: 12, md: 16, lg: 20, xl: 24, sheet: 28, pill: 999 } as const;
// 8px spacing system: sm 8 · md 16 · lg 24 · section 32 (xs 4 for hairline gaps)
export const SPACE = { xs: 4, sm: 8, md: 16, lg: 24, section: 32, xl: 32 } as const;

// Soft, premium shadows (cross-platform).
export const SHADOW = {
  card: {
    shadowColor: '#0B1F14',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  lg: {
    shadowColor: '#0B1F14',
    shadowOpacity: 0.12,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
} as const;

// Font family names registered in app/_layout.tsx via expo-font.
export const FONT = {
  display: 'Fraunces_600SemiBold', // serif display (headings)
  displayBold: 'Fraunces_700Bold',
  body: 'Inter_400Regular',
  bodyMed: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
} as const;

export const STATUS_COLORS: Record<string, { bg: string; fg: string; label: string }> = {
  confirmed: { bg: 'rgba(22,101,52,0.10)', fg: '#166534', label: 'Confirmed' },
  active: { bg: 'rgba(22,101,52,0.10)', fg: '#166534', label: 'Active' },
  completed: { bg: 'rgba(22,101,52,0.10)', fg: '#166534', label: 'Completed' },
  approved: { bg: 'rgba(22,101,52,0.10)', fg: '#166534', label: 'Approved' },
  live: { bg: 'rgba(22,101,52,0.10)', fg: '#166534', label: 'Live' },
  scheduled: { bg: 'rgba(201,162,39,0.12)', fg: '#8A6A16', label: 'Scheduled' },
  pending: { bg: 'rgba(201,162,39,0.12)', fg: '#8A6A16', label: 'Pending' },
  cancelled: { bg: 'rgba(178,58,42,0.10)', fg: '#B23A2A', label: 'Cancelled' },
  rejected: { bg: 'rgba(178,58,42,0.10)', fg: '#B23A2A', label: 'Rejected' },
  no_show: { bg: 'rgba(107,114,128,0.12)', fg: '#6B7280', label: 'No show' },
};
