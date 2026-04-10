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
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { useRoute } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, spacing, borderRadius } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { footballApi, sportsApi, predictionsApi } from '../api';
import type { Fixture, FixtureEvent, FixtureStatistic, SportGame, PredictionData } from '../api';
import Toast from 'react-native-toast-message';
import { logPickAttempted, logPickCompleted } from '../services/analytics';
import { FootballPitch } from '../components/FootballPitch';
import { useAds } from '../contexts/AdContext';

type Props = { navigation: any };

type PredictionType = 'result' | 'exact_score';
type OutcomeChoice = 'home' | 'draw' | 'away';

const LIVE_STATUSES = ['1H', '2H', 'HT', 'ET', 'P', 'BT', 'LIVE', 'Q1', 'Q2', 'Q3', 'Q4', 'OT', 'P1', 'P2', 'P3', 'S1', 'S2', 'S3', 'S4', 'S5', 'R1', 'R2', 'R3', 'R4', 'R5', 'IN1', 'IN2', 'IN3', 'IN4', 'IN5', 'IN6', 'IN7', 'IN8', 'IN9'];
const FINISHED_STATUSES = ['FT', 'AET', 'PEN', 'AOT', 'AP', 'POST', 'CANC'];
const NO_DRAW_SPORTS = ['basketball', 'baseball', 'american-football', 'formula-1', 'mma', 'volleyball'];

function getStatusDisplay(status: string, t: (key: string) => string, statusLong?: string, elapsed?: number | string | null, date?: string): { label: string; isLive: boolean; isUpcoming: boolean } {
  if (LIVE_STATUSES.includes(status)) {
    return {
      label: elapsed ? `${t('dashboard.live')} · ${elapsed}'` : t('dashboard.live'),
      isLive: true,
      isUpcoming: false,
    };
  }
  if (FINISHED_STATUSES.includes(status)) {
    return { label: statusLong || t('matchPrediction.fullTime'), isLive: false, isUpcoming: false };
  }
  // Upcoming: show formatted date + time
  if (date) {
    const d = new Date(date);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const gameDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let dayLabel: string;
    if (gameDay.getTime() === today.getTime()) dayLabel = t('dashboard.today').toUpperCase();
    else if (gameDay.getTime() === tomorrow.getTime()) dayLabel = t('dashboard.tomorrow').toUpperCase();
    else dayLabel = d.toLocaleDateString([], { month: 'short', day: 'numeric' }).toUpperCase();

    return { label: `${dayLabel} · ${time}`, isLive: false, isUpcoming: true };
  }
  return { label: t('matchPrediction.scheduled'), isLive: false, isUpcoming: true };
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

function getEventIcon(event: FixtureEvent) {
  const type = event.type?.toLowerCase();
  const detail = event.detail?.toLowerCase() || '';
  if (type === 'goal') return { icon: 'football', lib: 'ion' as const, color: colors.primary, bg: colors.primary };
  if (type === 'card' && detail.includes('yellow')) return { icon: 'yellow', lib: 'card' as const, color: '#FACC15', bg: colors.surfaceContainerHighest };
  if (type === 'card' && detail.includes('red')) return { icon: 'red', lib: 'card' as const, color: '#DC2626', bg: colors.surfaceContainerHighest };
  if (type === 'subst') return { icon: 'swap-horizontal', lib: 'mci' as const, color: colors.onSurfaceVariant, bg: colors.surfaceContainerHighest };
  if (type === 'var') return { icon: 'monitor', lib: 'mci' as const, color: colors.info, bg: colors.surfaceContainerHighest };
  return { icon: 'ellipse', lib: 'ion' as const, color: colors.onSurfaceVariant, bg: colors.surfaceContainerHighest };
}

const STAT_KEYS = [
  { key: 'Shots on Goal', label: 'SHOTS ON GOAL' },
  { key: 'Total Shots', label: 'TOTAL SHOTS' },
  { key: 'Corner Kicks', label: 'CORNERS' },
  { key: 'Fouls', label: 'FOULS' },
  { key: 'Offsides', label: 'OFFSIDES' },
];

// ─── Generic Events Tab ──────────────────────────────────────────────────────
function GenericEventsTab({ events, sport, homeTeamName, awayTeamName }: { events: any[]; sport: string; homeTeamName: string; awayTeamName: string }) {
  const periodLabel = (period: string | number | undefined) => {
    if (!period && period !== 0) return '';
    const p = String(period).toUpperCase();
    if (p === '1' || p === 'Q1' || p === 'P1') return sport === 'hockey' ? 'P1' : sport === 'american-football' ? 'Q1' : 'P1';
    if (p === '2' || p === 'Q2' || p === 'P2') return sport === 'hockey' ? 'P2' : sport === 'american-football' ? 'Q2' : 'P2';
    if (p === '3' || p === 'Q3' || p === 'P3') return sport === 'hockey' ? 'P3' : sport === 'american-football' ? 'Q3' : 'P3';
    if (p === '4' || p === 'Q4') return 'Q4';
    if (p === 'OT' || p === 'OVERTIME') return 'OT';
    return p;
  };

  // Group events by period
  const grouped = new Map<string, any[]>();
  events.forEach(evt => {
    const key = periodLabel(evt.period || evt.quarter || evt.set) || 'GAME';
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(evt);
  });

  return (
    <View style={{ gap: 16 }}>
      {[...grouped.entries()].map(([period, evts]) => (
        <View key={period}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(69,72,76,0.3)' }} />
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 9, color: colors.onSurfaceDim, letterSpacing: 1.2 }}>{period}</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(69,72,76,0.3)' }} />
          </View>
          {evts.map((evt, idx) => {
            const evtType = (evt.type || evt.play || '').toLowerCase();
            const isTD = evtType.includes('touchdown') || evtType.includes('td');
            const isFG = evtType.includes('field goal') || evtType.includes('fg');
            const isGoal = evtType.includes('goal') && !isFG;
            const isPenalty = evtType.includes('penalty') || evtType.includes('penalt');
            const iconColor = isTD || isGoal ? colors.primary : isPenalty ? '#FACC15' : colors.onSurfaceVariant;
            const iconName = isTD ? 'american-football' : isGoal ? 'football' : isFG ? 'flag' : 'ellipse';
            const player = evt.player?.name || evt.player || evt.scorer || evt.description || '';
            const team = evt.team?.name || evt.team || '';
            const minute = evt.minute || evt.time || '';
            return (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(34,38,43,0.5)', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={iconName as any} size={14} color={iconColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 13, color: colors.onSurface }}>{evt.type || evt.play || 'Event'}</Text>
                  {!!player && <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: colors.onSurfaceVariant }}>{player}</Text>}
                  {!!team && <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: colors.onSurfaceDim }}>{team}</Text>}
                </View>
                {!!minute && (
                  <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 12, color: colors.onSurfaceVariant }}>{minute}'</Text>
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ─── Generic Stats Tab (NFL team stats) ─────────────────────────────────────
function GenericStatsTab({ stats, homeTeamName, awayTeamName }: { stats: any; homeTeamName: string; awayTeamName: string }) {
  // stats may be array of team stat objects from API
  const teams: any[] = Array.isArray(stats) ? stats : [];
  if (teams.length < 2) return (
    <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: colors.onSurfaceVariant, textAlign: 'center' }}>
      No statistics available
    </Text>
  );

  const homeStats = teams[0];
  const awayStats = teams[1];

  // Flatten statistics array if nested
  const getStatMap = (t: any): Record<string, any> => {
    if (t?.statistics && Array.isArray(t.statistics)) {
      const m: Record<string, any> = {};
      t.statistics.forEach((s: any) => { if (s.name) m[s.name] = s.value ?? s.total ?? s.yards ?? s.attempts; });
      return m;
    }
    return t || {};
  };
  const hMap = getStatMap(homeStats);
  const aMap = getStatMap(awayStats);

  const allKeys = [...new Set([...Object.keys(hMap), ...Object.keys(aMap)])].filter(k => !['team', 'game', 'id'].includes(k.toLowerCase()));

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 13, color: colors.primary }} numberOfLines={1}>{homeTeamName}</Text>
        <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 13, color: colors.onSurfaceVariant }} numberOfLines={1}>{awayTeamName}</Text>
      </View>
      {allKeys.slice(0, 12).map(key => {
        const hVal = hMap[key];
        const aVal = aMap[key];
        const hNum = parseFloat(String(hVal ?? 0)) || 0;
        const aNum = parseFloat(String(aVal ?? 0)) || 0;
        const total = hNum + aNum || 1;
        return (
          <View key={key} style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 14, color: hNum >= aNum ? colors.onSurface : colors.onSurfaceVariant, width: 48 }}>{String(hVal ?? '—')}</Text>
              <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 10, color: colors.onSurfaceVariant, letterSpacing: 0.8, textTransform: 'uppercase', flex: 1, textAlign: 'center' }}>{key}</Text>
              <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 14, color: aNum > hNum ? colors.onSurface : colors.onSurfaceVariant, width: 48, textAlign: 'right' }}>{String(aVal ?? '—')}</Text>
            </View>
            <View style={{ flexDirection: 'row', height: 5, gap: 2 }}>
              <View style={{ flex: hNum || 0.1, backgroundColor: colors.primary, borderRadius: 4 }} />
              <View style={{ flex: aNum || 0.1, backgroundColor: '#45484C', borderRadius: 4 }} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── Generic H2H Tab ─────────────────────────────────────────────────────────
