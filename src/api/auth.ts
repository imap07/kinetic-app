import { apiClient } from './client';
import { API_BASE_URL } from './config';

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
  favoriteLeagues: { leagueApiId: number; addedAt: string }[];
  pushNotifications: boolean;
  publicProfile: boolean;
  isPremium: boolean;
  biometricEnabled: boolean;
  twoFactorEnabled: boolean;
  showStats: boolean;
  showHistory: boolean;
  dataSharing: boolean;
  isActive: boolean;
  onboardingCompleted: boolean;
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

export interface UpdatePreferencesData {
  publicProfile?: boolean;
  showStats?: boolean;
  showHistory?: boolean;
  dataSharing?: boolean;
}

export interface SessionInfo {
  id: string;
  deviceName: string;
  deviceOS: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

interface SessionsResponse {
  sessions: SessionInfo[];
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

  loginWithEmail(email: string, password: string, deviceInfo?: { deviceName?: string; deviceOS?: string }) {
    return apiClient.post<AuthResponse>('/auth/login/email', {
      email,
      password,
      ...deviceInfo,
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

  registerPushToken(pushToken: string, authToken: string) {
    return apiClient.post<MessageResponse>('/auth/push-token', { token: pushToken }, { token: authToken });
  },

  removePushToken(pushToken: string, authToken: string) {
    return apiClient.post<MessageResponse>('/auth/push-token/remove', { token: pushToken }, { token: authToken });
  },

  updatePreferences(token: string, prefs: UpdatePreferencesData) {
    return apiClient.patch<ProfileResponse>('/auth/preferences', prefs, { token });
  },

  async uploadAvatar(
    token: string,
    fileUri: string,
    fileName: string,
    mimeType: string,
  ): Promise<ProfileResponse> {
    const formData = new FormData();
    formData.append('avatar', {
      uri: fileUri,
      name: fileName,
      type: mimeType,
    } as any);

    const res = await fetch(`${API_BASE_URL}/auth/avatar`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        // Let fetch set Content-Type with boundary for multipart
      },
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || 'Failed to upload avatar');
    }
    return data;
  },

  deleteAccount(token: string) {
    return apiClient.delete<MessageResponse>('/auth/account', { token });
  },

  getSessions(token: string, currentRefreshToken?: string) {
    const query = currentRefreshToken
      ? `?currentRefreshToken=${encodeURIComponent(currentRefreshToken)}`
      : '';
    return apiClient.get<SessionsResponse>(`/auth/sessions${query}`, { token });
  },

  deleteSession(token: string, sessionId: string) {
    return apiClient.delete<MessageResponse>(`/auth/sessions/${sessionId}`, { token });
  },

  setFavoriteSports(token: string, sports: string[]) {
    return apiClient.patch<{ message: string; favoriteSports: string[] }>(
      '/auth/favorite-sports',
      { sports },
      { token },
    );
  },

  completeOnboarding(token: string, data: { sports: string[]; favoriteTeams: { apiId: number; sport: string }[] }) {
    return apiClient.post<{ message: string }>('/auth/onboarding', data, { token });
  },

  changePassword(token: string, currentPassword: string, newPassword: string) {
    return apiClient.patch<{ message: string }>(
      '/auth/change-password',
      { currentPassword, newPassword },
      { token },
    );
  },
};
