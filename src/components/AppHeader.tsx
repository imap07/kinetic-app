import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme';
import { useCoins } from '../contexts/CoinContext';
import { useAuth } from '../contexts/AuthContext';

interface AppHeaderProps {
  showSearch?: boolean;
}

export function AppHeader({ showSearch = true }: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { balance, isLoading: balanceLoading } = useCoins();
  const { user } = useAuth();

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
        <TouchableOpacity onPress={handleAvatarPress} activeOpacity={0.7}>
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
        <TouchableOpacity style={styles.coinPill} onPress={handleCoinPress} activeOpacity={0.7}>
          <MaterialCommunityIcons name="circle-multiple" size={14} color={colors.primary} />
          <Text style={styles.coinPillText}>
            {balanceLoading ? '...' : balance.toLocaleString()}
          </Text>
        </TouchableOpacity>
        {showSearch && (
          <TouchableOpacity style={styles.headerIconBtn} onPress={handleSearchPress}>
            <Feather name="search" size={18} color={colors.onSurface} />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.headerIconBtn} onPress={handleBellPress}>
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
