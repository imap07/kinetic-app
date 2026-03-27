import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../theme';
import { HomeStackParamList } from '../navigation/types';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'PickSummary'>;
};

const PICKS = [
  {
    status: 'ACTIVE',
    time: 'STARTING IN 5M',
    match: 'Manchester City vs Arsenal',
    league: 'English Premier League',
    type: 'TV MULTIPLIER',
    multiplier: '2.45x',
  },
  {
    status: 'ACTIVE',
    time: 'STARTING IN 15M',
    match: 'Lakers vs Warriors',
    league: 'NBA Regular Season',
    type: 'TV MULTIPLIER',
    multiplier: '1.90x',
  },
  {
    status: 'UPCOMING',
    time: 'SAT 16:00',
    match: 'Real Madrid vs Barcelona',
    league: '',
    type: 'TV MULTIPLIER',
    multiplier: '3.25x',
  },
];

const RISK_LEVELS = ['LOW', 'MED', 'HIGH'];

export function PickSummaryScreen({ navigation }: Props) {
  const [activeRisk, setActiveRisk] = useState('MED');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pick Summary</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Title */}
        <View style={styles.titleSection}>
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>ACTIVE NOW</Text>
          </View>
          <Text style={styles.title}>PICK SUMMARY</Text>
          <View style={styles.tabRow}>
            <TouchableOpacity style={styles.tabActive}>
              <Text style={styles.tabActiveText}>Current Picks (3)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabInactive}>
              <Text style={styles.tabInactiveText}>My History</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Selected Predictions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>SELECTED PREDICTIONS</Text>
          <TouchableOpacity>
            <Text style={styles.clearAll}>CLEAR ALL</Text>
          </TouchableOpacity>
        </View>

        {PICKS.map((pick, idx) => (
          <View key={idx} style={styles.pickCard}>
            <View style={styles.pickHeader}>
              <View style={[
                styles.statusBadge,
                pick.status === 'UPCOMING' && styles.statusUpcoming,
              ]}>
                <Text style={styles.statusText}>{pick.status}</Text>
              </View>
              <Text style={styles.pickTime}>{pick.time}</Text>
            </View>
            <Text style={styles.pickMatch}>{pick.match}</Text>
            {pick.league ? <Text style={styles.pickLeague}>{pick.league}</Text> : null}
            <View style={styles.multiplierRow}>
              <Text style={styles.multiplierLabel}>{pick.type}</Text>
              <View style={styles.multiplierBadge}>
                <Text style={styles.multiplierValue}>{pick.multiplier}</Text>
              </View>
            </View>
          </View>
        ))}

        {/* Streak Bonus */}
        <View style={styles.streakBanner}>
          <View style={styles.streakContent}>
            <Text style={styles.streakTitle}>Streak Bonus Activated</Text>
            <Text style={styles.streakDesc}>
              Your streak is increasing by 15% →
            </Text>
          </View>
          <Text style={styles.streakValue}>+15%</Text>
        </View>

        {/* Prediction Summary */}
        <View style={styles.summarySection}>
          <Ionicons name="bar-chart" size={16} color={colors.onSurfaceVariant} />
          <Text style={styles.summaryTitle}>Prediction Summary</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Overall    solo Play</Text>
            <Text style={styles.summaryVal}>76/24</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Active Parlays</Text>
            <Text style={styles.summaryVal}>4 Series</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Key Performers</Text>
            <Text style={styles.summaryVal}>+10.5%</Text>
          </View>
        </View>

        {/* Risk level */}
        <Text style={styles.riskLabel}>SET PERFORMANCE LEVEL</Text>
        <View style={styles.riskRow}>
          {RISK_LEVELS.map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.riskButton,
                activeRisk === level && styles.riskButtonActive,
              ]}
              onPress={() => setActiveRisk(level)}
            >
              <Text
                style={[
                  styles.riskText,
                  activeRisk === level && styles.riskTextActive,
                ]}
              >
                {level}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Potential */}
        <View style={styles.summaryRow2}>
          <Text style={styles.potLabel}>Potential Outcome:</Text>
          <Text style={styles.potValue}>+BONUS</Text>
        </View>
        <View style={styles.summaryRow2}>
          <Text style={styles.potLabel}>Performance Index:</Text>
          <Text style={styles.potValue}>+120 pts</Text>
        </View>

        {/* Max Score */}
        <View style={styles.maxScoreCard}>
          <Text style={styles.maxScoreLabel}>MAX SCORE</Text>
          <Text style={styles.maxScoreValue}>8,520 PTS</Text>
        </View>

        {/* Confirm button */}
        <TouchableOpacity style={styles.confirmButton}>
          <LinearGradient
            colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.confirmGradient}
          >
            <Text style={styles.confirmText}>CONFIRM PREDICTIONS ✓</Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.confirmSubtext}>1/3 DAILY PREDICTIONS</Text>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: 56,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLow,
  },
  headerTitle: {
    flex: 1,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 17,
    color: colors.onSurface,
    textAlign: 'center',
    letterSpacing: -0.3,
  },

  titleSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: 16,
  },
  activeBadge: {
    backgroundColor: colors.primary,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  activeBadgeText: {
    ...typography.labelSm,
    color: colors.onPrimary,
    fontSize: 9,
  },
  title: {
    ...typography.displaySm,
    color: colors.onSurface,
    fontFamily: 'SpaceGrotesk_700Bold',
    marginBottom: 12,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 16,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    paddingBottom: 8,
  },
  tabActiveText: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontFamily: 'Inter_600SemiBold',
  },
  tabInactive: {
    paddingBottom: 8,
  },
  tabInactiveText: {
    ...typography.bodyMd,
    color: colors.onSurfaceDim,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: 12,
  },
  sectionTitle: {
    ...typography.labelLg,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  clearAll: {
    ...typography.labelSm,
    color: colors.primary,
    letterSpacing: 0.5,
  },

  pickCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    padding: 14,
    marginBottom: 10,
  },
  pickHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  statusBadge: {
    backgroundColor: colors.primary,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusUpcoming: {
    backgroundColor: colors.surfaceContainerHighest,
  },
  statusText: {
    ...typography.labelSm,
    color: colors.onPrimary,
    fontSize: 9,
  },
  pickTime: {
    ...typography.labelSm,
    color: colors.onSurfaceDim,
    fontSize: 9,
  },
  pickMatch: {
    ...typography.titleMd,
    color: colors.onSurface,
    marginBottom: 2,
  },
  pickLeague: {
    ...typography.bodySm,
    color: colors.onSurfaceDim,
    marginBottom: 8,
    fontSize: 11,
  },
  multiplierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  multiplierLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceDim,
    letterSpacing: 0.5,
  },
  multiplierBadge: {
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  multiplierValue: {
    ...typography.titleMd,
    color: colors.primary,
    fontFamily: 'SpaceGrotesk_700Bold',
  },

  streakBanner: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 4,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  streakContent: { flex: 1 },
  streakTitle: {
    ...typography.labelLg,
    color: colors.onSurface,
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
  streakDesc: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontSize: 11,
  },
  streakValue: {
    ...typography.titleLg,
    color: colors.primary,
    fontFamily: 'SpaceGrotesk_700Bold',
  },

  summarySection: {
    marginHorizontal: spacing.lg,
    marginBottom: 16,
  },
  summaryIcon: { fontSize: 16, marginBottom: 4 },
  summaryTitle: {
    ...typography.labelLg,
    color: colors.onSurface,
    fontFamily: 'Inter_700Bold',
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  summaryLabel: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },
  summaryVal: {
    ...typography.bodySm,
    color: colors.onSurface,
    fontFamily: 'Inter_600SemiBold',
  },

  riskLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceDim,
    paddingHorizontal: spacing.lg,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  riskRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: 8,
    marginBottom: 16,
  },
  riskButton: {
    flex: 1,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: borderRadius.sm,
    paddingVertical: 10,
    alignItems: 'center',
  },
  riskButtonActive: {
    backgroundColor: colors.primary,
  },
  riskText: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    fontSize: 12,
  },
  riskTextActive: {
    color: colors.onPrimary,
  },

  summaryRow2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: 6,
  },
  potLabel: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },
  potValue: {
    ...typography.bodySm,
    color: colors.primary,
    fontFamily: 'Inter_600SemiBold',
  },

  maxScoreCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: borderRadius.md,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  maxScoreLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceDim,
    marginBottom: 4,
  },
  maxScoreValue: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 32,
    color: colors.onSurface,
  },

  confirmButton: {
    marginHorizontal: spacing.lg,
    marginBottom: 8,
  },
  confirmGradient: {
    paddingVertical: 16,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  confirmText: {
    ...typography.labelMd,
    color: colors.onPrimary,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
    fontSize: 14,
  },
  confirmSubtext: {
    ...typography.labelSm,
    color: colors.onSurfaceDim,
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 0.5,
  },

});
