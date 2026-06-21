// src/theme/colors.ts
// QMG premium identity — charcoal + dark gold + white text + cream secondary.
// Mirrors the web platform / admin panel. NO green.
export const colors = {
  // Primary (charcoal / black) surfaces
  bg:           '#0B0B0B', // app background (deep charcoal-black)
  surface:      '#151515', // elevated card on dark
  surfaceAlt:   '#1C1C1C', // secondary dark surface / inputs
  surfaceLine:  '#262626', // hairline borders on dark

  // Cream secondary surfaces (light panels used sparingly on dark)
  cream:        '#F7F5F0',
  creamAlt:     '#F5F0E8',
  creamLine:    '#E6DFD2',

  // Gold accents
  gold:         '#C8A24A', // primary gold
  goldBright:   '#D4AF37', // hover / highlight gold
  goldSoft:     'rgba(200,162,74,0.14)', // gold tint fill
  goldOnDark:   '#1A1400', // REQUIRED dark text for gold buttons/badges (contrast)

  // Text
  text:         '#FFFFFF', // primary on dark
  textSoft:     '#E7E3DA', // secondary on dark
  textMuted:    '#9A958A', // muted on dark
  textOnCream:  '#111111', // primary on cream/gold
  textOnCreamMuted: '#5C5749',

  // States
  success:      '#3FB27F',
  danger:       '#E5544B',
  white:        '#FFFFFF',
  black:        '#000000',
} as const;

export type AppColors = typeof colors;
