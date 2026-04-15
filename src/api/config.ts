import { Platform } from 'react-native';

const DEV_HOST = Platform.select({
  android: '10.0.2.2',
  default: 'localhost',
});

/**
 * API_BASE_URL resolution:
 *   1. EXPO_PUBLIC_API_URL from the build environment (required in prod).
 *   2. In __DEV__ we fall back to a local dev server so simulator builds
 *      work out of the box.
 *   3. In production builds we deliberately throw if the env var is missing,
 *      rather than defaulting to some hardcoded host. A hardcoded production
 *      default is dangerous: if the build pipeline ever drops the env var,
 *      every single JWT, refresh token, and login credential would be sent
 *      to whatever domain is baked in — potentially an unowned or malicious
 *      one. Failing loudly at app startup is much safer than silently
 *      exfiltrating credentials.
 *
 * If you see this crash on a release build, fix your EAS / Xcode / Gradle
 * environment to inject EXPO_PUBLIC_API_URL. Never paper over it with a
 * hardcoded string.
 */
function resolveApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv && fromEnv.startsWith('https://')) {
    return fromEnv;
  }
  if (fromEnv && __DEV__) {
    // Allow http://... in dev builds only.
    return fromEnv;
  }
  if (__DEV__) {
    return `http://${DEV_HOST}:3000/api`;
  }
  throw new Error(
    'EXPO_PUBLIC_API_URL is required for production builds. ' +
      'Refusing to fall back to a hardcoded host — that would leak ' +
      'credentials to an unowned domain.',
  );
}

export const API_BASE_URL = resolveApiBaseUrl();
