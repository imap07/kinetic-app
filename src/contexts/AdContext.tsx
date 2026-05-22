import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AppState, Platform, Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme';
import {
  InterstitialAd,
  RewardedAd,
  RewardedInterstitialAd,
  AppOpenAd,
  AdEventType,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';
import {
  getTrackingPermissionsAsync,
  requestTrackingPermissionsAsync,
} from 'expo-tracking-transparency';
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
  appOpen: __DEV__ ? TestIds.APP_OPEN : Platform.select({
    ios: 'ca-app-pub-9821496555610524/7807546288',
    android: 'ca-app-pub-9821496555610524/5146786981',
  }) ?? TestIds.APP_OPEN,
  // Rewarded interstitial: hybrid format — pops between actions like an
  // interstitial but offers a skip + reward path during the first 5s.
  // Higher eCPM than the regular interstitial. The SDK uses the same
  // TestIds.REWARDED_INTERSTITIAL constant for dev.
  rewardedInterstitial: __DEV__ ? TestIds.REWARDED_INTERSTITIAL : Platform.select({
    ios: 'ca-app-pub-9821496555610524/7306225702',
    android: 'ca-app-pub-9821496555610524/8071243544',
  }) ?? TestIds.REWARDED_INTERSTITIAL,
};

// ── Frequency Config ────────────────────────────────────────
// Tighter than before (was 2 / 8) — at our scale every extra impression
// matters and Google's published guidance allows ~1 interstitial per
// 2–3 min of active use. We were nowhere near that ceiling.
const INTERSTITIAL_EVERY_N_ACTIONS = 1;
const MAX_INTERSTITIALS_PER_HOUR = 20;
const MAX_REWARDED_PER_DAY = 10;
const COINS_PER_REWARDED = 30;
// App Open ad cooldown — don't show on every micro-foreground (e.g. user
// tapped a system share sheet and came back 3 seconds later). 4 minutes is
// the standard recommendation.
const APP_OPEN_COOLDOWN_MS = 4 * 60 * 1000;
// Suppress App Open immediately after we've shown an interstitial or
// rewarded, otherwise users can get two fullscreen ads back-to-back.
const APP_OPEN_FULLSCREEN_SUPPRESSION_MS = 30 * 1000;

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
  /**
   * Show a rewarded *interstitial* — different ad unit and lower payout
   * (5 coins by default vs 30). Best used at moments of organic dwell
   * after a positive event (quest complete, season tier claim) where
   * the user has spare attention and a small bonus feels generous.
   */
  showRewardedInterstitial: () => Promise<RewardedAdResult>;
  /** How many rewarded ads remain today (shared cap across both formats) */
  rewardedAdsRemaining: number;
  /** Whether ATT has been requested */
  trackingRequested: boolean;
}

const AdContext = createContext<AdContextType>({
  adsEnabled: true,
  bannerAdUnitId: TestIds.BANNER,
  trackAction: () => {},
  showRewardedAd: async () => ({ coins: 0, error: 'ad_unavailable' }),
  showRewardedInterstitial: async () => ({ coins: 0, error: 'ad_unavailable' }),
  rewardedAdsRemaining: MAX_REWARDED_PER_DAY,
  trackingRequested: false,
});

export const useAds = () => useContext(AdContext);