function GenericH2HTab({ games, homeTeamId, homeTeamName, awayTeamName }: { games: any[]; homeTeamId: number; homeTeamName: string; awayTeamName: string }) {
  let homeWins = 0, draws = 0, awayWins = 0;
  games.forEach(g => {
    const hTotal = g.homeTotal ?? g.scores?.home?.total ?? g.homeGoals ?? 0;
    const aTotal = g.awayTotal ?? g.scores?.away?.total ?? g.awayGoals ?? 0;
    const gHomeId = g.homeTeam?.apiId ?? g.teams?.home?.id;
    if (hTotal === aTotal) draws++;
    else if ((gHomeId === homeTeamId && hTotal > aTotal) || (gHomeId !== homeTeamId && aTotal > hTotal)) homeWins++;
    else awayWins++;
  });
  return (
    <View style={{ gap: 12 }}>
      {/* Summary row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(69,72,76,0.2)' }}>
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 24, color: colors.primary }}>{homeWins}</Text>
          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: colors.onSurfaceVariant }} numberOfLines={1}>{homeTeamName}</Text>
        </View>
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 24, color: colors.onSurfaceVariant }}>{draws}</Text>
          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: colors.onSurfaceVariant }}>Draws</Text>
        </View>
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 24, color: colors.onSurfaceVariant }}>{awayWins}</Text>
          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: colors.onSurfaceVariant }} numberOfLines={1}>{awayTeamName}</Text>
        </View>
      </View>
      {/* Game rows */}
      {games.map((g, idx) => {
        const hTotal = g.homeTotal ?? g.scores?.home?.total ?? g.homeGoals ?? 0;
        const aTotal = g.awayTotal ?? g.scores?.away?.total ?? g.awayGoals ?? 0;
        const gHomeId = g.homeTeam?.apiId ?? g.teams?.home?.id;
        const gHomeName = g.homeTeam?.name ?? g.teams?.home?.name ?? 'Home';
        const gAwayName = g.awayTeam?.name ?? g.teams?.away?.name ?? 'Away';
        const gHomeLogo = g.homeTeam?.logo ?? g.teams?.home?.logo;
        const gAwayLogo = g.awayTeam?.logo ?? g.teams?.away?.logo;
        const isDraw = hTotal === aTotal;
        const homeWon = !isDraw && ((gHomeId === homeTeamId && hTotal > aTotal) || (gHomeId !== homeTeamId && aTotal > hTotal));
        const gameDate = g.date ? new Date(g.date) : null;
        return (
          <View key={g.apiId ?? idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 10, color: colors.onSurfaceDim, width: 36 }}>
              {gameDate ? gameDate.toLocaleDateString([], { month: 'short', year: '2-digit' }) : ''}
            </Text>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
              {gHomeLogo ? <Image source={{ uri: gHomeLogo }} style={{ width: 16, height: 16 }} resizeMode="contain" /> : null}
              <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 11, color: isDraw ? colors.onSurfaceVariant : (homeWon && gHomeId === homeTeamId) || (!homeWon && gHomeId !== homeTeamId) ? colors.primary : colors.onSurfaceVariant }} numberOfLines={1}>{gHomeName}</Text>
            </View>
            <View style={{ backgroundColor: 'rgba(34,38,43,0.5)', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 13, color: colors.onSurface }}>{hTotal} - {aTotal}</Text>
            </View>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {gAwayLogo ? <Image source={{ uri: gAwayLogo }} style={{ width: 16, height: 16 }} resizeMode="contain" /> : null}
              <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 11, color: isDraw ? colors.onSurfaceVariant : (!homeWon && gHomeId === homeTeamId) || (homeWon && gHomeId !== homeTeamId) ? colors.primary : colors.onSurfaceVariant }} numberOfLines={1}>{gAwayName}</Text>
            </View>
            <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: isDraw ? 'rgba(69,72,76,0.4)' : homeWon ? 'rgba(163,255,0,0.15)' : 'rgba(220,38,38,0.15)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 9, color: isDraw ? colors.onSurfaceVariant : homeWon ? colors.primary : '#DC2626' }}>
                {isDraw ? 'D' : homeWon ? 'W' : 'L'}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export function MatchPredictionScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const route = useRoute<any>();
  const { fixtureApiId, sport = 'football' } = route.params as { fixtureApiId: number; sport?: string };
  const { tokens } = useAuth();
  const { trackAction } = useAds();

  const [fixture, setFixture] = useState<Fixture | null>(null);
  const [genericGame, setGenericGame] = useState<SportGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [existingPrediction, setExistingPrediction] = useState<PredictionData | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState<OutcomeChoice | null>(null);
  const [predType, setPredType] = useState<PredictionType>('result');
  const [homeScoreInput, setHomeScoreInput] = useState('');
  const [awayScoreInput, setAwayScoreInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [h2hFixtures, setH2hFixtures] = useState<Fixture[]>([]);
  const [h2hLoading, setH2hLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'events' | 'statistics' | 'lineups' | 'h2h'>('events');

  // Generic sport tab state
  const [genericActiveTab, setGenericActiveTab] = useState<'events' | 'stats' | 'h2h'>('events');
  const [genericEvents, setGenericEvents] = useState<any[]>([]);
  const [genericEventsLoading, setGenericEventsLoading] = useState(false);
  const [genericEventsLoaded, setGenericEventsLoaded] = useState(false);
  const [genericStats, setGenericStats] = useState<any>(null);
  const [genericStatsLoading, setGenericStatsLoading] = useState(false);
  const [genericStatsLoaded, setGenericStatsLoaded] = useState(false);
  const [genericH2H, setGenericH2H] = useState<any[]>([]);
  const [genericH2HLoading, setGenericH2HLoading] = useState(false);
  const [genericH2HLoaded, setGenericH2HLoaded] = useState(false);

  // F1 circuit fullscreen
  const [f1CircuitFullscreen, setF1CircuitFullscreen] = useState(false);

  // F1 driver profile modal
  const [f1DriverModal, setF1DriverModal] = useState<any>(null);
  const [f1DriverLoading, setF1DriverLoading] = useState(false);

  // Football player profile modal
  const [playerModal, setPlayerModal] = useState<any>(null);
  const [playerModalLoading, setPlayerModalLoading] = useState(false);

  const openDriverProfile = useCallback(async (driverApiId: number) => {
    if (!driverApiId || !tokens?.accessToken) return;
    setF1DriverLoading(true);
    setF1DriverModal(null);
    try {
      const data = await sportsApi.getDriverProfile(tokens.accessToken, 'formula-1', driverApiId);
      if (data) setF1DriverModal(data);
    } catch (err) {
      console.warn('Failed to load driver profile', err);
    } finally {
      setF1DriverLoading(false);
    }
  }, [tokens?.accessToken]);

  const openPlayerProfile = useCallback(async (playerApiId: number) => {
    if (!playerApiId || !tokens?.accessToken) return;
    setPlayerModalLoading(true);
    setPlayerModal(null);
    try {
      const data = await footballApi.getPlayerProfile(tokens.accessToken, playerApiId);
      if (data) setPlayerModal(data);
    } catch (err) {
      console.warn('Failed to load player profile', err);
    } finally {
      setPlayerModalLoading(false);
    }
  }, [tokens?.accessToken]);

  const isFootball = sport === 'football';
  const hasDraw = !NO_DRAW_SPORTS.includes(sport);
  const isF1 = sport === 'formula-1';

  const fetchGame = useCallback(async () => {
    if (!tokens?.accessToken) return;
    try {
      if (isFootball) {
        const { fixture: f } = await footballApi.getFixtureDetail(tokens.accessToken, fixtureApiId);
        setFixture(f);
      } else {
        const game = await sportsApi.getGameDetail(tokens.accessToken, sport as any, fixtureApiId);
        setGenericGame(game);
      }

      // Note: we intentionally do NOT fetch /daily-status here. There is no
      // daily pick limit and this screen has no quest UI to feed. The Dashboard
      // and Quests screens own that data and refresh themselves via SSE.
      const { prediction } = await predictionsApi.getPredictionForGame(
        sport,
        fixtureApiId,
        tokens.accessToken,
      );

      if (prediction) {
        setExistingPrediction(prediction);
        setSelectedOutcome(prediction.predictedOutcome);
        setPredType(prediction.predictionType);
        if (prediction.predictedHomeScore != null) setHomeScoreInput(String(prediction.predictedHomeScore));
        if (prediction.predictedAwayScore != null) setAwayScoreInput(String(prediction.predictedAwayScore));
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: t('matchPrediction.errorLoading'), text2: t('dashboard.pullToRetry') });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tokens?.accessToken, fixtureApiId, sport, isFootball]);

  // Fetch H2H data when fixture is loaded (football only)
  useEffect(() => {
    if (!isFootball || !fixture?.homeTeam?.apiId || !fixture?.awayTeam?.apiId || !tokens?.accessToken) return;
    let cancelled = false;
    setH2hLoading(true);
    footballApi
      .getHeadToHead(tokens.accessToken, fixture.homeTeam.apiId, fixture.awayTeam.apiId)
      .then((data) => {
        if (!cancelled) setH2hFixtures(data.fixtures || []);
      })
      .catch(() => {
        if (!cancelled) setH2hFixtures([]);
      })
      .finally(() => {
        if (!cancelled) setH2hLoading(false);
      });
    return () => { cancelled = true; };
  }, [isFootball, fixture?.homeTeam?.apiId, fixture?.awayTeam?.apiId, tokens?.accessToken]);

  // Fetch generic sport events on tab activation
  const fetchGenericEvents = useCallback(async () => {
    if (!tokens?.accessToken || !genericGame || isFootball || genericEventsLoaded) return;
    setGenericEventsLoading(true);
    try {
      const data = await sportsApi.getGameEvents(tokens.accessToken, sport as any, fixtureApiId);
      setGenericEvents(Array.isArray(data) ? data : (data?.events || data?.response || []));
    } catch {
      setGenericEvents([]);
    } finally {
      setGenericEventsLoading(false);
      setGenericEventsLoaded(true);
    }
  }, [tokens?.accessToken, genericGame, isFootball, genericEventsLoaded, sport, fixtureApiId]);

  const fetchGenericStats = useCallback(async () => {
    if (!tokens?.accessToken || !genericGame || isFootball || genericStatsLoaded) return;
    setGenericStatsLoading(true);
    try {
      const data = await sportsApi.getGameTeamStats(tokens.accessToken, sport as any, fixtureApiId);
      setGenericStats(Array.isArray(data) ? data : (data?.statistics || data?.response || data));
    } catch {
      setGenericStats(null);
    } finally {
      setGenericStatsLoading(false);
      setGenericStatsLoaded(true);
    }
  }, [tokens?.accessToken, genericGame, isFootball, genericStatsLoaded, sport, fixtureApiId]);

  const fetchGenericH2H = useCallback(async () => {
    if (!tokens?.accessToken || !genericGame || isFootball || genericH2HLoaded) return;
    if (!genericGame.homeTeam?.apiId || !genericGame.awayTeam?.apiId) return;
    setGenericH2HLoading(true);
    try {
      const data = await sportsApi.getH2H(tokens.accessToken, sport as any, genericGame.homeTeam.apiId, genericGame.awayTeam.apiId);
      setGenericH2H(Array.isArray(data) ? data : (data?.fixtures || data?.games || data?.response || []));
    } catch {
      setGenericH2H([]);
    } finally {
      setGenericH2HLoading(false);
      setGenericH2HLoaded(true);
    }
  }, [tokens?.accessToken, genericGame, isFootball, genericH2HLoaded, sport]);

  useEffect(() => {
    if (!isFootball && genericGame) {
      if (genericActiveTab === 'events' && !genericEventsLoaded) fetchGenericEvents();
      if (genericActiveTab === 'stats' && !genericStatsLoaded) fetchGenericStats();
      if (genericActiveTab === 'h2h' && !genericH2HLoaded) fetchGenericH2H();
    }
  }, [genericActiveTab, genericGame, isFootball, genericEventsLoaded, genericStatsLoaded, genericH2HLoaded, fetchGenericEvents, fetchGenericStats, fetchGenericH2H]);

  useEffect(() => { fetchGame(); }, [fetchGame]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchGame();
  }, [fetchGame]);

  const homeTeamName = fixture?.homeTeam?.name || genericGame?.homeTeam?.name || 'Home';
  const awayTeamName = fixture?.awayTeam?.name || genericGame?.awayTeam?.name || 'Away';
  const homeTeamLogo = fixture?.homeTeam?.logo || genericGame?.homeTeam?.logo || '';
  const awayTeamLogo = fixture?.awayTeam?.logo || genericGame?.awayTeam?.logo || '';
  const leagueName = fixture?.leagueName || genericGame?.leagueName || '';
  const leagueLogo = fixture?.leagueLogo || genericGame?.leagueLogo || '';
  const leagueApiId = fixture?.leagueApiId || genericGame?.leagueApiId || 0;
  const gameDate = fixture?.date || genericGame?.date || new Date().toISOString();
  const homeScore = fixture?.homeGoals ?? genericGame?.homeTotal ?? null;
  const awayScore = fixture?.awayGoals ?? genericGame?.awayTotal ?? null;
  const gameStatus = fixture?.status || genericGame?.status || 'NS';
  const statusLong = fixture?.statusLong || genericGame?.statusLong || '';

  const isFinished = FINISHED_STATUSES.includes(gameStatus);
  const isLive = LIVE_STATUSES.includes(gameStatus);

  const statusDisplay = getStatusDisplay(gameStatus, t, statusLong, fixture?.elapsed, fixture?.date || genericGame?.date);

  const handleSubmitPrediction = async () => {
    if (!tokens?.accessToken || !selectedOutcome) return;

    logPickAttempted(sport, leagueApiId ?? 0, leagueName ?? '');

    if (predType === 'exact_score' && (homeScoreInput === '' || awayScoreInput === '')) {
      Alert.alert(t('matchPrediction.missingScores'), t('matchPrediction.missingScoresDesc'));
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        sport,
        gameApiId: fixtureApiId,
        leagueApiId,
        gameDate,
        homeTeamName,
        homeTeamLogo,
        awayTeamName,
        awayTeamLogo,
        leagueName,
        leagueLogo,
        predictionType: predType,
        predictedOutcome: selectedOutcome,
        predictedHomeScore: predType === 'exact_score' ? parseInt(homeScoreInput, 10) : null,
        predictedAwayScore: predType === 'exact_score' ? parseInt(awayScoreInput, 10) : null,
      };

      const result = await predictionsApi.create(payload, tokens.accessToken);
      setExistingPrediction(result);
      logPickCompleted(sport, leagueApiId ?? 0, predType);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      trackAction();
      Alert.alert(t('matchPrediction.predictionSubmitted'), t('matchPrediction.predictionSubmittedDesc'));
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', err.message || 'Failed to submit prediction');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePrediction = async () => {
    if (!tokens?.accessToken || !existingPrediction) return;
    Alert.alert(
      t('matchPrediction.cancelPrediction'),
      t('matchPrediction.cancelPredictionDesc'),
      [
        { text: t('matchPrediction.keepPick'), style: 'cancel' },
        {
          text: t('matchPrediction.cancelPick'),
          style: 'destructive',
          onPress: async () => {
            try {
              await predictionsApi.deletePrediction(existingPrediction._id, tokens.accessToken!);
              setExistingPrediction(null);
              setSelectedOutcome(null);
              setPredType('result');
              setHomeScoreInput('');
              setAwayScoreInput('');
              Toast.show({ type: 'success', text1: t('matchPrediction.predictionCancelled'), text2: t('matchPrediction.pickSlotRefunded') });
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to cancel prediction');
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('matchPrediction.matchDetails')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!fixture && !genericGame) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('matchPrediction.matchDetails')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.onSurfaceVariant} />
          <Text style={styles.emptyText}>{t('matchPrediction.matchNotFound')}</Text>
        </View>
      </View>
    );
  }

  const events = fixture?.events || [];
  const stats = fixture?.statistics || [];
  const lineups = fixture?.lineups || [];
  const [homePoss, awayPoss] = getStatValue(stats, 'Ball Possession');
  const homePossNum = parsePossession(homePoss);
  const awayPossNum = 100 - homePossNum;
  const sortedEvents = [...events].sort((a, b) => (b.timeElapsed || 0) - (a.timeElapsed || 0));

  const outcomeOptions: { key: OutcomeChoice; label: string; logo?: string }[] = isF1
    ? [
        { key: 'home', label: homeTeamName, logo: homeTeamLogo },
        { key: 'away', label: awayTeamName, logo: awayTeamLogo },
      ]
    : hasDraw
      ? [
          { key: 'home', label: homeTeamName, logo: homeTeamLogo },
          { key: 'draw', label: t('matchPrediction.draw') },
          { key: 'away', label: awayTeamName, logo: awayTeamLogo },
        ]
      : [
          { key: 'home', label: homeTeamName, logo: homeTeamLogo },
          { key: 'away', label: awayTeamName, logo: awayTeamLogo },
        ];

  // F1: extract race-specific data from genericGame
  const f1Race = isF1 ? genericGame as any : null;
  const f1CircuitName = f1Race?.circuit?.name || f1Race?.circuitName || '';
  const f1CircuitImage = f1Race?.circuit?.image || f1Race?.circuitImage || '';
  const f1CircuitCity = f1Race?.circuit?.city || f1Race?.city || '';
  const f1Country = f1Race?.circuit?.country || f1Race?.country || '';
  const f1SessionType = f1Race?.type || 'Race';
  const f1Results: any[] = f1Race?.results || [];
  const f1Laps = f1Race?.laps?.total || f1Race?.laps || null;
  const f1FastestDriver = f1Race?.fastestLapDriver || f1Race?.fastestLap?.driver?.name || '';
  const f1FastestTime = f1Race?.fastestLapTime || f1Race?.fastestLap?.time || '';
  const f1GpName = f1Race?.competitionName || f1Race?.leagueName || '';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {isF1 ? (f1GpName || t('matchPrediction.raceDetails')) : (leagueName || t('matchPrediction.matchDetails'))}
        </Text>
        {!isF1 && leagueLogo ? (
          <Image source={{ uri: leagueLogo }} style={{ width: 28, height: 28 }} resizeMode="contain" />
        ) : (
          <View style={{ width: 28 }} />
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* F1 Race Detail Header */}
        {isF1 ? (
          <View style={styles.f1DetailContainer}>
            {/* Session type badge */}
            <View style={styles.statusBadgeContainer}>
              <View style={[styles.statusBadge, styles.statusBadgeUpcoming]}>
                <Ionicons name="car-sport" size={12} color={colors.primary} />
                <Text style={[styles.statusBadgeText, styles.statusBadgeTextUpcoming]}>
                  {f1SessionType}
                </Text>
              </View>
            </View>

            {/* Circuit info */}
            {f1CircuitImage ? (
              <TouchableOpacity activeOpacity={0.85} onPress={() => setF1CircuitFullscreen(true)}>
                <ExpoImage source={{ uri: f1CircuitImage }} style={styles.f1DetailCircuitImage} contentFit="contain" cachePolicy="memory-disk" />
                <View style={styles.f1CircuitZoomHint}>
                  <Ionicons name="expand-outline" size={14} color="rgba(255,255,255,0.5)" />
                  <Text style={styles.f1CircuitZoomHintText}>Tap to expand</Text>
                </View>
              </TouchableOpacity>
            ) : null}
            <Text style={styles.f1DetailCircuitName}>{f1CircuitName}</Text>
            <Text style={styles.f1DetailCircuitLocation}>{f1CircuitCity}{f1Country ? `, ${f1Country}` : ''}</Text>

            {/* Date and info */}
            <View style={styles.f1DetailInfoRow}>
              <Ionicons name="calendar-outline" size={14} color={colors.onSurfaceVariant} />
              <Text style={styles.f1DetailInfoText}>
                {new Date(gameDate).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </Text>
            </View>
            <View style={styles.f1DetailInfoRow}>
              <Ionicons name="time-outline" size={14} color={colors.onSurfaceVariant} />
              <Text style={styles.f1DetailInfoText}>
                {new Date(gameDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            {f1Laps && (
              <View style={styles.f1DetailInfoRow}>
                <Ionicons name="repeat" size={14} color={colors.onSurfaceVariant} />
                <Text style={styles.f1DetailInfoText}>{f1Laps} laps</Text>
              </View>
            )}

            {/* Fastest Lap — prominent card */}
            {f1FastestDriver ? (() => {
              const flResult = f1Results.find((r: any) => r.driverName === f1FastestDriver);
              return (
                <View style={styles.f1FastestLapCard}>
                  <View style={styles.f1FastestLapHeader}>
                    <Ionicons name="flash" size={18} color="#A855F7" />
                    <Text style={styles.f1FastestLapTitle}>{t('matchPrediction.fastestLap')}</Text>
                    <Ionicons name="flash" size={18} color="#A855F7" />
                  </View>
                  <View style={styles.f1FastestLapBody}>
                    {flResult?.driverImage ? (
                      <ExpoImage source={{ uri: flResult.driverImage }} style={styles.f1FastestLapDriverImg} contentFit="cover" cachePolicy="memory-disk" />
                    ) : null}
                    <View style={styles.f1FastestLapInfo}>
                      <Text style={styles.f1FastestLapDriverName}>{f1FastestDriver}</Text>
                      {flResult?.teamName ? <Text style={styles.f1FastestLapTeam}>{flResult.teamName}</Text> : null}
                    </View>
                    <View style={styles.f1FastestLapTimeBox}>
                      <Text style={styles.f1FastestLapTimeLabel}>LAP TIME</Text>
                      <Text style={styles.f1FastestLapTimeValue}>{f1FastestTime}</Text>
                    </View>
                  </View>
                </View>
              );
            })() : null}

            {/* Race Results — full grid */}
            {f1Results.length > 0 && (
              <View style={styles.f1ResultsSection}>
                <Text style={styles.f1ResultsTitle}>{t('matchPrediction.raceResults')}</Text>
                {f1Results.map((result: any, idx: number) => (
                  <View key={idx} style={[styles.f1ResultRow, idx === 0 && styles.f1ResultRowWinner]}>
                    {/* Position */}
                    <Text style={[styles.f1ResultPos, idx < 3 && styles.f1ResultPosPodium]}>
                      P{result.position || idx + 1}
                    </Text>
                    {/* Driver photo */}
                    <TouchableOpacity activeOpacity={0.7} onPress={() => openDriverProfile(result.driverApiId)}>
                      {result.driverImage ? (
                        <ExpoImage source={{ uri: result.driverImage }} style={styles.f1ResultDriverImg} contentFit="cover" cachePolicy="memory-disk" />
                      ) : (
                        <View style={styles.f1ResultDriverImgPlaceholder}>
                          <Ionicons name="person" size={18} color={colors.onSurfaceDim} />
                        </View>
                      )}
                    </TouchableOpacity>
                    {/* Name + team */}
                    <View style={styles.f1ResultDriverInfo}>
                      <TouchableOpacity activeOpacity={0.7} onPress={() => openDriverProfile(result.driverApiId)}>
                        <Text style={styles.f1ResultDriverName} numberOfLines={1}>{result.driverName || 'Unknown'}</Text>
                      </TouchableOpacity>
                      <View style={styles.f1ResultTeamRow}>
                        {(result.teamLogoHD || result.teamLogo) ? (
                          <ExpoImage source={{ uri: result.teamLogoHD || result.teamLogo }} style={styles.f1ResultTeamLogoInline} contentFit="contain" cachePolicy="memory-disk" />
                        ) : null}
                        <Text style={styles.f1ResultTeamName} numberOfLines={1}>{result.teamName || ''}</Text>
                      </View>
                    </View>
                    {/* Time + pits */}
                    <View style={styles.f1ResultTimeCol}>
                      <Text style={styles.f1ResultTime} numberOfLines={1}>
                        {result.time || (result.gap ? `+${result.gap}` : 'DNF')}
                      </Text>
                      {result.pits != null && (
                        <Text style={styles.f1ResultPits}>{result.pits} pit{result.pits !== 1 ? 's' : ''}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Status for upcoming */}
            {f1Results.length === 0 && (
              <View style={styles.f1UpcomingNotice}>
                <Ionicons name="flag-outline" size={20} color={colors.primary} />
                <Text style={styles.f1UpcomingNoticeText}>
                  {statusDisplay.isUpcoming
                    ? t('matchPrediction.raceUpcoming')
                    : statusDisplay.isLive
                      ? t('matchPrediction.raceLive')
                      : t('matchPrediction.raceCompleted')}
                </Text>
              </View>
            )}
          </View>
        ) : (
        <>
        {/* Status Badge */}
        <View style={styles.statusBadgeContainer}>
          <View style={[
            styles.statusBadge,
            statusDisplay.isLive && styles.statusBadgeLive,
            statusDisplay.isUpcoming && styles.statusBadgeUpcoming,
          ]}>
            {statusDisplay.isLive && <View style={styles.statusDot} />}
            <Text style={[
              styles.statusBadgeText,
              statusDisplay.isLive && styles.statusBadgeTextLive,
              statusDisplay.isUpcoming && styles.statusBadgeTextUpcoming,
            ]}>
              {statusDisplay.label}
            </Text>
          </View>
        </View>

        {/* Score Section */}
        <View style={styles.scoreSection}>
          <View style={styles.teamsRow}>
            <View style={styles.teamCol}>
              <TeamLogo uri={homeTeamLogo} size={72} />
              <Text style={styles.teamName}>{homeTeamName}</Text>
            </View>
            <View style={styles.scoreCol}>
              {statusDisplay.isUpcoming ? (
                <Text style={styles.vsLabel}>VS</Text>
              ) : (
                <>
                  <View style={styles.scoreRow}>
                    <Text style={styles.scoreNum}>{homeScore ?? '-'}</Text>
                    <Text style={styles.scoreDivider}>:</Text>
                    <Text style={styles.scoreNum}>{awayScore ?? '-'}</Text>
                  </View>
                  {fixture?.goalsHalftime?.home !== null && fixture?.goalsHalftime?.home !== undefined && (
                    <Text style={styles.halftimeText}>
                      HT: {fixture.goalsHalftime.home} - {fixture.goalsHalftime.away}
                    </Text>
                  )}
                </>
              )}
            </View>
            <View style={styles.teamCol}>
              <TeamLogo uri={awayTeamLogo} size={72} />
              <Text style={styles.teamName}>{awayTeamName}</Text>
            </View>
          </View>

          <View style={styles.leaguePill}>
            {leagueLogo ? (
              <Image source={{ uri: leagueLogo }} style={styles.leaguePillLogo} resizeMode="contain" />
            ) : null}
            <Text style={styles.leaguePillText}>
              {leagueName}
              {fixture?.leagueRound ? ` · ${fixture.leagueRound.replace('Regular Season - ', 'Matchday ')}` : ''}
            </Text>
          </View>

          {/* Period/Quarter/Set score breakdown for non-football sports */}
          {!isFootball && !statusDisplay.isUpcoming && genericGame && (() => {
            const hs = genericGame.homeScore;
            const as_ = genericGame.awayScore;
            if (!hs && !as_) return null;

            type PeriodDef = { label: string; hKey: string; aKey: string };
            let periods: PeriodDef[] = [];
            if (sport === 'hockey') {
              periods = [
                { label: t('matchPrediction.period1'), hKey: 'period_1', aKey: 'period_1' },
                { label: t('matchPrediction.period2'), hKey: 'period_2', aKey: 'period_2' },
                { label: t('matchPrediction.period3'), hKey: 'period_3', aKey: 'period_3' },
                { label: t('matchPrediction.overtime'), hKey: 'overtime', aKey: 'overtime' },
              ];
            } else if (sport === 'basketball') {
              periods = [
                { label: t('matchPrediction.quarter1'), hKey: 'quarter_1', aKey: 'quarter_1' },
                { label: t('matchPrediction.quarter2'), hKey: 'quarter_2', aKey: 'quarter_2' },
                { label: t('matchPrediction.quarter3'), hKey: 'quarter_3', aKey: 'quarter_3' },
                { label: t('matchPrediction.quarter4'), hKey: 'quarter_4', aKey: 'quarter_4' },
                { label: t('matchPrediction.overtime'), hKey: 'over_time', aKey: 'over_time' },
              ];
            } else if (sport === 'american-football') {
              periods = [
                { label: t('matchPrediction.quarter1'), hKey: 'quarter_1', aKey: 'quarter_1' },
                { label: t('matchPrediction.quarter2'), hKey: 'quarter_2', aKey: 'quarter_2' },
                { label: t('matchPrediction.quarter3'), hKey: 'quarter_3', aKey: 'quarter_3' },
                { label: t('matchPrediction.quarter4'), hKey: 'quarter_4', aKey: 'quarter_4' },
                { label: t('matchPrediction.overtime'), hKey: 'overtime', aKey: 'overtime' },
              ];
            } else if (sport === 'volleyball') {
              periods = [
                { label: t('matchPrediction.set1'), hKey: 'set_1', aKey: 'set_1' },
                { label: t('matchPrediction.set2'), hKey: 'set_2', aKey: 'set_2' },
                { label: t('matchPrediction.set3'), hKey: 'set_3', aKey: 'set_3' },
                { label: t('matchPrediction.set4'), hKey: 'set_4', aKey: 'set_4' },
                { label: t('matchPrediction.set5'), hKey: 'set_5', aKey: 'set_5' },
              ];
            }

            const visiblePeriods = periods.filter(p => hs?.[p.hKey] != null || as_?.[p.aKey] != null);
            if (visiblePeriods.length === 0) return null;

            return (
              <View style={styles.periodScoreContainer}>
                <Text style={styles.periodScoreTitle}>{t('matchPrediction.scoreBreakdown')}</Text>
                <View style={styles.periodScoreRow}>
                  {visiblePeriods.map((p) => (
                    <View key={p.label} style={styles.periodScoreCell}>
                      <Text style={styles.periodScoreLabel}>{p.label}</Text>
                      <Text style={styles.periodScoreHome}>{hs?.[p.hKey] ?? '-'}</Text>
                      <Text style={styles.periodScoreDash}>:</Text>
                      <Text style={styles.periodScoreAway}>{as_?.[p.aKey] ?? '-'}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })()}
        </View>

        {/* F1 PREDICTION CTA — redirect to dedicated F1 prediction screen */}
        {isF1 && !isFinished && (
          <TouchableOpacity
            style={styles.f1PredictCta}
            activeOpacity={0.85}
            onPress={() => {
              const raceApiId = f1Race?.apiId || fixtureApiId;
              navigation.navigate('F1RacePrediction', {
                raceApiId,
                competitionName: f1GpName,
                circuitName: f1CircuitName,
              });
            }}
          >
            <View style={styles.f1PredictCtaInner}>
              <View style={styles.f1PredictCtaIcon}>
                <Ionicons name="car-sport" size={24} color="#FFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.f1PredictCtaTitle}>{t('matchPrediction.f1MakePredictions')}</Text>
                <Text style={styles.f1PredictCtaSubtitle}>{t('matchPrediction.f1PredictionTypes')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.primary} />
            </View>
          </TouchableOpacity>
        )}

        {/* PREDICTION CARD (non-F1 sports) */}
        {!isF1 && <View style={styles.predictCard}>
          <View style={styles.predictHeader}>
            <Text style={styles.cardTitle}>
              {existingPrediction ? t('matchPrediction.yourPrediction') : t('matchPrediction.makeYourPrediction')}
            </Text>
            <MaterialCommunityIcons
              name={existingPrediction ? 'check-circle' : 'target'}
              size={20}
              color={existingPrediction ? colors.primary : colors.onSurfaceVariant}
            />
          </View>

          {existingPrediction && existingPrediction.status !== 'pending' ? (
            <View style={styles.resolvedContainer}>
              <View style={[
                styles.resolvedBadge,
                existingPrediction.status === 'void'
                  ? styles.resolvedVoid
                  : existingPrediction.status === 'won'
                    ? styles.resolvedWon
                    : styles.resolvedLost,
              ]}>
                <Ionicons
                  name={existingPrediction.status === 'void' ? 'ban-outline' : existingPrediction.status === 'won' ? 'checkmark-circle' : 'close-circle'}
                  size={16}
                  color={existingPrediction.status === 'void' ? colors.onSurfaceVariant : existingPrediction.status === 'won' ? '#16A34A' : '#DC2626'}
                />
                <Text style={[
                  styles.resolvedBadgeText,
                  { color: existingPrediction.status === 'void' ? colors.onSurfaceVariant : existingPrediction.status === 'won' ? '#16A34A' : '#DC2626' },
                ]}>
                  {existingPrediction.status === 'void' ? t('matchPrediction.void') : existingPrediction.status === 'won' ? t('matchPrediction.won') : t('matchPrediction.lost')}
                </Text>
              </View>
              {existingPrediction.status === 'void' ? (
                <Text style={styles.resolvedDetail}>
                  {t('matchPrediction.matchCancelledVoided')}
                </Text>
              ) : (
                <Text style={styles.resolvedDetail}>
                  {t('matchPrediction.youPredicted', { outcome: existingPrediction.predictedOutcome.toUpperCase() })}
                  {existingPrediction.predictionType === 'exact_score'
                    ? ` (${existingPrediction.predictedHomeScore}-${existingPrediction.predictedAwayScore})`
                    : ''}
                </Text>
              )}
              {existingPrediction.pointsAwarded > 0 && (
                <Text style={styles.pointsAwardedText}>+{existingPrediction.pointsAwarded} pts</Text>
              )}
              {existingPrediction.status !== 'void' && existingPrediction.actualHomeScore != null && (
                <Text style={styles.resolvedActual}>
                  {t('matchPrediction.final', { home: existingPrediction.actualHomeScore, away: existingPrediction.actualAwayScore })}
                </Text>
              )}
            </View>
          ) : (
            <>
              {isFinished || isLive ? (
                <View style={styles.cantPredictContainer}>
                  <Ionicons name="time-outline" size={24} color={colors.onSurfaceVariant} />
                  <Text style={styles.cantPredictText}>
                    {isLive ? t('matchPrediction.lockedLive') : t('matchPrediction.matchFinished')}
                  </Text>
                  {existingPrediction && (
                    <Text style={styles.existingPredText}>
                      {t('matchPrediction.yourPick', { outcome: existingPrediction.predictedOutcome.toUpperCase() })}
                      {existingPrediction.predictionType === 'exact_score'
                        ? ` (${existingPrediction.predictedHomeScore}-${existingPrediction.predictedAwayScore})`
                        : ''} -- {t('matchPrediction.awaitingResult')}
                    </Text>
                  )}
                </View>
              ) : existingPrediction ? (
                <View style={styles.existingPredContainer}>
                  <View style={styles.existingPredBadge}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                    <Text style={styles.existingPredBadgeText}>{t('matchPrediction.predictionLocked')}</Text>
                  </View>
                  <Text style={styles.existingPredDetail}>
                    {existingPrediction.predictedOutcome === 'home' ? homeTeamName + ' ' + t('matchPrediction.win') :
                     existingPrediction.predictedOutcome === 'away' ? awayTeamName + ' ' + t('matchPrediction.win') : t('matchPrediction.draw')}
                  </Text>
                  {existingPrediction.predictionType === 'exact_score' && (
                    <Text style={styles.existingPredScore}>
                      {t('matchPrediction.exactScore')}: {existingPrediction.predictedHomeScore} - {existingPrediction.predictedAwayScore}
                    </Text>
                  )}
                  <Text style={styles.existingPredMultiplier}>
                    x{existingPrediction.oddsMultiplier.toFixed(1)} {t('matchPrediction.multiplier')}
                  </Text>
                  <TouchableOpacity style={styles.deleteBtn} onPress={handleDeletePrediction}>
                    <Ionicons name="close-circle-outline" size={16} color="#DC2626" />
                    <Text style={styles.deleteBtnText}>{t('matchPrediction.cancelPick')}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {/* Prediction type toggle */}
                  {!isF1 && (
                    <View style={styles.typeToggle}>
                      <TouchableOpacity
                        style={[styles.typeToggleBtn, predType === 'result' && styles.typeToggleBtnActive]}
                        onPress={() => setPredType('result')}
                      >
                        <Text style={[styles.typeToggleBtnText, predType === 'result' && styles.typeToggleBtnTextActive]}>
                          {t('matchPrediction.result')}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.typeToggleBtn, predType === 'exact_score' && styles.typeToggleBtnActive]}
                        onPress={() => setPredType('exact_score')}
                      >
                        <Text style={[styles.typeToggleBtnText, predType === 'exact_score' && styles.typeToggleBtnTextActive]}>
                          {t('matchPrediction.exactScore')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Outcome selection */}
                  <Text style={styles.predictSectionLabel}>
                    {isF1 ? t('matchPrediction.pickTheWinner') : t('matchPrediction.predictTheResult')}
                  </Text>
                  <View style={styles.outcomeRow}>
                    {outcomeOptions.map((opt) => {
                      const isSelected = selectedOutcome === opt.key;
                      const isDraw = opt.key === 'draw';
                      return (
                        <TouchableOpacity
                          key={opt.key}
                          style={[styles.outcomeBtn, isSelected && styles.outcomeBtnSelected]}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setSelectedOutcome(opt.key);
                          }}
                          activeOpacity={0.7}
                        >
                          {isDraw ? (
                            <View style={[styles.outcomeIconWrap, isSelected && styles.outcomeIconWrapSelected]}>
                              <MaterialCommunityIcons
                                name="equal"
                                size={22}
                                color={isSelected ? colors.primary : colors.onSurfaceVariant}
                              />
                            </View>
                          ) : opt.logo ? (
                            <Image source={{ uri: opt.logo }} style={styles.outcomeLogo} resizeMode="contain" />
                          ) : (
                            <View style={[styles.outcomeIconWrap, isSelected && styles.outcomeIconWrapSelected]}>
                              <Ionicons name="shirt-outline" size={20} color={isSelected ? colors.primary : colors.onSurfaceVariant} />
                            </View>
                          )}
                          <Text
                            style={[styles.outcomeBtnLabel, isSelected && styles.outcomeBtnLabelSelected]}
                            numberOfLines={2}
                          >
                            {opt.label}
                          </Text>
                          {isSelected && (
                            <View style={styles.outcomeCheck}>
                              <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Exact score inputs */}
                  {predType === 'exact_score' && !isF1 && (
                    <View style={styles.scoreInputContainer}>
                      <Text style={styles.predictSectionLabel}>{t('matchPrediction.enterExactScore')}</Text>
                      <View style={styles.scoreInputRow}>
                        <View style={styles.scoreInputGroup}>
                          <Text style={styles.scoreInputTeam} numberOfLines={1}>{homeTeamName}</Text>
                          <TextInput
                            style={styles.scoreInput}
                            value={homeScoreInput}
                            onChangeText={(t) => setHomeScoreInput(t.replace(/[^0-9]/g, ''))}
                            keyboardType="number-pad"
                            maxLength={2}
                            placeholder="0"
                            placeholderTextColor={colors.onSurfaceDim}
                          />
                        </View>
                        <Text style={styles.scoreInputDivider}>-</Text>
                        <View style={styles.scoreInputGroup}>
                          <Text style={styles.scoreInputTeam} numberOfLines={1}>{awayTeamName}</Text>
                          <TextInput
                            style={styles.scoreInput}
                            value={awayScoreInput}
                            onChangeText={(t) => setAwayScoreInput(t.replace(/[^0-9]/g, ''))}
                            keyboardType="number-pad"
                            maxLength={2}
                            placeholder="0"
                            placeholderTextColor={colors.onSurfaceDim}
                          />
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Submit */}
                  <TouchableOpacity
                    style={[styles.submitButton, !selectedOutcome && styles.submitButtonDisabled]}
                    onPress={handleSubmitPrediction}
                    disabled={!selectedOutcome || submitting}
                    activeOpacity={0.8}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color={colors.onPrimary} />
                    ) : (
                      <Text style={styles.submitButtonText}>{t('matchPrediction.submitPrediction')}</Text>
                    )}
                  </TouchableOpacity>
                  {predType === 'exact_score' && (
                    <Text style={styles.bonusHint}>{t('matchPrediction.bonusHint')}</Text>
                  )}
                </>
              )}
            </>
          )}
        </View>}

        {/* === GENERIC SPORT TABS (non-football) === */}
        {!isFootball && !isF1 && genericGame && (() => {
          // Determine which tabs to show for this sport
          const supportsEvents = ['hockey', 'american-football'].includes(sport);
          const supportsStats = ['american-football'].includes(sport);
          const supportsH2H = ['hockey', 'basketball', 'baseball', 'american-football', 'rugby', 'volleyball', 'handball', 'afl'].includes(sport);

          const tabs = [
            { key: 'events' as const, label: t('matchPrediction.eventsTab'), show: supportsEvents },
            { key: 'stats' as const, label: t('matchPrediction.statsTab'), show: supportsStats },
            { key: 'h2h' as const, label: t('matchPrediction.h2hTab'), show: supportsH2H },
          ].filter(tab => tab.show);

          if (tabs.length === 0) return null;

          return (
            <>
              <View style={styles.tabBar}>
                {tabs.map((tab) => (
                  <TouchableOpacity
                    key={tab.key}
                    style={[styles.tabItem, genericActiveTab === tab.key && styles.tabItemActive]}
                    onPress={() => setGenericActiveTab(tab.key)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.tabText, genericActiveTab === tab.key && styles.tabTextActive]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* EVENTS TAB */}
              {genericActiveTab === 'events' && supportsEvents && (
                <View style={styles.card}>
                  {genericEventsLoading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : genericEvents.length === 0 ? (
                    <Text style={styles.h2hEmpty}>{t('matchPrediction.noEventsYet')}</Text>
                  ) : (
                    <GenericEventsTab events={genericEvents} sport={sport} homeTeamName={homeTeamName} awayTeamName={awayTeamName} />
                  )}
                </View>
              )}

              {/* STATS TAB */}
              {genericActiveTab === 'stats' && supportsStats && (
                <View style={styles.card}>
                  {genericStatsLoading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : !genericStats ? (
                    <Text style={styles.h2hEmpty}>{t('matchPrediction.noStatsYet')}</Text>
                  ) : (
                    <GenericStatsTab stats={genericStats} homeTeamName={homeTeamName} awayTeamName={awayTeamName} />
                  )}
                </View>
              )}

              {/* H2H TAB */}
              {genericActiveTab === 'h2h' && supportsH2H && (
                <View style={styles.card}>
                  {genericH2HLoading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : genericH2H.length === 0 ? (
                    <Text style={styles.h2hEmpty}>{t('matchPrediction.noPreviousMeetings')}</Text>
                  ) : (
                    <GenericH2HTab
                      games={genericH2H.slice(0, 5)}
                      homeTeamId={genericGame.homeTeam?.apiId}
                      homeTeamName={homeTeamName}
                      awayTeamName={awayTeamName}
                    />
                  )}
                </View>
              )}
            </>
          );
        })()}

        {/* === FOOTBALL TAB BAR === */}
        {isFootball && (events.length > 0 || stats.length >= 2 || lineups.length >= 2) && (
          <>
            <View style={styles.tabBar}>
              {([
                { key: 'events' as const, label: t('matchPrediction.matchEvents'), show: events.length > 0 },
                { key: 'statistics' as const, label: t('matchPrediction.matchStatistics'), show: stats.length >= 2 },
                { key: 'lineups' as const, label: t('matchPrediction.lineups'), show: lineups.length >= 2 },
                { key: 'h2h' as const, label: t('matchPrediction.h2hTab'), show: true },
              ]).filter(tab => tab.show).map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.tabItem, activeTab === tab.key && styles.tabItemActive]}
                  onPress={() => setActiveTab(tab.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* === TAB: EVENTS === */}
            {activeTab === 'events' && sortedEvents.length > 0 && (
              <View style={styles.card}>
                <View style={styles.timeline}>
                  <View style={styles.timelineLine} />
                  {/* 1st Half separator */}
                  {sortedEvents.some(e => (e.timeElapsed || 0) <= 45) && (
                    <View style={styles.halfSeparator}>
                      <View style={styles.halfSeparatorLine} />
                      <Text style={styles.halfSeparatorText}>1ST HALF</Text>
                      <View style={styles.halfSeparatorLine} />
                    </View>
                  )}
                  {[...events]
                    .filter(e => (e.timeElapsed || 0) <= 45)
                    .sort((a, b) => (a.timeElapsed || 0) - (b.timeElapsed || 0))
                    .map((event, idx) => {
                      const evtStyle = getEventIcon(event);
                      return (
                        <View key={`1h-${idx}`} style={styles.timelineEvent}>
                          <View style={[styles.timelineDot, { backgroundColor: evtStyle.bg }]}>
                            {evtStyle.lib === 'ion' && <Ionicons name="football" size={12} color={colors.onPrimary} />}
                            {evtStyle.lib === 'mci' && <MaterialCommunityIcons name={evtStyle.icon as any} size={12} color={evtStyle.color} />}
                            {evtStyle.lib === 'card' && (
                              <View style={{ width: 8, height: 12, borderRadius: 1, backgroundColor: evtStyle.color }} />
                            )}
                          </View>
                          <View style={styles.timelineCard}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.timelineMinute}>
                                {event.timeElapsed}'{event.timeExtra ? `+${event.timeExtra}` : ''} {event.detail || event.type}
                              </Text>
                              <Text style={styles.timelinePlayer}>
                                {event.playerName}{event.assistName ? ` (${event.assistName})` : ''}
                              </Text>
                              <Text style={styles.timelineTeam}>{event.teamName}</Text>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  {/* 2nd Half separator */}
                  {events.some(e => (e.timeElapsed || 0) > 45) && (
                    <View style={styles.halfSeparator}>
                      <View style={styles.halfSeparatorLine} />
                      <Text style={styles.halfSeparatorText}>2ND HALF</Text>
                      <View style={styles.halfSeparatorLine} />
                    </View>
                  )}
                  {[...events]
                    .filter(e => (e.timeElapsed || 0) > 45)
                    .sort((a, b) => (a.timeElapsed || 0) - (b.timeElapsed || 0))
                    .map((event, idx) => {
                      const evtStyle = getEventIcon(event);
                      return (
                        <View key={`2h-${idx}`} style={styles.timelineEvent}>
                          <View style={[styles.timelineDot, { backgroundColor: evtStyle.bg }]}>
                            {evtStyle.lib === 'ion' && <Ionicons name="football" size={12} color={colors.onPrimary} />}
                            {evtStyle.lib === 'mci' && <MaterialCommunityIcons name={evtStyle.icon as any} size={12} color={evtStyle.color} />}
                            {evtStyle.lib === 'card' && (
                              <View style={{ width: 8, height: 12, borderRadius: 1, backgroundColor: evtStyle.color }} />
                            )}
                          </View>
                          <View style={styles.timelineCard}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.timelineMinute}>
                                {event.timeElapsed}'{event.timeExtra ? `+${event.timeExtra}` : ''} {event.detail || event.type}
                              </Text>
                              <Text style={styles.timelinePlayer}>
                                {event.playerName}{event.assistName ? ` (${event.assistName})` : ''}
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
            {activeTab === 'events' && sortedEvents.length === 0 && (
              <View style={styles.card}>
                <Text style={styles.h2hEmpty}>{t('matchPrediction.noEventsYet') || 'No events yet'}</Text>
              </View>
            )}

            {/* === TAB: STATISTICS === */}
            {activeTab === 'statistics' && stats.length >= 2 && (
              <View style={styles.card}>
                {/* Possession — special dual bar */}
                <View style={styles.statRow}>
                  <View style={styles.statHeader}>
                    <Text style={styles.statValueHome}>{homePoss || `${homePossNum}%`}</Text>
                    <Text style={styles.statLabel}>{t('matchPrediction.possession')}</Text>
                    <Text style={styles.statValueAway}>{awayPoss || `${awayPossNum}%`}</Text>
                  </View>
                  <View style={styles.statDualTrack}>
                    <View style={[styles.statBarHome, { flex: homePossNum }]} />
                    <View style={{ width: 3 }} />
                    <View style={[styles.statBarAway, { flex: awayPossNum }]} />
                  </View>
                </View>

                {/* Other stats — dual bars */}
                {STAT_KEYS.map(({ key, label }) => {
                  const [homeVal, awayVal] = getStatValue(stats, key);
                  if (homeVal === null && awayVal === null) return null;
                  const hNum = parseInt(homeVal || '0', 10);
                  const aNum = parseInt(awayVal || '0', 10);
                  const total = hNum + aNum || 1;
                  return (
                    <View key={key} style={styles.statRow}>
                      <View style={styles.statHeader}>
                        <Text style={[styles.statValueHome, hNum > aNum && styles.statValueWinning]}>
                          {homeVal || '0'}
                        </Text>
                        <Text style={styles.statLabel}>{label}</Text>
                        <Text style={[styles.statValueAway, aNum > hNum && styles.statValueWinning]}>
                          {awayVal || '0'}
                        </Text>
                      </View>
                      <View style={styles.statDualTrack}>
                        <View style={[styles.statBarHome, { flex: hNum || 0.1 }]} />
                        <View style={{ width: 3 }} />
                        <View style={[styles.statBarAway, { flex: aNum || 0.1 }]} />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
            {activeTab === 'statistics' && stats.length < 2 && (
              <View style={styles.card}>
                <Text style={styles.h2hEmpty}>{t('matchPrediction.noStatsYet') || 'No statistics available'}</Text>
              </View>
            )}

            {/* === TAB: LINEUPS === */}
            {activeTab === 'lineups' && lineups.length >= 2 && (
              <View style={styles.card}>
                {/* Football Pitch Visualization */}
                {lineups[0]?.startXI?.some(p => p.grid) && (
                  <FootballPitch homeLineup={lineups[0]} awayLineup={lineups[1]} onPlayerPress={openPlayerProfile} />
                )}

                {/* Coaches */}
                {(lineups[0]?.coachName || lineups[1]?.coachName) && (
                  <View style={styles.coachRow}>
                    <View style={styles.coachSide}>
                      {lineups[0]?.coachPhoto ? (
                        <ExpoImage source={{ uri: lineups[0].coachPhoto }} style={styles.coachPhoto} contentFit="cover" cachePolicy="memory-disk" />
                      ) : (
                        <View style={styles.coachPhotoFallback}>
                          <Ionicons name="person" size={12} color={colors.onSurfaceVariant} />
                        </View>
                      )}
                      <Text style={styles.coachName} numberOfLines={1}>{lineups[0]?.coachName || '—'}</Text>
                    </View>
                    <Text style={styles.coachLabel}>{t('matchPrediction.coach')}</Text>
                    <View style={[styles.coachSide, { justifyContent: 'flex-end' }]}>
                      <Text style={styles.coachName} numberOfLines={1}>{lineups[1]?.coachName || '—'}</Text>
                      {lineups[1]?.coachPhoto ? (
                        <ExpoImage source={{ uri: lineups[1].coachPhoto }} style={styles.coachPhoto} contentFit="cover" cachePolicy="memory-disk" />
                      ) : (
                        <View style={styles.coachPhotoFallback}>
                          <Ionicons name="person" size={12} color={colors.onSurfaceVariant} />
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {/* Starting XI — side by side */}
                <Text style={styles.lineupSubtitle}>{t('matchPrediction.startingXI')}</Text>
                <View style={styles.lineupColumns}>
                  <View style={styles.lineupCol}>
                    {lineups[0]?.startXI.map((p, i) => (
                      <TouchableOpacity key={p.apiId || i} style={styles.playerRow} activeOpacity={0.6} onPress={() => p.apiId && openPlayerProfile(p.apiId)}>
                        <View style={styles.playerPhotoRing}>
                          {p.photo ? (
                            <ExpoImage source={{ uri: p.photo }} style={styles.playerPhoto} contentFit="cover" cachePolicy="memory-disk" />
                          ) : (
                            <View style={styles.playerPhotoFallback}>
                              <Ionicons name="person" size={14} color={colors.onSurfaceDim} />
                            </View>
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.playerName} numberOfLines={1}>{p.name}</Text>
                          <Text style={styles.playerPos}>{p.pos === 'G' ? 'GK' : p.pos === 'D' ? 'DEF' : p.pos === 'M' ? 'MID' : 'FWD'}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={12} color={colors.onSurfaceDim} />
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={styles.lineupDivider} />
                  <View style={styles.lineupCol}>
                    {lineups[1]?.startXI.map((p, i) => (
                      <TouchableOpacity key={p.apiId || i} style={styles.playerRow} activeOpacity={0.6} onPress={() => p.apiId && openPlayerProfile(p.apiId)}>
                        <View style={styles.playerPhotoRing}>
                          {p.photo ? (
                            <ExpoImage source={{ uri: p.photo }} style={styles.playerPhoto} contentFit="cover" cachePolicy="memory-disk" />
                          ) : (
                            <View style={styles.playerPhotoFallback}>
                              <Ionicons name="person" size={14} color={colors.onSurfaceDim} />
                            </View>
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.playerName} numberOfLines={1}>{p.name}</Text>
                          <Text style={styles.playerPos}>{p.pos === 'G' ? 'GK' : p.pos === 'D' ? 'DEF' : p.pos === 'M' ? 'MID' : 'FWD'}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={12} color={colors.onSurfaceDim} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Substitutes */}
                {(lineups[0]?.substitutes?.length > 0 || lineups[1]?.substitutes?.length > 0) && (
                  <>
                    <Text style={[styles.lineupSubtitle, { marginTop: 20 }]}>{t('matchPrediction.substitutes')}</Text>
                    <View style={styles.lineupColumns}>
                      <View style={styles.lineupCol}>
                        {lineups[0]?.substitutes.map((p, i) => (
                          <TouchableOpacity key={p.apiId || i} style={styles.subRow} activeOpacity={0.6} onPress={() => p.apiId && openPlayerProfile(p.apiId)}>
                            {p.photo ? (
                              <ExpoImage source={{ uri: p.photo }} style={styles.subPhoto} contentFit="cover" cachePolicy="memory-disk" />
                            ) : (
                              <View style={styles.subPhotoFallback}>
                                <Ionicons name="person" size={10} color={colors.onSurfaceDim} />
                              </View>
                            )}
                            <Text style={styles.subName} numberOfLines={1}>{p.name}</Text>
                            <Text style={styles.subNumber}>{p.number}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <View style={styles.lineupDivider} />
                      <View style={styles.lineupCol}>
                        {lineups[1]?.substitutes.map((p, i) => (
                          <TouchableOpacity key={p.apiId || i} style={styles.subRow} activeOpacity={0.6} onPress={() => p.apiId && openPlayerProfile(p.apiId)}>
                            {p.photo ? (
                              <ExpoImage source={{ uri: p.photo }} style={styles.subPhoto} contentFit="cover" cachePolicy="memory-disk" />
                            ) : (
                              <View style={styles.subPhotoFallback}>
                                <Ionicons name="person" size={10} color={colors.onSurfaceDim} />
                              </View>
                            )}
                            <Text style={styles.subName} numberOfLines={1}>{p.name}</Text>
                            <Text style={styles.subNumber}>{p.number}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </>
                )}
              </View>
            )}
            {activeTab === 'lineups' && lineups.length < 2 && (
              <View style={styles.card}>
                <Text style={styles.h2hEmpty}>{t('matchPrediction.noLineupsYet') || 'Lineups not available yet'}</Text>
              </View>
            )}

            {/* === TAB: H2H === */}
            {activeTab === 'h2h' && (
              <View style={styles.card}>
                {h2hLoading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : h2hFixtures.length === 0 ? (
                  <Text style={styles.h2hEmpty}>{t('matchPrediction.noPreviousMeetings')}</Text>
                ) : (
                  <>
                    {(() => {
                      const last5 = h2hFixtures.slice(0, 5);
                      let homeWins = 0;
                      let draws = 0;
                      let awayWins = 0;
                      const currentHomeId = fixture?.homeTeam?.apiId;
                      last5.forEach((f) => {
                        if (f.homeGoals === f.awayGoals) {
                          draws++;
                        } else if (
                          (f.homeTeam.apiId === currentHomeId && f.homeGoals > f.awayGoals) ||
                          (f.awayTeam.apiId === currentHomeId && f.awayGoals > f.homeGoals)
                        ) {
                          homeWins++;
                        } else {
                          awayWins++;
                        }
                      });
                      return (
                        <View style={styles.h2hSummary}>
                          <View style={styles.h2hSummaryItem}>
                            <Text style={styles.h2hSummaryCount}>{homeWins}</Text>
                            <Text style={styles.h2hSummaryLabel}>{homeTeamName}</Text>
                          </View>
                          <View style={styles.h2hSummaryItem}>
                            <Text style={styles.h2hSummaryCount}>{draws}</Text>
                            <Text style={styles.h2hSummaryLabel}>{t('matchPrediction.draws')}</Text>
                          </View>
                          <View style={styles.h2hSummaryItem}>
                            <Text style={styles.h2hSummaryCount}>{awayWins}</Text>
                            <Text style={styles.h2hSummaryLabel}>{awayTeamName}</Text>
                          </View>
                        </View>
                      );
                    })()}
                    {h2hFixtures.slice(0, 5).map((f, idx) => {
                      const isDraw = f.homeGoals === f.awayGoals;
                      const homeWon = f.homeGoals > f.awayGoals;
                      const awayWon = f.awayGoals > f.homeGoals;
                      // Home team result
                      const homeResult = isDraw ? 'D' : homeWon ? 'W' : 'L';
                      const awayResult = isDraw ? 'D' : awayWon ? 'W' : 'L';
                      const resultStyle = (r: string) => [
                        styles.h2hResultDot,
                        r === 'W' ? styles.h2hResultWin : r === 'L' ? styles.h2hResultLoss : styles.h2hResultDraw,
                      ];
                      const resultTextStyle = (r: string) => [
                        styles.h2hResultDotText,
                        r === 'W' ? styles.h2hResultDotTextWin : r === 'L' ? styles.h2hResultDotTextLoss : styles.h2hResultDotTextDraw,
                      ];
                      return (
                        <View key={f.apiId || idx} style={styles.h2hRow}>
                          <Text style={styles.h2hDate}>
                            {new Date(f.date).toLocaleDateString([], { month: 'short', year: 'numeric' })}
                          </Text>
                          <View style={resultStyle(homeResult)}>
                            <Text style={resultTextStyle(homeResult)}>{homeResult}</Text>
                          </View>
                          <View style={styles.h2hTeamCell}>
                            <Text style={[styles.h2hTeam, { textAlign: 'right' }, homeWon ? { color: '#A3FF00', fontFamily: 'Inter_700Bold' } : {}]} numberOfLines={1}>
                              {f.homeTeam.name}
                            </Text>
                            {f.homeTeam.logo ? (
                              <Image source={{ uri: f.homeTeam.logo }} style={styles.h2hTeamLogo} resizeMode="contain" />
                            ) : null}
                          </View>
                          <View style={styles.h2hScoreBadge}>
                            <Text style={styles.h2hScore}>{f.homeGoals} - {f.awayGoals}</Text>
                          </View>
                          <View style={[styles.h2hTeamCell, { justifyContent: 'flex-start' }]}>
                            {f.awayTeam.logo ? (
                              <Image source={{ uri: f.awayTeam.logo }} style={styles.h2hTeamLogo} resizeMode="contain" />
                            ) : null}
                            <Text style={[styles.h2hTeam, { textAlign: 'left' }, awayWon ? { color: '#A3FF00', fontFamily: 'Inter_700Bold' } : {}]} numberOfLines={1}>
                              {f.awayTeam.name}
                            </Text>
                          </View>
                          <View style={resultStyle(awayResult)}>
                            <Text style={resultTextStyle(awayResult)}>{awayResult}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </>
                )}
              </View>
            )}
          </>
        )}

        {/* Match Info Footer */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.onSurfaceVariant} />
            <Text style={styles.infoText}>
              {new Date(gameDate).toLocaleDateString([], {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
              })}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color={colors.onSurfaceVariant} />
            <Text style={styles.infoText}>
              {new Date(gameDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          {fixture?.venueName && (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={16} color={colors.onSurfaceVariant} />
              <Text style={styles.infoText}>
                {fixture.venueName}{fixture.venueCity ? `, ${fixture.venueCity}` : ''}
              </Text>
            </View>
          )}
          {fixture?.referee && (
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={16} color={colors.onSurfaceVariant} />
              <Text style={styles.infoText}>{fixture.referee}</Text>
            </View>
          )}
        </View>

        </>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* F1 Circuit Fullscreen Modal */}
      {isF1 && f1CircuitImage ? (
        <Modal visible={f1CircuitFullscreen} transparent animationType="fade" onRequestClose={() => setF1CircuitFullscreen(false)}>
          <TouchableOpacity style={styles.f1CircuitFsOverlay} activeOpacity={1} onPress={() => setF1CircuitFullscreen(false)}>
            <ExpoImage source={{ uri: f1CircuitImage }} style={styles.f1CircuitFsImage} contentFit="contain" cachePolicy="memory-disk" />
            <Text style={styles.f1CircuitFsName}>{f1CircuitName}</Text>
            <Text style={styles.f1CircuitFsLocation}>{f1CircuitCity}{f1Country ? `, ${f1Country}` : ''}</Text>
            <TouchableOpacity style={styles.f1CircuitFsClose} onPress={() => setF1CircuitFullscreen(false)}>
              <Ionicons name="close-circle" size={36} color="#fff" />
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      ) : null}

      {/* Football Player Profile Modal */}
      {(playerModal || playerModalLoading) && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setPlayerModal(null)}>
          <TouchableOpacity style={styles.playerModalOverlay} activeOpacity={1} onPress={() => setPlayerModal(null)}>
            <View style={styles.playerModalCard}>
              {playerModalLoading ? (
                <ActivityIndicator size="large" color={colors.primary} style={{ padding: 40 }} />
              ) : playerModal ? (
                <>
                  {/* Header */}
                  <View style={styles.playerModalHeader}>
                    {playerModal.photo ? (
                      <ExpoImage source={{ uri: playerModal.photo }} style={styles.playerModalImg} contentFit="cover" cachePolicy="memory-disk" />
                    ) : (
                      <View style={[styles.playerModalImg, { alignItems: 'center', justifyContent: 'center' }]}>
                        <Ionicons name="person" size={48} color={colors.onSurfaceDim} />
                      </View>
                    )}
                    {playerModal.number ? (
                      <Text style={styles.playerModalNumber}>#{playerModal.number}</Text>
                    ) : null}
                    <Text style={styles.playerModalName}>
                      {playerModal.firstname && playerModal.lastname
                        ? `${playerModal.firstname} ${playerModal.lastname}`
                        : playerModal.name}
                    </Text>
                    <View style={styles.playerModalMeta}>
                      {playerModal.teamLogo ? (
                        <ExpoImage source={{ uri: playerModal.teamLogo }} style={{ width: 18, height: 18 }} contentFit="contain" cachePolicy="memory-disk" />
                      ) : null}
                      <Text style={styles.playerModalTeam}>{playerModal.teamName}</Text>
                    </View>
                    <View style={styles.playerModalTags}>
                      {playerModal.position ? (
                        <View style={styles.playerModalTag}>
                          <Text style={styles.playerModalTagText}>{playerModal.position}</Text>
                        </View>
                      ) : null}
                      {playerModal.nationality ? (
                        <View style={styles.playerModalTag}>
                          <Ionicons name="flag-outline" size={10} color={colors.primary} />
                          <Text style={styles.playerModalTagText}>{playerModal.nationality}</Text>
                        </View>
                      ) : null}
                      {playerModal.age ? (
                        <View style={styles.playerModalTag}>
                          <Text style={styles.playerModalTagText}>{playerModal.age} yrs</Text>
                        </View>
                      ) : null}
                    </View>
                    {(playerModal.height || playerModal.weight) ? (
                      <Text style={styles.playerModalPhysical}>
                        {[playerModal.height, playerModal.weight].filter(Boolean).join('  ·  ')}
                      </Text>
                    ) : null}
                  </View>

                  {/* Season Stats */}
                  {playerModal.stats ? (
                    <>
                      <View style={styles.playerModalStatsHeader}>
                        {playerModal.stats.leagueLogo ? (
                          <ExpoImage source={{ uri: playerModal.stats.leagueLogo }} style={{ width: 16, height: 16 }} contentFit="contain" cachePolicy="memory-disk" />
                        ) : null}
                        <Text style={styles.playerModalStatsTitle}>
                          {playerModal.stats.league ? `${playerModal.stats.season}/${playerModal.stats.season + 1} · ${playerModal.stats.league}` : `Season Stats`}
                        </Text>
                      </View>
                      <View style={styles.playerModalStatsGrid}>
                        {[
                          { label: t('matchPrediction.playerApps') || 'Apps', value: playerModal.stats.appearances, icon: 'shirt-outline' },
                          { label: t('matchPrediction.playerGoals') || 'Goals', value: playerModal.stats.goals, icon: 'football-outline' },
                          { label: t('matchPrediction.playerAssists') || 'Assists', value: playerModal.stats.assists, icon: 'hand-left-outline' },
                          { label: t('matchPrediction.playerRating') || 'Rating', value: playerModal.stats.rating || '—', icon: 'star-outline' },
                          { label: t('matchPrediction.playerYellow') || 'Yellow', value: playerModal.stats.yellowCards, icon: 'square' },
                          { label: t('matchPrediction.playerRed') || 'Red', value: playerModal.stats.redCards, icon: 'square' },
                        ].map((stat, i) => (
                          <View key={i} style={styles.playerModalStatItem}>
                            <Ionicons
                              name={stat.icon as any}
                              size={16}
                              color={stat.label === 'Yellow' ? '#FACC15' : stat.label === 'Red' ? '#EF4444' : colors.primary}
                            />
                            <Text style={styles.playerModalStatValue}>{stat.value}</Text>
                            <Text style={styles.playerModalStatLabel}>{stat.label}</Text>
                          </View>
                        ))}
                      </View>

                      {/* Extra stats row */}
                      <View style={styles.playerModalExtras}>
                        {playerModal.stats.minutes > 0 ? (
                          <Text style={styles.playerModalExtraText}>⏱ {playerModal.stats.minutes}'</Text>
                        ) : null}
                        {playerModal.stats.passAccuracy ? (
                          <Text style={styles.playerModalExtraText}>Pass {playerModal.stats.passAccuracy}</Text>
                        ) : null}
                        {playerModal.stats.tackles > 0 ? (
                          <Text style={styles.playerModalExtraText}>Tackles {playerModal.stats.tackles}</Text>
                        ) : null}
                        {playerModal.stats.saves > 0 ? (
                          <Text style={styles.playerModalExtraText}>Saves {playerModal.stats.saves}</Text>
                        ) : null}
                      </View>
                    </>
                  ) : (
                    <View style={{ padding: 20, alignItems: 'center' }}>
                      <Text style={styles.playerModalExtraText}>{t('matchPrediction.noStatsYet')}</Text>
                    </View>
                  )}
                </>
              ) : null}
              <TouchableOpacity style={styles.playerModalClose} onPress={() => setPlayerModal(null)}>
                <Ionicons name="close-circle" size={32} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* F1 Driver Profile Modal */}
      {(f1DriverModal || f1DriverLoading) && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setF1DriverModal(null)}>
          <TouchableOpacity style={styles.f1DriverModalOverlay} activeOpacity={1} onPress={() => setF1DriverModal(null)}>
            <View style={styles.f1DriverModalCard}>
              {f1DriverLoading ? (
                <ActivityIndicator size="large" color={colors.primary} style={{ padding: 40 }} />
              ) : f1DriverModal ? (
                <>
                  {/* Bio header — centered photo */}
                  <View style={styles.f1DriverModalBioHeader}>
                    {f1DriverModal.image ? (
                      <ExpoImage source={{ uri: f1DriverModal.image }} style={styles.f1DriverModalImg} contentFit="cover" cachePolicy="memory-disk" />
                    ) : (
                      <View style={[styles.f1DriverModalImg, { alignItems: 'center', justifyContent: 'center' }]}>
                        <Ionicons name="person" size={48} color={colors.onSurfaceDim} />
                      </View>
                    )}
                    {f1DriverModal.number ? (
                      <Text style={styles.f1DriverModalNumber}>#{f1DriverModal.number}</Text>
                    ) : null}
                    <Text style={styles.f1DriverModalName}>{f1DriverModal.name}</Text>
                    {f1DriverModal.team?.name ? (
                      <Text style={styles.f1DriverModalTeamName}>{f1DriverModal.team.name}</Text>
                    ) : null}
                    {f1DriverModal.birthplace ? (
                      <View style={styles.f1DriverModalLocationRow}>
                        <Ionicons name="location-outline" size={13} color={colors.onSurfaceDim} />
                        <Text style={styles.f1DriverModalLocation}>{f1DriverModal.birthplace}</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Stats grid */}
                  <View style={styles.f1DriverModalStatsGrid}>
                    {[
                      { label: 'Position', value: f1DriverModal.stats?.position ? `P${f1DriverModal.stats.position}` : '—', icon: 'podium-outline' },
                      { label: 'Points', value: f1DriverModal.stats?.points ?? '—', icon: 'star-outline' },
                      { label: 'Wins', value: f1DriverModal.stats?.wins ?? '—', icon: 'trophy-outline' },
                      { label: 'Podiums', value: f1DriverModal.stats?.podiums ?? '—', icon: 'medal-outline' },
                      { label: 'WDC', value: f1DriverModal.stats?.worldChampionships ?? '—', icon: 'ribbon-outline' },
                      { label: 'GPs', value: f1DriverModal.stats?.grandsPrixEntered ?? '—', icon: 'flag-outline' },
                    ].map((stat, i) => (
                      <View key={i} style={styles.f1DriverModalStatItem}>
                        <Ionicons name={stat.icon as any} size={16} color={colors.primary} />
                        <Text style={styles.f1DriverModalStatValue}>{stat.value}</Text>
                        <Text style={styles.f1DriverModalStatLabel}>{stat.label}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Career stats row */}
                  {f1DriverModal.stats?.careerPoints ? (
                    <View style={styles.f1DriverModalCareer}>
                      <Text style={styles.f1DriverModalCareerText}>Career Points: {f1DriverModal.stats.careerPoints}</Text>
                      {f1DriverModal.stats?.highestRaceFinish ? (
                        <Text style={styles.f1DriverModalCareerText}>Best Finish: P{f1DriverModal.stats.highestRaceFinish}</Text>
                      ) : null}
                      {f1DriverModal.stats?.highestGridPosition ? (
                        <Text style={styles.f1DriverModalCareerText}>Best Grid: P{f1DriverModal.stats.highestGridPosition}</Text>
                      ) : null}
                    </View>
                  ) : null}
                </>
              ) : null}
              <TouchableOpacity style={styles.f1DriverModalClose} onPress={() => setF1DriverModal(null)}>
                <Ionicons name="close-circle" size={32} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  emptyText: { fontFamily: 'Inter_500Medium', fontSize: 16, lineHeight: 24, color: colors.onSurfaceVariant },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: 56, paddingBottom: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLow,
  },
  headerTitle: {
    flex: 1, fontFamily: 'SpaceGrotesk_700Bold', fontSize: 17, color: colors.onSurface,
    textAlign: 'center', letterSpacing: -0.3,
  },

  statusBadgeContainer: { alignItems: 'center', marginBottom: 12 },
  statusBadge: {
    backgroundColor: colors.surfaceContainerHighest, borderRadius: 4,
    paddingHorizontal: 14, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  statusBadgeLive: { backgroundColor: colors.tertiary },
  statusBadgeUpcoming: { backgroundColor: 'rgba(202,253,0,0.08)', borderWidth: 1, borderColor: 'rgba(202,253,0,0.15)' },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  statusBadgeText: {
    fontFamily: 'Inter_700Bold', fontSize: 11, lineHeight: 15, color: colors.onSurfaceVariant,
    letterSpacing: 1, textTransform: 'uppercase',
  },
  statusBadgeTextLive: { color: '#220600' },
  statusBadgeTextUpcoming: { color: colors.primary },

  scoreSection: { alignItems: 'center', paddingHorizontal: spacing.lg, marginBottom: 24 },
  teamsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    width: '100%', marginBottom: 16,
  },
  teamCol: { flex: 1, alignItems: 'center', gap: 8 },
  teamName: {
    fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, lineHeight: 22, color: colors.onSurface,
    textAlign: 'center', textTransform: 'uppercase',
  },
  scoreCol: { alignItems: 'center', paddingHorizontal: 8 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  scoreNum: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 56, lineHeight: 60, color: colors.onSurface },
  scoreDivider: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 28, lineHeight: 32, color: colors.onSurfaceVariant },
  vsLabel: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 28, lineHeight: 36, color: colors.onSurfaceVariant, letterSpacing: 2 },
  halftimeText: { fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 16, color: colors.onSurfaceDim, marginTop: 4 },
  leaguePill: {
    backgroundColor: 'rgba(34,38,43,0.5)', borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  leaguePillLogo: { width: 16, height: 16 },
  leaguePillText: {
    fontFamily: 'SpaceGrotesk_700Bold', fontSize: 14, lineHeight: 20,
    color: colors.onSurfaceVariant, letterSpacing: -0.35,
  },

  // Period score breakdown
  periodScoreContainer: {
    backgroundColor: 'rgba(34,38,43,0.4)', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10,
    marginTop: 8, alignItems: 'center', gap: 6,
  },
  periodScoreTitle: {
    fontFamily: 'Inter_700Bold', fontSize: 9, color: colors.onSurfaceDim, letterSpacing: 1.2, textTransform: 'uppercase',
  },
  periodScoreRow: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
  periodScoreCell: { alignItems: 'center', gap: 2 },
  periodScoreLabel: {
    fontFamily: 'Inter_700Bold', fontSize: 9, color: colors.onSurfaceDim, letterSpacing: 0.8,
  },
  periodScoreHome: {
    fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, color: colors.onSurface,
  },
  periodScoreDash: {
    fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, color: colors.onSurfaceVariant,
  },
  periodScoreAway: {
    fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, color: colors.onSurface,
  },

  card: {
    marginHorizontal: 16, backgroundColor: colors.surfaceContainerLow, borderRadius: 8,
    padding: 24, marginBottom: 24, gap: 24,
  },
  cardTitle: {
    fontFamily: 'SpaceGrotesk_700Bold', fontSize: 20, lineHeight: 28, color: colors.onSurface,
    letterSpacing: -0.5, textTransform: 'uppercase',
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 16,
    backgroundColor: 'rgba(30,32,36,0.8)', borderRadius: 12, padding: 4, gap: 4,
  },
  tabItem: {
    flex: 1, paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center',
    borderRadius: 8,
  },
  tabItemActive: { backgroundColor: '#A3FF00' },
  tabText: {
    fontFamily: 'Inter_700Bold', fontSize: 11, color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.5, textTransform: 'uppercase', textAlign: 'center',
  },
  tabTextActive: { color: '#0D0D0D' },
  halfSeparator: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, marginLeft: 36,
  },
  halfSeparatorLine: { flex: 1, height: 1, backgroundColor: 'rgba(69,72,76,0.3)' },
  halfSeparatorText: {
    fontFamily: 'Inter_700Bold', fontSize: 9, color: colors.onSurfaceDim,
    letterSpacing: 1.2,
  },

  statRow: { gap: 6 },
  statHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statLabel: {
    fontFamily: 'Inter_700Bold', fontSize: 11, lineHeight: 16, color: colors.onSurfaceVariant,
    letterSpacing: 1, textTransform: 'uppercase', textAlign: 'center', flex: 1,
  },
  statValueHome: {
    fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, lineHeight: 22,
    color: colors.onSurfaceVariant, width: 48, textAlign: 'left',
  },
  statValueAway: {
    fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, lineHeight: 22,
    color: colors.onSurfaceVariant, width: 48, textAlign: 'right',
  },
  statValueWinning: { color: colors.onSurface },
  statDualTrack: { flexDirection: 'row', height: 6, alignItems: 'center' },
  statBarHome: { height: '100%' as any, backgroundColor: colors.primary, borderRadius: 12 },
  statBarAway: { height: '100%' as any, backgroundColor: '#45484C', borderRadius: 12 },

  timeline: { gap: 16, position: 'relative' },
  timelineLine: {
    position: 'absolute', left: 11, top: 8, bottom: 8, width: 2,
    backgroundColor: 'rgba(69,72,76,0.3)',
  },
  timelineEvent: { flexDirection: 'row', alignItems: 'flex-start' },
  timelineDot: {
    width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    marginRight: 12, borderWidth: 4, borderColor: colors.background, zIndex: 2,
  },
  timelineCard: {
    flex: 1, backgroundColor: 'rgba(34,38,43,0.4)', borderRadius: 4, padding: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  timelineMinute: {
    fontFamily: 'Inter_700Bold', fontSize: 10, lineHeight: 15, color: colors.onSurfaceVariant,
    letterSpacing: -0.5, textTransform: 'uppercase',
  },
  timelinePlayer: { fontFamily: 'Inter_700Bold', fontSize: 14, lineHeight: 20, color: colors.onSurface },
  timelineTeam: { fontFamily: 'Inter_500Medium', fontSize: 11, lineHeight: 15, color: colors.onSurfaceDim },

  // Prediction Card
  predictCard: {
    marginHorizontal: 16, backgroundColor: 'rgba(34,38,43,0.4)', borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(69,72,76,0.1)', padding: 25, marginBottom: 24, gap: 12,
  },
  predictHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4,
  },
  predictSectionLabel: {
    fontFamily: 'Inter_700Bold', fontSize: 10, lineHeight: 15, color: colors.onSurfaceVariant,
    letterSpacing: 1, textTransform: 'uppercase', marginTop: 4,
  },
  typeToggle: {
    flexDirection: 'row', backgroundColor: colors.surfaceContainerHighest, borderRadius: 8, padding: 3,
  },
  typeToggleBtn: {
    flex: 1, paddingVertical: 8, alignItems: 'center', justifyContent: 'center',
    borderRadius: 6, flexDirection: 'row', gap: 4,
  },
  typeToggleBtnActive: { backgroundColor: colors.primary },
  typeToggleBtnText: {
    fontFamily: 'Inter_700Bold', fontSize: 12, color: colors.onSurfaceVariant, letterSpacing: 0.5,
  },
  typeToggleBtnTextActive: { color: colors.onPrimary },
  outcomeRow: {
    flexDirection: 'row', gap: 8,
  },
  outcomeBtn: {
    flex: 1, alignItems: 'center', backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 12, paddingVertical: 14, paddingHorizontal: 8, gap: 8,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  outcomeBtnSelected: {
    borderColor: colors.primary, backgroundColor: 'rgba(198,255,0,0.08)',
  },
  outcomeIconWrap: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', justifyContent: 'center',
  },
  outcomeIconWrapSelected: {
    backgroundColor: 'rgba(198,255,0,0.15)',
  },
  outcomeLogo: {
    width: 36, height: 36,
  },
  outcomeBtnLabel: {
    fontFamily: 'Inter_700Bold', fontSize: 11, color: colors.onSurfaceVariant,
    letterSpacing: 0.3, textTransform: 'uppercase', textAlign: 'center', lineHeight: 15,
  },
  outcomeBtnLabelSelected: { color: colors.onSurface },
  outcomeCheck: {
    position: 'absolute', top: 6, right: 6,
  },

  scoreInputContainer: { gap: 8, marginTop: 4 },
  scoreInputRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  scoreInputGroup: { alignItems: 'center', gap: 6, flex: 1 },
  scoreInputTeam: {
    fontFamily: 'Inter_500Medium', fontSize: 11, color: colors.onSurfaceVariant, textTransform: 'uppercase',
  },
  scoreInput: {
    width: 64, height: 56, borderRadius: 8, backgroundColor: colors.surfaceContainerHighest,
    fontFamily: 'SpaceGrotesk_700Bold', fontSize: 28, color: colors.onSurface, textAlign: 'center',
    borderWidth: 1, borderColor: 'rgba(69,72,76,0.3)',
  },
  scoreInputDivider: {
    fontFamily: 'SpaceGrotesk_700Bold', fontSize: 24, color: colors.onSurfaceVariant, marginTop: 20,
  },

  submitButton: {
    backgroundColor: colors.primary, borderRadius: borderRadius.sm, paddingVertical: 14,
    alignItems: 'center', marginTop: 8,
  },
  submitButtonDisabled: { opacity: 0.4 },
  submitButtonText: {
    fontFamily: 'Inter_700Bold', fontSize: 14, lineHeight: 20, color: colors.onPrimary,
    letterSpacing: 1, textTransform: 'uppercase',
  },
  bonusHint: {
    fontFamily: 'Inter_500Medium', fontSize: 11, color: colors.onSurfaceDim, textAlign: 'center',
  },

  cantPredictContainer: { alignItems: 'center', gap: 8, paddingVertical: 12 },
  cantPredictText: {
    fontFamily: 'Inter_500Medium', fontSize: 13, color: colors.onSurfaceVariant, textAlign: 'center',
  },
  existingPredText: {
    fontFamily: 'Inter_700Bold', fontSize: 12, color: colors.primary, textAlign: 'center', marginTop: 4,
  },

  existingPredContainer: { gap: 8, alignItems: 'center', paddingVertical: 8 },
  existingPredBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(198,255,0,0.1)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  existingPredBadgeText: {
    fontFamily: 'Inter_700Bold', fontSize: 10, color: colors.primary, letterSpacing: 1,
  },
  existingPredDetail: {
    fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, color: colors.onSurface,
  },
  existingPredScore: {
    fontFamily: 'Inter_500Medium', fontSize: 14, color: colors.onSurfaceVariant,
  },
  existingPredMultiplier: {
    fontFamily: 'Inter_700Bold', fontSize: 12, color: colors.primary, letterSpacing: 0.5,
  },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(220,38,38,0.3)',
  },
  deleteBtnText: { fontFamily: 'Inter_700Bold', fontSize: 12, color: '#DC2626' },

  resolvedContainer: { gap: 8, alignItems: 'center', paddingVertical: 12 },
  resolvedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  resolvedWon: { backgroundColor: 'rgba(22,163,74,0.15)' },
  resolvedLost: { backgroundColor: 'rgba(220,38,38,0.15)' },
  resolvedVoid: { backgroundColor: 'rgba(150,150,150,0.15)' },
  resolvedBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 1 },
  resolvedDetail: { fontFamily: 'Inter_500Medium', fontSize: 13, color: colors.onSurfaceVariant },
  pointsAwardedText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 24, color: colors.primary },
  resolvedActual: { fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.onSurfaceDim },


  infoCard: {
    marginHorizontal: 16, backgroundColor: colors.surfaceContainerLow, borderRadius: 8,
    padding: 20, gap: 12, marginBottom: 24,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoText: { fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 18, color: colors.onSurfaceVariant },

  // Head to Head
  h2hEmpty: {
    fontFamily: 'Inter_500Medium', fontSize: 13, color: colors.onSurfaceVariant, textAlign: 'center',
    paddingVertical: 12,
  },
  h2hSummary: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    backgroundColor: 'rgba(34,38,43,0.5)', borderRadius: 8, paddingVertical: 16, marginBottom: 16,
  },
  h2hSummaryItem: { alignItems: 'center', gap: 4 },
  h2hSummaryCount: {
    fontFamily: 'SpaceGrotesk_700Bold', fontSize: 28, lineHeight: 32, color: colors.onSurface,
  },
  h2hSummaryLabel: {
    fontFamily: 'Inter_700Bold', fontSize: 10, color: colors.onSurfaceVariant,
    letterSpacing: 0.5, textTransform: 'uppercase',
  },
  h2hRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(69,72,76,0.15)',
  },
  h2hDate: {
    fontFamily: 'Inter_500Medium', fontSize: 10, color: colors.onSurfaceDim,
    width: 56, letterSpacing: 0.2,
  },
  h2hTeamCell: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 5,
  },
  h2hTeamLogo: { width: 18, height: 18 },
  h2hTeam: {
    flex: 1, fontFamily: 'Inter_500Medium', fontSize: 11, color: colors.onSurface,
  },
  h2hScoreBadge: {
    backgroundColor: colors.surfaceContainerHighest, borderRadius: 4,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  h2hScore: {
    fontFamily: 'SpaceGrotesk_700Bold', fontSize: 13, color: colors.onSurface, letterSpacing: 0.5,
  },
  h2hResultDot: {
    width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
  },
  h2hResultWin: { backgroundColor: 'rgba(163,255,0,0.15)' },
  h2hResultLoss: { backgroundColor: 'rgba(220,38,38,0.15)' },
  h2hResultDraw: { backgroundColor: 'rgba(150,150,150,0.15)' },
  h2hResultDotText: {
    fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 0.3, color: colors.onSurface,
  },
  h2hResultDotTextWin: { color: '#A3FF00' },
  h2hResultDotTextLoss: { color: '#DC2626' },
  h2hResultDotTextDraw: { color: colors.onSurfaceVariant },

  // Lineups
  formationRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 16,
  },
  formationBadge: {
    backgroundColor: 'rgba(198,255,0,0.1)', borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1,
    borderColor: 'rgba(198,255,0,0.2)',
  },
  formationText: {
    fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, color: colors.primaryContainer,
  },
  formationVs: {
    fontFamily: 'Inter_700Bold', fontSize: 11, color: colors.onSurfaceVariant,
    letterSpacing: 0.5, textTransform: 'uppercase',
  },
  coachRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(34,38,43,0.5)', borderRadius: 6, padding: 12, marginBottom: 16,
  },
  coachSide: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  coachPhoto: { width: 28, height: 28, borderRadius: 14 },
  coachPhotoFallback: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center', justifyContent: 'center',
  },
  coachName: { fontFamily: 'Inter_700Bold', fontSize: 12, color: colors.onSurface, flex: 1 },
  coachLabel: {
    fontFamily: 'Inter_700Bold', fontSize: 9, color: colors.onSurfaceVariant,
    letterSpacing: 1, textTransform: 'uppercase', marginHorizontal: 8,
  },
  lineupSubtitle: {
    fontFamily: 'Inter_700Bold', fontSize: 10, color: colors.onSurfaceVariant,
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12,
  },
  lineupColumns: { flexDirection: 'row' },
  lineupCol: { flex: 1, gap: 2 },
  lineupDivider: { width: 1, backgroundColor: 'rgba(69,72,76,0.2)', marginHorizontal: 8 },
  playerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 6, paddingHorizontal: 4, borderRadius: 4,
  },
  playerPhotoRing: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 1.5, borderColor: 'rgba(163,255,0,0.3)',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  playerPhoto: { width: 30, height: 30, borderRadius: 15 },
  playerPhotoFallback: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center', justifyContent: 'center',
  },
  playerName: { fontFamily: 'Inter_700Bold', fontSize: 11, color: colors.onSurface },
  playerPos: { fontFamily: 'Inter_500Medium', fontSize: 9, color: colors.onSurfaceVariant, letterSpacing: 0.5 },
  playerNumber: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 13, color: colors.onSurfaceVariant, minWidth: 20, textAlign: 'right' },
  subRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 4,
  },
  subPhoto: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surfaceContainerHighest,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  subPhotoFallback: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center', justifyContent: 'center',
  },
  subName: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 10, color: colors.onSurfaceDim },
  subNumber: { fontFamily: 'Inter_700Bold', fontSize: 10, color: colors.onSurfaceVariant, minWidth: 18, textAlign: 'right' },

  // F1 Race Detail styles
  f1DetailContainer: { padding: 16, gap: 8 },
  f1DetailCircuitImage: { width: '100%' as any, height: 120, opacity: 0.8, marginVertical: 8 },
  f1DetailCircuitName: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 22, color: colors.onSurface, letterSpacing: -0.5 },
  f1DetailCircuitLocation: { fontFamily: 'Inter_500Medium', fontSize: 14, color: colors.onSurfaceVariant },
  f1DetailInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  f1DetailInfoText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: colors.onSurfaceVariant },
  f1FastestLapCard: {
    marginTop: 20,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(168,85,247,0.4)',
    backgroundColor: 'rgba(168,85,247,0.06)',
    overflow: 'hidden',
  },
  f1FastestLapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    backgroundColor: 'rgba(168,85,247,0.12)',
  },
  f1FastestLapTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 13,
    color: '#A855F7',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  f1FastestLapBody: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  f1FastestLapDriverImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(168,85,247,0.15)',
  },
  f1FastestLapInfo: { flex: 1, gap: 2 },
  f1FastestLapDriverName: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    color: '#C084FC',
  },
  f1FastestLapTeam: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: 'rgba(192,132,252,0.6)',
  },
  f1FastestLapTimeBox: {
    alignItems: 'flex-end',
    gap: 2,
  },
  f1FastestLapTimeLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9,
    color: 'rgba(168,85,247,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  f1FastestLapTimeValue: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    color: '#A855F7',
  },
  f1ResultsSection: { marginTop: 20, gap: 4 },
  f1ResultsTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, color: colors.onSurface, letterSpacing: -0.3, marginBottom: 8, textTransform: 'uppercase' },
  f1ResultRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, paddingHorizontal: 12,
    backgroundColor: colors.surfaceContainer, borderRadius: 12, marginBottom: 4,
  },
  f1ResultRowWinner: { backgroundColor: 'rgba(202,253,0,0.08)', borderWidth: 1, borderColor: 'rgba(202,253,0,0.2)' },
  f1ResultPos: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 15, color: colors.onSurfaceVariant, width: 30, textAlign: 'center' },
  f1ResultPosPodium: { color: colors.primary },
  f1ResultDriverImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  f1ResultDriverImgPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  f1ResultTeamLogoWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  f1ResultTeamLogo: {
    width: 22,
    height: 22,
  },
  f1ResultDriverInfo: { flex: 1, gap: 3 },
  f1ResultTeamRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  f1ResultTeamLogoInline: { width: 18, height: 14 },
  f1ResultDriverName: { fontFamily: 'Inter_700Bold', fontSize: 14, color: colors.onSurface },
  f1ResultTeamName: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: colors.onSurfaceVariant },
  f1ResultRightCol: { alignItems: 'flex-end', gap: 4 },
  f1ResultTimeCol: { alignItems: 'flex-end', minWidth: 64, gap: 1 },
  f1ResultTime: { fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.onSurfaceVariant },
  f1ResultPits: { fontFamily: 'Inter_400Regular', fontSize: 10, color: colors.onSurfaceDim },
  f1ChampionshipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  f1ChampionshipBtnText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 15,
    color: colors.background,
    letterSpacing: -0.3,
  },
  f1ResultAvatarWrap: {},
  f1CircuitZoomHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: -20, paddingRight: 8, paddingBottom: 4 },
  f1CircuitZoomHintText: { fontFamily: 'Inter_400Regular', fontSize: 10, color: 'rgba(255,255,255,0.4)' },
  f1CircuitFsOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  f1CircuitFsImage: { width: '100%', height: 300 },
  f1CircuitFsName: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 20, color: '#fff', marginTop: 16, textAlign: 'center', paddingHorizontal: 24 },
  f1CircuitFsLocation: { fontFamily: 'Inter_400Regular', fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  f1CircuitFsClose: { position: 'absolute', top: 60, right: 24 },
  f1UpcomingNotice: { alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 40 },
  f1UpcomingNoticeText: { fontFamily: 'Inter_500Medium', fontSize: 16, color: colors.onSurfaceVariant, textAlign: 'center' },
  // Driver profile modal
  f1DriverModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  f1DriverModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    paddingBottom: 8,
  },
  f1DriverModalBioHeader: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 16,
    paddingHorizontal: 20,
    gap: 6,
    backgroundColor: 'rgba(202,253,0,0.04)',
  },
  f1DriverModalImg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 3,
    borderColor: 'rgba(202,253,0,0.25)',
    marginBottom: 8,
  },
  f1DriverModalNumber: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
    color: colors.primary,
    letterSpacing: 1,
  },
  f1DriverModalName: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 22,
    color: colors.onSurface,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  f1DriverModalTeamName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  f1DriverModalLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  f1DriverModalLocation: { fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.onSurfaceDim },
  f1DriverModalStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 8,
  },
  f1DriverModalStatItem: {
    width: '30%',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
  },
  f1DriverModalStatValue: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 20,
    color: colors.onSurface,
  },
  f1DriverModalStatLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: colors.onSurfaceDim,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  f1DriverModalCareer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  f1DriverModalCareerText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  f1DriverModalClose: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  // Football player profile modal
  playerModalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  playerModalCard: {
    width: '100%', maxWidth: 380, backgroundColor: colors.surface, borderRadius: 20, overflow: 'hidden', paddingBottom: 8,
  },
  playerModalHeader: {
    alignItems: 'center', paddingTop: 28, paddingBottom: 16, paddingHorizontal: 20, gap: 4,
    backgroundColor: 'rgba(163,255,0,0.04)',
  },
  playerModalImg: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 3, borderColor: 'rgba(163,255,0,0.25)', marginBottom: 8,
  },
  playerModalNumber: {
    fontFamily: 'SpaceGrotesk_700Bold', fontSize: 14, color: colors.primary, letterSpacing: 1,
  },
  playerModalName: {
    fontFamily: 'SpaceGrotesk_700Bold', fontSize: 22, color: colors.onSurface,
    letterSpacing: -0.5, textAlign: 'center',
  },
  playerModalMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  playerModalTeam: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.onSurfaceVariant },
  playerModalTags: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' },
  playerModalTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4,
  },
  playerModalTagText: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: colors.onSurfaceVariant, letterSpacing: 0.3 },
  playerModalPhysical: {
    fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.onSurfaceDim, marginTop: 4,
  },
  playerModalStatsHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6,
  },
  playerModalStatsTitle: {
    fontFamily: 'Inter_700Bold', fontSize: 10, color: colors.onSurfaceDim,
    letterSpacing: 0.8, textTransform: 'uppercase',
  },
  playerModalStatsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', padding: 12, paddingTop: 4, gap: 8,
  },
  playerModalStatItem: {
    width: '30%', alignItems: 'center', gap: 4, paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10,
  },
  playerModalStatValue: {
    fontFamily: 'SpaceGrotesk_700Bold', fontSize: 20, color: colors.onSurface,
  },
  playerModalStatLabel: {
    fontFamily: 'Inter_400Regular', fontSize: 10, color: colors.onSurfaceDim,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  playerModalExtras: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12,
    paddingHorizontal: 16, paddingBottom: 16,
  },
  playerModalExtraText: { fontFamily: 'Inter_500Medium', fontSize: 11, color: colors.onSurfaceVariant },
  playerModalClose: { position: 'absolute', top: 8, right: 8 },

  f1PredictCta: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(202,253,0,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(202,253,0,0.25)',
    overflow: 'hidden',
  },
  f1PredictCtaInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  f1PredictCtaIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  f1PredictCtaTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    color: colors.onSurface,
    letterSpacing: -0.3,
  },
  f1PredictCtaSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
});
