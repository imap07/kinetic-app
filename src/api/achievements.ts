import { apiClient } from './client';

export interface Achievement {
  key: string;
  title: string;
  description: string;
  icon: string;
  points: number;
  unlocked: boolean;
  unlockedAt: string | null;
}

export const achievementsApi = {
  getMyAchievements(token: string) {
    return apiClient.get<Achievement[]>('/achievements/me', { token });
  },
};
