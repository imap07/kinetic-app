import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi, ApiError } from '../api';
import { registerTokenProvider } from '../api/client';
import type { AuthTokens, User, SocialProvider, UpdateProfileData, UpdatePreferencesData } from '../api';
import { signOutFromGoogle } from '../services/googleAuth';
import { ONBOARDING_COMPLETE_KEY } from '../screens/OnboardingScreen';
import { logLogin, logSignUp, logLogout, setAnalyticsUser, clearAnalyticsUser } from '../services/analytics';
import { attemptBiometricLogin, isBiometricLoginEnabled, enableBiometricLogin, disableBiometricLogin } from '../services/biometricAuth';
import { getOrCreateDeviceFingerprint } from '../services/deviceFingerprint';

const ACCESS_TOKEN_KEY = 'kinetic_access_token';
const REFRESH_TOKEN_KEY = 'kinetic_refresh_token';

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  loginWithEmail: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  loginWithSocial: (
    provider: SocialProvider,
    accessToken: string,
    extra?: { idToken?: string; email?: string; displayName?: string; avatar?: string },
  ) => Promise<void>;
  loginWithBiometric: () => Promise<boolean>;
  forgotPassword: (email: string) => Promise<string>;
  verifyCode: (email: string, code: string) => Promise<boolean>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: UpdateProfileData) => Promise<User>;
  updatePreferences: (prefs: UpdatePreferencesData) => Promise<User>;
  uploadAvatar: (fileUri: string, fileName: string, mimeType: string) => Promise<User>;
  deleteAccount: () => Promise<void>;
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
  });
  const tokensRef = useRef<AuthTokens | null>(null);

  const setAuth = useCallback((user: User, tokens: AuthTokens) => {
    tokensRef.current = tokens;
    setState({ user, tokens, isAuthenticated: true, isLoading: false });
  }, []);

  const clearAuth = useCallback(() => {
    tokensRef.current = null;
    setState({ user: null, tokens: null, isAuthenticated: false, isLoading: false });
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

        const stored = await loadTokens();
        if (!stored) {
          setState((s) => ({ ...s, isLoading: false }));
          return;
        }

        tokensRef.current = stored;

        try {
          const { user } = await authApi.getProfile(stored.accessToken);
          setAuth(user, stored);
        } catch (err) {
          if (err instanceof ApiError && err.status === 401) {
            // Access token expired — try to refresh
            try {
              const { tokens: newTokens } = await authApi.refreshTokens(
                stored.refreshToken,
              );
              await persistTokens(newTokens);
              const { user } = await authApi.getProfile(newTokens.accessToken);
              setAuth(user, newTokens);
            } catch (refreshErr) {
              // Only clear tokens if the server explicitly rejected the
              // refresh token (401/403). Network errors, timeouts, or
              // server-down (5xx) should NOT wipe the session — the user
              // should stay "authenticated" with stale tokens; the
              // apiClient auto-refresh interceptor will retry later.
              if (
                refreshErr instanceof ApiError &&
                (refreshErr.status === 401 || refreshErr.status === 403)
              ) {
                await clearTokens();
                clearAuth();
              } else {
                // Keep tokens, show as authenticated with stale data.
                // The interceptor will retry refresh on the next API call.
                setState((s) => ({
                  ...s,
                  tokens: stored,
                  isAuthenticated: true,
                  isLoading: false,
                }));
              }
            }
          } else if (err instanceof ApiError && (err.status === 403)) {
            // Server explicitly says forbidden — clear session
            await clearTokens();
            clearAuth();
          } else {
            // Network error, timeout, server down (5xx), or any non-auth
            // error — keep tokens alive. The user should remain "logged in"
            // and the app will retry API calls when connectivity returns.
            setState((s) => ({
              ...s,
              tokens: stored,
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
      setAnalyticsUser(user.id ?? '');
    },
    [setAuth],
  );

  const register = useCallback(
    async (email: string, password: string, displayName: string) => {
      const { user, tokens } = await authApi.register(email, password, displayName);
      await persistTokens(tokens);
      setAuth(user, tokens);
      logSignUp('email');
      setAnalyticsUser(user.id ?? '');
    },
    [setAuth],
  );

  const loginWithSocial = useCallback(
    async (
      provider: SocialProvider,
      accessToken: string,
      extra?: { idToken?: string; email?: string; displayName?: string; avatar?: string },
    ) => {
      const { user, tokens } = await authApi.loginWithSocial(provider, accessToken, extra);
      await persistTokens(tokens);
      setAuth(user, tokens);
      logLogin(provider as 'google' | 'apple');
      setAnalyticsUser(user.id ?? '');
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
      const { user } = await authApi.getProfile(newTokens.accessToken);
      setAuth(user, newTokens);
      // Update stored biometric token with the fresh one
      await enableBiometricLogin(result.email!, newTokens.refreshToken);
      logLogin('biometric');
      setAnalyticsUser(user.id ?? '');
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
    },
    [setAuth],
  );

  const logout = useCallback(async () => {
    try {
      const token = tokensRef.current?.accessToken;
      if (token) {
        await authApi.logout(token);
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

  const refreshProfile = useCallback(async () => {
    const token = tokensRef.current?.accessToken;
    if (!token) return;
    const { user } = await authApi.getProfile(token);
    setState((s) => ({ ...s, user }));
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
