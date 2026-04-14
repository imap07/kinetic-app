import { apiClient } from './client';

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastPickDate: string | null;
  shieldsAvailable: number;
  nextMilestone: number;
  nextMilestoneReward: number;
}

export interface UseShieldResponse {
  success: boolean;
  shieldsRemaining: number;
}

export const streaksApi = {
  getStreakInfo(token: string) {
    return apiClient.get<StreakInfo>('/streaks/me', { token });
  },

  useStreakShield(token: string) {
    return apiClient.post<UseShieldResponse>('/streaks/use-shield', undefined, { token });
  },
};
