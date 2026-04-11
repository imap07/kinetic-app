import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Per-install device fingerprint.
 *
 * NOT a hardware ID, NOT a secret, NOT a privacy concern — it's just a
 * stable random UUID persisted in SecureStore. Its only purpose is to
 * let the server correlate sessions coming from the same install so it
 * can flag suspicious device changes (refresh token rotation from a
 * brand-new fingerprint = possible token theft).
 *
 * Properties:
 *   - Stable across app restarts (persisted in SecureStore).
 *   - Changes on reinstall (SecureStore is wiped on uninstall).
 *   - Changes when the user restores to a new phone from a backup that
 *     does NOT include keychain — which is the behaviour we want.
 *   - Not shared across users on the same device (SecureStore is
 *     per-app, per-install).
 *
 * We deliberately do NOT use:
 *   - expo-application installation id → Android-only, not stable on iOS
 *   - IDFA / AdID → privacy-sensitive, triggers ATT prompt
 *   - Device model/OS → not unique enough
 */

const STORAGE_KEY = 'kinetic.deviceFingerprint.v1';

let cached: string | null = null;

/**
 * Pseudo-random UUID v4. We do NOT have expo-crypto or
 * react-native-get-random-values installed, so we use Math.random —
 * that's fine here because this identifier is public (sent in every
 * request header) and is only used for correlation, not for security.
 * Collisions at the fleet level are astronomically unlikely with 122
 * bits of entropy even from a weak RNG.
 */
function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Resolve (and lazily create) the device fingerprint. The first call
 * hits SecureStore; subsequent calls return the cached value synchronously
 * via `getCachedDeviceFingerprint`.
 */
export async function getOrCreateDeviceFingerprint(): Promise<string> {
  if (cached) return cached;

  try {
    const existing = await SecureStore.getItemAsync(STORAGE_KEY);
    if (existing && existing.length >= 16) {
      cached = existing;
      return existing;
    }
  } catch {
    // SecureStore unavailable (e.g. Expo Go on web) — fall through and
    // generate an ephemeral in-memory fingerprint for this process.
  }

  const fresh = `${Platform.OS}-${generateUuid()}`;
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, fresh);
  } catch {
    // ignore — we still return the in-memory value
  }
  cached = fresh;
  return fresh;
}

/**
 * Synchronous accessor for the API client. Returns null until
 * `getOrCreateDeviceFingerprint()` has been awaited at least once
 * (usually during app bootstrap, before any API call).
 */
export function getCachedDeviceFingerprint(): string | null {
  return cached;
}

/**
 * Test hook — forget the cached value so the next call re-reads
 * SecureStore. Not used in production code paths.
 */
export function resetDeviceFingerprintCache(): void {
  cached = null;
}
