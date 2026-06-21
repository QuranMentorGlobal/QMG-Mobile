// src/theme/typography.ts
// Fraunces (display/headings) + Inter (body) — same as the web platform.
// Font families are registered in App.tsx via @expo-google-fonts.
export const fonts = {
  display:       'Fraunces_700Bold',
  displaySemi:   'Fraunces_600SemiBold',
  body:          'Inter_400Regular',
  bodyMedium:    'Inter_500Medium',
  bodySemi:      'Inter_600SemiBold',
  bodyBold:      'Inter_700Bold',
} as const;

// Fallback so the UI renders even before fonts finish loading.
export const fontFallback = {
  display: undefined,
  body: undefined,
} as const;

export const type = {
  h1: { fontFamily: fonts.display,     fontSize: 30, lineHeight: 36 },
  h2: { fontFamily: fonts.display,     fontSize: 24, lineHeight: 30 },
  h3: { fontFamily: fonts.displaySemi, fontSize: 19, lineHeight: 25 },
  title: { fontFamily: fonts.bodySemi, fontSize: 17, lineHeight: 23 },
  body: { fontFamily: fonts.body,      fontSize: 15, lineHeight: 22 },
  bodyMed: { fontFamily: fonts.bodyMedium, fontSize: 15, lineHeight: 22 },
  small: { fontFamily: fonts.body,     fontSize: 13, lineHeight: 18 },
  tiny: { fontFamily: fonts.bodyMedium, fontSize: 11, lineHeight: 14 },
  label: { fontFamily: fonts.bodySemi, fontSize: 12, lineHeight: 16, letterSpacing: 0.4 },
} as const;
