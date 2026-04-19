import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { useTranslation } from 'react-i18next';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing } from '../theme';
import Toast from 'react-native-toast-message';
import { AppHeader } from '../components/AppHeader';
import { useAuth } from '../contexts/AuthContext';
import { predictionsApi, SPORT_TABS } from '../api';
import type { PredictionData, MyStatsResponse, DetailedStatsResponse } from '../api';
import type { RootStackParamList } from '../navigation/types';
import { AdBanner } from '../components/AdBanner';

const TABS = ['active', 'history'] as const;

function getOutcomeLabel(prediction: PredictionData, t: (key: string) => string): string {
  if (prediction.predictionType === 'over_under') {
    const sideLabel = prediction.side === 'over' ? t('matchPrediction.over') : t('matchPrediction.under');
    return `${sideLabel} ${prediction.threshold ?? ''}`;
  }
  if (prediction.predictionType === 'btts') {
    const answer = prediction.bttsAnswer === 'yes' ? t('matchPrediction.bttsYes') : t('matchPrediction.bttsNo');
    return `${t('matchPrediction.btts')}: ${answer}`;
  }
  // MMA: Method of Victory (KO/TKO, Submission, Decision) — the label
  // needs both the fighter and the method. Before this branch the row
  // would silently fall through to the generic "Draw" text below.
  if (prediction.predictionType === 'method_of_victory') {
    const fighter =
      prediction.predictedOutcome === 'home'
        ? prediction.homeTeamName
        : prediction.awayTeamName;
    const methodKey =
      prediction.methodOfVictory === 'ko_tko'
        ? 'prediction.methodKO'
        : prediction.methodOfVictory === 'submission'
          ? 'prediction.methodSubmission'
          : 'prediction.methodDecision';
    return `${fighter} — ${t(methodKey)}`;
  }
  // MMA: Goes the Distance (yes/no) — does the fight go to the
  // scorecards/final round?
  if (prediction.predictionType === 'goes_the_distance') {
    const answer =
      prediction.distanceAnswer === 'yes'
        ? t('picks.answerYes')
        : t('picks.answerNo');
    return `${t('prediction.tabDistance')}: ${answer}`;
  }
  // F1: Podium Finish — will predicted driver finish in the top 3?
  if (prediction.predictionType === 'podium_finish') {
    const driver =
      prediction.predictedOutcome === 'home'
        ? prediction.homeTeamName
        : prediction.awayTeamName;
    const answer =
      prediction.podiumAnswer === 'yes'
        ? t('picks.answerYes')
        : t('picks.answerNo');
    return `${driver} — ${t('prediction.tabPodium')}: ${answer}`;
  }
  // F1: Fastest Lap — just the driver; there's no yes/no branch here.
  if (prediction.predictionType === 'fastest_lap') {
    const driver =
      prediction.predictedOutcome === 'home'
        ? prediction.homeTeamName
        : prediction.awayTeamName;
    return `${driver} — ${t('prediction.tabFastestLap')}`;
  }
  if (prediction.predictedOutcome === 'home') return `${prediction.homeTeamName} ${t('matchPrediction.win')}`;
  if (prediction.predictedOutcome === 'away') return `${prediction.awayTeamName} ${t('matchPrediction.win')}`;
  return t('matchPrediction.draw');
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
  const { t } = useTranslation();
  const maxTotal = Math.max(...weeklyTrend.map((w) => w.total), 1);
  const barMaxHeight = 80;

  if (weeklyTrend.length === 0) {
    return (
      <View style={trendStyles.empty}>
        <Text style={trendStyles.emptyText}>{t('picks.notEnoughData')}</Text>
      </View>
    );
  }

  return (
    <View style={trendStyles.container}>
      <View style={trendStyles.header}>
        <MaterialCommunityIcons name="chart-bar" size={16} color={colors.primary} />
        <Text style={trendStyles.title}>{t('picks.weeklyTrend')}</Text>
      </View>

      {/* Legend */}
      <View style={trendStyles.legend}>
        <View style={trendStyles.legendItem}>
          <View style={[trendStyles.legendDot, { backgroundColor: 'rgba(202,253,0,0.3)' }]} />
          <Text style={trendStyles.legendText}>{t('picks.total')}</Text>
        </View>
        <View style={trendStyles.legendItem}>
          <View style={[trendStyles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={trendStyles.legendText}>{t('picks.won')}</Text>
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
            <Text style={trendStyles.summaryLabel}>{t('picks.vsLastWeek')}</Text>
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
  const { t } = useTranslation();
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
          <Text style={cardStyles.predLabel}>{t('picks.yourPick')}</Text>
          <Text style={cardStyles.predValue}>{getOutcomeLabel(prediction, t)}</Text>
          {prediction.predictionType === 'exact_score' && (
            <Text style={cardStyles.predScore}>
              {t('picks.score', { home: prediction.predictedHomeScore, away: prediction.predictedAwayScore })}
            </Text>
          )}
        </View>
        <View style={cardStyles.multiplierBox}>
          <Text style={cardStyles.multiplierLabel}>{t('picks.multiplier')}</Text>
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
            <Text style={cardStyles.actualScore}>{t('picks.matchCancelled')}</Text>
          ) : prediction.actualHomeScore != null ? (
            <Text style={cardStyles.actualScore}>
              {t('picks.finalScore', { home: prediction.actualHomeScore, away: prediction.actualAwayScore })}
            </Text>
          ) : null}
          {prediction.pointsAwarded > 0 && (
            <Text style={cardStyles.pointsText}>{t('picks.points', { pts: prediction.pointsAwarded })}</Text>
          )}
        </View>
      ) : (
        <View style={cardStyles.pendingRow}>
          <View style={cardStyles.pendingBadge}>
            <Ionicons name="time-outline" size={14} color={colors.primary} />
            <Text style={cardStyles.pendingText}>{t('picks.pending')}</Text>
          </View>
          <Text style={cardStyles.dateText}>
            {new Date(prediction.gameDate).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Streak Timeline ──────────────────────────────────────────
//
// Compact horizontal "tape" of the last 7 resolved picks. Each cell is
// a small dot colored by outcome (green=win, red=loss) with the
// current streak count pulled large on the left for emphasis.
//
// Why this exists
// ---------------
// Before v1.1 a "4-day streak" was just a number buried in the stats
// banner. The retention-strategist call-out in the v1.1 audit was
// that the streak is the single strongest retention hook and it's
// invisible. The timeline converts abstract → concrete: users see
// exactly which picks got them here and feel the cost of breaking.
//
// Scope
// -----
// Fixed 7 slots. If the user has fewer resolved picks, empty slots
// render as dim outlines (anchor for aspiration). We don't backfill
// beyond 7 because wider would waste screen real estate and the
// "week-long streak" is the psychologically meaningful unit.
function StreakTimeline({
  currentStreak,
  bestStreak,
  recent,
}: {
  currentStreak: number;
  bestStreak: number;
  recent: PredictionData[];
}) {
  const { t } = useTranslation();
  // Pad to 7 slots so the row width is stable regardless of history size.
  const slots: (PredictionData | null)[] = Array.from({ length: 7 }, (_, i) => recent[i] ?? null);

  return (
    <View style={streakTimelineStyles.container}>
      <View style={streakTimelineStyles.left}>
        <Text style={streakTimelineStyles.streakNumber}>{currentStreak}</Text>
        <Text style={streakTimelineStyles.streakLabel}>
          {t('picks.dayStreak', { defaultValue: 'DAY STREAK' })}
        </Text>
      </View>
      <View style={streakTimelineStyles.divider} />
      <View style={streakTimelineStyles.right}>
        <View style={streakTimelineStyles.dotsRow}>
          {slots.map((p, i) => {
            const isWin = p?.status === 'won';
            const isLoss = p?.status === 'lost';
            return (
              <View
                key={i}
                style={[
                  streakTimelineStyles.dot,
                  isWin && streakTimelineStyles.dotWin,
                  isLoss && streakTimelineStyles.dotLoss,
                  !p && streakTimelineStyles.dotEmpty,
                ]}
              />
            );
          })}
        </View>
        <Text style={streakTimelineStyles.bestStreakText}>
          {t('picks.bestStreak', {
            count: bestStreak,
            defaultValue: 'Best: {{count}} days',
          })}
        </Text>
      </View>
    </View>
  );
}

const streakTimelineStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(202,253,0,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(202,253,0,0.12)',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    gap: 14,
  },
  left: {
    alignItems: 'center',
    minWidth: 54,
  },
  streakNumber: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 28,
    lineHeight: 32,
    color: colors.primary,
  },
  streakLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    letterSpacing: 0.8,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(69,72,76,0.2)',
  },
  right: { flex: 1, gap: 6 },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    flex: 1,
    height: 10,
    borderRadius: 5,
  },
  dotWin: {
    backgroundColor: '#16A34A',
  },
  dotLoss: {
    backgroundColor: '#DC2626',
  },
  dotEmpty: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(69,72,76,0.3)',
  },
  bestStreakText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
});

