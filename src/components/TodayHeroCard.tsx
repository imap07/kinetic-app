/**
 * "Today" hero block.
 *
 * The retention audit flagged the previous Dashboard ordering: returning
 * users opened the app and saw the editorial sport feed (NextUpHero +
 * Live + Upcoming) before any signal about THEIR daily loop — streak
 * status, today's challenge, and quest progress lived 5+ sections down.
 *
 * This component sits at the top of the Dashboard (above NextUpHero)
 * and answers "why did I open the app today?" in one viewport:
 *  - Streak: current count + the nearest milestone reward.
 *  - Picks today: how many picks the user has made today (informational,
 *    no daily limit per CLAUDE.md).
 *  - Challenge: a single-line "Take today's challenge → +R coins" CTA
 *    when there's an unanswered challenge active.
 *
 * Visibility rules:
 *  - Hidden when none of the three signals are meaningful (zero streak,
 *    no challenge available, no picks today). That state is more
 *    common for true cold-start than for daily-active users, and a
 *    redundant "0 0 nothing" hero would just be visual clutter.
 *  - Streak block always renders when an active streak exists, even
 *    without a daily challenge — that's the primary loop.
 *
 * Tap behavior:
 *  - Streak block opens the streak detail modal via the existing
 *    onOpenStreak callback (caller owns the modal state).
 *  - Challenge block scrolls to / focuses the existing daily challenge
 *    card lower in the screen via onOpenChallenge — we don't duplicate
 *    the challenge UI, we just add the second entry point.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, typography } from '../theme';
import type { StreakInfo } from '../api/streaks';
import type { DailyChallenge } from '../api/challenges';

interface Props {
  streakInfo: StreakInfo | null;
  todayChallenge: DailyChallenge | null;
  picksToday: number;
  onOpenStreak: () => void;
  onOpenChallenge: () => void;
}

export function TodayHeroCard({
  streakInfo,
  todayChallenge,
  picksToday,
  onOpenStreak,
  onOpenChallenge,
}: Props) {
  const { t } = useTranslation();

  const hasStreak = (streakInfo?.currentStreak ?? 0) > 0;
  const hasUnansweredChallenge =
    todayChallenge != null && todayChallenge.status === 'active';
  const hasPicks = picksToday > 0;

  // Hide entirely when there's nothing today-relevant. Avoids a "0 0 —"
  // empty hero on truly cold-start sessions; NextUpHero below already
  // gives those users a CTA.
  if (!hasStreak && !hasUnansweredChallenge && !hasPicks) return null;

  return (
    <View style={styles.wrapper}>
      <LinearGradient
        colors={['rgba(202,253,0,0.10)', 'rgba(202,253,0,0.02)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.header}>
        <Text style={styles.title}>{t('today.title', 'TODAY')}</Text>
      </View>

      <View style={styles.row}>
        {hasStreak && streakInfo && (
          <TouchableOpacity style={styles.cell} onPress={onOpenStreak} activeOpacity={0.7}>
            <Text style={styles.cellEmoji}>🔥</Text>
            <Text style={styles.cellValue}>{streakInfo.currentStreak}</Text>
            <Text style={styles.cellLabel}>
              {t('today.streak', 'day streak')}
            </Text>
            {streakInfo.nextMilestone > streakInfo.currentStreak && (
              <Text style={styles.cellHint}>
                {t('today.streakHint', '+{{reward}} at {{milestone}}', {
                  reward: streakInfo.nextMilestoneReward,
                  milestone: streakInfo.nextMilestone,
                })}
              </Text>
            )}
          </TouchableOpacity>
        )}

        {hasPicks && (
          <View style={styles.cell}>
            <MaterialCommunityIcons
              name="target"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.cellValue}>{picksToday}</Text>
            <Text style={styles.cellLabel}>
              {t('today.picks', 'picks today')}
            </Text>
          </View>
        )}
      </View>

      {hasUnansweredChallenge && todayChallenge && (
        <TouchableOpacity
          style={styles.challengeCta}
          onPress={onOpenChallenge}
          activeOpacity={0.85}
        >
          <View style={styles.challengeIcon}>
            <Feather name="zap" size={14} color="#0B0E11" />
          </View>
          <Text style={styles.challengeText} numberOfLines={1}>
            {t('today.challengeCta', "Take today's challenge")}
          </Text>
          <Text style={styles.challengeReward}>
            +{todayChallenge.coinsReward}
          </Text>
          <Feather name="chevron-right" size={16} color="#0B0E11" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(202,253,0,0.20)',
    overflow: 'hidden',
  },
  header: {
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 2.5,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cell: {
    flex: 1,
    minHeight: 64,
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    gap: 2,
  },
  cellEmoji: {
    fontSize: 16,
  },
  cellValue: {
    ...typography.titleLg,
    color: colors.onSurface,
    fontWeight: '900',
  },
  cellLabel: {
    fontSize: 11,
    color: colors.secondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  cellHint: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: '700',
    marginTop: 2,
  },
  challengeCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginTop: spacing.sm,
  },
  challengeIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  challengeText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: '#0B0E11',
    letterSpacing: 0.3,
  },
  challengeReward: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0B0E11',
  },
});
