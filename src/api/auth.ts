import { apiClient } from './client';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  username?: string;
  avatar?: string;
  bio?: string;
  providers: string[];
  tier: string;
  totalPoints: number;
  totalPredictions: number;
  correctPredictions: number;
  currentStreak: number;
  bestStreak: number;
  favoriteSports: string[];
  pushNotifications: boolean;
  publicProfile: boolean;
  isPremium: boolean;
  biometricEnabled: boolean;
  twoFactorEnabled: boolean;
  isActive: boolean;
}

interface AuthResponse {
  message: string;
  user: User;
  tokens: AuthTokens;
}

interface TokensResponse {
  message: string;
  tokens: AuthTokens;
}

interface MessageResponse {
  message: string;
}

interface VerifyCodeResponse {
  valid: boolean;
}

interface ProfileResponse {
  message: string;
  user: User;
}

export interface UpdateProfileData {
  displayName?: string;
  username?: string;
  bio?: string;
  avatar?: string;
  favoriteSports?: string[];
}

export type SocialProvider = 'google' | 'apple' | 'x';

export const authApi = {
  register(email: string, password: string, displayName: string) {
    return apiClient.post<AuthResponse>('/auth/register', {
      email,
      password,
      displayName,
    });
  },

  loginWithEmail(email: string, password: string) {
    return apiClient.post<AuthResponse>('/auth/login/email', {
      email,
      password,
    });
  },

  loginWithSocial(
    provider: SocialProvider,
    accessToken: string,
    extra?: { idToken?: string; email?: string; displayName?: string; avatar?: string },
  ) {
    return apiClient.post<AuthResponse>('/auth/login/social', {
      provider,
      accessToken,
      ...extra,
    });
  },

  refreshTokens(refreshToken: string, token: string) {
    return apiClient.post<TokensResponse>(
      '/auth/refresh',
      { refreshToken },
      { token },
    );
  },

  logout(token: string) {
    return apiClient.post<MessageResponse>('/auth/logout', undefined, { token });
  },

  forgotPassword(email: string) {
    return apiClient.post<MessageResponse>('/auth/forgot-password', { email });
  },

  verifyCode(email: string, code: string) {
    return apiClient.post<VerifyCodeResponse>('/auth/verify-code', {
      email,
      code,
    });
  },

  resetPassword(email: string, code: string, newPassword: string) {
    return apiClient.post<AuthResponse>('/auth/reset-password', {
      email,
      code,
      newPassword,
    });
  },

  getProfile(token: string) {
    return apiClient.get<ProfileResponse>('/auth/me', { token });
  },

  updateProfile(token: string, data: UpdateProfileData) {
    return apiClient.patch<ProfileResponse>('/auth/profile', data, { token });
  },
};
