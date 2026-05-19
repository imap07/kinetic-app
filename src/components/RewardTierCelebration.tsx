import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useRewards } from '../contexts/RewardsContext';

interface TierInfo {
  icon: string;
  iconFamily: 'ionicons' | 'material';
  color: string;
  labelKey: string;
  subtitleKey: string;
}

// Tier visual config + i18n keys. The label/subtitle are resolved at
// render time via `t(tier.labelKey)` so language changes apply
// immediately instead of being baked at module-load.
const TIER_MAP: Record<string, TierInfo> = {
  bronze: {
    icon: 'trophy',
    iconFamily: 'ionicons',
    color: '#CD7F32',
    labelKey: 'rewardTier.bronzeTitle',
    subtitleKey: 'rewardTier.bronzeDesc',
  },
  silver: {
    icon: 'star',
    iconFamily: 'ionicons',
    color: '#C0C0C0',
    labelKey: 'rewardTier.silverTitle',
    subtitleKey: 'rewardTier.silverDesc',
  },
  gold: {
    icon: 'gift',
    iconFamily: 'ionicons',
    color: '#FFD700',
    labelKey: 'rewardTier.goldTitle',
    subtitleKey: 'rewardTier.goldDesc',
  },
  diamond: {
    icon: 'diamond',
    iconFamily: 'material',
    color: '#00BCD4',
    labelKey: 'rewardTier.diamondTitle',
    subtitleKey: 'rewardTier.diamondDesc',
  },
  legend: {
    icon: 'crown',
    iconFamily: 'material',
    color: '#9B59B6',
    labelKey: 'rewardTier.legendTitle',
    subtitleKey: 'rewardTier.legendDesc',
  },
};

const PARTICLE_COLORS = ['#CAFD00', '#FFD700', '#FF6B6B', '#4FC3F7', '#FF9800', '#E040FB'];
const PARTICLE_COUNT = 12;

export function RewardTierCelebration() {
  const { t } = useTranslation();
  const { showCelebration, celebrationTier, claimTier, dismissCelebration } = useRewards();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const particleAnims = useRef(
    Array.from({ length: PARTICLE_COUNT }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(1),
      scale: new Animated.Value(0),
    })),
  ).current;

  useEffect(() => {
    if (showCelebration) {
      // Reset
      fadeAnim.setValue(0);
      scaleAnim.setValue(0);
      particleAnims.forEach((p) => {
        p.x.setValue(0);
        p.y.setValue(0);
        p.opacity.setValue(1);
        p.scale.setValue(0);
      });

      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Icon spring
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 60,
        useNativeDriver: true,
      }).start();

      // Particles burst
      const particleAnimations = particleAnims.map((p, i) => {
        const angle = (i / PARTICLE_COUNT) * 2 * Math.PI;
        const distance = 100 + Math.random() * 60;
        return Animated.parallel([
          Animated.timing(p.x, {
            toValue: Math.cos(angle) * distance,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(p.y, {
            toValue: Math.sin(angle) * distance,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(p.opacity, {
            toValue: 0,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.spring(p.scale, {
            toValue: 1,
            friction: 5,
            tension: 80,
            useNativeDriver: true,
          }),
        ]);
      });

      Animated.parallel(particleAnimations).start();
    }
  }, [showCelebration]);

  if (!showCelebration || !celebrationTier) return null;

  const tier = TIER_MAP[celebrationTier] ?? TIER_MAP.bronze;

  const iconScale = scaleAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 1.2, 1],
  });

  const renderIcon = () => {
    if (tier.iconFamily === 'material') {
      return (
        <MaterialCommunityIcons
          name={tier.icon as any}
          size={64}
          color={tier.color}
        />
      );
    }
    return (
      <Ionicons name={tier.icon as any} size={64} color={tier.color} />
    );
  };

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      {/* Dismiss button */}
      <TouchableOpacity
        style={styles.closeBtn}
        onPress={dismissCelebration}
        activeOpacity={0.7}
      >
        <Ionicons name="close" size={28} color="rgba(255,255,255,0.7)" />
      </TouchableOpacity>

      {/* Particles */}
      {particleAnims.map((p, i) => (
        <Animated.View
          key={i}
          style={[
            styles.particle,
            {
              backgroundColor: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
              transform: [
                { translateX: p.x },
                { translateY: p.y },
                { scale: p.scale },
              ],
              opacity: p.opacity,
            },
          ]}
        />
      ))}

      {/* Icon */}
      <Animated.View style={{ transform: [{ scale: iconScale }], marginBottom: 24 }}>
        <View style={[styles.iconCircle, { borderColor: tier.color }]}>
          {renderIcon()}
        </View>
      </Animated.View>

      {/* Tier label */}
      <Text style={[styles.tierLabel, { color: tier.color }]}>
        {t(tier.labelKey)}
      </Text>

      {/* Subtitle */}
      <Text style={styles.subtitle}>{t(tier.subtitleKey)}</Text>

      {/* Claim button */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => claimTier(celebrationTier)}
        style={styles.claimBtnWrap}
      >
        <LinearGradient
          colors={['#4CAF50', '#2E7D32']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.claimBtn}
        >
          <Text style={styles.claimBtnText}>{t('rewardTier.claimReward')}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 60,
    right: 24,
    zIndex: 10000,
    padding: 8,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  tierLabel: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 28,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    color: 'rgba(248,249,254,0.7)',
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 40,
  },
  claimBtnWrap: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  claimBtn: {
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 14,
    alignItems: 'center',
  },
  claimBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
});
