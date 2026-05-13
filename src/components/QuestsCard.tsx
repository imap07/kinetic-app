/**
 * Daily quests card surfaced on the Home dashboard.
 *
 * The quest mechanic was previously hidden under a single thin
 * progress bar inside the user-stats card, with a tiny "QUESTS →"
 * link as its only entry point. That meant most users never saw
 * the three daily quests at all — and the quest mechanic is
 * specifically designed to drive repeat sessions ("come back to
 * cover 2 sports", "make 3 picks", etc.).
 *
 * This component renders the three quests as discrete rows with
 * progress bars and live completion state, and tapping the card
 * still routes to the full Quests screen for the underlying
 * details. Kept compact (~140pt) so it slots between the daily
 * challenge and the game list without dominating the fold.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme';
import type { QuestProgress } from '../api/predictions';

interface Props {
  quests: QuestProgress;
  onPress: () => void;
}

interface Row {
  key: 'pick3' | 'multiSport' | 'bonusReward';
  icon: React.ComponentProps<typeof Ionicons>['name'];
  titleKey: string;
  progress: number;
  target: number;
  done: boolean;
}

export function QuestsCard({ quests, onPress }: Props) {
  const { t } = useTranslation();

  const rows: Row[] = [
    {
      key: 'pick3',
      icon: 'checkmark-done',
      titleKey: 'quests.quest1Title',
      progress: quests.pick3.progress,
      target: 3,
      done: quests.pick3.completed,
    },
    {
      key: 'multiSport',
      icon: 'football',
      titleKey: 'quests.quest2Title',
      progress: quests.multiSport.progress,
      target: 2,
      done: quests.multiSport.completed,
    },
    {
      key: 'bonusReward',
      icon: 'gift',
      titleKey: 'quests.quest3Title',
      progress: quests.bonusReward.completed ? 1 : 0,
      target: 1,
      done: quests.bonusReward.completed,
    },
  ];

  const completedCount = rows.filter((r) => r.done).length;
  const allDone = completedCount === rows.length;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('quests.title')}
    >
      <LinearGradient
        colors={
          allDone
            ? ['rgba(202,253,0,0.18)', 'rgba(202,253,0,0.02)']
            : ['rgba(202,253,0,0.08)', 'rgba(202,253,0,0.01)']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.eyebrow}>{t('quests.dailyQuests')}</Text>
          <Text style={styles.title}>
            {allDone
              ? t('quests.allDoneTitle', { defaultValue: 'All quests complete!' })
              : t('quests.progressTitle', {
                  defaultValue: '{{done}} of {{total}} complete',
                  done: completedCount,
                  total: rows.length,
                })}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.onSurfaceVariant} />
      </View>

      <View style={styles.rows}>
        {rows.map((r) => {
          const pct = Math.min(r.progress / r.target, 1);
          return (
            <View key={r.key} style={styles.row}>
              <View
                style={[
                  styles.rowIcon,
                  r.done && styles.rowIconDone,
                ]}
              >
                <Ionicons
                  name={r.done ? 'checkmark' : r.icon}
                  size={12}
                  color={r.done ? '#4A5E00' : colors.onSurfaceVariant}
                />
              </View>
              <View style={styles.rowBody}>
                <Text
                  style={[styles.rowText, r.done && styles.rowTextDone]}
                  numberOfLines={1}
                >
                  {t(r.titleKey)}
                </Text>
                <View style={styles.bar}>
                  <View style={[styles.barFill, { width: `${pct * 100}%` }]} />
                </View>
              </View>
              <Text style={styles.rowProgress}>
                {Math.min(r.progress, r.target)}/{r.target}
              </Text>
            </View>
          );
        })}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(202,253,0,0.20)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerLeft: {
    flex: 1,
  },
  eyebrow: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: colors.primary,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  title: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 15,
    color: colors.onSurface,
  },
  rows: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconDone: {
    backgroundColor: colors.primary,
  },
  rowBody: {
    flex: 1,
    gap: 4,
  },
  rowText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.onSurface,
  },
  rowTextDone: {
    color: colors.onSurfaceVariant,
    textDecorationLine: 'line-through',
  },
  bar: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  rowProgress: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 11,
    color: colors.onSurfaceVariant,
    minWidth: 26,
    textAlign: 'right',
  },
});
