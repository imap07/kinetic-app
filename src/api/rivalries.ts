import { apiClient } from './client';

export type RivalryStatus =
  | 'pending'
  | 'active'
  | 'declined'
  | 'expired'
  | 'resolved'
  | 'cancelled';

export interface Rivalry {
  id: string;
  challengerId: string;
  challengerName: string;
  opponentId: string;
  opponentName: string;
  sport: string;
  status: RivalryStatus;
  startAt: string | null;
  endAt: string | null;
  winnerId: string | null;
  resolvedAt: string | null;
  resolvedStats: {
    challengerPicks: number;
    challengerWins: number;
    opponentPicks: number;
    opponentWins: number;
    voidReason: string | null;
  } | null;
  iAmChallenger: boolean;
}

export interface RivalriesResponse {
  incoming: Rivalry[];
  outgoing: Rivalry[];
  active: Rivalry[];
  resolved: Rivalry[];
}

export const rivalriesApi = {
  list(token: string) {
    return apiClient.get<RivalriesResponse>('/rivalries', { token });
  },

  challenge(token: string, opponentId: string, sport: string) {
    return apiClient.post<Rivalry>(
      '/rivalries',
      { opponentId, sport },
      { token },
    );
  },

  accept(token: string, rivalryId: string) {
    return apiClient.post<Rivalry>(`/rivalries/${rivalryId}/accept`, undefined, { token });
  },

  decline(token: string, rivalryId: string) {
    return apiClient.post<Rivalry>(`/rivalries/${rivalryId}/decline`, undefined, { token });
  },

  cancel(token: string, rivalryId: string) {
    return apiClient.post<Rivalry>(`/rivalries/${rivalryId}/cancel`, undefined, { token });
  },
};
