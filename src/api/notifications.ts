import { apiClient } from './client';

export interface NotificationLog {
  _id: string;
  userId: string;
  title: string;
  body: string;
  type:
    | 'prediction_result'
    | 'league_update'
    | 'achievement'
    | 'system'
    | 'game_start'
    | 'live_score'
    | 'game_end'
    | 'coin_league_start'
    | 'coin_league_end'
    | 'daily_reminder';
  read: boolean;
  data?: Record<string, any>;
  sport?: string;
  createdAt: string;
}

export interface NotificationHistoryResponse {
  data: NotificationLog[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface NotificationTypes {
  gameStart: boolean;
  liveScores: boolean;
  gameEnd: boolean;
  predictionResults: boolean;
  coinLeagues: boolean;
  dailyReminders: boolean;
  achievements: boolean;
}

export interface NotificationPreferences {
  _id: string;
  userId: string;
  enabled: boolean;
  notificationScope: 'my_teams' | 'all_games';
  types: NotificationTypes;
  sportOverrides: Record<string, Partial<NotificationTypes>>;
  liveScoreFrequency: 'every_goal' | 'halftime_only' | 'off';
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  timezone: string;
}

export interface NotificationPreferencesResponse {
  preferences: NotificationPreferences;
}

// ─── Game Subscription types ────────────────────────────────────────────────

export interface GameSubscription {
  _id: string;
  sport: string;
  gameApiId: number;
  homeTeamName: string;
  awayTeamName: string;
  leagueName?: string;
  expiresAt: string;
  createdAt: string;
}

export interface SubscribeGameParams {
  sport: string;
  gameApiId: number;
  homeTeamName: string;
  awayTeamName: string;
  leagueName?: string;
}

// ─── API client ─────────────────────────────────────────────────────────────

export const notificationsApi = {
  // ── Open tracking ────────────────────────────────────────────────────────
  trackOpen: (type: string, token: string) =>
    apiClient.post<{ ok: boolean }>(
      '/notifications/track-open',
      { type },
      { token },
    ),

  // ── History ──────────────────────────────────────────────────────────────
  getHistory: (token: string, page = 1, limit = 20) =>
    apiClient.get<NotificationHistoryResponse>(
      `/notifications/history?page=${page}&limit=${limit}`,
      { token },
    ),

  markAllRead: (token: string) =>
    apiClient.patch<void>('/notifications/history/read-all', {}, { token }),

  markRead: (id: string, token: string) =>
    apiClient.patch<void>(`/notifications/history/${id}/read`, {}, { token }),

  // ── Preferences ───────────────────────────────────────────────────────────
  getPreferences: (token: string) =>
    apiClient.get<NotificationPreferencesResponse>(
      '/notifications/preferences',
      { token },
    ),

  updatePreferences: (
    token: string,
    // `types` is partial — the backend merges the patch into the current
    // sub-object, so a single-key update like { types: { gameStart: false } }
    // is valid. Don't widen this to `NotificationTypes` or TS will start
    // demanding every toggle in every write.
    patch: {
      enabled?: boolean;
      types?: Partial<NotificationTypes>;
      notificationScope?: 'my_teams' | 'all_games';
      liveScoreFrequency?: NotificationPreferences['liveScoreFrequency'];
      quietHoursEnabled?: boolean;
      quietHoursStart?: string;
      quietHoursEnd?: string;
      timezone?: string;
    },
  ) =>
    apiClient.put<NotificationPreferencesResponse>(
      '/notifications/preferences',
      patch,
      { token },
    ),

  getSportOverride: (token: string, sport: string) =>
    apiClient.get<{ sport: string; override: Partial<NotificationTypes> | null }>(
      `/notifications/preferences/sport/${sport}`,
      { token },
    ),

  updateSportOverride: (
    token: string,
    sport: string,
    overrides: Partial<NotificationTypes>,
  ) =>
    apiClient.patch<NotificationPreferencesResponse>(
      `/notifications/preferences/sport/${sport}`,
      overrides,
      { token },
    ),

  removeSportOverride: (token: string, sport: string) =>
    apiClient.delete<NotificationPreferencesResponse>(
      `/notifications/preferences/sport/${sport}`,
      { token },
    ),

  // ── Game subscriptions ────────────────────────────────────────────────────
  subscribeToGame: (token: string, params: SubscribeGameParams) =>
    apiClient.post<{ subscribed: boolean; subscription: GameSubscription }>(
      '/notifications/game-subscriptions',
      params,
      { token },
    ),

  unsubscribeFromGame: (token: string, gameApiId: number) =>
    apiClient.delete<{ subscribed: boolean }>(
      `/notifications/game-subscriptions/${gameApiId}`,
      { token },
    ),

  getGameSubscriptionStatus: (token: string, gameApiId: number) =>
    apiClient.get<{ gameApiId: number; subscribed: boolean }>(
      `/notifications/game-subscriptions/${gameApiId}`,
      { token },
    ),

  getGameSubscriptions: (token: string) =>
    apiClient.get<{ subscriptions: GameSubscription[] }>(
      '/notifications/game-subscriptions',
      { token },
    ),
};
