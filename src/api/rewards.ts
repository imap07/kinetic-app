import { apiClient } from './client';

export interface RewardStatus {
  currentTier: 'none' | 'bronze' | 'silver' | 'gold' | 'diamond' | 'legend';
  coinsEarned: number;
  nextTier: string | null;
  nextTierCoins: number;
  progress: number;
  unclaimedTiers: string[];
}

interface RewardStatusResponse {
  status: RewardStatus;
}

interface CheckRewardsResponse {
  unclaimedTiers: string[];
}

interface ClaimRewardResponse {
  message: string;
  tier: string;
}

export const rewardsApi = {
  getRewardStatus(token: string) {
    return apiClient.get<RewardStatusResponse>('/rewards/status', { token });
  },

  checkRewards(token: string) {
    return apiClient.post<CheckRewardsResponse>('/rewards/check', undefined, { token });
  },

  claimReward(token: string, tier: string) {
    return apiClient.post<ClaimRewardResponse>(`/rewards/claim/${tier}`, undefined, { token });
  },
};
