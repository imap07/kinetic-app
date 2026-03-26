import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Feather,
  Ionicons,
  MaterialCommunityIcons,
} from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../theme';

const BALANCE = {
  total: 12450,
  thisWeek: 850,
  streak: 5,
  streakBonus: 200,
};

type RewardTier = {
  name: string;
  threshold: number;
  icon: string;
  color: string;
  unlocked: boolean;
};

const TIERS: RewardTier[] = [
  { name: 'Bronze', threshold: 1000, icon: 'medal', color: '#CD7F32', unlocked: true },
  { name: 'Silver', threshold: 5000, icon: 'medal', color: '#C0C0C0', unlocked: true },
  { name: 'Gold', threshold: 10000, icon: 'medal', color: '#FFD700', unlocked: true },
  { name: 'Diamond', threshold: 25000, icon: 'diamond-stone', color: '#B9F2FF', unlocked: false },
  { name: 'Legend', threshold: 50000, icon: 'crown', color: colors.primary, unlocked: false },
];

type RedeemOption = {
  id: string;
  title: string;
  description: string;
  cost: number;
  icon: string;
};

const REDEEM_OPTIONS: RedeemOption[] = [
  {
    id: '1',
    title: 'Profile Badge',
    description: 'Exclusive badge displayed on your profile',
    cost: 500,
    icon: 'award',
  },
  {
    id: '2',
    title: 'Custom Avatar Frame',
    description: 'Animated frame around your profile picture',
    cost: 1500,
    icon: 'image',
  },
  {
    id: '3',
    title: 'Prediction Boost',
    description: 'Earn 2x points on your next 5 predictions',
    cost: 2000,
    icon: 'zap',
  },
  {
    id: '4',
    title: 'Early Access',
    description: 'Get early access to new features and events',
    cost: 5000,
    icon: 'star',
  },
];

type TxItem = {
  id: string;
  label: string;
  type: 'earn' | 'spend' | 'bonus';
  pts: string;
  time: string;
};

const TRANSACTIONS: TxItem[] = [
  { id: '1', label: 'Correct Prediction - LAL vs BOS', type: 'earn', pts: '+150', time: '2 min ago' },
  { id: '2', label: 'Streak Bonus (5 days)', type: 'bonus', pts: '+200', time: '2 min ago' },
  { id: '3', label: 'Profile Badge Redeemed', type: 'spend', pts: '-500', time: '1 day ago' },
  { id: '4', label: 'Correct Prediction - ARS vs MCI', type: 'earn', pts: '+120', time: '2 days ago' },
  { id: '5', label: 'Weekly Top 10% Bonus', type: 'bonus', pts: '+300', time: '3 days ago' },
  { id: '6', label: 'Incorrect Prediction - PSG vs BAY', type: 'earn', pts: '-50', time: '3 days ago' },
];

