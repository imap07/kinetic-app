import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing } from '../theme';
import Toast from 'react-native-toast-message';
import { AppHeader } from '../components/AppHeader';
import { useAuth } from '../contexts/AuthContext';
import { usePurchases } from '../contexts/PurchasesContext';
import { predictionsApi, SPORT_TABS } from '../api';
import type { PredictionData, MyStatsResponse, DetailedStatsResponse } from '../api';
import type { RootStackParamList } from '../navigation/types';

const TABS = ['Active', 'History'];

function getOutcomeLabel(prediction: PredictionData): string {
  if (prediction.predictedOutcome === 'home') return `${prediction.homeTeamName} Win`;
  if (prediction.predictedOutcome === 'away') return `${prediction.awayTeamName} Win`;
  return 'Draw';
}

function getStatusColor(status: string): string {
  if (status === 'won') return '#16A34A';
  if (status === 'lost') return '#DC2626';
  if (status === 'void') return colors.onSurfaceVariant;
  return colors.primary;
}

function getSportLabel(sport: string): string {
  const tab = SPORT_TABS.find((t) => t.key === sport);
  return tab?.name || sport;
}

// ── Weekly Trend Chart (Pro) ──

function getWeekLabel(week: number): string {
  // Convert ISO week number to short label
  return `W${week}`;
}

