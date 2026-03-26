import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Ionicons,
  MaterialCommunityIcons,
  Feather,
} from '@expo/vector-icons';
import { colors } from '../theme';
import { AppHeader } from '../components/AppHeader';

// ── Mock Data ──

const TABS = ['Current Picks (3)', 'My History'];

const PICKS = [
  {
    id: '1',
    status: 'live' as const,
    statusLabel: "LIVE \u2022 74'",
    title: 'Manchester City vs Arsenal',
    league: 'English Premier League',
    pick: 'PICK: MAN CITY',
    multiplier: '2.45x',
    hasAccent: true,
  },
  {
    id: '2',
    status: 'upcoming' as const,
    statusLabel: 'STARTS IN 2H 15M',
    title: 'Lakers vs Warriors',
    league: 'NBA Regular Season',
    pick: 'PICK: OVER 224.5',
    multiplier: '1.90x',
    hasAccent: false,
  },
  {
    id: '3',
    status: 'upcoming' as const,
    statusLabel: 'UPCOMING \u2022 SAT 19:00',
    title: 'Real Madrid vs Barcelona',
    league: 'La Liga',
    pick: 'PICK: DRAW',
    multiplier: '3.25x',
    hasAccent: false,
  },
];

const CONFIDENCE_LEVELS = ['LOW', 'MED', 'HIGH', 'ALL IN'];

// ── Main Screen ──

