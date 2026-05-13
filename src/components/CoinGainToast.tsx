/**
 * CoinGainToast — celebratory "+X KC" pill that appears at the top
 * of the screen whenever CoinContext detects a positive balance
 * delta between refreshes. Decoupled from any specific call site,
 * so winning a prediction, completing a daily challenge, redeeming
 * a referral reward, etc., all surface the same micro-celebration
 * without each flow needing its own animation code.
 *
 * Behavior:
 *   - Slides down + fades in
 *   - Holds ~1.6s
 *   - Slides up + fades out
 *   - Haptic success notification on appear
 *   - Tapping dismisses immediately
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCoins } from '../contexts/CoinContext';
import { colors } from '../theme';

const SHOW_MS = 1600;

export function CoinGainToast() {
  const { lastGain } = useCoins();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const lastSeenRef = useRef<number | null>(null);

  useEffect(() => {
    if (!lastGain || lastGain.at === lastSeenRef.current) return;
    lastSeenRef.current = lastGain.at;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -80,
          duration: 260,
          delay: SHOW_MS,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 240,
          delay: SHOW_MS,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [lastGain, translateY, opacity]);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -80,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  };

  if (!lastGain) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        {
          top: insets.top + 8,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <TouchableOpacity activeOpacity={0.9} onPress={dismiss}>
        <View style={styles.pill}>
          <MaterialCommunityIcons name="circle-multiple" size={18} color="#4A5E00" />
          <Text style={styles.text}>
            +{lastGain.amount.toLocaleString()} KC
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  text: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 15,
    color: '#4A5E00',
    letterSpacing: 0.3,
  },
});
