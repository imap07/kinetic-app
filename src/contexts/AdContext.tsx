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
import { apiClient, ApiError } from '../api';

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
    ios: 'ca-app-pub-9821496555610524/8209633862',
    android: 'ca-app-pub-9821496555610524/2957307180',
  }) ?? TestIds.REWARDED,
};

// ── Frequency Config ────────────────────────────────────────
const INTERSTITIAL_EVERY_N_ACTIONS = 2; // Show interstitial every 2 picks
const MAX_INTERSTITIALS_PER_HOUR = 8;
const MAX_REWARDED_PER_DAY = 10;
const COINS_PER_REWARDED = 30;

/**
 * Reasons a rewarded ad flow can fail. The caller uses these to show
 * the right toast — previously we silently dropped errors, which meant
 * users who hit the daily cap saw nothing happen and assumed the button
 * was broken.
 */
export type RewardedAdError =
  /** Server says the user is out of ad rewards for today. */
  | 'daily_limit'
  /** No ad was loaded in time (fill rate / network / SDK issue). */
  | 'ad_unavailable'
  /** Network or unexpected error talking to the backend. */
  | 'network'
  /** User closed the ad before the reward event fired. */
  | 'aborted';

export interface RewardedAdResult {
  /** Coins credited. 0 on any error path. */
  coins: number;
  /** Undefined on success, set to the specific failure reason otherwise. */
  error?: RewardedAdError;
}

interface AdContextType {
  /** Whether ads are enabled (false for Pro users) */
  adsEnabled: boolean;
  /** Banner ad unit ID */
  bannerAdUnitId: string;
  /** Track an action (pick submitted, etc). Shows interstitial when threshold reached. */
  trackAction: () => void;
  /** Show a rewarded ad. Returns a structured result so callers can branch on the error type. */
  showRewardedAd: () => Promise<RewardedAdResult>;
  /** How many rewarded ads remain today */
  rewardedAdsRemaining: number;
  /** Whether ATT has been requested */
  trackingRequested: boolean;
}

