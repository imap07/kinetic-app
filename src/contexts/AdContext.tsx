import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import {
  InterstitialAd,
  RewardedAd,
  AdEventType,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import { usePurchases } from './PurchasesContext';
import { useAuth } from './AuthContext';
import { apiClient } from '../api';

// ── Ad Unit IDs ─────────────────────────────────────────────
const AD_UNITS = {
  banner: __DEV__ ? TestIds.BANNER : Platform.select({
    ios: 'ca-app-pub-9821496555610524/1510973543',
    android: 'ca-app-pub-9821496555610524/2053899021',
  }) ?? TestIds.BANNER,
  interstitial: __DEV__ ? TestIds.INTERSTITIAL : Platform.select({
    ios: 'ca-app-pub-9821496555610524/8072512461',
    android: 'ca-app-pub-9821496555610524/2820185783',
  }) ?? TestIds.INTERSTITIAL,
  rewarded: __DEV__ ? TestIds.REWARDED : Platform.select({
    ios: 'ca-app-pub-9821496555610524/7306225702',
    android: 'ca-app-pub-9821496555610524/8071243544',
  }) ?? TestIds.REWARDED,
};

// ── Frequency Config ────────────────────────────────────────
const INTERSTITIAL_EVERY_N_ACTIONS = 3; // Show interstitial every 3 picks
const MAX_INTERSTITIALS_PER_HOUR = 4;
const MAX_REWARDED_PER_DAY = 5;
const COINS_PER_REWARDED = 20;

interface AdContextType {
  /** Whether ads are enabled (false for Pro users) */
  adsEnabled: boolean;
  /** Banner ad unit ID */
  bannerAdUnitId: string;
  /** Track an action (pick submitted, etc). Shows interstitial when threshold reached. */
  trackAction: () => void;
  /** Show a rewarded ad. Returns coins awarded (0 if failed/maxed). */
  showRewardedAd: () => Promise<number>;
  /** How many rewarded ads remain today */
  rewardedAdsRemaining: number;
  /** Whether ATT has been requested */
  trackingRequested: boolean;
}

const AdContext = createContext<AdContextType>({
  adsEnabled: true,
  bannerAdUnitId: TestIds.BANNER,
  trackAction: () => {},
  showRewardedAd: async () => 0,
  rewardedAdsRemaining: MAX_REWARDED_PER_DAY,
  trackingRequested: false,
});

export const useAds = () => useContext(AdContext);

export function AdProvider({ children }: { children: React.ReactNode }) {
  const { isProMember } = usePurchases();
  const { tokens } = useAuth();
  const adsEnabled = !isProMember;

  const [trackingRequested, setTrackingRequested] = useState(false);
  const [rewardedAdsRemaining, setRewardedAdsRemaining] = useState(MAX_REWARDED_PER_DAY);

  // Interstitial tracking
  const actionCountRef = useRef(0);
  const interstitialCountRef = useRef(0);
  const lastInterstitialHourRef = useRef(Date.now());

  // Interstitial ad instance
  const interstitialRef = useRef<InterstitialAd | null>(null);
  const [interstitialLoaded, setInterstitialLoaded] = useState(false);

  // Rewarded ad instance
  const rewardedRef = useRef<RewardedAd | null>(null);
  const [rewardedLoaded, setRewardedLoaded] = useState(false);
  const rewardedResolveRef = useRef<((coins: number) => void) | null>(null);

  // ── Request ATT on mount ──────────────────────────────────
  useEffect(() => {
    if (Platform.OS === 'ios') {
      requestTrackingPermissionsAsync()
        .then(() => setTrackingRequested(true))
        .catch(() => setTrackingRequested(true));
    } else {
      setTrackingRequested(true);
    }
  }, []);

  // ── Load interstitial ─────────────────────────────────────
  const loadInterstitial = useCallback(() => {
    if (!adsEnabled) return;
    const ad = InterstitialAd.createForAdRequest(AD_UNITS.interstitial);
    const unsubLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
      setInterstitialLoaded(true);
    });
    const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      setInterstitialLoaded(false);
      // Preload next
      loadInterstitial();
    });
    ad.load();
    interstitialRef.current = ad;
    return () => {
      unsubLoaded();
      unsubClosed();
    };
  }, [adsEnabled]);

  // ── Load rewarded ─────────────────────────────────────────
  const loadRewarded = useCallback(() => {
    if (!adsEnabled) return;
    const ad = RewardedAd.createForAdRequest(AD_UNITS.rewarded);
    const unsubLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      setRewardedLoaded(true);
    });
    const unsubEarned = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      // User watched the full ad — credit coins via backend
      if (tokens?.accessToken) {
        apiClient
          .post<{ success: boolean; coinsAwarded: number; dailyRemaining: number }>(
            '/coins/ad-reward',
            { adType: 'rewarded' },
            { token: tokens.accessToken },
          )
          .then((data) => {
            setRewardedAdsRemaining(data.dailyRemaining ?? 0);
            rewardedResolveRef.current?.(data.coinsAwarded ?? COINS_PER_REWARDED);
          })
          .catch(() => {
            rewardedResolveRef.current?.(0);
          });
      }
    });
    const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      setRewardedLoaded(false);
      loadRewarded();
    });
    ad.load();
    rewardedRef.current = ad;
    return () => {
      unsubLoaded();
      unsubEarned();
      unsubClosed();
    };
  }, [adsEnabled, tokens?.accessToken]);

  // ── Init ads ──────────────────────────────────────────────
  useEffect(() => {
    if (!adsEnabled || !trackingRequested) return;
    const cleanupInterstitial = loadInterstitial();
    const cleanupRewarded = loadRewarded();
    return () => {
      cleanupInterstitial?.();
      cleanupRewarded?.();
    };
  }, [adsEnabled, trackingRequested, loadInterstitial, loadRewarded]);

  // ── Track action → show interstitial ──────────────────────
  const trackAction = useCallback(() => {
    if (!adsEnabled) return;

    actionCountRef.current += 1;

    // Reset hourly counter
    if (Date.now() - lastInterstitialHourRef.current > 3600000) {
      interstitialCountRef.current = 0;
      lastInterstitialHourRef.current = Date.now();
    }

    if (
      actionCountRef.current >= INTERSTITIAL_EVERY_N_ACTIONS &&
      interstitialCountRef.current < MAX_INTERSTITIALS_PER_HOUR &&
      interstitialLoaded &&
      interstitialRef.current
    ) {
      interstitialRef.current.show();
      actionCountRef.current = 0;
      interstitialCountRef.current += 1;
    }
  }, [adsEnabled, interstitialLoaded]);

  // ── Show rewarded ad ──────────────────────────────────────
  const showRewardedAd = useCallback(async (): Promise<number> => {
    if (!adsEnabled || !rewardedLoaded || !rewardedRef.current || rewardedAdsRemaining <= 0) {
      return 0;
    }
    return new Promise((resolve) => {
      rewardedResolveRef.current = resolve;
      rewardedRef.current!.show();
      // Timeout fallback
      setTimeout(() => {
        if (rewardedResolveRef.current === resolve) {
          rewardedResolveRef.current = null;
          resolve(0);
        }
      }, 60000);
    });
  }, [adsEnabled, rewardedLoaded, rewardedAdsRemaining]);

  return (
    <AdContext.Provider
      value={{
        adsEnabled,
        bannerAdUnitId: AD_UNITS.banner,
        trackAction,
        showRewardedAd,
        rewardedAdsRemaining,
        trackingRequested,
      }}
    >
      {children}
    </AdContext.Provider>
  );
}
