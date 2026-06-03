import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, typography } from '../theme';
import { SharePickCard } from './SharePickCard';
import { track } from '../services/analytics';
import { useReferralShare } from '../hooks/useReferralShare';
import type { SportKey } from '../shared/domain';
import type { PredictionData } from '../api';

interface Props {
  prediction: PredictionData | null;
  username?: string;
  onDismiss: () => void;
}

/**
 * Win celebration modal — the dopamine peak of the product, redesigned to
 * lead with the invite CTA.
 *
 * Why invite-first:
 * Three product audits independently flagged that the previous layout
 * buried the "Invite a friend +KC" pill in a 3-button row inside
 * SharePickCard, with the image-share competing for the same visual
 * weight. The strongest growth lever in the app — "I just won, brag with
 * a code that pays both of us" — was visually indistinguishable from a
 * cosmetic image share. We now render a full-width gradient invite CTA
 * above the pick card; image-only share lives as a quiet secondary link
 * for users who want a screenshot without the personalized invite.
 *
 * When the user has no referral code yet (auth race, fetch error), we
 * fall back to the original "show off your pick" framing so the modal
 * never looks broken.
 */
export function WinCelebrationModal({ prediction, username, onDismiss }: Props) {
  const { t } = useTranslation();
  const shownIdRef = useRef<string | null>(null);
  const { referral, busy, share } = useReferralShare();
  // Hide the SharePickCard's own internal invite row when this modal is
  // hosting it — we already render the prominent CTA above, two are noise.
  const [imageShareTriggered, setImageShareTriggered] = useState(false);

  useEffect(() => {
    if (!prediction) return;
    if (shownIdRef.current === prediction._id) return;
    shownIdRef.current = prediction._id;
    track({
      event: 'win_celebration_shown',
      sport: prediction.sport as SportKey,
      points: prediction.pointsAwarded ?? 0,
    });
  }, [prediction]);

  if (!prediction) return null;

  const points = prediction.pointsAwarded ?? 0;
  const sport = prediction.sport as SportKey;

  const handleDismiss = () => {
    track({ event: 'win_celebration_dismissed', sport, points });
    onDismiss();
  };

  const handleInvite = () => {
    share({
      prediction,
      contentType: 'win_invite',
      onShared: () => {
        track({ event: 'win_celebration_shared', sport, points });
      },
    });
  };

  const handleShareImage = () => {
    setImageShareTriggered(true);
  };

  const handleSharedFromCard = () => {
    track({ event: 'win_celebration_shared', sport, points });
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={handleDismiss}>
        <Pressable style={styles.container} onPress={() => {}}>
          <LinearGradient
            colors={[colors.primary, colors.primaryGradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <Text style={styles.trophy}>🏆</Text>
            <Text style={styles.headerTitle}>
              {t('winCelebration.title', 'You won!')}
            </Text>
            {points > 0 && (
              <Text style={styles.headerPoints}>
                +{points} {t('winCelebration.points', 'PTS')}
              </Text>
            )}
          </LinearGradient>

          <View style={styles.body}>
            <Text style={styles.matchText}>
              {prediction.homeTeamName} vs {prediction.awayTeamName}
            </Text>
            <Text style={styles.subText}>
              {referral
                ? t('winCelebration.subtitle', {
                    coins: referral.rewardCoins,
                    defaultValue:
                      'Bring a friend — you both get coins on their 3rd pick.',
                  })
                : t(
                    'winCelebration.subtitleNoRef',
                    'Show off your pick.',
                  )}
            </Text>

            {/* Primary CTA: invite. Full-width, gradient, can't be missed.
                Only renders when we actually have a referral code — without
                a code the modal degrades to image-share-only so we never
                show a non-functional primary button. */}
            {referral && (
              <TouchableOpacity
                style={styles.inviteCta}
                onPress={handleInvite}
                disabled={busy}
                accessibilityRole="button"
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryGradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.inviteCtaGradient}
                >
                  <Feather name="gift" size={18} color="#0B0E11" />
                  <Text style={styles.inviteCtaText}>
                    {busy
                      ? '…'
                      : t('winCelebration.inviteCta', {
                          coins: referral.rewardCoins,
                          defaultValue: `Invite a friend · +${referral.rewardCoins} coins`,
                        })}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* Secondary: image share. Lives as a quiet link, not a peer
                button. Tap reveals the SharePickCard's full controls — we
                lazy-render the heavy ViewShot capture only when needed. */}
            {!imageShareTriggered ? (
              <TouchableOpacity
                style={styles.secondaryLink}
                onPress={handleShareImage}
                accessibilityRole="button"
              >
                <Feather name="image" size={14} color={colors.secondary} />
                <Text style={styles.secondaryLinkText}>
                  {t('winCelebration.shareImage', 'Share image instead')}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.shareWrap}>
                <SharePickCard
                  prediction={prediction}
                  username={username}
                  onShared={handleSharedFromCard}
                />
              </View>
            )}

            <TouchableOpacity style={styles.dismiss} onPress={handleDismiss}>
              <Text style={styles.dismissText}>
                {t('winCelebration.later', 'Maybe later')}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.closeBtn} onPress={handleDismiss} hitSlop={12}>
            <Feather name="x" size={20} color={colors.onSurface} />
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  container: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surfaceContainer,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  header: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  trophy: {
    fontSize: 56,
    marginBottom: spacing.xs,
  },
  headerTitle: {
    ...typography.titleLg,
    color: '#0B0E11',
    fontWeight: '900',
    letterSpacing: 1,
  },
  headerPoints: {
    ...typography.bodySm,
    color: '#0B0E11',
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: spacing.xs,
    opacity: 0.75,
  },
  body: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  matchText: {
    ...typography.bodyLg,
    color: colors.onSurface,
    fontWeight: '700',
    textAlign: 'center',
  },
  subText: {
    ...typography.bodySm,
    color: colors.secondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  inviteCta: {
    width: '100%',
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  inviteCtaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
  },
  inviteCtaText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
    color: '#0B0E11',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  secondaryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  secondaryLinkText: {
    ...typography.bodySm,
    color: colors.secondary,
    textDecorationLine: 'underline',
  },
  shareWrap: {
    width: '100%',
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  dismiss: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  dismissText: {
    ...typography.bodySm,
    color: colors.secondary,
  },
  closeBtn: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
