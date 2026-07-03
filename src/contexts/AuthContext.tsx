import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../i18n';
import { authApi, ApiError } from '../api';
import { normalizeBackendLanguage } from '../api/auth';
import { registerTokenProvider } from '../api/client';
import type { AuthTokens, User, SocialProvider, UpdateProfileData, UpdatePreferencesData } from '../api';
import { signOutFromGoogle } from '../services/googleAuth';
import { ONBOARDING_COMPLETE_KEY } from '../utils/onboarding';
import { logLogin, logSignUp, logLogout, identifyUser, clearAnalyticsUser } from '../services/analytics';
import { attemptBiometricLogin, isBiometricLoginEnabled, enableBiometricLogin, disableBiometricLogin } from '../services/biometricAuth';
import { getOrCreateDeviceFingerprint } from '../services/deviceFingerprint';
import { initAppCheck } from '../services/appCheck';
import { removeRegisteredPushToken } from '../hooks/usePushNotifications';

const ACCESS_TOKEN_KEY = 'kinetic_access_token';
const REFRESH_TOKEN_KEY = 'kinetic_refresh_token';

/**
 * One-shot flag set whenever the server explicitly invalidates the
 * user's refresh token (401/403 from `/auth/refresh`). The LoginScreen
 * reads and clears it on mount so the user sees a "your session
 * expired" message instead of a silent boot straight into the login UI.
 */
export const SESSION_EXPIRED_FLAG_KEY = 'kinetic_session_expired_flag';

async function markSessionExpired() {
  try {
    await AsyncStorage.setItem(SESSION_EXPIRED_FLAG_KEY, '1');
  } catch {
    // Storage errors here are not worth crashing the logout path for.
  }
}

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /**
   * Server-driven flag: true when the user has no birthdate on file
   * (social login or grandfathered pre-v1.6) AND it's been ≥3 days
   * since the last dismissal. The BirthdateReminderModal subscribes
   * to this and renders itself when true.
   */
  needsBirthdatePrompt: boolean;
}