export function AdProvider({ children }: { children: React.ReactNode }) {
  const { isProMember } = usePurchases();
  const { tokens } = useAuth();
  // Gate every ad surface on (a) user being signed in and (b) not Pro.
  // Without the auth gate we'd serve App Open / banners on Login,
  // Signup, and Onboarding — which feels intrusive (the user hasn't
  // even seen the product yet) and risks App Review rejection for
  // showing ads outside the app's value proposition. Rewarded /
  // interstitial already needed an access token to redeem nonces, so
  // this just brings App Open + banners in line.
  const isAuthenticated = !!tokens?.accessToken;
  const adsEnabled = isAuthenticated && !isProMember;

  const { t } = useTranslation();
  const [trackingRequested, setTrackingRequested] = useState(false);
  // Pre-prompt visibility — only matters on iOS while ATT status is
  // `undetermined`. Showing a friendly explainer before the system dialog
  // is the cheapest way to lift opt-in (industry data: ~25% → ~55%), which
  // roughly doubles iOS eCPM.
  const [showAttPrePrompt, setShowAttPrePrompt] = useState(false);
  const attResolveRef = useRef<(() => void) | null>(null);
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

  // Rewarded interstitial — separate instance, separate resolve queue
  // because both formats can technically be in flight at once (rare,
  // but the contract is cleaner if we don't share state).
  const rewardedIntRef = useRef<RewardedInterstitialAd | null>(null);
  const [rewardedIntLoaded, setRewardedIntLoaded] = useState(false);
  const rewardedIntResolveRef = useRef<((result: RewardedAdResult) => void) | null>(null);
  const pendingIntNonceRef = useRef<string | null>(null);
  // Nonce for the CURRENT ad impression — set right before .show(), consumed
  // by the EARNED_REWARD listener. This is what makes backend reward crediting
  // unforgeable: the nonce is issued server-side, bound to this user, and
  // single-use, so the /coins/ad-reward endpoint can't be farmed by replay.
  const pendingNonceRef = useRef<string | null>(null);

  // ── Request ATT on mount ──────────────────────────────────
  // iOS will silently drop the prompt if the app is not in the
  // `active` state when `requestTrackingPermissionsAsync` is called.
  // App Review on iPadOS 26 hit exactly this: the call fired before
  // the app finished foregrounding, the system returned `undetermined`
  // without ever showing the dialog, and the reviewer rejected us
  // under Guideline 2.1. We now (1) gate on AppState === 'active',
  // (2) wait a short tick so the launch animation has settled, and
  // (3) skip re-prompting once a determination already exists.
  useEffect(() => {
    if (Platform.OS !== 'ios') {
      setTrackingRequested(true);
      return;
    }

    let cancelled = false;
    let subscription: { remove: () => void } | null = null;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;

    const waitForPrePrompt = () =>
      new Promise<void>((resolve) => {
        attResolveRef.current = resolve;
        setShowAttPrePrompt(true);
      });

    const ask = async () => {
      if (cancelled) return;
      attempts += 1;
      try {
        const current = await getTrackingPermissionsAsync();
        if (cancelled) return;
        if (current.status !== 'undetermined') {
          setTrackingRequested(true);
          return;
        }
        // Show our explainer modal FIRST. Apple doesn't let us re-prompt
        // once the system dialog has been answered, so the only chance we
        // get to frame the ask is right before the dialog fires.
        if (attempts === 1) {
          await waitForPrePrompt();
          if (cancelled) return;
        }
        const result = await requestTrackingPermissionsAsync();
        if (cancelled) return;
        // If iOS silently dropped the dialog (status stays
        // `undetermined`), retry once more after another delay. This is
        // the exact failure mode that produced the App Review 2.1
        // rejection on iPadOS 26.
        if (result.status === 'undetermined' && attempts < 2) {
          timeout = setTimeout(ask, 1500);
          return;
        }
      } catch {
        // Ignore — fall through to mark requested so ads can init.
      }
      if (!cancelled) setTrackingRequested(true);
    };

    const scheduleAsk = () => {
      // 1s delay lets the launch animation / splash transition finish
      // before we present the system dialog. Anything shorter risks
      // iOS dropping the prompt because the app hasn't fully presented
      // its key window yet.
      timeout = setTimeout(ask, 1000);
    };

    const tryAsk = () => {
      if (AppState.currentState === 'active') {
        scheduleAsk();
      } else {
        subscription = AppState.addEventListener('change', (state) => {
          if (state === 'active') {
            subscription?.remove();
            subscription = null;
            scheduleAsk();
          }
        });
      }
    };

    tryAsk();

    return () => {
      cancelled = true;
      subscription?.remove();
      if (timeout) clearTimeout(timeout);
    };
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

  // ── Load rewarded interstitial ────────────────────────────
  // Same event topology as the rewarded ad above, with one key
  // difference: this one DOESN'T require an explicit user opt-in —
  // it fires on demand from positive moments (quest claim, season
  // tier claim). Reward is smaller (5 vs 30 coins) and the server
  // enforces that via the adType pinned to the nonce.
  const loadRewardedInterstitial = useCallback(() => {
    if (!adsEnabled) return;
    const ad = RewardedInterstitialAd.createForAdRequest(AD_UNITS.rewardedInterstitial);
    let earnedThisImpression = false;
    const unsubLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      setRewardedIntLoaded(true);
    });
    const unsubEarned = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      earnedThisImpression = true;
      const nonce = pendingIntNonceRef.current;
      pendingIntNonceRef.current = null;

      if (!tokens?.accessToken || !nonce) {
        const resolve = rewardedIntResolveRef.current;
        rewardedIntResolveRef.current = null;
        resolve?.({ coins: 0, error: 'network' });
        return;
      }

      apiClient
        .post<{ success: boolean; coinsAwarded: number; dailyRemaining: number }>(
          '/coins/ad-reward',
          { adType: 'rewarded_interstitial', nonce },
          { token: tokens.accessToken },
        )
        .then((data) => {
          setRewardedAdsRemaining(data.dailyRemaining ?? 0);
          const resolve = rewardedIntResolveRef.current;
          rewardedIntResolveRef.current = null;
          resolve?.({ coins: data.coinsAwarded ?? 5 });
        })
        .catch((err) => {
          const reason: RewardedAdError =
            err instanceof ApiError && err.status === 429 ? 'daily_limit' : 'network';
          const resolve = rewardedIntResolveRef.current;
          rewardedIntResolveRef.current = null;
          resolve?.({ coins: 0, error: reason });
        });
    });
    const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      setRewardedIntLoaded(false);
      if (!earnedThisImpression && rewardedIntResolveRef.current) {
        const resolve = rewardedIntResolveRef.current;
        rewardedIntResolveRef.current = null;
        pendingIntNonceRef.current = null;
        resolve({ coins: 0, error: 'aborted' });
      }
      loadRewardedInterstitial();
    });
    const unsubError = ad.addAdEventListener(AdEventType.ERROR, (error: any) => {
      setRewardedIntLoaded(false);
      if (rewardedIntResolveRef.current) {
        const resolve = rewardedIntResolveRef.current;
        rewardedIntResolveRef.current = null;
        pendingIntNonceRef.current = null;
        resolve({ coins: 0, error: 'ad_unavailable' });
      }
      if (__DEV__) {
        console.warn('[ads] rewarded interstitial error', error?.message || error);
      }
    });
    ad.load();
    rewardedIntRef.current = ad;
    return () => {
      unsubLoaded();
      unsubEarned();
      unsubClosed();
      unsubError();
    };
  }, [adsEnabled, tokens?.accessToken]);

  // ── App Open ad ───────────────────────────────────────────
  // Highest-eCPM format on mobile today. We preload one instance, show it
  // when the app returns from background, then preload the next one.
  const appOpenRef = useRef<AppOpenAd | null>(null);
  const appOpenLoadedRef = useRef(false);
  const lastAppOpenShownRef = useRef(0);
  const lastFullscreenShownRef = useRef(0);
  const appOpenShowingRef = useRef(false);

  const loadAppOpen = useCallback(() => {
    if (!adsEnabled) return;
    const ad = AppOpenAd.createForAdRequest(AD_UNITS.appOpen);
    const unsubLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
      appOpenLoadedRef.current = true;
    });
    const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      appOpenLoadedRef.current = false;
      appOpenShowingRef.current = false;
      // Preload the next one.
      loadAppOpen();
    });
    const unsubError = ad.addAdEventListener(AdEventType.ERROR, (error: any) => {
      appOpenLoadedRef.current = false;
      appOpenShowingRef.current = false;
      if (__DEV__) {
        console.warn('[ads] app open ad error', error?.message || error);
      }
    });
    ad.load();
    appOpenRef.current = ad;
    return () => {
      unsubLoaded();
      unsubClosed();
      unsubError();
    };
  }, [adsEnabled]);

  // ── Init ads ──────────────────────────────────────────────
  useEffect(() => {
    if (!adsEnabled || !trackingRequested) return;
    const cleanupInterstitial = loadInterstitial();
    const cleanupRewarded = loadRewarded();
    const cleanupRewardedInt = loadRewardedInterstitial();
    const cleanupAppOpen = loadAppOpen();
    return () => {
      cleanupInterstitial?.();
      cleanupRewarded?.();
      cleanupRewardedInt?.();
      cleanupAppOpen?.();
    };
  }, [adsEnabled, trackingRequested, loadInterstitial, loadRewarded, loadRewardedInterstitial, loadAppOpen]);

  // ── Show App Open on foreground ───────────────────────────
  // We track the previous AppState so we only show on background→active,
  // not on inactive→active (the latter fires for things like the control
  // center swipe, which would feel intrusive).
  const appStateRef = useRef(AppState.currentState);
  useEffect(() => {
    if (!adsEnabled) return;
    const sub = AppState.addEventListener('change', (next) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (next !== 'active' || prev === 'active') return;
      const now = Date.now();
      if (now - lastAppOpenShownRef.current < APP_OPEN_COOLDOWN_MS) return;
      if (now - lastFullscreenShownRef.current < APP_OPEN_FULLSCREEN_SUPPRESSION_MS) return;
      if (!appOpenLoadedRef.current || !appOpenRef.current) return;
      if (appOpenShowingRef.current) return;
      appOpenShowingRef.current = true;
      lastAppOpenShownRef.current = now;
      lastFullscreenShownRef.current = now;
      try {
        appOpenRef.current.show();
      } catch {
        appOpenShowingRef.current = false;
      }
    });
    return () => sub.remove();
  }, [adsEnabled]);

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
      lastFullscreenShownRef.current = Date.now();
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
      lastFullscreenShownRef.current = Date.now();
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

  // ── Show rewarded interstitial ────────────────────────────
  // Same nonce dance as showRewardedAd, with `adType: 'rewarded_interstitial'`
  // in the nonce request so the server knows to pin a 5-coin payout
  // rather than the 30-coin default. The two ad formats share the
  // daily cap (intentional — see issueAdRewardNonce).
  const showRewardedInterstitial = useCallback(async (): Promise<RewardedAdResult> => {
    if (!adsEnabled || !rewardedIntLoaded || !rewardedIntRef.current) {
      return { coins: 0, error: 'ad_unavailable' };
    }
    if (rewardedAdsRemaining <= 0) {
      return { coins: 0, error: 'daily_limit' };
    }
    if (!tokens?.accessToken) {
      return { coins: 0, error: 'network' };
    }

    let nonce: string;
    try {
      const res = await apiClient.post<{
        nonce: string;
        expiresAt: string;
        dailyRemaining: number;
      }>(
        '/coins/ad-reward/nonce',
        { adType: 'rewarded_interstitial' },
        { token: tokens.accessToken },
      );
      nonce = res.nonce;
      setRewardedAdsRemaining(res.dailyRemaining ?? 0);
    } catch (err) {
      if (err instanceof ApiError) {
        const msg = (err.message || '').toLowerCase();
        if (err.status === 429 || msg.includes('daily') || msg.includes('limit')) {
          setRewardedAdsRemaining(0);
          return { coins: 0, error: 'daily_limit' };
        }
      }
      return { coins: 0, error: 'network' };
    }

    pendingIntNonceRef.current = nonce;

    return new Promise((resolve) => {
      rewardedIntResolveRef.current = resolve;
      lastFullscreenShownRef.current = Date.now();
      rewardedIntRef.current!.show();
      setTimeout(() => {
        if (rewardedIntResolveRef.current === resolve) {
          rewardedIntResolveRef.current = null;
          pendingIntNonceRef.current = null;
          resolve({ coins: 0, error: 'aborted' });
        }
      }, 60000);
    });
  }, [adsEnabled, rewardedIntLoaded, rewardedAdsRemaining, tokens?.accessToken]);

  const dismissPrePrompt = useCallback(() => {
    setShowAttPrePrompt(false);
    const resolve = attResolveRef.current;
    attResolveRef.current = null;
    resolve?.();
  }, []);

  return (
    <AdContext.Provider
      value={{
        adsEnabled,
        bannerAdUnitId: AD_UNITS.banner,
        trackAction,
        showRewardedAd,
        showRewardedInterstitial,
        rewardedAdsRemaining,
        trackingRequested,
      }}
    >
      {children}
      <Modal
        visible={showAttPrePrompt}
        transparent
        animationType="fade"
        onRequestClose={dismissPrePrompt}
      >
        <View style={attStyles.backdrop}>
          <View style={attStyles.card}>
            <Text style={attStyles.title}>{t('ads.attPromptTitle')}</Text>
            <Text style={attStyles.body}>{t('ads.attPromptBody')}</Text>
            <TouchableOpacity
              style={attStyles.primaryBtn}
              activeOpacity={0.8}
              onPress={dismissPrePrompt}
            >
              <Text style={attStyles.primaryBtnText}>{t('ads.attPromptCta')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </AdContext.Provider>
  );
}

const attStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.onSurface,
    marginBottom: 12,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
    marginBottom: 20,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});
