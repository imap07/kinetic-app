import appCheck from '@react-native-firebase/app-check';

/**
 * Firebase App Check — proves this request comes from our genuine,
 * unmodified app on a genuine device.
 *
 *   - Android → Play Integrity. Repackaged/pirated APKs (the ones being
 *     side-loaded from third-party stores) cannot produce a valid token.
 *   - iOS     → App Attest (iOS 14+).
 *
 * The backend verifies the token (see kinetic-backend AppCheckGuard) and,
 * when the `app_check_enforced` flag is on, rejects requests without one.
 *
 * Init never blocks app boot: if attestation isn't available (debug build
 * without a registered debug token, missing Play Services, etc.) we just
 * fail soft — the server decides whether to enforce.
 */

let initialized = false;
let initPromise: Promise<void> | null = null;
// Last successfully-fetched token, used as a fallback if a later refresh
// transiently fails (network blip) so we don't suddenly send nothing.
let lastToken: string | null = null;

export async function initAppCheck(): Promise<void> {
  if (initialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const provider = appCheck().newReactNativeFirebaseAppCheckProvider();
      provider.configure({
        android: {
          // Real builds attest via Play Integrity; dev builds use the
          // debug provider (register the printed debug token in the
          // Firebase console, or pass one via EXPO_PUBLIC_*).
          provider: __DEV__ ? 'debug' : 'playIntegrity',
          debugToken: process.env.EXPO_PUBLIC_APP_CHECK_DEBUG_TOKEN_ANDROID,
        },
        apple: {
          provider: __DEV__ ? 'debug' : 'appAttest',
          debugToken: process.env.EXPO_PUBLIC_APP_CHECK_DEBUG_TOKEN_IOS,
        },
      });

      await appCheck().initializeAppCheck({
        provider,
        isTokenAutoRefreshEnabled: true,
      });
      initialized = true;
    } catch (err) {
      // Never let attestation setup crash startup — the backend flag is
      // the real gate. Surface for debugging only.
      console.warn('[AppCheck] initialization failed:', err);
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}

/**
 * Returns a current App Check token (or null). RNFirebase caches the
 * token internally and refreshes it when near expiry, so calling this
 * per-request is cheap. On transient failure we return the last known
 * good token rather than nothing.
 */
export async function getAppCheckToken(): Promise<string | null> {
  try {
    const { token } = await appCheck().getToken(false);
    if (token) lastToken = token;
    return token || lastToken;
  } catch {
    return lastToken;
  }
}