export function MyPicksScreen() {
  const [activeTab, setActiveTab] = useState(0);
  const [confidence, setConfidence] = useState('MED');

  return (
    <View style={styles.container}>
      <AppHeader showSearch={false} />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <View style={styles.activeSessionBadge}>
            <Text style={styles.activeSessionText}>ACTIVE SESSION</Text>
          </View>
          <Text style={styles.pageTitle}>PICK SUMMARY</Text>

          {/* Tab Switcher */}
          <View style={styles.tabSwitcher}>
            {TABS.map((tab, idx) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tabBtn, activeTab === idx && styles.tabBtnActive]}
                onPress={() => setActiveTab(idx)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tabBtnText,
                    activeTab === idx && styles.tabBtnTextActive,
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Selected Predictions Header */}
        <View style={styles.predHeader}>
          <Text style={styles.predHeaderTitle}>SELECTED PREDICTIONS</Text>
          <TouchableOpacity style={styles.clearBtn}>
            <Feather name="trash-2" size={10} color="#FF7351" />
            <Text style={styles.clearBtnText}>CLEAR ALL</Text>
          </TouchableOpacity>
        </View>

        {/* Pick Cards */}
        {PICKS.map((pick) => (
          <View key={pick.id} style={styles.pickCard}>
            {pick.hasAccent && <View style={styles.pickAccent} />}
            <View style={styles.pickMeta}>
              {pick.status === 'live' && (
                <View style={styles.liveRow}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveLabel}>{pick.statusLabel}</Text>
                </View>
              )}
              {pick.status === 'upcoming' && (
                <Text style={styles.upcomingLabel}>{pick.statusLabel}</Text>
              )}
              <Text style={styles.pickTitle}>{pick.title}</Text>
              <Text style={styles.pickLeague}>{pick.league}</Text>
            </View>

            <View style={styles.pickBottom}>
              <View style={styles.multiplierBox}>
                <Text style={styles.pickLabel}>{pick.pick}</Text>
                <View
                  style={[
                    styles.multiplierCard,
                    pick.hasAccent && styles.multiplierCardAccent,
                  ]}
                >
                  <Text
                    style={[
                      styles.multiplierSubLabel,
                      pick.hasAccent && styles.multiplierSubLabelAccent,
                    ]}
                  >
                    DIFFICULTY MULTIPLIER
                  </Text>
                  <Text
                    style={[
                      styles.multiplierValue,
                      pick.hasAccent && styles.multiplierValueAccent,
                    ]}
                  >
                    {pick.multiplier}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.removeBtn}>
                <Feather name="x" size={14} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Streak Bonus Banner */}
        <View style={styles.streakBanner}>
          <View style={styles.streakLeft}>
            <MaterialCommunityIcons name="fire" size={24} color="#4A5E00" />
            <View style={styles.streakTextBlock}>
              <Text style={styles.streakTitle}>Streak Bonus Active!</Text>
              <Text style={styles.streakSub}>
                Points reward increased by 15% for{'\n'}parlay predictions
              </Text>
            </View>
          </View>
          <Text style={styles.streakPercent}>+15%</Text>
        </View>

        {/* Prediction Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <MaterialCommunityIcons
              name="chart-box-outline"
              size={20}
              color={colors.onSurface}
            />
            <Text style={styles.summaryTitle}>Prediction Summary</Text>
          </View>

          <View style={styles.summaryRows}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Combined Multiplier</Text>
              <Text style={styles.summaryValue}>15.12x</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Active Picks</Text>
              <Text style={styles.summaryValue}>3 Events</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Streak Bonus</Text>
              <Text style={styles.summaryValueGreen}>+15.0%</Text>
            </View>
          </View>

          {/* Confidence Level */}
          <View style={styles.confidenceBlock}>
            <Text style={styles.confidenceLabel}>SET CONFIDENCE LEVEL</Text>
            <View style={styles.confidenceRow}>
              {CONFIDENCE_LEVELS.map((lvl) => (
                <TouchableOpacity
                  key={lvl}
                  style={[
                    styles.confidenceBtn,
                    confidence === lvl && styles.confidenceBtnActive,
                  ]}
                  onPress={() => setConfidence(lvl)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.confidenceBtnText,
                      confidence === lvl && styles.confidenceBtnTextActive,
                    ]}
                  >
                    {lvl}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.confidenceHint}>
              CONFIDENCE LEVEL ADJUSTS POINTS AT RISK VS POTENTIAL{'\n'}REWARDS
            </Text>
          </View>

          {/* Max Score */}
          <View style={styles.maxScoreCard}>
            <Text style={styles.maxScoreLabel}>MAX SCORE</Text>
            <Text style={styles.maxScoreValue}>8,520 PTS</Text>
          </View>

          {/* Confirm Button */}
          <TouchableOpacity activeOpacity={0.85} style={styles.confirmWrap}>
            <LinearGradient
              colors={['#F3FFCA', '#BEEE00']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.confirmBtn}
            >
              <Text style={styles.confirmBtnText}>CONFIRM PREDICTIONS</Text>
              <Ionicons name="checkmark-circle" size={20} color="#516700" />
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.submitHint}>
            SUBMIT THESE PICKS FOR THE CURRENT{'\n'}LEADERBOARDS
          </Text>
        </View>

        {/* Total Points */}
        <View style={styles.totalBar}>
          <View style={styles.totalLeft}>
            <MaterialCommunityIcons
              name="star-circle-outline"
              size={20}
              color={colors.onSurface}
            />
            <Text style={styles.totalLabel}>Total Points Available</Text>
          </View>
          <Text style={styles.totalValue}>12,504 PTS</Text>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

// ── Styles ──

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: { flex: 1 },

  // Section Header
  sectionHeader: {
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 32,
  },
  activeSessionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,116,57,0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  activeSessionText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    lineHeight: 15,
    color: colors.tertiaryLight,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  pageTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 36,
    lineHeight: 40,
    color: colors.onSurface,
    letterSpacing: -0.9,
    textTransform: 'uppercase',
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 8,
    padding: 4,
  },
  tabBtn: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 4,
  },
  tabBtnActive: {
    backgroundColor: colors.surfaceContainerHighest,
  },
  tabBtnText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  tabBtnTextActive: {
    color: colors.primaryContainer,
  },

  // Predictions header
  predHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  predHeaderTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    lineHeight: 28,
    color: colors.onSurface,
    letterSpacing: -0.9,
    textTransform: 'uppercase',
    opacity: 0.5,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clearBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    lineHeight: 16,
    color: '#FF7351',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  // Pick Card
  pickCard: {
    marginHorizontal: 16,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 8,
    padding: 24,
    marginBottom: 16,
    overflow: 'hidden',
  },
  pickAccent: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 4,
    backgroundColor: 'rgba(243,255,202,0.2)',
  },
  pickMeta: { gap: 4, marginBottom: 8 },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 12,
    backgroundColor: colors.tertiaryLight,
  },
  liveLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    lineHeight: 15,
    color: colors.tertiaryLight,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  upcomingLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    lineHeight: 15,
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  pickTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 20,
    lineHeight: 28,
    color: colors.onSurface,
  },
  pickLeague: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
  },

  pickBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 8,
  },
  multiplierBox: { gap: 4 },
  pickLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    lineHeight: 15,
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
    textTransform: 'uppercase',
    textAlign: 'right',
  },
  multiplierCard: {
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 4,
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 2,
  },
  multiplierCardAccent: {
    borderWidth: 1,
    borderColor: 'rgba(243,255,202,0.1)',
  },
  multiplierSubLabel: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    textAlign: 'right',
  },
  multiplierSubLabelAccent: {
    color: 'rgba(243,255,202,0.7)',
  },
  multiplierValue: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 24,
    lineHeight: 32,
    color: colors.onSurface,
    textAlign: 'right',
  },
  multiplierValueAccent: {
    color: colors.primaryContainer,
  },
  removeBtn: {
    padding: 8,
  },

  // Streak Banner
  streakBanner: {
    marginHorizontal: 16,
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  streakLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  streakTextBlock: { gap: 0 },
  streakTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    lineHeight: 20,
    color: '#4A5E00',
  },
  streakSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(74,94,0,0.7)',
  },
  streakPercent: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    lineHeight: 24,
    color: '#4A5E00',
  },

  // Summary Card
  summaryCard: {
    marginHorizontal: 16,
    backgroundColor: 'rgba(34,38,43,0.7)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 24,
    marginBottom: 24,
    gap: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  summaryTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 20,
    lineHeight: 28,
    color: colors.onSurface,
  },
  summaryRows: { gap: 16 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
  },
  summaryValue: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurface,
  },
  summaryValueGreen: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
    lineHeight: 20,
    color: '#6BFE9C',
  },

  // Confidence
  confidenceBlock: {
    gap: 16,
    paddingTop: 8,
  },
  confidenceLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    lineHeight: 15,
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  confidenceRow: {
    flexDirection: 'row',
    gap: 8,
  },
  confidenceBtn: {
    flex: 1,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 4,
    paddingVertical: 8,
    alignItems: 'center',
  },
  confidenceBtnActive: {
    backgroundColor: colors.primary,
  },
  confidenceBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    lineHeight: 15,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  confidenceBtnTextActive: {
    color: colors.onPrimary,
  },
  confidenceHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    lineHeight: 15,
    color: 'rgba(169,171,175,0.6)',
    letterSpacing: -0.25,
    textTransform: 'uppercase',
    textAlign: 'center',
  },

  // Max Score
  maxScoreCard: {
    backgroundColor: '#000000',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 8,
  },
  maxScoreLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    lineHeight: 16,
    color: colors.onSurfaceVariant,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  maxScoreValue: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 36,
    lineHeight: 40,
    color: colors.primaryContainer,
  },

  // Confirm
  confirmWrap: {
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: 'rgba(202,253,0,1)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 10,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 20,
    borderRadius: 8,
  },
  confirmBtnText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    lineHeight: 28,
    color: '#516700',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  submitHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    lineHeight: 15,
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
    textTransform: 'uppercase',
    textAlign: 'center',
  },

  // Total bar
  totalBar: {
    marginHorizontal: 16,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  totalLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurface,
  },
  totalValue: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    lineHeight: 24,
    color: colors.onSurface,
  },
});
