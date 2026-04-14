import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { colors } from '../theme/colors';
import { useAuth } from '../contexts/AuthContext';
import {
  f1PredictionsApi,
  F1DriverOption,
  F1Matchup,
  F1PredictionData,
  F1PredictionType,
} from '../api/predictions';
import { sportsApi } from '../api/sports';

type TabKey = 'winner' | 'podium' | 'h2h' | 'fastest' | 'points' | 'pitstops';

const TABS: { key: TabKey; label: string; icon: string; points: string }[] = [
  { key: 'winner', label: 'Race Winner', icon: 'trophy', points: '30 pts' },
  { key: 'podium', label: 'Podium Top 3', icon: 'podium', points: '50 pts' },
  { key: 'h2h', label: 'Head-to-Head', icon: 'people', points: '10 pts' },
  { key: 'fastest', label: 'Fastest Lap', icon: 'speedometer', points: '20 pts' },
  { key: 'points', label: 'Points Finish', icon: 'flag', points: '8 pts' },
  { key: 'pitstops', label: 'Pit Stops', icon: 'build', points: '' },
];

interface F1Pitstop {
  driverApiId?: number;
  driverName?: string;
  teamApiId?: number;
  teamName?: string;
  stops?: number;
  lap?: number;
  time?: string;
  totalTime?: string;
}

interface F1RaceDetail {
  weather?: string | null;
  timezone?: string;
  lapsCurrent?: number | null;
  lapsTotal?: number | null;
  laps?: number | null;
  isLive?: boolean;
  status?: string;
  pitstops?: F1Pitstop[];
}

