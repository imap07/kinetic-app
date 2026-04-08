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

export const notificationsApi = {
  getHistory: (token: string, page = 1, limit = 20) =>
    apiClient.get<NotificationHistoryResponse>(
      `/notifications/history?page=${page}&limit=${limit}`,
      { token },
    ),

  markAllRead: (token: string) =>
    apiClient.patch<void>('/notifications/history/read-all', {}, { token }),

  markRead: (id: string, token: string) =>
    apiClient.patch<void>(`/notifications/history/${id}/read`, {}, { token }),

  getPreferences: (token: string) =>
    apiClient.get<NotificationPreferencesResponse>(
      '/notifications/preferences',
      { token },
    ),

  updatePreferences: (
    token: string,
    patch: Partial<Omit<NotificationPreferences, '_id' | 'userId'>>,
  ) =>
    apiClient.put<NotificationPreferencesResponse>(
      '/notifications/preferences',
      patch,
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
};
