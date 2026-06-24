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
} as const;

export const RADIUS = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 } as const;
export const SPACE = { xs: 6, sm: 10, md: 16, lg: 22, xl: 30 } as const;

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
