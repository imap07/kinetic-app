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
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, spacing, borderRadius } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { usePurchases } from '../contexts/PurchasesContext';
import { footballApi, sportsApi, predictionsApi, SPORT_TABS } from '../api';
import { FREE_SPORT } from '../api/sports';
import type { Fixture, FixtureEvent, FixtureStatistic, TeamLineup, LineupPlayer, SportGame, PredictionData, DailyStatusResponse } from '../api';
import Toast from 'react-native-toast-message';

type Props = { navigation: any };

type PredictionType = 'result' | 'exact_score';
type OutcomeChoice = 'home' | 'draw' | 'away';

const LIVE_STATUSES = ['1H', '2H', 'HT', 'ET', 'P', 'BT', 'LIVE', 'Q1', 'Q2', 'Q3', 'Q4', 'OT', 'P1', 'P2', 'P3'];
const FINISHED_STATUSES = ['FT', 'AET', 'PEN', 'AOT', 'AP', 'POST'];
const NO_DRAW_SPORTS = ['basketball', 'baseball', 'american-football', 'formula-1'];

function getStatusDisplay(status: string, statusLong?: string, elapsed?: number | string | null, date?: string): { label: string; isLive: boolean; isUpcoming: boolean } {
  if (LIVE_STATUSES.includes(status)) {
    return {
      label: elapsed ? `LIVE · ${elapsed}'` : 'LIVE',
      isLive: true,
      isUpcoming: false,
    };
  }
  if (FINISHED_STATUSES.includes(status)) {
    return { label: statusLong || 'Full Time', isLive: false, isUpcoming: false };
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
    if (gameDay.getTime() === today.getTime()) dayLabel = 'TODAY';
    else if (gameDay.getTime() === tomorrow.getTime()) dayLabel = 'TOMORROW';
    else dayLabel = d.toLocaleDateString([], { month: 'short', day: 'numeric' }).toUpperCase();

    return { label: `${dayLabel} · ${time}`, isLive: false, isUpcoming: true };
  }
  return { label: 'SCHEDULED', isLive: false, isUpcoming: true };
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

export function MatchPredictionScreen({ navigation }: Props) {
  const route = useRoute<any>();
  const { fixtureApiId, sport = 'football' } = route.params as { fixtureApiId: number; sport?: string };
  const { tokens } = useAuth();
  const { isProMember } = usePurchases();

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
  const [dailyStatus, setDailyStatus] = useState<DailyStatusResponse | null>(null);

  const [h2hFixtures, setH2hFixtures] = useState<Fixture[]>([]);
  const [h2hLoading, setH2hLoading] = useState(false);

  const isFootball = sport === 'football';
  const hasDraw = !NO_DRAW_SPORTS.includes(sport);
  const isF1 = sport === 'formula-1';

  useEffect(() => {
    if (!isProMember && sport !== FREE_SPORT) {
      const sportMeta = SPORT_TABS.find((t) => t.key === sport);
      navigation.replace('Paywall' as any, {
        trigger: 'sport_locked',
        sportName: sportMeta?.name ?? sport,
      });
    }
  }, [sport, isProMember, navigation]);

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

      const [predResult, statusResult] = await Promise.all([
        predictionsApi.getPredictionForGame(sport, fixtureApiId, tokens.accessToken),
        predictionsApi.getDailyStatus(tokens.accessToken),
      ]);

      setDailyStatus(statusResult);
      const { prediction } = predResult;
      if (prediction) {
        setExistingPrediction(prediction);
        setSelectedOutcome(prediction.predictedOutcome);
        setPredType(prediction.predictionType);
        if (prediction.predictedHomeScore != null) setHomeScoreInput(String(prediction.predictedHomeScore));
        if (prediction.predictedAwayScore != null) setAwayScoreInput(String(prediction.predictedAwayScore));
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error loading match', text2: 'Pull down to try again' });
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
  const canPredict = !isFinished && !isLive && !existingPrediction;

  const statusDisplay = getStatusDisplay(gameStatus, statusLong, fixture?.elapsed, fixture?.date || genericGame?.date);

  const handleSubmitPrediction = async () => {
    if (!tokens?.accessToken || !selectedOutcome) return;

    if (predType === 'exact_score' && !isProMember) {
      navigation.navigate('Paywall' as any, { trigger: 'exact_score' });
      return;
    }

    if (!isProMember && dailyStatus && dailyStatus.used >= dailyStatus.limit) {
      navigation.navigate('Paywall' as any, {
        trigger: 'daily_limit',
        dailyUsed: dailyStatus.used,
        dailyLimit: dailyStatus.limit,
      });
      return;
    }

    if (predType === 'exact_score' && (homeScoreInput === '' || awayScoreInput === '')) {
      Alert.alert('Missing Scores', 'Please enter both home and away scores for an exact score prediction.');
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
      setDailyStatus((prev) => prev ? { ...prev, used: prev.used + 1 } : prev);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Prediction Submitted', 'Your prediction has been recorded. Good luck!');
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
      'Cancel Prediction',
      'This will permanently cancel your pick for this match.\n\n' +
        '\u2022 Your daily pick slot will be refunded\n' +
        '\u2022 You will NOT be able to re-pick this match\n' +
        '\u2022 Points already earned are unaffected\n\n' +
        'Are you sure?',
      [
        { text: 'Keep Pick', style: 'cancel' },
        {
          text: 'Cancel Pick',
          style: 'destructive',
          onPress: async () => {
            try {
              await predictionsApi.deletePrediction(existingPrediction._id, tokens.accessToken!);
              setExistingPrediction(null);
              setSelectedOutcome(null);
              setPredType('result');
              setHomeScoreInput('');
              setAwayScoreInput('');
              Toast.show({ type: 'success', text1: 'Prediction cancelled', text2: 'Your daily pick slot has been refunded' });
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
          <Text style={styles.headerTitle}>Match Details</Text>
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
          <Text style={styles.headerTitle}>Match Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.onSurfaceVariant} />
          <Text style={styles.emptyText}>Match not found</Text>
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
          { key: 'draw', label: 'Draw' },
          { key: 'away', label: awayTeamName, logo: awayTeamLogo },
        ]
      : [
          { key: 'home', label: homeTeamName, logo: homeTeamLogo },
          { key: 'away', label: awayTeamName, logo: awayTeamLogo },
        ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {leagueName || 'Match Details'}
        </Text>
        {leagueLogo ? (
          <Image source={{ uri: leagueLogo }} style={{ width: 28, height: 28 }} resizeMode="contain" />
        ) : (
          <View style={{ width: 28 }} />
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
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
        </View>

        {/* PREDICTION CARD */}
        <View style={styles.predictCard}>
          <View style={styles.predictHeader}>
            <Text style={styles.cardTitle}>
              {existingPrediction ? 'YOUR PREDICTION' : 'MAKE YOUR PREDICTION'}
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
                  {existingPrediction.status === 'void' ? 'VOID' : existingPrediction.status === 'won' ? 'WON' : 'LOST'}
                </Text>
              </View>
              {existingPrediction.status === 'void' ? (
                <Text style={styles.resolvedDetail}>
                  Match cancelled — prediction voided
                </Text>
              ) : (
                <Text style={styles.resolvedDetail}>
                  You predicted: {existingPrediction.predictedOutcome.toUpperCase()}
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
                  Final: {existingPrediction.actualHomeScore} - {existingPrediction.actualAwayScore}
                </Text>
              )}
            </View>
          ) : (
            <>
              {isFinished || isLive ? (
                <View style={styles.cantPredictContainer}>
                  <Ionicons name="time-outline" size={24} color={colors.onSurfaceVariant} />
                  <Text style={styles.cantPredictText}>
                    {isLive ? 'Predictions are locked during live matches' : 'This match has already finished'}
                  </Text>
                  {existingPrediction && (
                    <Text style={styles.existingPredText}>
                      Your pick: {existingPrediction.predictedOutcome.toUpperCase()}
                      {existingPrediction.predictionType === 'exact_score'
                        ? ` (${existingPrediction.predictedHomeScore}-${existingPrediction.predictedAwayScore})`
                        : ''} -- Awaiting result
                    </Text>
                  )}
                </View>
              ) : existingPrediction ? (
                <View style={styles.existingPredContainer}>
                  <View style={styles.existingPredBadge}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                    <Text style={styles.existingPredBadgeText}>PREDICTION LOCKED</Text>
                  </View>
                  <Text style={styles.existingPredDetail}>
                    {existingPrediction.predictedOutcome === 'home' ? homeTeamName + ' Win' :
                     existingPrediction.predictedOutcome === 'away' ? awayTeamName + ' Win' : 'Draw'}
                  </Text>
                  {existingPrediction.predictionType === 'exact_score' && (
                    <Text style={styles.existingPredScore}>
                      Exact Score: {existingPrediction.predictedHomeScore} - {existingPrediction.predictedAwayScore}
                    </Text>
                  )}
                  <Text style={styles.existingPredMultiplier}>
                    x{existingPrediction.oddsMultiplier.toFixed(1)} multiplier
                  </Text>
                  <TouchableOpacity style={styles.deleteBtn} onPress={handleDeletePrediction}>
                    <Ionicons name="close-circle-outline" size={16} color="#DC2626" />
                    <Text style={styles.deleteBtnText}>Cancel Pick</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {/* Daily picks counter */}
                  {!isProMember && dailyStatus && (
                    <View style={styles.dailyLimitBanner}>
                      <MaterialCommunityIcons name="lightning-bolt" size={14} color={colors.primary} />
                      <Text style={styles.dailyLimitText}>
                        {dailyStatus.used}/{dailyStatus.limit} free picks today
                      </Text>
                      {dailyStatus.used >= dailyStatus.limit && (
                        <TouchableOpacity onPress={() => navigation.navigate('Paywall' as any, { trigger: 'daily_limit', dailyUsed: dailyStatus.used, dailyLimit: dailyStatus.limit })} hitSlop={8}>
                          <Text style={styles.dailyLimitUpgrade}>UPGRADE</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  {/* Prediction type toggle */}
                  {!isF1 && (
                    <View style={styles.typeToggle}>
                      <TouchableOpacity
                        style={[styles.typeToggleBtn, predType === 'result' && styles.typeToggleBtnActive]}
                        onPress={() => setPredType('result')}
                      >
                        <Text style={[styles.typeToggleBtnText, predType === 'result' && styles.typeToggleBtnTextActive]}>
                          Result
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.typeToggleBtn, predType === 'exact_score' && styles.typeToggleBtnActive]}
                        onPress={() => {
                          if (!isProMember) {
                            navigation.navigate('Paywall' as any, { trigger: 'exact_score' });
                            return;
                          }
                          setPredType('exact_score');
                        }}
                      >
                        <Text style={[styles.typeToggleBtnText, predType === 'exact_score' && styles.typeToggleBtnTextActive]}>
                          Exact Score
                        </Text>
                        {!isProMember && (
                          <Ionicons name="lock-closed" size={12} color={colors.onSurfaceVariant} />
                        )}
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Outcome selection */}
                  <Text style={styles.predictSectionLabel}>
                    {isF1 ? 'PICK THE WINNER' : 'PREDICT THE RESULT'}
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
                      <Text style={styles.predictSectionLabel}>ENTER EXACT SCORE</Text>
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
                      <Text style={styles.submitButtonText}>SUBMIT PREDICTION</Text>
                    )}
                  </TouchableOpacity>
                  {predType === 'exact_score' && (
                    <Text style={styles.bonusHint}>Exact score correct = 2.5x bonus points</Text>
                  )}
                </>
              )}
            </>
          )}
        </View>

        {/* Football-specific: Match Statistics */}
        {isFootball && stats.length >= 2 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>MATCH STATISTICS</Text>

            {/* Possession — special dual bar */}
            <View style={styles.statRow}>
              <View style={styles.statHeader}>
                <Text style={styles.statValueHome}>{homePoss || `${homePossNum}%`}</Text>
                <Text style={styles.statLabel}>POSSESSION</Text>
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

        {/* Football-specific: Lineups */}
        {isFootball && lineups.length >= 2 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>LINEUPS</Text>

            {/* Formations */}
            <View style={styles.formationRow}>
              <View style={styles.formationBadge}>
                <Text style={styles.formationText}>{lineups[0]?.formation || '—'}</Text>
              </View>
              <Text style={styles.formationVs}>vs</Text>
              <View style={styles.formationBadge}>
                <Text style={styles.formationText}>{lineups[1]?.formation || '—'}</Text>
              </View>
            </View>

            {/* Coaches */}
            {(lineups[0]?.coachName || lineups[1]?.coachName) && (
              <View style={styles.coachRow}>
                <View style={styles.coachSide}>
                  {lineups[0]?.coachPhoto ? (
                    <Image source={{ uri: lineups[0].coachPhoto }} style={styles.coachPhoto} />
                  ) : (
                    <View style={styles.coachPhotoFallback}>
                      <Ionicons name="person" size={12} color={colors.onSurfaceVariant} />
                    </View>
                  )}
                  <Text style={styles.coachName} numberOfLines={1}>{lineups[0]?.coachName || '—'}</Text>
                </View>
                <Text style={styles.coachLabel}>COACH</Text>
                <View style={[styles.coachSide, { justifyContent: 'flex-end' }]}>
                  <Text style={styles.coachName} numberOfLines={1}>{lineups[1]?.coachName || '—'}</Text>
                  {lineups[1]?.coachPhoto ? (
                    <Image source={{ uri: lineups[1].coachPhoto }} style={styles.coachPhoto} />
                  ) : (
                    <View style={styles.coachPhotoFallback}>
                      <Ionicons name="person" size={12} color={colors.onSurfaceVariant} />
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Starting XI — side by side */}
            <Text style={styles.lineupSubtitle}>STARTING XI</Text>
            <View style={styles.lineupColumns}>
              {/* Home team */}
              <View style={styles.lineupCol}>
                {lineups[0]?.startXI.map((p, i) => (
                  <View key={p.apiId || i} style={styles.playerRow}>
                    {p.photo ? (
                      <Image source={{ uri: p.photo }} style={styles.playerPhoto} />
                    ) : (
                      <View style={styles.playerPhotoFallback}>
                        <Text style={styles.playerNumberFallback}>{p.number}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.playerName} numberOfLines={1}>{p.name}</Text>
                      <Text style={styles.playerPos}>{p.pos === 'G' ? 'GK' : p.pos === 'D' ? 'DEF' : p.pos === 'M' ? 'MID' : 'FWD'}</Text>
                    </View>
                    <Text style={styles.playerNumber}>{p.number}</Text>
                  </View>
                ))}
              </View>
              {/* Divider */}
              <View style={styles.lineupDivider} />
              {/* Away team */}
              <View style={styles.lineupCol}>
                {lineups[1]?.startXI.map((p, i) => (
                  <View key={p.apiId || i} style={styles.playerRow}>
                    {p.photo ? (
                      <Image source={{ uri: p.photo }} style={styles.playerPhoto} />
                    ) : (
                      <View style={styles.playerPhotoFallback}>
                        <Text style={styles.playerNumberFallback}>{p.number}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.playerName} numberOfLines={1}>{p.name}</Text>
                      <Text style={styles.playerPos}>{p.pos === 'G' ? 'GK' : p.pos === 'D' ? 'DEF' : p.pos === 'M' ? 'MID' : 'FWD'}</Text>
                    </View>
                    <Text style={styles.playerNumber}>{p.number}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Substitutes */}
            {(lineups[0]?.substitutes?.length > 0 || lineups[1]?.substitutes?.length > 0) && (
              <>
                <Text style={[styles.lineupSubtitle, { marginTop: 20 }]}>SUBSTITUTES</Text>
                <View style={styles.lineupColumns}>
                  <View style={styles.lineupCol}>
                    {lineups[0]?.substitutes.map((p, i) => (
                      <View key={p.apiId || i} style={styles.subRow}>
                        {p.photo ? (
                          <Image source={{ uri: p.photo }} style={styles.subPhoto} />
                        ) : (
                          <View style={styles.subPhotoFallback}>
                            <Text style={styles.subNumberFallback}>{p.number}</Text>
                          </View>
                        )}
                        <Text style={styles.subName} numberOfLines={1}>{p.name}</Text>
                        <Text style={styles.subNumber}>{p.number}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.lineupDivider} />
                  <View style={styles.lineupCol}>
                    {lineups[1]?.substitutes.map((p, i) => (
                      <View key={p.apiId || i} style={styles.subRow}>
                        {p.photo ? (
                          <Image source={{ uri: p.photo }} style={styles.subPhoto} />
                        ) : (
                          <View style={styles.subPhotoFallback}>
                            <Text style={styles.subNumberFallback}>{p.number}</Text>
                          </View>
                        )}
                        <Text style={styles.subName} numberOfLines={1}>{p.name}</Text>
                        <Text style={styles.subNumber}>{p.number}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </>
            )}
          </View>
        )}

        {/* Football-specific: Head to Head */}
        {isFootball && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>HEAD TO HEAD</Text>
            {h2hLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : h2hFixtures.length === 0 ? (
              <Text style={styles.h2hEmpty}>No previous meetings</Text>
            ) : (
              <>
                {/* Summary row */}
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
                        <Text style={styles.h2hSummaryLabel}>Draws</Text>
                      </View>
                      <View style={styles.h2hSummaryItem}>
                        <Text style={styles.h2hSummaryCount}>{awayWins}</Text>
                        <Text style={styles.h2hSummaryLabel}>{awayTeamName}</Text>
                      </View>
                    </View>
                  );
                })()}

                {/* Last 5 matchups */}
                {h2hFixtures.slice(0, 5).map((f, idx) => {
                  const currentHomeId = fixture?.homeTeam?.apiId;
                  const isCurrentHomeWin =
                    (f.homeTeam.apiId === currentHomeId && f.homeGoals > f.awayGoals) ||
                    (f.awayTeam.apiId === currentHomeId && f.awayGoals > f.homeGoals);
                  const isDraw = f.homeGoals === f.awayGoals;
                  return (
                    <View key={f.apiId || idx} style={styles.h2hRow}>
                      <Text style={styles.h2hDate}>
                        {new Date(f.date).toLocaleDateString([], { month: 'short', year: 'numeric' })}
                      </Text>
                      <View style={styles.h2hTeamCell}>
                        <Text style={[styles.h2hTeam, { textAlign: 'right' }]} numberOfLines={1}>
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
                        <Text style={[styles.h2hTeam, { textAlign: 'left' }]} numberOfLines={1}>
                          {f.awayTeam.name}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.h2hResultDot,
                          isDraw
                            ? styles.h2hResultDraw
                            : isCurrentHomeWin
                              ? styles.h2hResultWin
                              : styles.h2hResultLoss,
                        ]}
                      >
                        <Text style={styles.h2hResultDotText}>
                          {isDraw ? 'D' : isCurrentHomeWin ? 'W' : 'L'}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </>
            )}
          </View>
        )}

        {/* Football-specific: Events Timeline */}
        {isFootball && sortedEvents.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>MATCH EVENTS</Text>
            <View style={styles.timeline}>
              <View style={styles.timelineLine} />
              {sortedEvents.map((event, idx) => {
                const evtStyle = getEventIcon(event);
                return (
                  <View key={idx} style={styles.timelineEvent}>
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

        <View style={{ height: 100 }} />
      </ScrollView>
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

  card: {
    marginHorizontal: 16, backgroundColor: colors.surfaceContainerLow, borderRadius: 8,
    padding: 24, marginBottom: 24, gap: 24,
  },
  cardTitle: {
    fontFamily: 'SpaceGrotesk_700Bold', fontSize: 20, lineHeight: 28, color: colors.onSurface,
    letterSpacing: -0.5, textTransform: 'uppercase',
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

  dailyLimitBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(198,255,0,0.06)', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1,
    borderColor: 'rgba(198,255,0,0.12)',
  },
  dailyLimitText: {
    flex: 1, fontFamily: 'Inter_700Bold', fontSize: 12, color: colors.onSurfaceVariant, letterSpacing: 0.3,
  },
  dailyLimitUpgrade: {
    fontFamily: 'Inter_700Bold', fontSize: 11, color: colors.primary, letterSpacing: 0.8,
  },

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
  h2hResultWin: { backgroundColor: 'rgba(22,163,74,0.2)' },
  h2hResultLoss: { backgroundColor: 'rgba(220,38,38,0.2)' },
  h2hResultDraw: { backgroundColor: 'rgba(150,150,150,0.2)' },
  h2hResultDotText: {
    fontFamily: 'Inter_700Bold', fontSize: 9, color: colors.onSurface, letterSpacing: 0.3,
  },

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
  playerPhoto: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceContainerHighest },
  playerPhotoFallback: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center', justifyContent: 'center',
  },
  playerNumberFallback: {
    fontFamily: 'Inter_700Bold', fontSize: 11, color: colors.onSurfaceVariant,
  },
  playerName: { fontFamily: 'Inter_700Bold', fontSize: 11, color: colors.onSurface },
  playerPos: { fontFamily: 'Inter_500Medium', fontSize: 9, color: colors.onSurfaceVariant, letterSpacing: 0.5 },
  playerNumber: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 13, color: colors.onSurfaceVariant, minWidth: 20, textAlign: 'right' },
  subRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 4,
  },
  subPhoto: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surfaceContainerHighest },
  subPhotoFallback: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center', justifyContent: 'center',
  },
  subNumberFallback: { fontFamily: 'Inter_700Bold', fontSize: 9, color: colors.onSurfaceVariant },
  subName: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 10, color: colors.onSurfaceDim },
  subNumber: { fontFamily: 'Inter_700Bold', fontSize: 10, color: colors.onSurfaceVariant, minWidth: 18, textAlign: 'right' },
});
