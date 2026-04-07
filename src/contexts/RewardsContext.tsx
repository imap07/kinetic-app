import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { rewardsApi, RewardStatus } from '../api/rewards';

interface RewardsContextType {
  rewardStatus: RewardStatus | null;
  showCelebration: boolean;
  celebrationTier: string | null;
  fetchRewardStatus: () => Promise<void>;
  claimTier: (tier: string) => Promise<void>;
  checkForNewRewards: () => Promise<void>;
  dismissCelebration: () => void;
}

const RewardsContext = createContext<RewardsContextType | null>(null);

const TIER_PRIORITY: Record<string, number> = {
  legend: 5,
  diamond: 4,
  gold: 3,
  silver: 2,
  bronze: 1,
};

export function RewardsProvider({ children }: { children: React.ReactNode }) {
  const { tokens, isAuthenticated } = useAuth();
  const [rewardStatus, setRewardStatus] = useState<RewardStatus | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationTier, setCelebrationTier] = useState<string | null>(null);

  const fetchRewardStatus = useCallback(async () => {
    if (!tokens?.accessToken) return;
    try {
      const res = await rewardsApi.getRewardStatus(tokens.accessToken);
      setRewardStatus(res.status);
    } catch {
      // silent
    }
  }, [tokens?.accessToken]);

  const checkForNewRewards = useCallback(async () => {
    if (!tokens?.accessToken) return;
    try {
      const res = await rewardsApi.checkRewards(tokens.accessToken);
      if (res.unclaimedTiers && res.unclaimedTiers.length > 0) {
        // Show celebration for highest unclaimed tier
        const highest = res.unclaimedTiers.reduce((a, b) =>
          (TIER_PRIORITY[b] ?? 0) > (TIER_PRIORITY[a] ?? 0) ? b : a,
        );
        setCelebrationTier(highest);
        setShowCelebration(true);
        // Refresh status
        await fetchRewardStatus();
      }
    } catch {
      // silent
    }
  }, [tokens?.accessToken, fetchRewardStatus]);

  const claimTier = useCallback(async (tier: string) => {
    if (!tokens?.accessToken) return;
    try {
      await rewardsApi.claimReward(tokens.accessToken, tier);
      setShowCelebration(false);
      setCelebrationTier(null);
      await fetchRewardStatus();
    } catch {
      // silent
    }
  }, [tokens?.accessToken, fetchRewardStatus]);

  const dismissCelebration = useCallback(() => {
    setShowCelebration(false);
    setCelebrationTier(null);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchRewardStatus().then(() => {
        checkForNewRewards();
      });
    }
  }, [isAuthenticated]);

  return (
    <RewardsContext.Provider
      value={{
        rewardStatus,
        showCelebration,
        celebrationTier,
        fetchRewardStatus,
        claimTier,
        checkForNewRewards,
        dismissCelebration,
      }}
    >
      {children}
    </RewardsContext.Provider>
  );
}

export function useRewards(): RewardsContextType {
  const ctx = useContext(RewardsContext);
  if (!ctx) {
    throw new Error('useRewards must be used within a RewardsProvider');
  }
  return ctx;
}
