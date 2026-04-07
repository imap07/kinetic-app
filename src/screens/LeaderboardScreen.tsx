import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,

  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../theme';
import { LeaguesStackParamList } from '../navigation/types';
import { useAuth } from '../contexts/AuthContext';
import { leaderboardApi, predictionsApi } from '../api';
import type { LeaderboardEntry, MyRankResponse, MyStatsResponse } from '../api';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';

type Props = {
  navigation: NativeStackNavigationProp<LeaguesStackParamList, 'Leaderboard'>;
};

const TIER_COLORS: Record<string, string> = {
  rookie: '#9CA3AF',
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  diamond: '#B9F2FF',
  legend: '#FF6B00',
};

const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

function getTierLabel(tier: string): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

function formatPoints(pts: number): string {
  if (pts >= 10000) return `${(pts / 1000).toFixed(1)}k`;
  return pts.toLocaleString();
}

export function LeaderboardScreen({ navigation }: Props) {
  const { tokens } = useAuth();
  const { t } = useTranslation();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<MyRankResponse | null>(null);
  const [myStats, setMyStats] = useState<MyStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!tokens?.accessToken) return;
    try {
      const [lbRes, rankRes, statsRes] = await Promise.all([
        leaderboardApi.getLeaderboard(tokens.accessToken, 1, 50),
        leaderboardApi.getMyRank(tokens.accessToken),
        predictionsApi.getMyStats(tokens.accessToken),
      ]);
      setEntries(lbRes.entries);
      setMyRank(rankRes);
      setMyStats(statsRes);
    } catch (err) {
      Toast.show({ type: 'error', text1: t('leaderboard.errorLoading') });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tokens?.accessToken]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const renderHeader = () => (
    <>
      {/* My Rank Card */}
      {myRank?.entry && (
        <View style={styles.rankCard}>
          <View style={styles.rankCardHeader}>
            <View style={[styles.tierBadge, { backgroundColor: TIER_COLORS[myRank.entry.tier] || colors.onSurfaceVariant }]}>
              <Text style={styles.tierBadgeText}>{getTierLabel(myRank.entry.tier)}</Text>
            </View>
            <Text style={styles.rankPosition}>#{myRank.rank}</Text>
          </View>
          <Text style={styles.rankName}>{myRank.entry.displayName}</Text>
          <View style={styles.rankStatsRow}>
            <View style={styles.rankStat}>
              <Text style={styles.rankStatValue}>{formatPoints(myRank.entry.totalPoints)}</Text>
              <Text style={styles.rankStatLabel}>{t('leaderboard.points')}</Text>
            </View>
            <View style={styles.rankDivider} />
            <View style={styles.rankStat}>
              <Text style={styles.rankStatValue}>{myRank.entry.winRate}%</Text>
              <Text style={styles.rankStatLabel}>{t('leaderboard.winRate')}</Text>
            </View>
            <View style={styles.rankDivider} />
            <View style={styles.rankStat}>
              <Text style={styles.rankStatValue}>{myRank.entry.currentStreak}</Text>
              <Text style={styles.rankStatLabel}>{t('leaderboard.streak')}</Text>
            </View>
            <View style={styles.rankDivider} />
            <View style={styles.rankStat}>
              <Text style={styles.rankStatValue}>{myRank.entry.bestStreak}</Text>
              <Text style={styles.rankStatLabel}>{t('leaderboard.best')}</Text>
            </View>
          </View>
          {myRank.totalPlayers > 0 && (
            <Text style={styles.rankContext}>
              {t('leaderboard.topPercent', { percent: Math.round((myRank.rank / myRank.totalPlayers) * 100), total: myRank.totalPlayers })}
            </Text>
          )}
        </View>
      )}

      {/* My Stats Grid */}
      {myStats && (
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statCardValue}>{myStats.totalPredictions}</Text>
            <Text style={styles.statCardLabel}>{t('leaderboard.predictions')}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statCardValue, { color: '#16A34A' }]}>{myStats.won}</Text>
            <Text style={styles.statCardLabel}>{t('picks.won')}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statCardValue, { color: '#DC2626' }]}>{myStats.lost}</Text>
            <Text style={styles.statCardLabel}>{t('picks.lost')}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statCardValue, { color: colors.primary }]}>{formatPoints(myStats.totalPoints)}</Text>
            <Text style={styles.statCardLabel}>{t('leaderboard.points')}</Text>
          </View>
        </View>
      )}

      {/* Leaderboard Title */}
      <View style={styles.lbTitleRow}>
        <MaterialCommunityIcons name="trophy" size={20} color={colors.primary} />
        <Text style={styles.lbTitle}>{t('leaderboard.title')}</Text>
      </View>
    </>
  );

  const renderEntry = ({ item }: { item: LeaderboardEntry }) => {
    const isTop3 = item.rank <= 3;
    const isMe = myRank?.entry?.userId === item.userId;
    return (
      <View style={[styles.entryRow, isMe && styles.entryRowMe]}>
        <View style={styles.entryRankCol}>
          {isTop3 ? (
            <MaterialCommunityIcons name="medal" size={22} color={MEDAL_COLORS[item.rank - 1]} />
          ) : (
            <Text style={styles.entryRank}>#{item.rank}</Text>
          )}
        </View>
        <View style={styles.entryAvatar}>
          {item.avatar ? (
            <Text style={styles.entryAvatarText}>{item.displayName.charAt(0).toUpperCase()}</Text>
          ) : (
            <Ionicons name="person" size={16} color={colors.onSurfaceVariant} />
          )}
        </View>
        <View style={styles.entryInfo}>
          <Text style={[styles.entryName, isMe && styles.entryNameMe]} numberOfLines={1}>
            {item.displayName}{isMe ? ` ${t('leaderboard.you')}` : ''}
          </Text>
          <View style={styles.entryMeta}>
            <View style={[styles.entryTierDot, { backgroundColor: TIER_COLORS[item.tier] || '#9CA3AF' }]} />
            <Text style={styles.entryTier}>{getTierLabel(item.tier)}</Text>
            <Text style={styles.entryWinRate}>{item.winRate}% WR</Text>
          </View>
        </View>
        <View style={styles.entryPoints}>
          <Text style={styles.entryPointsValue}>{formatPoints(item.totalPoints)}</Text>
          <Text style={styles.entryPointsLabel}>PTS</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.brandText}>KINETIC</Text>
        <Text style={styles.headerSubtitle}>{t('leaderboard.title')}</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : entries.length === 0 && !myRank?.entry ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="trophy-outline" size={48} color={colors.onSurfaceVariant} />
          <Text style={styles.emptyTitle}>No Rankings Yet</Text>
          <Text style={styles.emptySubtitle}>
            Make predictions to earn points and climb the leaderboard
          </Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.userId}
          renderItem={renderEntry}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: 56, paddingBottom: 12,
  },
  brandText: {
    fontFamily: 'SpaceGrotesk_700Bold', fontSize: 20, color: colors.primary, letterSpacing: 1,
  },
  headerSubtitle: {
    fontFamily: 'Inter_700Bold', fontSize: 10, color: colors.onSurfaceVariant,
    letterSpacing: 1.2, textTransform: 'uppercase',
  },

  // My Rank Card
  rankCard: {
    marginHorizontal: 16, backgroundColor: colors.surfaceContainerLow, borderRadius: 12,
    padding: 20, marginBottom: 16, gap: 8,
  },
  rankCardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  tierBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  tierBadgeText: {
    fontFamily: 'Inter_700Bold', fontSize: 10, color: '#000', letterSpacing: 0.5, textTransform: 'uppercase',
  },
  rankPosition: {
    fontFamily: 'SpaceGrotesk_700Bold', fontSize: 28, color: colors.onSurface,
  },
  rankName: {
    fontFamily: 'SpaceGrotesk_700Bold', fontSize: 22, color: colors.onSurface, letterSpacing: -0.5,
  },
  rankStatsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginTop: 8,
  },
  rankStat: { alignItems: 'center' },
  rankStatValue: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 20, color: colors.onSurface },
  rankStatLabel: { fontFamily: 'Inter_500Medium', fontSize: 11, color: colors.onSurfaceDim },
  rankDivider: { width: 1, height: 28, backgroundColor: 'rgba(69,72,76,0.3)' },
  rankContext: {
    fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.primary, textAlign: 'center', marginTop: 4,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginHorizontal: 16, marginBottom: 20,
  },
  statCard: {
    flex: 1, minWidth: '45%', backgroundColor: colors.surfaceContainerLow, borderRadius: 8,
    padding: 14, alignItems: 'center',
  },
  statCardValue: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 22, color: colors.onSurface },
  statCardLabel: { fontFamily: 'Inter_500Medium', fontSize: 11, color: colors.onSurfaceDim, marginTop: 2 },

  // Leaderboard Title
  lbTitleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginBottom: 12,
  },
  lbTitle: {
    fontFamily: 'Inter_700Bold', fontSize: 12, color: colors.onSurface, letterSpacing: 1.2,
  },

  // Entry Row
  entryRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(69,72,76,0.12)',
  },
  entryRowMe: { backgroundColor: 'rgba(198,255,0,0.04)' },
  entryRankCol: { width: 28, alignItems: 'center' },
  entryRank: { fontFamily: 'Inter_700Bold', fontSize: 13, color: colors.onSurfaceDim },
  entryAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center', justifyContent: 'center',
  },
  entryAvatarText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 14, color: colors.onSurface },
  entryInfo: { flex: 1, gap: 2 },
  entryName: { fontFamily: 'Inter_700Bold', fontSize: 14, color: colors.onSurface },
  entryNameMe: { color: colors.primary },
  entryMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  entryTierDot: { width: 6, height: 6, borderRadius: 3 },
  entryTier: { fontFamily: 'Inter_500Medium', fontSize: 10, color: colors.onSurfaceDim },
  entryWinRate: { fontFamily: 'Inter_500Medium', fontSize: 10, color: colors.onSurfaceVariant },
  entryPoints: { alignItems: 'flex-end' },
  entryPointsValue: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, color: colors.primary },
  entryPointsLabel: { fontFamily: 'Inter_700Bold', fontSize: 8, color: colors.onSurfaceDim, letterSpacing: 0.8 },

  // Empty
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  emptyTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 20, color: colors.onSurface },
  emptySubtitle: { fontFamily: 'Inter_500Medium', fontSize: 14, color: colors.onSurfaceVariant, textAlign: 'center' },
});
