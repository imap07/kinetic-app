import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing } from '../theme';
import { HomeStackParamList } from '../navigation/types';
import { AppHeader } from '../components/AppHeader';
import { ProUpgradeBanner } from '../components';
import { useAuth } from '../contexts/AuthContext';
import { sportsApi, SPORT_TABS } from '../api/sports';
import type { SportKey, SportDashboard, SportGame } from '../api/sports';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'DashboardHome'>;
};

const LIVE_STATUSES = ['1H', '2H', 'HT', 'ET', 'P', 'BT', 'LIVE', 'Q1', 'Q2', 'Q3', 'Q4', 'OT', 'P1', 'P2', 'P3', 'IN1', 'IN2', 'IN3', 'IN4', 'IN5', 'IN6', 'IN7', 'IN8', 'IN9'];

function formatGameTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const gameDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (gameDay.getTime() === today.getTime()) return `Today ${time}`;
  if (gameDay.getTime() === tomorrow.getTime()) return `Tomorrow ${time}`;
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`;
}

function getGameStatusLabel(game: SportGame): string {
  if (LIVE_STATUSES.includes(game.status)) {
    return game.timer ? `LIVE ${game.timer}'` : 'LIVE';
  }
  if (['FT', 'AET', 'PEN', 'AOT', 'AP', 'POST', 'Completed'].includes(game.status)) {
    return 'FT';
  }
  if (game.status === 'HT') return 'HT';
  return formatGameTime(game.date);
}

function TeamLogo({ uri, size = 32 }: { uri?: string; size?: number }) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 4 }}
        resizeMode="contain"
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 4,
        backgroundColor: colors.surfaceContainerHighest,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name="trophy-outline" size={size * 0.5} color={colors.onSurfaceVariant} />
    </View>
  );
}