interface AuthContextValue extends AuthState {
  loginWithEmail: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName: string,
    birthdate: string,
  ) => Promise<void>;
  loginWithSocial: (
    provider: SocialProvider,
    accessToken: string,
    extra?: { idToken?: string; email?: string; displayName?: string; avatar?: string },
  ) => Promise<{ isNew: boolean }>;
  loginWithBiometric: () => Promise<boolean>;
  forgotPassword: (email: string) => Promise<string>;
  verifyCode: (email: string, code: string) => Promise<boolean>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  /**
   * Refresh the cached user. Two modes:
   * • No args → fetch /auth/me and replace `state.user` with the result.
   * • With `patch` → merge the partial into `state.user` synchronously,
   *   skipping the network call. Use this when the caller just hit a
   *   PATCH endpoint that returned the affected slice (e.g. the favorite-
   *   teams editor passes `{ favoriteTeams }` from the response). Saves
   *   a roundtrip and closes the window where a failed GET could leave
   *   the UI desynced from what the user just saved.
   */
  refreshProfile: (patch?: Partial<User>) => Promise<void>;
  updateProfile: (data: UpdateProfileData) => Promise<User>;
  updatePreferences: (prefs: UpdatePreferencesData) => Promise<User>;
  uploadAvatar: (fileUri: string, fileName: string, mimeType: string) => Promise<User>;
  deleteAccount: () => Promise<void>;
  /**
   * One-time DOB capture for social-login / grandfathered users. The
   * server enforces 18+ and refuses to overwrite an existing value.
   * On success, clears `needsBirthdatePrompt`.
   */
  setBirthdate: (birthdateIso: string) => Promise<void>;
  /**
   * "Later" — clears `needsBirthdatePrompt` locally and tells the
   * server to snooze the prompt for 3 days.
   */
  dismissBirthdatePrompt: () => Promise<void>;
  /**
   * Force-show the birthdate modal regardless of the 3-day throttle.
   * Called when a server action (e.g. gift card redeem) was rejected
   * with BIRTHDATE_REQUIRED — the user must see the modal now so
   * they can unblock the action, not wait for the next 3-day window.
   */
  requestBirthdatePrompt: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function persistTokens(tokens: AuthTokens) {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

async function clearTokens() {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

async function loadTokens(): Promise<AuthTokens | null> {
  const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  if (accessToken && refreshToken) {
    return { accessToken, refreshToken };
  }
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    tokens: null,
    isAuthenticated: false,
    isLoading: true,
    needsBirthdatePrompt: false,
  });
  const tokensRef = useRef<AuthTokens | null>(null);

  const setAuth = useCallback(
    (user: User, tokens: AuthTokens, needsBirthdatePrompt = false) => {
      tokensRef.current = tokens;
      setState({
        user,
        tokens,
        isAuthenticated: true,
        isLoading: false,
        needsBirthdatePrompt,
      });
    },
    [],
  );

  const clearAuth = useCallback(() => {
    tokensRef.current = null;
    setState({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      needsBirthdatePrompt: false,
    });
  }, []);

  // ─── Wire token provider so apiClient can auto-refresh on 401 ───
  useEffect(() => {
    registerTokenProvider({
      getAccessToken: () => tokensRef.current?.accessToken ?? null,
      getRefreshToken: () => tokensRef.current?.refreshToken ?? null,
      refreshTokens: async () => {
        const rt = tokensRef.current?.refreshToken;
        if (!rt) throw new Error('No refresh token');
        const { tokens: newTokens } = await authApi.refreshTokens(rt);
        tokensRef.current = newTokens;
        await persistTokens(newTokens);
        setState((s) => ({ ...s, tokens: newTokens }));
        return newTokens;
      },
      onAuthFailure: () => {
        // The server has explicitly revoked this refresh token. Surface
        // a "session expired" notice on the login screen so the user
        // doesn't think the app just lost them for no reason.
        markSessionExpired().catch(() => {});
        clearTokens().catch(() => {});
        clearAuth();
      },
    });
    return () => {
      registerTokenProvider(null);
    };
  }, [clearAuth]);

  useEffect(() => {
    (async () => {
      try {
        // Prime the per-install device fingerprint BEFORE any API call
        // so the x-device-fingerprint header is populated from request #1.
        // This is a single SecureStore read; cached in memory thereafter.
        await getOrCreateDeviceFingerprint();

        // Initialize Firebase App Check so the X-Firebase-AppCheck header
        // can be attached to requests. Fails soft — never blocks boot.
        await initAppCheck();

        const stored = await loadTokens();
        if (!stored) {
          setState((s) => ({ ...s, isLoading: false }));
          return;
        }

        tokensRef.current = stored;

        try {
          const { user, needsBirthdatePrompt } = await authApi.getProfile(
            stored.accessToken,
          );
          // The apiClient interceptor may have silently refreshed the
          // token pair on a 401 during this call, updating tokensRef
          // via the registered tokenProvider. Always use the latest
          // ref — falling back to `stored` only if nothing changed.
          setAuth(
            user,
            tokensRef.current ?? stored,
            !!needsBirthdatePrompt,
          );
          identifyUser(user);
        } catch (err) {
          if (err instanceof ApiError && err.status === 401) {
            // The interceptor already attempted a refresh and failed.
            // One more manual try in case the failure was transient
            // (network blip during the interceptor's refresh call).
            try {
              const { tokens: newTokens } = await authApi.refreshTokens(
                stored.refreshToken,
              );
              // Update the ref BEFORE any further API call so the
              // interceptor (and tokenProvider) see the rotated pair.
              tokensRef.current = newTokens;
              await persistTokens(newTokens);
              const { user, needsBirthdatePrompt } = await authApi.getProfile(
                newTokens.accessToken,
              );
              setAuth(user, newTokens, !!needsBirthdatePrompt);
              identifyUser(user);
            } catch (refreshErr) {
              if (
                refreshErr instanceof ApiError &&
                (refreshErr.status === 401 || refreshErr.status === 403)
              ) {
                await markSessionExpired();
                await clearTokens();
                clearAuth();
              } else {
                setState((s) => ({
                  ...s,
                  tokens: tokensRef.current ?? stored,
                  isAuthenticated: true,
                  isLoading: false,
                }));
              }
            }
          } else if (err instanceof ApiError && (err.status === 403)) {
            await markSessionExpired();
            await clearTokens();
            clearAuth();
          } else {
            setState((s) => ({
              ...s,
              tokens: tokensRef.current ?? stored,
              isAuthenticated: true,
              isLoading: false,
            }));
          }
        }
      } catch {
        setState((s) => ({ ...s, isLoading: false }));
      }
    })();
  }, [setAuth, clearAuth]);

  const loginWithEmail = useCallback(
    async (email: string, password: string) => {
      const { user, tokens } = await authApi.loginWithEmail(email, password);
      await persistTokens(tokens);
      setAuth(user, tokens);
      logLogin('email');
      identifyUser(user);
    },
    [setAuth],
  );

  const register = useCallback(
    async (
      email: string,
      password: string,
      displayName: string,
      birthdate: string,
    ) => {
      // Server-emitted copy (welcome email, push notifications) is keyed
      // off `preferredLanguage` on the user document. Seed it with the
      // language the user is already seeing in the app — anything we
      // can't normalize collapses to 'en' on the backend.
      const preferredLanguage = normalizeBackendLanguage(i18n.language);
      const { user, tokens } = await authApi.register(
        email,
        password,
        displayName,
        birthdate,
        preferredLanguage,
      );
      await persistTokens(tokens);
      setAuth(user, tokens);
      logSignUp('email');
      identifyUser(user);
    },
    [setAuth],
  );

  const loginWithSocial = useCallback(
    async (
      provider: SocialProvider,
      accessToken: string,
      extra?: { idToken?: string; email?: string; displayName?: string; avatar?: string },
    ) => {
      const preferredLanguage = normalizeBackendLanguage(i18n.language);
      const { user, tokens, isNew } = await authApi.loginWithSocial(
        provider,
        accessToken,
        { ...extra, preferredLanguage },
      );
      await persistTokens(tokens);
      setAuth(user, tokens);
      logLogin(provider as 'google' | 'apple');
      identifyUser(user);
      return { isNew: !!isNew };
    },
    [setAuth],
  );

  const loginWithBiometric = useCallback(async (): Promise<boolean> => {
    const result = await attemptBiometricLogin();
    if (!result.success || !result.refreshToken) return false;

    try {
      const { tokens: newTokens } = await authApi.refreshTokens(
        result.refreshToken,
      );
      await persistTokens(newTokens);
      const { user, needsBirthdatePrompt } = await authApi.getProfile(
        newTokens.accessToken,
      );
      setAuth(user, newTokens, !!needsBirthdatePrompt);
      // Update stored biometric token with the fresh one
      await enableBiometricLogin(result.email!, newTokens.refreshToken);
      logLogin('biometric');
      identifyUser(user);
      return true;
    } catch {
      // Biometric token expired — disable biometric login
      await disableBiometricLogin();
      return false;
    }
  }, [setAuth]);

  const forgotPassword = useCallback(async (email: string) => {
    const res = await authApi.forgotPassword(email);
    return res.message;
  }, []);

  const verifyCode = useCallback(async (email: string, code: string) => {
    const res = await authApi.verifyCode(email, code);
    return res.valid;
  }, []);

  const resetPassword = useCallback(
    async (email: string, code: string, newPassword: string) => {
      const { user, tokens } = await authApi.resetPassword(email, code, newPassword);
      await persistTokens(tokens);
      setAuth(user, tokens);
      identifyUser(user);
    },
    [setAuth],
  );

  const logout = useCallback(async () => {
    try {
      const token = tokensRef.current?.accessToken;
      const refreshToken = tokensRef.current?.refreshToken;
      if (token) {
        // Unregister the device's push token BEFORE the session is
        // dropped. If a different user logs in on this device next,
        // their notifications would otherwise still be addressed to
        // the previous user's `expoPushTokens` array. We do this
        // first because removePushToken requires a valid access
        // token — once we clearAuth() below, the token is gone.
        // Network failures are swallowed inside removeRegisteredPushToken
        // so logout itself can never block on them.
        await removeRegisteredPushToken(token);
        // Pass refresh token so the backend drops ONLY this device's
        // session. Without it, the server treats the call as a no-op
        // (the pre-fix behaviour of mass-logout is gone).
        await authApi.logout(token, refreshToken ?? undefined);
      }
    } catch {
      // Logout locally even if API call fails
    }
    try {
      await signOutFromGoogle();
    } catch {
      // Ignore Google sign-out errors
    }
    await clearTokens();
    await AsyncStorage.removeItem(ONBOARDING_COMPLETE_KEY);
    clearAuth();
    logLogout();
    clearAnalyticsUser();
  }, [clearAuth]);

  const refreshProfile = useCallback(async (patch?: Partial<User>) => {
    if (patch) {
      // Synchronous merge — the caller already has the authoritative
      // server response, no need to hit /auth/me. Guards against the
      // null-user case by no-op'ing rather than constructing a partial
      // user from scratch.
      setState((s) => (s.user ? { ...s, user: { ...s.user, ...patch } } : s));
      return;
    }
    const token = tokensRef.current?.accessToken;
    if (!token) return;
    const { user, needsBirthdatePrompt } = await authApi.getProfile(token);
    setState((s) => ({
      ...s,
      user,
      needsBirthdatePrompt: !!needsBirthdatePrompt,
    }));
  }, []);

  const updateProfile = useCallback(
    async (data: UpdateProfileData): Promise<User> => {
      const token = tokensRef.current?.accessToken;
      if (!token) throw new Error('Not authenticated');
      const { user } = await authApi.updateProfile(token, data);
      setState((s) => ({ ...s, user }));
      return user;
    },
    [],
  );

  const updatePreferences = useCallback(
    async (prefs: UpdatePreferencesData): Promise<User> => {
      const token = tokensRef.current?.accessToken;
      if (!token) throw new Error('Not authenticated');
      const { user } = await authApi.updatePreferences(token, prefs);
      setState((s) => ({ ...s, user }));
      return user;
    },
    [],
  );

  const uploadAvatar = useCallback(
    async (fileUri: string, fileName: string, mimeType: string): Promise<User> => {
      const token = tokensRef.current?.accessToken;
      if (!token) throw new Error('Not authenticated');
      const { user } = await authApi.uploadAvatar(token, fileUri, fileName, mimeType);
      setState((s) => ({ ...s, user }));
      return user;
    },
    [],
  );

  const deleteAccount = useCallback(async () => {
    const token = tokensRef.current?.accessToken;
    if (!token) throw new Error('Not authenticated');
    await authApi.deleteAccount(token);
    await clearTokens();
    clearAuth();
  }, [clearAuth]);

  const setBirthdate = useCallback(async (birthdateIso: string) => {
    const token = tokensRef.current?.accessToken;
    if (!token) throw new Error('Not authenticated');
    const { user } = await authApi.setBirthdate(token, birthdateIso);
    setState((s) => ({ ...s, user, needsBirthdatePrompt: false }));
  }, []);

  const requestBirthdatePrompt = useCallback(() => {
    setState((s) => ({ ...s, needsBirthdatePrompt: true }));
  }, []);

  const dismissBirthdatePrompt = useCallback(async () => {
    // Optimistically hide the modal — the server call is fire-and-forget.
    // Worst case the modal re-opens on the next /auth/me, which is the
    // exact behavior we want (3-day re-prompt).
    setState((s) => ({ ...s, needsBirthdatePrompt: false }));
    const token = tokensRef.current?.accessToken;
    if (!token) return;
    try {
      await authApi.dismissBirthdatePrompt(token);
    } catch {
      // Network error here is non-fatal: the user already saw the
      // dismissal in the UI, and the next /auth/me will re-set the
      // flag if the server didn't record the dismissal.
    }
  }, []);

  const value: AuthContextValue = {
    ...state,
    loginWithEmail,
    register,
    loginWithSocial,
    loginWithBiometric,
    forgotPassword,
    verifyCode,
    resetPassword,
    logout,
    refreshProfile,
    updateProfile,
    updatePreferences,
    uploadAvatar,
    deleteAccount,
    setBirthdate,
    dismissBirthdatePrompt,
    requestBirthdatePrompt,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
