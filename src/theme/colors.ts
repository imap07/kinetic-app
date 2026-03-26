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
  onSurface: '#F8F9FE',
  onSurfaceVariant: '#A9ABAF',
  onSurfaceDim: '#6B6E73',

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
