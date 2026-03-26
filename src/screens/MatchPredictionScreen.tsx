import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons, MaterialCommunityIcons, MaterialIcons, Feather } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../theme';
import { HomeStackParamList } from '../navigation/types';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'MatchPrediction'>;
};

const STATS = [
  { label: 'POSSESSION (56%)', home: 56, away: 44, homeVal: '', awayVal: '' },
  { label: 'SHOTS ON GOAL', home: 70, away: 30, homeVal: '12', awayVal: '05' },
  { label: 'DANGEROUS ATTACKS', home: 58, away: 42, homeVal: '84', awayVal: '61' },
  { label: 'CORNERS', home: 70, away: 30, homeVal: '07', awayVal: '03' },
];

const TIMELINE = [
  { type: 'goal', player: 'M. Sterling', score: '2-1', iconName: 'football' as const, color: colors.primary },
  { type: 'substitution', player: 'R. Benzema → J. Vinícius', score: '', iconName: 'swap-horizontal' as const, color: colors.onSurfaceVariant },
  { type: 'yellowcard', player: 'L. Modric', score: '', iconName: 'card' as const, color: colors.warning },
];

const PREDICTIONS = [
  { label: 'PREDICT RESULT (1X2)', sublabel: 'LONDON FC v HE', value: '+15 pts' },
  { label: '', sublabel: '', value: '+65 pts' },
  { label: '', sublabel: '', value: '+100 pts' },
];

