import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Animated } from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme';
import { useCoins } from '../contexts/CoinContext';
import { useAuth } from '../contexts/AuthContext';

/**
 * Animated count-up for a numeric value. Instead of a seismic
 * 999 → 1019 jump whenever the user earns coins, we interpolate the
 * displayed number over ~600ms. This is the "feel premium" nit the
 * UX designer called out — a number going up feels earned, a number
 * teleporting feels like a balance sheet.
 *
 * Uses JS-driven animation (not the native driver) because we're
 * interpolating a Text string, not a transform. 600ms is fast enough
 * to not annoy, slow enough to be noticed.
 */
function useAnimatedCount(target: number, durationMs = 600): number {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);

  useEffect(() => {
    // Skip animation on initial mount or when the delta is tiny —
    // jumping between 0 and non-zero on login is not worth animating,
    // and single-digit changes look choppy.
    const from = fromRef.current;
    if (from === target) return;
    if (Math.abs(target - from) < 2) {
      setDisplay(target);
      fromRef.current = target;
      return;
    }

    const started = Date.now();
    const raf = () => {
      const progress = Math.min(1, (Date.now() - started) / durationMs);
      // Ease-out cubic — fast start, settles softly at target.
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(from + (target - from) * eased);
      setDisplay(current);
      if (progress < 1) handle = requestAnimationFrame(raf);
      else fromRef.current = target;
    };
    let handle = requestAnimationFrame(raf);
    return () => cancelAnimationFrame(handle);
  }, [target, durationMs]);

  return display;
}

interface AppHeaderProps {
  showSearch?: boolean;
}

export function AppHeader({ showSearch = true }: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { balance, isLoading: balanceLoading } = useCoins();
  const { user } = useAuth();
  const displayedBalance = useAnimatedCount(balance);

  const handleBellPress = () => {
    navigation.navigate('Notifications');
  };

  const handleSearchPress = () => {
    navigation.navigate('Search');
  };

  const handleAvatarPress = () => {
    navigation.navigate('Main', { screen: 'Profile' });
  };

  const handleCoinPress = () => {
    navigation.navigate('Main', {
      screen: 'Profile',
      params: { screen: 'WalletRewards' },
    });
  };

  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <View style={styles.headerLeft}>
        <TouchableOpacity
          onPress={handleAvatarPress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Open profile"
        >
          <View style={styles.avatar}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person" size={20} color={colors.onSurfaceVariant} />
            )}
          </View>
        </TouchableOpacity>
        <Text style={styles.brandText}>KINETIC</Text>
      </View>
      <View style={styles.headerRight}>
        <TouchableOpacity
          style={styles.coinPill}
          onPress={handleCoinPress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Coin balance ${balance}. Open wallet`}
          hitSlop={8}
        >
          <MaterialCommunityIcons name="circle-multiple" size={14} color={colors.primary} />
          <Text style={styles.coinPillText}>
            {balanceLoading ? '...' : displayedBalance.toLocaleString()}
          </Text>
        </TouchableOpacity>
        {showSearch && (
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={handleSearchPress}
            accessibilityRole="button"
            accessibilityLabel="Search"
            hitSlop={8}
          >
            <Feather name="search" size={18} color={colors.onSurface} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={handleBellPress}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          hitSlop={8}
        >
          <Feather name="bell" size={18} color={colors.onSurface} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerHighest,
    borderWidth: 1,
    borderColor: 'rgba(69,72,76,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 12,
  },
  brandText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 24,
    color: colors.primary,
    letterSpacing: -1.2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(202,253,0,0.1)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  coinPillText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: colors.primary,
    letterSpacing: -0.3,
  },
});
