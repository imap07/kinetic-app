import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme';
import { useRewards } from '../contexts/RewardsContext';

const TIERS = [
  { key: 'bronze', emoji: '🥉', color: '#CD7F32' },
  { key: 'silver', emoji: '🥈', color: '#C0C0C0' },
  { key: 'gold', emoji: '🥇', color: '#FFD700' },
  { key: 'diamond', emoji: '💎', color: '#00BCD4' },
  { key: 'legend', emoji: '👑', color: '#9B59B6' },
];

const TIER_ORDER: Record<string, number> = {
  none: -1,
  bronze: 0,
  silver: 1,
  gold: 2,
  diamond: 3,
  legend: 4,
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function RewardsProgressCard() {
  const { rewardStatus, claimTier } = useRewards();
  const progressAnim = useRef(new Animated.Value(0)).current;

  const progress = rewardStatus?.progress ?? 0;
  const currentTierIdx = TIER_ORDER[rewardStatus?.currentTier ?? 'none'] ?? -1;
  const unclaimedTiers = rewardStatus?.unclaimedTiers ?? [];
  const lowestUnclaimed = unclaimedTiers.length > 0
    ? unclaimedTiers.reduce((a, b) => ((TIER_ORDER[a] ?? 0) < (TIER_ORDER[b] ?? 0) ? a : b))
    : null;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress / 100,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  // Determine next tier color for progress bar
  const nextTierKey = rewardStatus?.nextTier?.toLowerCase();
  const nextTierInfo = TIERS.find((t) => t.key === nextTierKey);
  const barColor = nextTierInfo?.color ?? colors.primary;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Ionicons name="trophy" size={18} color={colors.primary} />
        <Text style={styles.headerText}>REWARDS</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.barContainer}>
        <View style={styles.barTrack}>
          <Animated.View
            style={[
              styles.barFill,
              {
                backgroundColor: barColor,
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
        <Text style={styles.percentText}>{Math.round(progress)}%</Text>
      </View>

      {/* Coins info */}
      <Text style={styles.coinsText}>
        {(rewardStatus?.coinsEarned ?? 0).toLocaleString()} / {(rewardStatus?.nextTierCoins ?? 0).toLocaleString()} coins
        {rewardStatus?.nextTier ? ` → ${nextTierInfo?.emoji ?? ''} ${capitalize(rewardStatus.nextTier)}` : ''}
      </Text>

      {/* Tier dots */}
      <View style={styles.tierRow}>
        {TIERS.map((tier) => {
          const tierIdx = TIER_ORDER[tier.key] ?? 0;
          const achieved = tierIdx <= currentTierIdx;
          const unclaimed = unclaimedTiers.includes(tier.key);

          return (
            <View key={tier.key} style={styles.tierDot}>
              <Text style={styles.tierEmoji}>{tier.emoji}</Text>
              {achieved ? (
                <Ionicons name="checkmark-circle" size={16} color={tier.color} />
              ) : (
                <Ionicons name="ellipse-outline" size={16} color="rgba(255,255,255,0.25)" />
              )}
            </View>
          );
        })}
      </View>

      {/* Claim button or encouragement */}
      {lowestUnclaimed ? (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => claimTier(lowestUnclaimed)}
          style={styles.claimWrap}
        >
          <LinearGradient
            colors={['#4CAF50', '#2E7D32']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.claimBtn}
          >
            <Text style={styles.claimText}>
              CLAIM {capitalize(lowestUnclaimed).toUpperCase()} REWARD
            </Text>
            <Ionicons name="arrow-forward" size={16} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
      ) : rewardStatus?.nextTier ? (
        <Text style={styles.encourageText}>
          Keep earning coins to reach {capitalize(rewardStatus.nextTier)}!
        </Text>
      ) : (
        <Text style={styles.encourageText}>
          You've reached the highest tier!
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  headerText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
    color: colors.onSurface,
    letterSpacing: 1.5,
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  barTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
  },
  percentText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: colors.onSurfaceVariant,
    minWidth: 36,
    textAlign: 'right',
  },
  coinsText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginBottom: 16,
  },
  tierRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  tierDot: {
    alignItems: 'center',
    gap: 4,
  },
  tierEmoji: {
    fontSize: 20,
  },
  claimWrap: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  claimBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  claimText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  encourageText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: colors.onSurfaceDim,
    textAlign: 'center',
  },
});