export function DashboardScreen({ navigation }: Props) {
  const { tokens } = useAuth();
  const [activeSport, setActiveSport] = useState<SportKey>('football');
  const [data, setData] = useState<SportDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    if (!tokens?.accessToken) return;
    try {
      const result = await sportsApi.getDashboard(tokens.accessToken, activeSport);
      setData(result);
    } catch (err) {
      console.log('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tokens?.accessToken, activeSport]);

  useEffect(() => {
    setLoading(true);
    fetchDashboard();
  }, [fetchDashboard]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboard();
  }, [fetchDashboard]);

  const handleSportChange = useCallback((sport: SportKey) => {
    if (sport === activeSport) return;
    setActiveSport(sport);
    setData(null);
  }, [activeSport]);

  const liveGames = data?.liveGames ?? [];
  const recentGames = data?.recentGames ?? [];
  const upcomingGames = data?.upcomingGames ?? [];
  const featuredLeagues = data?.featuredLeagues ?? [];

  const isF1 = activeSport === 'formula-1';

  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.sportTabsScroll}
          contentContainerStyle={styles.sportTabsContent}
        >
          {SPORT_TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.sportTab, activeSport === tab.key && styles.sportTabActive]}
              onPress={() => handleSportChange(tab.key)}
            >
              <Text style={[styles.sportTabLabel, activeSport === tab.key && styles.sportTabLabelActive]}>
                {tab.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader />

      {/* Sport Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.sportTabsScroll}
        contentContainerStyle={styles.sportTabsContent}
      >
        {SPORT_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.sportTab, activeSport === tab.key && styles.sportTabActive]}
            onPress={() => handleSportChange(tab.key)}
          >
            <Text style={[styles.sportTabLabel, activeSport === tab.key && styles.sportTabLabelActive]}>
              {tab.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Main Content */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Leagues */}
        {featuredLeagues.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.leagueCardsScroll}
          >
            {featuredLeagues.map((league) => (
              <TouchableOpacity
                key={league.apiId}
                style={styles.leagueNavCard}
                onPress={() =>
                  navigation.navigate('LeagueDetail', {
                    leagueApiId: league.apiId,
                    leagueName: league.name,
                    sport: activeSport,
                  })
                }
                activeOpacity={0.7}
              >
                {league.logo ? (
                  <Image
                    source={{ uri: league.logo }}
                    style={styles.leagueNavLogo}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.leagueNavFallback}>
                    <Ionicons name="trophy-outline" size={20} color={colors.onSurfaceVariant} />
                  </View>
                )}
                <View style={styles.leagueNavInfo}>
                  <Text style={styles.leagueNavName} numberOfLines={1}>{league.name}</Text>
                  {league.countryName ? (
                    <Text style={styles.leagueNavCountry} numberOfLines={1}>{league.countryName}</Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={14} color={colors.onSurfaceDim} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Top Predictor Card */}
        <View style={styles.predictorCard}>
          <View style={styles.predictorGlow} />
          <View>
            <Text style={styles.predictorTitle}>Top Predictor</Text>
            <Text style={styles.predictorSubtitle}>
              Pro Tier Member {'\u2022'}{' '}
              <Text style={styles.predictorPts}>1,250 PTS</Text>
            </Text>
          </View>
          <View style={styles.goalBlock}>
            <View style={styles.goalLabelRow}>
              <Text style={styles.goalLabel}>DAILY GOAL: 3 CORRECT PICKS</Text>
              <Text style={styles.goalRatio}>2/3</Text>
            </View>
            <View style={styles.progressTrack}>
              <LinearGradient
                colors={[colors.primaryContainer, colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.progressFill, { width: '66%' }]}
              />
            </View>
          </View>
          <TouchableOpacity style={styles.viewQuestsBtn}>
            <Text style={styles.viewQuestsLabel}>VIEW QUESTS</Text>
          </TouchableOpacity>
        </View>

        <ProUpgradeBanner />

        {/* Live Action */}
        {liveGames.length > 0 && (
          <View style={styles.sectionWrap}>
            <View style={styles.liveHeaderRow}>
              <View style={styles.liveDot} />
              <Text style={styles.liveSectionTitle}>LIVE ACTION</Text>
            </View>
            {liveGames.map((game) => (
              <TouchableOpacity
                key={game.apiId || game._id}
                style={styles.liveCard}
                onPress={() => navigation.navigate('MatchPrediction', { fixtureApiId: game.apiId, sport: activeSport })}
                activeOpacity={0.7}
              >
                <View style={styles.liveAccent} />
                <View style={styles.liveBody}>
                  <View style={styles.liveBadgeRow}>
                    <View style={styles.liveBadge}>
                      <Text style={styles.liveBadgeText}>{getGameStatusLabel(game)}</Text>
                    </View>
                    <Text style={styles.liveLeagueText}>{game.leagueName}</Text>
                  </View>
                  <View style={styles.liveScoresBlock}>
                    <View style={styles.liveTeamRow}>
                      <View style={styles.liveTeamLeft}>
                        <TeamLogo uri={game.homeTeam?.logo} size={24} />
                        <Text style={styles.liveTeamName}>{game.homeTeam?.name}</Text>
                      </View>
                      <Text style={styles.liveScoreValue}>{game.homeTotal ?? '-'}</Text>
                    </View>
                    <View style={styles.liveTeamRow}>
                      <View style={styles.liveTeamLeft}>
                        <TeamLogo uri={game.awayTeam?.logo} size={24} />
                        <Text style={styles.liveTeamName}>{game.awayTeam?.name}</Text>
                      </View>
                      <Text style={styles.liveScoreValue}>{game.awayTotal ?? '-'}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Recent Results */}
        {recentGames.length > 0 && (
          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="clock-check-outline" size={18} color={colors.primary} />
              <Text style={styles.sectionHeadingRow}>
                {isF1 ? 'RECENT RACES' : 'RECENT RESULTS'}
              </Text>
            </View>
            {recentGames.slice(0, 15).map((game) => (
              <TouchableOpacity
                key={game.apiId || game._id}
                style={styles.todayCard}
                onPress={() => navigation.navigate('MatchPrediction', { fixtureApiId: game.apiId, sport: activeSport })}
                activeOpacity={0.7}
              >
                {isF1 ? (
                  <View style={styles.f1RaceRow}>
                    <View style={styles.f1RaceInfo}>
                      <Text style={styles.f1RaceName}>{game.competitionName || game.leagueName}</Text>
                      <Text style={styles.f1CircuitName}>
                        {game.circuit?.name ?? ''} {game.circuit?.country ? `- ${game.circuit.country}` : ''}
                      </Text>
                      <Text style={styles.recentDateText}>{formatGameTime(game.date)}</Text>
                    </View>
                    <View style={styles.f1StatusBadge}>
                      <Text style={styles.f1StatusText}>{game.status}</Text>
                    </View>
                  </View>
                ) : (
                  <>
                    <View style={styles.todayLeagueRow}>
                      {game.leagueLogo ? (
                        <Image
                          source={{ uri: game.leagueLogo }}
                          style={styles.todayLeagueLogo}
                          resizeMode="contain"
                        />
                      ) : null}
                      <Text style={styles.todayLeagueName}>{game.leagueName}</Text>
                      <Text style={styles.recentDateText}>{formatGameTime(game.date)}</Text>
                    </View>
                    <View style={styles.todayMatchRow}>
                      <View style={styles.todayTeamCol}>
                        <TeamLogo uri={game.homeTeam?.logo} size={28} />
                        <Text style={styles.todayTeamName} numberOfLines={1}>
                          {game.homeTeam?.name}
                        </Text>
                      </View>
                      <View style={styles.todayScoreCol}>
                        <Text style={styles.todayScoreText}>
                          {game.homeTotal ?? '-'}
                        </Text>
                        <Text style={styles.todayScoreDivider}>-</Text>
                        <Text style={styles.todayScoreText}>
                          {game.awayTotal ?? '-'}
                        </Text>
                      </View>
                      <View style={styles.todayTeamCol}>
                        <TeamLogo uri={game.awayTeam?.logo} size={28} />
                        <Text style={styles.todayTeamName} numberOfLines={1}>
                          {game.awayTeam?.name}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.recentStatusRow}>
                      <Text style={styles.recentStatusText}>FT</Text>
                    </View>
                  </>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Upcoming */}
        {upcomingGames.length > 0 && (
          <View style={styles.sectionWrap}>
            <Text style={styles.thrillersHeading}>
              {isF1 ? 'UPCOMING RACES' : 'UPCOMING MATCHES'}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.gameCardsRow}
            >
              {upcomingGames.map((game) => (
                <TouchableOpacity
                  key={game.apiId || game._id}
                  style={styles.gameCard}
                  onPress={() =>
                    navigation.navigate('MatchPrediction', { fixtureApiId: game.apiId, sport: activeSport })
                  }
                  activeOpacity={0.7}
                >
                  {isF1 ? (
                    <View style={styles.f1UpcomingCard}>
                      <Text style={styles.gameCardLeague}>
                        {game.competitionName || game.leagueName}
                      </Text>
                      <Text style={styles.f1CircuitName}>
                        {game.circuit?.name ?? ''}
                      </Text>
                      <Text style={styles.f1CircuitLocation}>
                        {game.circuit?.city ?? ''}{game.circuit?.country ? `, ${game.circuit.country}` : ''}
                      </Text>
                      <Text style={styles.f1DateTime}>{formatGameTime(game.date)}</Text>
                    </View>
                  ) : (
                    <>
                      <View style={styles.gameCardTop}>
                        <Text style={styles.gameCardLeague}>
                          {game.leagueName} {'\u2022'} {formatGameTime(game.date)}
                        </Text>
                      </View>
                      <View style={styles.gameTeamsRow}>
                        <View style={styles.gameTeamCol}>
                          <TeamLogo uri={game.homeTeam?.logo} size={40} />
                          <Text style={styles.gameTeamName} numberOfLines={2}>
                            {game.homeTeam?.name}
                          </Text>
                        </View>
                        <Text style={styles.gameVsLabel}>VS</Text>
                        <View style={styles.gameTeamCol}>
                          <TeamLogo uri={game.awayTeam?.logo} size={40} />
                          <Text style={styles.gameTeamName} numberOfLines={2}>
                            {game.awayTeam?.name}
                          </Text>
                        </View>
                      </View>
                    </>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* (League navigation is now at the top of the scroll view) */}

        {/* Challenge of the Day */}
        <View style={styles.challengeCard}>
          <View style={styles.challengeGlow} />
          <View style={styles.challengeTitleRow}>
            <Ionicons name="trophy" size={16} color={colors.primary} />
            <Text style={styles.challengeHeading}>CHALLENGE OF THE DAY</Text>
          </View>
          <View style={styles.challengeContent}>
            <Text style={styles.challengeBoostTag}>DOUBLE BOOST</Text>
            <Text style={styles.challengeName}>Multi-Sport{'\n'}Challenge</Text>
            <View style={styles.challengeChecklist}>
              {['Pick 3 correct outcomes', 'Cover at least 2 sports', 'Earn bonus rewards'].map(
                (item, idx) => (
                  <View key={idx} style={styles.challengeCheckRow}>
                    <Ionicons name="checkmark-circle-outline" size={15} color={colors.primary} />
                    <Text style={styles.challengeCheckText}>{item}</Text>
                  </View>
                ),
              )}
            </View>
          </View>
          <TouchableOpacity activeOpacity={0.8} style={styles.submitWrap}>
            <LinearGradient
              colors={[colors.primaryContainer, colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.submitBtn}
            >
              <Text style={styles.submitBtnText}>SUBMIT PICKS</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Empty State */}
        {!liveGames.length && !recentGames.length && !upcomingGames.length && (
          <View style={styles.emptyState}>
            <Ionicons name="trophy-outline" size={48} color={colors.onSurfaceVariant} />
            <Text style={styles.emptyTitle}>No games available</Text>
            <Text style={styles.emptySubtitle}>
              {featuredLeagues.length > 0
                ? `Tap the ${featuredLeagues.length === 1 ? 'league above' : 'leagues'} to see standings and details`
                : 'Pull down to refresh or check back later'}
            </Text>
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity activeOpacity={0.85} style={[styles.fabWrap, { bottom: 16 }]}>
        <LinearGradient
          colors={[colors.primaryContainer, colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fab}
        >
          <Ionicons name="add" size={24} color="#4A5E00" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Sport Tabs
  sportTabsScroll: { maxHeight: 44, marginBottom: 4 },
  sportTabsContent: { paddingHorizontal: 16, gap: 6, alignItems: 'center' },
  sportTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerHighest,
  },
  sportTabActive: { backgroundColor: colors.primary },
  sportTabLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurface,
  },
  sportTabLabelActive: { color: '#4A5E00' },


  scrollView: { flex: 1 },

  leagueCardsScroll: { paddingHorizontal: 16, gap: 10, paddingVertical: 12 },
  leagueNavCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: 180,
  },
  leagueNavLogo: { width: 32, height: 32 },
  leagueNavFallback: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leagueNavInfo: { flex: 1, gap: 1 },
  leagueNavName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurface,
  },
  leagueNavCountry: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    lineHeight: 14,
    color: colors.onSurfaceVariant,
  },
  sectionWrap: { paddingHorizontal: 16, marginBottom: 24 },

  // Predictor Card
  predictorCard: {
    marginHorizontal: 16,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 8,
    padding: 20,
    marginTop: 16,
    marginBottom: 24,
    overflow: 'hidden',
    gap: 12,
  },
  predictorGlow: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(202,253,0,0.04)',
  },
  predictorTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 20,
    lineHeight: 28,
    color: colors.primaryContainer,
    letterSpacing: -0.5,
  },
  predictorSubtitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
  },
  predictorPts: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    lineHeight: 20,
    color: colors.primary,
  },
  goalBlock: { gap: 8 },
  goalLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  goalLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    lineHeight: 15,
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  goalRatio: { fontFamily: 'Inter_700Bold', fontSize: 10, lineHeight: 15, color: colors.primaryContainer },
  progressTrack: {
    height: 6,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 12,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 12 },
  viewQuestsBtn: {
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(69,72,76,0.1)',
    paddingVertical: 9,
    alignItems: 'center',
  },
  viewQuestsLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    lineHeight: 16,
    color: colors.onSurface,
    textAlign: 'center',
  },

  // Section Headers
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  sectionHeadingRow: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    lineHeight: 28,
    color: colors.onSurface,
    letterSpacing: -0.45,
    textTransform: 'uppercase',
  },

  // Live Action
  liveHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  liveDot: { width: 8, height: 8, borderRadius: 12, backgroundColor: colors.tertiaryLight },
  liveSectionTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    lineHeight: 28,
    color: colors.onSurface,
    letterSpacing: -0.45,
    textTransform: 'uppercase',
  },
  liveCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  liveAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.tertiaryLight,
  },
  liveBody: { flex: 1, gap: 12 },
  liveBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  liveBadge: {
    backgroundColor: 'rgba(255,116,57,0.1)',
    borderRadius: 2,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  liveBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    lineHeight: 15,
    color: colors.tertiaryLight,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  liveLeagueText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    lineHeight: 15,
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  liveScoresBlock: { gap: 8 },
  liveTeamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 16,
  },
  liveTeamLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  liveTeamName: { fontFamily: 'Inter_700Bold', fontSize: 14, lineHeight: 20, color: colors.onSurface },
  liveScoreValue: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 20,
    lineHeight: 28,
    color: colors.onSurface,
  },

  // Game Cards (today/recent)
  todayCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  todayLeagueRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  todayLeagueLogo: { width: 16, height: 16 },
  todayLeagueName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    lineHeight: 15,
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
    textTransform: 'uppercase',
    flex: 1,
  },
  recentDateText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    lineHeight: 15,
    color: colors.onSurfaceDim,
    marginLeft: 'auto',
  },
  recentStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  recentStatusText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: colors.primary,
    letterSpacing: 1,
  },
  todayMatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  todayTeamCol: { flex: 1, alignItems: 'center', gap: 6 },
  todayTeamName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    lineHeight: 16,
    color: colors.onSurface,
    textAlign: 'center',
  },
  todayScoreCol: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 16 },
  todayScoreText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 20,
    lineHeight: 28,
    color: colors.onSurface,
  },
  todayScoreDivider: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    lineHeight: 24,
    color: colors.onSurfaceVariant,
  },

  // F1 specific
  f1RaceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  f1RaceInfo: { flex: 1, gap: 4 },
  f1RaceName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurface,
  },
  f1CircuitName: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    lineHeight: 16,
    color: colors.onSurfaceVariant,
  },
  f1CircuitLocation: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    lineHeight: 16,
    color: colors.onSurfaceDim,
  },
  f1DateTime: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    lineHeight: 16,
    color: colors.primary,
    marginTop: 4,
  },
  f1StatusBadge: {
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  f1StatusText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  f1UpcomingCard: { gap: 6 },

  // Upcoming
  thrillersHeading: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 24,
    lineHeight: 32,
    color: colors.onSurface,
    letterSpacing: -0.6,
    textTransform: 'uppercase',
    marginBottom: 16,
    paddingTop: 8,
  },
  gameCardsRow: { gap: 16 },
  gameCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 8,
    padding: 24,
    minWidth: 280,
    gap: 20,
  },
  gameCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  gameCardLeague: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    lineHeight: 15,
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
    textTransform: 'uppercase',
    flex: 1,
  },
  gameTeamsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gameTeamCol: { flex: 1, alignItems: 'center', gap: 8 },
  gameTeamName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurface,
    textAlign: 'center',
  },
  gameVsLabel: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    lineHeight: 24,
    color: colors.onSurfaceVariant,
  },


  // Challenge
  challengeCard: {
    marginHorizontal: 16,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(243,255,202,0.1)',
    padding: 25,
    marginBottom: 24,
    overflow: 'hidden',
  },
  challengeGlow: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(243,255,202,0.03)',
  },
  challengeTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 },
  challengeHeading: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    lineHeight: 28,
    color: colors.onSurface,
    letterSpacing: -0.45,
    textTransform: 'uppercase',
  },
  challengeContent: { marginBottom: 32 },
  challengeBoostTag: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    lineHeight: 15,
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  challengeName: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 24,
    lineHeight: 30,
    color: colors.primaryContainer,
    marginBottom: 12,
  },
  challengeChecklist: { gap: 12 },
  challengeCheckRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  challengeCheckText: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 20, color: colors.onSurface },
  submitWrap: {
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: 'rgba(202,253,0,1)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  submitBtn: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  submitBtnText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    lineHeight: 28,
    color: '#4A5E00',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    textAlign: 'center',
  },

  // Empty State
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    lineHeight: 28,
    color: colors.onSurface,
  },
  emptySubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },

  // FAB
  fabWrap: {
    position: 'absolute',
    right: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 10,
  },
  fab: { width: 56, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
