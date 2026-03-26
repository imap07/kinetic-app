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
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../theme';
import { LeaderboardStackParamList } from '../navigation/types';

type Props = {
  navigation: NativeStackNavigationProp<LeaderboardStackParamList, 'LeaderboardHome'>;
};

const TOP_PREDICTORS = [
  { rank: 1, name: 'ShadowBet99', pts: '12,450', medalColor: '#FFD700' },
  { rank: 2, name: 'OddsKing_X', pts: '11,320', medalColor: '#C0C0C0' },
  { rank: 3, name: 'PrecisionPick', pts: '10,890', medalColor: '#CD7F32' },
  { rank: 4, name: 'LiveWire_Bets', pts: '9,750', medalColor: '' },
  { rank: 5, name: 'AlphaStrike22', pts: '8,920', medalColor: '' },
  { rank: 6, name: 'NightHawk_Pro', pts: '8,540', medalColor: '' },
  { rank: 7, name: 'VelocityPicks', pts: '7,890', medalColor: '' },
];

const CHALLENGES = [
  {
    title: 'Premier League Weekend',
    type: 'ACCURACY',
    progress: 75,
    reward: '500 PTS',
    status: 'IN PROGRESS',
  },
  {
    title: 'Champions League Special',
    type: 'COMBO',
    progress: 40,
    reward: '1,200 PTS',
    status: 'NEW',
  },
];

