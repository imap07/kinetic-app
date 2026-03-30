import { apiClient } from './client';

export interface LeagueParticipant {
  userId: string;
  joinedAt: string;
  coinsLocked: number;
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
  startDate: string;
  endDate: string;
  prizePool: number;
  kineticFee: number;
  winnerId?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
  // Themed CoinLeague fields
  footballLeagueApiId?: number;
  footballLeagueName?: string;
  footballLeagueLogo?: string;
  isThemed?: boolean;
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
  // Themed CoinLeague fields
  footballLeagueApiId?: number;
  footballLeagueName?: string;
  footballLeagueLogo?: string;
  isThemed?: boolean;
}

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
    return apiClient.get<CoinLeague[]>(`/leagues/themed/${footballLeagueApiId}`, { token });
  },
};
