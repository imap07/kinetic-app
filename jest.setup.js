// Neutralize all Expo winter-runtime lazy globals. Under jest-expo@55 their
// lazy getters trigger "outside the scope of the test code" when jest runs.
const winterGlobals = [
  '__ExpoImportMetaRegistry',
  'TextDecoder',
  'TextDecoderStream',
  'TextEncoderStream',
  'URL',
  'URLSearchParams',
  'structuredClone',
];
for (const name of winterGlobals) {
  try {
    Object.defineProperty(globalThis, name, {
      value: globalThis[name] ?? {},
      configurable: true,
      writable: true,
      enumerable: false,
    });
  } catch {
    /* some globals (URL, TextDecoder) already exist in node — skip */
  }
}

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en', languageTag: 'en-US' }],
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));