export function MatchPredictionScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.brandText}>KINETIC</Text>
        <TouchableOpacity>
          <Feather name="bell" size={22} color={colors.onSurface} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Live badge */}
        <View style={styles.liveBadgeContainer}>
          <View style={styles.liveBadge}>
            <Text style={styles.liveBadgeText}>LIVE • 74'</Text>
          </View>
        </View>

        {/* Score section */}
        <View style={styles.scoreSection}>
          <Text style={styles.homeTeam}>LONDON FC</Text>
          <Text style={styles.homeSubtitle}>TOE ROYALS</Text>

          <View style={styles.scoreRow}>
            <Text style={styles.scoreNum}>2</Text>
            <Text style={styles.scoreDivider}> </Text>
            <Text style={styles.scoreNum}>1</Text>
          </View>

          <Text style={styles.leagueText}>Premier League</Text>

          <View style={styles.awayTeamRow}>
            <View style={styles.teamBadge}>
              <Ionicons name="football" size={24} color={colors.onSurface} />
            </View>
          </View>
          <Text style={styles.awayTeam}>MADRID UNITED</Text>
          <Text style={styles.awaySubtitle}>LOS BLANCOS</Text>
        </View>

        {/* Match Statistics */}
        <View style={styles.statsSection}>
          <Text style={styles.statsSectionTitle}>MATCH STATISTICS</Text>
          {STATS.map((stat, idx) => (
            <View key={idx} style={styles.statRow}>
              <Text style={styles.statLabel}>{stat.label}</Text>
              <View style={styles.statBarContainer}>
                <View style={styles.statBarBg}>
                  <View style={[styles.statBarHome, { width: `${stat.home}%` }]} />
                </View>
              </View>
              {stat.homeVal ? (
                <View style={styles.statValues}>
                  <Text style={styles.statValue}>{stat.homeVal}</Text>
                  <Text style={styles.statSeparator}>/</Text>
                  <Text style={styles.statValue}>{stat.awayVal}</Text>
                </View>
              ) : null}
            </View>
          ))}
        </View>

        {/* Discipline */}
        <View style={styles.disciplineSection}>
          <Text style={styles.disciplineLabel}>DISCIPLINE</Text>
          <View style={styles.disciplineRow}>
            <View style={{ width: 12, height: 16, borderRadius: 2, backgroundColor: '#FFD600' }} />
            <Text style={styles.disciplineValue}>2</Text>
            <View style={{ width: 12, height: 16, borderRadius: 2, backgroundColor: '#FF4444' }} />
            <Text style={styles.disciplineValue}>0</Text>
          </View>
        </View>

        {/* Live Timeline */}
        <View style={styles.timelineSection}>
          <Text style={styles.timelineSectionTitle}>LIVE TIMELINE</Text>
          {TIMELINE.map((event, idx) => (
            <View key={idx} style={styles.timelineItem}>
              <View style={[styles.timelineDot, { backgroundColor: event.color }]}>
                {event.iconName === 'football' && <Ionicons name="football" size={14} color={colors.onPrimary} />}
                {event.iconName === 'swap-horizontal' && <MaterialCommunityIcons name="swap-horizontal" size={14} color={colors.white} />}
                {event.iconName === 'card' && <View style={{ width: 8, height: 12, borderRadius: 1, backgroundColor: '#FFD600' }} />}
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineType}>
                  {event.type === 'goal' ? 'BY GOAL' : event.type === 'substitution' ? 'BY SUBSTITUTION' : 'BY YELLOWCARD'}
                </Text>
                <Text style={styles.timelinePlayer}>{event.player}</Text>
              </View>
              {event.score ? (
                <Text style={styles.timelineScore}>{event.score}</Text>
              ) : null}
            </View>
          ))}
        </View>

        {/* Match Predictions */}
        <View style={styles.predictionsSection}>
          <View style={styles.predictionsHeader}>
            <Text style={styles.predictionsSectionTitle}>MATCH PREDICTIONS</Text>
            <Text style={styles.predictionsLive}>▶▶</Text>
          </View>

          <Text style={styles.predictionSubLabel}>PREDICT RESULT (1X2)</Text>
          <Text style={styles.predictionMatch}>LONDON FC v HE</Text>

          <View style={styles.predictionOptions}>
            {['+15 pts', '+65 pts', '+100 pts'].map((pts, idx) => (
              <TouchableOpacity key={idx} style={styles.predictionButton}>
                <Text style={styles.predictionButtonText}>{pts}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.nextPredLabel}>NEXT ZONE PREDICTIONS</Text>
          <View style={styles.predictionOptions}>
            <TouchableOpacity style={styles.predictionButton}>
              <Text style={styles.predictionButtonText}>-35 pts</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.predictionButton}>
              <Text style={styles.predictionButtonText}>+50 pts</Text>
            </TouchableOpacity>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={styles.submitButton}
            onPress={() => navigation.navigate('PickSummary')}
          >
            <Text style={styles.submitButtonText}>SUBMIT PICKS</Text>
          </TouchableOpacity>
        </View>

        {/* Join banner */}
        <View style={styles.joinBanner}>
          <MaterialIcons name="warning-amber" size={20} color={colors.tertiary} />
          <View style={styles.joinContent}>
            <Text style={styles.joinTitle}>JOIN TIMED DECAST</Text>
            <Text style={styles.joinDesc}>Predict the next 5 minutes of play for bonus points.</Text>
          </View>
          <Text style={styles.joinValue}>+45 pts</Text>
        </View>

        {/* Trending */}
        <View style={styles.trendingSection}>
          <Ionicons name="time-outline" size={16} color={colors.onSurfaceDim} />
          <View>
            <Text style={styles.trendingTitle}>London to Win (1X2) Our Prediction</Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
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
    padding: 4,
  },
  backArrow: {
    color: colors.onSurface,
    fontSize: 22,
  },
  brandText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 20,
    color: colors.primary,
    letterSpacing: 1,
  },
  headerIcon: {
    fontSize: 20,
  },
  liveBadgeContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  liveBadge: {
    backgroundColor: colors.tertiary,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  liveBadgeText: {
    ...typography.labelMd,
    color: colors.white,
    fontSize: 11,
  },
  scoreSection: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: 24,
  },
  homeTeam: {
    ...typography.headlineLg,
    color: colors.onSurface,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 22,
    letterSpacing: 1,
  },
  homeSubtitle: {
    ...typography.labelSm,
    color: colors.onSurfaceDim,
    letterSpacing: 1,
    marginBottom: 12,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    marginBottom: 8,
  },
  scoreNum: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 64,
    color: colors.onSurface,
  },
  scoreDivider: {
    width: 20,
  },
  leagueText: {
    ...typography.bodySm,
    color: colors.onSurfaceDim,
    marginBottom: 16,
  },
  awayTeamRow: {
    marginBottom: 8,
  },
  teamBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  awayTeam: {
    ...typography.headlineLg,
    color: colors.onSurface,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 22,
    letterSpacing: 1,
  },
  awaySubtitle: {
    ...typography.labelSm,
    color: colors.onSurfaceDim,
    letterSpacing: 1,
  },

  // Stats
  statsSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: 16,
  },
  statsSectionTitle: {
    ...typography.labelLg,
    color: colors.onSurface,
    fontFamily: 'Inter_700Bold',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  statRow: {
    marginBottom: 12,
  },
  statLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceDim,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  statBarContainer: {
    marginBottom: 2,
  },
  statBarBg: {
    height: 4,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 2,
  },
  statBarHome: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  statValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  statValue: {
    ...typography.titleSm,
    color: colors.onSurface,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  statSeparator: {
    color: colors.onSurfaceDim,
    marginHorizontal: 4,
  },
  disciplineSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: 20,
  },
  disciplineLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceDim,
    marginBottom: 6,
  },
  disciplineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  disciplineIcon: {
    fontSize: 14,
  },
  disciplineValue: {
    ...typography.bodyMd,
    color: colors.onSurface,
    marginRight: 12,
  },

  // Timeline
  timelineSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: 24,
  },
  timelineSectionTitle: {
    ...typography.labelLg,
    color: colors.onSurface,
    fontFamily: 'Inter_700Bold',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineContent: {
    flex: 1,
  },
  timelineType: {
    ...typography.labelSm,
    color: colors.onSurfaceDim,
    fontSize: 9,
  },
  timelinePlayer: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontFamily: 'Inter_500Medium',
  },
  timelineScore: {
    ...typography.titleMd,
    color: colors.onSurface,
    fontFamily: 'SpaceGrotesk_700Bold',
  },

  // Predictions
  predictionsSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: 16,
  },
  predictionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  predictionsSectionTitle: {
    ...typography.labelLg,
    color: colors.onSurface,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
  predictionsLive: {
    color: colors.tertiary,
    fontSize: 14,
  },
  predictionSubLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceDim,
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  predictionMatch: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginBottom: 10,
  },
  predictionOptions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  predictionButton: {
    flex: 1,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: borderRadius.sm,
    paddingVertical: 12,
    alignItems: 'center',
  },
  predictionButtonText: {
    ...typography.titleSm,
    color: colors.primary,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  nextPredLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceDim,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    ...typography.labelMd,
    color: colors.onPrimary,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
  },

  // Join banner
  joinBanner: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.tertiary,
  },
  joinIcon: {
    fontSize: 18,
  },
  joinContent: {
    flex: 1,
  },
  joinTitle: {
    ...typography.labelLg,
    color: colors.onSurface,
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
  },
  joinDesc: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontSize: 11,
  },
  joinValue: {
    ...typography.titleSm,
    color: colors.primary,
    fontFamily: 'SpaceGrotesk_700Bold',
  },

  // Trending
  trendingSection: {
    marginHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
  },
  trendingIcon: {
    fontSize: 16,
  },
  trendingTitle: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },
});
