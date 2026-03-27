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
import { useAuth } from '../contexts/AuthContext';
import { footballApi } from '../api';
import type { LeagueDetail, Fixture, StandingEntry } from '../api';
import type { HomeStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<HomeStackParamList>;

const LIVE_STATUSES = ['1H', '2H', 'HT', 'ET', 'P', 'BT', 'LIVE'];
const FINISHED_STATUSES = ['FT', 'AET', 'PEN'];

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
      <Ionicons name="football" size={size * 0.5} color={colors.onSurfaceVariant} />
    </View>
  );
}

type TabKey = 'matches' | 'standings';

export function LeagueDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<any>();
  const { leagueApiId, leagueName } = route.params as {
    leagueApiId: number;
    leagueName: string;
  };
  const { tokens } = useAuth();

  const [data, setData] = useState<LeagueDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('matches');

  const fetchLeague = useCallback(async () => {
    if (!tokens?.accessToken) return;
    try {
      const result = await footballApi.getLeagueDetail(tokens.accessToken, leagueApiId);
      setData(result);
    } catch (err) {
      console.log('League detail fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tokens?.accessToken, leagueApiId]);

  useEffect(() => {
    fetchLeague();
  }, [fetchLeague]);

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
  const live = data?.liveFixtures ?? [];
  const upcoming = data?.upcomingFixtures ?? [];
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
                {league.countryFlag} {league.countryName}
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
              {tab === 'matches' ? 'MATCHES' : 'STANDINGS'}
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
            onFixturePress={(id) => navigation.navigate('MatchPrediction', { fixtureApiId: id })}
          />
        ) : (
          <StandingsTab standings={standings} />
        )}
        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

function MatchesTab({
  live,
  upcoming,
  recent,
  onFixturePress,
}: {
  live: Fixture[];
  upcoming: Fixture[];
  recent: Fixture[];
  onFixturePress: (id: number) => void;
}) {
  return (
    <>
      {/* Live */}
      {live.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionDot} />
            <Text style={styles.sectionTitle}>LIVE</Text>
            <Text style={styles.sectionCount}>{live.length}</Text>
          </View>
          {live.map((f) => (
            <FixtureCard key={f.apiId} fixture={f} isLive onPress={() => onFixturePress(f.apiId)} />
          ))}
        </View>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time-outline" size={16} color={colors.primary} />
            <Text style={styles.sectionTitle}>UPCOMING</Text>
          </View>
          {upcoming.map((f) => (
            <FixtureCard key={f.apiId} fixture={f} onPress={() => onFixturePress(f.apiId)} />
          ))}
        </View>
      )}

      {/* Recent Results */}
      {recent.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="clock-check-outline" size={16} color={colors.primary} />
            <Text style={styles.sectionTitle}>RECENT RESULTS</Text>
          </View>
          {recent.map((f) => (
            <FixtureCard key={f.apiId} fixture={f} onPress={() => onFixturePress(f.apiId)} />
          ))}
        </View>
      )}

      {live.length === 0 && upcoming.length === 0 && recent.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="football-outline" size={48} color={colors.onSurfaceVariant} />
          <Text style={styles.emptyTitle}>No matches available</Text>
          <Text style={styles.emptySubtitle}>Pull down to refresh</Text>
        </View>
      )}
    </>
  );
}

