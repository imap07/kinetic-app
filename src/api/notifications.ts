import { apiClient } from './client';

export interface NotificationLog {
  _id: string;
  userId: string;
  title: string;
  body: string;
  type: 'prediction_result' | 'league_update' | 'achievement' | 'system';
  read: boolean;
  data?: Record<string, any>;
  createdAt: string;
}

export interface NotificationHistoryResponse {
  notifications: NotificationLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
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
};
