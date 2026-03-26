import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { colors } from '../theme';
import { AppHeader } from '../components/AppHeader';

// ── Mock Data ──

const MATCH = {
  homeTeam: 'London FC',
  homeSubtitle: 'The Royals',
  awayTeam: 'Madrid United',
  awaySubtitle: 'Los Blancos',
  homeScore: 2,
  awayScore: 1,
  league: 'Premier League',
  liveMinute: "74'",
};

const STATS = [
  {
    label: 'SHOTS ON GOAL',
    value: '12 / 05',
    homeFilled: 3,
    totalDots: 5,
  },
  {
    label: 'DANGEROUS ATTACKS',
    value: '84 / 61',
    homeFilled: 2,
    totalDots: 4,
    dimHome: true,
  },
  {
    label: 'CORNERS',
    value: '07 / 03',
    homeFilled: 1,
    totalDots: 2,
  },
];

const TIMELINE = [
  {
    type: 'goal' as const,
    minute: "68'",
    title: 'Goal!',
    detail: 'M. Sterling',
    score: '2-1',
  },
  {
    type: 'substitution' as const,
    minute: "55'",
    title: 'Substitution',
    detailParts: ['R. Benzema', 'J. Vinicius'],
  },
  {
    type: 'yellowCard' as const,
    minute: "41'",
    title: 'Yellow Card',
    detail: 'L. Modric',
  },
];

const PREDICTIONS = [
  { label: 'LONDON FC WIN', pts: '+15 pts' },
  { label: 'DRAW OUTCOME', pts: '+45 pts' },
  { label: 'MADRID UNITED WIN', pts: '+120 pts' },
];

const NEXT_GOAL = [
  { name: 'H. KANE', pts: '+35 pts' },
  { name: 'B. SAKA', pts: '+50 pts' },
];

// ── Stat Bar Component ──

function StatDots({
  filled,
  total,
  dim,
}: {
  filled: number;
  total: number;
  dim?: boolean;
}) {
  return (
    <View style={statStyles.dotRow}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            statStyles.dot,
            i < filled
              ? [statStyles.dotFilled, dim && statStyles.dotDim]
              : statStyles.dotEmpty,
          ]}
        />
      ))}
    </View>
  );
}

const statStyles = StyleSheet.create({
  dotRow: { flexDirection: 'row', gap: 4 },
  dot: { flex: 1, height: 6, borderRadius: 12 },
  dotFilled: { backgroundColor: colors.primaryContainer },
  dotDim: { opacity: 0.6 },
  dotEmpty: { backgroundColor: colors.surfaceContainerHighest },
});

// ── Main Screen ──