export default function F1RacePredictionScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useTranslation();
  const { tokens } = useAuth();

  const { raceApiId, competitionName, circuitName } = route.params as {
    raceApiId: number;
    competitionName?: string;
    circuitName?: string;
  };

  const [activeTab, setActiveTab] = useState<TabKey>('winner');
  const [drivers, setDrivers] = useState<F1DriverOption[]>([]);
  const [matchups, setMatchups] = useState<F1Matchup[]>([]);
  const [existingPicks, setExistingPicks] = useState<F1PredictionData[]>([]);
  const [raceDetail, setRaceDetail] = useState<F1RaceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Selection state
  const [selectedWinner, setSelectedWinner] = useState<number | null>(null);
  const [podiumPicks, setPodiumPicks] = useState<(number | null)[]>([null, null, null]);
  const [h2hPicks, setH2hPicks] = useState<Map<string, 'A' | 'B'>>(new Map());
  const [selectedFastest, setSelectedFastest] = useState<number | null>(null);
  const [pointsDriver, setPointsDriver] = useState<number | null>(null);
  const [pointsPrediction, setPointsPrediction] = useState<boolean>(true);

  const token = tokens?.accessToken || '';

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const [driversRes, matchupsRes, picksRes, raceRes] = await Promise.all([
        f1PredictionsApi.getDrivers(raceApiId, token),
        f1PredictionsApi.getMatchups(raceApiId, token),
        f1PredictionsApi.getForRace(raceApiId, token),
        sportsApi.getGameDetail(token, 'formula-1', raceApiId).catch(() => null),
      ]);
      setDrivers(driversRes || []);
      setMatchups(matchupsRes || []);
      setExistingPicks(picksRes || []);
      setRaceDetail((raceRes as unknown as F1RaceDetail) || null);
    } catch (e) {
      console.warn('Failed to load F1 prediction data', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [raceApiId, token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  // Check if user already has a pick for a type
  const hasPick = (type: F1PredictionType) => existingPicks.some((p) => p.predictionType === type);

  const submitPrediction = async (type: F1PredictionType) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      let payload: any = { raceApiId, predictionType: type };

      switch (type) {
        case 'race_winner':
          if (!selectedWinner) { Alert.alert('Select a driver'); setSubmitting(false); return; }
          payload.predictedDriverApiId = selectedWinner;
          break;
        case 'podium':
          if (podiumPicks.some((p) => !p)) { Alert.alert('Select all 3 podium positions'); setSubmitting(false); return; }
          payload.podiumPicks = podiumPicks.map((dId, i) => ({ position: i + 1, driverApiId: dId }));
          break;
        case 'fastest_lap':
          if (!selectedFastest) { Alert.alert('Select a driver'); setSubmitting(false); return; }
          payload.predictedDriverApiId = selectedFastest;
          break;
        case 'points_finish':
          if (!pointsDriver) { Alert.alert('Select a driver'); setSubmitting(false); return; }
          payload.pointsFinishDriverApiId = pointsDriver;
          payload.pointsFinishPrediction = pointsPrediction;
          break;
        default:
          break;
      }

      await f1PredictionsApi.create(payload, token);
      Alert.alert('Prediction saved!', `Your ${type.replace(/_/g, ' ')} pick is locked in.`);
      fetchData(); // Refresh picks
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save prediction');
    } finally {
      setSubmitting(false);
    }
  };

  const submitH2H = async (matchup: F1Matchup, winner: 'A' | 'B') => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await f1PredictionsApi.create({
        raceApiId,
        predictionType: 'head_to_head',
        driverAApiId: matchup.driverA.driverApiId,
        driverBApiId: matchup.driverB.driverApiId,
        predictedWinner: winner,
      }, token);
      const key = `${matchup.driverA.driverApiId}-${matchup.driverB.driverApiId}`;
      setH2hPicks((prev) => new Map(prev).set(key, winner));
      Alert.alert('H2H pick saved!');
      fetchData();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save prediction');
    } finally {
      setSubmitting(false);
    }
  };

  const getDriverById = (id: number) => drivers.find((d) => d.driverApiId === id);

  // ────────── RENDER ──────────

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{competitionName || 'Race Predictions'}</Text>
          {circuitName ? <Text style={styles.headerSubtitle} numberOfLines={1}>{circuitName}</Text> : null}
          {(raceDetail?.weather || raceDetail?.timezone) ? (
            <View style={styles.headerMetaRow}>
              {raceDetail?.weather ? (
                <View style={styles.weatherBadge}>
                  <Ionicons name="partly-sunny" size={10} color={colors.primary} />
                  <Text style={styles.weatherBadgeText} numberOfLines={1}>{raceDetail.weather}</Text>
                </View>
              ) : null}
              {raceDetail?.timezone ? (
                <Text style={styles.timezoneText} numberOfLines={1}>{raceDetail.timezone}</Text>
              ) : null}
            </View>
          ) : null}
        </View>
        <View style={{ width: 24 }} />
      </View>

      {/* Live race strip */}
      {raceDetail?.isLive ? (
        <View style={styles.liveStrip}>
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.livePillText}>{t('f1.live')}</Text>
          </View>
          {raceDetail.lapsCurrent != null && raceDetail.lapsTotal != null && raceDetail.lapsTotal > 0 ? (
            <View style={styles.lapProgressWrap}>
              <Text style={styles.lapProgressText}>
                {t('f1.lapProgress', { current: raceDetail.lapsCurrent, total: raceDetail.lapsTotal })}
              </Text>
              <View style={styles.lapProgressBar}>
                <View
                  style={[
                    styles.lapProgressFill,
                    { width: `${Math.min(100, Math.max(0, (raceDetail.lapsCurrent / raceDetail.lapsTotal) * 100))}%` },
                  ]}
                />
              </View>
            </View>
          ) : null}
          {raceDetail.weather ? (
            <View style={styles.liveWeather}>
              <Ionicons name="partly-sunny" size={14} color={colors.onSurface} />
              <Text style={styles.liveWeatherText} numberOfLines={1}>{raceDetail.weather}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Prediction type tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabContainer}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const picked =
            tab.key === 'pitstops'
              ? false
              : hasPick(tab.key === 'h2h' ? 'head_to_head' : tab.key === 'fastest' ? 'fastest_lap' : tab.key === 'points' ? 'points_finish' : tab.key === 'winner' ? 'race_winner' : 'podium');
          const label = tab.key === 'pitstops' ? t('f1.pitstops') : tab.label;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && styles.tabActive, picked && styles.tabPicked]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Ionicons name={tab.icon as any} size={16} color={isActive ? colors.background : picked ? colors.primary : colors.onSurfaceVariant} />
              <Text style={[styles.tabText, isActive && styles.tabTextActive]} numberOfLines={1}>{label}</Text>
              {tab.points ? <Text style={[styles.tabPoints, isActive && styles.tabPointsActive]}>{tab.points}</Text> : null}
              {picked && <View style={styles.tabCheckmark}><Ionicons name="checkmark-circle" size={12} color={colors.primary} /></View>}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* My existing picks summary */}
        {existingPicks.length > 0 && (
          <View style={styles.existingPicksCard}>
            <Text style={styles.existingPicksTitle}>
              <Ionicons name="checkmark-circle" size={14} color={colors.primary} /> {existingPicks.length} prediction{existingPicks.length !== 1 ? 's' : ''} locked
            </Text>
            {existingPicks.map((pick) => (
              <View key={pick._id} style={styles.existingPickRow}>
                <Text style={styles.existingPickType}>{pick.predictionType.replace(/_/g, ' ')}</Text>
                <Text style={styles.existingPickDriver}>
                  {pick.predictedDriverName || pick.podiumPicks?.map((p) => p.driverName).join(' → ') || `${pick.driverA?.name} vs ${pick.driverB?.name}`}
                </Text>
                <Text style={styles.existingPickMultiplier}>x{pick.oddsMultiplier.toFixed(1)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Tab content */}
        {activeTab === 'winner' && renderDriverPicker('race_winner', selectedWinner, setSelectedWinner)}
        {activeTab === 'podium' && renderPodiumPicker()}
        {activeTab === 'h2h' && renderH2H()}
        {activeTab === 'fastest' && renderDriverPicker('fastest_lap', selectedFastest, setSelectedFastest)}
        {activeTab === 'points' && renderPointsFinish()}
        {activeTab === 'pitstops' && renderPitstops()}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );

  // ────────── TAB RENDERERS ──────────

  function renderDriverPicker(
    type: 'race_winner' | 'fastest_lap',
    selected: number | null,
    setSelected: (id: number | null) => void,
  ) {
    const predType: F1PredictionType = type;
    const alreadyPicked = hasPick(predType);

    return (
      <View style={styles.sectionWrap}>
        <Text style={styles.sectionTitle}>
          {type === 'race_winner' ? 'Who will win the race?' : 'Who will set the fastest lap?'}
        </Text>
        <Text style={styles.sectionSub}>
          {type === 'race_winner' ? 'Picking an underdog earns more points!' : 'Select the driver you think will record the fastest lap'}
        </Text>

        {alreadyPicked && (
          <View style={styles.alreadyPickedBanner}>
            <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
            <Text style={styles.alreadyPickedText}>You already have a {type.replace(/_/g, ' ')} pick for this race</Text>
          </View>
        )}

        <View style={styles.driverGrid}>
          {drivers.map((driver) => {
            const isSelected = selected === driver.driverApiId;
            return (
              <TouchableOpacity
                key={driver.driverApiId}
                style={[styles.driverCard, isSelected && styles.driverCardSelected]}
                onPress={() => setSelected(isSelected ? null : driver.driverApiId)}
                activeOpacity={0.7}
                disabled={alreadyPicked}
              >
                {driver.driverImage ? (
                  <ExpoImage source={{ uri: driver.driverImage }} style={styles.driverImg} contentFit="cover" cachePolicy="memory-disk" />
                ) : (
                  <View style={[styles.driverImg, styles.driverImgPlaceholder]}>
                    <Ionicons name="person" size={20} color={colors.onSurfaceDim} />
                  </View>
                )}
                <Text style={[styles.driverCardName, isSelected && styles.driverCardNameSelected]} numberOfLines={1}>
                  {driver.driverName?.split(' ').pop() || driver.driverAbbr}
                </Text>
                <Text style={styles.driverCardTeam} numberOfLines={1}>{driver.teamName}</Text>
                <View style={styles.driverCardBadge}>
                  <Text style={styles.driverCardPos}>P{driver.championshipPosition || '?'}</Text>
                </View>
                {isSelected && (
                  <View style={styles.driverCardCheck}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {!alreadyPicked && selected && (
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={() => submitPrediction(predType)}
            disabled={submitting}
            activeOpacity={0.7}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <>
                <Ionicons name="lock-closed" size={16} color={colors.background} />
                <Text style={styles.submitBtnText}>Lock {type === 'race_winner' ? 'Winner' : 'Fastest Lap'} Pick</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  }

  function renderPodiumPicker() {
    const alreadyPicked = hasPick('podium');
    const posLabels = ['P1 — Winner', 'P2 — Second', 'P3 — Third'];

    return (
      <View style={styles.sectionWrap}>
        <Text style={styles.sectionTitle}>Predict the podium</Text>
        <Text style={styles.sectionSub}>Select drivers for each position. Perfect order = 50 pts!</Text>

        {alreadyPicked && (
          <View style={styles.alreadyPickedBanner}>
            <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
            <Text style={styles.alreadyPickedText}>Podium pick locked for this race</Text>
          </View>
        )}

        {posLabels.map((label, idx) => {
          const selectedId = podiumPicks[idx];
          const selectedDriver = selectedId ? getDriverById(selectedId) : null;
          // Filter out drivers already picked for other positions
          const otherPicked = podiumPicks.filter((_, i) => i !== idx && _ !== null) as number[];

          return (
            <View key={idx} style={styles.podiumSlot}>
              <View style={styles.podiumLabel}>
                <Text style={styles.podiumLabelText}>{label}</Text>
              </View>
              {selectedDriver ? (
                <TouchableOpacity
                  style={styles.podiumSelected}
                  onPress={() => {
                    if (alreadyPicked) return;
                    const next = [...podiumPicks];
                    next[idx] = null;
                    setPodiumPicks(next);
                  }}
                  activeOpacity={0.7}
                >
                  {selectedDriver.driverImage ? (
                    <ExpoImage source={{ uri: selectedDriver.driverImage }} style={styles.podiumDriverImg} contentFit="cover" cachePolicy="memory-disk" />
                  ) : null}
                  <Text style={styles.podiumDriverName}>{selectedDriver.driverName}</Text>
                  <Text style={styles.podiumDriverTeam}>{selectedDriver.teamName}</Text>
                  {!alreadyPicked && <Ionicons name="close-circle" size={18} color={colors.error} />}
                </TouchableOpacity>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.podiumDriverScroll}>
                  {drivers
                    .filter((d) => !otherPicked.includes(d.driverApiId))
                    .map((driver) => (
                      <TouchableOpacity
                        key={driver.driverApiId}
                        style={styles.podiumDriverOption}
                        onPress={() => {
                          if (alreadyPicked) return;
                          const next = [...podiumPicks];
                          next[idx] = driver.driverApiId;
                          setPodiumPicks(next);
                        }}
                        activeOpacity={0.7}
                      >
                        {driver.driverImage ? (
                          <ExpoImage source={{ uri: driver.driverImage }} style={styles.podiumOptionImg} contentFit="cover" cachePolicy="memory-disk" />
                        ) : (
                          <View style={[styles.podiumOptionImg, { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                            <Ionicons name="person" size={14} color={colors.onSurfaceDim} />
                          </View>
                        )}
                        <Text style={styles.podiumOptionName} numberOfLines={1}>{driver.driverName?.split(' ').pop()}</Text>
                      </TouchableOpacity>
                    ))
                  }
                </ScrollView>
              )}
            </View>
          );
        })}

        {!alreadyPicked && podiumPicks.every((p) => p !== null) && (
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={() => submitPrediction('podium')}
            disabled={submitting}
            activeOpacity={0.7}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <>
                <Ionicons name="lock-closed" size={16} color={colors.background} />
                <Text style={styles.submitBtnText}>Lock Podium Pick</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  }

  function renderH2H() {
    if (matchups.length === 0) {
      return (
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>Head-to-Head</Text>
          <Text style={styles.emptyHint}>No matchups available for this race yet.</Text>
        </View>
      );
    }

    return (
      <View style={styles.sectionWrap}>
        <Text style={styles.sectionTitle}>Head-to-Head Matchups</Text>
        <Text style={styles.sectionSub}>Who finishes ahead? Pick your winner in each battle.</Text>

        {matchups.map((matchup, idx) => {
          const key = `${matchup.driverA.driverApiId}-${matchup.driverB.driverApiId}`;
          const existingH2H = existingPicks.find(
            (p) => p.predictionType === 'head_to_head' &&
              p.driverA?.apiId === matchup.driverA.driverApiId &&
              p.driverB?.apiId === matchup.driverB.driverApiId,
          );
          const localPick = h2hPicks.get(key);
          const picked = existingH2H?.predictedWinner || localPick;

          return (
            <View key={idx} style={styles.h2hCard}>
              <Text style={styles.h2hLabel}>
                <Ionicons name={matchup.type === 'teammate' ? 'car-sport' : 'flash'} size={12} color={colors.primary} />
                {' '}{matchup.label}
              </Text>
              <View style={styles.h2hRow}>
                <TouchableOpacity
                  style={[styles.h2hOption, picked === 'A' && styles.h2hOptionSelected]}
                  onPress={() => !existingH2H && submitH2H(matchup, 'A')}
                  disabled={!!existingH2H || submitting}
                  activeOpacity={0.7}
                >
                  {matchup.driverA.driverImage ? (
                    <ExpoImage source={{ uri: matchup.driverA.driverImage }} style={styles.h2hDriverImg} contentFit="cover" cachePolicy="memory-disk" />
                  ) : null}
                  <Text style={[styles.h2hDriverName, picked === 'A' && styles.h2hDriverNameSelected]}>
                    {matchup.driverA.driverName?.split(' ').pop()}
                  </Text>
                  <Text style={styles.h2hTeam}>{matchup.driverA.teamName}</Text>
                  {picked === 'A' && <Ionicons name="checkmark-circle" size={16} color={colors.primary} style={{ marginTop: 4 }} />}
                </TouchableOpacity>

                <View style={styles.h2hVs}>
                  <Text style={styles.h2hVsText}>VS</Text>
                </View>

                <TouchableOpacity
                  style={[styles.h2hOption, picked === 'B' && styles.h2hOptionSelected]}
                  onPress={() => !existingH2H && submitH2H(matchup, 'B')}
                  disabled={!!existingH2H || submitting}
                  activeOpacity={0.7}
                >
                  {matchup.driverB.driverImage ? (
                    <ExpoImage source={{ uri: matchup.driverB.driverImage }} style={styles.h2hDriverImg} contentFit="cover" cachePolicy="memory-disk" />
                  ) : null}
                  <Text style={[styles.h2hDriverName, picked === 'B' && styles.h2hDriverNameSelected]}>
                    {matchup.driverB.driverName?.split(' ').pop()}
                  </Text>
                  <Text style={styles.h2hTeam}>{matchup.driverB.teamName}</Text>
                  {picked === 'B' && <Ionicons name="checkmark-circle" size={16} color={colors.primary} style={{ marginTop: 4 }} />}
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>
    );
  }

  function renderPitstops() {
    const pitstops = raceDetail?.pitstops || [];
    if (pitstops.length === 0) {
      return (
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>{t('f1.pitstops')}</Text>
          <View style={styles.pitstopsEmpty}>
            <Ionicons name="build-outline" size={28} color={colors.onSurfaceDim} />
            <Text style={styles.emptyHint}>{t('f1.pitstopsEmpty')}</Text>
          </View>
        </View>
      );
    }

    // Group by lap
    const sorted = [...pitstops].sort((a, b) => (a.lap ?? 0) - (b.lap ?? 0));
    const grouped = new Map<number, F1Pitstop[]>();
    sorted.forEach((ps) => {
      const lap = ps.lap ?? 0;
      if (!grouped.has(lap)) grouped.set(lap, []);
      grouped.get(lap)!.push(ps);
    });

    return (
      <View style={styles.sectionWrap}>
        <Text style={styles.sectionTitle}>{t('f1.pitstops')}</Text>
        <View style={styles.pitstopsHeader}>
          <Text style={[styles.pitstopsHeaderCell, { width: 44 }]}>{t('f1.lap')}</Text>
          <Text style={[styles.pitstopsHeaderCell, { flex: 2 }]}>{t('f1.driver')}</Text>
          <Text style={[styles.pitstopsHeaderCell, { flex: 2 }]}>{t('f1.team')}</Text>
          <Text style={[styles.pitstopsHeaderCell, { width: 44, textAlign: 'center' }]}>{t('f1.stopNumber')}</Text>
          <Text style={[styles.pitstopsHeaderCell, { width: 72, textAlign: 'right' }]}>{t('f1.totalTime')}</Text>
        </View>
        {Array.from(grouped.entries()).map(([lap, stops]) => (
          <View key={lap} style={styles.pitstopsLapGroup}>
            {stops.map((ps, i) => (
              <View key={`${lap}-${i}`} style={styles.pitstopsRow}>
                <Text style={[styles.pitstopsCell, { width: 44, color: colors.primary, fontFamily: 'SpaceGrotesk_700Bold' }]}>
                  {lap || '—'}
                </Text>
                <Text style={[styles.pitstopsCell, { flex: 2 }]} numberOfLines={1}>{ps.driverName || '—'}</Text>
                <Text style={[styles.pitstopsCell, { flex: 2, color: colors.onSurfaceDim }]} numberOfLines={1}>{ps.teamName || '—'}</Text>
                <Text style={[styles.pitstopsCell, { width: 44, textAlign: 'center' }]}>{ps.stops ?? '—'}</Text>
                <Text style={[styles.pitstopsCell, { width: 72, textAlign: 'right', fontFamily: 'SpaceGrotesk_700Bold' }]}>
                  {ps.totalTime || ps.time || '—'}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  }

  function renderPointsFinish() {
    const alreadyPicked = hasPick('points_finish');

    return (
      <View style={styles.sectionWrap}>
        <Text style={styles.sectionTitle}>Points Finish</Text>
        <Text style={styles.sectionSub}>Will this driver finish in the top 10 and score points?</Text>

        {alreadyPicked && (
          <View style={styles.alreadyPickedBanner}>
            <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
            <Text style={styles.alreadyPickedText}>Points finish pick locked</Text>
          </View>
        )}

        {/* Driver selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pointsDriverScroll}>
          {drivers.map((driver) => {
            const isSelected = pointsDriver === driver.driverApiId;
            return (
              <TouchableOpacity
                key={driver.driverApiId}
                style={[styles.pointsDriverChip, isSelected && styles.pointsDriverChipSelected]}
                onPress={() => !alreadyPicked && setPointsDriver(isSelected ? null : driver.driverApiId)}
                activeOpacity={0.7}
                disabled={alreadyPicked}
              >
                {driver.driverImage ? (
                  <ExpoImage source={{ uri: driver.driverImage }} style={styles.pointsChipImg} contentFit="cover" cachePolicy="memory-disk" />
                ) : null}
                <Text style={[styles.pointsChipText, isSelected && styles.pointsChipTextSelected]} numberOfLines={1}>
                  {driver.driverName?.split(' ').pop()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Yes / No toggle */}
        {pointsDriver && !alreadyPicked && (
          <View style={styles.pointsToggle}>
            <Text style={styles.pointsToggleLabel}>
              Will <Text style={{ color: colors.primary }}>{getDriverById(pointsDriver)?.driverName?.split(' ').pop()}</Text> finish in the top 10?
            </Text>
            <View style={styles.pointsToggleRow}>
              <TouchableOpacity
                style={[styles.pointsToggleBtn, pointsPrediction && styles.pointsToggleBtnActive]}
                onPress={() => setPointsPrediction(true)}
              >
                <Text style={[styles.pointsToggleBtnText, pointsPrediction && styles.pointsToggleBtnTextActive]}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pointsToggleBtn, !pointsPrediction && styles.pointsToggleBtnActive]}
                onPress={() => setPointsPrediction(false)}
              >
                <Text style={[styles.pointsToggleBtnText, !pointsPrediction && styles.pointsToggleBtnTextActive]}>No</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {!alreadyPicked && pointsDriver && (
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={() => submitPrediction('points_finish')}
            disabled={submitting}
            activeOpacity={0.7}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <>
                <Ionicons name="lock-closed" size={16} color={colors.background} />
                <Text style={styles.submitBtnText}>Lock Points Finish Pick</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  }
}

// ────────── STYLES ──────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, color: colors.onSurface, letterSpacing: -0.3 },
  headerSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.onSurfaceDim, marginTop: 2 },

  // Tabs
  tabScroll: { flexGrow: 0, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  tabContainer: { paddingHorizontal: 8, gap: 6, paddingBottom: 10 },
  tab: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    gap: 2,
    minWidth: 72,
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabPicked: { borderColor: 'rgba(202,253,0,0.3)' },
  tabText: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: colors.onSurfaceVariant },
  tabTextActive: { color: colors.background },
  tabPoints: { fontFamily: 'Inter_400Regular', fontSize: 9, color: colors.onSurfaceDim },
  tabPointsActive: { color: 'rgba(11,14,17,0.6)' },
  tabCheckmark: { position: 'absolute', top: 4, right: 4 },

  content: { flex: 1, paddingHorizontal: 16 },

  // Existing picks
  existingPicksCard: {
    backgroundColor: 'rgba(202,253,0,0.06)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(202,253,0,0.12)',
  },
  existingPicksTitle: { fontFamily: 'Inter_700Bold', fontSize: 13, color: colors.primary, marginBottom: 8 },
  existingPickRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  existingPickType: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: colors.onSurfaceVariant, textTransform: 'uppercase', width: 90 },
  existingPickDriver: { fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.onSurface, flex: 1 },
  existingPickMultiplier: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 12, color: colors.primary },

  // Sections
  sectionWrap: { marginTop: 16 },
  sectionTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 20, color: colors.onSurface, letterSpacing: -0.5 },
  sectionSub: { fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.onSurfaceDim, marginTop: 4, marginBottom: 16 },

  alreadyPickedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(202,253,0,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  alreadyPickedText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.primary },

  // Driver grid
  driverGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  driverCard: {
    width: '31%',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 4,
  },
  driverCardSelected: { borderColor: colors.primary, backgroundColor: 'rgba(202,253,0,0.06)' },
  driverImg: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.05)' },
  driverImgPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  driverCardName: { fontFamily: 'Inter_700Bold', fontSize: 11, color: colors.onSurface, textAlign: 'center' },
  driverCardNameSelected: { color: colors.primary },
  driverCardTeam: { fontFamily: 'Inter_400Regular', fontSize: 9, color: colors.onSurfaceDim, textAlign: 'center' },
  driverCardBadge: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  driverCardPos: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 10, color: colors.onSurfaceVariant },
  driverCardCheck: { position: 'absolute', top: 6, right: 6 },

  // Podium
  podiumSlot: { marginBottom: 12 },
  podiumLabel: {
    backgroundColor: 'rgba(202,253,0,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
  },
  podiumLabelText: { fontFamily: 'Inter_700Bold', fontSize: 12, color: colors.primary },
  podiumSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(202,253,0,0.2)',
  },
  podiumDriverImg: { width: 36, height: 36, borderRadius: 18 },
  podiumDriverName: { fontFamily: 'Inter_700Bold', fontSize: 14, color: colors.onSurface, flex: 1 },
  podiumDriverTeam: { fontFamily: 'Inter_400Regular', fontSize: 11, color: colors.onSurfaceDim },
  podiumDriverScroll: { maxHeight: 80 },
  podiumDriverOption: { alignItems: 'center', marginRight: 12, width: 60 },
  podiumOptionImg: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  podiumOptionName: { fontFamily: 'Inter_500Medium', fontSize: 10, color: colors.onSurfaceVariant, marginTop: 4, textAlign: 'center' },

  // H2H
  h2hCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  h2hLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: colors.primary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  h2hRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  h2hOption: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 4,
  },
  h2hOptionSelected: { borderColor: colors.primary, backgroundColor: 'rgba(202,253,0,0.06)' },
  h2hDriverImg: { width: 48, height: 48, borderRadius: 24 },
  h2hDriverName: { fontFamily: 'Inter_700Bold', fontSize: 13, color: colors.onSurface },
  h2hDriverNameSelected: { color: colors.primary },
  h2hTeam: { fontFamily: 'Inter_400Regular', fontSize: 10, color: colors.onSurfaceDim },
  h2hVs: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  h2hVsText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 10, color: colors.onSurfaceDim },

  // Points finish
  pointsDriverScroll: { maxHeight: 60, marginBottom: 12 },
  pointsDriverChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginRight: 8,
  },
  pointsDriverChipSelected: { borderColor: colors.primary, backgroundColor: 'rgba(202,253,0,0.08)' },
  pointsChipImg: { width: 24, height: 24, borderRadius: 12 },
  pointsChipText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: colors.onSurfaceVariant },
  pointsChipTextSelected: { color: colors.primary },
  pointsToggle: { marginBottom: 16 },
  pointsToggleLabel: { fontFamily: 'Inter_500Medium', fontSize: 14, color: colors.onSurface, marginBottom: 10 },
  pointsToggleRow: { flexDirection: 'row', gap: 10 },
  pointsToggleBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  pointsToggleBtnActive: { borderColor: colors.primary, backgroundColor: 'rgba(202,253,0,0.08)' },
  pointsToggleBtnText: { fontFamily: 'Inter_700Bold', fontSize: 15, color: colors.onSurfaceVariant },
  pointsToggleBtnTextActive: { color: colors.primary },

  // Submit
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
  submitBtnText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 15, color: colors.background, letterSpacing: -0.3 },

  emptyHint: { fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.onSurfaceDim, marginTop: 8 },

  // Header meta (weather / timezone)
  headerMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  weatherBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(202,253,0,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(202,253,0,0.2)',
  },
  weatherBadgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 10, color: colors.primary },
  timezoneText: { fontFamily: 'Inter_400Regular', fontSize: 10, color: colors.onSurfaceDim },

  // Live strip
  liveStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#ef4444',
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  livePillText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 10, color: '#fff', letterSpacing: 0.5 },
  lapProgressWrap: { flex: 1, gap: 4 },
  lapProgressText: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: colors.onSurface },
  lapProgressBar: {
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  lapProgressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  liveWeather: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  liveWeatherText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: colors.onSurface },

  // Pitstops
  pitstopsEmpty: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  pitstopsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    marginBottom: 4,
  },
  pitstopsHeaderCell: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: colors.onSurfaceDim,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pitstopsLapGroup: { },
  pitstopsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  pitstopsCell: { fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.onSurface },
});
