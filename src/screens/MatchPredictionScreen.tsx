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
import { useRoute } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { footballApi } from '../api';
import type { Fixture, FixtureEvent, FixtureStatistic } from '../api';

type Props = {
  navigation: any;
};

const LIVE_STATUSES = ['1H', '2H', 'HT', 'ET', 'P', 'BT', 'LIVE'];
const FINISHED_STATUSES = ['FT', 'AET', 'PEN'];

function getStatusDisplay(fixture: Fixture): { label: string; isLive: boolean } {
  if (LIVE_STATUSES.includes(fixture.status)) {
    return {
      label: fixture.elapsed ? `LIVE \u2022 ${fixture.elapsed}'` : 'LIVE',
      isLive: true,
    };
  }
  if (FINISHED_STATUSES.includes(fixture.status)) {
    return { label: fixture.statusLong || 'Full Time', isLive: false };
  }
  if (fixture.status === 'HT') return { label: 'Half Time', isLive: true };
  const time = new Date(fixture.date).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  return { label: time, isLive: false };
}

function getEventIcon(event: FixtureEvent) {
  const type = event.type?.toLowerCase();
  const detail = event.detail?.toLowerCase() || '';

  if (type === 'goal') {
    return { icon: 'football', lib: 'ion' as const, color: colors.primary, bg: colors.primary };
  }
  if (type === 'card' && detail.includes('yellow')) {
    return { icon: 'yellow', lib: 'card' as const, color: '#FACC15', bg: colors.surfaceContainerHighest };
  }
  if (type === 'card' && detail.includes('red')) {
    return { icon: 'red', lib: 'card' as const, color: '#DC2626', bg: colors.surfaceContainerHighest };
  }
  if (type === 'subst') {
    return { icon: 'swap-horizontal', lib: 'mci' as const, color: colors.onSurfaceVariant, bg: colors.surfaceContainerHighest };
  }
  if (type === 'var') {
    return { icon: 'monitor', lib: 'mci' as const, color: colors.info, bg: colors.surfaceContainerHighest };
  }
  return { icon: 'ellipse', lib: 'ion' as const, color: colors.onSurfaceVariant, bg: colors.surfaceContainerHighest };
}

function TeamLogo({ uri, size = 64 }: { uri?: string; size?: number }) {
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
      <Ionicons name="football" size={size * 0.45} color={colors.onSurfaceVariant} />
    </View>
  );
}

function getStatValue(stats: FixtureStatistic[], key: string): [string | null, string | null] {
  if (stats.length < 2) return [null, null];
  const home = stats[0]?.stats?.[key] ?? null;
  const away = stats[1]?.stats?.[key] ?? null;
  return [home !== null ? String(home) : null, away !== null ? String(away) : null];
}

function parsePossession(val: string | null): number {
  if (!val) return 50;
  const num = parseInt(val, 10);
  return isNaN(num) ? 50 : num;
}

const STAT_KEYS = [
  { key: 'Shots on Goal', label: 'SHOTS ON GOAL' },
  { key: 'Total Shots', label: 'TOTAL SHOTS' },
  { key: 'Corner Kicks', label: 'CORNERS' },
  { key: 'Fouls', label: 'FOULS' },
  { key: 'Offsides', label: 'OFFSIDES' },
];