export function MyPicksScreen() {
  const { t } = useTranslation();
  const { tokens } = useAuth();
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

  // Cache timestamps per (tab, filter) combination — avoids re-fetching
  // picks on every tab or filter switch when data is still fresh.
  // Stats are fetched separately with their own TTL (they don't change per tab).
  const PICKS_TTL_MS = 60_000;   // 60 s
  const STATS_TTL_MS = 120_000;  // 2 min
  const picksFetchedAt = useRef<Record<string, number>>({});
  const statsFetchedAt = useRef<number>(0);

  const fetchData = useCallback(async (force = false) => {
    if (!tokens?.accessToken) return;
    const now = Date.now();
    const status = activeTab === 0 ? 'pending' : 'resolved';
    const cacheKey = `${status}|${sportFilter ?? ''}`;

    const picksStale = force || now - (picksFetchedAt.current[cacheKey] ?? 0) >= PICKS_TTL_MS;
    const statsStale = force || now - statsFetchedAt.current >= STATS_TTL_MS;

    if (!picksStale && !statsStale) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const promises: Promise<any>[] = [];

      if (picksStale) {
        const pickParams: { status: 'pending' | 'resolved'; sport?: string } = { status };
        if (sportFilter) pickParams.sport = sportFilter;
        promises.push(predictionsApi.getMyPicks(tokens.accessToken, pickParams));
      } else {
        promises.push(Promise.resolve(null));
      }

      if (statsStale) {
        promises.push(predictionsApi.getMyStats(tokens.accessToken));
        promises.push(predictionsApi.getDetailedStats(tokens.accessToken).catch(() => null));
      } else {
        promises.push(Promise.resolve(null), Promise.resolve(null));
      }

      const results = await Promise.all(promises);

      if (results[0]) {
        setPredictions(results[0].predictions);
        picksFetchedAt.current[cacheKey] = Date.now();
      }
      if (results[1]) {
        setStats(results[1]);
        if (results[2]) setDetailedStats(results[2]);
        statsFetchedAt.current = Date.now();
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: t('picks.errorLoading'), text2: t('dashboard.pullToRetry') });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tokens?.accessToken, activeTab, sportFilter]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(true); // force=true bypasses TTL on manual pull-to-refresh
  }, [fetchData]);

  // Recent resolved picks (last 7) in reverse-chron order for the
  // streak timeline dots. Filter out void — voids are "didn't happen"
  // and don't belong on a streak tape.
  const recentResolved = useMemo(
    () =>
      predictions
        .filter((p) => p.status === 'won' || p.status === 'lost')
        .slice(0, 7),
    [predictions],
  );

  const listHeader = (
    <>
      {/* Streak Timeline — visual tape of the last 7 resolved picks. Makes
          the abstract "4-day streak" concrete: users see the actual W/L
          sequence and feel the weight of keeping it going. */}
      {stats && (stats.currentStreak > 0 || recentResolved.length > 0) && (
        <StreakTimeline
          currentStreak={stats.currentStreak}
          bestStreak={stats.bestStreak}
          recent={recentResolved}
        />
      )}

      {/* Stats Banner */}
      {stats && (
        <View style={styles.statsBanner}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.totalPredictions}</Text>
            <Text style={styles.statLabel}>{t('picks.total').toUpperCase()}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#16A34A' }]}>{stats.won}</Text>
            <Text style={styles.statLabel}>{t('picks.won').toUpperCase()}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#DC2626' }]}>{stats.lost}</Text>
            <Text style={styles.statLabel}>{t('picks.lost').toUpperCase()}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>{stats.winRate}%</Text>
            <Text style={styles.statLabel}>{t('picks.winRate')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.totalPoints}</Text>
            <Text style={styles.statLabel}>{t('leaderboard.points').toUpperCase()}</Text>
          </View>
        </View>
      )}

      {/* Detailed Stats */}
      {detailedStats ? (
        <>
          <View style={styles.proStatsCard}>
            <View style={styles.proStatsHeader}>
              <MaterialCommunityIcons name="lightning-bolt" size={16} color={colors.primary} />
              <Text style={styles.proStatsTitle}>{t('picks.proInsights')}</Text>
            </View>
            {detailedStats.topSport && (
              <View style={styles.proStatRow}>
                <Text style={styles.proStatLabel}>{t('picks.bestSport')}</Text>
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
          {detailedStats.weeklyTrend && detailedStats.weeklyTrend.length > 0 && (
            <WeeklyTrendChart weeklyTrend={detailedStats.weeklyTrend} />
          )}
        </>
      ) : null}

      {/* Sport Filter Pills */}
      {availableSports.length > 0 && (
        <View style={styles.sportFilterWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sportFilterScroll}
          >
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
                {t('dashboard.all')}
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
        </View>
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
              {tab === 'active' ? t('picks.active') : t('picks.history')}
              {idx === 0 && stats ? ` (${stats.pending})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Ad Banner */}
      <AdBanner placement="picks" />

      {/* Empty state (shown inline when no predictions) */}
      {!loading && predictions.length === 0 && (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="target" size={48} color={colors.onSurfaceVariant} />
          <Text style={styles.emptyTitle}>
            {activeTab === 0 ? t('picks.noActivePicks') : t('picks.noHistoryYet')}
          </Text>
          <Text style={styles.emptySubtitle}>
            {activeTab === 0
              ? t('picks.makePredictionsDesc')
              : t('picks.resolvedAppearHere')}
          </Text>
        </View>
      )}
    </>
  );

  return (
    <View style={styles.container}>
      <AppHeader showSearch={false} />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={predictions}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => <PredictionCard prediction={item} />}
          ListHeaderComponent={listHeader}
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

  sportFilterWrapper: {
    marginBottom: 12,
  },
  sportFilterScroll: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  sportFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    minHeight: 34,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  sportFilterPillActive: {
    backgroundColor: 'rgba(202,253,0,0.12)',
    borderColor: colors.primary,
  },
  sportFilterText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  sportFilterTextActive: {
    color: colors.primary,
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
    padding: 16, marginBottom: 12, marginHorizontal: 16, gap: 12,
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
