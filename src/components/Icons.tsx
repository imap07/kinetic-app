import React from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Ionicons,
  MaterialCommunityIcons,
  Feather,
  FontAwesome5,
  FontAwesome6,
  MaterialIcons,
} from '@expo/vector-icons';
import { colors } from '../theme';

// ─── Tab Bar Icons ───────────────────────────────────────
export const TabHomeIcon = ({ color, size = 24 }: { color: string; size?: number }) => (
  <Ionicons name="home" size={size} color={color} />
);
export const TabStatsIcon = ({ color, size = 24 }: { color: string; size?: number }) => (
  <Ionicons name="stats-chart" size={size} color={color} />
);
export const TabQuickPickIcon = ({ size = 24 }: { size?: number }) => (
  <MaterialCommunityIcons name="lightning-bolt" size={size} color={colors.onPrimary} />
);
export const TabLeaderboardIcon = ({ color, size = 24 }: { color: string; size?: number }) => (
  <Ionicons name="trophy" size={size} color={color} />
);
export const TabProfileIcon = ({ color, size = 24 }: { color: string; size?: number }) => (
  <Ionicons name="person" size={size} color={color} />
);

// ─── Header Icons ────────────────────────────────────────
export const SearchIcon = ({ size = 22, color = colors.onSurface }: { size?: number; color?: string }) => (
  <Feather name="search" size={size} color={color} />
);
export const BellIcon = ({ size = 22, color = colors.onSurface }: { size?: number; color?: string }) => (
  <Feather name="bell" size={size} color={color} />
);
export const BackArrowIcon = ({ size = 22, color = colors.onSurface }: { size?: number; color?: string }) => (
  <Ionicons name="arrow-back" size={size} color={color} />
);

// ─── Sport Tab Icons ─────────────────────────────────────
export const FootballIcon = ({ size = 16, color = colors.onSurfaceVariant }: { size?: number; color?: string }) => (
  <Ionicons name="football" size={size} color={color} />
);
export const BasketballIcon = ({ size = 16, color = colors.onSurfaceVariant }: { size?: number; color?: string }) => (
  <MaterialCommunityIcons name="basketball" size={size} color={color} />
);
export const TennisIcon = ({ size = 16, color = colors.onSurfaceVariant }: { size?: number; color?: string }) => (
  <MaterialCommunityIcons name="tennis" size={size} color={color} />
);

// ─── Social Login Icons ──────────────────────────────────
export const GoogleIcon = ({ size = 18 }: { size?: number }) => (
  <View style={[iconStyles.socialCircle, { backgroundColor: '#4285F4' }]}>
    <FontAwesome5 name="google" size={size - 6} color="#fff" />
  </View>
);
export const AppleIcon = ({ size = 18 }: { size?: number }) => (
  <FontAwesome5 name="apple" size={size} color={colors.onSurface} />
);
export const XTwitterIcon = ({ size = 18 }: { size?: number }) => (
  <FontAwesome6 name="x-twitter" size={size} color={colors.onSurface} />
);

// ─── Auth Flow Icons ─────────────────────────────────────
export const ShieldLockIcon = ({ size = 32 }: { size?: number }) => (
  <View style={iconStyles.shieldContainer}>
    <MaterialCommunityIcons name="shield-lock" size={size} color={colors.primary} />
  </View>
);
export const RefreshIcon = ({ size = 32 }: { size?: number }) => (
  <View style={iconStyles.shieldContainer}>
    <MaterialCommunityIcons name="refresh" size={size} color={colors.primary} />
  </View>
);
export const MailIcon = ({ size = 18, color = colors.onSurfaceDim }: { size?: number; color?: string }) => (
  <MaterialCommunityIcons name="email-outline" size={size} color={color} />
);

// ─── Dashboard Icons ─────────────────────────────────────
export const StarIcon = ({ size = 16, color = colors.primary }: { size?: number; color?: string }) => (
  <MaterialIcons name="star" size={size} color={color} />
);
export const StarOutlineIcon = ({ size = 18, color = colors.onSurfaceVariant }: { size?: number; color?: string }) => (
  <MaterialIcons name="star-outline" size={size} color={color} />
);
export const TrophyIcon = ({ size = 16, color = colors.primary }: { size?: number; color?: string }) => (
  <Ionicons name="trophy" size={size} color={color} />
);
export const FireIcon = ({ size = 16, color = colors.tertiary }: { size?: number; color?: string }) => (
  <MaterialCommunityIcons name="fire" size={size} color={color} />
);
export const LiveDot = () => (
  <View style={iconStyles.liveDot} />
);
export const ChevronRight = ({ size = 16, color = colors.onSurfaceVariant }: { size?: number; color?: string }) => (
  <MaterialIcons name="chevron-right" size={size} color={color} />
);

// ─── Match / Stats Icons ─────────────────────────────────
export const GoalIcon = ({ size = 14, color = colors.primary }: { size?: number; color?: string }) => (
  <Ionicons name="football" size={size} color={color} />
);
export const SwapIcon = ({ size = 14, color = colors.onSurfaceVariant }: { size?: number; color?: string }) => (
  <MaterialCommunityIcons name="swap-horizontal" size={size} color={color} />
);
export const CardYellowIcon = ({ size = 14 }: { size?: number }) => (
  <View style={[iconStyles.card, { backgroundColor: '#FFD600' }]} />
);
export const CardRedIcon = ({ size = 14 }: { size?: number }) => (
  <View style={[iconStyles.card, { backgroundColor: '#FF4444' }]} />
);
export const ClockIcon = ({ size = 16, color = colors.onSurfaceDim }: { size?: number; color?: string }) => (
  <Ionicons name="time-outline" size={size} color={color} />
);
export const WarningIcon = ({ size = 18, color = colors.tertiary }: { size?: number; color?: string }) => (
  <MaterialIcons name="warning-amber" size={size} color={color} />
);

// ─── Leaderboard Icons ───────────────────────────────────
export const MedalGold = () => (
  <MaterialCommunityIcons name="medal" size={22} color="#FFD700" />
);
export const MedalSilver = () => (
  <MaterialCommunityIcons name="medal" size={22} color="#C0C0C0" />
);
export const MedalBronze = () => (
  <MaterialCommunityIcons name="medal" size={22} color="#CD7F32" />
);
export const ChartIcon = ({ size = 16, color = colors.onSurfaceDim }: { size?: number; color?: string }) => (
  <Ionicons name="bar-chart" size={size} color={color} />
);
export const CheckCircleIcon = ({ size = 16, color = colors.primary }: { size?: number; color?: string }) => (
  <Ionicons name="checkmark-circle" size={size} color={color} />
);
export const DiamondIcon = ({ size = 16, color = colors.tertiary }: { size?: number; color?: string }) => (
  <MaterialCommunityIcons name="diamond-stone" size={size} color={color} />
);

// ─── Misc ────────────────────────────────────────────────
export const ResendIcon = ({ size = 16, color = colors.primary }: { size?: number; color?: string }) => (
  <MaterialCommunityIcons name="refresh" size={size} color={color} />
);

const iconStyles = StyleSheet.create({
  socialCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(202, 253, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.tertiary,
  },
  card: {
    width: 10,
    height: 14,
    borderRadius: 2,
  },
});