export function MatchPredictionScreen({ navigation }: Props) {
  const route = useRoute<any>();
  const { fixtureApiId, sport } = route.params as { fixtureApiId: number; sport?: string };
  const { tokens } = useAuth();
  const [fixture, setFixture] = useState<Fixture | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFixture = useCallback(async () => {
    if (!tokens?.accessToken) return;
    try {
      const { fixture: f } = await footballApi.getFixtureDetail(
        tokens.accessToken,
        fixtureApiId,
      );
      setFixture(f);
    } catch (err) {
      console.log('Fixture fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tokens?.accessToken, fixtureApiId]);

  useEffect(() => {
    fetchFixture();
  }, [fetchFixture]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchFixture();
  }, [fetchFixture]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.brandText}>KINETIC</Text>
          <View style={{ width: 30 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!fixture) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.brandText}>KINETIC</Text>
          <View style={{ width: 30 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.onSurfaceVariant} />
          <Text style={styles.emptyText}>Match not found</Text>
        </View>
      </View>
    );
  }

  const status = getStatusDisplay(fixture);
  const events = fixture.events || [];
  const stats = fixture.statistics || [];
  const [homePoss, awayPoss] = getStatValue(stats, 'Ball Possession');
  const homePossNum = parsePossession(homePoss);
  const awayPossNum = 100 - homePossNum;

  const sortedEvents = [...events].sort(
    (a, b) => (b.timeElapsed || 0) - (a.timeElapsed || 0),
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.brandText}>KINETIC</Text>
        <TouchableOpacity>
          <Feather name="bell" size={22} color={colors.onSurface} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Status Badge */}
        <View style={styles.statusBadgeContainer}>
          <View style={[styles.statusBadge, status.isLive && styles.statusBadgeLive]}>
            {status.isLive && <View style={styles.statusDot} />}
            <Text style={[styles.statusBadgeText, status.isLive && styles.statusBadgeTextLive]}>
              {status.label}
            </Text>
          </View>
        </View>

        {/* Score Section */}
        <View style={styles.scoreSection}>
          <View style={styles.teamsRow}>
            <View style={styles.teamCol}>
              <TeamLogo uri={fixture.homeTeam.logo} size={72} />
              <Text style={styles.teamName}>{fixture.homeTeam.name}</Text>
            </View>

            <View style={styles.scoreCol}>
              <View style={styles.scoreRow}>
                <Text style={styles.scoreNum}>{fixture.homeGoals}</Text>
                <Text style={styles.scoreDivider}>:</Text>
                <Text style={styles.scoreNum}>{fixture.awayGoals}</Text>
              </View>
              {fixture.goalsHalftime?.home !== null && (
                <Text style={styles.halftimeText}>
                  HT: {fixture.goalsHalftime.home} - {fixture.goalsHalftime.away}
                </Text>
              )}
            </View>

            <View style={styles.teamCol}>
              <TeamLogo uri={fixture.awayTeam.logo} size={72} />
              <Text style={styles.teamName}>{fixture.awayTeam.name}</Text>
            </View>
          </View>

          <View style={styles.leaguePill}>
            {fixture.leagueLogo ? (
              <Image
                source={{ uri: fixture.leagueLogo }}
                style={styles.leaguePillLogo}
                resizeMode="contain"
              />
            ) : null}
            <Text style={styles.leaguePillText}>
              {fixture.leagueName}
              {fixture.leagueRound ? ` \u2022 ${fixture.leagueRound}` : ''}
            </Text>
          </View>
        </View>

        {/* Match Statistics */}
        {stats.length >= 2 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>MATCH STATISTICS</Text>

            {/* Possession */}
            <View style={styles.possessionBlock}>
              <View style={styles.possessionHeader}>
                <Text style={styles.possessionHomeLabel}>
                  POSSESSION ({homePoss || `${homePossNum}%`})
                </Text>
                <Text style={styles.possessionAwayLabel}>
                  {awayPoss || `${awayPossNum}%`}
                </Text>
              </View>
              <View style={styles.possessionTrack}>
                <View style={[styles.possessionHome, { flex: homePossNum }]} />
                <View style={[styles.possessionAway, { flex: awayPossNum }]} />
              </View>
            </View>

            {/* Other Stats */}
            {STAT_KEYS.map(({ key, label }) => {
              const [homeVal, awayVal] = getStatValue(stats, key);
              if (homeVal === null && awayVal === null) return null;
              const hNum = parseInt(homeVal || '0', 10);
              const aNum = parseInt(awayVal || '0', 10);
              const total = hNum + aNum || 1;
              const homePercent = Math.round((hNum / total) * 100);
              return (
                <View key={key} style={styles.statRow}>
                  <View style={styles.statHeader}>
                    <Text style={styles.statLabel}>{label}</Text>
                    <Text style={styles.statValue}>
                      {homeVal || '0'} / {awayVal || '0'}
                    </Text>
                  </View>
                  <View style={styles.statBarBg}>
                    <View style={[styles.statBarHome, { width: `${homePercent}%` }]} />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Events Timeline */}
        {sortedEvents.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>MATCH EVENTS</Text>
            <View style={styles.timeline}>
              <View style={styles.timelineLine} />
              {sortedEvents.map((event, idx) => {
                const evtStyle = getEventIcon(event);
                return (
                  <View key={idx} style={styles.timelineEvent}>
                    <View style={[styles.timelineDot, { backgroundColor: evtStyle.bg }]}>
                      {evtStyle.lib === 'ion' && (
                        <Ionicons name="football" size={12} color={colors.onPrimary} />
                      )}
                      {evtStyle.lib === 'mci' && (
                        <MaterialCommunityIcons
                          name={evtStyle.icon as any}
                          size={12}
                          color={evtStyle.color}
                        />
                      )}
                      {evtStyle.lib === 'card' && (
                        <View
                          style={{
                            width: 8,
                            height: 12,
                            borderRadius: 1,
                            backgroundColor: evtStyle.color,
                          }}
                        />
                      )}
                    </View>
                    <View style={styles.timelineCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.timelineMinute}>
                          {event.timeElapsed}'
                          {event.timeExtra ? `+${event.timeExtra}` : ''}{' '}
                          {event.detail || event.type}
                        </Text>
                        <Text style={styles.timelinePlayer}>
                          {event.playerName}
                          {event.assistName ? ` (${event.assistName})` : ''}
                        </Text>
                        <Text style={styles.timelineTeam}>{event.teamName}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Predictions (static product feature) */}
        <View style={styles.predictCard}>
          <View style={styles.predictHeader}>
            <Text style={styles.cardTitle}>MATCH PREDICTIONS</Text>
            <MaterialCommunityIcons name="access-point" size={20} color={colors.onSurfaceVariant} />
          </View>
          <Text style={styles.predictSectionLabel}>PREDICT RESULT (1X2)</Text>
          <Text style={styles.predictMatchLabel}>
            {fixture.homeTeam.name} vs {fixture.awayTeam.name}
          </Text>
          {[
            { label: `${fixture.homeTeam.name} WIN`, pts: '+15 pts' },
            { label: 'DRAW OUTCOME', pts: '+45 pts' },
            { label: `${fixture.awayTeam.name} WIN`, pts: '+120 pts' },
          ].map((p, idx) => (
            <TouchableOpacity key={idx} style={styles.predictBtn}>
              <View>
                <Text style={styles.predictBtnLabel}>{p.label}</Text>
                <Text style={styles.predictBtnPts}>{p.pts}</Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.submitButton}
            onPress={() => {
              const state = navigation.getState();
              const currentRouteName = state?.routes?.[state.index]?.name;
              if (currentRouteName === 'LiveMatchPrediction') {
                navigation.navigate('LivePickSummary');
              } else {
                navigation.navigate('PickSummary');
              }
            }}
          >
            <Text style={styles.submitButtonText}>SUBMIT PICKS</Text>
          </TouchableOpacity>
        </View>

        {/* Match Info Footer */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.onSurfaceVariant} />
            <Text style={styles.infoText}>
              {new Date(fixture.date).toLocaleDateString([], {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color={colors.onSurfaceVariant} />
            <Text style={styles.infoText}>
              {new Date(fixture.date).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
          {fixture.referee && (
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={16} color={colors.onSurfaceVariant} />
              <Text style={styles.infoText}>Referee: {fixture.referee}</Text>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  emptyText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    lineHeight: 24,
    color: colors.onSurfaceVariant,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: 56,
    paddingBottom: 12,
  },
  backBtn: { padding: 4 },
  brandText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 20,
    color: colors.primary,
    letterSpacing: 1,
  },

  // Status Badge
  statusBadgeContainer: { alignItems: 'center', marginBottom: 12 },
  statusBadge: {
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusBadgeLive: { backgroundColor: colors.tertiary },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  statusBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    lineHeight: 15,
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  statusBadgeTextLive: { color: '#220600' },

  // Score
  scoreSection: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: 24,
  },
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  teamCol: { flex: 1, alignItems: 'center', gap: 8 },
  teamName: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    lineHeight: 22,
    color: colors.onSurface,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  scoreCol: { alignItems: 'center', paddingHorizontal: 8 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  scoreNum: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 56,
    lineHeight: 60,
    color: colors.onSurface,
  },
  scoreDivider: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 28,
    lineHeight: 32,
    color: colors.onSurfaceVariant,
  },
  halftimeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    lineHeight: 16,
    color: colors.onSurfaceDim,
    marginTop: 4,
  },
  leaguePill: {
    backgroundColor: 'rgba(34,38,43,0.5)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  leaguePillLogo: { width: 16, height: 16 },
  leaguePillText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
    letterSpacing: -0.35,
  },

  // Card base
  card: {
    marginHorizontal: 16,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 8,
    padding: 24,
    marginBottom: 24,
    gap: 24,
  },
  cardTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 20,
    lineHeight: 28,
    color: colors.onSurface,
    letterSpacing: -0.5,
    textTransform: 'uppercase',
  },

  // Possession
  possessionBlock: { gap: 12 },
  possessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  possessionHomeLabel: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
    lineHeight: 20,
    color: colors.primaryContainer,
    letterSpacing: 0.35,
    textTransform: 'uppercase',
  },
  possessionAwayLabel: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.35,
    textTransform: 'uppercase',
  },
  possessionTrack: {
    flexDirection: 'row',
    height: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  possessionHome: { backgroundColor: colors.primary },
  possessionAway: { backgroundColor: '#45484C' },

  // Stats
  statRow: { gap: 8 },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  statLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    lineHeight: 16,
    color: colors.onSurfaceVariant,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  statValue: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    lineHeight: 24,
    color: colors.onSurface,
  },
  statBarBg: {
    height: 6,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 12,
    overflow: 'hidden',
  },
  statBarHome: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 12,
  },

  // Timeline
  timeline: { gap: 16, position: 'relative' },
  timelineLine: {
    position: 'absolute',
    left: 11,
    top: 8,
    bottom: 8,
    width: 2,
    backgroundColor: 'rgba(69,72,76,0.3)',
  },
  timelineEvent: { flexDirection: 'row', alignItems: 'flex-start' },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 4,
    borderColor: colors.background,
    zIndex: 2,
  },
  timelineCard: {
    flex: 1,
    backgroundColor: 'rgba(34,38,43,0.4)',
    borderRadius: 4,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timelineMinute: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    lineHeight: 15,
    color: colors.onSurfaceVariant,
    letterSpacing: -0.5,
    textTransform: 'uppercase',
  },
  timelinePlayer: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurface,
  },
  timelineTeam: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    lineHeight: 15,
    color: colors.onSurfaceDim,
  },

  // Predictions
  predictCard: {
    marginHorizontal: 16,
    backgroundColor: 'rgba(34,38,43,0.4)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(69,72,76,0.1)',
    padding: 25,
    marginBottom: 24,
    gap: 12,
  },
  predictHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  predictSectionLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    lineHeight: 15,
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  predictMatchLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    lineHeight: 16,
    color: colors.onSurfaceDim,
    marginBottom: 4,
  },
  predictBtn: {
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  predictBtnLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    lineHeight: 15,
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  predictBtnPts: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 24,
    lineHeight: 32,
    color: colors.onSurface,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    lineHeight: 20,
    color: colors.onPrimary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // Info Footer
  infoCard: {
    marginHorizontal: 16,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 8,
    padding: 20,
    gap: 12,
    marginBottom: 24,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurfaceVariant,
  },
});
