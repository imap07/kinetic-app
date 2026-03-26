import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme';

interface AppHeaderProps {
  showSearch?: boolean;
}

export function AppHeader({ showSearch = true }: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const handleBellPress = () => {
    navigation.navigate('Profile', {
      screen: 'Notifications',
    });
  };

  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <View style={styles.headerLeft}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={20} color={colors.onSurfaceVariant} />
        </View>
        <Text style={styles.brandText}>KINETIC</Text>
      </View>
      <View style={styles.headerRight}>
        {showSearch && (
          <TouchableOpacity style={styles.headerIconBtn}>
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
});