export function LeaderboardScreen({ navigation }: Props) {
  const [activeTab, setActiveTab] = useState('Weekly');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.brandText}>KINETIC</Text>
        <TouchableOpacity>
          <Feather name="bell" size={22} color={colors.onSurface} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Rank banner */}
        <View style={styles.rankBanner}>
          <Text style={styles.rankLabel}>ELITE RANK</Text>
          <Text style={styles.rankTitle}>ELITE{'\n'}COMMANDER</Text>
          <View style={styles.rankStatsRow}>
            <View style={styles.rankStat}>
              <Text style={styles.rankStatValue}>7</Text>
              <Text style={styles.rankStatLabel}>Victories</Text>
            </View>
            <View style={styles.rankDivider} />
            <View style={styles.rankStat}>
              <Text style={styles.rankStatValue}>1,450</Text>
              <Text style={styles.rankStatLabel}>Total PTS</Text>
            </View>
          </View>
          <View style={styles.progressSection}>
            <Text style={styles.progressLabel}>NEXT RANK: GRAND MASTER</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '72%' }]} />
            </View>
          </View>
          <TouchableOpacity style={styles.claimButton}>
            <Text style={styles.claimButtonText}>CLAIM MY TITLE ▶</Text>
          </TouchableOpacity>
        </View>

        {/* Real Madrid vs Barcelona card */}
        <View style={styles.matchHighlight}>
          <Text style={styles.matchHighlightLabel}>FEATURED MATCH</Text>
          <Text style={styles.matchHighlightTitle}>Real Madrid vs Barcelona</Text>
          <Text style={styles.matchHighlightSub}>El Clásico • La Liga</Text>
        </View>

        {/* Pro card */}
        <View style={styles.proCard}>
          <LinearGradient
            colors={['#FF6B00', '#FF8C38']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.proGradient}
          >
            <Text style={styles.proLabel}>KINETIC INSIDER</Text>
            <Text style={styles.proTitle}>PRO</Text>
            <Text style={styles.proDesc}>Unlock exclusive predictions and analytics</Text>
          </LinearGradient>
        </View>

        {/* Active Prediction Challenges */}
        <Text style={styles.sectionTitle}>ACTIVE PREDICTION CHALLENGES</Text>
        {CHALLENGES.map((challenge, idx) => (
          <View key={idx} style={styles.challengeCard}>
            <View style={styles.challengeHeader}>
              <Text style={styles.challengeName}>{challenge.title}</Text>
              <View style={[
                styles.challengeStatus,
                challenge.status === 'NEW' && styles.challengeStatusNew,
              ]}>
                <Text style={styles.challengeStatusText}>{challenge.status}</Text>
              </View>
            </View>
            <Text style={styles.challengeType}>{challenge.type}</Text>
            <View style={styles.challengeProgressBar}>
              <View style={[styles.challengeProgressFill, { width: `${challenge.progress}%` }]} />
            </View>
            <Text style={styles.challengeReward}>Reward: {challenge.reward}</Text>
          </View>
        ))}

        {/* Top Predictors */}
        <View style={styles.leaderboardSection}>
          <Text style={styles.sectionTitle}>TOP PREDICTORS</Text>
          <View style={styles.leaderboardTabs}>
            {['Weekly', 'Monthly', 'All Time'].map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.lbTab, activeTab === tab && styles.lbTabActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[
                  styles.lbTabText,
                  activeTab === tab && styles.lbTabTextActive,
                ]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {TOP_PREDICTORS.map((predictor) => (
            <View key={predictor.rank} style={styles.predictorRow}>
              {predictor.medalColor ? (
                <View style={styles.predictorRankContainer}>
                  <MaterialCommunityIcons name="medal" size={22} color={predictor.medalColor} />
                </View>
              ) : (
                <Text style={styles.predictorRank}>#{predictor.rank}</Text>
              )}
              <View style={styles.predictorAvatar}>
                <Ionicons name="person" size={16} color={colors.onSurfaceVariant} />
              </View>
              <View style={styles.predictorInfo}>
                <Text style={styles.predictorName}>{predictor.name}</Text>
              </View>
              <Text style={styles.predictorPts}>{predictor.pts}</Text>
            </View>
          ))}
        </View>

        {/* Your stats */}
        <View style={styles.yourStats}>
          <Text style={styles.yourStatsTitle}>YOUR STATISTICS</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statCardValue}>156</Text>
              <Text style={styles.statCardLabel}>Predictions</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statCardValue}>68%</Text>
              <Text style={styles.statCardLabel}>Accuracy</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statCardValue}>12</Text>
              <Text style={styles.statCardLabel}>Win Streak</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statCardValue}>8.2k</Text>
              <Text style={styles.statCardLabel}>Total PTS</Text>
            </View>
          </View>
        </View>

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
  backBtn: { padding: 4 },
  backArrow: { color: colors.onSurface, fontSize: 22 },
  brandText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 20,
    color: colors.primary,
    letterSpacing: 1,
  },
  headerIcon: { fontSize: 20 },

  // Rank banner
  rankBanner: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.lg,
    padding: 20,
    marginBottom: 16,
  },
  rankLabel: {
    ...typography.labelSm,
    color: colors.primary,
    marginBottom: 4,
    letterSpacing: 1,
  },
  rankTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 30,
    color: colors.onSurface,
    lineHeight: 36,
    marginBottom: 16,
  },
  rankStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 16,
  },
  rankStat: {
    alignItems: 'center',
  },
  rankStatValue: {
    ...typography.titleLg,
    color: colors.onSurface,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  rankStatLabel: {
    ...typography.bodySm,
    color: colors.onSurfaceDim,
    fontSize: 11,
  },
  rankDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.surfaceContainerHighest,
  },
  progressSection: {
    marginBottom: 16,
  },
  progressLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceDim,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 3,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  claimButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingVertical: 12,
    alignItems: 'center',
  },
  claimButtonText: {
    ...typography.labelMd,
    color: colors.onPrimary,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
  },

  matchHighlight: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    padding: 14,
    marginBottom: 12,
  },
  matchHighlightLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceDim,
    marginBottom: 4,
  },
  matchHighlightTitle: {
    ...typography.titleMd,
    color: colors.onSurface,
  },
  matchHighlightSub: {
    ...typography.bodySm,
    color: colors.onSurfaceDim,
    marginTop: 2,
  },

  // Pro card
  proCard: {
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: 24,
  },
  proGradient: {
    padding: 20,
  },
  proLabel: {
    ...typography.labelSm,
    color: colors.white,
    opacity: 0.8,
    marginBottom: 4,
    letterSpacing: 1,
  },
  proTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 36,
    color: colors.white,
    marginBottom: 4,
  },
  proDesc: {
    ...typography.bodySm,
    color: colors.white,
    opacity: 0.8,
  },

  sectionTitle: {
    ...typography.labelLg,
    color: colors.onSurface,
    fontFamily: 'Inter_700Bold',
    paddingHorizontal: spacing.lg,
    marginBottom: 12,
    letterSpacing: 0.5,
  },

  // Challenges
  challengeCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    padding: 14,
    marginBottom: 10,
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  challengeName: {
    ...typography.titleSm,
    color: colors.onSurface,
  },
  challengeStatus: {
    backgroundColor: colors.primary,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  challengeStatusNew: {
    backgroundColor: colors.tertiary,
  },
  challengeStatusText: {
    ...typography.labelSm,
    color: colors.onPrimary,
    fontSize: 9,
  },
  challengeType: {
    ...typography.labelSm,
    color: colors.onSurfaceDim,
    marginBottom: 8,
  },
  challengeProgressBar: {
    height: 4,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 2,
    marginBottom: 8,
  },
  challengeProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  challengeReward: {
    ...typography.bodySm,
    color: colors.primary,
    fontFamily: 'Inter_600SemiBold',
  },

  // Leaderboard
  leaderboardSection: {
    marginTop: 12,
    marginBottom: 16,
  },
  leaderboardTabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: 8,
    marginBottom: 12,
  },
  lbTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerHighest,
  },
  lbTabActive: {
    backgroundColor: colors.primary,
  },
  lbTabText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontFamily: 'Inter_500Medium',
  },
  lbTabTextActive: {
    color: colors.onPrimary,
    fontFamily: 'Inter_600SemiBold',
  },
  predictorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    gap: 12,
  },
  predictorRankContainer: {
    width: 28,
    alignItems: 'center',
  },
  predictorRank: {
    ...typography.bodyMd,
    color: colors.onSurfaceDim,
    width: 28,
    textAlign: 'center',
  },
  predictorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  predictorInfo: {
    flex: 1,
  },
  predictorName: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontFamily: 'Inter_500Medium',
  },
  predictorPts: {
    ...typography.titleSm,
    color: colors.primary,
    fontFamily: 'SpaceGrotesk_700Bold',
  },

  // Your stats
  yourStats: {
    paddingHorizontal: spacing.lg,
    marginTop: 12,
  },
  yourStatsTitle: {
    ...typography.labelLg,
    color: colors.onSurface,
    fontFamily: 'Inter_700Bold',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    width: '47%',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    padding: 14,
    alignItems: 'center',
  },
  statCardValue: {
    ...typography.titleLg,
    color: colors.onSurface,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 24,
  },
  statCardLabel: {
    ...typography.bodySm,
    color: colors.onSurfaceDim,
    marginTop: 2,
  },

});