function WeeklyTrendChart({ weeklyTrend }: { weeklyTrend: DetailedStatsResponse['weeklyTrend'] }) {
  const maxTotal = Math.max(...weeklyTrend.map((w) => w.total), 1);
  const barMaxHeight = 80;

  if (weeklyTrend.length === 0) {
    return (
      <View style={trendStyles.empty}>
        <Text style={trendStyles.emptyText}>Not enough data yet</Text>
      </View>
    );
  }

  return (
    <View style={trendStyles.container}>
      <View style={trendStyles.header}>
        <MaterialCommunityIcons name="chart-bar" size={16} color={colors.primary} />
        <Text style={trendStyles.title}>WEEKLY TREND</Text>
      </View>

      {/* Legend */}
      <View style={trendStyles.legend}>
        <View style={trendStyles.legendItem}>
          <View style={[trendStyles.legendDot, { backgroundColor: 'rgba(202,253,0,0.3)' }]} />
          <Text style={trendStyles.legendText}>Total</Text>
        </View>
        <View style={trendStyles.legendItem}>
          <View style={[trendStyles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={trendStyles.legendText}>Won</Text>
        </View>
      </View>

      {/* Bar Chart */}
      <View style={trendStyles.chart}>
        {weeklyTrend.map((w, i) => {
          const totalHeight = Math.max((w.total / maxTotal) * barMaxHeight, 4);
          const wonHeight = Math.max((w.won / maxTotal) * barMaxHeight, w.won > 0 ? 4 : 0);
          return (
            <View key={`${w.year}-${w.week}`} style={trendStyles.barGroup}>
              <View style={trendStyles.barStack}>
                {/* Total bar (background) */}
                <View
                  style={[
                    trendStyles.barTotal,
                    { height: totalHeight },
                  ]}
                />
                {/* Won bar (overlay, positioned at bottom) */}
                {w.won > 0 && (
                  <View
                    style={[
                      trendStyles.barWon,
                      { height: wonHeight },
                    ]}
                  />
                )}
              </View>
              {/* Win rate label */}
              <Text style={trendStyles.barWinRate}>
                {w.total > 0 ? `${w.winRate}%` : '-'}
              </Text>
              {/* Week label */}
              <Text style={trendStyles.barLabel}>{getWeekLabel(w.week)}</Text>
            </View>
          );
        })}
      </View>

      {/* Summary row */}
      {weeklyTrend.length >= 2 && (() => {
        const latest = weeklyTrend[weeklyTrend.length - 1];
        const prev = weeklyTrend[weeklyTrend.length - 2];
        const ptsDiff = latest.points - prev.points;
        const wrDiff = latest.winRate - prev.winRate;
        return (
          <View style={trendStyles.summaryRow}>
            <Text style={trendStyles.summaryLabel}>vs last week</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Text style={[trendStyles.summaryValue, { color: ptsDiff >= 0 ? '#5BEF90' : '#FF7351' }]}>
                {ptsDiff >= 0 ? '+' : ''}{ptsDiff} pts
              </Text>
              <Text style={[trendStyles.summaryValue, { color: wrDiff >= 0 ? '#5BEF90' : '#FF7351' }]}>
                {wrDiff >= 0 ? '+' : ''}{wrDiff}% WR
              </Text>
            </View>
          </View>
        );
      })()}
    </View>
  );
}

function PredictionCard({ prediction }: { prediction: PredictionData }) {
  const isResolved = prediction.status !== 'pending';
  const isVoid = prediction.status === 'void';

  return (
    <View style={[cardStyles.card, isResolved && prediction.status === 'won' && cardStyles.cardWon]}>
      {/* Sport + League */}
      <View style={cardStyles.topRow}>
        <View style={cardStyles.sportBadge}>
          <Text style={cardStyles.sportBadgeText}>{getSportLabel(prediction.sport)}</Text>
        </View>
        {prediction.leagueLogo ? (
          <Image source={{ uri: prediction.leagueLogo }} style={cardStyles.leagueLogo} resizeMode="contain" />
        ) : null}
        <Text style={cardStyles.leagueName} numberOfLines={1}>{prediction.leagueName}</Text>
      </View>

      {/* Teams */}
      <View style={cardStyles.teamsRow}>
        <View style={cardStyles.teamSide}>
          {prediction.homeTeamLogo ? (
            <Image source={{ uri: prediction.homeTeamLogo }} style={cardStyles.teamLogo} resizeMode="contain" />
          ) : (
            <View style={cardStyles.teamLogoFallback}>
              <Ionicons name="football" size={14} color={colors.onSurfaceVariant} />
            </View>
          )}
          <Text style={cardStyles.teamName} numberOfLines={1}>{prediction.homeTeamName}</Text>
        </View>
        <Text style={cardStyles.vs}>VS</Text>
        <View style={cardStyles.teamSide}>
          {prediction.awayTeamLogo ? (
            <Image source={{ uri: prediction.awayTeamLogo }} style={cardStyles.teamLogo} resizeMode="contain" />
          ) : (
            <View style={cardStyles.teamLogoFallback}>
              <Ionicons name="football" size={14} color={colors.onSurfaceVariant} />
            </View>
          )}
          <Text style={cardStyles.teamName} numberOfLines={1}>{prediction.awayTeamName}</Text>
        </View>
      </View>

      {/* Prediction Detail */}
      <View style={cardStyles.predRow}>
        <View style={cardStyles.predInfo}>
          <Text style={cardStyles.predLabel}>YOUR PICK</Text>
          <Text style={cardStyles.predValue}>{getOutcomeLabel(prediction)}</Text>
          {prediction.predictionType === 'exact_score' && (
            <Text style={cardStyles.predScore}>
              Score: {prediction.predictedHomeScore}-{prediction.predictedAwayScore}
            </Text>
          )}
        </View>
        <View style={cardStyles.multiplierBox}>
          <Text style={cardStyles.multiplierLabel}>MULTIPLIER</Text>
          <Text style={cardStyles.multiplierValue}>x{prediction.oddsMultiplier.toFixed(1)}</Text>
        </View>
      </View>

      {/* Result / Status */}
      {isResolved ? (
        <View style={cardStyles.resultRow}>
          <View style={[cardStyles.resultBadge, {
            backgroundColor: isVoid
              ? 'rgba(150,150,150,0.15)'
              : prediction.status === 'won'
                ? 'rgba(22,163,74,0.15)'
                : 'rgba(220,38,38,0.15)',
          }]}>
            <Ionicons
              name={isVoid ? 'ban-outline' : prediction.status === 'won' ? 'checkmark-circle' : 'close-circle'}
              size={14}
              color={getStatusColor(prediction.status)}
            />
            <Text style={[cardStyles.resultBadgeText, { color: getStatusColor(prediction.status) }]}>
              {prediction.status.toUpperCase()}
            </Text>
          </View>
          {isVoid ? (
            <Text style={cardStyles.actualScore}>Match cancelled</Text>
          ) : prediction.actualHomeScore != null ? (
            <Text style={cardStyles.actualScore}>
              Final: {prediction.actualHomeScore} - {prediction.actualAwayScore}
            </Text>
          ) : null}
          {prediction.pointsAwarded > 0 && (
            <Text style={cardStyles.pointsText}>+{prediction.pointsAwarded} pts</Text>
          )}
        </View>
      ) : (
        <View style={cardStyles.pendingRow}>
          <View style={cardStyles.pendingBadge}>
            <Ionicons name="time-outline" size={14} color={colors.primary} />
            <Text style={cardStyles.pendingText}>PENDING</Text>
          </View>
          <Text style={cardStyles.dateText}>
            {new Date(prediction.gameDate).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      )}
    </View>
  );
}

export function MyPicksScreen() {
  const { tokens } = useAuth();
  const { isProMember } = usePurchases();
  const rootNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [activeTab, setActiveTab] = useState(0);
  const [sportFilter, setSportFilter] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<PredictionData[]>([]);
  const [stats, setStats] = useState<MyStatsResponse | null>(null);
  const [detailedStats, setDetailedStats] = useState<DetailedStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Derive sport pills from user's stats breakdown (only sports the user has predictions for)
  const availableSports = useMemo(() => {
    if (!stats?.sportBreakdown?.length) return [];
    return stats.sportBreakdown
      .map((sb) => {
        const tab = SPORT_TABS.find((t) => t.key === sb.sport);
        return { key: sb.sport, name: tab?.name || sb.sport };
      })
      .sort((a, b) => {
        const idxA = SPORT_TABS.findIndex((t) => t.key === a.key);
        const idxB = SPORT_TABS.findIndex((t) => t.key === b.key);
        return idxA - idxB;
      });
  }, [stats]);

  const fetchData = useCallback(async () => {
    if (!tokens?.accessToken) return;
    try {
      const status = activeTab === 0 ? 'pending' : 'resolved';
      const pickParams: { status: 'pending' | 'resolved'; sport?: string } = { status };
      if (sportFilter) pickParams.sport = sportFilter;
      const promises: Promise<any>[] = [
        predictionsApi.getMyPicks(tokens.accessToken, pickParams),
        predictionsApi.getMyStats(tokens.accessToken),
      ];
      if (isProMember) {
        promises.push(predictionsApi.getDetailedStats(tokens.accessToken).catch(() => null));
      }
      const results = await Promise.all(promises);
      setPredictions(results[0].predictions);
      setStats(results[1]);
      if (isProMember && results[2]) {
        setDetailedStats(results[2]);
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error loading picks', text2: 'Pull down to try again' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tokens?.accessToken, activeTab, sportFilter, isProMember]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  return (
    <View style={styles.container}>
      <AppHeader showSearch={false} />

      {/* Stats Banner */}
      {stats && (
        <View style={styles.statsBanner}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.totalPredictions}</Text>
            <Text style={styles.statLabel}>TOTAL</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#16A34A' }]}>{stats.won}</Text>
            <Text style={styles.statLabel}>WON</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#DC2626' }]}>{stats.lost}</Text>
            <Text style={styles.statLabel}>LOST</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>{stats.winRate}%</Text>
            <Text style={styles.statLabel}>WIN RATE</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.totalPoints}</Text>
            <Text style={styles.statLabel}>POINTS</Text>
          </View>
        </View>
      )}

      {/* Pro Detailed Stats or Upgrade CTA */}
      {isProMember && detailedStats ? (
        <>
          <View style={styles.proStatsCard}>
            <View style={styles.proStatsHeader}>
              <MaterialCommunityIcons name="lightning-bolt" size={16} color={colors.primary} />
              <Text style={styles.proStatsTitle}>PRO INSIGHTS</Text>
            </View>
            {detailedStats.topSport && (
              <View style={styles.proStatRow}>
                <Text style={styles.proStatLabel}>Best Sport</Text>
                <Text style={styles.proStatValue}>
                  {getSportLabel(detailedStats.topSport.sport)} ({detailedStats.topSport.wins}W / {detailedStats.topSport.points}pts)
                </Text>
              </View>
            )}
            {detailedStats.sportBreakdown.length > 0 && (
              <View style={styles.proBreakdown}>
                {detailedStats.sportBreakdown.map((sb) => (
                  <View key={sb.sport} style={styles.proBreakdownRow}>
                    <Text style={styles.proBreakdownSport}>{getSportLabel(sb.sport)}</Text>
                    <Text style={styles.proBreakdownStats}>
                      {sb.won}/{sb.total} ({sb.winRate}%) -- {sb.points}pts
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
          {/* Weekly Trend Chart */}
          {detailedStats.weeklyTrend && detailedStats.weeklyTrend.length > 0 && (
            <WeeklyTrendChart weeklyTrend={detailedStats.weeklyTrend} />
          )}
        </>
      ) : !isProMember ? (
        <TouchableOpacity style={styles.upgradeCard} activeOpacity={0.85} onPress={() => rootNav.navigate('Paywall', { trigger: 'detailed_stats' })}>
          <LinearGradient
            colors={['rgba(202,253,0,0.08)', 'rgba(202,253,0,0.02)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.upgradeGradient}
          >
            <View style={styles.upgradeRow}>
              <Ionicons name="lock-closed" size={16} color={colors.primary} />
              <Text style={styles.upgradeText}>Unlock detailed stats by sport</Text>
              <Text style={styles.upgradeBtn}>UPGRADE</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      ) : null}

      {/* Sport Filter Pills */}
      {availableSports.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sportFilterScroll}
        >
          {/* "All" pill */}
          <TouchableOpacity
            style={[
              styles.sportFilterPill,
              sportFilter === null && styles.sportFilterPillActive,
            ]}
            onPress={() => setSportFilter(null)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.sportFilterText,
                sportFilter === null && styles.sportFilterTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          {availableSports.map((sport) => {
            const isActive = sportFilter === sport.key;
            return (
              <TouchableOpacity
                key={sport.key}
                style={[
                  styles.sportFilterPill,
                  isActive && styles.sportFilterPillActive,
                ]}
                onPress={() => setSportFilter(isActive ? null : sport.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.sportFilterText,
                    isActive && styles.sportFilterTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {sport.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        {TABS.map((tab, idx) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, activeTab === idx && styles.tabBtnActive]}
            onPress={() => setActiveTab(idx)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabBtnText, activeTab === idx && styles.tabBtnTextActive]}>
              {tab}
              {idx === 0 && stats ? ` (${stats.pending})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Predictions List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : predictions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="target" size={48} color={colors.onSurfaceVariant} />
          <Text style={styles.emptyTitle}>
            {activeTab === 0 ? 'No Active Picks' : 'No History Yet'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {activeTab === 0
              ? 'Make predictions on upcoming matches to see them here'
              : 'Your resolved predictions will appear here'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={predictions}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => <PredictionCard prediction={item} />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
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

  statsBanner: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 16,
    backgroundColor: colors.surfaceContainerLow, borderRadius: 8, padding: 16,
    alignItems: 'center', justifyContent: 'space-around',
  },
  statItem: { alignItems: 'center', gap: 2 },
  statNumber: {
    fontFamily: 'SpaceGrotesk_700Bold', fontSize: 20, lineHeight: 26, color: colors.onSurface,
  },
  statLabel: {
    fontFamily: 'Inter_700Bold', fontSize: 9, color: colors.onSurfaceVariant,
    letterSpacing: 0.8, textTransform: 'uppercase',
  },
  statDivider: { width: 1, height: 32, backgroundColor: 'rgba(69,72,76,0.3)' },

  sportFilterScroll: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  sportFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  sportFilterPillActive: {
    backgroundColor: 'rgba(202,253,0,0.12)',
    borderColor: colors.primary,
  },
  sportFilterText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  sportFilterTextActive: {
    color: colors.primary,
    fontFamily: 'Inter_700Bold',
  },

  tabContainer: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 16,
    backgroundColor: colors.surfaceContainerLow, borderRadius: 8, padding: 3,
  },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
  tabBtnActive: { backgroundColor: colors.surfaceContainerHighest },
  tabBtnText: {
    fontFamily: 'SpaceGrotesk_700Bold', fontSize: 14, lineHeight: 20, color: colors.onSurfaceVariant,
  },
  tabBtnTextActive: { color: colors.primaryContainer },

  proStatsCard: {
    marginHorizontal: 16, marginBottom: 16, backgroundColor: colors.surfaceContainerLow,
    borderRadius: 8, padding: 16, gap: 12,
    borderWidth: 1, borderColor: 'rgba(198,255,0,0.12)',
  },
  proStatsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  proStatsTitle: {
    fontFamily: 'Inter_700Bold', fontSize: 11, color: colors.primary,
    letterSpacing: 1, textTransform: 'uppercase',
  },
  proStatRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  proStatLabel: { fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.onSurfaceVariant },
  proStatValue: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 13, color: colors.onSurface },
  proBreakdown: { gap: 6, marginTop: 4 },
  proBreakdownRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: 'rgba(69,72,76,0.15)',
  },
  proBreakdownSport: { fontFamily: 'Inter_700Bold', fontSize: 11, color: colors.onSurfaceVariant, letterSpacing: 0.5 },
  proBreakdownStats: { fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.onSurface },

  upgradeCard: {
    marginHorizontal: 16, marginBottom: 16, borderRadius: 8, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(202,253,0,0.15)',
  },
  upgradeGradient: { padding: 14 },
  upgradeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  upgradeText: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 13, color: colors.onSurfaceVariant },
  upgradeBtn: { fontFamily: 'Inter_700Bold', fontSize: 11, color: colors.primary, letterSpacing: 0.8 },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  emptyTitle: {
    fontFamily: 'SpaceGrotesk_700Bold', fontSize: 20, color: colors.onSurface,
  },
  emptySubtitle: {
    fontFamily: 'Inter_500Medium', fontSize: 14, color: colors.onSurfaceVariant, textAlign: 'center',
  },
});

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainerLow, borderRadius: 8,
    padding: 16, marginBottom: 12, gap: 12,
  },
  cardWon: { borderLeftWidth: 3, borderLeftColor: '#16A34A' },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sportBadge: {
    backgroundColor: colors.surfaceContainerHighest, borderRadius: 4,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  sportBadgeText: {
    fontFamily: 'Inter_700Bold', fontSize: 9, color: colors.onSurfaceVariant,
    letterSpacing: 0.8, textTransform: 'uppercase',
  },
  leagueLogo: { width: 16, height: 16 },
  leagueName: {
    flex: 1, fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.onSurfaceDim,
  },
  teamsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  teamSide: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  teamLogo: { width: 28, height: 28 },
  teamLogoFallback: {
    width: 28, height: 28, borderRadius: 7, backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center', justifyContent: 'center',
  },
  teamName: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 13, color: colors.onSurface, flex: 1 },
  vs: { fontFamily: 'Inter_700Bold', fontSize: 10, color: colors.onSurfaceVariant, marginHorizontal: 8 },

  predRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    backgroundColor: 'rgba(34,38,43,0.4)', borderRadius: 6, padding: 12,
  },
  predInfo: { gap: 2, flex: 1 },
  predLabel: {
    fontFamily: 'Inter_700Bold', fontSize: 9, color: colors.onSurfaceVariant,
    letterSpacing: 0.8, textTransform: 'uppercase',
  },
  predValue: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 15, color: colors.onSurface },
  predScore: { fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.onSurfaceDim },
  multiplierBox: { alignItems: 'flex-end', gap: 2 },
  multiplierLabel: {
    fontFamily: 'Inter_700Bold', fontSize: 8, color: colors.onSurfaceVariant,
    letterSpacing: 0.8, textTransform: 'uppercase',
  },
  multiplierValue: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 20, color: colors.primaryContainer },

  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  resultBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12,
  },
  resultBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 0.8 },
  actualScore: { fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.onSurfaceDim },
  pointsText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 14, color: colors.primary, marginLeft: 'auto' },

  pendingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pendingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(198,255,0,0.08)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  pendingText: {
    fontFamily: 'Inter_700Bold', fontSize: 10, color: colors.primary, letterSpacing: 0.8,
  },
  dateText: { fontFamily: 'Inter_500Medium', fontSize: 11, color: colors.onSurfaceDim },
});

// ── Weekly Trend Chart Styles ──

const trendStyles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(198,255,0,0.12)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: colors.primary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 4,
  },
  barGroup: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  barStack: {
    width: '100%',
    maxWidth: 32,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 80,
  },
  barTotal: {
    width: '100%',
    backgroundColor: 'rgba(202,253,0,0.15)',
    borderRadius: 3,
    position: 'absolute',
    bottom: 0,
  },
  barWon: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
    position: 'absolute',
    bottom: 0,
  },
  barWinRate: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: colors.primaryContainer,
    letterSpacing: 0.3,
  },
  barLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 9,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(69,72,76,0.2)',
  },
  summaryLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  summaryValue: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 12,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
});
