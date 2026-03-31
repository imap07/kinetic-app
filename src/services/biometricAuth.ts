import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_ENABLED_KEY = 'kinetic_biometric_enabled';
const BIOMETRIC_EMAIL_KEY = 'kinetic_biometric_email';
const BIOMETRIC_TOKEN_KEY = 'kinetic_biometric_token';

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

  await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
  await SecureStore.setItemAsync(BIOMETRIC_EMAIL_KEY, email);
  await SecureStore.setItemAsync(BIOMETRIC_TOKEN_KEY, refreshToken);
  return true;
}

/**
 * Disable biometric login and clear stored credentials.
 */
export async function disableBiometricLogin(): Promise<void> {
  await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
  await SecureStore.deleteItemAsync(BIOMETRIC_EMAIL_KEY);
  await SecureStore.deleteItemAsync(BIOMETRIC_TOKEN_KEY);
}

/**
 * Attempt biometric login: prompt biometric, return stored refresh token if verified.
 */
export async function attemptBiometricLogin(): Promise<{
  success: boolean;
  email?: string;
  refreshToken?: string;
}> {
  const enabled = await isBiometricLoginEnabled();
  if (!enabled) return { success: false };

  const email = await SecureStore.getItemAsync(BIOMETRIC_EMAIL_KEY);
  const refreshToken = await SecureStore.getItemAsync(BIOMETRIC_TOKEN_KEY);
  if (!email || !refreshToken) return { success: false };

  const authenticated = await authenticateWithBiometric('Log in to Kinetic');
  if (!authenticated) return { success: false };

  return { success: true, email, refreshToken };
}
