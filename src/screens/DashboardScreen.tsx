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
import { footballApi } from '../api';
import type { Fixture, DashboardData } from '../api';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'DashboardHome'>;
};

const LIVE_STATUSES = ['1H', '2H', 'HT', 'ET', 'P', 'BT', 'LIVE'];

function formatFixtureTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const fixtureDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (fixtureDay.getTime() === today.getTime()) return `Today ${time}`;
  if (fixtureDay.getTime() === tomorrow.getTime()) return `Tomorrow ${time}`;
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`;
}

function getStatusLabel(fixture: Fixture): string {
  if (LIVE_STATUSES.includes(fixture.status)) {
    return fixture.elapsed ? `LIVE ${fixture.elapsed}'` : 'LIVE';
  }
  if (fixture.status === 'FT' || fixture.status === 'AET' || fixture.status === 'PEN') {
    return 'FT';
  }
  if (fixture.status === 'HT') return 'HT';
  return formatFixtureTime(fixture.date);
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
      <Ionicons name="football" size={size * 0.5} color={colors.onSurfaceVariant} />
    </View>
  );
}

export function DashboardScreen({ navigation }: Props) {
  const { tokens } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    if (!tokens?.accessToken) return;
    try {
      const result = await footballApi.getDashboard(tokens.accessToken);
      setData(result);
    } catch (err) {
      console.log('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tokens?.accessToken]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboard();
  }, [fetchDashboard]);

  const filteredUpcoming = data?.upcomingMatches ?? [];
  const filteredToday = data?.todayMatches ?? [];
  const filteredRecent = data?.recentMatches ?? [];

  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader />

      {/* League Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsContent}
      >
        <TouchableOpacity style={[styles.tab, styles.tabActive]} disabled>
          <Text style={[styles.tabLabel, styles.tabLabelActive]}>All</Text>
        </TouchableOpacity>
        {(data?.featuredLeagues ?? []).map((league) => (
          <TouchableOpacity
            key={league.apiId}
            style={styles.tab}
            onPress={() =>
              navigation.navigate('LeagueDetail', {
                leagueApiId: league.apiId,
                leagueName: league.name,
              })
            }
          >
            <View style={styles.tabInner}>
              {league.logo ? (
                <Image
                  source={{ uri: league.logo }}
                  style={styles.tabLeagueLogo}
                  resizeMode="contain"
                />
              ) : null}
              <Text style={styles.tabLabel} numberOfLines={1}>
                {league.name}
              </Text>
              <Ionicons name="chevron-forward" size={12} color={colors.onSurfaceDim} />
            </View>
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
        {(data?.liveMatches ?? []).length > 0 && (
          <View style={styles.sectionWrap}>
            <View style={styles.liveHeaderRow}>
              <View style={styles.liveDot} />
              <Text style={styles.liveSectionTitle}>LIVE ACTION</Text>
            </View>
            {data!.liveMatches.map((fixture) => (
              <TouchableOpacity
                key={fixture.apiId}
                style={styles.liveCard}
                onPress={() => navigation.navigate('MatchPrediction', { fixtureApiId: fixture.apiId })}
                activeOpacity={0.7}
              >
                <View style={styles.liveAccent} />
                <View style={styles.liveBody}>
                  <View style={styles.liveBadgeRow}>
                    <View style={styles.liveBadge}>
                      <Text style={styles.liveBadgeText}>{getStatusLabel(fixture)}</Text>
                    </View>
                    <Text style={styles.liveLeagueText}>{fixture.leagueName}</Text>
                  </View>
                  <View style={styles.liveScoresBlock}>
                    <View style={styles.liveTeamRow}>
                      <View style={styles.liveTeamLeft}>
                        <TeamLogo uri={fixture.homeTeam.logo} size={24} />
                        <Text style={styles.liveTeamName}>{fixture.homeTeam.name}</Text>
                      </View>
                      <Text style={styles.liveScoreValue}>{fixture.homeGoals}</Text>
                    </View>
                    <View style={styles.liveTeamRow}>
                      <View style={styles.liveTeamLeft}>
                        <TeamLogo uri={fixture.awayTeam.logo} size={24} />
                        <Text style={styles.liveTeamName}>{fixture.awayTeam.name}</Text>
                      </View>
                      <Text style={styles.liveScoreValue}>{fixture.awayGoals}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Today's Matches */}
        {filteredToday.length > 0 && (
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionHeading}>TODAY'S MATCHES</Text>
            {filteredToday.map((fixture) => (
              <TouchableOpacity
                key={fixture.apiId}
                style={styles.todayCard}
                onPress={() => navigation.navigate('MatchPrediction', { fixtureApiId: fixture.apiId })}
                activeOpacity={0.7}
              >
                <View style={styles.todayLeagueRow}>
                  {fixture.leagueLogo ? (
                    <Image
                      source={{ uri: fixture.leagueLogo }}
                      style={styles.todayLeagueLogo}
                      resizeMode="contain"
                    />
                  ) : null}
                  <Text style={styles.todayLeagueName}>{fixture.leagueName}</Text>
                  <Text style={styles.todayRound}>{fixture.leagueRound}</Text>
                </View>
                <View style={styles.todayMatchRow}>
                  <View style={styles.todayTeamCol}>
                    <TeamLogo uri={fixture.homeTeam.logo} size={36} />
                    <Text style={styles.todayTeamName} numberOfLines={1}>
                      {fixture.homeTeam.name}
                    </Text>
                  </View>
                  <View style={styles.todayScoreCol}>
                    {fixture.status === 'NS' || fixture.status === 'TBD' ? (
                      <Text style={styles.todayTimeText}>
                        {new Date(fixture.date).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    ) : (
                      <View style={styles.todayScoreRow}>
                        <Text style={styles.todayScore}>{fixture.homeGoals}</Text>
                        <Text style={styles.todayScoreDivider}>-</Text>
                        <Text style={styles.todayScore}>{fixture.awayGoals}</Text>
                      </View>
                    )}
                    <View
                      style={[
                        styles.todayStatusBadge,
                        LIVE_STATUSES.includes(fixture.status) && styles.todayStatusLive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.todayStatusText,
                          LIVE_STATUSES.includes(fixture.status) && styles.todayStatusTextLive,
                        ]}
                      >
                        {getStatusLabel(fixture)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.todayTeamCol}>
                    <TeamLogo uri={fixture.awayTeam.logo} size={36} />
                    <Text style={styles.todayTeamName} numberOfLines={1}>
                      {fixture.awayTeam.name}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Recent Results */}
        {filteredRecent.length > 0 && (
          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="clock-check-outline" size={18} color={colors.primary} />
              <Text style={styles.sectionHeadingRow}>RECENT RESULTS</Text>
            </View>
            {filteredRecent.slice(0, 15).map((fixture) => (
              <TouchableOpacity
                key={fixture.apiId}
                style={styles.todayCard}
                onPress={() => navigation.navigate('MatchPrediction', { fixtureApiId: fixture.apiId })}
                activeOpacity={0.7}
              >
                <View style={styles.todayLeagueRow}>
                  {fixture.leagueLogo ? (
                    <Image
                      source={{ uri: fixture.leagueLogo }}
                      style={styles.todayLeagueLogo}
                      resizeMode="contain"
                    />
                  ) : null}
                  <Text style={styles.todayLeagueName}>{fixture.leagueName}</Text>
                  <Text style={styles.recentDateText}>{formatFixtureTime(fixture.date)}</Text>
                </View>
                <View style={styles.todayMatchRow}>
                  <View style={styles.todayTeamCol}>
                    <TeamLogo uri={fixture.homeTeam.logo} size={28} />
                    <Text style={styles.todayTeamName} numberOfLines={1}>
                      {fixture.homeTeam.name}
                    </Text>
                  </View>
                  <View style={styles.todayScoreCol}>
                    <Text style={styles.todayScoreText}>
                      {fixture.homeGoals ?? '-'}
                    </Text>
                    <Text style={styles.todayScoreDivider}>-</Text>
                    <Text style={styles.todayScoreText}>
                      {fixture.awayGoals ?? '-'}
                    </Text>
                  </View>
                  <View style={styles.todayTeamCol}>
                    <TeamLogo uri={fixture.awayTeam.logo} size={28} />
                    <Text style={styles.todayTeamName} numberOfLines={1}>
                      {fixture.awayTeam.name}
                    </Text>
                  </View>
                </View>
                <View style={styles.recentStatusRow}>
                  <Text style={styles.recentStatusText}>FT</Text>
                  {fixture.leagueRound ? (
                    <Text style={styles.recentRoundText}>{fixture.leagueRound}</Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Upcoming Thrillers */}
        {filteredUpcoming.length > 0 && (
          <View style={styles.sectionWrap}>
            <Text style={styles.thrillersHeading}>UPCOMING MATCHES</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.gameCardsRow}
            >
              {filteredUpcoming.map((fixture) => (
                <TouchableOpacity
                  key={fixture.apiId}
                  style={styles.gameCard}
                  onPress={() =>
                    navigation.navigate('MatchPrediction', { fixtureApiId: fixture.apiId })
                  }
                  activeOpacity={0.7}
                >
                  <View style={styles.gameCardTop}>
                    <Text style={styles.gameCardLeague}>
                      {fixture.leagueName} {'\u2022'} {formatFixtureTime(fixture.date)}
                    </Text>
                  </View>
                  <View style={styles.gameTeamsRow}>
                    <View style={styles.gameTeamCol}>
                      <TeamLogo uri={fixture.homeTeam.logo} size={40} />
                      <Text style={styles.gameTeamName} numberOfLines={2}>
                        {fixture.homeTeam.name}
                      </Text>
                    </View>
                    <Text style={styles.gameVsLabel}>VS</Text>
                    <View style={styles.gameTeamCol}>
                      <TeamLogo uri={fixture.awayTeam.logo} size={40} />
                      <Text style={styles.gameTeamName} numberOfLines={2}>
                        {fixture.awayTeam.name}
                      </Text>
                    </View>
                  </View>
                  {fixture.leagueRound ? (
                    <Text style={styles.gameRound}>{fixture.leagueRound}</Text>
                  ) : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Featured Leagues */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="trophy" size={20} color={colors.primary} />
            <Text style={styles.sectionHeadingRow}>FEATURED LEAGUES</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.leaguesRow}
          >
            {(data?.featuredLeagues ?? []).map((league) => (
              <TouchableOpacity
                key={league.apiId}
                style={styles.leagueCard}
                onPress={() =>
                  navigation.navigate('LeagueDetail', {
                    leagueApiId: league.apiId,
                    leagueName: league.name,
                  })
                }
                activeOpacity={0.7}
              >
                {league.logo ? (
                  <Image
                    source={{ uri: league.logo }}
                    style={styles.leagueCardLogo}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.leagueCardFallback}>
                    <Ionicons name="football" size={24} color={colors.onSurfaceVariant} />
                  </View>
                )}
                <Text style={styles.leagueCardName} numberOfLines={2}>
                  {league.name}
                </Text>
                {league.countryFlag ? (
                  <Text style={styles.leagueCardCountry}>{league.countryName}</Text>
                ) : null}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Challenge of the Day (kept static - product feature) */}
        <View style={styles.challengeCard}>
          <View style={styles.challengeGlow} />
          <View style={styles.challengeTitleRow}>
            <Ionicons name="trophy" size={16} color={colors.primary} />
            <Text style={styles.challengeHeading}>CHALLENGE OF THE DAY</Text>
          </View>
          <View style={styles.challengeContent}>
            <Text style={styles.challengeBoostTag}>DOUBLE BOOST</Text>
            <Text style={styles.challengeName}>European Giants{'\n'}Challenge</Text>
            <View style={styles.challengeChecklist}>
              {['Real Madrid win prediction', 'Bayern Munich Over 1.5 Goals', 'Inter Milan Clean Sheet'].map(
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
        {!data?.liveMatches?.length &&
          !filteredToday.length &&
          !filteredUpcoming.length &&
          !filteredRecent.length && (
            <View style={styles.emptyState}>
              <Ionicons name="football-outline" size={48} color={colors.onSurfaceVariant} />
              <Text style={styles.emptyTitle}>No matches found</Text>
              <Text style={styles.emptySubtitle}>
                Pull down to refresh or check back later
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

  // Tabs
  tabsScroll: { maxHeight: 40, marginBottom: 8 },
  tabsContent: { paddingHorizontal: 24, gap: 8, alignItems: 'center' },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerHighest,
  },
  tabActive: { backgroundColor: colors.primary },
  tabInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tabLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    lineHeight: 16,
    color: colors.onSurface,
    maxWidth: 100,
  },
  tabLabelActive: { color: '#4A5E00' },
  tabLeagueLogo: { width: 16, height: 16 },

  scrollView: { flex: 1 },
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
  sectionHeading: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    lineHeight: 28,
    color: colors.onSurface,
    letterSpacing: -0.45,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
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

  // Today's Matches
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
  todayRound: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    lineHeight: 15,
    color: colors.onSurfaceDim,
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
  recentRoundText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.onSurfaceDim,
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
  todayScoreCol: { alignItems: 'center', gap: 4, paddingHorizontal: 16 },
  todayScoreRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  todayScore: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 24,
    lineHeight: 32,
    color: colors.onSurface,
  },
  todayScoreDivider: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    lineHeight: 24,
    color: colors.onSurfaceVariant,
  },
  todayTimeText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    lineHeight: 24,
    color: colors.primary,
  },
  todayStatusBadge: {
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  todayStatusLive: { backgroundColor: 'rgba(255,116,57,0.15)' },
  todayStatusText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    lineHeight: 15,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  todayStatusTextLive: { color: colors.tertiaryLight },

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
  gameRound: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    lineHeight: 15,
    color: colors.onSurfaceDim,
    textAlign: 'center',
  },

  // Featured Leagues
  leaguesRow: { gap: 12, paddingRight: 16 },
  leagueCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    width: 110,
  },
  leagueCardLogo: { width: 48, height: 48 },
  leagueCardFallback: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leagueCardName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    lineHeight: 15,
    color: colors.onSurface,
    textAlign: 'center',
  },
  leagueCardCountry: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    lineHeight: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
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
