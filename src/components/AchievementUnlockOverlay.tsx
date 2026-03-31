import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface AchievementUnlockData {
  key: string;
  title: string;
  description: string;
  icon: string;
  points: number;
}

interface Props {
  achievement: AchievementUnlockData | null;
  onDismiss: () => void;
}

const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  star: 'star',
  flame: 'flame',
  football: 'football',
  'checkmark-done': 'checkmark-done',
  trophy: 'trophy',
  medal: 'medal',
};

const AUTO_DISMISS_MS = 4500;

export function AchievementUnlockOverlay({ achievement, onDismiss }: Props) {
  const slideAnim = useRef(new Animated.Value(-200)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const particleAnims = useRef(
    Array.from({ length: 8 }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0),
    })),
  ).current;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: -200, duration: 300, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => onDismiss());
  }, [slideAnim, opacityAnim, onDismiss]);

  useEffect(() => {
    if (!achievement) return;

    // Reset
    slideAnim.setValue(-200);
    scaleAnim.setValue(0.3);
    opacityAnim.setValue(0);
    shimmerAnim.setValue(0);

    // Haptic burst
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 200);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 400);

    // Entrance animation
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Shimmer loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ]),
    ).start();

    // Particle explosion
    particleAnims.forEach((p, i) => {
      const angle = (i / 8) * Math.PI * 2;
      const distance = 40 + Math.random() * 30;
      p.x.setValue(0);
      p.y.setValue(0);
      p.opacity.setValue(0);
      p.scale.setValue(0);

      Animated.sequence([
        Animated.delay(200 + i * 50),
        Animated.parallel([
          Animated.timing(p.opacity, { toValue: 1, duration: 100, useNativeDriver: true }),
          Animated.spring(p.scale, { toValue: 1, friction: 4, useNativeDriver: true }),
          Animated.timing(p.x, { toValue: Math.cos(angle) * distance, duration: 600, useNativeDriver: true }),
          Animated.timing(p.y, { toValue: Math.sin(angle) * distance, duration: 600, useNativeDriver: true }),
        ]),
        Animated.timing(p.opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    });

    // Auto dismiss
    timerRef.current = setTimeout(dismiss, AUTO_DISMISS_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [achievement]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!achievement) return null;

  const iconName = ICON_MAP[achievement.icon] ?? 'ribbon';
  const shimmerOpacity = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.8] });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: opacityAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity activeOpacity={0.9} onPress={dismiss} style={styles.touchable}>
        <LinearGradient
          colors={['rgba(202,253,0,0.15)', 'rgba(202,253,0,0.05)', 'rgba(11,14,17,0.95)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.card}
        >
          {/* Shimmer overlay */}
          <Animated.View style={[styles.shimmer, { opacity: shimmerOpacity }]} />

          <View style={styles.content}>
            {/* Icon with particles */}
            <View style={styles.iconArea}>
              <Animated.View style={[styles.iconWrap, { transform: [{ scale: scaleAnim }] }]}>
                <LinearGradient
                  colors={['#F3FFCA', '#CAFD00']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.iconCircle}
                >
                  <Ionicons name={iconName} size={28} color="#4A5E00" />
                </LinearGradient>
              </Animated.View>

              {/* Particles */}
              {particleAnims.map((p, i) => (
                <Animated.View
                  key={i}
                  style={[
                    styles.particle,
                    {
                      opacity: p.opacity,
                      transform: [
                        { translateX: p.x },
                        { translateY: p.y },
                        { scale: p.scale },
                      ],
                    },
                  ]}
                />
              ))}
            </View>

            {/* Text */}
            <View style={styles.textArea}>
              <Text style={styles.label}>ACHIEVEMENT UNLOCKED</Text>
              <Text style={styles.title}>{achievement.title}</Text>
              <Text style={styles.description}>{achievement.description}</Text>
            </View>

            {/* Points badge */}
            <View style={styles.pointsBadge}>
              <Text style={styles.pointsText}>+{achievement.points}</Text>
              <Text style={styles.pointsLabel}>PTS</Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  touchable: {
    width: '100%',
    maxWidth: 400,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(202,253,0,0.3)',
    overflow: 'hidden',
    padding: 16,
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(202,253,0,0.05)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconArea: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {},
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  textArea: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    lineHeight: 12,
    color: colors.primary,
    letterSpacing: 1.5,
  },
  title: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    lineHeight: 22,
    color: colors.onSurface,
    letterSpacing: -0.5,
  },
  description: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 16,
    color: colors.onSurfaceVariant,
  },
  pointsBadge: {
    backgroundColor: 'rgba(202,253,0,0.15)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  pointsText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    lineHeight: 22,
    color: colors.primary,
  },
  pointsLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 8,
    color: colors.primary,
    letterSpacing: 1,
  },
});
