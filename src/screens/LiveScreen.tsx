import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
import { useTranslation } from 'react-i18next';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { colors } from '../theme';
import Toast from 'react-native-toast-message';
import { AppHeader } from '../components/AppHeader';
import { SportTabs } from '../components/SportTabs';
import { useAuth } from '../contexts/AuthContext';
import { usePurchases } from '../contexts/PurchasesContext';
import { sportsApi, SPORT_TABS } from '../api/sports';
import type { SportKey, SportDashboard, SportGame } from '../api/sports';
import type { LiveStackParamList, RootStackParamList } from '../navigation/types';
import { useLiveSSE } from '../hooks/useLiveSSE';
import { AdBanner } from '../components/AdBanner';
import { RewardedAdButton } from '../components/RewardedAdButton';
import { useAds } from '../contexts/AdContext';

const LIVE_STATUSES = ['1H', '2H', 'HT', 'ET', 'P', 'BT', 'LIVE', 'Q1', 'Q2', 'Q3', 'Q4', 'OT', 'P1', 'P2', 'P3', 'IN1', 'IN2', 'IN3', 'IN4', 'IN5', 'IN6', 'IN7', 'IN8', 'IN9'];
const FINISHED_STATUSES = ['FT', 'AET', 'PEN', 'AOT', 'AP', 'POST', 'Completed'];
const POLLING_FALLBACK_INTERVAL = 60_000;

