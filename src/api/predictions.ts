import { apiClient } from './client';

export interface PredictionData {
  _id: string;
  userId: string;
  sport: string;
  gameApiId: number;
  leagueApiId: number;
  gameDate: string;
  homeTeamName: string;
  homeTeamLogo: string;
  awayTeamName: string;
  awayTeamLogo: string;
  leagueName: string;
  leagueLogo: string;
  predictionType: 'result' | 'exact_score';
  predictedOutcome: 'home' | 'draw' | 'away';
  predictedHomeScore: number | null;
  predictedAwayScore: number | null;
  oddsMultiplier: number;
  status: 'pending' | 'won' | 'lost' | 'void';
  actualOutcome: 'home' | 'draw' | 'away' | null;
  actualHomeScore: number | null;
  actualAwayScore: number | null;
  pointsAwarded: number;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePredictionPayload {
  sport: string;
  gameApiId: number;
  leagueApiId: number;
  gameDate: string;
  homeTeamName: string;
  homeTeamLogo?: string;
  awayTeamName: string;
  awayTeamLogo?: string;
  leagueName?: string;
  leagueLogo?: string;
  predictionType: 'result' | 'exact_score';
  predictedOutcome: 'home' | 'draw' | 'away';
  predictedHomeScore?: number | null;
  predictedAwayScore?: number | null;
}

export interface MyPicksResponse {
  predictions: PredictionData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface MyStatsResponse {
  totalPredictions: number;
  won: number;
  lost: number;
  pending: number;
  winRate: number;
  totalPoints: number;
  currentStreak: number;
  bestStreak: number;
  sportBreakdown: {
    sport: string;
    total: number;
    won: number;
    points: number;
    winRate: number;
  }[];
}

export interface QuestProgress {
  pick3: { progress: number; target: number; completed: boolean };
  multiSport: { progress: number; target: number; completed: boolean; sportsPlayed: string[] };
  bonusReward: { completed: boolean };
}

export interface DailyStatusResponse {
  used: number;
  limit: number;
  isPremium: boolean;
  quests?: QuestProgress;
}

export interface DetailedStatsResponse extends MyStatsResponse {
  weeklyTrend: {
    week: number;
    year: number;
    total: number;
    won: number;
    points: number;
    winRate: number;
  }[];
  topSport: { sport: string; wins: number; points: number } | null;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  username: string;
  avatar: string;
  tier: string;
  totalPoints: number;
  totalPredictions: number;
  correctPredictions: number;
  winRate: number;
  currentStreak: number;
  bestStreak: number;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface MyRankResponse {
  rank: number;
  totalPlayers: number;
  entry: LeaderboardEntry | null;
}

export const predictionsApi = {
  create: (payload: CreatePredictionPayload, token: string) =>
    apiClient.post<PredictionData>('/predictions', payload, { token }),

  getMyPicks: (
    token: string,
    params?: { status?: 'pending' | 'resolved'; sport?: string; page?: number; limit?: number },
  ) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.sport) qs.set('sport', params.sport);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return apiClient.get<MyPicksResponse>(`/predictions/my-picks${query}`, { token });
  },

  getMyStats: (token: string) =>
    apiClient.get<MyStatsResponse>('/predictions/my-stats', { token }),

  getPredictionForGame: (sport: string, gameApiId: number, token: string) =>
    apiClient.get<{ prediction: PredictionData | null }>(
      `/predictions/game/${sport}/${gameApiId}`,
      { token },
    ),

  deletePrediction: (id: string, token: string) =>
    apiClient.delete<void>(`/predictions/${id}`, { token }),

  getDailyStatus: (token: string) =>
    apiClient.get<DailyStatusResponse>('/predictions/daily-status', { token }),

  getDetailedStats: (token: string) =>
    apiClient.get<DetailedStatsResponse>('/predictions/my-stats/detailed', { token }),
};

export const leaderboardApi = {
  getLeaderboard: (token: string, page = 1, limit = 50) =>
    apiClient.get<LeaderboardResponse>(
      `/leaderboard?page=${page}&limit=${limit}`,
      { token },
    ),

  getMyRank: (token: string) =>
    apiClient.get<MyRankResponse>('/leaderboard/my-rank', { token }),
};
