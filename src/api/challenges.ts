import { apiClient } from './client';

export type ChallengeType = 'over_under' | 'btts' | 'match_winner';
export type ChallengeStatus = 'active' | 'submitted' | 'won' | 'lost' | 'expired';

export interface DailyChallenge {
  _id: string;
  date: string;
  type: ChallengeType;
  matchApiId: number;
  homeTeamName: string;
  homeTeamLogo?: string;
  awayTeamName: string;
  awayTeamLogo?: string;
  leagueName?: string;
  leagueLogo?: string;
  question: string;
  threshold?: number;
  options: string[];
  coinsReward: number;
  status: ChallengeStatus;
  userAnswer?: string;
  correctAnswer?: string;
}

export interface SubmitChallengeResponse {
  success: boolean;
  status: ChallengeStatus;
  coinsAwarded?: number;
}

export interface ChallengeHistoryEntry {
  _id: string;
  date: string;
  type: ChallengeType;
  status: ChallengeStatus;
  coinsAwarded: number;
  homeTeamName: string;
  awayTeamName: string;
}

export const challengesApi = {
  getTodayChallenge(token: string) {
    return apiClient.get<DailyChallenge | null>('/challenges/today', { token });
  },

  submitChallenge(token: string, challengeId: string, answer: string) {
    return apiClient.post<SubmitChallengeResponse>(
      '/challenges/submit',
      { challengeId, answer },
      { token },
    );
  },

  getChallengeHistory(token: string, days = 7) {
    return apiClient.get<ChallengeHistoryEntry[]>(
      `/challenges/history?days=${days}`,
      { token },
    );
  },
};
