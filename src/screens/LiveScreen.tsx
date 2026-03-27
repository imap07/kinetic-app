import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme';
import { AppHeader } from '../components/AppHeader';
import { useAuth } from '../contexts/AuthContext';
import { footballApi } from '../api';
import type { Fixture, DashboardData } from '../api';
import type { LiveStackParamList } from '../navigation/types';

const LIVE_STATUSES = ['1H', '2H', 'HT', 'ET', 'P', 'BT', 'LIVE'];
const FINISHED_STATUSES = ['FT', 'AET', 'PEN'];
const REFRESH_INTERVAL = 30_000;

function getStatusLabel(fixture: Fixture): string {
  if (LIVE_STATUSES.includes(fixture.status)) {
    return fixture.elapsed ? `${fixture.elapsed}'` : 'LIVE';
  }
  if (FINISHED_STATUSES.includes(fixture.status)) return fixture.status;
  if (fixture.status === 'NS') {
    return new Date(fixture.date).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return fixture.statusLong || fixture.status;
}

function isLive(fixture: Fixture): boolean {
  return fixture.isLive || LIVE_STATUSES.includes(fixture.status);
}

function TeamLogo({ uri, size = 40 }: { uri?: string; size?: number }) {
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

export function LiveScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<LiveStackParamList>>();
  const { tokens } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    if (!tokens?.accessToken) return;
    try {
      const result = await footballApi.getDashboard(tokens.accessToken);
      setData(result);
    } catch (err) {
      console.log('Live fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tokens?.accessToken]);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, REFRESH_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const liveMatches = data?.liveMatches ?? [];
  const todayMatches = (data?.todayMatches ?? []).filter(
    (f) => !isLive(f),
  );
  const recentMatches = data?.recentMatches ?? [];

  const navigateToFixture = (fixtureApiId: number) => {
    navigation.navigate('LiveMatchPrediction', { fixtureApiId });
  };

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
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Live Matches */}
        {liveMatches.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.liveDot} />
              <Text style={styles.sectionTitle}>LIVE NOW</Text>
              <Text style={styles.matchCount}>{liveMatches.length}</Text>
            </View>
            {liveMatches.map((fixture) => (
              <TouchableOpacity
                key={fixture.apiId}
                style={styles.matchCard}
                onPress={() => navigateToFixture(fixture.apiId)}
                activeOpacity={0.7}
              >
                <View style={styles.liveAccent} />
                <View style={styles.matchLeagueRow}>
                  {fixture.leagueLogo ? (
                    <Image
                      source={{ uri: fixture.leagueLogo }}
                      style={styles.matchLeagueLogo}
                      resizeMode="contain"
                    />
                  ) : null}
                  <Text style={styles.matchLeagueName}>{fixture.leagueName}</Text>
                  <View style={styles.liveBadge}>
                    <Text style={styles.liveBadgeText}>{getStatusLabel(fixture)}</Text>
                  </View>
                </View>
                <View style={styles.matchTeamsRow}>
                  <View style={styles.matchTeamCol}>
                    <TeamLogo uri={fixture.homeTeam.logo} size={48} />
                    <Text style={styles.matchTeamName} numberOfLines={1}>
                      {fixture.homeTeam.name}
                    </Text>
                  </View>
                  <View style={styles.matchScoreCol}>
                    <Text style={styles.matchScoreHome}>{fixture.homeGoals}</Text>
                    <Text style={styles.matchScoreDivider}>:</Text>
                    <Text style={styles.matchScoreAway}>{fixture.awayGoals}</Text>
                  </View>
                  <View style={styles.matchTeamCol}>
                    <TeamLogo uri={fixture.awayTeam.logo} size={48} />
                    <Text style={styles.matchTeamName} numberOfLines={1}>
                      {fixture.awayTeam.name}
                    </Text>
                  </View>
                </View>
                {fixture.elapsed && (
                  <View style={styles.elapsedRow}>
                    <MaterialCommunityIcons name="timer-outline" size={14} color={colors.tertiaryLight} />
                    <Text style={styles.elapsedText}>{fixture.elapsed}' played</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyLive}>
            <View style={styles.emptyIconWrap}>
              <MaterialCommunityIcons name="access-point" size={48} color={colors.onSurfaceVariant} />
            </View>
            <Text style={styles.emptyTitle}>No live matches right now</Text>
            <Text style={styles.emptySubtitle}>
              Check back during match hours or pull down to refresh
            </Text>
          </View>
        )}

        {/* Today's Other Matches */}
        {todayMatches.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="calendar" size={16} color={colors.primary} />
              <Text style={styles.sectionTitle}>TODAY'S MATCHES</Text>
            </View>
            {todayMatches.map((fixture) => (
              <TouchableOpacity
                key={fixture.apiId}
                style={styles.todayCard}
                onPress={() => navigateToFixture(fixture.apiId)}
                activeOpacity={0.7}
              >
                <View style={styles.matchLeagueRow}>
                  {fixture.leagueLogo ? (
                    <Image
                      source={{ uri: fixture.leagueLogo }}
                      style={styles.matchLeagueLogo}
                      resizeMode="contain"
                    />
                  ) : null}
                  <Text style={styles.matchLeagueName}>{fixture.leagueName}</Text>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>{getStatusLabel(fixture)}</Text>
                  </View>
                </View>
                <View style={styles.todayTeamsRow}>
                  <View style={styles.todayTeamInfo}>
                    <TeamLogo uri={fixture.homeTeam.logo} size={28} />
                    <Text style={styles.todayTeamName} numberOfLines={1}>
                      {fixture.homeTeam.name}
                    </Text>
                  </View>
                  <Text style={styles.todayScore}>
                    {FINISHED_STATUSES.includes(fixture.status)
                      ? `${fixture.homeGoals} - ${fixture.awayGoals}`
                      : 'vs'}
                  </Text>
                  <View style={[styles.todayTeamInfo, { justifyContent: 'flex-end' }]}>
                    <Text style={styles.todayTeamName} numberOfLines={1}>
                      {fixture.awayTeam.name}
                    </Text>
                    <TeamLogo uri={fixture.awayTeam.logo} size={28} />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Recent Results */}
        {recentMatches.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="clock-check-outline" size={16} color={colors.primary} />
              <Text style={styles.sectionTitle}>RECENT RESULTS</Text>
              <Text style={styles.matchCount}>{recentMatches.length}</Text>
            </View>
            {recentMatches.slice(0, 20).map((fixture) => (
              <TouchableOpacity
                key={fixture.apiId}
                style={styles.todayCard}
                onPress={() => navigateToFixture(fixture.apiId)}
                activeOpacity={0.7}
              >
                <View style={styles.matchLeagueRow}>
                  {fixture.leagueLogo ? (
                    <Image
                      source={{ uri: fixture.leagueLogo }}
                      style={styles.matchLeagueLogo}
                      resizeMode="contain"
                    />
                  ) : null}
                  <Text style={styles.matchLeagueName}>{fixture.leagueName}</Text>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>{fixture.status}</Text>
                  </View>
                </View>
                <View style={styles.todayTeamsRow}>
                  <View style={styles.todayTeamInfo}>
                    <TeamLogo uri={fixture.homeTeam.logo} size={28} />
                    <Text style={styles.todayTeamName} numberOfLines={1}>
                      {fixture.homeTeam.name}
                    </Text>
                  </View>
                  <Text style={styles.todayScore}>
                    {fixture.homeGoals} - {fixture.awayGoals}
                  </Text>
                  <View style={[styles.todayTeamInfo, { justifyContent: 'flex-end' }]}>
                    <Text style={styles.todayTeamName} numberOfLines={1}>
                      {fixture.awayTeam.name}
                    </Text>
                    <TeamLogo uri={fixture.awayTeam.logo} size={28} />
                  </View>
                </View>
                <View style={styles.recentDateRow}>
                  <Text style={styles.recentDateText}>
                    {new Date(fixture.date).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                  {fixture.leagueRound ? (
                    <Text style={styles.recentRoundText}>{fixture.leagueRound}</Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  section: { paddingHorizontal: 16, marginBottom: 24 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    lineHeight: 28,
    color: colors.onSurface,
    letterSpacing: -0.45,
    textTransform: 'uppercase',
    flex: 1,
  },
  matchCount: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    lineHeight: 16,
    color: colors.primary,
    backgroundColor: 'rgba(202,253,0,0.1)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 12,
    backgroundColor: colors.tertiaryLight,
  },

  // Match Card
  matchCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 8,
    padding: 20,
    marginBottom: 12,
    overflow: 'hidden',
    gap: 16,
  },
  liveAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.tertiaryLight,
  },
  matchLeagueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  matchLeagueLogo: { width: 16, height: 16 },
  matchLeagueName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    lineHeight: 15,
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
    textTransform: 'uppercase',
    flex: 1,
  },
  liveBadge: {
    backgroundColor: colors.tertiary,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  liveBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    lineHeight: 14,
    color: '#220600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  matchTeamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  matchTeamCol: { flex: 1, alignItems: 'center', gap: 8 },
  matchTeamName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurface,
    textAlign: 'center',
  },
  matchScoreCol: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  matchScoreHome: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 36,
    lineHeight: 40,
    color: colors.primaryContainer,
  },
  matchScoreDivider: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 24,
    lineHeight: 32,
    color: colors.onSurfaceVariant,
  },
  matchScoreAway: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 36,
    lineHeight: 40,
    color: colors.onSurface,
  },
  elapsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  elapsedText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    lineHeight: 16,
    color: colors.tertiaryLight,
  },

  // Empty
  emptyLive: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 20,
    lineHeight: 28,
    color: colors.onSurface,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 22,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },

  // Today
  todayCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 8,
    padding: 16,
    marginBottom: 10,
    gap: 12,
  },
  todayTeamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  todayTeamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  todayTeamName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurface,
    flex: 1,
  },
  todayScore: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    lineHeight: 24,
    color: colors.onSurface,
    paddingHorizontal: 16,
    textAlign: 'center',
  },
  statusBadge: {
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    lineHeight: 14,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  recentDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  recentDateText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: colors.onSurfaceDim,
  },
  recentRoundText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: colors.onSurfaceDim,
  },
});
