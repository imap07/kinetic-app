import { apiClient } from './client';

export interface LeagueParticipant {
  userId: string;
  joinedAt: string;
  coinsLocked: number;
}

export interface LeagueWinner {
  userId: string;
  position: number;
  coinsWon: number;
  totalPoints: number;
  correctPredictions: number;
}

export interface CoinLeague {
  _id: string;
  creatorId: string;
  name: string;
  sport: string;
  entryFee: number;
  maxParticipants: number;
  participants: LeagueParticipant[];
  status: 'open' | 'active' | 'resolving' | 'completed' | 'cancelled';
  leagueType: 'weekly' | 'matchday' | 'race_weekend';
  startDate: string;
  endDate: string;
  prizePool: number;
  kineticFee: number;
  winnerId?: string;
  winners: LeagueWinner[];
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
  isSystemLeague: boolean;
  // Themed CoinLeague fields
  footballLeagueApiId?: number;
  footballLeagueName?: string;
  footballLeagueLogo?: string;
  isThemed?: boolean;
  inviteCode?: string;
  // F1 Race Weekend fields
  f1RaceApiId?: number;
  f1CompetitionName?: string;
  f1CircuitName?: string;
  f1CircuitImage?: string;
}

export interface LeaguesListResponse {
  leagues: CoinLeague[];
  total: number;
  page: number;
  pages: number;
}

export interface CreateLeagueDto {
  name: string;
  sport: string;
  entryFee: number;
  maxParticipants?: number;
  startDate: string;
  endDate: string;
  leagueType?: 'weekly' | 'matchday' | 'race_weekend';
  // Themed CoinLeague fields
  footballLeagueApiId?: number;
  footballLeagueName?: string;
  footballLeagueLogo?: string;
  isThemed?: boolean;
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  avatar?: string;
  totalPoints: number;
  correctPredictions: number;
  totalPredictions: number;
  position: number;
  coinsWon: number;
  isCurrentUser: boolean;
}

export interface LeaderboardResponse {
  leagueId: string;
  status: string;
  leaderboard: LeaderboardEntry[];
  prizePool: number;
  kineticFee: number;
}

/** Valid entry fee tiers */
export const ENTRY_FEE_TIERS = [0, 5, 15, 50, 100] as const;

/** Entry fee tier labels */
export const ENTRY_FEE_LABELS: Record<number, string> = {
  0: 'Free',
  5: 'Casual',
  15: 'Competitive',
  50: 'High Stakes',
  100: 'Elite',
};

export const leaguesApi = {
  create(token: string, dto: CreateLeagueDto) {
    return apiClient.post<CoinLeague>('/leagues', dto, { token });
  },

  join(token: string, leagueId: string) {
    return apiClient.post<CoinLeague>(`/leagues/${leagueId}/join`, undefined, { token });
  },

  leave(token: string, leagueId: string) {
    return apiClient.post<CoinLeague>(`/leagues/${leagueId}/leave`, undefined, { token });
  },

  getAll(token: string, filters?: { sport?: string; status?: string; page?: number; limit?: number }) {
    const params = new URLSearchParams();
    if (filters?.sport) params.set('sport', filters.sport);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.page) params.set('page', String(filters.page));
    if (filters?.limit) params.set('limit', String(filters.limit));
    const qs = params.toString();
    return apiClient.get<LeaguesListResponse>(`/leagues${qs ? `?${qs}` : ''}`, { token });
  },

  getMyLeagues(token: string) {
    return apiClient.get<CoinLeague[]>('/leagues/my-leagues', { token });
  },

  getById(token: string, leagueId: string) {
    return apiClient.get<CoinLeague>(`/leagues/${leagueId}`, { token });
  },

  getThemedLeagues(token: string, footballLeagueApiId: number) {
    return apiClient.get<{ leagues: CoinLeague[]; total: number }>(
      `/leagues/themed/${footballLeagueApiId}`,
      { token },
    );
  },

  getByInviteCode(token: string, code: string) {
    return apiClient.get<CoinLeague>(`/leagues/invite/${code}`, { token });
  },

  getLeaderboard(token: string, leagueId: string) {
    return apiClient.get<LeaderboardResponse>(
      `/leagues/${leagueId}/leaderboard`,
      { token },
    );
  },
};
