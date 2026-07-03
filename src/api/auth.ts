import { apiClient, refreshTokensOnce } from './client';
import { API_BASE_URL } from './config';
import { getAppCheckToken } from '../services/appCheck';

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
  favoriteTeams: {
    sport: string;
    teamApiId: number;
    teamName: string;
    teamLogo?: string;
    leagueApiId?: number;
    leagueName?: string;
  }[];
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
  // Null until the user buys their first coin pack. Drives the
  // "-20% your first purchase" banner in CoinStoreScreen.
  firstCoinPurchaseAt?: string | null;
}

interface AuthResponse {
  message: string;
  user: User;
  tokens: AuthTokens;
  /**
   * Only present on social-login responses. `true` when the backend
   * created a new user document during this call (vs. a returning
   * login). Used by analytics to fire `registration_completed` only
   * on actual signups. Undefined on email login/register because
   * those flows already distinguish themselves at the call site.
   */
  isNew?: boolean;
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
  /**
   * Server signal that the user's birthdate is missing and the soft
   * prompt modal should be shown on this app open. Only present on
   * GET /auth/me — mutating endpoints don't return it.
   */
  needsBirthdatePrompt?: boolean;
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

// Keep in sync with the backend `AcquisitionSource` enum.
export type AcquisitionSourceKey =
  | 'instagram'
  | 'tiktok'
  | 'friend'
  | 'appstore'
  | 'google'
  | 'youtube'
  | 'twitter'
  | 'other';

// Maps an i18next language code (which may include region, "pt-BR")
// to the four-letter set the backend accepts. Anything unknown collapses
// to 'en' on the server side too, so this is a best-effort hint.
export type BackendLanguage = 'en' | 'es' | 'fr' | 'pt';
export function normalizeBackendLanguage(lng?: string | null): BackendLanguage {
  if (!lng) return 'en';
  const head = lng.toLowerCase().split(/[-_]/)[0];
  return (['en', 'es', 'fr', 'pt'] as const).includes(head as BackendLanguage)
    ? (head as BackendLanguage)
    : 'en';
}

export const authApi = {
  register(
    email: string,
    password: string,
    displayName: string,
    birthdate: string,
    preferredLanguage?: BackendLanguage,
  ) {
    return apiClient.post<AuthResponse>('/auth/register', {
      email,
      password,
      displayName,
      // ISO date string (YYYY-MM-DD). Backend enforces 18+ via
      // MIN_AGE_YEARS; surface the 400 response as a friendly
      // "must be 18+" error at the call site.
      birthdate,
      deviceType: 'mobile',
      ...(preferredLanguage ? { preferredLanguage } : {}),
    });
  },

  loginWithEmail(email: string, password: string, deviceInfo?: { deviceName?: string; deviceOS?: string }) {
    return apiClient.post<AuthResponse>('/auth/login/email', {
      email,
      password,
      ...deviceInfo,
      deviceType: 'mobile',
    });
  },

  loginWithSocial(
    provider: SocialProvider,
    accessToken: string,
    extra?: {
      idToken?: string;
      email?: string;
      displayName?: string;
      avatar?: string;
      preferredLanguage?: BackendLanguage;
    },
  ) {
    return apiClient.post<AuthResponse>('/auth/login/social', {
      provider,
      accessToken,
      ...extra,
      deviceType: 'mobile',
    });
  },

  /**
   * Persist the user's chosen language on the backend so future emails
   * and push notifications honor it. Called from the language switcher
   * after `i18n.changeLanguage(...)` succeeds.
   */
  setPreferredLanguage(preferredLanguage: BackendLanguage) {
    return apiClient.patch<AuthResponse>('/auth/profile', { preferredLanguage });
  },

  /**
   * Rotate the token pair.
   *
   * ⚠️ DO NOT pass a Bearer token to this endpoint. The backend
   * authenticates the refresh call via the `refreshToken` in the body
   * (see `JwtRefreshStrategy`), never via the Authorization header.
   *
   * More importantly: attaching ANY token here would make `apiClient`
   * treat a 401 from `/auth/refresh` as a retryable request and
   * recursively call `refreshTokensOnce()` from inside the refresh
   * promise it's currently awaiting — a self-deadlock that stalls the
   * splash screen forever. This bit us on the `carlosmv28` admin-user
   * bug: the user's `refreshToken` column was wiped, `/auth/refresh`
   * returned 401, and the client froze instead of logging out.
   */
  refreshTokens(refreshToken: string) {
    return apiClient.post<TokensResponse>(
      '/auth/refresh',
      { refreshToken },
    );
  },

  /**
   * Single-device logout. MUST include the refresh token in the body —
   * without it, older backends would fall through to a mass-logout of
   * every device for this user (the bug this file helped fix). The
   * current backend treats a missing token as a no-op, but we keep
   * sending it so the server can actually drop the correct row.
   */
  logout(token: string, refreshToken?: string) {
    return apiClient.post<MessageResponse>(
      '/auth/logout',
      refreshToken ? { refreshToken } : undefined,
      { token },
    );
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

  /**
   * One-time DOB capture for social-login / grandfathered accounts.
   * Server enforces 18+ and refuses to overwrite an existing birthdate.
   */
  setBirthdate(token: string, birthdate: string) {
    return apiClient.post<ProfileResponse>(
      '/auth/birthdate',
      { birthdate },
      { token },
    );
  },

  /**
   * "Later" tap on the DOB prompt. Snoozes the modal for 3 days.
   */
  dismissBirthdatePrompt(token: string) {
    return apiClient.post<MessageResponse>(
      '/auth/birthdate/dismiss',
      {},
      { token },
    );
  },

  // PIPEDA / Quebec Law 25 access surface. Backend throttle is
  // 5 calls/hour so a stale UI tap isn't catastrophic. Returned
  // shape is the full DataExport — typed as `unknown` here so we
  // don't have to mirror the entire schema in the client; the UX
  // just stringifies + shares.
  exportMyData(token: string) {
    return apiClient.get<unknown>('/auth/export', { token });
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
    const doUpload = async (authToken: string) => {
      const formData = new FormData();
      formData.append('avatar', {
        uri: fileUri,
        name: fileName,
        type: mimeType,
      } as any);

      // This raw-fetch path bypasses apiClient, so attach the App Check
      // token here too — otherwise the upload is rejected once
      // app_check_enforced is on.
      const appCheckToken = await getAppCheckToken();
      const uploadHeaders: Record<string, string> = {
        Authorization: `Bearer ${authToken}`,
        // Let fetch set Content-Type with boundary for multipart
      };
      if (appCheckToken) {
        uploadHeaders['X-Firebase-AppCheck'] = appCheckToken;
      }

      const res = await fetch(`${API_BASE_URL}/auth/avatar`, {
        method: 'POST',
        headers: uploadHeaders,
        body: formData,
      });

      return res;
    };

    let res = await doUpload(token);

    // Manual 401 retry: refresh tokens and replay the upload once
    if (res.status === 401) {
      try {
        const newTokens = await refreshTokensOnce();
        res = await doUpload(newTokens.accessToken);
      } catch {
        // Refresh failed — fall through to the error below
      }
    }

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

  completeOnboarding(
    token: string,
    data: {
      sports: string[];
      // Must mirror OnboardingFavoriteTeamDto on the backend exactly —
      // teamApiId/teamName/leagueApiId are required. Sending `apiId`
      // instead (as the previous client did) is silently dropped by the
      // validation pipe's whitelist and the POST 400s.
      favoriteTeams: {
        teamApiId: number;
        sport: string;
        teamName: string;
        teamLogo?: string;
        // Optional — F1 constructors have no leagueApiId.
        leagueApiId?: number;
        leagueName?: string;
      }[];
      // Leagues the user picked directly in the Leagues tab, independent
      // of any team pick. Merged into favoriteLeagues on the backend
      // alongside team-derived leagues. Optional for back-compat with
      // clients that don't expose the Leagues tab yet.
      favoriteLeagues?: {
        leagueApiId: number;
        sport: string;
        leagueName?: string;
      }[];
      // Self-reported attribution collected during onboarding. Optional
      // because users can skip the question, and older clients that don't
      // know about the field shouldn't break the endpoint.
      acquisitionSource?: AcquisitionSourceKey | null;
    },
  ) {
    return apiClient.post<{ message: string }>('/auth/onboarding', data, { token });
  },

  /**
   * Dedicated endpoint to set just the acquisition source. Used as a
   * fallback when the bundled onboarding call fails for unrelated reasons
   * (e.g. team validation), and also as the path for users who want to
   * answer "How did you hear about us?" after onboarding is done.
   */
  setAcquisitionSource(token: string, source: AcquisitionSourceKey) {
    return apiClient.patch<{ message: string; acquisitionSource: string }>(
      '/auth/acquisition-source',
      { source },
      { token },
    );
  },

  changePassword(
    token: string,
    currentPassword: string,
    newPassword: string,
    currentRefreshToken?: string,
  ) {
    return apiClient.patch<{ message: string }>(
      '/auth/change-password',
      // Pass the current refresh token so the backend can preserve
      // this device's session instead of evicting the caller.
      { currentPassword, newPassword, currentRefreshToken },
      { token },
    );
  },
};