function FixtureCard({
  fixture,
  isLive,
  onPress,
}: {
  fixture: Fixture;
  isLive?: boolean;
  onPress: () => void;
}) {
  const isFinished = FINISHED_STATUSES.includes(fixture.status);
  const showScore = isLive || isFinished;

  return (
    <TouchableOpacity style={styles.fixtureCard} onPress={onPress} activeOpacity={0.7}>
      {isLive && <View style={styles.fixtureAccent} />}
      <View style={styles.fixtureTopRow}>
        <Text style={styles.fixtureRound}>{fixture.leagueRound || ''}</Text>
        <View style={[styles.fixtureBadge, isLive && styles.fixtureBadgeLive]}>
          <Text style={[styles.fixtureBadgeText, isLive && styles.fixtureBadgeTextLive]}>
            {getStatusLabel(fixture)}
          </Text>
        </View>
      </View>
      <View style={styles.fixtureTeamsRow}>
        <View style={styles.fixtureTeamCol}>
          <TeamLogo uri={fixture.homeTeam.logo} size={32} />
          <Text style={styles.fixtureTeamName} numberOfLines={1}>
            {fixture.homeTeam.name}
          </Text>
        </View>
        <View style={styles.fixtureScoreCol}>
          {showScore ? (
            <>
              <Text style={styles.fixtureScore}>{fixture.homeGoals}</Text>
              <Text style={styles.fixtureScoreSep}>-</Text>
              <Text style={styles.fixtureScore}>{fixture.awayGoals}</Text>
            </>
          ) : (
            <Text style={styles.fixtureVs}>VS</Text>
          )}
        </View>
        <View style={styles.fixtureTeamCol}>
          <TeamLogo uri={fixture.awayTeam.logo} size={32} />
          <Text style={styles.fixtureTeamName} numberOfLines={1}>
            {fixture.awayTeam.name}
          </Text>
        </View>
      </View>
      {isFinished && (
        <Text style={styles.fixtureDate}>
          {new Date(fixture.date).toLocaleDateString([], {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })}
        </Text>
      )}
    </TouchableOpacity>
  );
}

function StandingsTab({ standings }: { standings: StandingEntry[] | null | undefined }) {
  if (!standings || standings.length === 0) {
    return (
      <View style={styles.emptyState}>
        <MaterialCommunityIcons name="trophy-outline" size={48} color={colors.onSurfaceVariant} />
        <Text style={styles.emptyTitle}>Standings not available</Text>
        <Text style={styles.emptySubtitle}>Pull down to refresh</Text>
      </View>
    );
  }

  return (
    <View style={styles.standingsWrap}>
      {/* Header */}
      <View style={styles.standingsHeaderRow}>
        <Text style={[styles.standingsHeaderCell, { width: 32 }]}>#</Text>
        <Text style={[styles.standingsHeaderCell, { flex: 1 }]}>Team</Text>
        <Text style={[styles.standingsHeaderCell, styles.standingsNumCell]}>P</Text>
        <Text style={[styles.standingsHeaderCell, styles.standingsNumCell]}>W</Text>
        <Text style={[styles.standingsHeaderCell, styles.standingsNumCell]}>D</Text>
        <Text style={[styles.standingsHeaderCell, styles.standingsNumCell]}>L</Text>
        <Text style={[styles.standingsHeaderCell, styles.standingsNumCell]}>GD</Text>
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
          <Text style={[styles.standingsCell, styles.standingsNumCell]}>{entry.played}</Text>
          <Text style={[styles.standingsCell, styles.standingsNumCell]}>{entry.won}</Text>
          <Text style={[styles.standingsCell, styles.standingsNumCell]}>{entry.drawn}</Text>
          <Text style={[styles.standingsCell, styles.standingsNumCell]}>{entry.lost}</Text>
          <Text style={[styles.standingsCell, styles.standingsNumCell]}>
            {entry.goalDifference > 0 ? `+${entry.goalDifference}` : entry.goalDifference}
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
      {/* Form legend */}
      <View style={styles.formLegend}>
        <View style={[styles.formDot, { backgroundColor: '#4CAF50' }]} />
        <Text style={styles.formLegendText}>Champions League</Text>
        <View style={[styles.formDot, { backgroundColor: colors.error }]} />
        <Text style={styles.formLegendText}>Relegation</Text>
      </View>
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
  formLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
  },
  formDot: { width: 10, height: 10, borderRadius: 5 },
  formLegendText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: colors.onSurfaceDim,
    marginRight: 12,
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