type DateOption = { label: string; date: Date };

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function getGameStatusLabel(game: SportGame): string {
  if (LIVE_STATUSES.includes(game.status)) {
    return game.timer ? `${game.timer}'` : 'LIVE';
  }
  if (FINISHED_STATUSES.includes(game.status)) return game.status === 'Completed' ? 'FIN' : game.status;
  if (game.status === 'NS' || game.status === 'TBD') {
    return new Date(game.date).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return game.statusLong || game.status;
}

function getStatusType(game: SportGame): 'live' | 'finished' | 'upcoming' {
  if (LIVE_STATUSES.includes(game.status)) return 'live';
  if (FINISHED_STATUSES.includes(game.status)) return 'finished';
  return 'upcoming';
}

function TeamLogo({ uri, size = 28 }: { uri?: string; size?: number }) {
  if (uri) {
    return (
      <ExpoImage
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 4 }}
        contentFit="contain"
        placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
        transition={200}
        cachePolicy="memory-disk"
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

interface LeagueGroup {
  leagueApiId: number;
  leagueName: string;
  leagueLogo?: string;
  games: SportGame[];
}

function groupByLeague(games: SportGame[]): LeagueGroup[] {
  const map = new Map<number, LeagueGroup>();
  for (const game of games) {
    const key = game.leagueApiId;
    if (!map.has(key)) {
      map.set(key, {
        leagueApiId: key,
        leagueName: game.leagueName,
        leagueLogo: game.leagueLogo,
        games: [],
      });
    }
    map.get(key)!.games.push(game);
  }
  // Sort: leagues with live games first, then by game time
  const groups = Array.from(map.values());
  groups.sort((a, b) => {
    const aHasLive = a.games.some((g) => LIVE_STATUSES.includes(g.status)) ? 0 : 1;
    const bHasLive = b.games.some((g) => LIVE_STATUSES.includes(g.status)) ? 0 : 1;
    if (aHasLive !== bHasLive) return aHasLive - bHasLive;
    const aFirst = new Date(a.games[0].date).getTime();
    const bFirst = new Date(b.games[0].date).getTime();
    return aFirst - bFirst;
  });
  return groups;
}

export function LiveScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<LiveStackParamList>>();
  const rootNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { tokens } = useAuth();
  const { isProMember } = usePurchases();
  const { trackAction } = useAds();
  const [activeSport, setActiveSport] = useState<SportKey>('football');
  const [data, setData] = useState<SportDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const dateOptions = useMemo((): DateOption[] => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return [
      { label: t('live.yesterday'), date: yesterday },
      { label: t('live.today'), date: today },
      { label: t('live.tomorrow'), date: tomorrow },
    ];
  }, [t]);
  const [selectedDateIdx, setSelectedDateIdx] = useState(1); // default = Today

  // SSE: real-time push from backend — all 11 sports
  const {
    liveGames: sseLiveGames,
    connected: sseConnected,
  } = useLiveSSE({
    sport: activeSport,
    token: tokens?.accessToken || null,
    enabled: true,
  });

  useEffect(() => {
    if (sseConnected && sseLiveGames.length > 0 && data) {
      setData((prev) =>
        prev ? { ...prev, liveGames: sseLiveGames } : prev,
      );
    }
  }, [sseLiveGames, sseConnected]);

  const fetchData = useCallback(async () => {
    if (!tokens?.accessToken) return;
    try {
      const result = await sportsApi.getDashboard(tokens.accessToken, activeSport);
      setData(result);
    } catch (err) {
      Toast.show({ type: 'error', text1: t('dashboard.errorLoading'), text2: t('dashboard.pullToRetry') });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tokens?.accessToken, activeSport]);

  useEffect(() => {
    setLoading(true);
    fetchData();
    const pollInterval = sseConnected ? 0 : POLLING_FALLBACK_INTERVAL;
    if (pollInterval > 0) {
      intervalRef.current = setInterval(fetchData, pollInterval);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData, sseConnected]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleSportChange = useCallback((sport: SportKey) => {
    if (sport === activeSport) return;
    setActiveSport(sport);
    setData(null);
  }, [activeSport]);

  // Filter games for selected date
  const selectedDate = dateOptions[selectedDateIdx].date;
  const allGames = useMemo(() => {
    if (!data) return [];
    const combined = [
      ...(data.liveGames ?? []),
      ...(data.todayGames ?? []),
      ...(data.recentGames ?? []),
      ...(data.upcomingGames ?? []),
    ];
    // Deduplicate by apiId
    const seen = new Set<number>();
    return combined.filter((g) => {
      if (seen.has(g.apiId)) return false;
      seen.add(g.apiId);
      return true;
    });
  }, [data]);

  const todayGames = useMemo(() => {
    return allGames
      .filter((g) => isSameDay(new Date(g.date), selectedDate))
      .sort((a, b) => {
        // Live first, then upcoming by time, then finished
        const order = { live: 0, upcoming: 1, finished: 2 };
        const aType = order[getStatusType(a)];
        const bType = order[getStatusType(b)];
        if (aType !== bType) return aType - bType;
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
  }, [allGames, selectedDate]);

  const leagueGroups = useMemo(() => groupByLeague(todayGames), [todayGames]);

  const navigateToGame = (gameApiId: number) => {
    trackAction();
    navigation.navigate('LiveMatchPrediction', { fixtureApiId: gameApiId, sport: activeSport });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader />
        <SportTabs activeSport={activeSport} onSportChange={handleSportChange} isProMember={isProMember} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  const liveCount = todayGames.filter((g) => LIVE_STATUSES.includes(g.status)).length;

  return (
    <View style={styles.container}>
      <AppHeader />
      <SportTabs activeSport={activeSport} onSportChange={handleSportChange} isProMember={isProMember} />

      {/* Date pills */}
      <View style={styles.datePills}>
        {dateOptions.map((opt, idx) => (
          <TouchableOpacity
            key={idx}
            style={[styles.datePill, idx === selectedDateIdx && styles.datePillActive]}
            onPress={() => setSelectedDateIdx(idx)}
            activeOpacity={0.7}
          >
            <Text style={[styles.datePillText, idx === selectedDateIdx && styles.datePillTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <AdBanner placement="today" />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Live banner when there are live games */}
        {liveCount > 0 && selectedDateIdx === 1 && (
          <View style={styles.liveBanner}>
            <View style={styles.liveDot} />
            <Text style={styles.liveBannerText}>{t('live.gamesLiveNow', { count: liveCount })}</Text>
          </View>
        )}

        {/* Games grouped by league */}
        {leagueGroups.length > 0 ? (
          leagueGroups.map((group) => (
            <View key={group.leagueApiId} style={styles.leagueGroup}>
              {/* League header */}
              <View style={styles.leagueHeader}>
                {group.leagueLogo ? (
                  <ExpoImage
                    source={{ uri: group.leagueLogo }}
                    style={styles.leagueLogo}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                  />
                ) : null}
                <Text style={styles.leagueName} numberOfLines={1}>{group.leagueName}</Text>
                <Text style={styles.leagueCount}>{group.games.length}</Text>
              </View>

              {/* Games */}
              {group.games.map((game) => {
                const statusType = getStatusType(game);
                const isLive = statusType === 'live';
                const isUpcoming = statusType === 'upcoming';

                return (
                  <TouchableOpacity
                    key={game.apiId || game._id}
                    style={[styles.gameRow, isLive && styles.gameRowLive]}
                    onPress={() => navigateToGame(game.apiId)}
                    activeOpacity={0.7}
                  >
                    {/* Status column */}
                    <View style={styles.statusCol}>
                      {isLive ? (
                        <View style={styles.liveStatusBadge}>
                          <Text style={styles.liveStatusText}>{getGameStatusLabel(game)}</Text>
                        </View>
                      ) : isUpcoming ? (
                        <Text style={styles.timeText}>{getGameStatusLabel(game)}</Text>
                      ) : (
                        <Text style={styles.ftText}>{getGameStatusLabel(game)}</Text>
                      )}
                    </View>

                    {/* Teams + scores */}
                    <View style={styles.teamsCol}>
                      <View style={styles.teamRow}>
                        <TeamLogo uri={game.homeTeam?.logo} size={20} />
                        <Text style={[styles.teamName, isLive && styles.teamNameLive]} numberOfLines={1}>
                          {game.homeTeam?.name}
                        </Text>
                        <Text style={[styles.score, isLive && styles.scoreLive]}>
                          {game.homeTotal ?? '-'}
                        </Text>
                      </View>
                      <View style={styles.teamRow}>
                        <TeamLogo uri={game.awayTeam?.logo} size={20} />
                        <Text style={[styles.teamName, isLive && styles.teamNameLive]} numberOfLines={1}>
                          {game.awayTeam?.name}
                        </Text>
                        <Text style={[styles.score, isLive && styles.scoreLive]}>
                          {game.awayTotal ?? '-'}
                        </Text>
                      </View>
                    </View>

                    {/* Action hint for upcoming */}
                    {isUpcoming && (
                      <View style={styles.predictBadge}>
                        <Text style={styles.predictBadgeText}>{t('live.predict')}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons
                name={selectedDateIdx === 1 ? 'football-outline' : 'calendar-outline'}
                size={40}
                color={colors.onSurfaceVariant}
              />
            </View>
            <Text style={styles.emptyTitle}>
              {selectedDateIdx === 0
                ? t('live.noGamesYesterday')
                : selectedDateIdx === 1
                  ? t('live.noGamesToday')
                  : t('live.noGamesTomorrow')}
            </Text>
            <Text style={styles.emptySubtitle}>
              {selectedDateIdx === 1
                ? t('live.pullToRefresh')
                : t('live.tryDifferentDate')}
            </Text>
          </View>
        )}

        <RewardedAdButton />
        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },

  // Date pills
  datePills: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  datePill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerLow,
  },
  datePillActive: {
    backgroundColor: colors.primary,
  },
  datePillText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  datePillTextActive: {
    color: '#0B0E11',
    fontFamily: 'Inter_700Bold',
  },

  // Live banner
  liveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(239,68,68,0.1)',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  liveBannerText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#EF4444',
  },

  // League groups
  leagueGroup: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  leagueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    paddingVertical: 6,
  },
  leagueLogo: { width: 18, height: 18, borderRadius: 2 },
  leagueName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    flex: 1,
  },
  leagueCount: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },

  // Game rows
  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 8,
    padding: 12,
    marginBottom: 6,
    gap: 12,
  },
  gameRowLive: {
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },

  statusCol: {
    width: 48,
    alignItems: 'center',
  },
  liveStatusBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  liveStatusText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  timeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: colors.primary,
  },
  ftText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },

  teamsCol: {
    flex: 1,
    gap: 4,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  teamName: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: colors.onSurface,
    flex: 1,
  },
  teamNameLive: {
    fontFamily: 'Inter_700Bold',
  },
  score: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 15,
    color: colors.onSurface,
    width: 24,
    textAlign: 'right',
  },
  scoreLive: {
    color: '#FFFFFF',
  },

  predictBadge: {
    backgroundColor: 'rgba(202,253,0,0.1)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  predictBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: colors.primary,
    letterSpacing: 0.8,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    color: colors.onSurface,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
});
