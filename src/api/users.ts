import { apiClient } from './client';

export interface PublicProfile {
  id: string;
  displayName: string;
  avatar: string | null;
  tier: string;
  publicProfile: boolean;
  stats: {
    totalPicks: number;
    correctPicks: number;
    winRate: number; // 0..1
    currentStreak: number;
    bestStreak: number;
    totalPoints: number;
  } | null;
  recentPicks: Array<{
    sport: string;
    homeTeamName: string;
    awayTeamName: string;
    predictedOutcome: string;
    status: string;
    pointsAwarded: number;
    gameDate: string;
  }>;
}

export const usersApi = {
  // 403 (private) or 404 (no such user) propagate as ApiError —
  // call sites distinguish via the status code on the thrown error.
  getPublicProfile(token: string, userId: string) {
    return apiClient.get<PublicProfile>(`/users/${userId}/public`, { token });
  },
};