export function LiveScreen() {
  return (
    <View style={styles.container}>
      <AppHeader />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Live Match Hero ── */}
        <View style={styles.heroCard}>
          <LinearGradient
            colors={['rgba(16,20,23,0)', 'rgba(16,20,23,0.6)', '#101417']}
            style={StyleSheet.absoluteFill}
          />

          {/* Live Badge */}
          <View style={styles.liveBadge}>
            <View style={styles.liveBadgeDot} />
            <Text style={styles.liveBadgeText}>
              Live {'\u2022'} {MATCH.liveMinute}
            </Text>
          </View>

          {/* Home Team */}
          <View style={styles.teamBlock}>
            <View style={[styles.teamLogo, styles.teamLogoHome]}>
              <Ionicons name="football" size={36} color={colors.onSurface} />
            </View>
            <Text style={styles.teamName}>{MATCH.homeTeam}</Text>
            <Text style={styles.teamSub}>{MATCH.homeSubtitle}</Text>
          </View>

          {/* Score */}
          <View style={styles.scoreRow}>
            <Text style={styles.scoreHome}>{MATCH.homeScore}</Text>
            <Text style={styles.scoreDivider}>:</Text>
            <Text style={styles.scoreAway}>{MATCH.awayScore}</Text>
          </View>
          <View style={styles.leaguePill}>
            <Text style={styles.leaguePillText}>{MATCH.league}</Text>
          </View>

          {/* Away Team */}
          <View style={styles.teamBlock}>
            <View style={[styles.teamLogo, styles.teamLogoAway]}>
              <MaterialCommunityIcons
                name="shield-outline"
                size={36}
                color={colors.onSurface}
              />
            </View>
            <Text style={styles.teamName}>{MATCH.awayTeam}</Text>
            <Text style={styles.teamSub}>{MATCH.awaySubtitle}</Text>
          </View>
        </View>

        {/* ── Match Statistics ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>MATCH STATISTICS</Text>

          {/* Possession */}
          <View style={styles.possessionBlock}>
            <View style={styles.possessionHeader}>
              <Text style={styles.possessionHomeLabel}>POSSESSION (58%)</Text>
              <Text style={styles.possessionAwayLabel}>42%</Text>
            </View>
            <View style={styles.possessionTrack}>
              <View style={[styles.possessionHome, { flex: 58 }]} />
              <View style={[styles.possessionAway, { flex: 42 }]} />
            </View>
          </View>

          {/* Stat rows */}
          {STATS.map((stat, idx) => (
            <View key={idx} style={styles.statRow}>
              <View style={styles.statHeader}>
                <Text style={styles.statLabel}>{stat.label}</Text>
                <Text style={styles.statValue}>{stat.value}</Text>
              </View>
              <StatDots
                filled={stat.homeFilled}
                total={stat.totalDots}
                dim={stat.dimHome}
              />
            </View>
          ))}

          {/* Discipline */}
          <View style={styles.disciplineRow}>
            <Text style={styles.statLabel}>DISCIPLINE</Text>
            <View style={styles.cardsGroup}>
              <View style={styles.cardBadge}>
                <View style={[styles.cardRect, { backgroundColor: '#FACC15' }]} />
                <Text style={styles.cardCount}>2</Text>
              </View>
              <View style={styles.cardBadge}>
                <View style={[styles.cardRect, { backgroundColor: '#DC2626' }]} />
                <Text style={styles.cardCount}>0</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Live Timeline ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>LIVE TIMELINE</Text>
          <View style={styles.timeline}>
            <View style={styles.timelineLine} />
            {TIMELINE.map((evt, idx) => (
              <View key={idx} style={styles.timelineEvent}>
                {/* Dot */}
                <View
                  style={[
                    styles.timelineDot,
                    evt.type === 'goal' && styles.timelineDotGoal,
                  ]}
                >
                  {evt.type === 'goal' && (
                    <Ionicons name="football" size={12} color={colors.onPrimary} />
                  )}
                  {evt.type === 'substitution' && (
                    <MaterialCommunityIcons
                      name="swap-horizontal"
                      size={10}
                      color={colors.onSurfaceVariant}
                    />
                  )}
                  {evt.type === 'yellowCard' && (
                    <View style={styles.yellowCardSmall} />
                  )}
                </View>

                {/* Content */}
                <View
                  style={[
                    styles.timelineCard,
                    evt.type === 'goal' && styles.timelineCardGoal,
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.timelineMinute,
                        evt.type === 'goal' && styles.timelineMinuteGoal,
                      ]}
                    >
                      {evt.minute} {evt.title}
                    </Text>
                    {evt.detailParts ? (
                      <Text style={styles.timelineDetail}>
                        {evt.detailParts[0]}{' '}
                        <Text style={{ color: colors.tertiaryLight }}>
                          {'\u279C'}
                        </Text>{' '}
                        {evt.detailParts[1]}
                      </Text>
                    ) : (
                      <Text
                        style={[
                          styles.timelineDetailBold,
                          evt.type !== 'goal' && styles.timelineDetail,
                        ]}
                      >
                        {evt.detail}
                      </Text>
                    )}
                  </View>
                  {evt.score && (
                    <Text style={styles.timelineScore}>{evt.score}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── Match Predictions ── */}
        <View style={styles.predictCard}>
          <View style={styles.predictHeader}>
            <Text style={styles.cardTitle}>MATCH PREDICTIONS</Text>
            <MaterialCommunityIcons
              name="access-point"
              size={20}
              color={colors.onSurfaceVariant}
            />
          </View>

          <Text style={styles.predictSectionLabel}>PREDICT RESULT (1X2)</Text>
          {PREDICTIONS.map((p, idx) => (
            <TouchableOpacity key={idx} style={styles.predictBtn}>
              <View>
                <Text style={styles.predictBtnLabel}>{p.label}</Text>
                <Text style={styles.predictBtnPts}>{p.pts}</Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          ))}

          <View style={styles.predictDivider} />

          {/* Next Goal */}
          <View style={styles.nextGoalHeader}>
            <Text style={styles.nextGoalTitle}>NEXT GOAL PREDICTION</Text>
            <View style={styles.skillBadge}>
              <Text style={styles.skillBadgeText}>Skill Bonus</Text>
            </View>
          </View>
          <View style={styles.nextGoalRow}>
            {NEXT_GOAL.map((g, idx) => (
              <TouchableOpacity key={idx} style={styles.nextGoalBtn}>
                <Text style={styles.nextGoalName}>{g.name}</Text>
                <Text style={styles.nextGoalPts}>{g.pts}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity activeOpacity={0.8} style={styles.submitWrap}>
            <View style={styles.submitBtn}>
              <Text style={styles.submitBtnText}>SUBMIT PICKS</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Live Trend Insight ── */}
        <View style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <MaterialCommunityIcons
              name="trending-up"
              size={18}
              color={colors.onSurface}
            />
            <Text style={styles.insightTitle}>LIVE TREND INSIGHT</Text>
          </View>
          <Text style={styles.insightBody}>
            London FC has scored in the{' '}
            <Text style={styles.insightBold}>final 15 minutes</Text>
            {'\n'}in 80% of their home games this season.{'\n'}Prediction
            points for "Over 3.5 Goals" are{'\n'}increasing in value.
          </Text>
          <View style={styles.insightPick}>
            <Text style={styles.insightPickLabel}>OVER 3.5 GOALS PICK</Text>
            <Text style={styles.insightPickPts}>+40 pts</Text>
          </View>
        </View>

        {/* ── Sharp AI Predictor ── */}
        <View style={styles.aiCard}>
          <View style={styles.aiIcon}>
            <MaterialCommunityIcons
              name="lightning-bolt"
              size={20}
              color={colors.primary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.aiLabel}>SHARP AI PREDICTOR</Text>
            <Text style={styles.aiValue}>
              London to Win (84% Confidence)
            </Text>
          </View>
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

  // Hero Card
  heroCard: {
    marginHorizontal: 16,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 8,
    padding: 32,
    minHeight: 400,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    overflow: 'hidden',
    marginBottom: 24,
  },
  liveBadge: {
    position: 'absolute',
    top: 24,
    right: 24,
    backgroundColor: '#FC5B00',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
    zIndex: 10,
  },
  liveBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 12,
    backgroundColor: colors.onSurface,
  },
  liveBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    lineHeight: 16,
    color: '#220600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  teamBlock: { alignItems: 'center', gap: 4 },
  teamLogo: {
    width: 96,
    height: 96,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamLogoHome: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primaryContainer,
  },
  teamLogoAway: {
    borderRightWidth: 4,
    borderRightColor: '#45484C',
  },
  teamName: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 30,
    lineHeight: 36,
    color: colors.onSurface,
    letterSpacing: -1.5,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginTop: 16,
  },
  teamSub: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    textAlign: 'center',
  },

  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    marginVertical: 8,
  },
  scoreHome: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 72,
    lineHeight: 72,
    color: colors.primaryContainer,
    letterSpacing: -3.6,
  },
  scoreDivider: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 36,
    lineHeight: 40,
    color: '#45484C',
  },
  scoreAway: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 72,
    lineHeight: 72,
    color: colors.onSurface,
    letterSpacing: -3.6,
  },
  leaguePill: {
    backgroundColor: 'rgba(34,38,43,0.5)',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 8,
    marginTop: 8,
    marginBottom: 16,
  },
  leaguePillText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    lineHeight: 28,
    color: colors.onSurfaceVariant,
    letterSpacing: -0.45,
  },

  // Card base
  card: {
    marginHorizontal: 16,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 8,
    padding: 24,
    marginBottom: 24,
    gap: 32,
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
    fontSize: 24,
    lineHeight: 32,
    color: colors.onSurface,
  },

  // Discipline
  disciplineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardsGroup: { flexDirection: 'row', gap: 16 },
  cardBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardRect: { width: 12, height: 16, borderRadius: 2 },
  cardCount: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    lineHeight: 24,
    color: colors.onSurface,
  },

  // Timeline
  timeline: { gap: 24, position: 'relative' },
  timelineLine: {
    position: 'absolute',
    left: 11,
    top: 8,
    bottom: 8,
    width: 2,
    backgroundColor: 'rgba(69,72,76,0.3)',
  },
  timelineEvent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 4,
    borderColor: colors.background,
    zIndex: 2,
  },
  timelineDotGoal: {
    backgroundColor: colors.primary,
    borderColor: colors.background,
  },
  timelineCard: {
    flex: 1,
    backgroundColor: 'rgba(34,38,43,0.4)',
    borderRadius: 4,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timelineCardGoal: {
    backgroundColor: colors.surfaceContainerHighest,
  },
  timelineMinute: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    lineHeight: 15,
    color: colors.onSurfaceVariant,
    letterSpacing: -0.5,
    textTransform: 'uppercase',
  },
  timelineMinuteGoal: {
    color: colors.primaryContainer,
  },
  timelineDetailBold: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    lineHeight: 24,
    color: colors.onSurface,
  },
  timelineDetail: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
  },
  timelineScore: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 20,
    lineHeight: 28,
    color: colors.onSurface,
  },
  yellowCardSmall: {
    width: 10,
    height: 14,
    borderRadius: 2,
    backgroundColor: '#FACC15',
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
  predictDivider: {
    height: 1,
    backgroundColor: 'rgba(69,72,76,0.2)',
    marginVertical: 20,
  },
  nextGoalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nextGoalTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    lineHeight: 16,
    color: colors.onSurface,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  skillBadge: {
    backgroundColor: 'rgba(243,255,202,0.1)',
    borderRadius: 2,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  skillBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    lineHeight: 15,
    color: colors.primaryContainer,
  },
  nextGoalRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  nextGoalBtn: {
    flex: 1,
    backgroundColor: '#1C2024',
    borderWidth: 1,
    borderColor: 'rgba(69,72,76,0.1)',
    borderRadius: 4,
    padding: 13,
    alignItems: 'center',
    gap: 4,
  },
  nextGoalName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    lineHeight: 15,
    color: colors.onSurfaceVariant,
    letterSpacing: -0.5,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  nextGoalPts: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    lineHeight: 28,
    color: colors.onSurface,
    textAlign: 'center',
  },
  submitWrap: { marginTop: 4 },
  submitBtn: {
    backgroundColor: colors.primaryContainer,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  submitBtnText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    lineHeight: 24,
    color: '#516700',
    letterSpacing: -0.8,
    textTransform: 'uppercase',
    textAlign: 'center',
  },

  // Insight card
  insightCard: {
    marginHorizontal: 16,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.tertiaryLight,
    paddingLeft: 28,
    paddingRight: 24,
    paddingVertical: 24,
    marginBottom: 24,
    gap: 16,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  insightTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurface,
    letterSpacing: 0.35,
    textTransform: 'uppercase',
  },
  insightBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 22,
    color: colors.onSurfaceVariant,
  },
  insightBold: {
    fontFamily: 'Inter_700Bold',
    color: colors.onSurface,
  },
  insightPick: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  insightPickLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    lineHeight: 15,
    color: colors.onSurface,
    letterSpacing: 1,
    textTransform: 'uppercase',
    opacity: 0.6,
  },
  insightPickPts: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    lineHeight: 24,
    color: colors.tertiaryLight,
  },

  // AI card
  aiCard: {
    marginHorizontal: 16,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
    overflow: 'hidden',
  },
  aiIcon: {
    width: 48,
    height: 48,
    borderRadius: 4,
    backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    lineHeight: 15,
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  aiValue: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    lineHeight: 24,
    color: colors.primaryContainer,
  },
});
