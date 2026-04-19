export const colors = {
  // Base surfaces
  background: '#0B0E11',
  surface: '#0B0E11',
  surfaceContainerLow: '#101417',
  surfaceContainer: '#1A1D21',
  surfaceContainerHigh: '#1E2226',
  surfaceContainerHighest: '#22262B',
  surfaceVariant: '#2A2E33',

  // Primary - Electric Lime
  primary: '#CAFD00',
  primaryContainer: '#F3FFCA',
  onPrimary: '#0B0E11',
  onPrimaryContainer: '#0B0E11',

  // Tertiary - Bright Orange (Live/Urgent)
  tertiary: '#FC5B00',
  tertiaryLight: '#FF7439',
  onTertiary: '#FFFFFF',

  // Secondary
  secondary: '#4CAF50',
  secondaryDim: '#2E7D32',

  // Text
  //
  // Contrast targets (WCAG AA on the primary dark surfaces):
  //   onSurface        #F8F9FE vs #0B0E11 → 17.3:1  ✓ body + large
  //   onSurfaceVariant #A9ABAF vs #0B0E11 →  7.8:1  ✓ body + large
  //   onSurfaceDim     #7E8085 vs #0B0E11 →  4.8:1  ✓ body
  //
  // `onSurfaceDim` was #6B6E73 (3.3:1) which failed AA for body text.
  // Bumped to #7E8085 — a single step brighter, keeps the "dim" feel
  // but passes AA so captions and "Best: N days" labels don't get
  // flagged by screen reader audits. Previous value preserved in git
  // history if we ever need to reference the old visual weight.
  onSurface: '#F8F9FE',
  onSurfaceVariant: '#A9ABAF',
  onSurfaceDim: '#7E8085',

  // Outline
  outline: '#3A3E44',
  outlineVariant: 'rgba(58, 62, 68, 0.15)',

  // States
  error: '#FF4444',
  success: '#CAFD00',
  warning: '#FC5B00',
  info: '#4FC3F7',

  // Misc
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',

  // Gradients (used as references)
  primaryGradientStart: '#CAFD00',
  primaryGradientEnd: '#F3FFCA',
} as const;

export type ColorToken = keyof typeof colors;
