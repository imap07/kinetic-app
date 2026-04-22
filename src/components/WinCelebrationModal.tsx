import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, typography } from '../theme';
import { SharePickCard } from './SharePickCard';
import { track } from '../services/analytics';
import type { SportKey } from '../shared/domain';
import type { PredictionData } from '../api';

interface Props {
  prediction: PredictionData | null;
  username?: string;
  onDismiss: () => void;
}

export function WinCelebrationModal({ prediction, username, onDismiss }: Props) {
  const { t } = useTranslation();
  const shownIdRef = useRef<string | null>(null);

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

  const handleDismiss = () => {
    track({
      event: 'win_celebration_dismissed',
      sport: prediction.sport as SportKey,
      points,
    });
    onDismiss();
  };

  const handleShared = () => {
    track({
      event: 'win_celebration_shared',
      sport: prediction.sport as SportKey,
      points,
    });
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
              {t(
                'winCelebration.subtitle',
                'Show off your pick — and bring a friend while you\'re at it.',
              )}
            </Text>

            <View style={styles.shareWrap}>
              <SharePickCard prediction={prediction} username={username} onShared={handleShared} />
            </View>

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
  shareWrap: {
    width: '100%',
    alignItems: 'center',
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
