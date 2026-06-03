/**
 * Shared referral-share hook.
 *
 * Three audits flagged that the invite CTA was the highest-leverage
 * growth surface in the app — winning a pick is the dopamine peak and
 * the share-with-code link converts higher than image share by 2-3x.
 * SharePickCard had this logic baked into its render; WinCelebrationModal
 * lifted the invite hook to the top-level CTA. Both call sites needed the
 * same fetch + share primitive, so it now lives here.
 *
 * Behavior:
 *  - Fetches the user's referral status lazily on mount; falls back to
 *    `null` if unauthed or the fetch fails (caller decides what to show).
 *  - `share()` opens the native share sheet with text+URL. The system
 *    sheet routes to whatever the user picks (iMessage, WhatsApp, X, etc.)
 *  - `busy` flag prevents double-taps while the sheet is open.
 *  - Localized message via i18n keys `share.pickMessageWithRef` /
 *    `share.pickMessageNoRef` so each locale's brag copy is honored.
 */
import { useEffect, useState, useCallback } from 'react';
import { Share, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { referralsApi, buildReferralUrl } from '../api/referrals';
import { track } from '../services/analytics';
import type { PredictionData } from '../api';

export interface ReferralBits {
  code: string;
  rewardCoins: number;
  url: string;
}

export interface UseReferralShareReturn {
  referral: ReferralBits | null;
  busy: boolean;
  /**
   * Trigger the native share sheet with the referral text+URL.
   * If `prediction` is provided, the message is the per-pick brag copy;
   * otherwise it's the generic invite copy.
   */
  share: (opts?: {
    prediction?: PredictionData;
    contentType?: 'pick_invite' | 'win_invite' | 'generic_invite';
    onShared?: () => void;
  }) => Promise<void>;
}

export function useReferralShare(): UseReferralShareReturn {
  const { t } = useTranslation();
  const { tokens } = useAuth();
  const [referral, setReferral] = useState<ReferralBits | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!tokens?.accessToken) return;
    referralsApi
      .getStatus(tokens.accessToken)
      .then((s) => {
        if (cancelled || !s.code) return;
        setReferral({
          code: s.code,
          rewardCoins: s.rewardCoins,
          url: buildReferralUrl(s.code),
        });
      })
      .catch(() => {
        // Silent — caller renders the no-referral branch when this stays null.
      });
    return () => {
      cancelled = true;
    };
  }, [tokens?.accessToken]);

  const share = useCallback(
    async ({
      prediction,
      contentType = 'generic_invite',
      onShared,
    }: {
      prediction?: PredictionData;
      contentType?: 'pick_invite' | 'win_invite' | 'generic_invite';
      onShared?: () => void;
    } = {}) => {
      if (busy || !referral) return;
      setBusy(true);
      try {
        const message = prediction
          ? t('share.pickMessageWithRef', {
              home: prediction.homeTeamName,
              away: prediction.awayTeamName,
              code: referral.code,
              coins: referral.rewardCoins,
              url: referral.url,
            })
          : t('share.inviteMessage', {
              code: referral.code,
              coins: referral.rewardCoins,
              url: referral.url,
            });

        await Share.share({
          message,
          url: referral.url,
        });

        track({
          event: 'share_generated',
          contentType,
          destination: Platform.OS,
        });
        onShared?.();
      } catch (err: any) {
        if (__DEV__) console.warn('[useReferralShare]', err?.message);
      } finally {
        setBusy(false);
      }
    },
    [busy, referral, t],
  );

  return { referral, busy, share };
}
