import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_ENABLED_KEY = 'kinetic_biometric_enabled';
const BIOMETRIC_EMAIL_KEY = 'kinetic_biometric_email';
const BIOMETRIC_TOKEN_KEY = 'kinetic_biometric_token';

/**
 * SecureStore options used for the stored biometric refresh token.
 * ─────────────────────────────────────────────────────────────────
 *   keychainAccessible: WHEN_UNLOCKED_THIS_DEVICE_ONLY
 *     → the item is NOT copied in encrypted device backups and NOT
 *       transferable to a new device. If the phone dies, the token
 *       dies with it. This prevents a restore-from-backup attack.
 *
 *   requireAuthentication: true
 *     → on iOS the item is bound to the Secure Enclave and can only
 *       be read after a successful Face ID / Touch ID / passcode
 *       challenge. On Android it uses the keystore's user-authenticated
 *       key flag. Without this, a rooted / jailbroken attacker with
 *       filesystem access could extract the token bypassing the
 *       biometric gate entirely.
 *
 *   authenticationPrompt: a short human string shown on the OS prompt.
 */
const BIOMETRIC_SECURE_STORE_OPTS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  requireAuthentication: true,
  authenticationPrompt: 'Authenticate to access Kinetic',
};

export type BiometricType = 'face' | 'fingerprint' | 'iris' | 'none';

/**
 * Check if the device hardware supports biometric authentication.
 */
export async function isBiometricAvailable(): Promise<boolean> {
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) return false;

    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return enrolled;
  } catch {
    return false;
  }
}

/**
 * Get the type of biometric available on the device (Face ID, Touch ID, etc.)
 */
export async function getBiometricType(): Promise<BiometricType> {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'face';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'fingerprint';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'iris';
    }
    return 'none';
  } catch {
    return 'none';
  }
}

/**
 * Get a human-readable label like "Face ID" or "Touch ID".
 */
export async function getBiometricLabel(): Promise<string> {
  const type = await getBiometricType();
  switch (type) {
    case 'face':
      return 'Face ID';
    case 'fingerprint':
      return 'Touch ID';
    case 'iris':
      return 'Iris';
    default:
      return 'Biometric';
  }
}

/**
 * Prompt the user with the biometric dialog. Returns true if authenticated.
 */
export async function authenticateWithBiometric(
  promptMessage = 'Authenticate to continue',
): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancel',
      disableDeviceFallback: false, // allow passcode fallback
      fallbackLabel: 'Use Passcode',
    });
    return result.success;
  } catch {
    return false;
  }
}

/**
 * Check if the user has opted in to biometric login.
 */
export async function isBiometricLoginEnabled(): Promise<boolean> {
  try {
    const value = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

/**
 * Enable biometric login: verify with biometric, then store a flag.
 * The refresh token is already stored in SecureStore by AuthContext.
 */
export async function enableBiometricLogin(email: string, refreshToken: string): Promise<boolean> {
  // Prompt biometric verification before enabling
  const authenticated = await authenticateWithBiometric('Verify to enable biometric login');
  if (!authenticated) return false;

  // Flag + email are not particularly sensitive; keep them under the normal
  // SecureStore options so the enabled check doesn't trigger a biometric
  // prompt. The REFRESH TOKEN, however, is bound to Secure Enclave so that
  // even a rooted/jailbroken device can't exfiltrate it without going
  // through Face ID / passcode.
  await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
  await SecureStore.setItemAsync(BIOMETRIC_EMAIL_KEY, email);
  await SecureStore.setItemAsync(
    BIOMETRIC_TOKEN_KEY,
    refreshToken,
    BIOMETRIC_SECURE_STORE_OPTS,
  );
  return true;
}

/**
 * Disable biometric login and clear stored credentials.
 * Note: deleteItemAsync on an item that was stored with requireAuthentication
 * may itself trigger a biometric prompt on some OS versions. We swallow the
 * error so that "disable" always succeeds from the user's perspective — even
 * if the user cancels the prompt, the enabled flag gets removed and the
 * dangling token will be overwritten next time they enable biometric login.
 */
export async function disableBiometricLogin(): Promise<void> {
  await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
  await SecureStore.deleteItemAsync(BIOMETRIC_EMAIL_KEY);
  try {
    await SecureStore.deleteItemAsync(BIOMETRIC_TOKEN_KEY, BIOMETRIC_SECURE_STORE_OPTS);
  } catch {
    // See comment above — non-fatal.
  }
}

/**
 * Attempt biometric login: reading the token itself triggers the OS-level
 * biometric prompt (because the token was written with requireAuthentication).
 * If the user cancels or fails biometric, SecureStore throws and we return
 * a negative result without leaking why.
 */
export async function attemptBiometricLogin(): Promise<{
  success: boolean;
  email?: string;
  refreshToken?: string;
}> {
  const enabled = await isBiometricLoginEnabled();
  if (!enabled) return { success: false };

  const email = await SecureStore.getItemAsync(BIOMETRIC_EMAIL_KEY);
  if (!email) return { success: false };

  // This call triggers the OS biometric prompt on iOS/Android for items
  // stored with requireAuthentication=true. No separate authenticateAsync()
  // call needed — the keychain itself is the authenticator.
  let refreshToken: string | null = null;
  try {
    refreshToken = await SecureStore.getItemAsync(
      BIOMETRIC_TOKEN_KEY,
      BIOMETRIC_SECURE_STORE_OPTS,
    );
  } catch {
    return { success: false };
  }

  if (!refreshToken) return { success: false };
  return { success: true, email, refreshToken };
}
