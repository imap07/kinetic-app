import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Dimensions,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation as useRootNavigation, useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { colors, spacing } from '../theme';
import { HomeStackParamList, RootStackParamList } from '../navigation/types';
import { AppHeader } from '../components/AppHeader';
import { ProUpgradeBanner, SportTabs, ModalCloseButton } from '../components';
import { useAuth } from '../contexts/AuthContext';
import { useAchievements } from '../contexts/AchievementContext';
import { sportsApi, SPORT_TABS, FREE_SPORT, RECENT_GAMES_LIMIT } from '../api/sports';
import type { SportKey, SportDashboard, SportGame } from '../api/sports';
import { predictionsApi, fetchPickedGameIds } from '../api/predictions';
import type { DailyStatusResponse, MyStatsResponse } from '../api/predictions';
import Toast from 'react-native-toast-message';
import { useLiveGames } from '../contexts/LiveGamesContext';
import { useStatsSSE, AchievementSSEData } from '../hooks/useStatsSSE';
import { logSportTabViewed, logLeagueDetailOpened, logPickAttempted } from '../services/analytics';
import { AdBanner } from '../components/AdBanner';
import { RewardedAdButton } from '../components/RewardedAdButton';
import { useAds } from '../contexts/AdContext';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'DashboardHome'>;
};

const LIVE_STATUSES = ['1H', '2H', 'HT', 'ET', 'P', 'BT', 'LIVE', 'Q1', 'Q2', 'Q3', 'Q4', 'OT', 'P1', 'P2', 'P3', 'IN1', 'IN2', 'IN3', 'IN4', 'IN5', 'IN6', 'IN7', 'IN8', 'IN9'];

function formatGameTime(dateStr: string, t: (key: string) => string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const gameDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (gameDay.getTime() === today.getTime()) return `${t('dashboard.today')} ${time}`;
  if (gameDay.getTime() === tomorrow.getTime()) return `${t('dashboard.tomorrow')} ${time}`;
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`;
}

function getGameStatusLabel(game: SportGame, t: (key: string) => string): string {
  if (LIVE_STATUSES.includes(game.status)) {
    return game.timer ? `${t('dashboard.live')} ${game.timer}'` : t('dashboard.live');
  }
  if (['FT', 'AET', 'PEN', 'AOT', 'AP', 'POST', 'Completed'].includes(game.status)) {
    return t('dashboard.ft');
  }
  if (game.status === 'HT') return t('dashboard.ht');
  return formatGameTime(game.date, t);
}

function TeamLogo({ uri, size = 32 }: { uri?: string; size?: number }) {
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

function PickedBadge() {
  return (
    <View style={pickedBadgeStyles.container}>
      <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
    </View>
  );
}

const pickedBadgeStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
  },
});

