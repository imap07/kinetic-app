/**
 * Forward-looking streak badge.
 *
 * The retention audit flagged that the previous badge was purely a count
 * ("🔥 4") with no motivational signal: users learned how many days they
 * had, not what they were about to earn or what they'd lose by skipping.
 * The full milestone ladder (5/20/50/100/200/500) lived only inside a
 * modal opened on tap.
 *
 * This component:
 *  - Shows the current count, same as before.
 *  - Renders "→ N to +R coins" inline so the next milestone is visible
 *    at a glance — no tap required to see what's coming.
 *  - Switches to an at-risk visual when the user hasn't picked today and
 *    the day is winding down. Red tint + "Pick today!" copy creates the
 *    urgency the streak-at-risk push had been doing alone before.
 *
 * Defensive: when `streakInfo` is null (loading / unauth) the badge is
 * hidden entirely. Pressing it still opens the legacy detail modal via
 * the caller — onPress is forwarded.
 */
import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, typography } from '../theme';
import type { StreakInfo } from '../api/streaks';

interface Props {
  streakInfo: StreakInfo | null;
  /** True when the viewer hasn't made a pick today yet (UTC-day). */
  hasPickedToday: boolean;
  /**
   * Local hour (0-23) used to decide the at-risk threshold. Passed in so
   * the parent can choose whether to use the user's device clock or a
   * server-anchored value if it ever needs to. Defaults to device hour.
   */
  localHour?: number;
  /** Threshold after which "no pick yet" turns into the red urgency state. */
  atRiskAfterHour?: number;
  onPress?: () => void;
}

export function StreakBadge({
  streakInfo,
  hasPickedToday,
  localHour = new Date().getHours(),
  atRiskAfterHour = 18,
  onPress,
}: Props) {
  const { t } = useTranslation();

  if (!streakInfo) return null;

  const { currentStreak, nextMilestone, nextMilestoneReward } = streakInfo;
  const hasActiveStreak = currentStreak > 0;
  // At-risk = the user has an active streak, hasn't yet picked today, and
  // it's late enough that there's a real risk of losing it before reset.
  // We deliberately gate on hasActiveStreak so 0-streak users (who have
  // nothing to lose yet) don't see scary red copy that would discourage
  // exploration.
  const atRisk = hasActiveStreak && !hasPickedToday && localHour >= atRiskAfterHour;
  const daysToMilestone = nextMilestone - currentStreak;

  return (
    <TouchableOpacity
      style={[
        styles.badge,
        hasActiveStreak && styles.badgeActive,
        atRisk && styles.badgeAtRisk,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={
        atRisk
          ? t('streakBadge.a11yAtRisk', 'Streak at risk — pick today')
          : t('streakBadge.a11y', 'Streak: {{count}} days', { count: currentStreak })
      }
    >
      <View style={styles.topRow}>
        <Text style={styles.emoji}>{atRisk ? '⚠️' : '🔥'}</Text>
        <Text
          style={[
            styles.number,
            hasActiveStreak && styles.numberActive,
            atRisk && styles.numberAtRisk,
          ]}
        >
          {currentStreak}
        </Text>
      </View>
      {/* Progress / urgency caption. Three states:
            1. At-risk: red "Pick today!" — wins the user's attention.
            2. Active + milestone-in-sight: "5 → +20" so they know the
               reward is N days away.
            3. 0-streak: a single-word starter prompt ("Begin"). */}
      {atRisk ? (
        <Text style={styles.captionAtRisk}>
          {t('streakBadge.atRisk', 'Pick today!')}
        </Text>
      ) : hasActiveStreak && nextMilestone > 0 && daysToMilestone > 0 ? (
        <Text style={styles.caption}>
          {t('streakBadge.toMilestone', '{{days}} → +{{reward}}', {
            days: daysToMilestone,
            reward: nextMilestoneReward,
          })}
        </Text>
      ) : !hasActiveStreak ? (
        <Text style={styles.captionDim}>{t('streakBadge.begin', 'Begin')}</Text>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 56,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeActive: {
    backgroundColor: 'rgba(255,140,0,0.12)',
    borderColor: 'rgba(255,140,0,0.35)',
  },
  badgeAtRisk: {
    backgroundColor: 'rgba(220,38,38,0.14)',
    borderColor: 'rgba(220,38,38,0.55)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  emoji: {
    fontSize: 14,
  },
  number: {
    ...typography.bodyLg,
    fontWeight: '800',
    color: colors.secondary,
  },
  numberActive: {
    color: '#FF8C00',
  },
  numberAtRisk: {
    color: '#FCA5A5',
  },
  caption: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FF8C00',
    letterSpacing: 0.4,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  captionAtRisk: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FCA5A5',
    letterSpacing: 0.4,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  captionDim: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.secondary,
    letterSpacing: 0.4,
    marginTop: 2,
    textTransform: 'uppercase',
    opacity: 0.6,
  },
});