export function WalletRewardsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const currentTier = TIERS.filter((t) => t.unlocked).pop()!;
  const nextTier = TIERS.find((t) => !t.unlocked);
  const progress = nextTier ? BALANCE.total / nextTier.threshold : 1;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>WALLET & REWARDS</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Balance card */}
        <LinearGradient
          colors={['rgba(202,253,0,0.12)', 'rgba(202,253,0,0.02)']}
          style={styles.balanceCard}
        >
          <Text style={styles.balanceLabel}>TOTAL POINTS</Text>
          <Text style={styles.balanceValue}>
            {BALANCE.total.toLocaleString()}
          </Text>
          <View style={styles.balanceRow}>
            <View style={styles.balanceStat}>
              <Ionicons name="trending-up" size={14} color={colors.primary} />
              <Text style={styles.balanceStatText}>
                +{BALANCE.thisWeek} this week
              </Text>
            </View>
            <View style={styles.balanceStat}>
              <Ionicons name="flame" size={14} color="#FC5B00" />
              <Text style={styles.balanceStatText}>
                {BALANCE.streak}-day streak (+{BALANCE.streakBonus} bonus)
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Tier progress */}
        <View style={styles.tierSection}>
          <View style={styles.tierHeader}>
            <Text style={styles.sectionLabel}>REWARD TIER</Text>
            <View style={styles.currentTierBadge}>
              <MaterialCommunityIcons
                name={currentTier.icon as any}
                size={14}
                color={currentTier.color}
              />
              <Text style={[styles.currentTierText, { color: currentTier.color }]}>
                {currentTier.name.toUpperCase()}
              </Text>
            </View>
          </View>

          {nextTier && (
            <View style={styles.tierProgressCard}>
              <View style={styles.tierProgressLabels}>
                <Text style={styles.tierProgressCurrent}>
                  {BALANCE.total.toLocaleString()} pts
                </Text>
                <Text style={styles.tierProgressTarget}>
                  {nextTier.threshold.toLocaleString()} pts
                </Text>
              </View>
              <View style={styles.tierProgressTrack}>
                <View
                  style={[styles.tierProgressFill, { width: `${Math.min(progress * 100, 100)}%` }]}
                />
              </View>
              <Text style={styles.tierProgressHint}>
                {(nextTier.threshold - BALANCE.total).toLocaleString()} pts to{' '}
                <Text style={{ color: nextTier.color }}>{nextTier.name}</Text>
              </Text>
            </View>
          )}

          {/* Tier badges row */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tierBadgesRow}
          >
            {TIERS.map((t) => (
              <View
                key={t.name}
                style={[
                  styles.tierBadge,
                  t.unlocked && { borderColor: t.color },
                  !t.unlocked && styles.tierBadgeLocked,
                ]}
              >
                <MaterialCommunityIcons
                  name={t.icon as any}
                  size={20}
                  color={t.unlocked ? t.color : colors.onSurfaceDim}
                />
                <Text
                  style={[
                    styles.tierBadgeName,
                    { color: t.unlocked ? t.color : colors.onSurfaceDim },
                  ]}
                >
                  {t.name.toUpperCase()}
                </Text>
                <Text style={styles.tierBadgePts}>
                  {t.threshold >= 1000
                    ? `${t.threshold / 1000}K`
                    : t.threshold}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Redeem section */}
        <Text style={[styles.sectionLabel, { paddingHorizontal: spacing['2xl'], marginTop: spacing['3xl'] }]}>
          REDEEM POINTS
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.redeemRow}
        >
          {REDEEM_OPTIONS.map((r) => {
            const canAfford = BALANCE.total >= r.cost;
            return (
              <View key={r.id} style={styles.redeemCard}>
                <View style={styles.redeemIconWrap}>
                  <Feather
                    name={r.icon as any}
                    size={22}
                    color={canAfford ? colors.primary : colors.onSurfaceDim}
                  />
                </View>
                <Text style={styles.redeemTitle}>{r.title}</Text>
                <Text style={styles.redeemDesc}>{r.description}</Text>
                <TouchableOpacity
                  style={[styles.redeemBtn, !canAfford && styles.redeemBtnDisabled]}
                  activeOpacity={0.7}
                  disabled={!canAfford}
                >
                  <Text
                    style={[
                      styles.redeemBtnText,
                      !canAfford && styles.redeemBtnTextDisabled,
                    ]}
                  >
                    {r.cost.toLocaleString()} PTS
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>

        {/* Transaction history */}
        <Text style={[styles.sectionLabel, { paddingHorizontal: spacing['2xl'], marginTop: spacing['3xl'] }]}>
          RECENT ACTIVITY
        </Text>
        <View style={styles.txList}>
          {TRANSACTIONS.map((tx) => {
            const isNeg = tx.pts.startsWith('-');
            const isBonus = tx.type === 'bonus';
            return (
              <View key={tx.id} style={styles.txRow}>
                <View
                  style={[
                    styles.txIcon,
                    {
                      backgroundColor: isNeg
                        ? 'rgba(255,68,68,0.12)'
                        : isBonus
                        ? 'rgba(252,91,0,0.12)'
                        : 'rgba(202,253,0,0.12)',
                    },
                  ]}
                >
                  <Feather
                    name={isNeg ? 'arrow-down-left' : isBonus ? 'gift' : 'arrow-up-right'}
                    size={16}
                    color={isNeg ? '#FF4444' : isBonus ? '#FC5B00' : colors.primary}
                  />
                </View>
                <View style={styles.txContent}>
                  <Text style={styles.txLabel} numberOfLines={1}>{tx.label}</Text>
                  <Text style={styles.txTime}>{tx.time}</Text>
                </View>
                <Text
                  style={[
                    styles.txPts,
                    {
                      color: isNeg ? '#FF4444' : isBonus ? '#FC5B00' : colors.primary,
                    },
                  ]}
                >
                  {tx.pts}
                </Text>
              </View>
            );
          })}
        </View>

        {/* How it works */}
        <View style={styles.howSection}>
          <Text style={styles.sectionLabel}>HOW IT WORKS</Text>
          <View style={styles.howCard}>
            <HowStep
              step="1"
              title="Make Predictions"
              desc="Pick outcomes for live and upcoming matches"
            />
            <HowStep
              step="2"
              title="Earn Points"
              desc="Get points for correct predictions, streaks, and weekly performance"
            />
            <HowStep
              step="3"
              title="Unlock Rewards"
              desc="Redeem points for badges, boosts, and exclusive features"
            />
            <HowStep
              step="4"
              title="Climb Tiers"
              desc="Accumulate lifetime points to reach higher reward tiers"
              isLast
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function HowStep({ step, title, desc, isLast = false }: { step: string; title: string; desc: string; isLast?: boolean }) {
  return (
    <View style={[howStyles.row, !isLast && howStyles.rowBorder]}>
      <View style={howStyles.stepCircle}>
        <Text style={howStyles.stepNum}>{step}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={howStyles.stepTitle}>{title}</Text>
        <Text style={howStyles.stepDesc}>{desc}</Text>
      </View>
    </View>
  );
}

const howStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(202,253,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNum: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 13,
    color: colors.primary,
  },
  stepTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: colors.onSurface,
  },
  stepDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: colors.onSurfaceDim,
    marginTop: 2,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['2xl'],
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    color: colors.onSurface,
    letterSpacing: 1,
  },
  scroll: { flex: 1 },

  sectionLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.onSurfaceDim,
    letterSpacing: 1.5,
    marginBottom: spacing.md,
  },

  balanceCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing['2xl'],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(202,253,0,0.15)',
  },
  balanceLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.onSurfaceDim,
    letterSpacing: 1.5,
  },
  balanceValue: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 44,
    color: colors.primary,
    marginTop: 4,
    letterSpacing: -1,
  },
  balanceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  balanceStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  balanceStatText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },

  tierSection: { marginTop: spacing['3xl'] },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['2xl'],
    marginBottom: spacing.md,
  },
  currentTierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceContainerHighest,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  currentTierText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.5,
  },

  tierProgressCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.lg,
  },
  tierProgressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tierProgressCurrent: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: colors.primary,
  },
  tierProgressTarget: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: colors.onSurfaceDim,
  },
  tierProgressTrack: {
    height: 6,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 3,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  tierProgressFill: {
    height: 6,
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  tierProgressHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: colors.onSurfaceDim,
    marginTop: spacing.sm,
  },

  tierBadgesRow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  tierBadge: {
    width: 80,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surfaceContainerLow,
  },
  tierBadgeLocked: {
    opacity: 0.4,
  },
  tierBadgeName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9,
    letterSpacing: 0.5,
    marginTop: 4,
  },
  tierBadgePts: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: colors.onSurfaceDim,
    marginTop: 2,
  },

  redeemRow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  redeemCard: {
    width: 160,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.lg,
  },
  redeemIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  redeemTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: colors.onSurface,
  },
  redeemDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.onSurfaceDim,
    marginTop: 4,
    lineHeight: 15,
    minHeight: 30,
  },
  redeemBtn: {
    marginTop: spacing.md,
    backgroundColor: 'rgba(202,253,0,0.12)',
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  redeemBtnDisabled: {
    backgroundColor: colors.surfaceContainerHighest,
  },
  redeemBtnText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 11,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  redeemBtnTextDisabled: {
    color: colors.onSurfaceDim,
  },

  txList: {
    marginHorizontal: spacing.lg,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  txIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  txContent: { flex: 1 },
  txLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: colors.onSurface,
  },
  txTime: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.onSurfaceDim,
    marginTop: 2,
  },
  txPts: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
    marginLeft: spacing.sm,
  },

  howSection: {
    marginTop: spacing['3xl'],
    paddingHorizontal: spacing.lg,
  },
  howCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    overflow: 'hidden',
  },
});
