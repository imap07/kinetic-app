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

export interface StreakLeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatar: string | null;
  tier: string;
  currentStreak: number;
  bestStreak: number;
}

export interface StreakLeaderboardResponse {
  generatedAt: string;
  board: StreakLeaderboardEntry[];
}

export const streaksApi = {
  getStreakInfo(token: string) {
    return apiClient.get<StreakInfo>('/streaks/me', { token });
  },

  useStreakShield(token: string) {
    return apiClient.post<UseShieldResponse>('/streaks/use-shield', undefined, { token });
  },

  // Public leaderboard — no token required. Users with
  // publicProfile:false are excluded server-side.
  getLeaderboard() {
    return apiClient.get<StreakLeaderboardResponse>('/streaks/leaderboard');
  },
};
