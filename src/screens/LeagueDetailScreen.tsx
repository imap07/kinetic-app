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
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme';
import Toast from 'react-native-toast-message';
import { useAuth } from '../contexts/AuthContext';
import { usePurchases } from '../contexts/PurchasesContext';
import { leaguesApi } from '../api/leagues';
import type { CoinLeague } from '../api/leagues';
import { sportsApi } from '../api/sports';
import type { SportKey, SportLeagueDetail, SportGame, SportStandingEntry } from '../api/sports';
import type { HomeStackParamList, RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<HomeStackParamList>;

const LIVE_STATUSES = ['1H', '2H', 'HT', 'ET', 'P', 'BT', 'LIVE', 'Q1', 'Q2', 'Q3', 'Q4', 'OT', 'P1', 'P2', 'P3', 'IN1', 'IN2', 'IN3', 'IN4', 'IN5', 'IN6', 'IN7', 'IN8', 'IN9'];
const FINISHED_STATUSES = ['FT', 'AET', 'PEN', 'AOT', 'AP', 'POST', 'Completed'];

function getStatusLabel(game: SportGame): string {
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

function TeamLogo({ uri, size = 28 }: { uri?: string; size?: number }) {
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

type TabKey = 'matches' | 'standings';

export function LeagueDetailScreen() {
  const navigation = useNavigation<Nav>();
  const rootNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<any>();
  const { leagueApiId, leagueName, sport, tier } = route.params as {
    leagueApiId: number;
    leagueName: string;
    sport: SportKey;
    tier?: 'free' | 'premium';
  };
  const { tokens } = useAuth();
  const { isProMember } = usePurchases();

  // If this is a premium league and user isn't pro, redirect to paywall
  useEffect(() => {
    if (tier === 'premium' && !isProMember) {
      rootNav.navigate('Paywall', {
        trigger: 'premium_league',
        sportName: leagueName,
      });
      navigation.goBack();
    }
  }, [tier, isProMember]);

  const [data, setData] = useState<SportLeagueDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('matches');
  const [coinLeagues, setCoinLeagues] = useState<CoinLeague[]>([]);
  const [coinLeaguesLoading, setCoinLeaguesLoading] = useState(true);

  const isF1 = sport === 'formula-1';

  const fetchLeague = useCallback(async () => {
    if (!tokens?.accessToken) return;
    try {
      const result = await sportsApi.getLeagueDetail(tokens.accessToken, sport, leagueApiId);
      setData(result);
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error loading league', text2: 'Pull down to try again' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tokens?.accessToken, leagueApiId, sport]);

  const fetchCoinLeagues = useCallback(async () => {
    if (!tokens?.accessToken) return;
    setCoinLeaguesLoading(true);
    try {
      const result = await leaguesApi.getThemedLeagues(tokens.accessToken, leagueApiId);
      setCoinLeagues(result.leagues);
    } catch {
      // Silently fail - CoinLeagues are optional
    } finally {
      setCoinLeaguesLoading(false);
    }
  }, [tokens?.accessToken, leagueApiId]);

  useEffect(() => {
    fetchLeague();
    fetchCoinLeagues();
  }, [fetchLeague, fetchCoinLeagues]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLeague();
  }, [fetchLeague]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Fetching {leagueName} data...</Text>
        </View>
      </View>
    );
  }

  const league = data?.league;
  const standings = data?.standings;
  const live = data?.liveGames ?? [];
  const upcoming = data?.upcomingGames ?? [];
  const recent = data?.recentResults ?? [];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          {league?.logo ? (
            <Image source={{ uri: league.logo }} style={styles.headerLogo} resizeMode="contain" />
          ) : null}
          <View>
            <Text style={styles.headerTitle}>{leagueName}</Text>
            {league?.countryName ? (
              <Text style={styles.headerSubtitle}>
                {league.countryName}
              </Text>
            ) : null}
          </View>
        </View>
        {data?.source === 'api' ? (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </View>
        ) : (
          <View style={styles.cacheBadge}>
            <Text style={styles.cacheBadgeText}>CACHED</Text>
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {(['matches', 'standings'] as TabKey[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'matches'
                ? isF1 ? 'RACES' : 'MATCHES'
                : isF1 ? 'DRIVER STANDINGS' : 'STANDINGS'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {activeTab === 'matches' ? (
          <MatchesTab
            live={live}
            upcoming={upcoming}
            recent={recent}
            sport={sport}
            onGamePress={(id) => navigation.navigate('MatchPrediction', { fixtureApiId: id, sport })}
          />
        ) : (
          <StandingsTab standings={standings} sport={sport} />
        )}
        {/* League CoinLeagues */}
        <View style={styles.coinLeaguesSection}>
          <View style={styles.coinLeaguesSectionHeader}>
            <MaterialCommunityIcons name="trophy" size={18} color="#4FC3F7" />
            <Text style={styles.coinLeaguesSectionTitle}>League CoinLeagues</Text>
          </View>
          {coinLeaguesLoading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 16 }} />
          ) : coinLeagues.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.coinLeaguesScroll}
            >
              {coinLeagues.map((cl) => (
                <TouchableOpacity
                  key={cl._id}
                  style={styles.coinLeagueCard}
                  onPress={() =>
                    rootNav.navigate('Main', {
                      screen: 'Leagues',
                    } as any)
                  }
                  activeOpacity={0.7}
                >
                  <Text style={styles.coinLeagueName} numberOfLines={1}>{cl.name}</Text>
                  <View style={styles.coinLeagueRow}>
                    <Ionicons name="ticket-outline" size={12} color={colors.primary} />
                    <Text style={styles.coinLeagueDetail}>{cl.entryFee} coins</Text>
                  </View>
                  <View style={styles.coinLeagueRow}>
                    <Ionicons name="people-outline" size={12} color={colors.onSurfaceVariant} />
                    <Text style={styles.coinLeagueDetail}>
                      {cl.participants.length}/{cl.maxParticipants}
                    </Text>
                  </View>
                  <View style={styles.coinLeagueRow}>
                    <Ionicons name="trophy-outline" size={12} color={colors.primary} />
                    <Text style={styles.coinLeaguePrize}>{cl.prizePool} coins</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <TouchableOpacity
              style={styles.coinLeagueCta}
              onPress={() => {
                // Navigate to CoinLeagues tab — the create modal can be opened there
                rootNav.navigate('Main', {
                  screen: 'Leagues',
                } as any);
              }}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="plus-circle-outline" size={20} color={colors.primary} />
              <Text style={styles.coinLeagueCtaText}>
                Create a CoinLeague for {leagueName}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

function MatchesTab({
  live,
  upcoming,
  recent,
  sport,
  onGamePress,
}: {
  live: SportGame[];
  upcoming: SportGame[];
  recent: SportGame[];
  sport: SportKey;
  onGamePress: (id: number) => void;
}) {
  const isF1 = sport === 'formula-1';

  return (
    <>
      {live.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionDot} />
            <Text style={styles.sectionTitle}>LIVE</Text>
            <Text style={styles.sectionCount}>{live.length}</Text>
          </View>
          {live.map((g) => (
            <GameCard key={g.apiId || g._id} game={g} isLive isF1={isF1} onPress={() => onGamePress(g.apiId)} />
          ))}
        </View>
      )}

      {upcoming.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time-outline" size={16} color={colors.primary} />
            <Text style={styles.sectionTitle}>{isF1 ? 'UPCOMING RACES' : 'UPCOMING'}</Text>
          </View>
          {upcoming.map((g) => (
            <GameCard key={g.apiId || g._id} game={g} isF1={isF1} onPress={() => onGamePress(g.apiId)} />
          ))}
        </View>
      )}

      {recent.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="clock-check-outline" size={16} color={colors.primary} />
            <Text style={styles.sectionTitle}>{isF1 ? 'RACE RESULTS' : 'RECENT RESULTS'}</Text>
          </View>
          {recent.map((g) => (
            <GameCard key={g.apiId || g._id} game={g} isF1={isF1} onPress={() => onGamePress(g.apiId)} />
          ))}
        </View>
      )}

      {live.length === 0 && upcoming.length === 0 && recent.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="trophy-outline" size={48} color={colors.onSurfaceVariant} />
          <Text style={styles.emptyTitle}>No data available</Text>
          <Text style={styles.emptySubtitle}>Pull down to refresh</Text>
        </View>
      )}
    </>
  );
}

function GameCard({
  game,
  isLive,
  isF1,
  onPress,
}: {
  game: SportGame;
  isLive?: boolean;
  isF1?: boolean;
  onPress: () => void;
}) {
  const isFinished = FINISHED_STATUSES.includes(game.status);
  const showScore = isLive || isFinished;

  if (isF1) {
    return (
      <TouchableOpacity style={styles.fixtureCard} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.f1Row}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.fixtureTeamName}>{game.competitionName || game.leagueName}</Text>
            <Text style={styles.f1CircuitText}>
              {game.circuit?.name ?? ''} {game.circuit?.country ? `- ${game.circuit.country}` : ''}
            </Text>
          </View>
          <View style={[styles.fixtureBadge, isLive && styles.fixtureBadgeLive]}>
            <Text style={[styles.fixtureBadgeText, isLive && styles.fixtureBadgeTextLive]}>
              {game.status}
            </Text>
          </View>
        </View>
        <Text style={styles.fixtureDate}>
          {new Date(game.date).toLocaleDateString([], {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.fixtureCard} onPress={onPress} activeOpacity={0.7}>
      {isLive && <View style={styles.fixtureAccent} />}
      <View style={styles.fixtureTopRow}>
        <Text style={styles.fixtureRound}>{game.leagueName || ''}</Text>
        <View style={[styles.fixtureBadge, isLive && styles.fixtureBadgeLive]}>
          <Text style={[styles.fixtureBadgeText, isLive && styles.fixtureBadgeTextLive]}>
            {getStatusLabel(game)}
          </Text>
        </View>
      </View>
      <View style={styles.fixtureTeamsRow}>
        <View style={styles.fixtureTeamCol}>
          <TeamLogo uri={game.homeTeam?.logo} size={32} />
          <Text style={styles.fixtureTeamName} numberOfLines={1}>
            {game.homeTeam?.name}
          </Text>
        </View>
        <View style={styles.fixtureScoreCol}>
          {showScore ? (
            <>
              <Text style={styles.fixtureScore}>{game.homeTotal ?? '-'}</Text>
              <Text style={styles.fixtureScoreSep}>-</Text>
              <Text style={styles.fixtureScore}>{game.awayTotal ?? '-'}</Text>
            </>
          ) : (
            <Text style={styles.fixtureVs}>VS</Text>
          )}
        </View>
        <View style={styles.fixtureTeamCol}>
          <TeamLogo uri={game.awayTeam?.logo} size={32} />
          <Text style={styles.fixtureTeamName} numberOfLines={1}>
            {game.awayTeam?.name}
          </Text>
        </View>
      </View>
      {isFinished && (
        <Text style={styles.fixtureDate}>
          {new Date(game.date).toLocaleDateString([], {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })}
        </Text>
      )}
    </TouchableOpacity>
  );
}

function StandingsTab({ standings, sport }: { standings: SportStandingEntry[] | null | undefined; sport: SportKey }) {
  if (!standings || standings.length === 0) {
    return (
      <View style={styles.emptyState}>
        <MaterialCommunityIcons name="trophy-outline" size={48} color={colors.onSurfaceVariant} />
        <Text style={styles.emptyTitle}>Standings not available</Text>
        <Text style={styles.emptySubtitle}>Pull down to refresh</Text>
      </View>
    );
  }

  const isF1 = sport === 'formula-1';

  if (isF1) {
    return (
      <View style={styles.standingsWrap}>
        <View style={styles.standingsHeaderRow}>
          <Text style={[styles.standingsHeaderCell, { width: 32 }]}>#</Text>
          <Text style={[styles.standingsHeaderCell, { flex: 1 }]}>Driver</Text>
          <Text style={[styles.standingsHeaderCell, styles.standingsNumCell]}>Team</Text>
          <Text style={[styles.standingsHeaderCell, styles.standingsNumCell, { width: 48 }]}>Wins</Text>
          <Text style={[styles.standingsHeaderCell, styles.standingsNumCell, { color: colors.primary }]}>
            Pts
          </Text>
        </View>
        {standings.map((entry) => (
          <View key={entry.rank} style={styles.standingsRow}>
            <Text style={[styles.standingsCell, { width: 32, fontFamily: 'Inter_700Bold' }]}>
              {entry.rank}
            </Text>
            <View style={[styles.standingsTeamCell, { flex: 1 }]}>
              {entry.driverImage ? (
                <Image source={{ uri: entry.driverImage }} style={{ width: 20, height: 20, borderRadius: 10 }} resizeMode="contain" />
              ) : (
                <TeamLogo uri={entry.teamLogo} size={20} />
              )}
              <Text style={styles.standingsTeamName} numberOfLines={1}>
                {entry.driverName || entry.teamName}
              </Text>
            </View>
            <Text style={[styles.standingsCell, styles.standingsNumCell]} numberOfLines={1}>
              {entry.teamName?.substring(0, 6) ?? ''}
            </Text>
            <Text style={[styles.standingsCell, styles.standingsNumCell, { width: 48 }]}>
              {entry.wins ?? '-'}
            </Text>
            <Text
              style={[
                styles.standingsCell,
                styles.standingsNumCell,
                { fontFamily: 'Inter_700Bold', color: colors.primary },
              ]}
            >
              {entry.points}
            </Text>
          </View>
        ))}
      </View>
    );
  }

  const hasDrawn = standings.some((e) => e.drawn !== undefined && e.drawn !== null);

  return (
    <View style={styles.standingsWrap}>
      <View style={styles.standingsHeaderRow}>
        <Text style={[styles.standingsHeaderCell, { width: 32 }]}>#</Text>
        <Text style={[styles.standingsHeaderCell, { flex: 1 }]}>Team</Text>
        <Text style={[styles.standingsHeaderCell, styles.standingsNumCell]}>P</Text>
        <Text style={[styles.standingsHeaderCell, styles.standingsNumCell]}>W</Text>
        {hasDrawn && <Text style={[styles.standingsHeaderCell, styles.standingsNumCell]}>D</Text>}
        <Text style={[styles.standingsHeaderCell, styles.standingsNumCell]}>L</Text>
        <Text style={[styles.standingsHeaderCell, styles.standingsNumCell, { color: colors.primary }]}>
          Pts
        </Text>
      </View>
      {standings.map((entry) => (
        <View
          key={entry.rank}
          style={[
            styles.standingsRow,
            entry.rank <= 4 && styles.standingsRowCL,
            entry.rank >= standings.length - 2 && styles.standingsRowRel,
          ]}
        >
          <Text style={[styles.standingsCell, { width: 32, fontFamily: 'Inter_700Bold' }]}>
            {entry.rank}
          </Text>
          <View style={[styles.standingsTeamCell, { flex: 1 }]}>
            <TeamLogo uri={entry.teamLogo} size={20} />
            <Text style={styles.standingsTeamName} numberOfLines={1}>
              {entry.teamName}
            </Text>
          </View>
          <Text style={[styles.standingsCell, styles.standingsNumCell]}>{entry.played ?? '-'}</Text>
          <Text style={[styles.standingsCell, styles.standingsNumCell]}>{entry.won ?? '-'}</Text>
          {hasDrawn && <Text style={[styles.standingsCell, styles.standingsNumCell]}>{entry.drawn ?? '-'}</Text>}
          <Text style={[styles.standingsCell, styles.standingsNumCell]}>{entry.lost ?? '-'}</Text>
          <Text
            style={[
              styles.standingsCell,
              styles.standingsNumCell,
              { fontFamily: 'Inter_700Bold', color: colors.primary },
            ]}
          >
            {entry.points ?? '-'}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
    gap: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLow,
  },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerLogo: { width: 36, height: 36 },
  headerTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 20,
    lineHeight: 26,
    color: colors.onSurface,
  },
  headerSubtitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(202,253,0,0.12)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  liveBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: colors.primary,
    letterSpacing: 1,
  },
  cacheBadge: {
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  cacheBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: colors.onSurfaceDim,
    letterSpacing: 1,
  },

  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: colors.primary },
  tabText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    letterSpacing: 1,
    color: colors.onSurfaceVariant,
  },
  tabTextActive: { color: colors.onPrimary },

  scroll: { flex: 1 },
  section: { paddingHorizontal: 16, marginBottom: 24 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    color: colors.onSurface,
    letterSpacing: -0.3,
    flex: 1,
  },
  sectionCount: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: colors.primary,
    backgroundColor: 'rgba(202,253,0,0.1)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.tertiaryLight,
  },

  fixtureCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 8,
    padding: 14,
    marginBottom: 8,
    gap: 10,
    overflow: 'hidden',
  },
  fixtureAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.tertiaryLight,
  },
  fixtureTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fixtureRound: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.onSurfaceDim,
    flex: 1,
  },
  fixtureBadge: {
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  fixtureBadgeLive: { backgroundColor: colors.tertiary },
  fixtureBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  fixtureBadgeTextLive: { color: '#220600' },
  fixtureTeamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fixtureTeamCol: { flex: 1, alignItems: 'center', gap: 6 },
  fixtureTeamName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: colors.onSurface,
    textAlign: 'center',
  },
  fixtureScoreCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  fixtureScore: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 24,
    color: colors.onSurface,
  },
  fixtureScoreSep: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    color: colors.onSurfaceVariant,
  },
  fixtureVs: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    color: colors.onSurfaceVariant,
  },
  fixtureDate: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.onSurfaceDim,
    textAlign: 'center',
  },

  f1Row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  f1CircuitText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },

  // Standings
  standingsWrap: { paddingHorizontal: 16 },
  standingsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outline,
  },
  standingsHeaderCell: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: colors.onSurfaceDim,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  standingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  standingsRowCL: { borderLeftWidth: 3, borderLeftColor: '#4CAF50', paddingLeft: 4 },
  standingsRowRel: { borderLeftWidth: 3, borderLeftColor: colors.error, paddingLeft: 4 },
  standingsCell: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.onSurface,
    textAlign: 'center',
  },
  standingsNumCell: { width: 32 },
  standingsTeamCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  standingsTeamName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: colors.onSurface,
    flex: 1,
  },

  // CoinLeagues
  coinLeaguesSection: {
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 8,
  },
  coinLeaguesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  coinLeaguesSectionTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    color: colors.onSurface,
    letterSpacing: -0.3,
  },
  coinLeaguesScroll: {
    gap: 10,
  },
  coinLeagueCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 10,
    padding: 14,
    minWidth: 160,
    gap: 8,
  },
  coinLeagueName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurface,
    marginBottom: 2,
  },
  coinLeagueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  coinLeagueDetail: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    lineHeight: 16,
    color: colors.onSurfaceVariant,
  },
  coinLeaguePrize: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    lineHeight: 16,
    color: colors.primary,
  },
  coinLeagueCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(202,253,0,0.15)',
    padding: 16,
  },
  coinLeagueCtaText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurface,
    flex: 1,
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    gap: 12,
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
