import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../theme';
import { HomeStackParamList } from '../navigation/types';
import { useAuth } from '../contexts/AuthContext';
import { predictionsApi } from '../api/predictions';
import type { PredictionData } from '../api/predictions';
import Toast from 'react-native-toast-message';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'PickSummary'>;
};

function formatOutcome(p: PredictionData, t: (key: string) => string): string {
  if (p.predictionType === 'exact_score' && p.predictedHomeScore != null && p.predictedAwayScore != null) {
    return `${p.predictedHomeScore}-${p.predictedAwayScore}`;
  }
  if (p.predictedOutcome === 'home') return p.homeTeamName;
  if (p.predictedOutcome === 'away') return p.awayTeamName;
  return t('matchPrediction.draw');
}

function getPickStatusLabel(p: PredictionData, t: (key: string) => string): string {
  if (p.status === 'pending') return t('picks.pending');
  if (p.status === 'won') return t('matchPrediction.won').toUpperCase();
  if (p.status === 'lost') return t('matchPrediction.lost').toUpperCase();
  return p.status.toUpperCase();
}

function formatPickDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const gameDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (gameDay.getTime() === today.getTime()) return `Today ${time}`;
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`;
}

export function PickSummaryScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { tokens } = useAuth();
  const [picks, setPicks] = useState<PredictionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPicks = useCallback(async () => {
    if (!tokens?.accessToken) return;
    try {
      const res = await predictionsApi.getMyPicks(tokens.accessToken, { limit: 20 });
      setPicks(res.predictions);
    } catch {
      Toast.show({ type: 'error', text1: t('picks.errorLoading'), text2: t('dashboard.pullToRetry') });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tokens?.accessToken]);

  useEffect(() => { fetchPicks(); }, [fetchPicks]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPicks();
  }, [fetchPicks]);

  const pendingPicks = picks.filter((p) => p.status === 'pending');
  const resolvedPicks = picks.filter((p) => p.status !== 'pending');
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const displayPicks = activeTab === 'current' ? pendingPicks : resolvedPicks;

  const totalPoints = picks.reduce((sum, p) => sum + p.pointsAwarded, 0);
  const wonCount = picks.filter((p) => p.status === 'won').length;

  const handleShare = async () => {
    if (pendingPicks.length === 0) {
      Toast.show({ type: 'info', text1: t('pickSummary.noActivePicksToShare') });
      return;
    }
    const picksText = pendingPicks
      .map((p) => `${p.homeTeamName} vs ${p.awayTeamName} -- ${formatOutcome(p, t)}`)
      .join('\n');
    try {
      await Share.share({
        message: t('pickSummary.shareMessage', { picks: picksText }),
      });
    } catch {
      // user cancelled
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('pickSummary.title')}</Text>
        <TouchableOpacity onPress={handleShare} style={styles.backBtn}>
          <Ionicons name="share-outline" size={20} color={colors.onSurface} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.titleSection}>
          {pendingPicks.length > 0 && (
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>{pendingPicks.length} ACTIVE</Text>
            </View>
          )}
          <Text style={styles.title}>{t('pickSummary.titleDisplay')}</Text>
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={activeTab === 'current' ? styles.tabActive : styles.tabInactive}
              onPress={() => setActiveTab('current')}
            >
              <Text style={activeTab === 'current' ? styles.tabActiveText : styles.tabInactiveText}>
                {t('pickSummary.currentPicks', { count: pendingPicks.length })}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={activeTab === 'history' ? styles.tabActive : styles.tabInactive}
              onPress={() => setActiveTab('history')}
            >
              <Text style={activeTab === 'history' ? styles.tabActiveText : styles.tabInactiveText}>
                {t('pickSummary.historyTab', { count: resolvedPicks.length })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {activeTab === 'current' ? t('pickSummary.activePredictions') : t('pickSummary.resolvedPredictions')}
          </Text>
        </View>

        {displayPicks.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="document-text-outline" size={40} color={colors.onSurfaceVariant} />
            <Text style={styles.emptyText}>
              {activeTab === 'current' ? t('pickSummary.noActivePicks') : t('pickSummary.noHistory')}
            </Text>
          </View>
        ) : (
          displayPicks.map((pick) => (
            <View key={pick._id} style={styles.pickCard}>
              <View style={styles.pickHeader}>
                <View style={[
                  styles.statusBadge,
                  pick.status === 'won' && styles.statusWon,
                  pick.status === 'lost' && styles.statusLost,
                ]}>
                  <Text style={styles.statusText}>{getPickStatusLabel(pick, t)}</Text>
                </View>
                <Text style={styles.pickTime}>{formatPickDate(pick.gameDate)}</Text>
              </View>
              <Text style={styles.pickMatch}>
                {pick.homeTeamName} vs {pick.awayTeamName}
              </Text>
              {pick.leagueName ? <Text style={styles.pickLeague}>{pick.leagueName}</Text> : null}
              <View style={styles.multiplierRow}>
                <Text style={styles.multiplierLabel}>{t('picks.yourPick')}</Text>
                <View style={styles.multiplierBadge}>
                  <Text style={styles.multiplierValue}>{formatOutcome(pick, t)}</Text>
                </View>
              </View>
              {pick.pointsAwarded > 0 && (
                <Text style={styles.pointsAwarded}>+{pick.pointsAwarded} PTS</Text>
              )}
            </View>
          ))
        )}

        {picks.length > 0 && (
          <View style={styles.summarySection}>
            <Ionicons name="bar-chart" size={16} color={colors.onSurfaceVariant} />
            <Text style={styles.summaryTitle}>{t('pickSummary.predictionSummary')}</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('pickSummary.totalPredictions')}</Text>
              <Text style={styles.summaryVal}>{picks.length}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('pickSummary.won')}</Text>
              <Text style={[styles.summaryVal, { color: '#16A34A' }]}>{wonCount}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('pickSummary.pointsEarned')}</Text>
              <Text style={[styles.summaryVal, { color: colors.primary }]}>{totalPoints.toLocaleString()}</Text>
            </View>
          </View>
        )}

        {totalPoints > 0 && (
          <View style={styles.maxScoreCard}>
            <Text style={styles.maxScoreLabel}>{t('pickSummary.totalPoints')}</Text>
            <Text style={styles.maxScoreValue}>{totalPoints.toLocaleString()} PTS</Text>
          </View>
        )}

        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={18} color={colors.primary} />
          <Text style={styles.shareButtonText}>{t('pickSummary.shareMyPicks')}</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: 56,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLow,
  },
  headerTitle: {
    flex: 1,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 17,
    color: colors.onSurface,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  titleSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: 16,
  },
  activeBadge: {
    backgroundColor: colors.primary,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  activeBadgeText: {
    ...typography.labelSm,
    color: colors.onPrimary,
    fontSize: 9,
  },
  title: {
    ...typography.displaySm,
    color: colors.onSurface,
    fontFamily: 'SpaceGrotesk_700Bold',
    marginBottom: 12,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 16,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    paddingBottom: 8,
  },
  tabActiveText: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontFamily: 'Inter_600SemiBold',
  },
  tabInactive: {
    paddingBottom: 8,
  },
  tabInactiveText: {
    ...typography.bodyMd,
    color: colors.onSurfaceDim,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: 12,
  },
  sectionTitle: {
    ...typography.labelLg,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },

  emptyWrap: { alignItems: 'center', gap: 12, paddingVertical: 40 },
  emptyText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },

  pickCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    padding: 14,
    marginBottom: 10,
  },
  pickHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  statusBadge: {
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusWon: { backgroundColor: '#16A34A' },
  statusLost: { backgroundColor: '#DC2626' },
  statusText: {
    ...typography.labelSm,
    color: '#fff',
    fontSize: 9,
  },
  pickTime: {
    ...typography.labelSm,
    color: colors.onSurfaceDim,
    fontSize: 9,
  },
  pickMatch: {
    ...typography.titleMd,
    color: colors.onSurface,
    marginBottom: 2,
  },
  pickLeague: {
    ...typography.bodySm,
    color: colors.onSurfaceDim,
    marginBottom: 8,
    fontSize: 11,
  },
  multiplierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  multiplierLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceDim,
    letterSpacing: 0.5,
  },
  multiplierBadge: {
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  multiplierValue: {
    ...typography.titleMd,
    color: colors.primary,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  pointsAwarded: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: colors.primary,
    marginTop: 6,
    textAlign: 'right',
  },

  summarySection: {
    marginHorizontal: spacing.lg,
    marginTop: 12,
    marginBottom: 16,
  },
  summaryTitle: {
    ...typography.labelLg,
    color: colors.onSurface,
    fontFamily: 'Inter_700Bold',
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  summaryLabel: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },
  summaryVal: {
    ...typography.bodySm,
    color: colors.onSurface,
    fontFamily: 'Inter_600SemiBold',
  },

  maxScoreCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: borderRadius.md,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  maxScoreLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceDim,
    marginBottom: 4,
  },
  maxScoreValue: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 32,
    color: colors.onSurface,
  },

  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: spacing.lg,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    marginBottom: 8,
  },
  shareButtonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: colors.primary,
    letterSpacing: 1,
  },
});
