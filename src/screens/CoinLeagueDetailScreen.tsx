import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { useCoins } from '../contexts/CoinContext';
import { leaguesApi } from '../api/leagues';
import type { CoinLeague, LeaderboardEntry } from '../api/leagues';
import { SPORT_TABS, sportsApi } from '../api/sports';
import type { SportGame, SportKey } from '../api/sports';
import { predictionsApi } from '../api/predictions';
import type { PredictionData } from '../api/predictions';
import type { LeaguesStackParamList } from '../navigation/types';
import { Image } from 'react-native';

type RouteParams = RouteProp<LeaguesStackParamList, 'CoinLeagueDetail'>;

export function CoinLeagueDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RouteParams>();
  const { tokens, user } = useAuth();
  const { available, refreshBalance } = useCoins();
  const { t } = useTranslation();

  const { leagueId } = route.params;

  const [league, setLeague] = useState<CoinLeague | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [matches, setMatches] = useState<SportGame[]>([]);
  const [activeMatchTab, setActiveMatchTab] = useState<'upcoming' | 'live' | 'recent'>('upcoming');
  const [predictions, setPredictions] = useState<Map<number, PredictionData>>(new Map());
  const [predictingGame, setPredictingGame] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!tokens?.accessToken) return;
    try {
      const [leagueRes, lbRes] = await Promise.all([
        leaguesApi.getById(tokens.accessToken, leagueId),
        leaguesApi.getLeaderboard(tokens.accessToken, leagueId).catch(() => null),
      ]);
      setLeague(leagueRes);
      if (lbRes) setLeaderboard(lbRes.leaderboard);

      // Fetch matches for this league's sport
      if (leagueRes?.sport) {
        try {
          const dashboard = await sportsApi.getDashboard(
            tokens.accessToken,
            leagueRes.sport as SportKey,
          );

          // Filter matches based on league context
          const filterMatches = (games: SportGame[]) => {
            // Themed league: only show matches from that specific league
            if (leagueRes.isThemed && leagueRes.footballLeagueApiId) {
              return games.filter((g) => g.leagueApiId === leagueRes.footballLeagueApiId);
            }
            return games;
          };

          // Filter ALL matches to only those within league date range
          const leagueStart = new Date(leagueRes.startDate).getTime();
          const leagueEnd = new Date(leagueRes.endDate).getTime();
          const filterByLeagueDates = (games: SportGame[]) =>
            games.filter((g) => {
              const gd = new Date(g.date).getTime();
              return gd >= leagueStart && gd <= leagueEnd;
            });

          const allMatches = [
            ...filterMatches(filterByLeagueDates(dashboard.liveGames || [])),
            ...filterMatches(filterByLeagueDates(dashboard.todayGames || [])),
            ...filterMatches(filterByLeagueDates(dashboard.upcomingGames || [])),
            ...filterMatches(filterByLeagueDates(dashboard.recentGames || [])),
          ];
          // Deduplicate by apiId
          const seen = new Set<number>();
          const unique = allMatches.filter((g) => {
            if (seen.has(g.apiId)) return false;
            seen.add(g.apiId);
            return true;
          });
          setMatches(unique);

          // Load existing predictions for these matches
          const predMap = new Map<number, PredictionData>();
          const predChecks = unique.slice(0, 20).map(async (g) => {
            try {
              const res = await predictionsApi.getPredictionForGame(
                leagueRes.sport, g.apiId, tokens.accessToken,
              );
              if (res.prediction) predMap.set(g.apiId, res.prediction);
            } catch { /* ignore */ }
          });
          await Promise.all(predChecks);
          setPredictions(predMap);
        } catch {
          // Matches fetch failed silently
        }
      }
    } catch {
      Alert.alert(t('common.error'), t('leagueDetail.couldNotLoad'));
    }
  }, [tokens?.accessToken, leagueId]);

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchData(), refreshBalance()]);
    setRefreshing(false);
  }, [fetchData, refreshBalance]);

  const isParticipant = league?.participants.some((p) => String(p.userId) === user?.id)
    || String(league?.creatorId) === user?.id;
  const sportMeta = SPORT_TABS.find((s) => s.key === league?.sport);

  const handleJoin = async () => {
    if (!league) return;
    if (available < league.entryFee) {
      Alert.alert(t('leagues.insufficientCoins'), t('leagues.insufficientCoinsDesc', { fee: league.entryFee, available }));
      return;
    }
    Alert.alert(
      t('leagueDetail.joinLeague'),
      league.entryFee > 0
        ? t('leagueDetail.joinEntryFee', { fee: league.entryFee })
        : t('leagueDetail.joinFree'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('leagueDetail.join'),
          onPress: async () => {
            setActionLoading(true);
            try {
              await leaguesApi.join(tokens!.accessToken, leagueId);
              await Promise.all([fetchData(), refreshBalance()]);
            } catch (e: any) {
              Alert.alert(t('common.error'), e.message || t('leagues.couldNotJoin'));
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleLeave = async () => {
    Alert.alert(t('leagueDetail.leaveLeague'), t('leagueDetail.leaveCoinsReturned'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('leagueDetail.leave'),
        style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          try {
            await leaguesApi.leave(tokens!.accessToken, leagueId);
            await Promise.all([fetchData(), refreshBalance()]);
          } catch (e: any) {
            Alert.alert(t('common.error'), e.message || t('leagues.couldNotLeave'));
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleInlinePredict = async (game: SportGame, outcome: 'home' | 'draw' | 'away') => {
    if (!league || !tokens?.accessToken) return;
    setPredictingGame(game.apiId);
    try {
      const payload = {
        sport: league.sport,
        gameApiId: game.apiId,
        leagueApiId: game.leagueApiId,
        gameDate: game.date,
        homeTeamName: game.homeTeam?.name ?? 'Home',
        homeTeamLogo: game.homeTeam?.logo,
        awayTeamName: game.awayTeam?.name ?? 'Away',
        awayTeamLogo: game.awayTeam?.logo,
        leagueName: game.leagueName,
        leagueLogo: game.leagueLogo,
        predictionType: 'result' as const,
        predictedOutcome: outcome,
      };
      const result = await predictionsApi.create(payload, tokens.accessToken);
      setPredictions((prev) => new Map(prev).set(game.apiId, result));
    } catch (e: any) {
      Alert.alert(t('leagueDetail.predictionFailed'), e.message || t('leagueDetail.couldNotPredict'));
    } finally {
      setPredictingGame(null);
    }
  };

  const handleInvite = async () => {
    if (!league) return;
    const feeText = league.entryFee === 0 ? 'FREE' : `${league.entryFee} coins`;
    const spots = league.maxParticipants - league.participants.length;
    const deepLink = Linking.createURL(`/league/${leagueId}`);
    try {
      await Share.share({
        message: `Join my prediction league "${league.name}" on Kinetic! 🏆\n\n` +
          `⚽ Sport: ${sportMeta?.name ?? league.sport}\n` +
          `🎟️ Entry: ${feeText}\n` +
          `👥 ${spots} spots left\n\n` +
          `Think you can beat me?\n${deepLink}`,
      });
    } catch { /* user cancelled */ }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'open': return colors.primary;
      case 'active': return colors.info;
      case 'completed': return colors.secondary;
      case 'cancelled': return colors.error;
      default: return colors.onSurfaceDim;
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing['4xl'] }} />
      </View>
    );
  }

  if (!league) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>{t('leagueDetail.leagueNotFound')}</Text>
      </View>
    );
  }

  const participantCount = league.participants.length;
  const endDateStr = new Date(league.endDate).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const startDateStr = new Date(league.startDate).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{league.name}</Text>
        <TouchableOpacity onPress={handleInvite} hitSlop={12}>
          <Feather name="share" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Status + Sport */}
        <View style={styles.metaRow}>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor(league.status)}20` }]}>
            <Text style={[styles.statusText, { color: statusColor(league.status) }]}>
              {league.status.toUpperCase()}
            </Text>
          </View>
          {sportMeta && <Text style={styles.sportLabel}>{sportMeta.name}</Text>}
          {league.isThemed && league.footballLeagueName && (
            <Text style={styles.themedLabel}>{league.footballLeagueName}</Text>
          )}
          {league.isSystemLeague && (
            <View style={styles.systemBadge}>
              <Text style={styles.systemBadgeText}>KINETIC</Text>
            </View>
          )}
        </View>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t('leagueDetail.entryFee')}</Text>
            <View style={styles.statValueRow}>
              <Text style={styles.statValue}>{league.entryFee === 0 ? t('leagues.free') : league.entryFee}</Text>
              {league.entryFee > 0 && (
                <MaterialCommunityIcons name="circle-multiple" size={12} color={colors.primary} />
              )}
            </View>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t('leagueDetail.prizePool')}</Text>
            <View style={styles.statValueRow}>
              <Text style={styles.statValue}>{league.prizePool}</Text>
              <MaterialCommunityIcons name="circle-multiple" size={12} color={colors.primary} />
            </View>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t('leagueDetail.players')}</Text>
            <Text style={styles.statValue}>{participantCount}/{league.maxParticipants}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t('leagueDetail.type')}</Text>
            <Text style={styles.statValue}>{league.leagueType === 'weekly' ? t('leagueDetail.weekly') : t('leagueDetail.matchday')}</Text>
          </View>
        </View>

        {/* Dates */}
        <View style={styles.datesRow}>
          <View style={styles.dateItem}>
            <Feather name="calendar" size={14} color={colors.onSurfaceDim} />
            <Text style={styles.dateLabel}>{t('leagueDetail.starts')}</Text>
            <Text style={styles.dateValue}>{startDateStr}</Text>
          </View>
          <View style={styles.dateDivider} />
          <View style={styles.dateItem}>
            <Feather name="flag" size={14} color={colors.onSurfaceDim} />
            <Text style={styles.dateLabel}>{t('leagueDetail.ends')}</Text>
            <Text style={styles.dateValue}>{endDateStr}</Text>
          </View>
        </View>

        {/* Prize Distribution Info */}
        {league.entryFee > 0 && league.status !== 'cancelled' && (
          <View style={styles.prizeSection}>
            <Text style={styles.sectionTitle}>{t('leagueDetail.prizeDistribution')}</Text>
            <Text style={styles.prizeHint}>
              {participantCount < 4
                ? t('leagueDetail.winnerTakesAll')
                : participantCount < 6
                ? t('leagueDetail.top2Split')
                : t('leagueDetail.top3Split')}
            </Text>
            <Text style={styles.feeNote}>{t('leagueDetail.platformFee')}</Text>
          </View>
        )}

        {/* Action Button */}
        {league.status === 'open' && (
          <View style={styles.actionSection}>
            {isParticipant ? (
              <TouchableOpacity style={styles.leaveBtn} onPress={handleLeave} disabled={actionLoading}>
                {actionLoading ? (
                  <ActivityIndicator size="small" color={colors.error} />
                ) : (
                  <Text style={styles.leaveBtnText}>{t('leagueDetail.leaveLeague')}</Text>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.joinBtn} onPress={handleJoin} disabled={actionLoading}>
                {actionLoading ? (
                  <ActivityIndicator size="small" color={colors.onPrimary} />
                ) : (
                  <Text style={styles.joinBtnText}>
                    {league.entryFee === 0 ? t('leagueDetail.joinFreeLeague') : t('leagueDetail.joinCoins', { fee: league.entryFee })}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Matches Section */}
        {isParticipant && league.status !== 'completed' && league.status !== 'cancelled' && (
          <View style={styles.matchesSection}>
            <Text style={styles.sectionTitle}>{t('leagueDetail.matches')}</Text>
            <View style={styles.matchTabs}>
              {(['upcoming', 'live', 'recent'] as const).map((tabKey) => {
                const count = matches.filter((g) =>
                  tabKey === 'live' ? g.isLive :
                  tabKey === 'upcoming' ? (!g.isLive && new Date(g.date) > new Date()) :
                  (!g.isLive && new Date(g.date) <= new Date()),
                ).length;
                return (
                  <TouchableOpacity
                    key={tabKey}
                    style={[styles.matchTab, activeMatchTab === tabKey && styles.matchTabActive]}
                    onPress={() => setActiveMatchTab(tabKey)}
                  >
                    <Text style={[styles.matchTabText, activeMatchTab === tabKey && styles.matchTabTextActive]}>
                      {tabKey === 'upcoming' ? t('leagueDetail.upcoming') : tabKey === 'live' ? t('leagueDetail.live') : t('leagueDetail.results')}
                      {count > 0 ? ` (${count})` : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {(() => {
              const filtered = matches.filter((g) =>
                activeMatchTab === 'live' ? g.isLive :
                activeMatchTab === 'upcoming' ? (!g.isLive && new Date(g.date) > new Date()) :
                (!g.isLive && new Date(g.date) <= new Date()),
              );

              if (filtered.length === 0) {
                return (
                  <Text style={styles.emptyMatches}>
                    {activeMatchTab === 'live'
                      ? t('leagueDetail.noLiveMatches')
                      : activeMatchTab === 'upcoming'
                      ? t('leagueDetail.noUpcomingMatches')
                      : t('leagueDetail.noResults')}
                  </Text>
                );
              }

              return filtered.slice(0, 15).map((game) => {
                const gameDate = new Date(game.date);
                const isPast = !game.isLive && gameDate <= new Date();
                const existingPred = predictions.get(game.apiId);
                const isPredicting = predictingGame === game.apiId;

                return (
                  <View key={game.apiId} style={styles.matchCard}>
                    {/* Live badge */}
                    {game.isLive && (
                      <View style={styles.liveBadge}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>LIVE</Text>
                      </View>
                    )}

                    {/* Teams row */}
                    <View style={styles.matchTeams}>
                      <View style={styles.matchTeam}>
                        {game.homeTeam?.logo ? (
                          <Image source={{ uri: game.homeTeam.logo }} style={styles.teamLogo} />
                        ) : (
                          <View style={styles.teamLogoPlaceholder} />
                        )}
                        <Text style={styles.teamName} numberOfLines={1}>{game.homeTeam?.name ?? 'Home'}</Text>
                      </View>
                      <View style={styles.matchScore}>
                        {isPast || game.isLive ? (
                          <Text style={styles.scoreText}>{game.homeTotal} - {game.awayTotal}</Text>
                        ) : (
                          <Text style={styles.matchTime}>
                            {gameDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            {'\n'}
                            {gameDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        )}
                      </View>
                      <View style={styles.matchTeam}>
                        {game.awayTeam?.logo ? (
                          <Image source={{ uri: game.awayTeam.logo }} style={styles.teamLogo} />
                        ) : (
                          <View style={styles.teamLogoPlaceholder} />
                        )}
                        <Text style={styles.teamName} numberOfLines={1}>{game.awayTeam?.name ?? 'Away'}</Text>
                      </View>
                    </View>

                    {/* Prediction area */}
                    {existingPred ? (
                      <View style={styles.predictionLocked}>
                        <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                        <Text style={styles.predictionLockedText}>
                          {existingPred.predictedOutcome === 'home'
                            ? game.homeTeam?.name ?? 'Home'
                            : existingPred.predictedOutcome === 'away'
                            ? game.awayTeam?.name ?? 'Away'
                            : 'Draw'}
                        </Text>
                        {existingPred.status !== 'pending' && (
                          <View style={[
                            styles.predResultBadge,
                            { backgroundColor: existingPred.status === 'won' ? 'rgba(76,175,80,0.15)' : 'rgba(244,67,54,0.15)' },
                          ]}>
                            <Text style={[
                              styles.predResultText,
                              { color: existingPred.status === 'won' ? '#4CAF50' : '#F44336' },
                            ]}>
                              {existingPred.status === 'won' ? `+${existingPred.pointsAwarded} pts` : 'Lost'}
                            </Text>
                          </View>
                        )}
                      </View>
                    ) : !isPast ? (
                      <View style={styles.predictionButtons}>
                        {isPredicting ? (
                          <ActivityIndicator size="small" color={colors.primary} style={{ paddingVertical: 8 }} />
                        ) : (
                          <>
                            <TouchableOpacity
                              style={styles.predBtn}
                              onPress={() => handleInlinePredict(game, 'home')}
                            >
                              <Text style={styles.predBtnText}>{game.homeTeam?.name?.split(' ').pop() ?? 'Home'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.predBtnDraw}
                              onPress={() => handleInlinePredict(game, 'draw')}
                            >
                              <Text style={styles.predBtnDrawText}>{t('leagueDetail.draw')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.predBtn}
                              onPress={() => handleInlinePredict(game, 'away')}
                            >
                              <Text style={styles.predBtnText}>{game.awayTeam?.name?.split(' ').pop() ?? 'Away'}</Text>
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    ) : null}

                    {/* Stats link */}
                    {!isPast && (
                      <TouchableOpacity
                        style={styles.statsLink}
                        onPress={() =>
                          (navigation as any).navigate('LeagueMatchPrediction', {
                            fixtureApiId: game.apiId,
                            sport: league.sport,
                          })
                        }
                      >
                        <Feather name="bar-chart-2" size={12} color={colors.onSurfaceDim} />
                        <Text style={styles.statsLinkText}>{t('leagueDetail.viewStatsH2H')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              });
            })()}
          </View>
        )}

        {/* Leaderboard */}
        <View style={styles.leaderboardSection}>
          <Text style={styles.sectionTitle}>
            {league.status === 'completed' ? t('leagueDetail.finalStandings') : t('leagueDetail.leaderboard')}
          </Text>
          {leaderboard.length === 0 ? (
            <Text style={styles.emptyLb}>
              {participantCount < 2
                ? t('leagueDetail.waitingPlayers')
                : t('leagueDetail.noPredictionsYet')}
            </Text>
          ) : (
            leaderboard.map((entry) => {
              const isCurrent = String(entry.userId) === user?.id;
              const medal =
                entry.position === 1 ? '🥇' :
                entry.position === 2 ? '🥈' :
                entry.position === 3 ? '🥉' : null;

              return (
                <View
                  key={entry.userId}
                  style={[
                    styles.lbRow,
                    isCurrent && styles.lbRowCurrent,
                  ]}
                >
                  <View style={styles.lbPosition}>
                    {medal ? (
                      <Text style={styles.lbMedal}>{medal}</Text>
                    ) : (
                      <Text style={styles.lbPosText}>{entry.position}</Text>
                    )}
                  </View>
                  <View style={styles.lbInfo}>
                    <Text style={[styles.lbName, isCurrent && styles.lbNameCurrent]} numberOfLines={1}>
                      {entry.displayName}{isCurrent ? ` ${t('leaderboard.you')}` : ''}
                    </Text>
                    <Text style={styles.lbStats}>
                      {entry.correctPredictions}/{entry.totalPredictions} {t('leagueDetail.correct')}
                    </Text>
                  </View>
                  <View style={styles.lbPoints}>
                    <Text style={[styles.lbPointsValue, isCurrent && styles.lbPointsCurrent]}>
                      {entry.totalPoints}
                    </Text>
                    <Text style={styles.lbPointsLabel}>{t('leaderboard.ptsUnit').toLowerCase()}</Text>
                  </View>
                  {entry.coinsWon > 0 && (
                    <View style={styles.lbCoins}>
                      <Text style={styles.lbCoinsValue}>+{entry.coinsWon}</Text>
                      <MaterialCommunityIcons name="circle-multiple" size={10} color={colors.primary} />
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['2xl'],
    paddingBottom: spacing.lg,
  },
  headerTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    color: colors.onSurface,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: spacing.md,
  },
  scroll: { flex: 1, paddingHorizontal: spacing['2xl'] },
  errorText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing['4xl'],
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing['2xl'],
    flexWrap: 'wrap',
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  sportLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  themedLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: colors.primary,
  },
  systemBadge: {
    backgroundColor: 'rgba(202,253,0,0.12)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  systemBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9,
    color: colors.primary,
    letterSpacing: 0.5,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing['2xl'],
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.lg,
  },
  statLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.onSurfaceDim,
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    color: colors.onSurface,
  },

  datesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.lg,
    marginBottom: spacing['2xl'],
  },
  dateItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  dateDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.outlineVariant,
    marginHorizontal: spacing.md,
  },
  dateLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.onSurfaceDim,
  },
  dateValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: colors.onSurface,
  },

  prizeSection: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.lg,
    marginBottom: spacing['2xl'],
  },
  sectionTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 15,
    color: colors.onSurface,
    marginBottom: spacing.md,
  },
  prizeHint: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  feeNote: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.onSurfaceDim,
    marginTop: spacing.xs,
  },

  actionSection: {
    marginBottom: spacing['2xl'],
  },
  joinBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  joinBtnText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 15,
    color: colors.onPrimary,
    letterSpacing: 0.5,
  },
  leaveBtn: {
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  leaveBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: colors.error,
  },

  leaderboardSection: {
    marginBottom: spacing['2xl'],
  },
  emptyLb: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.onSurfaceDim,
    textAlign: 'center',
    paddingVertical: spacing['2xl'],
  },

  lbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  lbRowCurrent: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(202,253,0,0.06)',
  },
  lbPosition: {
    width: 32,
    alignItems: 'center',
  },
  lbMedal: {
    fontSize: 18,
  },
  lbPosText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
    color: colors.onSurfaceDim,
  },
  lbInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  lbName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: colors.onSurface,
  },
  lbNameCurrent: {
    color: colors.primary,
  },
  lbStats: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.onSurfaceDim,
    marginTop: 1,
  },
  lbPoints: {
    alignItems: 'center',
    marginLeft: spacing.md,
  },
  lbPointsValue: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    color: colors.onSurface,
  },
  lbPointsCurrent: {
    color: colors.primary,
  },
  lbPointsLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: colors.onSurfaceDim,
  },
  lbCoins: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: spacing.md,
    backgroundColor: 'rgba(202,253,0,0.12)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  lbCoinsValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.primary,
  },

  // ─── Matches ──────────────────────────────────────────
  matchesSection: {
    marginBottom: spacing['2xl'],
  },
  matchTabs: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.sm,
    padding: 3,
    marginBottom: spacing.lg,
  },
  matchTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm - 2,
  },
  matchTabActive: {
    backgroundColor: colors.surfaceContainerHighest,
  },
  matchTabText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.onSurfaceDim,
  },
  matchTabTextActive: {
    color: colors.onSurface,
  },
  emptyMatches: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.onSurfaceDim,
    textAlign: 'center',
    paddingVertical: spacing['2xl'],
  },
  matchCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 4,
    marginBottom: spacing.sm,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.error,
  },
  liveText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: colors.error,
    letterSpacing: 0.5,
  },
  matchTeams: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  matchTeam: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  teamLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  teamLogoPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainerHigh,
  },
  teamName: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: colors.onSurface,
    textAlign: 'center',
    maxWidth: 90,
  },
  matchScore: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  scoreText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    color: colors.onSurface,
  },
  matchTime: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  // ─── Inline Prediction ─────────────────────────────────
  predictionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  predBtn: {
    flex: 1,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.outline,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  predBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: colors.onSurface,
  },
  predBtnDraw: {
    flex: 0.7,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.outline,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  predBtnDrawText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  predictionLocked: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  predictionLockedText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: colors.primary,
  },
  predResultBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    marginLeft: spacing.sm,
  },
  predResultText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },
  statsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: spacing.sm,
  },
  statsLinkText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.onSurfaceDim,
  },
});
