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

/**
 * Today's activity summary.
 *
 * `picksToday` is informational only — there is NO daily limit. The app is
 * open and Pro subscriptions only remove ads + grant monthly bonus coins.
 * Anything that consumes this should display "X picks today" (or the quest
 * progress) but must NEVER use it as a gate.
 */
export interface DailyStatusResponse {
  picksToday: number;
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

/** Fetch the set of gameApiIds the user has already predicted on (pending + resolved). */
export async function fetchPickedGameIds(token: string): Promise<Set<number>> {
  const res = await apiClient.get<MyPicksResponse>('/predictions/my-picks?limit=500', { token });
  return new Set(res.predictions.map((p) => p.gameApiId));
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

// ────────── F1 Predictions API ──────────

export type F1PredictionType =
  | 'race_winner'
  | 'podium'
  | 'head_to_head'
  | 'fastest_lap'
  | 'points_finish'
  | 'qualifying_pole';

export interface F1PredictionData {
  _id: string;
  userId: string;
  sport: string;
  raceApiId: number;
  raceDate: string;
  competitionName: string;
  circuitName: string;
  predictionType: F1PredictionType;
  predictedDriverApiId?: number;
  predictedDriverName?: string;
  predictedDriverImage?: string;
  predictedDriverTeam?: string;
  podiumPicks?: { position: number; driverApiId: number; driverName: string; driverImage?: string }[];
  driverA?: { apiId: number; name: string; image?: string; teamName?: string };
  driverB?: { apiId: number; name: string; image?: string; teamName?: string };
  predictedWinner?: 'A' | 'B';
  pointsFinishDriverApiId?: number;
  pointsFinishDriverName?: string;
  pointsFinishPrediction?: boolean;
  oddsMultiplier: number;
  status: 'pending' | 'won' | 'lost' | 'void' | 'partial' | 'cancelled';
  pointsAwarded: number;
  resolvedAt: string | null;
  createdAt: string;
}

export interface CreateF1PredictionPayload {
  raceApiId: number;
  predictionType: F1PredictionType;
  predictedDriverApiId?: number;
  podiumPicks?: { position: number; driverApiId: number }[];
  driverAApiId?: number;
  driverBApiId?: number;
  predictedWinner?: 'A' | 'B';
  pointsFinishDriverApiId?: number;
  pointsFinishPrediction?: boolean;
}

export interface F1DriverOption {
  driverApiId: number;
  driverName: string;
  driverAbbr: string;
  driverNumber: number;
  driverImage: string;
  teamName: string;
  teamLogo: string;
  championshipPosition: number;
  championshipPoints: number;
}

export interface F1Matchup {
  type: 'teammate' | 'rivalry';
  label: string;
  driverA: F1DriverOption;
  driverB: F1DriverOption;
}

export const f1PredictionsApi = {
  create: (payload: CreateF1PredictionPayload, token: string) =>
    apiClient.post<F1PredictionData>('/predictions/f1', payload, { token }),

  getForRace: (raceApiId: number, token: string) =>
    apiClient.get<F1PredictionData[]>(`/predictions/f1/race/${raceApiId}`, { token }),

  getMyPicks: (token: string, params?: { status?: 'pending' | 'resolved'; page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return apiClient.get<{ predictions: F1PredictionData[]; total: number }>(`/predictions/f1/my-picks${query}`, { token });
  },

  getDrivers: (raceApiId: number, token: string) =>
    apiClient.get<F1DriverOption[]>(`/predictions/f1/drivers/${raceApiId}`, { token }),

  getMatchups: (raceApiId: number, token: string) =>
    apiClient.get<F1Matchup[]>(`/predictions/f1/matchups/${raceApiId}`, { token }),

  delete: (predictionId: string, token: string) =>
    apiClient.delete<void>(`/predictions/f1/${predictionId}`, { token }),
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
