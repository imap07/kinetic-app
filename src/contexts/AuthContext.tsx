import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authApi, ApiError } from '../api';
import type { AuthTokens, User, SocialProvider, UpdateProfileData } from '../api';
import { signOutFromGoogle } from '../services/googleAuth';

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
  forgotPassword: (email: string) => Promise<string>;
  verifyCode: (email: string, code: string) => Promise<boolean>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: UpdateProfileData) => Promise<User>;
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

  useEffect(() => {
    (async () => {
      try {
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
            try {
              const { tokens: newTokens } = await authApi.refreshTokens(
                stored.refreshToken,
                stored.refreshToken,
              );
              await persistTokens(newTokens);
              const { user } = await authApi.getProfile(newTokens.accessToken);
              setAuth(user, newTokens);
            } catch {
              await clearTokens();
              clearAuth();
            }
          } else {
            await clearTokens();
            clearAuth();
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
    },
    [setAuth],
  );

  const register = useCallback(
    async (email: string, password: string, displayName: string) => {
      const { user, tokens } = await authApi.register(email, password, displayName);
      await persistTokens(tokens);
      setAuth(user, tokens);
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
    },
    [setAuth],
  );

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
    clearAuth();
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

  const value: AuthContextValue = {
    ...state,
    loginWithEmail,
    register,
    loginWithSocial,
    forgotPassword,
    verifyCode,
    resetPassword,
    logout,
    refreshProfile,
    updateProfile,
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