const AdContext = createContext<AdContextType>({
  adsEnabled: true,
  bannerAdUnitId: TestIds.BANNER,
  trackAction: () => {},
  showRewardedAd: async () => ({ coins: 0, error: 'ad_unavailable' }),
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
  const rewardedResolveRef = useRef<((result: RewardedAdResult) => void) | null>(null);
  // Nonce for the CURRENT ad impression — set right before .show(), consumed
  // by the EARNED_REWARD listener. This is what makes backend reward crediting
  // unforgeable: the nonce is issued server-side, bound to this user, and
  // single-use, so the /coins/ad-reward endpoint can't be farmed by replay.
  const pendingNonceRef = useRef<string | null>(null);

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
    // Without an ERROR listener a no-fill on first load would leave
    // `interstitialLoaded=false` forever and `trackAction` would
    // silently never show another interstitial for the session. Log
    // the reason (dev only) so we can diagnose bad fill windows.
    const unsubError = ad.addAdEventListener(AdEventType.ERROR, (error: any) => {
      setInterstitialLoaded(false);
      if (__DEV__) {
        console.warn('[ads] interstitial ad error', error?.message || error);
      }
    });
    ad.load();
    interstitialRef.current = ad;
    return () => {
      unsubLoaded();
      unsubClosed();
      unsubError();
    };
  }, [adsEnabled]);

  // ── Load rewarded ─────────────────────────────────────────
  const loadRewarded = useCallback(() => {
    if (!adsEnabled) return;
    const ad = RewardedAd.createForAdRequest(AD_UNITS.rewarded);
    // Tracks whether the currently-showing impression fired
    // EARNED_REWARD before CLOSED. Without this, a user who skips
    // / dismisses the ad early leaves the outer Promise hanging
    // until the 60s timeout fires — the button sits on its loading
    // spinner the whole time and users report "the video doesn't
    // open / there's an error".
    let earnedThisImpression = false;
    const unsubLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      setRewardedLoaded(true);
    });
    const unsubEarned = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      // User watched the full ad — redeem the server-issued nonce we fetched
      // before calling .show(). Without a valid nonce the backend will reject
      // the claim, so even if this path were hit by a tampered client the
      // coins can't be minted.
      earnedThisImpression = true;
      const nonce = pendingNonceRef.current;
      pendingNonceRef.current = null;

      if (!tokens?.accessToken || !nonce) {
        const resolve = rewardedResolveRef.current;
        rewardedResolveRef.current = null;
        resolve?.({ coins: 0, error: 'network' });
        return;
      }

      apiClient
        .post<{ success: boolean; coinsAwarded: number; dailyRemaining: number }>(
          '/coins/ad-reward',
          { adType: 'rewarded', nonce },
          { token: tokens.accessToken },
        )
        .then((data) => {
          setRewardedAdsRemaining(data.dailyRemaining ?? 0);
          const resolve = rewardedResolveRef.current;
          rewardedResolveRef.current = null;
          resolve?.({
            coins: data.coinsAwarded ?? COINS_PER_REWARDED,
          });
        })
        .catch((err) => {
          // Server rejected the claim. The most common cause is the nonce
          // expired (user idled >5 min before the EARNED_REWARD fired).
          const reason: RewardedAdError =
            err instanceof ApiError && err.status === 429
              ? 'daily_limit'
              : 'network';
          const resolve = rewardedResolveRef.current;
          rewardedResolveRef.current = null;
          resolve?.({ coins: 0, error: reason });
        });
    });
    const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      setRewardedLoaded(false);
      // The core "video doesn't open / hangs on loading" fix: if the
      // ad closed WITHOUT firing EARNED_REWARD (user skipped or
      // dismissed), resolve the outer Promise immediately with
      // `aborted` so the RewardedAdButton can drop its spinner.
      // Previously this was only handled by the 60-second timeout
      // inside showRewardedAd, which made every dismiss feel like a
      // broken button.
      if (!earnedThisImpression && rewardedResolveRef.current) {
        const resolve = rewardedResolveRef.current;
        rewardedResolveRef.current = null;
        pendingNonceRef.current = null;
        resolve({ coins: 0, error: 'aborted' });
      }
      loadRewarded();
    });
    // Load failure handler. The Google Mobile Ads SDK emits an ERROR
    // event when no fill, network issue, or ATT-blocked request
    // prevents the ad from loading. Without this listener the
    // `rewardedLoaded` state stays false forever and every tap on the
    // button returns `ad_unavailable` — the user sees the "not ready"
    // toast repeatedly with no chance to recover. On error we clear
    // the loaded state (it was already false) and leave the ad slot
    // open; the next successful load (triggered by the next CLOSED
    // cycle, or the user re-entering a screen that mounts the
    // provider) will populate it. We DON'T auto-retry on a tight
    // loop — hammering the SDK with load requests after a no-fill
    // tends to keep returning no-fill.
    const unsubError = ad.addAdEventListener(AdEventType.ERROR, (error: any) => {
      setRewardedLoaded(false);
      // If a user was already waiting on this ad (tapped before the
      // ERROR fired), resolve their Promise now instead of making
      // them sit through the 60s timeout.
      if (rewardedResolveRef.current) {
        const resolve = rewardedResolveRef.current;
        rewardedResolveRef.current = null;
        pendingNonceRef.current = null;
        resolve({ coins: 0, error: 'ad_unavailable' });
      }
      if (__DEV__) {
        // Surfacing this during dev helps diagnose "no video" reports.
        // Production just silently degrades to the `ad_unavailable`
        // toast path.
        console.warn('[ads] rewarded ad error', error?.message || error);
      }
    });
    ad.load();
    rewardedRef.current = ad;
    return () => {
      unsubLoaded();
      unsubEarned();
      unsubClosed();
      unsubError();
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
  const showRewardedAd = useCallback(async (): Promise<RewardedAdResult> => {
    if (!adsEnabled || !rewardedLoaded || !rewardedRef.current) {
      return { coins: 0, error: 'ad_unavailable' };
    }
    if (rewardedAdsRemaining <= 0) {
      return { coins: 0, error: 'daily_limit' };
    }
    if (!tokens?.accessToken) {
      return { coins: 0, error: 'network' };
    }

    // 1. Request a one-time nonce from the backend BEFORE showing the ad.
    //    If this fails (e.g. server says cap reached, or we're rate-limited
    //    by the per-user throttler), surface the specific error so the
    //    caller can show the right toast instead of a silent no-op.
    let nonce: string;
    try {
      const res = await apiClient.post<{
        nonce: string;
        expiresAt: string;
        dailyRemaining: number;
      }>('/coins/ad-reward/nonce', undefined, { token: tokens.accessToken });
      nonce = res.nonce;
      setRewardedAdsRemaining(res.dailyRemaining ?? 0);
    } catch (err) {
      // Backend returns 400 with "Daily ad reward limit reached" or 429 if
      // the per-user throttler trips. Both mean "no ad for you right now",
      // so we collapse them into the same UX signal.
      if (err instanceof ApiError) {
        const msg = (err.message || '').toLowerCase();
        if (
          err.status === 429 ||
          msg.includes('daily') ||
          msg.includes('limit')
        ) {
          setRewardedAdsRemaining(0);
          return { coins: 0, error: 'daily_limit' };
        }
      }
      return { coins: 0, error: 'network' };
    }

    pendingNonceRef.current = nonce;

    return new Promise((resolve) => {
      rewardedResolveRef.current = resolve;
      rewardedRef.current!.show();
      // Timeout fallback — also clears the nonce so a late EARNED_REWARD
      // callback can't redeem it after we've already given up. This is
      // the "user dismissed the ad or the SDK got stuck" path.
      setTimeout(() => {
        if (rewardedResolveRef.current === resolve) {
          rewardedResolveRef.current = null;
          pendingNonceRef.current = null;
          resolve({ coins: 0, error: 'aborted' });
        }
      }, 60000);
    });
  }, [adsEnabled, rewardedLoaded, rewardedAdsRemaining, tokens?.accessToken]);

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