export function DashboardScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { tokens, user } = useAuth();
  const { showAchievementUnlock } = useAchievements();
  const { setLiveCount } = useLiveGames();
  const { trackAction } = useAds();
  const rootNav = useRootNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const defaultSport = (user?.favoriteSports?.[0] as SportKey) || 'football';
  const [activeSport, setActiveSport] = useState<SportKey>(defaultSport);
  const [data, setData] = useState<SportDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dailyStatus, setDailyStatus] = useState<DailyStatusResponse | null>(null);
  const [userStats, setUserStats] = useState<MyStatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [pickedGameIds, setPickedGameIds] = useState<Set<number>>(new Set());

  const fetchDashboard = useCallback(async () => {
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
    fetchDashboard();
  }, [fetchDashboard]);

  const fetchUserStats = useCallback(async () => {
    if (!tokens?.accessToken) return;
    setStatsLoading(true);
    try {
      const [daily, stats] = await Promise.all([
        predictionsApi.getDailyStatus(tokens.accessToken),
        predictionsApi.getMyStats(tokens.accessToken),
      ]);
      setDailyStatus(daily);
      setUserStats(stats);
    } catch (err) {
      Toast.show({ type: 'error', text1: t('dashboard.errorLoading'), text2: t('dashboard.pullToRetry') });
    } finally {
      setStatsLoading(false);
    }
  }, [tokens?.accessToken]);

  useEffect(() => {
    fetchUserStats();
  }, [fetchUserStats]);

  const fetchPickedIds = useCallback(async () => {
    if (!tokens?.accessToken) return;
    try {
      const ids = await fetchPickedGameIds(tokens.accessToken);
      setPickedGameIds(ids);
    } catch (_) { /* silent */ }
  }, [tokens?.accessToken]);

  useEffect(() => { fetchPickedIds(); }, [fetchPickedIds]);

  // Re-fetch stats every time the dashboard gains focus (e.g. after submitting a prediction)
  useFocusEffect(
    useCallback(() => {
      fetchUserStats();
      fetchPickedIds();
    }, [fetchUserStats, fetchPickedIds])
  );

  // Real-time stats via SSE — updates instantly when predictions are created/deleted/resolved
  useStatsSSE({
    token: tokens?.accessToken ?? null,
    onUpdate: useCallback(({ stats, daily }) => {
      setUserStats(stats);
      setDailyStatus(daily);
    }, []),
    onAchievement: useCallback(
      (achievement: AchievementSSEData['achievement']) =>
        showAchievementUnlock(achievement),
      [showAchievementUnlock],
    ),
  });

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboard();
    fetchUserStats();
    fetchPickedIds();
  }, [fetchDashboard, fetchUserStats, fetchPickedIds]);

  const handleSportChange = useCallback((sport: SportKey) => {
    if (sport === activeSport) return;
    setActiveSport(sport);
    setData(null);
    logSportTabViewed(sport);
  }, [activeSport]);

  const handleMatchPress = useCallback((game: any) => {
    trackAction();
    const isFinished = ['FT', 'AET', 'AP', 'Cancelled', 'Completed', 'Ended', 'Abandoned'].includes(game.status);
    if (activeSport === 'formula-1' && !isFinished) {
      // Upcoming/live F1 race → prediction screen
      navigation.navigate('F1RacePrediction', {
        raceApiId: game.apiId,
        competitionName: game.competitionName || game.leagueName,
        circuitName: game.circuit?.name || game.circuitName,
      });
    } else {
      // Finished F1 race or any other sport → match detail (results, fastest lap, etc.)
      navigation.navigate('MatchPrediction', { fixtureApiId: game.apiId, sport: activeSport });
    }
  }, [activeSport, navigation, trackAction]);

  const allLiveGames = data?.liveGames ?? [];
  const allTodayGames = data?.todayGames ?? [];
  const allRecentGames = data?.recentGames ?? [];
  const allUpcomingGames = data?.upcomingGames ?? [];
  const featuredLeagues = data?.featuredLeagues ?? [];

  // League filter state: null = "All"
  const [activeLeagueFilter, setActiveLeagueFilter] = useState<number | null>(null);
  const [showLeagueSheet, setShowLeagueSheet] = useState(false);
  const [leagueSearch, setLeagueSearch] = useState('');

  // Reset league filter when sport changes
  useEffect(() => {
    setActiveLeagueFilter(null);
  }, [activeSport]);

  // Group leagues by category for bottom sheet
  const groupedLeagues = useMemo(() => {
    if (!featuredLeagues.length) return { domestic: [], cups: [], international: [] };
    const domestic: any[] = [];
    const cups: any[] = [];
    const international: any[] = [];
    const cupTypes = ['Cup'];
    const internationalKeywords = ['Friendlies', 'World Cup', 'Euro', 'Copa America', 'Nations League', 'Olympics', 'Qualification'];
    for (const l of featuredLeagues) {
      const isInternational = internationalKeywords.some((kw) => l.name.includes(kw));
      const isCup = !isInternational && (cupTypes.includes(l.type ?? '') || l.name.includes('Cup') || l.name.includes('Copa') || l.name.includes('Coupe') || l.name.includes('Pokal') || l.name.includes('Champions') || l.name.includes('Europa') || l.name.includes('Conference') || l.name.includes('Libertadores') || l.name.includes('Sudamericana') || l.name.includes('CONCACAF'));
      if (isInternational) international.push(l);
      else if (isCup) cups.push(l);
      else domestic.push(l);
    }
    return { domestic, cups, international };
  }, [featuredLeagues]);

  // Filter leagues in bottom sheet by search
  const filteredSheetLeagues = useMemo(() => {
    const q = leagueSearch.toLowerCase().trim();
    const filterGroup = (leagues: any[]) =>
      q ? leagues.filter((l: any) => l.name.toLowerCase().includes(q) || l.countryName?.toLowerCase().includes(q)) : leagues;
    return {
      domestic: filterGroup(groupedLeagues.domestic),
      cups: filterGroup(groupedLeagues.cups),
      international: filterGroup(groupedLeagues.international),
    };
  }, [groupedLeagues, leagueSearch]);

  // Filter games by selected league
  const filterByLeague = useCallback((games: SportGame[]) => {
    if (activeLeagueFilter === null) return games;
    return games.filter((g) => g.leagueApiId === activeLeagueFilter);
  }, [activeLeagueFilter]);

  const FINISHED = ['FT', 'AET', 'PEN', 'AOT', 'AP', 'POST', 'Completed'];
  const liveGames = filterByLeague(allLiveGames);
  const todayGames = filterByLeague(allTodayGames);
  const recentGames = filterByLeague(allRecentGames);
  const rawUpcoming = filterByLeague(allUpcomingGames);
  // Merge today + upcoming — exclude finished games so they don't show as "upcoming"
  const upcomingGames = [...todayGames, ...rawUpcoming].filter(
    (g) => !FINISHED.includes(g.status),
  );

  useEffect(() => {
    setLiveCount(allLiveGames.length);
  }, [allLiveGames.length, setLiveCount]);

  const [f1CircuitModalVisible, setF1CircuitModalVisible] = useState(false);
  const [f1Standings, setF1Standings] = useState<any[]>([]);
  const [f1Constructors, setF1Constructors] = useState<any[]>([]);
  const [f1StandingsExpanded, setF1StandingsExpanded] = useState(false);
  const [f1StandingsTab, setF1StandingsTab] = useState<'drivers' | 'constructors'>('drivers');
  const isF1 = activeSport === 'formula-1';
  const hasLiveOrUpcoming = liveGames.length > 0 || upcomingGames.length > 0;

  // F1: Fetch championship standings
  useEffect(() => {
    if (!isF1 || !tokens?.accessToken) return;
    sportsApi.getChampionshipStandings(tokens.accessToken, 'formula-1')
      .then((res: any) => {
        setF1Standings(res?.drivers || []);
        setF1Constructors(res?.constructors || []);
      })
      .catch(() => {});
  }, [isF1, tokens?.accessToken]);

  // F1: Group upcoming sessions by GP (competitionName) — shows full race weekend schedule
  const f1NextGpSessions = useMemo(() => {
    if (!isF1 || upcomingGames.length === 0) return [];
    const gpName = upcomingGames[0]?.competitionName || upcomingGames[0]?.leagueName || '';
    if (!gpName) return upcomingGames.slice(0, 7);
    return upcomingGames.filter((g) => (g.competitionName || g.leagueName) === gpName);
  }, [isF1, upcomingGames]);

  const f1NextGpName = f1NextGpSessions[0]?.competitionName || f1NextGpSessions[0]?.leagueName || '';
  // F1 circuit data may be a nested object or flat fields on the document
  const f1NextGpCircuit = f1NextGpSessions[0]?.circuit || (f1NextGpSessions[0]?.circuitName ? {
    name: f1NextGpSessions[0].circuitName!,
    image: f1NextGpSessions[0].circuitImage,
    city: f1NextGpSessions[0].city,
    country: f1NextGpSessions[0].country,
  } : null);

  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader />
        <SportTabs activeSport={activeSport} onSportChange={handleSportChange} visibleSports={user?.favoriteSports} />
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
      <SportTabs activeSport={activeSport} onSportChange={handleSportChange} visibleSports={user?.favoriteSports} />

      {/* League Filter Bar — hidden for F1 (F1 uses race weekends, not leagues) */}
      {isF1 ? (
        <View style={styles.f1SeasonBar}>
          <Ionicons name="car-sport" size={15} color={colors.primary} />
          <Text style={styles.f1SeasonLabel}>
            {t('dashboard.f1Season', { year: new Date().getFullYear() })}
          </Text>
        </View>
      ) : (
      <View style={styles.leagueFilterContainer}>
        {/* "All" pill */}
        <TouchableOpacity
          style={[
            styles.leagueFilterPill,
            styles.leagueFilterPillFirst,
            activeLeagueFilter === null && styles.leagueFilterPillActive,
          ]}
          onPress={() => setActiveLeagueFilter(null)}
          activeOpacity={0.7}
        >
          <Ionicons
            name="layers-outline"
            size={15}
            color={activeLeagueFilter === null ? colors.primary : colors.onSurfaceVariant}
          />
          <Text
            style={[
              styles.leagueFilterText,
              activeLeagueFilter === null && styles.leagueFilterTextActive,
            ]}
          >
            {t('dashboard.all')}
          </Text>
        </TouchableOpacity>

        {/* League dropdown button */}
        <TouchableOpacity
          style={[
            styles.leagueDropdownBtn,
            activeLeagueFilter !== null && styles.leagueDropdownBtnActive,
          ]}
          onPress={() => { setLeagueSearch(''); setShowLeagueSheet(true); }}
          activeOpacity={0.7}
        >
          {activeLeagueFilter !== null && (() => {
            const activeLg = featuredLeagues.find((l: any) => l.apiId === activeLeagueFilter);
            return activeLg?.logo ? (
              <ExpoImage
                source={{ uri: activeLg.logo }}
                style={styles.leagueFilterLogo}
                contentFit="contain"
                cachePolicy="memory-disk"
              />
            ) : (
              <Ionicons name="trophy-outline" size={15} color={colors.primary} />
            );
          })()}
          <Text
            style={[
              styles.leagueDropdownText,
              activeLeagueFilter !== null && styles.leagueDropdownTextActive,
            ]}
            numberOfLines={1}
          >
            {activeLeagueFilter !== null
              ? (featuredLeagues.find((l: any) => l.apiId === activeLeagueFilter)?.name ?? t('dashboard.selectLeague'))
              : t('dashboard.selectLeague')}
          </Text>
          <Ionicons
            name="chevron-down"
            size={14}
            color={activeLeagueFilter !== null ? colors.primary : colors.onSurfaceVariant}
          />
        </TouchableOpacity>
      </View>
      )}

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
        {/* F1 layout: Next GP > Recent Races > (engagement content below) */}
        {/* Other sports: Live > Upcoming > Recent > Predictor > Challenge > Pro > Leagues */}
        {/* Other sports (no live): Predictor > Challenge > Pro > Recent > Leagues */}

        {/* F1: Championship Standings with Drivers / Constructors tabs */}
        {isF1 && f1Standings.length > 0 && (
          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeader}>
              <Ionicons name="trophy" size={18} color={colors.primary} />
              <Text style={styles.sectionHeadingRow}>{t('dashboard.championshipStandings')}</Text>
            </View>
            {/* Tabs */}
            <View style={styles.f1StandingsTabs}>
              <TouchableOpacity
                style={[styles.f1StandingsTab, f1StandingsTab === 'drivers' && styles.f1StandingsTabActive]}
                onPress={() => { setF1StandingsTab('drivers'); setF1StandingsExpanded(false); }}
                activeOpacity={0.7}
              >
                <Ionicons name="person" size={14} color={f1StandingsTab === 'drivers' ? colors.background : colors.onSurfaceVariant} />
                <Text style={[styles.f1StandingsTabText, f1StandingsTab === 'drivers' && styles.f1StandingsTabTextActive]}>
                  {t('dashboard.drivers')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.f1StandingsTab, f1StandingsTab === 'constructors' && styles.f1StandingsTabActive]}
                onPress={() => { setF1StandingsTab('constructors'); setF1StandingsExpanded(false); }}
                activeOpacity={0.7}
              >
                <Ionicons name="car-sport" size={14} color={f1StandingsTab === 'constructors' ? colors.background : colors.onSurfaceVariant} />
                <Text style={[styles.f1StandingsTabText, f1StandingsTab === 'constructors' && styles.f1StandingsTabTextActive]}>
                  {t('dashboard.constructors')}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.f1StandingsCard}>
              {f1StandingsTab === 'drivers' ? (
                <>
                  {(f1StandingsExpanded ? f1Standings : f1Standings.slice(0, 5)).map((d: any, idx: number) => (
                    <View key={d.driverApiId || idx} style={[styles.f1StandingsRow, idx === 0 && styles.f1StandingsRowLeader]}>
                      <Text style={[styles.f1StandingsPos, idx < 3 && styles.f1StandingsPosPodium]}>
                        P{d.position || idx + 1}
                      </Text>
                      {d.driverImage ? (
                        <ExpoImage source={{ uri: d.driverImage }} style={styles.f1StandingsDriverImg} contentFit="cover" cachePolicy="memory-disk" />
                      ) : <View style={styles.f1StandingsDriverImg} />}
                      <View style={styles.f1StandingsInfo}>
                        <Text style={styles.f1StandingsName}>{d.driverName}</Text>
                        <Text style={styles.f1StandingsTeam}>{d.teamName}</Text>
                      </View>
                      <View style={styles.f1StandingsPointsCol}>
                        <Text style={styles.f1StandingsPoints}>{d.points || 0}</Text>
                        <Text style={styles.f1StandingsPtsLabel}>PTS</Text>
                      </View>
                    </View>
                  ))}
                </>
              ) : (
                <>
                  {(f1StandingsExpanded ? f1Constructors : f1Constructors.slice(0, 5)).map((team: any, idx: number) => (
                    <View key={team.teamApiId || idx} style={[styles.f1StandingsRow, idx === 0 && styles.f1StandingsRowLeader]}>
                      <Text style={[styles.f1StandingsPos, idx < 3 && styles.f1StandingsPosPodium]}>
                        P{team.rank || idx + 1}
                      </Text>
                      {(team.teamLogoHD || team.teamLogo) ? (
                        <ExpoImage source={{ uri: team.teamLogoHD || team.teamLogo }} style={styles.f1StandingsConstructorLogo} contentFit="contain" cachePolicy="memory-disk" />
                      ) : <View style={styles.f1StandingsConstructorLogo} />}
                      <View style={styles.f1StandingsInfo}>
                        <Text style={styles.f1StandingsName}>{team.teamName}</Text>
                      </View>
                      <View style={styles.f1StandingsPointsCol}>
                        <Text style={styles.f1StandingsPoints}>{team.points || 0}</Text>
                        <Text style={styles.f1StandingsPtsLabel}>PTS</Text>
                      </View>
                    </View>
                  ))}
                </>
              )}
              <TouchableOpacity
                style={styles.f1StandingsToggle}
                activeOpacity={0.7}
                onPress={() => setF1StandingsExpanded(!f1StandingsExpanded)}
              >
                <Text style={styles.f1StandingsToggleText}>
                  {f1StandingsExpanded ? t('dashboard.showLess') : t('dashboard.viewFullStandings')}
                </Text>
                <Ionicons name={f1StandingsExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* F1: Next GP always at the top */}
        {isF1 && f1NextGpSessions.length > 0 && (
          <View style={styles.sectionWrap}>
            <Text style={styles.thrillersHeading}>{t('dashboard.nextGrandPrix')}</Text>
            <View style={styles.f1GpCard}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  const raceSession = f1NextGpSessions.find((s) => s.type === 'Race') || f1NextGpSessions[f1NextGpSessions.length - 1];
                  if (raceSession) handleMatchPress(raceSession);
                }}
              >
                <Text style={styles.f1GpTitle}>{f1NextGpName} <Ionicons name="chevron-forward" size={16} color={colors.primary} /></Text>
              </TouchableOpacity>
              {f1NextGpCircuit && (
                <Text style={styles.f1GpLocation}>
                  {f1NextGpCircuit.name} — {f1NextGpCircuit.city}, {f1NextGpCircuit.country}
                </Text>
              )}
              <View style={styles.f1ScheduleList}>
                {f1NextGpSessions.map((session) => {
                  const sessionDate = new Date(session.date);
                  const dayLabel = sessionDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
                  const timeLabel = sessionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const sessionType = session.type || 'Race';
                  return (
                    <TouchableOpacity
                      key={session.apiId}
                      style={styles.f1SessionRow}
                      onPress={() => handleMatchPress(session)}
                      activeOpacity={0.7}
                    >
                      {pickedGameIds.has(session.apiId) && <PickedBadge />}
                      <View style={[
                        styles.f1SessionTypeBadge,
                        sessionType.toLowerCase().includes('race') && styles.f1SessionTypeBadgeRace,
                      ]}>
                        <Text style={[
                          styles.f1SessionTypeText,
                          sessionType.toLowerCase().includes('race') && styles.f1SessionTypeTextRace,
                        ]}>
                          {sessionType}
                        </Text>
                      </View>
                      <View style={styles.f1SessionInfo}>
                        <Text style={styles.f1SessionDay}>{dayLabel}</Text>
                        <Text style={styles.f1SessionTime}>{timeLabel}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={14} color={colors.onSurfaceDim} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {/* F1: Recent races right after next GP */}
        {isF1 && recentGames.length > 0 && (
          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="clock-check-outline" size={18} color={colors.primary} />
              <Text style={styles.sectionHeadingRow}>{t('dashboard.recentRaces')}</Text>
            </View>
            {recentGames.map((game) => (
              <TouchableOpacity
                key={game.apiId || game._id}
                style={styles.todayCard}
                onPress={() => handleMatchPress(game)}
                activeOpacity={0.7}
              >
                {pickedGameIds.has(game.apiId) && <PickedBadge />}
                {/* Header: GP name + badge */}
                <View style={styles.f1RecentHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.f1RaceName} numberOfLines={1}>{game.competitionName || game.leagueName}</Text>
                    <Text style={styles.f1CircuitName} numberOfLines={1}>
                      {game.circuit?.name || game.circuitName || ''}{(game.circuit?.country || game.country) ? ` — ${game.circuit?.country || game.country}` : ''}
                    </Text>
                  </View>
                  <View style={[styles.f1StatusBadge, game.status === 'Cancelled' && styles.f1CancelledBadge]}>
                    <Text style={[styles.f1StatusText, game.status === 'Cancelled' && styles.f1CancelledText]}>
                      {game.status === 'Cancelled' ? t('dashboard.cancelled') : (game.type || 'Race')}
                    </Text>
                  </View>
                </View>
                {/* Cancelled notice */}
                {game.status === 'Cancelled' && (
                  <View style={styles.f1CancelledNotice}>
                    <Ionicons name="warning-outline" size={14} color="#FF6B6B" />
                    <Text style={styles.f1CancelledNoticeText}>{t('dashboard.raceCancelled')}</Text>
                  </View>
                )}
                {/* Winner row */}
                {game.status !== 'Cancelled' && game.results?.[0] && (
                  <View style={styles.f1WinnerRow}>
                    {game.results[0].driverImage ? (
                      <ExpoImage source={{ uri: game.results[0].driverImage }} style={styles.f1WinnerDriverImg} contentFit="cover" cachePolicy="memory-disk" />
                    ) : (
                      <View style={styles.f1WinnerDriverImgPlaceholder}>
                        <Ionicons name="person" size={16} color={colors.onSurfaceDim} />
                      </View>
                    )}
                    <View style={styles.f1WinnerInfo}>
                      <View style={styles.f1WinnerNameRow}>
                        <Ionicons name="trophy" size={12} color={colors.primary} />
                        <Text style={styles.f1WinnerText} numberOfLines={1}>{game.results[0].driverName || 'TBD'}</Text>
                      </View>
                      {game.results[0].teamName ? (
                        <Text style={styles.f1WinnerTeamName} numberOfLines={1}>{game.results[0].teamName}</Text>
                      ) : null}
                    </View>
                    {(game.results[0].teamLogoHD || game.results[0].teamLogo) ? (
                      <ExpoImage source={{ uri: game.results[0].teamLogoHD || game.results[0].teamLogo }} style={styles.f1WinnerTeamLogoHD} contentFit="contain" cachePolicy="memory-disk" />
                    ) : null}
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Non-F1: Live games */}
        {!isF1 && hasLiveOrUpcoming && liveGames.length > 0 && (
          <View style={styles.sectionWrap}>
            <View style={styles.liveHeaderRow}>
              <View style={styles.liveDot} />
              <Text style={styles.liveSectionTitle}>{t('dashboard.liveAction')}</Text>
            </View>
            {liveGames.map((game) => (
              <TouchableOpacity
                key={game.apiId || game._id}
                style={styles.liveCard}
                onPress={() => handleMatchPress(game)}
                activeOpacity={0.7}
              >
                {pickedGameIds.has(game.apiId) && <PickedBadge />}
                <View style={styles.liveAccent} />
                <View style={styles.liveBody}>
                  <View style={styles.liveBadgeRow}>
                    <View style={styles.liveBadge}>
                      <Text style={styles.liveBadgeText}>{getGameStatusLabel(game, t)}</Text>
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

        {/* Non-F1: Horizontal upcoming games */}
        {!isF1 && hasLiveOrUpcoming && upcomingGames.length > 0 && (
          <View style={styles.sectionWrap}>
            <Text style={styles.thrillersHeading}>
              {t('dashboard.upcoming')}
            </Text>
            <FlatList
              horizontal
              data={upcomingGames}
              keyExtractor={(game) => String(game.apiId || game._id)}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.gameCardsRow}
              windowSize={3}
              maxToRenderPerBatch={5}
              getItemLayout={(_data, index) => ({ length: 296, offset: 296 * index, index })}
              renderItem={({ item: game }) => (
                <TouchableOpacity
                  style={styles.gameCard}
                  onPress={() => handleMatchPress(game)}
                  activeOpacity={0.7}
                >
                  {pickedGameIds.has(game.apiId) && <PickedBadge />}
                  <View style={styles.gameCardTop}>
                    <Text style={styles.gameCardLeague}>
                      {game.leagueName} {'\u2022'} {formatGameTime(game.date, t)}
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
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* Ad between sections */}
        <AdBanner placement="home" />

        {/* Recent Results - shown AFTER live/upcoming when they exist (F1 handled above) */}
        {!isF1 && hasLiveOrUpcoming && recentGames.length > 0 && (
          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="clock-check-outline" size={18} color={colors.primary} />
              <Text style={styles.sectionHeadingRow}>
                {isF1 ? t('dashboard.recentRaces') : t('dashboard.recentResults')}
              </Text>
            </View>
            {recentGames.slice(0, RECENT_GAMES_LIMIT).map((game) => (
              <TouchableOpacity
                key={game.apiId || game._id}
                style={styles.todayCard}
                onPress={() => handleMatchPress(game)}
                activeOpacity={0.7}
              >
                {pickedGameIds.has(game.apiId) && <PickedBadge />}
                {isF1 ? (
                  <View style={styles.f1RecentHeader}>
                    <View style={styles.f1WinnerInfo}>
                      <Text style={styles.f1RaceName}>{game.competitionName || game.leagueName}</Text>
                      <Text style={styles.f1CircuitName}>
                        {game.circuit?.name || game.circuitName || ''} {(game.circuit?.country || game.country) ? ` — ${game.circuit?.country || game.country}` : ''}
                      </Text>
                      {game.results?.[0] && (
                        <View style={styles.f1WinnerRow}>
                          <Ionicons name="trophy" size={12} color={colors.primary} />
                          <Text style={styles.f1WinnerText}>{game.results[0].driverName || 'TBD'}</Text>
                        </View>
                      )}
                      <Text style={styles.recentDateText}>{formatGameTime(game.date, t)}</Text>
                    </View>
                    <View style={styles.f1StatusBadge}>
                      <Text style={styles.f1StatusText}>{game.type || 'Race'}</Text>
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
                      <Text style={styles.recentDateText}>{formatGameTime(game.date, t)}</Text>
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
                      <Text style={styles.recentStatusText}>{t('dashboard.ft')}</Text>
                    </View>
                  </>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Stats Card */}
        {statsLoading ? (
          <View style={[styles.predictorCard, { alignItems: 'center', justifyContent: 'center', minHeight: 120 }]}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : dailyStatus && userStats ? (
          <TouchableOpacity
            style={styles.predictorCard}
            activeOpacity={0.8}
            onPress={() => rootNav.navigate('Main', { screen: 'MyPicks' } as any)}
          >
            {/* Top row: title + daily picks ring */}
            <View style={styles.statsTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.predictorTitle}>{t('dashboard.yourStats')}</Text>
                <Text style={styles.predictorSubtitle}>
                  {t('dashboard.freeTier')} {'\u2022'}{' '}
                  <Text style={styles.predictorPts}>{userStats.totalPoints.toLocaleString()} PTS</Text>
                </Text>
              </View>

              {/* Daily picks circular indicator */}
              <View style={styles.dailyRing}>
                <Text style={styles.dailyRingValue}>
                  {dailyStatus.used}<Text style={styles.dailyRingLimit}>/{dailyStatus.limit > 0 ? dailyStatus.limit : '∞'}</Text>
                </Text>
                <Text style={styles.dailyRingLabel}>TODAY</Text>
              </View>
            </View>

            {/* Quick stats grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statGridItem}>
                <Text style={styles.statGridValue}>{userStats.won}</Text>
                <Text style={styles.statGridLabel}>{t('dashboard.won')}</Text>
              </View>
              <View style={styles.statGridItem}>
                <Text style={styles.statGridValue}>{userStats.lost}</Text>
                <Text style={styles.statGridLabel}>{t('dashboard.lost')}</Text>
              </View>
              <View style={styles.statGridItem}>
                <Text style={[styles.statGridValue, userStats.winRate > 0 && { color: colors.primary }]}>
                  {userStats.winRate}%
                </Text>
                <Text style={styles.statGridLabel}>{t('dashboard.winRate')}</Text>
              </View>
              <View style={styles.statGridItem}>
                <Text style={styles.statGridValue}>
                  {userStats.currentStreak > 0 ? userStats.currentStreak : userStats.bestStreak}
                </Text>
                <Text style={styles.statGridLabel}>
                  {userStats.currentStreak > 0 ? t('dashboard.streak') : t('dashboard.best')}
                </Text>
              </View>
            </View>

            {/* Bottom row: quests link */}
            <View style={styles.goalLabelRow}>
              <View style={styles.progressTrack}>
                <LinearGradient
                  colors={[colors.primaryContainer, colors.primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.progressFill, { width: `${dailyStatus.limit > 0 ? Math.min((dailyStatus.used / dailyStatus.limit) * 100, 100) : 0}%` }]}
                />
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('Quests')} hitSlop={8}>
                <Text style={styles.questsLink}>{t('dashboard.questsLink')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ) : null}

        {/* Challenge of the Day — connected to real quest data */}
        {dailyStatus?.quests && (
          <View style={styles.challengeCard}>
            {/* Header row with title + completion badge */}
            <View style={styles.challengeTitleRow}>
              <Ionicons name="trophy" size={15} color={colors.primary} />
              <Text style={styles.challengeHeading}>{t('dashboard.dailyChallenge')}</Text>
              {dailyStatus.quests.bonusReward.completed ? (
                <View style={styles.challengeCompletedBadge}>
                  <Ionicons name="checkmark" size={10} color="#0B0E11" />
                  <Text style={styles.challengeCompletedText}>{t('dashboard.done')}</Text>
                </View>
              ) : (
                <Text style={styles.challengeProgressText}>
                  {[dailyStatus.quests.pick3.completed, dailyStatus.quests.multiSport.completed, dailyStatus.quests.bonusReward.completed].filter(Boolean).length}/3
                </Text>
              )}
            </View>

            {/* Compact checklist */}
            <View style={styles.challengeChecklist}>
              {[
                {
                  done: dailyStatus.quests.pick3.completed,
                  text: t('dashboard.pickCorrect', { count: dailyStatus.quests.pick3.target }),
                  progress: `${dailyStatus.quests.pick3.progress}/${dailyStatus.quests.pick3.target}`,
                },
                {
                  done: dailyStatus.quests.multiSport.completed,
                  text: t('dashboard.coverSports', { count: dailyStatus.quests.multiSport.target }),
                  progress: `${dailyStatus.quests.multiSport.progress}/${dailyStatus.quests.multiSport.target}`,
                },
                {
                  done: dailyStatus.quests.bonusReward.completed,
                  text: t('dashboard.earnBonusRewards'),
                  progress: '',
                },
              ].map((quest, i) => (
                <View key={i} style={styles.challengeCheckRow}>
                  <View style={[styles.challengeCheckIcon, quest.done && styles.challengeCheckIconDone]}>
                    {quest.done && <Ionicons name="checkmark" size={10} color="#0B0E11" />}
                  </View>
                  <Text style={[styles.challengeCheckText, quest.done && styles.challengeCheckTextDone]}>
                    {quest.text}
                  </Text>
                  {!!quest.progress && !quest.done && (
                    <Text style={styles.challengeCheckProgress}>{quest.progress}</Text>
                  )}
                </View>
              ))}
            </View>

            {/* Smart CTA button — routes based on pending quest */}
            {!dailyStatus.quests.bonusReward.completed && (() => {
              const needsMultiSport = !dailyStatus.quests.multiSport.completed;
              const needsPick3 = !dailyStatus.quests.pick3.completed;

              // Quest "Cover 2 sports" pending + user is free → conversion moment
              // Quest "Cover 2 sports" pending → switch to uncovered sport
              if (needsMultiSport) {
                const coveredSports = dailyStatus.quests.multiSport.sportsPlayed || [];
                // Prefer active sport if not yet covered, otherwise find any uncovered sport
                const activeSportTab = SPORT_TABS.find((t) => t.key === activeSport);
                const uncovered = (!coveredSports.includes(activeSport) && activeSportTab)
                  ? activeSportTab
                  : SPORT_TABS.find((t) => !coveredSports.includes(t.key));
                return (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.submitWrap}
                    onPress={() => {
                      if (uncovered && uncovered.key !== activeSport) {
                        setActiveSport(uncovered.key);
                      }
                      const next = upcomingGames[0] || liveGames[0];
                      if (next) {
                        handleMatchPress(next);
                      }
                    }}
                  >
                    <LinearGradient
                      colors={[colors.primaryContainer, colors.primary]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.submitBtn}
                    >
                      <Text style={styles.submitBtnText}>
                        {uncovered ? t('dashboard.pickInSport', { sport: t(`sportNames.${uncovered.key}`, { defaultValue: uncovered.name }).toUpperCase() }) : t('dashboard.startPicking')}
                      </Text>
                      <Ionicons name="arrow-forward" size={16} color="#3A4A00" />
                    </LinearGradient>
                  </TouchableOpacity>
                );
              }

              // Quest "Pick 3 correct" pending → navigate to first available game
              if (needsPick3) {
                const next = upcomingGames[0] || liveGames[0];
                return (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.submitWrap}
                    onPress={() => {
                      if (next) {
                        handleMatchPress(next);
                      }
                    }}
                  >
                    <LinearGradient
                      colors={[colors.primaryContainer, colors.primary]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.submitBtn}
                    >
                      <Text style={styles.submitBtnText}>{t('dashboard.makeYourPick')}</Text>
                      <Ionicons name="arrow-forward" size={16} color="#3A4A00" />
                    </LinearGradient>
                  </TouchableOpacity>
                );
              }

              return null;
            })()}
          </View>
        )}

        {/* Ad Banner */}
        <AdBanner placement="dashboard" />
        <RewardedAdButton />

        {/* Pro Upgrade Banner */}
        <ProUpgradeBanner />

        {/* Coin Leagues Promo */}
        <TouchableOpacity
          style={styles.leaguesPromo}
          activeOpacity={0.7}
          onPress={() =>
            rootNav.navigate('Main', {
              screen: 'Leagues',
            } as any)
          }
        >
          <MaterialCommunityIcons name="trophy" size={18} color="#4FC3F7" />
          <View style={{ flex: 1 }}>
            <Text style={styles.leaguesPromoTitle}>{t('dashboard.coinLeagues')}</Text>
            <Text style={styles.leaguesPromoSub}>{t('dashboard.coinLeaguesSub')}</Text>
          </View>
          <Feather name="chevron-right" size={16} color={colors.onSurfaceVariant} />
        </TouchableOpacity>

        {/* Recent Results - shown AFTER engagement content when no live/upcoming (F1 handled above) */}
        {!isF1 && !hasLiveOrUpcoming && recentGames.length > 0 && (
          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="clock-check-outline" size={18} color={colors.primary} />
              <Text style={styles.sectionHeadingRow}>
                {isF1 ? t('dashboard.recentRaces') : t('dashboard.lastResults')}
              </Text>
            </View>
            {recentGames.slice(0, RECENT_GAMES_LIMIT).map((game) => (
              <TouchableOpacity
                key={game.apiId || game._id}
                style={styles.todayCard}
                onPress={() => handleMatchPress(game)}
                activeOpacity={0.7}
              >
                {pickedGameIds.has(game.apiId) && <PickedBadge />}
                {isF1 ? (
                  <View style={styles.f1RecentHeader}>
                    <View style={styles.f1WinnerInfo}>
                      <Text style={styles.f1RaceName}>{game.competitionName || game.leagueName}</Text>
                      <Text style={styles.f1CircuitName}>
                        {game.circuit?.name || game.circuitName || ''} {(game.circuit?.country || game.country) ? ` — ${game.circuit?.country || game.country}` : ''}
                      </Text>
                      {game.results?.[0] && (
                        <View style={styles.f1WinnerRow}>
                          <Ionicons name="trophy" size={12} color={colors.primary} />
                          <Text style={styles.f1WinnerText}>{game.results[0].driverName || 'TBD'}</Text>
                        </View>
                      )}
                      <Text style={styles.recentDateText}>{formatGameTime(game.date, t)}</Text>
                    </View>
                    <View style={styles.f1StatusBadge}>
                      <Text style={styles.f1StatusText}>{game.type || 'Race'}</Text>
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
                      <Text style={styles.recentDateText}>{formatGameTime(game.date, t)}</Text>
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

        {/* Empty State */}
        {!liveGames.length && !recentGames.length && !upcomingGames.length && (
          <View style={styles.emptyState}>
            <Ionicons name="trophy-outline" size={48} color={colors.onSurfaceVariant} />
            <Text style={styles.emptyTitle}>{t('dashboard.noGamesAvailable')}</Text>
            <Text style={styles.emptySubtitle}>
              {featuredLeagues.length > 0
                ? t('dashboard.tapLeague')
                : t('dashboard.pullToRefresh')}
            </Text>
          </View>
        )}

        <View style={{ height: 96 }} />
      </ScrollView>

      {/* F1: Fullscreen circuit image modal */}
      {isF1 && f1NextGpCircuit?.image && (
        <Modal
          visible={f1CircuitModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setF1CircuitModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.f1CircuitModalOverlay}
            activeOpacity={1}
            onPress={() => setF1CircuitModalVisible(false)}
          >
            <View style={styles.f1CircuitModalContent}>
              <ExpoImage
                source={{ uri: f1NextGpCircuit.image }}
                style={styles.f1CircuitModalImage}
                contentFit="contain"
                cachePolicy="memory-disk"
              />
              <Text style={styles.f1CircuitModalName}>{f1NextGpCircuit.name}</Text>
              <Text style={styles.f1CircuitModalLocation}>{f1NextGpCircuit.city}, {f1NextGpCircuit.country}</Text>
            </View>
            <TouchableOpacity style={styles.f1CircuitModalClose} onPress={() => setF1CircuitModalVisible(false)}>
              <Ionicons name="close-circle" size={36} color="#fff" />
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}

      {/* League Selector Bottom Sheet */}
      <Modal visible={showLeagueSheet} animationType="slide" transparent>
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={() => setShowLeagueSheet(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.sheetContainer}>
            {/* Handle */}
            <View style={styles.sheetHandle} />

            {/* Header */}
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{t('dashboard.selectLeague')}</Text>
              <ModalCloseButton onClose={() => setShowLeagueSheet(false)} variant="sheet" />
            </View>

            {/* Search */}
            <View style={styles.sheetSearchWrap}>
              <Ionicons name="search" size={16} color={colors.onSurfaceDim} />
              <TextInput
                style={styles.sheetSearchInput}
                value={leagueSearch}
                onChangeText={setLeagueSearch}
                placeholder={t('dashboard.searchLeagues')}
                placeholderTextColor={colors.onSurfaceDim}
                autoCapitalize="none"
              />
              {leagueSearch.length > 0 && (
                <TouchableOpacity onPress={() => setLeagueSearch('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color={colors.onSurfaceDim} />
                </TouchableOpacity>
              )}
            </View>

            {/* "All" option */}
            <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.sheetLeagueRow, activeLeagueFilter === null && styles.sheetLeagueRowActive]}
                onPress={() => { setActiveLeagueFilter(null); setShowLeagueSheet(false); }}
              >
                <Ionicons name="globe-outline" size={20} color={activeLeagueFilter === null ? colors.primary : colors.onSurfaceVariant} />
                <Text style={[styles.sheetLeagueName, activeLeagueFilter === null && styles.sheetLeagueNameActive]}>
                  {t('dashboard.allLeagues')}
                </Text>
                {activeLeagueFilter === null && (
                  <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={{ marginLeft: 'auto' }} />
                )}
              </TouchableOpacity>

              {/* Domestic Leagues */}
              {filteredSheetLeagues.domestic.length > 0 && (
                <>
                  <Text style={styles.sheetGroupTitle}>{t('dashboard.domesticLeagues')}</Text>
                  {filteredSheetLeagues.domestic.map((league: any) => {
                    const isActive = activeLeagueFilter === league.apiId;
                    return (
                      <TouchableOpacity
                        key={league.apiId}
                        style={[styles.sheetLeagueRow, isActive && styles.sheetLeagueRowActive]}
                        onPress={() => {
                          setActiveLeagueFilter(isActive ? null : league.apiId);
                          setShowLeagueSheet(false);
                        }}
                      >
                        {league.logo ? (
                          <ExpoImage source={{ uri: league.logo }} style={styles.sheetLeagueLogo} contentFit="contain" cachePolicy="memory-disk" />
                        ) : (
                          <Ionicons name="football-outline" size={20} color={colors.onSurfaceVariant} />
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.sheetLeagueName, isActive && styles.sheetLeagueNameActive]} numberOfLines={1}>
                            {league.name}
                          </Text>
                          {league.countryName ? (
                            <Text style={styles.sheetLeagueCountry}>{league.countryName}</Text>
                          ) : null}
                        </View>
                        {isActive ? (
                          <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </>
              )}

              {/* Cup Competitions */}
              {filteredSheetLeagues.cups.length > 0 && (
                <>
                  <Text style={styles.sheetGroupTitle}>{t('dashboard.cupCompetitions')}</Text>
                  {filteredSheetLeagues.cups.map((league: any) => {
                    const isActive = activeLeagueFilter === league.apiId;
                    return (
                      <TouchableOpacity
                        key={league.apiId}
                        style={[styles.sheetLeagueRow, isActive && styles.sheetLeagueRowActive]}
                        onPress={() => {
                          setActiveLeagueFilter(isActive ? null : league.apiId);
                          setShowLeagueSheet(false);
                        }}
                      >
                        {league.logo ? (
                          <ExpoImage source={{ uri: league.logo }} style={styles.sheetLeagueLogo} contentFit="contain" cachePolicy="memory-disk" />
                        ) : (
                          <Ionicons name="trophy-outline" size={20} color={colors.onSurfaceVariant} />
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.sheetLeagueName, isActive && styles.sheetLeagueNameActive]} numberOfLines={1}>
                            {league.name}
                          </Text>
                        </View>
                        {isActive ? (
                          <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </>
              )}

              {/* International */}
              {filteredSheetLeagues.international.length > 0 && (
                <>
                  <Text style={styles.sheetGroupTitle}>{t('dashboard.international')}</Text>
                  {filteredSheetLeagues.international.map((league: any) => {
                    const isActive = activeLeagueFilter === league.apiId;
                    return (
                      <TouchableOpacity
                        key={league.apiId}
                        style={[styles.sheetLeagueRow, isActive && styles.sheetLeagueRowActive]}
                        onPress={() => {
                          setActiveLeagueFilter(isActive ? null : league.apiId);
                          setShowLeagueSheet(false);
                        }}
                      >
                        {league.logo ? (
                          <ExpoImage source={{ uri: league.logo }} style={styles.sheetLeagueLogo} contentFit="contain" cachePolicy="memory-disk" />
                        ) : (
                          <Ionicons name="earth-outline" size={20} color={colors.onSurfaceVariant} />
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.sheetLeagueName, isActive && styles.sheetLeagueNameActive]} numberOfLines={1}>
                            {league.name}
                          </Text>
                        </View>
                        {isActive ? (
                          <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </>
              )}

              <View style={{ height: 40 }} />
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  scrollView: { flex: 1 },

  // League Filter Bar (below sport tabs)
  leagueFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  leagueFilterScroll: {
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 10,
    gap: 8,
  },
  leagueFilterMoreBtn: {
    width: 40,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(202,253,0,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(202,253,0,0.15)',
  },
  leagueFilterPillFirst: {
    marginLeft: 16,
  },
  leagueDropdownBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 8,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  leagueDropdownBtnActive: {
    backgroundColor: 'rgba(202,253,0,0.12)',
    borderColor: colors.primary,
  },
  leagueDropdownText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  leagueDropdownTextActive: {
    color: colors.primary,
    fontFamily: 'Inter_600SemiBold',
  },
  leagueFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  leagueFilterPillActive: {
    backgroundColor: 'rgba(202,253,0,0.12)',
    borderColor: colors.primary,
  },
  leagueFilterPillLocked: {
    opacity: 0.6,
    borderColor: 'rgba(202,253,0,0.15)',
    borderStyle: 'dashed' as any,
  },
  leagueFilterTextLocked: {
    color: 'rgba(255,255,255,0.4)',
  },
  // Bottom Sheet styles
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: colors.surfaceContainerLow,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: Dimensions.get('window').height * 0.7,
    paddingBottom: 20,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  sheetTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 20,
    color: colors.onSurface,
    letterSpacing: -0.5,
  },
  sheetSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderRadius: 10,
    marginHorizontal: 20,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  sheetSearchInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: colors.onSurface,
    padding: 0,
  },
  sheetScroll: {
    paddingHorizontal: 20,
  },
  sheetGroupTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 20,
    marginBottom: 8,
  },
  sheetLeagueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  sheetLeagueRowActive: {
    backgroundColor: 'rgba(202,253,0,0.08)',
  },
  sheetLeagueLogo: {
    width: 24,
    height: 24,
    borderRadius: 4,
  },
  sheetLeagueName: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: colors.onSurface,
  },
  sheetLeagueNameActive: {
    color: colors.primary,
    fontFamily: 'Inter_700Bold',
  },
  sheetLeagueCountry: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: colors.onSurfaceDim,
    marginTop: 1,
  },
  sheetProBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(202,253,0,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  sheetProText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  leagueFilterLogo: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  leagueFilterText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  leagueFilterTextActive: {
    color: colors.primary,
    fontFamily: 'Inter_700Bold',
  },
  sectionWrap: { paddingHorizontal: 16, marginBottom: 24 },

  // Stats Card
  predictorCard: {
    marginHorizontal: 16,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    marginBottom: 16,
    overflow: 'hidden',
    gap: 16,
  },
  predictorTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 20,
    lineHeight: 26,
    color: colors.onSurface,
    letterSpacing: -0.5,
  },
  predictorSubtitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  predictorPts: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: colors.primary,
  },
  statsTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dailyRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(202,253,0,0.04)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  dailyRingValue: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    lineHeight: 22,
    color: '#FFFFFF',
  },
  dailyRingLimit: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  dailyRingLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9,
    lineHeight: 11,
    color: colors.primary,
    letterSpacing: 1,
    marginTop: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainer,
    borderRadius: 12,
    paddingVertical: 14,
  },
  statGridItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: 'rgba(255,255,255,0.06)',
  },
  statGridValue: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 20,
    lineHeight: 26,
    color: colors.onSurface,
  },
  statGridLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    lineHeight: 14,
    color: colors.onSurfaceDim,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  goalLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  questsLink: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 12,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 12 },

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
  f1RecentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 2,
  },
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
  f1CancelledBadge: {
    backgroundColor: 'rgba(239,68,68,0.15)',
  },
  f1CancelledText: {
    color: '#FF6B6B',
  },
  f1CancelledNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  f1CancelledNoticeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#FCA5A5',
    flex: 1,
  },
  f1UpcomingCard: { gap: 6 },
  f1SeasonBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  f1SeasonLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: colors.primary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  f1StandingsCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(202,253,0,0.08)',
  },
  f1StandingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  f1StandingsRowLeader: {
    backgroundColor: 'rgba(202,253,0,0.06)',
  },
  f1StandingsPos: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
    color: colors.onSurfaceVariant,
    minWidth: 28,
  },
  f1StandingsPosPodium: { color: colors.primary },
  f1StandingsDriverImg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  f1StandingsTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  f1StandingsTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  f1StandingsTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  f1StandingsTabText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  f1StandingsTabTextActive: {
    color: colors.background,
  },
  f1StandingsConstructorLogo: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  f1StandingsInfo: { flex: 1, gap: 1 },
  f1StandingsName: { fontFamily: 'Inter_700Bold', fontSize: 13, color: colors.onSurface },
  f1StandingsTeam: { fontFamily: 'Inter_400Regular', fontSize: 10, color: colors.onSurfaceDim },
  f1StandingsPointsCol: { alignItems: 'flex-end' },
  f1StandingsPoints: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, color: colors.primary },
  f1StandingsPtsLabel: { fontFamily: 'Inter_400Regular', fontSize: 8, color: colors.onSurfaceDim, letterSpacing: 1 },
  f1StandingsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
  },
  f1StandingsToggleText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: colors.primary,
  },
  f1GpCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 16,
    padding: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(202,253,0,0.1)',
  },
  f1GpCircuitImage: {
    width: '100%',
    height: 100,
    marginBottom: 8,
    opacity: 0.8,
  },
  f1GpTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 20,
    color: colors.onSurface,
    letterSpacing: -0.5,
  },
  f1GpLocation: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginBottom: 8,
  },
  f1ScheduleList: {
    gap: 4,
    marginTop: 8,
  },
  f1SessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: colors.surfaceContainer,
  },
  f1SessionTypeBadge: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    width: 120,
    alignItems: 'center',
  },
  f1SessionTypeBadgeRace: {
    backgroundColor: 'rgba(202,253,0,0.12)',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  f1SessionTypeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  f1SessionTypeTextRace: {
    color: colors.primary,
  },
  f1SessionInfo: {
    flex: 1,
    gap: 2,
  },
  f1SessionDay: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: colors.onSurface,
  },
  f1SessionTime: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: colors.primary,
  },
  f1WinnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  f1WinnerInfo: {
    flex: 1,
    gap: 2,
  },
  f1WinnerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  f1WinnerText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: colors.primary,
  },
  f1WinnerDriverImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  f1WinnerDriverImgPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  f1WinnerTeamLogoWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  f1WinnerTeamLogo: {
    width: 24,
    height: 24,
  },
  f1WinnerTeamName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  f1WinnerTeamLogoHD: {
    width: 40,
    height: 28,
  },
  f1RecentDate: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.onSurfaceDim,
  },

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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(243,255,202,0.1)',
    padding: 25,
    marginBottom: 24,
    overflow: 'hidden',
  },
  challengeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  challengeHeading: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurface,
    letterSpacing: 0.5,
    flex: 1,
  },
  challengeProgressText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
    color: colors.primary,
  },
  challengeChecklist: { gap: 10, marginBottom: 16 },
  challengeCheckRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  challengeCheckIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: 'rgba(202,253,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  challengeCheckIconDone: {
    backgroundColor: '#5BEF90',
    borderColor: '#5BEF90',
  },
  challengeCheckText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurface,
    flex: 1,
  },
  challengeCheckTextDone: {
    color: colors.onSurfaceVariant,
    textDecorationLine: 'line-through',
  },
  challengeCheckProgress: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 12,
    color: colors.primary,
  },
  challengeCompletedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#5BEF90',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  challengeCompletedText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: '#0B0E11',
    letterSpacing: 0.5,
  },
  submitWrap: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitBtn: {
    flexDirection: 'row',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    gap: 8,
  },
  submitBtnText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 15,
    lineHeight: 20,
    color: '#3A4A00',
    letterSpacing: 0.8,
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

  leaguesPromo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(79,195,247,0.15)',
    padding: 14,
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  leaguesPromoTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    lineHeight: 16,
    color: colors.onSurface,
    letterSpacing: 0.5,
  },
  leaguesPromoSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 16,
    color: colors.onSurfaceVariant,
  },
  f1CircuitModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  f1CircuitModalContent: {
    width: '90%',
    alignItems: 'center',
  },
  f1CircuitModalImage: {
    width: '100%',
    height: 280,
    marginBottom: 16,
  },
  f1CircuitModalName: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 20,
    color: '#fff',
    textAlign: 'center',
  },
  f1CircuitModalLocation: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
    textAlign: 'center',
  },
  f1CircuitModalClose: {
    position: 'absolute',
    top: 60,
    right: 24,
  },
});
