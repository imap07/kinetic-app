/**
 * Share-a-Pick card.
 *
 * Renders a 1080×1920-aspect social-media-ready card summarizing a
 * single prediction (team logos, predicted winner, multiplier,
 * username, branded watermark) and exposes a Share button that
 * captures the view to PNG + opens the native share sheet. The
 * caller is responsible for passing a PredictionData shape.
 *
 * Why this exists
 * ---------------
 * Biggest zero-CAC growth lever: picks are opinions, opinions are
 * already shared. A branded image in an Instagram Story or TikTok
 * comment closes a viral loop we currently leak. Feature flag
 * `share_a_pick` gates the button so the feature is kill-switchable.
 *
 * Implementation notes
 * --------------------
 * - Uses react-native-view-shot to PNG-capture the offscreen layout.
 *   ViewShot's `captureRef` returns a local URI that Share/Sharing
 *   can consume directly — no server round-trip, no binary upload.
 * - The layout is laid out at full aspect, but shrunk to fit the
 *   sheet preview via `collapsable={false}` + `transform: scale`.
 *   We don't display the card visibly to the user unless they tap
 *   Share — it's a headless render.
 * - Deep-link baked into the footer is `kinetic://pick/:id` which the
 *   app opens to the same match prediction; iOS/Android fall back to
 *   `https://kineticapp.ca/p/:id` (universal link) if the app isn't
 *   installed, redirecting to the App Store.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  Share,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme';
import { track } from '../services/analytics';
import { referralsApi, buildReferralUrl } from '../api/referrals';
import { useAuth } from '../contexts/AuthContext';
import type { PredictionData } from '../api';

interface Props {
  prediction: PredictionData;
  username?: string;
  onShared?: () => void;
}

interface ReferralBits {
  code: string;
  rewardCoins: number;
  url: string;
}

export function SharePickCard({ prediction, username, onShared }: Props) {
  const shotRef = useRef<ViewShot | null>(null);
  const { tokens } = useAuth();
  const [busy, setBusy] = useState(false);
  // Referral data is fetched lazily — the share card may be rendered
  // before the user has ever opened the Referrals screen, so we can't
  // assume the code is cached. Falls back gracefully to a code-less
  // card if the fetch errors or hasn't returned yet.
  const [referral, setReferral] = useState<ReferralBits | null>(null);

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
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [tokens?.accessToken]);

  /**
   * Two-tier share. RN's native `Share.share` accepts a `message`
   * (with a URL embedded) and routes through the system sheet — Twitter
   * and Messages prefill both. Expo's `Sharing.shareAsync` accepts the
   * captured PNG itself — Instagram Story, WhatsApp media, etc. We try
   * the text+URL share first when a referral code is present (it's the
   * highest-leverage path), and fall back to the image share when the
   * user wants a visual asset.
   *
   * The referral code is ALSO baked into the captured image's footer,
   * so even image-only destinations carry the invite hook.
   */
  const buildShareMessage = (): string => {
    if (!referral) return `Just made my pick on Kinetic. ${prediction.homeTeamName} vs ${prediction.awayTeamName}.`;
    return (
      `Just made my pick on Kinetic. ${prediction.homeTeamName} vs ${prediction.awayTeamName}. ` +
      `Join with my code ${referral.code} — we both get ${referral.rewardCoins} coins. ${referral.url}`
    );
  };

  const handleShareImage = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const uri = await shotRef.current?.capture?.();
      if (!uri) throw new Error('capture returned no uri');

      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('Sharing not supported on this device');
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Share your pick',
      });
      track({
        event: 'share_generated',
        contentType: 'pick',
        destination: Platform.OS,
      });
      onShared?.();
    } catch (err: any) {
      if (__DEV__) console.warn('[share-pick-image]', err?.message);
    } finally {
      setBusy(false);
    }
  };

  const handleShareInvite = async () => {
    if (busy || !referral) return;
    setBusy(true);
    try {
      await Share.share({
        message: buildShareMessage(),
        url: referral.url,
      });
      track({
        event: 'share_generated',
        contentType: 'pick_invite',
        destination: Platform.OS,
      });
      onShared?.();
    } catch (err: any) {
      if (__DEV__) console.warn('[share-pick-invite]', err?.message);
    } finally {
      setBusy(false);
    }
  };

  const handleCopyInvite = async () => {
    if (!referral) return;
    try {
      await Clipboard.setStringAsync(buildShareMessage());
      Alert.alert(
        'Copied!',
        `Invite + code ${referral.code} ready to paste anywhere.`,
      );
      track({
        event: 'share_generated',
        contentType: 'pick_clipboard',
        destination: 'clipboard',
      });
    } catch (err: any) {
      if (__DEV__) console.warn('[share-pick-copy]', err?.message);
    }
  };

  const predictedText =
    prediction.predictedOutcome === 'home'
      ? `${prediction.homeTeamName} TO WIN`
      : prediction.predictedOutcome === 'away'
        ? `${prediction.awayTeamName} TO WIN`
        : 'DRAW';

  return (
    <>
      {/* Offscreen: the actual capture target. `collapsable={false}`
          keeps it mountable even when it's not visible, so viewShot
          can still grab pixels. */}
      {/* `collapsable={false}` would normally go on ViewShot itself,
          but the RN types for react-native-view-shot don't expose it.
          Wrap in a plain View that carries the prop — the capture
          target is still the ViewShot content below. */}
      <View collapsable={false} style={styles.captureRoot}>
      <ViewShot
        ref={shotRef}
        style={styles.captureInner}
        options={{ format: 'png', quality: 0.9, result: 'tmpfile' }}
      >
        <LinearGradient
          colors={['#0B0E11', '#1A1D21']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.card}
        >
          <Text style={styles.brand}>KINETIC</Text>

          <View style={styles.teamsRow}>
            {prediction.homeTeamLogo ? (
              <ExpoImage source={{ uri: prediction.homeTeamLogo }} style={styles.teamLogo} contentFit="contain" />
            ) : (
              <View style={styles.teamLogoPlaceholder} />
            )}
            <Text style={styles.vs}>VS</Text>
            {prediction.awayTeamLogo ? (
              <ExpoImage source={{ uri: prediction.awayTeamLogo }} style={styles.teamLogo} contentFit="contain" />
            ) : (
              <View style={styles.teamLogoPlaceholder} />
            )}
          </View>

          <Text style={styles.teamsLabel} numberOfLines={2}>
            {prediction.homeTeamName} · {prediction.awayTeamName}
          </Text>

          <View style={styles.pickBox}>
            <Text style={styles.pickLabel}>MY PICK</Text>
            <Text style={styles.pickText}>{predictedText}</Text>
            {prediction.oddsMultiplier ? (
              <Text style={styles.multiplier}>
                {prediction.oddsMultiplier.toFixed(1)}× multiplier
              </Text>
            ) : null}
          </View>

          <Text style={styles.footer}>
            @{username ?? 'player'} · kineticapp.ca
          </Text>

          {/* Referral hook baked into the image so even share paths
              that strip text (Instagram Story screenshots, etc.) still
              deliver the invite code visually. */}
          {referral && (
            <View style={styles.referralPill}>
              <Text style={styles.referralPillLabel}>USE CODE</Text>
              <Text style={styles.referralPillCode}>{referral.code}</Text>
              <Text style={styles.referralPillReward}>
                we both get {referral.rewardCoins} coins
              </Text>
            </View>
          )}
        </LinearGradient>
      </ViewShot>
      </View>

      {/* Action row: invite (text+url — highest growth leverage path)
          first, image share second, copy as a safety valve. When the
          referral fetch hasn't returned (or the user isn't auth'd) we
          hide invite/copy and fall back to image-only — preserves the
          old behavior on the unhappy path. */}
      <View style={styles.shareRow}>
        {referral && (
          <TouchableOpacity
            style={styles.inviteBtn}
            onPress={handleShareInvite}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Share win and invite a friend"
            hitSlop={8}
          >
            <Feather name="gift" size={14} color={colors.onPrimary} />
            <Text style={styles.inviteBtnText}>
              {busy ? 'Sending…' : `Invite +${referral.rewardCoins} KC`}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.shareBtn}
          onPress={handleShareImage}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Share your pick as an image"
          hitSlop={8}
        >
          <Feather name="share-2" size={14} color={colors.primary} />
          <Text style={styles.shareBtnText}>
            {busy ? 'Preparing…' : 'Image'}
          </Text>
        </TouchableOpacity>
        {referral && (
          <TouchableOpacity
            style={styles.copyBtn}
            onPress={handleCopyInvite}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Copy invite link"
            hitSlop={8}
          >
            <Feather name="copy" size={14} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  // Offscreen-ish — positioned absolutely far off the viewport so it
  // renders but isn't seen. ViewShot still captures it.
  captureRoot: {
    position: 'absolute',
    top: -9999,
    left: 0,
    width: 1080,
    height: 1920,
  },
  captureInner: {
    flex: 1,
  },
  card: {
    flex: 1,
    padding: 80,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40,
  },
  brand: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 72,
    color: colors.primary,
    letterSpacing: -3,
  },
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 40,
  },
  teamLogo: { width: 220, height: 220 },
  teamLogoPlaceholder: {
    width: 220,
    height: 220,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainer,
  },
  vs: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 56,
    color: colors.onSurfaceVariant,
  },
  teamsLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 40,
    color: colors.onSurface,
    textAlign: 'center',
  },
  pickBox: {
    paddingHorizontal: 80,
    paddingVertical: 50,
    borderRadius: 32,
    backgroundColor: 'rgba(202,253,0,0.08)',
    borderWidth: 2,
    borderColor: 'rgba(202,253,0,0.3)',
    alignItems: 'center',
    gap: 16,
  },
  pickLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    letterSpacing: 6,
    color: colors.primary,
  },
  pickText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 64,
    color: colors.onSurface,
    textAlign: 'center',
  },
  multiplier: {
    fontFamily: 'Inter_500Medium',
    fontSize: 28,
    color: colors.onSurfaceVariant,
  },
  footer: {
    fontFamily: 'Inter_500Medium',
    fontSize: 28,
    color: colors.onSurfaceVariant,
    marginTop: 40,
  },

  referralPill: {
    marginTop: 24,
    paddingHorizontal: 56,
    paddingVertical: 32,
    borderRadius: 24,
    backgroundColor: 'rgba(202,253,0,0.12)',
    borderWidth: 2,
    borderColor: 'rgba(202,253,0,0.4)',
    alignItems: 'center',
    gap: 8,
  },
  referralPillLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    letterSpacing: 6,
    color: colors.onSurfaceVariant,
  },
  referralPillCode: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 52,
    color: colors.primary,
    letterSpacing: 4,
  },
  referralPillReward: {
    fontFamily: 'Inter_500Medium',
    fontSize: 22,
    color: colors.onSurface,
    marginTop: 4,
  },

  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  inviteBtnText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 11,
    color: colors.onPrimary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(202,253,0,0.4)',
    backgroundColor: 'rgba(202,253,0,0.06)',
  },
  shareBtnText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 11,
    color: colors.primary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  copyBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.outline,
  },
});
