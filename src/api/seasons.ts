import { apiClient } from './client';

export interface SeasonTierView {
  tier: number;
  pointsRequired: number;
  unlocked: boolean;
  freeClaimed: boolean;
  proClaimed: boolean;
  freeReward: { coins: number; cosmeticKey: string | null };
  proReward: { coins: number; cosmeticKey: string | null };
}

export interface SeasonStatus {
  season: {
    key: string;
    title: string;
    startAt: string;
    endAt: string;
  } | null;
  points: number;
  currentTier: number;
  nextTier: { tier: number; pointsRequired: number; pointsRemaining: number } | null;
  tiers: SeasonTierView[];
  isPro: boolean;
}

export const seasonsApi = {
  current: (token: string) =>
    apiClient.get<SeasonStatus>('/seasons/current', { token }),
  claim: (token: string, tier: number) =>
    apiClient.post<SeasonStatus>('/seasons/claim', { tier }, { token }),
};
