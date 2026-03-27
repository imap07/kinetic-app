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
import { sportsApi, SPORT_TABS } from '../api/sports';
import type { SportKey, SportDashboard, SportGame } from '../api/sports';
import type { LiveStackParamList } from '../navigation/types';

const LIVE_STATUSES = ['1H', '2H', 'HT', 'ET', 'P', 'BT', 'LIVE', 'Q1', 'Q2', 'Q3', 'Q4', 'OT', 'P1', 'P2', 'P3', 'IN1', 'IN2', 'IN3', 'IN4', 'IN5', 'IN6', 'IN7', 'IN8', 'IN9'];
const FINISHED_STATUSES = ['FT', 'AET', 'PEN', 'AOT', 'AP', 'POST', 'Completed'];
const REFRESH_INTERVAL = 30_000;

function getGameStatusLabel(game: SportGame): string {
  if (LIVE_STATUSES.includes(game.status)) {
    return game.timer ? `${game.timer}'` : 'LIVE';
  }
  if (FINISHED_STATUSES.includes(game.status)) return game.status === 'Completed' ? 'FIN' : game.status;
  if (game.status === 'NS') {
    return new Date(game.date).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return game.statusLong || game.status;
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
      <Ionicons name="trophy-outline" size={size * 0.5} color={colors.onSurfaceVariant} />
    </View>
  );
}

export function LiveScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<LiveStackParamList>>();
  const { tokens } = useAuth();
  const [activeSport, setActiveSport] = useState<SportKey>('football');
  const [data, setData] = useState<SportDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    if (!tokens?.accessToken) return;
    try {
      const result = await sportsApi.getDashboard(tokens.accessToken, activeSport);
      setData(result);
    } catch (err) {
      console.log('Live fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tokens?.accessToken, activeSport]);

  useEffect(() => {
    setLoading(true);
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

  const handleSportChange = useCallback((sport: SportKey) => {
    if (sport === activeSport) return;
    setActiveSport(sport);
    setData(null);
  }, [activeSport]);

  const liveGames = data?.liveGames ?? [];
  const recentGames = data?.recentGames ?? [];

  const navigateToGame = (gameApiId: number) => {
    navigation.navigate('LiveMatchPrediction', { fixtureApiId: gameApiId, sport: activeSport });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sportTabsScroll} contentContainerStyle={styles.sportTabsContent}>
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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sportTabsScroll} contentContainerStyle={styles.sportTabsContent}>
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
        {liveGames.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.liveDot} />
              <Text style={styles.sectionTitle}>LIVE NOW</Text>
              <Text style={styles.matchCount}>{liveGames.length}</Text>
            </View>
            {liveGames.map((game) => (
              <TouchableOpacity
                key={game.apiId || game._id}
                style={styles.matchCard}
                onPress={() => navigateToGame(game.apiId)}
                activeOpacity={0.7}
              >
                <View style={styles.liveAccent} />
                <View style={styles.matchLeagueRow}>
                  {game.leagueLogo ? (
                    <Image
                      source={{ uri: game.leagueLogo }}
                      style={styles.matchLeagueLogo}
                      resizeMode="contain"
                    />
                  ) : null}
                  <Text style={styles.matchLeagueName}>{game.leagueName}</Text>
                  <View style={styles.liveBadge}>
                    <Text style={styles.liveBadgeText}>{getGameStatusLabel(game)}</Text>
                  </View>
                </View>
                <View style={styles.matchTeamsRow}>
                  <View style={styles.matchTeamCol}>
                    <TeamLogo uri={game.homeTeam?.logo} size={48} />
                    <Text style={styles.matchTeamName} numberOfLines={1}>
                      {game.homeTeam?.name}
                    </Text>
                  </View>
                  <View style={styles.matchScoreCol}>
                    <Text style={styles.matchScoreHome}>{game.homeTotal ?? '-'}</Text>
                    <Text style={styles.matchScoreDivider}>:</Text>
                    <Text style={styles.matchScoreAway}>{game.awayTotal ?? '-'}</Text>
                  </View>
                  <View style={styles.matchTeamCol}>
                    <TeamLogo uri={game.awayTeam?.logo} size={48} />
                    <Text style={styles.matchTeamName} numberOfLines={1}>
                      {game.awayTeam?.name}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyLive}>
            <View style={styles.emptyIconWrap}>
              <MaterialCommunityIcons name="access-point" size={48} color={colors.onSurfaceVariant} />
            </View>
            <Text style={styles.emptyTitle}>No live games right now</Text>
            <Text style={styles.emptySubtitle}>
              Check back during game hours or pull down to refresh
            </Text>
          </View>
        )}

        {/* Recent Results */}
        {recentGames.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="clock-check-outline" size={16} color={colors.primary} />
              <Text style={styles.sectionTitle}>RECENT RESULTS</Text>
              <Text style={styles.matchCount}>{recentGames.length}</Text>
            </View>
            {recentGames.slice(0, 20).map((game) => (
              <TouchableOpacity
                key={game.apiId || game._id}
                style={styles.todayCard}
                onPress={() => navigateToGame(game.apiId)}
                activeOpacity={0.7}
              >
                <View style={styles.matchLeagueRow}>
                  {game.leagueLogo ? (
                    <Image
                      source={{ uri: game.leagueLogo }}
                      style={styles.matchLeagueLogo}
                      resizeMode="contain"
                    />
                  ) : null}
                  <Text style={styles.matchLeagueName}>{game.leagueName}</Text>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>{game.status}</Text>
                  </View>
                </View>
                <View style={styles.todayTeamsRow}>
                  <View style={styles.todayTeamInfo}>
                    <TeamLogo uri={game.homeTeam?.logo} size={28} />
                    <Text style={styles.todayTeamName} numberOfLines={1}>
                      {game.homeTeam?.name}
                    </Text>
                  </View>
                  <Text style={styles.todayScore}>
                    {game.homeTotal ?? '-'} - {game.awayTotal ?? '-'}
                  </Text>
                  <View style={[styles.todayTeamInfo, { justifyContent: 'flex-end' }]}>
                    <Text style={styles.todayTeamName} numberOfLines={1}>
                      {game.awayTeam?.name}
                    </Text>
                    <TeamLogo uri={game.awayTeam?.logo} size={28} />
                  </View>
                </View>
                <View style={styles.recentDateRow}>
                  <Text style={styles.recentDateText}>
                    {new Date(game.date).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
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

  sportTabsScroll: { maxHeight: 44, marginBottom: 8 },
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
});
