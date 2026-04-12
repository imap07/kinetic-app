import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { Platform } from 'react-native';

const WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
const IOS_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';

let configured = false;
let isSigningIn = false;

function ensureConfigured() {
  if (configured) return;
  GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
    iosClientId: IOS_CLIENT_ID,
    offlineAccess: false,
  });
  configured = true;
}

export interface GoogleSignInResult {
  idToken: string;
  email: string;
  displayName: string;
  avatar?: string;
}

export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  if (isSigningIn) {
    throw new Error('SIGN_IN_IN_PROGRESS');
  }
  isSigningIn = true;

  try {
    ensureConfigured();

    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }

    const response = await GoogleSignin.signIn();

    if (!response.data?.idToken) {
      throw new Error('Google Sign-In failed: no idToken returned');
    }

    return {
      idToken: response.data.idToken,
      email: response.data.user.email,
      displayName: response.data.user.name ?? response.data.user.email,
      avatar: response.data.user.photo ?? undefined,
    };
  } finally {
    isSigningIn = false;
  }
}

export async function signOutFromGoogle(): Promise<void> {
  try {
    ensureConfigured();
    await GoogleSignin.signOut();
  } catch {
    // Silently ignore -- user may not have signed in with Google
  }
}

export function isGoogleSignInCancelled(error: unknown): boolean {
  return (
    error != null &&
    typeof error === 'object' &&
    'code' in error &&
    (error as any).code === statusCodes.SIGN_IN_CANCELLED
  );
}
