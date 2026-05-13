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

export interface DailyOpenCheckInResponse {
  streak: number;
  awardedCoins: number;
  milestoneCoins: number;
  isNewDay: boolean;
  nextMilestoneDays: number;
}

export const streaksApi = {
  getStreakInfo(token: string) {
    return apiClient.get<StreakInfo>('/streaks/me', { token });
  },

  useStreakShield(token: string) {
    return apiClient.post<UseShieldResponse>('/streaks/use-shield', undefined, { token });
  },

  // Fire-and-forget on app foreground. Backend is idempotent per
  // UTC day, so launching the app multiple times in a day is a
  // server-side no-op after the first call.
  dailyOpenCheckIn(token: string) {
    return apiClient.post<DailyOpenCheckInResponse>(
      '/streaks/daily-open-check-in',
      undefined,
      { token },
    );
  },

  // Public leaderboard — no token required. Users with
  // publicProfile:false are excluded server-side.
  getLeaderboard() {
    return apiClient.get<StreakLeaderboardResponse>('/streaks/leaderboard');
  },
};
