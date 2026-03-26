import { TextStyle } from 'react-native';

export const fontFamilies = {
  display: 'SpaceGrotesk_700Bold',
  displayMedium: 'SpaceGrotesk_500Medium',
  displayRegular: 'SpaceGrotesk_400Regular',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
} as const;

export const typography: Record<string, TextStyle> = {
  // Display
  displayLg: {
    fontFamily: fontFamilies.display,
    fontSize: 40,
    lineHeight: 48,
    letterSpacing: -0.5,
  },
  displayMd: {
    fontFamily: fontFamilies.display,
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.25,
  },
  displaySm: {
    fontFamily: fontFamilies.display,
    fontSize: 28,
    lineHeight: 36,
  },

  // Headlines
  headlineLg: {
    fontFamily: fontFamilies.display,
    fontSize: 24,
    lineHeight: 32,
  },
  headlineMd: {
    fontFamily: fontFamilies.displayMedium,
    fontSize: 22,
    lineHeight: 28,
  },
  headlineSm: {
    fontFamily: fontFamilies.displayMedium,
    fontSize: 18,
    lineHeight: 24,
  },

  // Titles
  titleLg: {
    fontFamily: fontFamilies.display,
    fontSize: 20,
    lineHeight: 28,
  },
  titleMd: {
    fontFamily: fontFamilies.displayMedium,
    fontSize: 16,
    lineHeight: 24,
  },
  titleSm: {
    fontFamily: fontFamilies.displayMedium,
    fontSize: 14,
    lineHeight: 20,
  },

  // Body
  bodyLg: {
    fontFamily: fontFamilies.body,
    fontSize: 16,
    lineHeight: 24,
  },
  bodyMd: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
    lineHeight: 20,
  },
  bodySm: {
    fontFamily: fontFamilies.body,
    fontSize: 12,
    lineHeight: 16,
  },

  // Labels
  labelLg: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  labelMd: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  labelSm: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
};
