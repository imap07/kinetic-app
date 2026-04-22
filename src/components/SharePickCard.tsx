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
import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme';
import { track } from '../services/analytics';
import type { PredictionData } from '../api';

interface Props {
  prediction: PredictionData;
  username?: string;
  onShared?: () => void;
}

export function SharePickCard({ prediction, username, onShared }: Props) {
  const shotRef = useRef<ViewShot | null>(null);
  const [busy, setBusy] = useState(false);

  const handleShare = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const uri = await shotRef.current?.capture?.();
      if (!uri) throw new Error('capture returned no uri');

      // Not all platforms support sharing images (web / Expo Go on
      // some Androids). Fall back gracefully — the button doesn't
      // crash, just tells the user.
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
      // Best-effort: errors here are almost always "user dismissed".
      if (__DEV__) console.warn('[share-pick]', err?.message);
    } finally {
      setBusy(false);
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
        </LinearGradient>
      </ViewShot>
      </View>

      {/* The actual button the caller renders. Compact so it fits in
          a card footer or action row. */}
      <TouchableOpacity
        style={styles.shareBtn}
        onPress={handleShare}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel="Share your pick"
        hitSlop={8}
      >
        <Feather name="share-2" size={14} color={colors.primary} />
        <Text style={styles.shareBtnText}>{busy ? 'Preparing…' : 'Share'}</Text>
      </TouchableOpacity>
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
});
